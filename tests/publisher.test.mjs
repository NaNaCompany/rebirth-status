import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {completeTracking,publisherHead,PUBLISHER_IDS} from '../scripts/publisher-tracking.mjs';
const shell='<html><head><title>Test</title></head><body><main>Game</main></body></html>';
const source=publisherHead().match(/<script[^>]*>([\s\S]*?)<\/script>/)[1];
function browser({protocol='https:',hostname='nanacompany.github.io',readyState='complete',edge=false}={}){
  const scripts=[];
  if(edge)scripts.push({src:'https://static.cloudflareinsights.com/beacon.min.js'});
  const listeners={};
  const document={title:'Game title',readyState,head:{appendChild:s=>scripts.push(s)},createElement:()=>({attrs:{},setAttribute(k,v){this.attrs[k]=v;}}),querySelectorAll:()=>scripts,querySelector:selector=>scripts.find(s=>s.src.includes('static.cloudflareinsights.com/beacon.min.js'))||null,addEventListener:(name,fn)=>{listeners[name]=fn;}};
  const window={location:{protocol,hostname,origin:`${protocol}//${hostname}`,pathname:'/r/test/',search:'?private=secret'}};
  const context=vm.createContext({window,document,Date,JSON,Object,String});
  return {window,scripts,listeners,run:()=>vm.runInContext(source,context)};
}
test('all four publisher integrations are singular and build output is idempotent',()=>{
  const once=completeTracking(shell);
  assert.equal(completeTracking(once),once);
  for(const id of Object.values(PUBLISHER_IDS))assert.ok(once.includes(id));
  assert.equal((once.match(/data-publisher-bootstrap/g)||[]).length,1);
  assert.match(once,/<noscript data-publisher-gtm-fallback="GTM-NV2WWQXB">/);
  assert.doesNotMatch(once,/<script[^>]+\bsrc=|<iframe\b/);
});
test('legacy inline/external trackers, noscript, and preload hints are removed',()=>{
  const dirty=shell.replace('</head>',`<script src="https://www.googletagmanager.com/gtag/js?id=G-OLDOLD"></script><script>gtag('config','G-OLDOLD')</script><script src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-123"></script><script data-cf-beacon='{"token":"old"}' src="https://static.cloudflareinsights.com/beacon.min.js"></script><link rel="preconnect" href="https://www.googletagmanager.com"></head>`).replace('<body>','<body><noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-OLD"></iframe></noscript><script id="game-config" type="application/json">{"slug":"safe"}</script>');
  const output=completeTracking(dirty);
  assert.doesNotMatch(output,/G-OLDOLD|GTM-OLD|ca-pub-123|<iframe|preconnect/);
  assert.match(output,/id="game-config"/);
  assert.equal(completeTracking(output),output);
});
test('HTTPS production loads exactly four remote scripts once',()=>{
  for(const hostname of ['nanacompany.github.io','nanalab.kr','games.nanalab.kr']){
    const b=browser({hostname});b.run();b.run();
    assert.equal(b.scripts.length,4,hostname);
    assert.equal(new Set(b.scripts.map(s=>s.src)).size,4);
    assert.equal(b.window.dataLayer.filter(x=>x.event==='gtm.js').length,1);
    const config=b.window.dataLayer.find(x=>x[0]==='config');
    assert.equal(config[2].send_page_view,false);
    assert.equal(config[2].page_location,`https://${hostname}/r/test/`);
    assert.equal(config[2].page_referrer,'');
    const views=b.window.dataLayer.filter(x=>x[0]==='event'&&x[1]==='page_view');
    assert.equal(views.length,1);
    assert.equal(views[0][2].page_location,`https://${hostname}/r/test/`);
    assert.equal(views[0][2].page_title,'Game title');
    assert.doesNotMatch(JSON.stringify(b.window.dataLayer),/private|secret/);
  }
});
test('local, HTTP and unrecognized preview hosts create no requests or tracker state',()=>{
  for(const hostname of ['localhost','dev.localhost','127.0.0.1','127.1.2.3','::1','[::1]','0.0.0.0','preview.test','nanacompany.github.io.evil.test','nanalab.kr.evil.test']){
    const b=browser({hostname});b.run();
    assert.equal(b.scripts.length,0,hostname);assert.equal(b.window.dataLayer,undefined);
  }
  for(const protocol of ['http:','file:','about:']){const b=browser({protocol});b.run();assert.equal(b.scripts.length,0);}
});
test('Cloudflare reuses edge injected script after parsing and after load',()=>{
  for(const readyState of ['loading','complete']){
    const b=browser({readyState,edge:true});b.run();
    if(readyState==='loading')b.listeners.DOMContentLoaded();
    assert.equal(b.scripts.filter(s=>s.src.includes('cloudflareinsights.com')).length,1);
    assert.equal(b.scripts.length,4);
  }
  const b=browser({readyState:'loading'});b.run();
  assert.equal(b.scripts.length,3);
  b.scripts.push({src:'https://static.cloudflareinsights.com/beacon.min.js?edge=1'});
  b.listeners.DOMContentLoaded();assert.equal(b.scripts.length,4);
});
test('non documents remain unchanged and malformed documents fail clearly',()=>{
  assert.equal(completeTracking('<p>fragment</p>'),'<p>fragment</p>');
  assert.throws(()=>completeTracking(null),TypeError);
  assert.throws(()=>completeTracking('<html><head></head></html>'),/body is required/);
});
