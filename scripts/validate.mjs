import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { pathToFileURL } from 'node:url';

export const LANGUAGES = ['ko', 'en', 'es', 'zh', 'ja', 'de', 'fr', 'pt'];
const ART = {
  type: ['human', 'dog', 'cat', 'magic'],
  pattern: ['solid', 'patches', 'stripes', 'spots', 'tuxedo'],
  ear: ['upright', 'floppy', 'folded', 'round'], fur: ['short', 'long'],
  headwear: ['none', 'cap', 'hat', 'hood', 'crown'], robe: ['tunic', 'robe', 'coat', 'shirt'],
};
const COLORS = ['background', 'coat', 'accent', 'hair'];
const MINIMUM = { era: 24, status: 18, cheat: 24, dog: 24, cat: 24 };
const present = value => typeof value === 'string' && value.trim().length > 0;
const keys = value => Object.keys(value || {}).sort().join('|');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const markup = value => /<\/?[a-z!][^>]*>/i.test(value);

/** Structural checks cannot certify translation quality or historical accuracy. */
export function validateData(data) {
  const errors = [];
  const check = (condition, label) => { if (!condition) errors.push(label); };
  const translated = (value, label) => {
    for (const lang of LANGUAGES) {
      check(present(value?.[lang]), `${label}.${lang}: missing translation`);
      if (present(value?.[lang])) check(!markup(value[lang]), `${label}.${lang}: markup forbidden`);
    }
  };
  check(data?.schemaVersion === 1, 'schemaVersion must be 1');
  check(/^[a-z][a-z0-9-]*$/.test(data?.slug || ''), 'slug: invalid');
  check(Object.hasOwn(MINIMUM, data?.kind), 'kind: invalid');
  check(same([...(data?.languages || [])].sort(), [...LANGUAGES].sort()), 'languages: expected eight unique languages');
  check(/^\d{4}-\d{2}-\d{2}$/.test(data?.checkedAt || ''), 'checkedAt: ISO date required');
  for (const field of ['title', 'description', 'probabilityNote']) translated(data?.[field], field);
  const labels = data?.fieldLabels || {};
  check(Object.keys(labels).length >= 4 && Object.keys(labels).length <= 6, 'fieldLabels: expected 4–6 fields');
  for (const [id, value] of Object.entries(labels)) translated(value, `fieldLabels.${id}`);
  const sources = Array.isArray(data?.sources) ? data.sources : [];
  check(Array.isArray(data?.sources), 'sources: array required');
  const sourceIds = new Set();
  for (const source of sources) {
    check(present(source.id) && !sourceIds.has(source.id), `sources: duplicate/missing ID ${source.id}`);
    sourceIds.add(source.id);
    for (const field of ['label', 'scope']) check(present(source[field]), `source.${source.id}.${field}: required`);
    try { check(new URL(source.url).protocol === 'https:', `source.${source.id}: HTTPS URL required`); }
    catch { errors.push(`source.${source.id}: invalid URL`); }
  }
  const entries = Array.isArray(data?.entries) ? data.entries : [];
  check(entries.length >= (MINIMUM[data?.kind] || Infinity), `entries: ${data?.kind} minimum ${MINIMUM[data?.kind] || '?'} required`);
  const ids = new Set();
  for (const entry of entries) {
    const label = `entry.${entry.id}`;
    check(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id || ''), `${label}: invalid ID`);
    check(!ids.has(entry.id), `${label}: duplicate ID`); ids.add(entry.id);
    check(typeof entry.weight === 'number' && Number.isFinite(entry.weight) && entry.weight > 0, `${label}.weight: finite positive number required`);
    check(Array.isArray(entry.sourceIds), `${label}.sourceIds: array required`);
    for (const id of entry.sourceIds || []) check(sourceIds.has(id), `${label}.sourceIds: unknown ${id}`);
    if (data.kind === 'era' || data.kind === 'status') check((entry.sourceIds || []).length > 0, `${label}.sourceIds: historical citation required`);
    const art = entry.art || {};
    check(ART.type.includes(art.type), `${label}.art.type: invalid`);
    for (const [key, value] of Object.entries(art)) {
      check(Object.hasOwn(ART, key) || COLORS.includes(key), `${label}.art.${key}: unknown parameter`);
      if (ART[key]) check(ART[key].includes(value), `${label}.art.${key}: invalid enum`);
      if (COLORS.includes(key)) check(/^#[0-9a-f]{6}$/i.test(value), `${label}.art.${key}: six-digit hex required`);
    }
    for (const lang of LANGUAGES) {
      const text = entry.text?.[lang];
      for (const field of ['name', 'blurb', 'story']) {
        check(present(text?.[field]), `${label}.text.${lang}.${field}: required`);
        if (present(text?.[field])) check(!markup(text[field]), `${label}.text.${lang}.${field}: markup forbidden`);
      }
      check(keys(text?.fields) === keys(labels), `${label}.text.${lang}.fields: keys differ from fieldLabels`);
      for (const [field, value] of Object.entries(text?.fields || {})) check(present(value) && !markup(value), `${label}.text.${lang}.fields.${field}: plain text required`);
      if (lang !== 'en' && text && entry.text?.en) {
        const prose = item => [item.blurb, item.story, ...Object.values(item.fields || {})].join('\n').trim();
        check(prose(text) !== prose(entry.text.en), `${label}.text.${lang}: English fallback`);
        if (lang !== 'ko' && entry.text?.ko) check(prose(text) !== prose(entry.text.ko), `${label}.text.${lang}: Korean fallback`);
      }
    }
    if (data.kind === 'era') {
      const range = entry.yearRange;
      check(Number.isInteger(range?.from) && Number.isInteger(range?.to) && range.from !== 0 && range.to !== 0 && range.from <= range.to, `${label}.yearRange: ordered nonzero integer bounds required`);
    }
  }
  check(Number.isFinite(entries.reduce((sum, entry) => sum + entry.weight, 0)), 'weights: total must remain finite');
  if (data?.kind === 'era') {
    // Year zero is absent from the historical calendar; a BCE→CE range skips it.
    const ranges = entries.map(entry => entry.yearRange).filter(range => Number.isInteger(range?.from) && Number.isInteger(range?.to));
    for (let year = -10000; year <= 2026; year++) {
      if (year === 0) continue;
      if (!ranges.some(range => range.from <= year && range.to >= year)) { errors.push(`year coverage: missing ${year}`); break; }
    }
  }
  return errors;
}

