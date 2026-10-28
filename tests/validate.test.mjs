import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LANGUAGES, validateData, validateUI, validateRepository, publisherRequests } from '../scripts/validate.mjs';

function fixtureData(kind = 'cheat') {
  const translations = value => Object.fromEntries(LANGUAGES.map(lang => [lang, `${lang} ${value}`]));
  return {
    schemaVersion: 1, slug: 'fixture-game', kind, checkedAt: '2026-10-28', languages: [...LANGUAGES],
    title: translations('title'), description: translations('description'), probabilityNote: translations('authored weights'),
    fieldLabels: Object.fromEntries(['power', 'condition', 'limit', 'drawback'].map(field => [field, translations(field)])),
    sources: kind === 'cheat' ? [] : [{ id: 'source', label: 'Primary reference', url: 'https://example.org/reference', scope: 'Citation only; original text and original assets.' }],
    entries: Array.from({ length: 24 }, (_, index) => ({
      id: `result-${index}`, weight: index + 1, sourceIds: kind === 'cheat' ? [] : ['source'],
      art: { type: 'magic', background: '#ffeeaa', pattern: 'solid' },
      ...(kind === 'era' ? { yearRange: index === 0 ? { from: -10000, to: -1 } : { from: 1, to: 2026 } } : {}),
      text: Object.fromEntries(LANGUAGES.map(lang => [lang, {
        name: `${lang} result ${index}`, blurb: `${lang} summary ${index}`,
        story: `${lang} story ${index}. ${lang} second sentence.`,
        fields: Object.fromEntries(['power', 'condition', 'limit', 'drawback'].map(field => [field, `${lang} ${field} ${index}`])),
      }])),
    })),
  };
}

const publisher = `
if (location.protocol === 'https:' && location.hostname === 'nanalab.kr') {
  window.dataLayer = window.dataLayer || [];
  for (const src of [
    'https://www.googletagmanager.com/gtm.js?id=GTM-NV2WWQXB',
    'https://www.googletagmanager.com/gtag/js?id=G-2ZYSF0173P',
    'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9767176956440077',
    'https://static.cloudflareinsights.com/beacon.min.js'
  ]) { const script = document.createElement('script'); script.src = src; document.head.appendChild(script); }
}`;
const escape = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function fixtureRepository() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reincarnation-validator-'));
  const data = fixtureData();
  const ui = Object.fromEntries(LANGUAGES.map(lang => [lang, { draw: `${lang} draw`, remaining: `${lang} remaining: {n}` }]));
  const write = (relative, text) => { const file = path.join(root, relative); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); };
  write('data/game.json', JSON.stringify(data)); write('docs/assets/game.json', JSON.stringify(data));
  write('src/ui.json', JSON.stringify(ui));
  write('docs/assets/art.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>');
  const base = `https://nanalab.kr/${data.slug}/`;
  const routes = LANGUAGES.flatMap(lang => ['', 'sources/', 'privacy/', ...data.entries.map(entry => `r/${entry.id}/`)].map(suffix => ({ lang, suffix, route: `${lang === 'ko' ? '' : `${lang}/`}${suffix}` })));
  routes.push({ lang: 'ko', suffix: '', route: 'ko/' });
  for (const { lang, suffix, route } of routes) {
    const canonical = `${base}${lang === 'ko' ? '' : `${lang}/`}${suffix}`;
    const alternates = [...LANGUAGES, 'x-default'].map(other => `<link rel="alternate" hreflang="${other}" href="${base}${other === 'ko' || other === 'x-default' ? '' : `${other}/`}${suffix}">`).join('');
    const entry = suffix.startsWith('r/') ? data.entries.find(item => suffix === `r/${item.id}/`) : null;
    const config = { slug: data.slug, kind: data.kind, lang, baseURL: base, dataURL: `/${data.slug}/assets/game.json`, ui: ui[lang], sharedResultId: entry?.id || null };
    const body = entry ? `<h1>${escape(entry.text[lang].name)}</h1><p>${escape(entry.text[lang].blurb)}</p><p>${escape(entry.text[lang].story)}</p>${Object.values(entry.text[lang].fields).map(value => `<p>${escape(value)}</p>`).join('')}` : '';
    const html = `<!doctype html><html lang="${lang}"><head><title>${lang} game</title><meta name="description" content="${lang} description"><meta name="robots" content="index,follow"><meta property="og:title" content="${lang} game"><meta property="og:description" content="${lang} description"><meta property="og:image" content="${base}assets/art.svg"><meta property="og:url" content="${canonical}"><link rel="canonical" href="${canonical}">${alternates}<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebApplication"}</script><script data-publisher-runtime>${publisher}</script></head><body><noscript data-publisher-gtm-fallback="GTM-NV2WWQXB"><!-- Static iframe omitted by local-host policy. --></noscript>${body}<a href="https://nanalab.kr/apps/">More Apps</a><script id="game-config" type="application/json">${JSON.stringify(config)}</script></body></html>`;
    write(`docs/${route}index.html`, html);
  }
  write('docs/sitemap.xml', `<urlset>${routes.filter(route => route.route !== 'ko/').map(route => `<url><loc>${base}${route.route}</loc>${[...LANGUAGES, 'x-default'].map(lang => `<xhtml:link rel="alternate" hreflang="${lang}" href="${base}${lang === 'ko' || lang === 'x-default' ? '' : `${lang}/`}${route.suffix}"/>`).join('')}</url>`).join('')}</urlset>`);
  write('docs/robots.txt', `User-agent: *\nAllow: /\nSitemap: ${base}sitemap.xml\n`);
  return { root, write, data, cleanup() { assert.ok(path.basename(root).startsWith('reincarnation-validator-')); fs.rmSync(root, { recursive: true, force: true }); } };
}

