import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {renderArt,renderCard} from '../src/art.mjs';
import {completeTracking} from './publisher-tracking.mjs';

const root=process.cwd(), docs=path.join(root,'docs');
const data=JSON.parse(await fs.readFile(path.join(root,'data/game.json'),'utf8'));
const ui=JSON.parse(await fs.readFile(path.join(root,'src/ui.json'),'utf8'));
const copy=JSON.parse(await fs.readFile(path.join(root,'src/page-copy.json'),'utf8'));
const langs=['ko','en','es','zh','ja','de','fr','pt'];
const labels={ko:'한국어',en:'English',es:'Español',zh:'简体中文',ja:'日本語',de:'Deutsch',fr:'Français',pt:'Português'};
const base=(process.env.SITE_URL||`https://nanalab.kr/${data.slug}/`).replace(/\/?$/,'/');
if(!/^https:\/\/(?:nanalab\.kr|nanacompany\.github\.io)\//.test(base))throw Error('Unexpected production URL');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json=s=>JSON.stringify(s).replace(/</g,'\\u003c');
const route=(lang,suffix='')=>`${lang==='ko'?'':lang+'/'}${suffix}`;
const url=(lang,suffix='')=>base+route(lang,suffix);
const allFiles=[];
async function put(name,body){await fs.mkdir(path.dirname(path.join(docs,name)),{recursive:true});await fs.writeFile(path.join(docs,name),body);allFiles.push(name);}
await fs.mkdir(docs,{recursive:true});
for(const file of ['app.js','engine.mjs','art.mjs','style.css'])await put('assets/'+file,await fs.readFile(path.join(root,'src',file)));
await put('assets/game.json',json(data));
const require=createRequire(import.meta.url);
let sharp;
try{sharp=require('sharp');}catch{if(process.env.NANA_NODE_MODULES)sharp=require(path.join(process.env.NANA_NODE_MODULES,'sharp'));else throw Error('Install dependencies with npm ci before building OG images');}
async function ogImage(entry,lang){
  const item=entry||data.entries[0],t=item.text[lang];
  const svg=renderCard(item.art,{name:entry?t.name:data.title[lang],subtitle:entry?t.blurb:data.description[lang],kind:data.kind,details:entry?Object.entries(t.fields).map(([key,value])=>({label:data.fieldLabels[key][lang],value})):[]});
  const filename=`og/${lang}/${entry?entry.id:'default'}`;
  await put(filename+'.svg',svg);
  await put(filename+'.png',await sharp(Buffer.from(svg)).resize(1200,900).png().toBuffer());
}
for(const lang of langs){await ogImage(null,lang);for(const entry of data.entries)await ogImage(entry,lang);}
const assetBase=new URL('assets/',base).pathname;
function nav(lang,suffix=''){
  return `<nav class="language-links" aria-label="${esc(ui[lang].chooseLanguage)}">${langs.map(l=>`<a lang="${l}" hreflang="${l}" href="${esc(url(l,suffix))}"${l===lang?' aria-current="page"':''}>${labels[l]}</a>`).join('')}</nav>`;
}
function footer(lang){const u=ui[lang];return `<footer><a href="${url(lang)}">${esc(u.home)}</a><a href="${url(lang,'sources/')}">${esc(u.sources)}</a><a href="${url(lang,'privacy/')}">${esc(u.privacy)}</a><span>© 2026 · ${esc(copy[lang].original)}</span></footer><a class="more-apps" href="https://nanalab.kr/apps/" rel="noopener">More Apps</a>`;}
function head(lang,title,description,suffix='',entry=null){
  const canonical=url(lang,suffix),og=base+`og/${lang}/${entry?entry.id:'default'}.png`;
  const schema=entry?{'@context':'https://schema.org','@type':'WebPage',name:title,description,url:canonical,inLanguage:lang,isPartOf:{'@type':'WebApplication',name:data.title[lang],url:url(lang),applicationCategory:'GameApplication',operatingSystem:'Any'}}:{'@context':'https://schema.org','@type':'WebApplication',name:title,description,url:canonical,inLanguage:lang,applicationCategory:'GameApplication',operatingSystem:'Any',isAccessibleForFree:true,offers:{'@type':'Offer',price:'0',priceCurrency:'USD'}};
  return `<!doctype html><html lang="${lang}" data-kind="${data.kind}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><meta name="robots" content="index,follow,max-image-preview:large"><meta name="theme-color" content="${({era:'#79603c',status:'#455e5e',cheat:'#6554af',dog:'#ad6433',cat:'#417969'})[data.kind]}"><link rel="canonical" href="${canonical}">${langs.map(l=>`<link rel="alternate" hreflang="${l}" href="${url(l,suffix)}">`).join('')}<link rel="alternate" hreflang="x-default" href="${url('ko',suffix)}"><meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${og}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="900"><meta property="og:locale" content="${({ko:'ko_KR',en:'en_US',es:'es_ES',zh:'zh_CN',ja:'ja_JP',de:'de_DE',fr:'fr_FR',pt:'pt_BR'})[lang]}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${og}"><link rel="icon" href="${base}favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="${assetBase}style.css"><script type="application/ld+json">${json(schema)}</script></head>`;
}
function details(entry,lang){const t=entry.text[lang];return Object.entries(t.fields).map(([k,v])=>`<div><dt>${esc(data.fieldLabels[k][lang])}</dt><dd>${esc(v)}</dd></div>`).join('');}
function sourceLinks(entry){const ids=new Set(entry?.sourceIds||data.sources.map(s=>s.id));return data.sources.filter(s=>ids.has(s.id)).map(s=>`<li><a href="${esc(s.url)}" rel="noopener noreferrer">${esc(s.label)}</a></li>`).join('');}
function shareButtons(lang){const u=ui[lang];return `<div class="share-actions"><button id="share-button" type="button">${esc(u.share)}</button><button id="copy-button" type="button">${esc(u.copy)}</button><button id="x-button" type="button">${esc(u.x)}</button><button id="facebook-button" type="button">${esc(u.facebook)}</button><button id="download-button" type="button">${esc(u.download)}</button></div>`;}
function result(entry,lang){const u=ui[lang],t=entry?.text[lang];return `<section id="result" class="result"${entry?'':' hidden'} tabindex="-1" aria-labelledby="result-name"><div class="result-picture" id="result-art">${entry?renderArt(entry.art,{name:t.name,subtitle:t.blurb,kind:data.kind}):''}</div><div class="result-body"><p class="eyebrow">${esc(u.result)}</p><h2 id="result-name">${esc(t?.name||'')}</h2><p id="result-blurb">${esc(t?.blurb||'')}</p><p id="result-year" class="assigned-year" hidden></p><dl id="result-fields">${entry?details(entry,lang):''}</dl><p id="result-story" class="story">${esc(t?.story||'')}</p><p id="result-probability" class="probability">${entry?`${esc(u.probability)}: ${(entry.weight/data.entries.reduce((s,e)=>s+e.weight,0)*100).toLocaleString(lang,{maximumFractionDigits:2})}%`:''}</p><p id="remaining" class="remaining"></p><button class="primary" id="redraw-button" type="button"${entry?' disabled':''}>${esc(u.redraw)}</button>${shareButtons(lang)}<p class="fine-print">${esc(u.shareNote)}</p><p class="fine-print">${esc(u.redrawNote)}</p>${true?`<ul id="result-sources" class="result-sources">${sourceLinks(entry)}</ul>`:''}</div></section>`;}
function page(lang,entry=null){
  const u=ui[lang],c=copy[lang],suffix=entry?`r/${entry.id}/`:'',title=entry?`${entry.text[lang].name} · ${data.title[lang]}`:data.title[lang],description=entry?entry.text[lang].blurb:data.description[lang];
  const config={slug:data.slug,kind:data.kind,lang,baseURL:base,dataURL:assetBase+'game.json',ui:u,sharedResultId:entry?.id||null};
  const hero=`<header class="hero"><div><p class="edition">${esc(c.record)}</p><h1>${esc(data.title[lang])}</h1><p class="description">${esc(data.description[lang])}</p><button class="primary draw" id="draw-button" type="button" disabled>${esc(entry?u.startOwn:u.draw)}</button><p class="fine-print">${esc(u.privacyNote)}</p></div><figure class="hero-art"${entry?' hidden':''}>${renderArt(data.entries[0].art,{name:'',subtitle:'',kind:data.kind})}</figure></header>`;
  const catalog=`<section class="catalog"><h2>${esc(c.outcomes)}</h2><div class="outcome-grid">${data.entries.map(e=>`<a href="${url(lang,`r/${e.id}/`)}"><span>${esc(e.text[lang].name)}</span><small>${esc(e.text[lang].blurb)}</small></a>`).join('')}</div></section>`;
  return completeTracking(head(lang,title,description,suffix,entry)+`<body>${nav(lang,suffix)}<main>${hero}<p id="status" role="status" aria-live="polite">${esc(entry?u.preview:u.loading)}</p>${result(entry,lang)}<section class="instructions"><h2>${esc(u.howToPlay)}</h2><p>${esc(u.redrawNote)}</p><p>${esc(data.probabilityNote[lang])}</p><p>${esc(u.gameNote)}</p></section>${catalog}</main>${footer(lang)}<script id="game-config" type="application/json">${json(config)}</script><script type="module" src="${assetBase}app.js"></script></body></html>`);
}
function info(lang,kind){const u=ui[lang],c=copy[lang],title=kind==='sources'?u.sources:u.privacy,suffix=kind+'/';let content;
  if(kind==='sources')content=`<p>${esc(c.sourceNote)}</p><p>${esc(data.probabilityNote[lang])}</p><ul class="sources-list">${sourceLinks()}</ul><p>${esc(c.original)}</p>`;
  else content=`<p>${esc(u.privacyNote)}</p><p>${esc(c.tracking)}</p><p>${esc(c.storage)}</p><p>${esc(u.shareNote)}</p><p>${esc(c.external)}</p>`;
  return completeTracking(head(lang,`${title} · ${data.title[lang]}`,kind==='sources'?c.sourceNote:u.privacyNote,suffix)+`<body>${nav(lang,suffix)}<main class="info"><a class="back-link" href="${url(lang)}">← ${esc(u.back)}</a><h1>${esc(title)}</h1>${content}</main>${footer(lang)}</body></html>`);
}
for(const lang of langs){await put(route(lang)+'index.html',page(lang));for(const entry of data.entries)await put(route(lang,`r/${entry.id}/index.html`),page(lang,entry));for(const kind of ['sources','privacy'])await put(route(lang,kind+'/index.html'),info(lang,kind));}
// Compatibility Korean paths carry the same canonical/alternate targets as the Korean root.
for(const file of [...allFiles].filter(f=>f.endsWith('.html')&&!langs.slice(1).some(l=>f.startsWith(l+'/')))){await put('ko/'+file,await fs.readFile(path.join(docs,file)));}
await put('favicon.svg',renderArt(data.entries[0].art,{name:'',subtitle:'',kind:data.kind}));
await put('.nojekyll','');
await put('robots.txt',`User-agent: *\nAllow: /\nSitemap: ${base}sitemap.xml\n`);
const canonicalURLs=allFiles.filter(f=>f.endsWith('/index.html')||f==='index.html').filter(f=>!f.startsWith('ko/')).map(f=>base+f.replace(/index\.html$/,''));
const xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'+canonicalURLs.map(loc=>{const rel=loc.slice(base.length),lang=langs.slice(1).find(l=>rel.startsWith(l+'/'))||'ko',suffix=lang==='ko'?rel:rel.slice(lang.length+1);return `<url><loc>${esc(loc)}</loc><lastmod>${data.checkedAt}</lastmod>${langs.map(l=>`<xhtml:link rel="alternate" hreflang="${l}" href="${esc(url(l,suffix))}"/>`).join('')}<xhtml:link rel="alternate" hreflang="x-default" href="${esc(url('ko',suffix))}"/></url>`;}).join('\n')+'\n</urlset>\n';
await put('sitemap.xml',xml);
const manifest={slug:data.slug,languages:langs,results:data.entries.length,pages:allFiles.filter(f=>f.endsWith('.html')).length,sitemapURLs:canonicalURLs.length,baseURL:base,dataHash:createHash('sha256').update(json(data)).digest('hex')};
await put('build-manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(manifest));