export function validateUI(ui) {
  const errors = [];
  const reference = ui?.en || {};
  if (!Object.keys(reference).length) errors.push('ui.en: empty dictionary');
  for (const lang of LANGUAGES) {
    if (keys(ui?.[lang]) !== keys(reference)) errors.push(`ui.${lang}: keys differ from English`);
    for (const [key, value] of Object.entries(reference)) {
      const translated = ui?.[lang]?.[key];
      if (!present(translated) || markup(translated)) errors.push(`ui.${lang}.${key}: plain translated text required`);
      const tokens = text => (String(text).match(/\{[a-zA-Z0-9_]+\}/g) || []).sort().join('|');
      if (tokens(translated) !== tokens(value)) errors.push(`ui.${lang}.${key}: interpolation tokens differ`);
    }
    if (lang !== 'en' && same(ui?.[lang], reference)) errors.push(`ui.${lang}: English dictionary fallback`);
  }
  return errors;
}

function attrs(tag) {
  const result = {};
  for (const match of tag.matchAll(/\b(data-publisher-(?:runtime|bootstrap))\b/g)) result[match[1]] = '';
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) result[match[1].toLowerCase()] = decode(match[2] ?? match[3] ?? match[4]);
  return result;
}
function decode(value) { return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>'); }
function walk(root) { return fs.readdirSync(root, { withFileTypes: true }).flatMap(item => item.isDirectory() ? walk(path.join(root, item.name)) : [path.join(root, item.name)]); }
function readJSON(file, errors) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (error) { errors.push(`${file}: ${error.message}`); return null; } }
function scripts(html) { return [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].map(match => ({ ...attrs(match[1]), body: match[2] })); }