test('complete eight-language dataset passes', () => assert.deepEqual(validateData(fixtureData()), []));
test('UI validation checks all language keys, real values and interpolation tokens', () => {
  const ui = Object.fromEntries(LANGUAGES.map(lang => [lang, { draw: `${lang} draw`, remaining: `${lang} {n}` }]));
  assert.deepEqual(validateUI(ui), []);
  delete ui.pt.draw; ui.de.remaining = 'remaining'; ui.fr = structuredClone(ui.en);
  const errors = validateUI(ui).join('\n'); assert.match(errors, /ui.pt: keys differ/); assert.match(errors, /interpolation tokens differ/); assert.match(errors, /English dictionary fallback/);
});
test('rejects duplicate IDs, invalid weights, unknown citations, missing translation, field drift and art injection', () => {
  const data = fixtureData();
  data.entries[1].id = data.entries[0].id; data.entries[0].weight = 0;
  data.entries[0].sourceIds = ['unknown']; delete data.entries[0].text.pt.story;
  data.entries[0].text.de.fields.extra = 'extra'; data.entries[0].art.background = 'red;url(https://bad.invalid)';
  const errors = validateData(data).join('\n');
  for (const fragment of ['duplicate ID', 'finite positive', 'unknown unknown', '.pt.story', '.de.fields', 'six-digit hex']) assert.ok(errors.includes(fragment), fragment);
});
test('rejects entire translated prose copied from English or Korean', () => {
  const data = fixtureData(); data.entries[0].text.de = structuredClone(data.entries[0].text.en); data.entries[0].text.fr = structuredClone(data.entries[0].text.ko);
  const errors = validateData(data).join('\n'); assert.match(errors, /English fallback/); assert.match(errors, /Korean fallback/);
});
test('era coverage includes every historical year and excludes zero bounds', () => {
  const data = fixtureData('era'); assert.deepEqual(validateData(data), []);
  data.entries[0].yearRange.to = -2; assert.match(validateData(data).join('\n'), /year coverage: missing -1/);
  data.entries[0].yearRange.to = 0; assert.match(validateData(data).join('\n'), /nonzero integer bounds/);
});
test('publisher bootstrap is evaluated for each local hostname and HTTPS production', () => {
  for (const host of ['localhost', '127.0.0.1', '::1', '[::1]', 'preview.invalid']) assert.deepEqual(publisherRequests(publisher, host), []);
  assert.equal(publisherRequests(publisher, 'nanalab.kr').length, 4);
  assert.deepEqual(publisherRequests(publisher, 'nanalab.kr', 'http:'), []);
  assert.equal(publisherRequests(publisher.replace("location.hostname === 'nanalab.kr'", 'true'), 'localhost').length, 4);
});
test('complete generated fixture passes; missing routes, broken assets and untranslated results fail', () => {
  const fixture = fixtureRepository();
  try {
    const result = validateRepository(fixture.root); assert.deepEqual(result.errors, []); assert.equal(result.pages, 217); assert.equal(result.inertNoscriptFallback, true);
    fs.rmSync(path.join(fixture.root, 'docs/en/r/result-0/index.html'));
    fs.rmSync(path.join(fixture.root, 'docs/assets/art.svg'));
    const file = path.join(fixture.root, 'docs/de/r/result-1/index.html');
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('de story 1.', 'en story 1.'));
    const errors = validateRepository(fixture.root).errors.join('\n');
    assert.match(errors, /route missing/); assert.match(errors, /broken local URL/); assert.match(errors, /translated result story missing/);
  } finally { fixture.cleanup(); }
});
test('detects sitemap duplicates, wrong canonicals, missing hreflang and unsafe publisher requests', () => {
  const fixture = fixtureRepository();
  try {
    const file = path.join(fixture.root, 'docs/index.html');
    let html = fs.readFileSync(file, 'utf8');
    html = html.replace('rel="canonical" href="https://nanalab.kr/fixture-game/"', 'rel="canonical" href="https://nanalab.kr/wrong/"');
    html = html.replace(/<link rel="alternate" hreflang="pt"[^>]*>/, '');
    html = html.replace("location.hostname === 'nanalab.kr'", 'true');
    fs.writeFileSync(file, html);
    const sitemap = path.join(fixture.root, 'docs/sitemap.xml'); fs.appendFileSync(sitemap, '<loc>https://nanalab.kr/fixture-game/</loc>');
    const errors = validateRepository(fixture.root).errors.join('\n');
    for (const fragment of ['canonical mismatch', 'hreflang pt', 'publisher requests on localhost', 'sitemap: duplicate']) assert.ok(errors.includes(fragment), fragment);
  } finally { fixture.cleanup(); }
});
test('active noscript tracker iframe is rejected because it bypasses localhost guard', () => {
  const fixture = fixtureRepository();
  try {
    const file = path.join(fixture.root, 'docs/index.html');
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('</noscript>', '<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-NV2WWQXB"></iframe></noscript>'));
    assert.match(validateRepository(fixture.root).errors.join('\n'), /active publisher iframe bypasses local-host guard/);
  } finally { fixture.cleanup(); }
});
