export const LANGUAGES = Object.freeze(['ko','en','es','zh','ja','de','fr','pt']);
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_DRAWS = 4096;
const copy = value => JSON.parse(JSON.stringify(value));

export function isValidYear(year, entry) {
  return Number.isInteger(year) && year !== 0 && year >= -10000 && year <= 2026 &&
    !!entry.yearRange && year >= entry.yearRange.from && year <= entry.yearRange.to;
}

export function validateDataset(data) {
  if (!data || data.schemaVersion !== 1 || !ID.test(data.slug || '') || data.slug.length > 100 || !Array.isArray(data.entries) || data.entries.length < 2 || data.entries.length > 10000) throw Error('invalid_data');
  const ids = new Set();
  let total = 0;
  for (const entry of data.entries) {
    if (!ID.test(entry.id || '') || entry.id.length > 100 || ids.has(entry.id) || !Number.isFinite(entry.weight) || entry.weight <= 0 || entry.weight > 1e9) throw Error('invalid_data');
    ids.add(entry.id); total += entry.weight;
    if (data.kind === 'era' && (!entry.yearRange || !Number.isInteger(entry.yearRange.from) || !Number.isInteger(entry.yearRange.to) || entry.yearRange.from < -10000 || entry.yearRange.to > 2026 || entry.yearRange.from > entry.yearRange.to || entry.yearRange.from === 0 || entry.yearRange.to === 0)) throw Error('invalid_data');
  }
  if (!Number.isFinite(total) || total > 1e12) throw Error('invalid_data');
  return true;
}

export function weightedDraw(entries, excludeId, random = Math.random) {
  const candidates = entries.filter(entry => entry.id !== excludeId);
  const total = candidates.reduce((sum, entry) => sum + entry.weight, 0);
  if (!candidates.length || !Number.isFinite(total) || total <= 0) throw Error('invalid_data');
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw Error('invalid_random');
  let cursor = value * total;
  for (const entry of candidates) { cursor -= entry.weight; if (cursor < 0) return entry; }
  return candidates[candidates.length - 1];
}

export function drawYear(entry, random = Math.random) {
  const {from, to} = entry.yearRange;
  const skipZero = from < 0 && to > 0;
  const length = to - from + 1 - Number(skipZero);
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw Error('invalid_random');
  let year = from + Math.floor(value * length);
  if (skipZero && year >= 0) year++;
  return year;
}

export function createGame(data, options = {}) {
  validateDataset(data);
  const byId = new Map(data.entries.map(entry => [entry.id, entry]));
  const key = options.key || `rebirth:v1:${data.slug}`;
  const random = options.random || Math.random;
  const storage = options.storage;
  let storageAvailable = !!storage;
  let cacheInvalid = false;
  let state = {version:1, slug:data.slug, result:null, remaining:1, drawCount:0, bonuses:[]};
  function validResult(result) {
    const entry = result && byId.get(result.id);
    return !!entry && (data.kind === 'era' ? isValidYear(result.year, entry) : result.year === undefined);
  }
  function validateCache(value) {
    if (!value || value.version !== 1 || value.slug !== data.slug || !Number.isInteger(value.drawCount) || value.drawCount < 1 || value.drawCount > MAX_DRAWS || !validResult(value.result) || value.result.token !== `${value.drawCount}.${value.result.id}` || !Array.isArray(value.bonuses) || value.bonuses.length > value.drawCount) return false;
    const seen = new Set();
    const seenDraws = new Set();
    for (const token of value.bonuses) {
      if (typeof token !== 'string' || token.length > 110 || seen.has(token)) return false;
      const match = /^(\d+)\.([a-z0-9-]+)$/.exec(token);
      if (!match || !byId.has(match[2]) || Number(match[1]) < 1 || Number(match[1]) > value.drawCount || String(Number(match[1])) !== match[1] || seenDraws.has(match[1]) || (Number(match[1]) === value.drawCount && token !== value.result.token)) return false;
      seen.add(token); seenDraws.add(match[1]);
    }
    return Number.isInteger(value.remaining) && value.remaining >= 0 && value.remaining === 2 - value.drawCount + value.bonuses.length * 2;
  }
  if (storage) {
    try {
      const raw = storage.getItem(key);
      if (raw !== null) {
        let parsed;
        try { parsed = raw.length < 500000 ? JSON.parse(raw) : null; } catch { parsed = null; }
        if (validateCache(parsed)) state = {version:1, slug:data.slug, result:copy(parsed.result), remaining:parsed.remaining, drawCount:parsed.drawCount, bonuses:[...parsed.bonuses]};
        else cacheInvalid = true;
      }
    } catch { storageAvailable = false; }
  }
  function persist() {
    if (storageAvailable) { try { storage.setItem(key, JSON.stringify(state)); } catch { storageAvailable = false; } }
  }
  const snapshot = () => ({...copy(state), storageAvailable, cacheInvalid});
  const response = (ok, error) => ({ok, state:snapshot(), ...(error ? {error} : {})});
  function perform(initial) {
    if (initial && state.result) return response(false, 'already_drawn');
    if (!initial && !state.result) return response(false, 'draw_first');
    if (!initial && state.remaining < 1) return response(false, 'no_attempts');
    if (state.drawCount >= MAX_DRAWS) return response(false, 'draw_limit');
    let entry, year;
    try { entry = weightedDraw(data.entries, state.result?.id, random); if (data.kind === 'era') year = drawYear(entry, random); }
    catch (error) { return response(false, error.message); }
    state.drawCount++;
    state.result = {id:entry.id, token:`${state.drawCount}.${entry.id}`, ...(year === undefined ? {} : {year})};
    if (!initial) state.remaining--;
    cacheInvalid = false; persist(); return response(true);
  }
  return {
    getState:snapshot,
    getEntry:id => byId.has(id) ? copy(byId.get(id)) : null,
    draw:() => perform(true),
    redraw:() => perform(false),
    grantShareBonus(token) {
      if (!state.result || token !== state.result.token) return response(false, 'stale_share');
      if (state.bonuses.includes(token)) return response(false, 'bonus_used');
      state.bonuses.push(token); state.remaining += 2; persist(); return response(true);
    },
    preview(id, year) {
      const entry = byId.get(id);
      if (!entry || (data.kind === 'era' && year !== undefined && !isValidYear(year, entry))) return null;
      return {id, ...(data.kind === 'era' && year !== undefined ? {year} : {}), preview:true};
    },
    clear() { state = {version:1,slug:data.slug,result:null,remaining:1,drawCount:0,bonuses:[]}; try { storage?.removeItem(key); } catch { storageAvailable = false; } return snapshot(); }
  };
}
