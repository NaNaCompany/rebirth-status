import {createGame, LANGUAGES} from './engine.mjs';
import {renderArt,renderCard} from './art.mjs';

export const format = (text, values = {}) => String(text).replace(/\{([a-z]+)\}/g, (all, key) => Object.hasOwn(values,key) ? String(values[key]) : all);

export function resultURL(config, result) {
  const base = new URL(config.baseURL);
  if (!['http:','https:'].includes(base.protocol) || !base.pathname.endsWith('/')) throw Error('invalid_data');
  const language = LANGUAGES.includes(config.lang) ? config.lang : 'ko';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(result.id)) throw Error('invalid_data');
  const url = new URL(`${language === 'ko' ? '' : `${language}/`}r/${result.id}/`,base);
  if (result.year !== undefined) url.searchParams.set('year',String(result.year));
  return url.href;
}

export function createController({game,data,config,env,view}) {
  const ui = config.ui;
  let busy = false;
  let shown = null;
  let preview = false;
  const message = key => view.message(ui[key] || ui.error);
  const track = (action, method) => {
    if (shown && /^[a-z0-9-]{1,100}$/.test(shown.id)) {
      try { env.track?.(action,{game_id:data.slug,result_id:shown.id,...(method ? {method} : {})}); } catch {}
    }
  };
  function paint() {
    view.render({state:game.getState(),result:shown,entry:shown ? game.getEntry(shown.id) : null,preview,busy});
  }
  function start() {
    const shared = config.sharedResultId;
    if (shared) {
      shown = game.preview(shared, config.sharedYear);
      if (shown) { preview = true; paint(); message('preview'); return; }
      message('invalidLink');
    }
    shown = game.getState().result;
    paint();
    if (shared) return;
    const state = game.getState();
    message(!state.storageAvailable ? 'storageUnavailable' : state.cacheInvalid ? 'cacheReset' : shown ? 'resume' : 'ready');
  }
  function draw() {
    if (busy) return false;
    if (preview) {
      preview = false;
      shown = game.getState().result;
      if (shown) { paint(); view.focus?.(); message('resume'); return true; }
    }
    const outcome = game.getState().result ? game.redraw() : game.draw();
    shown = outcome.state.result; paint();
    if (!outcome.ok) { message(outcome.error === 'no_attempts' ? 'noAttempts' : outcome.error === 'draw_limit' ? 'drawLimit' : 'error'); return false; }
    view.focus?.();
    track(outcome.state.drawCount === 1 ? 'draw' : 'redraw');
    message(!outcome.state.storageAvailable ? 'storageUnavailable' : 'ready');
    return true;
  }
  async function share(method) {
    if (busy || !shown || !['native','copy','x','facebook'].includes(method)) return false;
    busy = true; paint();
    const target = {...shown};
    try {
      const url = resultURL(config,target);
      const title = game.getEntry(target.id).text[config.lang].name;
      if (method === 'native') {
        if (typeof env.share !== 'function') { message('shareUnavailable'); return false; }
        await env.share({title,url});
      } else if (method === 'copy') {
        if (typeof env.copy !== 'function') throw Error('copy');
        await env.copy(url);
      } else {
        const endpoint = method === 'x' ? `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}` : `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        const popup = env.open('about:blank','_blank');
        if (!popup) { message('popupBlocked'); return false; }
        try { popup.opener = null; popup.location.replace(endpoint); } catch { try { popup.close(); } catch {} message('popupBlocked'); return false; }
      }
      track('share_prepare',method);
      let text = ui[method === 'copy' ? 'copied' : 'prepared'];
      if (!preview && target.token) {
        const reward = game.grantShareBonus(target.token);
        text += ` ${ui[reward.ok ? 'bonusAdded' : reward.error === 'bonus_used' ? 'bonusUsed' : 'error']}`;
        if (!reward.state.storageAvailable) text += ` ${ui.storageUnavailable}`;
      }
      view.message(text); return true;
    } catch (error) {
      message(error?.name === 'AbortError' ? 'cancelled' : method === 'copy' ? 'copyFailed' : 'shareFailed'); return false;
    } finally { busy = false; paint(); }
  }
  async function download() {
    if (busy || !shown) return false;
    busy = true; paint();
    try {
      const entry = game.getEntry(shown.id);
      const text = entry.text[config.lang];
      const yearText = shown.year === undefined ? '' : `${ui.year}: ${format(ui[shown.year < 0 ? 'bce' : 'ce'],{n:Math.abs(shown.year)})}`;
      const details = Object.entries(text.fields).map(([key,value]) => `${data.fieldLabels[key][config.lang]} · ${value}`);
      const svg = renderCard(entry.art,{name:text.name,subtitle:text.blurb,kind:data.kind,yearText,details});
      await env.download(svg,`${data.slug}-${entry.id}.png`);
      track('download'); message('downloaded'); return true;
    } catch { message('downloadFailed'); return false; }
    finally { busy = false; paint(); }
  }
  return {start,draw,share,download,getDisplayed:() => shown ? {...shown,preview} : null};
}

export async function downloadPNG(svg, filename, {document,window}) {
  const sourceURL = window.URL.createObjectURL(new window.Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
  let pngURL;
  try {
    const image = new window.Image();
    await new Promise((resolve,reject) => { image.onload = resolve; image.onerror = reject; image.src = sourceURL; });
    const canvas = document.createElement('canvas'); canvas.width = 1600; canvas.height = 1200;
    const context = canvas.getContext('2d'); if (!context) throw Error('canvas');
    context.drawImage(image,0,0,1600,1200);
    const blob = await new Promise(resolve => canvas.toBlob(resolve,'image/png'));
    if (!blob) throw Error('png');
    pngURL = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = pngURL; anchor.download = filename;
    document.body.append(anchor); anchor.click(); anchor.remove();
  } finally {
    window.URL.revokeObjectURL(sourceURL);
    if (pngURL) window.setTimeout(() => window.URL.revokeObjectURL(pngURL),1000);
  }
}

export async function bootGame(options = {}) {
  const document = options.document || globalThis.document;
  const window = options.window || globalThis.window;
  const navigator = options.navigator || window.navigator;
  const fetch = options.fetch || window.fetch.bind(window);
  const status = document.getElementById('status');
  let config;
  try {
    config = JSON.parse(document.getElementById('game-config').textContent);
    if (!LANGUAGES.includes(config.lang) || !config.ui) throw Error('config');
    const ui = config.ui;
    const query = new URL(window.location.href).searchParams;
    if (query.has('year')) {
      const raw = query.get('year');
      config.sharedYear = /^-?[1-9]\d{0,4}$/.test(raw) ? Number(raw) : NaN;
    }
    status.textContent = ui.loading;
    const dataLocation = new URL(config.dataURL,window.location.href);
    if (dataLocation.origin !== window.location.origin) throw Error('data_url');
    const response = await fetch(dataLocation.href,{credentials:'same-origin'});
    if (!response.ok) throw Error('fetch');
    const data = await response.json();
    if (data.slug !== config.slug || data.kind !== config.kind) throw Error('data');
    let storage;
    try { storage = options.storage || window.localStorage; } catch {}
    const game = createGame(data,{storage,random:options.random});
    const node = id => document.getElementById(id);
    const buttons = ['draw-button','redraw-button','share-button','copy-button','x-button','facebook-button','download-button'];
    let artKey = '';
    const view = {
      message:text => { status.textContent = text; },
      focus:() => node('result').focus?.(),
      render({state,result,entry,preview,busy}) {
        node('result').hidden = !result;
        const heroArt = document.querySelector?.('.hero-art');
        if (heroArt) heroArt.hidden = !!result;
        node('remaining').textContent = format(ui.remaining,{n:state.remaining});
        node('draw-button').hidden = !!result && !preview;
        node('draw-button').textContent = preview ? ui.startOwn : ui.draw;
        node('redraw-button').hidden = !result || preview;
        for (const id of buttons) { const button = node(id); if (button) button.disabled = busy || (id !== 'draw-button' && !result) || (id === 'redraw-button' && state.remaining < 1); }
        if (!entry) return;
        const text = entry.text[config.lang];
        node('result-name').textContent = text.name;
        node('result-blurb').textContent = text.blurb;
        node('result-story').textContent = text.story;
        const yearNode = node('result-year');
        yearNode.hidden = result.year === undefined;
        yearNode.textContent = result.year === undefined ? '' : `${ui.year}: ${format(ui[result.year < 0 ? 'bce' : 'ce'],{n:Math.abs(result.year)})}`;
        const fields = node('result-fields'); fields.replaceChildren();
        for (const [key,value] of Object.entries(text.fields)) {
          const term = document.createElement('dt'); term.textContent = data.fieldLabels[key][config.lang];
          const detail = document.createElement('dd'); detail.textContent = value;
          const row = document.createElement('div'); row.append(term,detail); fields.append(row);
        }
        const sourceList = node('result-sources');
        if (sourceList) {
          sourceList.replaceChildren();
          for (const id of entry.sourceIds || []) {
            const source = data.sources?.find(item => item.id === id);
            if (!source) continue;
            let url; try { url = new URL(source.url); } catch { continue; }
            if (url.protocol !== 'https:' || url.username || url.password) continue;
            const item = document.createElement('li'); const link = document.createElement('a');
            link.href = url.href; link.textContent = source.label; link.target = '_blank'; link.rel = 'noopener noreferrer';
            item.append(link); sourceList.append(item);
          }
          sourceList.hidden = sourceList.children.length === 0;
        }
        const total = data.entries.reduce((sum,item) => sum + item.weight,0);
        const number = new Intl.NumberFormat(config.lang,{style:'percent',maximumFractionDigits:2}).format(entry.weight/total);
        node('result-probability').textContent = `${ui.probability}: ${number}. ${data.probabilityNote[config.lang]} ${ui.redrawNote}`;
        const nextArtKey = `${config.lang}:${entry.id}`;
        if (artKey !== nextArtKey) {
          artKey = nextArtKey;
          const image = document.createElement('img');
          image.width = 800; image.height = 600; image.alt = format(ui.artAlt,{name:text.name});
          image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderArt(entry.art,{name:text.name,subtitle:text.blurb,kind:data.kind}))}`;
          node('result-art').replaceChildren(image);
        }
      }
    };
    const env = {
      share:typeof navigator.share === 'function' ? navigator.share.bind(navigator) : undefined,
      copy:typeof navigator.clipboard?.writeText === 'function' ? navigator.clipboard.writeText.bind(navigator.clipboard) : undefined,
      open:window.open.bind(window),
      download:(svg,name) => downloadPNG(svg,name,{document,window}),
      track:(action,parameters) => {
        if (window.location.protocol === 'https:' && !['localhost','127.0.0.1','[::1]','::1'].includes(window.location.hostname) && typeof window.gtag === 'function') window.gtag('event',action,parameters);
      }
    };
    const controller = createController({game,data,config,env,view});
    node('draw-button').addEventListener('click',controller.draw);
    node('redraw-button').addEventListener('click',controller.draw);
    for (const [id,method] of [['share-button','native'],['copy-button','copy'],['x-button','x'],['facebook-button','facebook']]) node(id).addEventListener('click',() => controller.share(method));
    node('download-button').addEventListener('click',controller.download);
    controller.start();
    return {game,controller};
  } catch {
    if (status) status.textContent = config?.ui?.loadFailed || '⚠';
    for (const id of ['draw-button','redraw-button','share-button','copy-button','x-button','facebook-button','download-button']) { const button = document.getElementById(id); if (button) button.disabled = true; }
    return null;
  }
}

if (typeof document !== 'undefined' && document.getElementById('game-config')) bootGame();