/** Run only the publisher bootstrap in a network-free, bounded fake DOM. */
export function publisherRequests(code, hostname, protocol = 'https:') {
  const requests = [];
  const element = () => {
    const item = { attributes: {}, setAttribute(key, value) { this.attributes[key] = value; this[key] = value; }, appendChild(child) { requests.push(String(child.src || child.href || '')); return child; }, append(...children) { for (const child of children) this.appendChild(child); } };
    for (const key of ['src', 'href']) Object.defineProperty(item, key, { configurable: true, set(value) { this[`_${key}`] = value; requests.push(String(value)); }, get() { return this[`_${key}`]; } });
    return item;
  };
  const head = element();
  const document = { readyState: 'complete', head, body: element(), documentElement: element(), createElement: element, getElementsByTagName: name => name === 'script' ? [{ parentNode: { insertBefore(child) { head.appendChild(child); } } }] : [head], addEventListener() {}, querySelectorAll() { return []; }, querySelector() { return null; }, getElementById() { return null; } };
  const location = { hostname, protocol, host: hostname, origin: `${protocol}//${hostname}`, pathname: '/fixture/', search: '', href: `${protocol}//${hostname}/fixture/` };
  const context = { location, document, URL, navigator: {}, console: { log() {}, warn() {}, error() {} }, setTimeout() {}, clearTimeout() {}, fetch(url) { requests.push(String(url)); return Promise.resolve({}); }, Image: function() { return element(); } };
  context.window = context; context.self = context; context.globalThis = context;
  vm.runInNewContext(code, context, { timeout: 300, filename: 'publisher-bootstrap.js' });
  return [...new Set(requests.filter(Boolean))];
}

export function validateRepository(root = process.cwd()) {
  const errors = [];
  const check = (condition, label) => { if (!condition) errors.push(label); };
  const data = readJSON(path.join(root, 'data', 'game.json'), errors);
  if (!data) return { errors, pages: 0, entries: 0 };
  errors.push(...validateData(data));
  const ui = readJSON(path.join(root, 'src', 'ui.json'), errors);
  if (ui) errors.push(...validateUI(ui));
  const docs = path.join(root, 'docs');
  if (!fs.existsSync(docs)) return { errors: [...errors, 'docs: missing build'], pages: 0, entries: data.entries?.length || 0 };
  const files = walk(docs);
  const pages = files.filter(file => file.endsWith('.html'));
  const deployed = readJSON(path.join(docs, 'assets', 'game.json'), errors);
  check(same(data, deployed), 'docs/assets/game.json: differs from source data');
  const base = new URL(`https://nanalab.kr/${data.slug}/`);
  const urlFor = file => new URL(path.relative(docs, file).split(path.sep).join('/').replace(/index\.html$/, ''), base).href;
  const pageURLs = new Set(pages.map(urlFor));
  const localePath = (lang, suffix = '') => `${lang === 'ko' ? '' : `${lang}/`}${suffix}`;
  const required = LANGUAGES.flatMap(lang => ['', 'sources/', 'privacy/', ...(data.entries || []).map(entry => `r/${entry.id}/`)].map(suffix => new URL(localePath(lang, suffix), base).href));
  required.push(new URL('ko/', base).href);
  for (const url of required) check(pageURLs.has(url), `route missing: ${url}`);
  const localTarget = (ref, currentURL, label) => {
    let target; try { target = new URL(decode(ref), currentURL); } catch { errors.push(`${label}: malformed URL ${ref}`); return; }
    if (target.origin !== base.origin || !target.pathname.startsWith(base.pathname)) return;
    let relative; try { relative = decodeURIComponent(target.pathname.slice(base.pathname.length)); } catch { errors.push(`${label}: invalid URL encoding`); return; }
    const resolved = path.resolve(docs, relative || '.');
    if (resolved !== docs && !resolved.startsWith(docs + path.sep)) { errors.push(`${label}: path escapes docs`); return; }
    const candidate = target.pathname.endsWith('/') ? path.join(resolved, 'index.html') : resolved;
    check(fs.existsSync(candidate) && fs.statSync(candidate).isFile(), `${label}: broken local URL ${target.href}`);
  };
  const checkedPublisherCode = new Set();
  let inertNoscriptPages = 0;
  for (const file of pages) {
    const html = fs.readFileSync(file, 'utf8');
    const label = path.relative(root, file).split(path.sep).join('/');
    const currentURL = urlFor(file);
    const relative = new URL(currentURL).pathname.slice(base.pathname.length);
    const segments = relative.split('/').filter(Boolean);
    const lang = LANGUAGES.includes(segments[0]) ? segments.shift() : 'ko';
    const suffix = segments.length ? `${segments.join('/')}/` : '';
    const canonical = new URL(localePath(lang, suffix), base).href;
    check(new RegExp(`<html\\b[^>]*\\blang=["']${lang}["']`, 'i').test(html), `${label}: html lang mismatch`);
    check(/<title>[^<]+<\/title>/i.test(html), `${label}: title missing`);
    const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map(match => attrs(match[0]));
    check(metas.some(meta => meta.name === 'description' && present(meta.content)), `${label}: meta description missing`);
    for (const property of ['og:title', 'og:description', 'og:image', 'og:url']) check(metas.some(meta => meta.property === property && present(meta.content)), `${label}: ${property} missing`);
    check(metas.filter(meta => meta.property === 'og:url').length === 1 && metas.find(meta => meta.property === 'og:url')?.content === canonical, `${label}: og:url differs from canonical`);
    check(metas.some(meta => meta.name === 'robots' && /index/i.test(meta.content || '') && !/noindex/i.test(meta.content || '')), `${label}: indexable robots meta missing`);
    const links = [...html.matchAll(/<link\b[^>]*>/gi)].map(match => attrs(match[0]));
    const canonicals = links.filter(link => link.rel === 'canonical');
    check(canonicals.length === 1 && canonicals[0].href === canonical, `${label}: canonical mismatch`);
    const alternates = links.filter(link => link.rel === 'alternate' && link.hreflang);
    check(alternates.length === LANGUAGES.length + 1, `${label}: expected eight hreflang plus x-default`);
    for (const alternateLang of [...LANGUAGES, 'x-default']) {
      const expected = new URL(localePath(alternateLang === 'x-default' ? 'ko' : alternateLang, suffix), base).href;
      const matches = alternates.filter(link => link.hreflang === alternateLang);
      check(matches.length === 1 && matches[0].href === expected && pageURLs.has(expected), `${label}: hreflang ${alternateLang} mismatch/missing target`);
    }
    check(/<a\b[^>]*href=["']https:\/\/nanalab\.kr\/apps\/["'][^>]*>\s*More Apps\s*<\/a>/i.test(html), `${label}: More Apps link missing`);
    for (const tag of html.matchAll(/<(?:a|link|script|img|source|iframe|use)\b[^>]*>/gi)) {
      const attributes = attrs(tag[0]);
      for (const key of ['href', 'src']) if (attributes[key] && !/^(?:data:|mailto:|tel:|javascript:)/i.test(attributes[key])) localTarget(attributes[key], currentURL, label);
      if (attributes.srcset) for (const candidate of attributes.srcset.split(',')) localTarget(candidate.trim().split(/\s+/)[0], currentURL, label);
    }
    for (const meta of metas.filter(meta => meta.property === 'og:image')) localTarget(meta.content, currentURL, label);
    const allScripts = scripts(html);
    if (suffix === 'sources/') for (const source of data.sources || []) check(decode(html).includes(source.url), `${label}: citation URL missing ${source.id}`);
    const ld = allScripts.filter(script => script.type === 'application/ld+json');
    check(ld.length > 0, `${label}: JSON-LD missing`);
    for (const script of ld) { try { const parsed = JSON.parse(script.body); check(Boolean(parsed['@context'] && (parsed['@type'] || parsed['@graph'])), `${label}: JSON-LD shape invalid`); if (parsed.url) check(parsed.url === canonical, `${label}: JSON-LD URL differs from canonical`); } catch { errors.push(`${label}: JSON-LD invalid JSON`); } }
    const publisher = allScripts.filter(script => Object.hasOwn(script, 'data-publisher-runtime') || Object.hasOwn(script, 'data-publisher-bootstrap'));
    check(publisher.length === 1, `${label}: one publisher bootstrap required`);
    // Release policy: an active static iframe cannot gate requests by hostname.
    // Keep an explicit inert fallback marker; never report it as an active GTM iframe.
    const inertNoscript = /<noscript\b[^>]*\bdata-publisher-gtm-fallback=["']GTM-NV2WWQXB["'][^>]*>[\s\S]*?<\/noscript>/i.test(html);
    check(inertNoscript, `${label}: inert GTM noscript policy marker missing`);
    if (inertNoscript) inertNoscriptPages++;
    check(!/<iframe\b[^>]*\bsrc=["'][^"']*(?:googletagmanager|googlesyndication|cloudflareinsights)/i.test(html), `${label}: active publisher iframe bypasses local-host guard`);
    for (const script of allScripts) if (script.src && /google-analytics|googletagmanager|googlesyndication|cloudflareinsights/i.test(script.src)) errors.push(`${label}: unguarded publisher script src`);
    for (const script of publisher) {
      for (const token of ['GTM-NV2WWQXB', 'G-2ZYSF0173P', 'ca-pub-9767176956440077', 'cloudflareinsights']) check(script.body.includes(token), `${label}: publisher ${token} missing`);
      if (!checkedPublisherCode.has(script.body)) {
        checkedPublisherCode.add(script.body);
        try {
          for (const host of ['localhost', '127.0.0.1', '::1', '[::1]', 'preview.invalid']) check(publisherRequests(script.body, host).length === 0, `${label}: publisher requests on ${host}`);
          check(publisherRequests(script.body, 'nanalab.kr', 'http:').length === 0, `${label}: publisher requests on HTTP`);
          const productionRequests = publisherRequests(script.body, 'nanalab.kr');
          for (const token of ['gtm.js', 'gtag/js', 'adsbygoogle', 'cloudflareinsights']) check(productionRequests.some(url => url.includes(token)), `${label}: publisher production load ${token} absent`);
        } catch (error) { errors.push(`${label}: publisher bootstrap failed: ${error.message}`); }
      }
    }
    const configScript = allScripts.find(script => script.id === 'game-config');
    if (suffix === '' || suffix.startsWith('r/')) {
      check(Boolean(configScript), `${label}: game-config missing`);
      if (configScript) {
        try {
          const config = JSON.parse(configScript.body);
          check(config.lang === lang && config.slug === data.slug && config.kind === data.kind, `${label}: game-config identity mismatch`);
          check(config.ui && Object.keys(config.ui).length > 0, `${label}: localized ui missing`);
          if (ui) check(same(config.ui, ui[lang]), `${label}: ui differs from source language dictionary`);
          check(new URL(config.dataURL, currentURL).href === new URL('assets/game.json', base).href, `${label}: dataURL mismatch`);
          const id = suffix.startsWith('r/') ? segments[1] : null;
          check((config.sharedResultId || null) === id, `${label}: sharedResultId mismatch`);
          if (id) {
            const entry = data.entries.find(item => item.id === id);
            for (const field of ['name', 'blurb', 'story']) check(entry && decode(html).includes(entry.text[lang][field]), `${label}: translated result ${field} missing`);
            for (const [field, value] of Object.entries(entry?.text?.[lang]?.fields || {})) check(decode(html).includes(value), `${label}: translated result field ${field} missing`);
          }
        } catch (error) { errors.push(`${label}: game-config invalid: ${error.message}`); }
      }
    }
  }
  const sitemapFile = path.join(docs, 'sitemap.xml');
  if (!fs.existsSync(sitemapFile)) errors.push('sitemap.xml missing');
  else {
    const xml = fs.readFileSync(sitemapFile, 'utf8');
    const locations = [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map(match => decode(match[1].trim()));
    check(locations.length === new Set(locations).size, 'sitemap: duplicate loc');
    for (const url of required.filter(url => url !== new URL('ko/', base).href)) check(locations.includes(url), `sitemap: missing ${url}`);
    for (const url of locations) check(pageURLs.has(url), `sitemap: nonexistent page ${url}`);
    for (const match of xml.matchAll(/<url>\s*([\s\S]*?)<\/url>/g)) {
      const loc = decode(match[1].match(/<loc>\s*([^<]+)\s*<\/loc>/)?.[1]?.trim() || '');
      if (!pageURLs.has(loc)) continue;
      const segments = new URL(loc).pathname.slice(base.pathname.length).split('/').filter(Boolean);
      if (LANGUAGES.includes(segments[0])) segments.shift();
      const suffix = segments.length ? `${segments.join('/')}/` : '';
      const alternates = [...match[1].matchAll(/<(?:xhtml:)?link\b[^>]*>/g)].map(link => attrs(link[0]));
      for (const lang of [...LANGUAGES, 'x-default']) {
        const expected = new URL(localePath(lang === 'x-default' ? 'ko' : lang, suffix), base).href;
        const matches = alternates.filter(link => link.rel === 'alternate' && link.hreflang === lang);
        check(matches.length === 1 && matches[0].href === expected, `sitemap: ${loc} alternate ${lang} mismatch`);
      }
    }
  }
  const robotsFile = path.join(docs, 'robots.txt');
  check(fs.existsSync(robotsFile), 'robots.txt missing');
  if (fs.existsSync(robotsFile)) {
    const robots = fs.readFileSync(robotsFile, 'utf8');
    check(!/^Disallow:\s*\/\s*$/mi.test(robots), 'robots.txt blocks indexing');
    check(robots.includes(new URL('sitemap.xml', base).href), 'robots.txt sitemap missing');
  }
  for (const file of files.filter(file => /\.(?:css|svg)$/.test(file))) {
    const content = fs.readFileSync(file, 'utf8');
    for (const match of content.matchAll(/url\(\s*["']?([^\s)'";]+)["']?\s*\)/g)) if (!match[1].startsWith('data:') && !match[1].startsWith('#')) localTarget(match[1], urlFor(file), path.relative(root, file));
  }
  return { errors, pages: pages.length, entries: data.entries?.length || 0, inertNoscriptFallback: pages.length > 0 && inertNoscriptPages === pages.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const result = validateRepository(process.cwd());
  if (result.errors.length) { console.error(result.errors.join('\n')); console.error(`Validation failed: ${result.errors.length} issues`); process.exitCode = 1; }
  else {
    console.log(`Validated ${result.entries} results, ${result.pages} HTML pages, eight languages and publisher guards.`);
    console.log(JSON.stringify({ inertNoscriptFallback: result.inertNoscriptFallback, activeNoscriptIframe: false, note: 'Static GTM noscript iframe omitted to prevent local preview requests.' }));
  }
}
