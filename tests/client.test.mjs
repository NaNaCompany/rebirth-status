import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGame,LANGUAGES} from '../src/engine.mjs';
import {createController,bootGame,resultURL,downloadPNG} from '../src/app.js';

const ui = JSON.parse(fs.readFileSync(new URL('../src/ui.json',import.meta.url),'utf8'));
function dataset(kind='dog') {
  const translate=value=>Object.fromEntries(LANGUAGES.map(lang=>[lang,value]));
  return {schemaVersion:1,slug:'test-game',kind,fieldLabels:{trait:translate('Trait')},probabilityNote:translate('Authored game weights.'),entries:['first','second'].map((id,index)=>({id,weight:index+1,yearRange:index?{from:1,to:2026}:{from:-10000,to:-1},art:{type:kind==='era'?'human':'dog'},text:Object.fromEntries(LANGUAGES.map(lang=>[lang,{name:lang==='ko'?`${id}<script>alert(1)</script>`:id,blurb:'A <b>fictional</b> result.',story:'One day. Another day.',fields:{trait:'<img src=x onerror=alert(1)>'}}]))}))};
}
function memory(){let value=null;return{getItem:()=>value,setItem:(_,next)=>{value=next;},value:()=>value};}
function fixture({kind,lang='en',sharedResultId,sharedYear,env:overrides={}}={}) {
  const data=dataset(kind);const storage=memory();const game=createGame(data,{storage,random:()=>0});const messages=[],renders=[],events=[];
  const config={slug:data.slug,kind:data.kind,lang,ui:ui[lang],baseURL:'https://nanalab.kr/test-game/',sharedResultId,sharedYear};
  const env={copy:async()=>{},share:async()=>{},open:()=>({location:{replace(){}},close(){}}),download:async()=>{},track:(...event)=>events.push(event),...overrides};
  const controller=createController({game,data,config,env,view:{message:text=>messages.push(text),render:value=>renders.push(value)}});
  return{data,storage,game,config,env,controller,messages,renders,events};
}

test('all eight UI dictionaries have identical nonempty keys and all required labels',()=>{
  assert.deepEqual(Object.keys(ui),LANGUAGES);const keys=Object.keys(ui.en).sort();
  for(const lang of LANGUAGES){assert.deepEqual(Object.keys(ui[lang]).sort(),keys);for(const value of Object.values(ui[lang]))assert.ok(typeof value==='string'&&value.length>0);}
  for(const key of ['draw','redraw','share','copy','x','facebook','download','remaining','result','probability','sources','privacy','howToPlay','resume','back','startOwn','home','chooseLanguage','gameNote','shareNote','privacyNote','redrawNote','year','bce','ce'])assert.ok(keys.includes(key));
});
test('share routes preserve language, result and historical year with no query leak',()=>{
  const f=fixture();assert.equal(resultURL(f.config,{id:'first',year:-10000}),'https://nanalab.kr/test-game/en/r/first/?year=-10000');
  f.config.lang='ko';assert.equal(resultURL(f.config,{id:'second'}),'https://nanalab.kr/test-game/r/second/');
  assert.throws(()=>resultURL(f.config,{id:'../../evil'}));assert.throws(()=>resultURL({...f.config,baseURL:'javascript:alert(1)'},{id:'first'}));
});
test('controller first draw and exhausted redraw do not reset attempts',()=>{
  const f=fixture();f.controller.start();assert.equal(f.controller.draw(),true);assert.equal(f.game.getState().remaining,1);
  assert.equal(f.controller.draw(),true);assert.equal(f.game.getState().remaining,0);assert.equal(f.controller.draw(),false);assert.equal(f.messages.at(-1),ui.en.noAttempts);
  assert.deepEqual(f.events.map(event=>event[0]),['draw','redraw']);
});
test('successful clipboard preparation grants +2 only once for current result',async()=>{
  let copied;const f=fixture({env:{copy:async url=>{copied=url;}}});f.controller.draw();
  assert.equal(await f.controller.share('copy'),true);assert.equal(f.game.getState().remaining,3);assert.match(copied,/\/en\/r\/first\/$/);
  await f.controller.share('copy');assert.equal(f.game.getState().remaining,3);assert.ok(f.messages.at(-1).includes(ui.en.bonusUsed));
});
test('clipboard failure never grants a reward',async()=>{
  const f=fixture({env:{copy:async()=>{throw Error('denied');}}});f.controller.draw();assert.equal(await f.controller.share('copy'),false);assert.equal(f.game.getState().remaining,1);assert.equal(f.messages.at(-1),ui.en.copyFailed);
});
test('native abort, native failure and unsupported sharing never grant rewards',async()=>{
  for(const [share,expected] of [[async()=>{throw Object.assign(Error('abort'),{name:'AbortError'});},'cancelled'],[async()=>{throw Error('failure');},'shareFailed'],[undefined,'shareUnavailable']]){
    const f=fixture({env:{share}});f.controller.draw();assert.equal(await f.controller.share('native'),false);assert.equal(f.game.getState().remaining,1);assert.equal(f.messages.at(-1),ui.en[expected]);
  }
});
test('native completion means prepared, not proof of sending',async()=>{
  const f=fixture();f.controller.draw();await f.controller.share('native');assert.equal(f.game.getState().remaining,3);assert.ok(f.messages.at(-1).includes(ui.en.prepared));
});
test('blocked or inaccessible popup never grants rewards',async()=>{
  for(const open of [()=>null,()=>({location:{replace(){throw Error('denied');}},close(){}})]){
    const f=fixture({env:{open}});f.controller.draw();assert.equal(await f.controller.share('x'),false);assert.equal(f.game.getState().remaining,1);assert.equal(f.messages.at(-1),ui.en.popupBlocked);
  }
});
test('X and Facebook composers use official endpoints and clear opener',async()=>{
  for(const method of ['x','facebook']){
    let target,initial;const popup={opener:'old',location:{replace:url=>{target=url;}}};const f=fixture({env:{open:url=>{initial=url;return popup;}}});f.controller.draw();await f.controller.share(method);
    assert.equal(initial,'about:blank');assert.equal(popup.opener,null);assert.ok(target.startsWith(method==='x'?'https://twitter.com/intent/tweet?':'https://www.facebook.com/sharer/sharer.php?'));assert.equal(f.game.getState().remaining,3);
  }
});
test('pending sharing locks draw and other sharing to prevent reward races',async()=>{
  let finish;const pending=new Promise(resolve=>{finish=resolve;});const f=fixture({env:{copy:()=>pending}});f.controller.draw();const operation=f.controller.share('copy');
  assert.equal(f.controller.draw(),false);assert.equal(await f.controller.share('native'),false);assert.equal(f.game.getState().drawCount,1);finish();await operation;assert.equal(f.game.getState().remaining,3);assert.equal(f.renders.at(-1).busy,false);
});
test('shared preview preserves personal cache and receives no bonus',async()=>{
  const f=fixture({kind:'era',sharedResultId:'second',sharedYear:2026});f.game.draw();const saved=f.storage.value();f.controller.start();assert.equal(f.controller.getDisplayed().id,'second');assert.equal(f.controller.getDisplayed().year,2026);
  await f.controller.share('copy');assert.equal(f.storage.value(),saved);assert.equal(f.game.getState().remaining,1);
  assert.equal(f.controller.draw(),true);assert.equal(f.controller.getDisplayed().id,'first');assert.equal(f.controller.getDisplayed().preview,false);assert.equal(f.storage.value(),saved);
});
test('shared preview starts a new personal game only on explicit start action',()=>{
  const f=fixture({sharedResultId:'second'});f.controller.start();assert.equal(f.game.getState().result,null);assert.equal(f.storage.value(),null);
  f.controller.draw();assert.equal(f.game.getState().result.id,'first');assert.equal(f.game.getState().drawCount,1);
});
test('invalid year or result shows localized link error and personal result',()=>{
  for(const sharedResultId of ['missing','second']){const f=fixture({kind:'era',sharedResultId,sharedYear:0});f.game.draw();f.controller.start();assert.equal(f.controller.getDisplayed().id,'first');assert.equal(f.messages.at(-1),ui.en.invalidLink);}
});
test('PNG action uses the original generated result-card SVG with visible result text and no share reward',async()=>{
  let source,name;const f=fixture({env:{download:async(svg,file)=>{source=svg;name=file;}}});f.controller.draw();assert.equal(await f.controller.download(),true);
  assert.match(source,/<svg/);assert.match(source,/viewBox="0 0 1200 900"/);assert.ok(!source.includes('<script>'));
  const visibleText=[...source.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)].map(match=>match[1].replace(/<[^>]*>/g,'')).join(' ');
  assert.ok(visibleText.includes('first'));assert.ok(visibleText.includes('Trait'));assert.ok(visibleText.includes('&lt;img'));
  assert.equal(name,'test-game-first.png');assert.equal(f.game.getState().remaining,1);assert.equal(f.events.at(-1)[0],'download');
});
test('PNG card embeds localized historical year as visible text in all eight languages',async()=>{
  for(const lang of LANGUAGES){let source;const f=fixture({kind:'era',lang,env:{download:async svg=>{source=svg;}}});f.controller.draw();assert.equal(await f.controller.download(),true);
    const visibleText=[...source.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)].map(match=>match[1].replace(/<[^>]*>/g,'')).join(' ');
    assert.ok(visibleText.includes('10000'));assert.ok(visibleText.includes(ui[lang].year));assert.ok(visibleText.replace(/\s+/gu,'').includes(ui[lang].bce.replace('{n}','10000').replace(/\s+/gu,'')),`${lang}: ${visibleText}`);
  }
});
test('download failure is localized and unlocks controls',async()=>{
  const f=fixture({lang:'ja',env:{download:async()=>{throw Error('canvas');}}});f.controller.draw();assert.equal(await f.controller.download(),false);assert.equal(f.messages.at(-1),ui.ja.downloadFailed);assert.equal(f.renders.at(-1).busy,false);
});
test('analytics records only bounded game/action/result IDs and share method',async()=>{
  const f=fixture();f.controller.start();assert.equal(f.events.length,0);f.controller.draw();await f.controller.share('copy');await f.controller.download();
  for(const [action,parameters]of f.events){assert.ok(['draw','redraw','share_prepare','download'].includes(action));assert.ok(Object.keys(parameters).every(key=>['game_id','result_id','method'].includes(key)));assert.equal(parameters.game_id,'test-game');assert.equal(parameters.result_id,'first');}
});

class Element {
  constructor(tag='div'){this.tagName=tag;this.children=[];this.listeners={};this.hidden=false;this.disabled=false;this.textContent='';}
  set innerHTML(_){throw Error('Unsafe DOM sink');}
  append(...elements){this.children.push(...elements);}
  replaceChildren(...elements){this.children=[...elements];}
  addEventListener(name,handler){this.listeners[name]=handler;}
  click(){this.clicked=true;this.listeners.click?.();}
  remove(){this.removed=true;}
  focus(){this.focused=true;}
}
function domFixture(lang='en',href='https://nanalab.kr/test-game/'){
  const nodes=new Map();for(const id of ['game-config','draw-button','result','result-name','result-blurb','result-year','result-art','result-fields','result-story','result-probability','result-sources','remaining','redraw-button','share-button','copy-button','x-button','facebook-button','download-button','status'])nodes.set(id,new Element());
  const config={slug:'test-game',kind:'dog',lang,ui:ui[lang],baseURL:'https://nanalab.kr/test-game/',dataURL:'/test-game/assets/game.json'};nodes.get('game-config').textContent=JSON.stringify(config);
  const heroArt=new Element('figure');const body=new Element('body');const document={getElementById:id=>nodes.get(id),createElement:tag=>new Element(tag),querySelector:selector=>selector==='.hero-art'?heroArt:null,body};
  const window={navigator:{clipboard:{writeText:async()=>{}}},location:new URL(href),localStorage:memory(),fetch:async()=>({ok:true,json:async()=>dataset()}),open:()=>null};
  return{nodes,config,document,window,heroArt};
}
test('actual DOM controller safely renders literal hostile names and fields in every language',async()=>{
  for(const lang of LANGUAGES){const f=domFixture(lang);const runtime=await bootGame({...f,random:()=>0});assert.ok(runtime);f.nodes.get('draw-button').click();assert.equal(f.nodes.get('result').hidden,false);assert.equal(f.nodes.get('result').focused,true);assert.equal(f.nodes.get('result-fields').children[0].tagName,'div');assert.ok(f.nodes.get('result-fields').children[0].children[1].textContent.includes('<img'));assert.equal(f.nodes.get('result-art').children[0].tagName,'img');assert.ok(!decodeURIComponent(f.nodes.get('result-art').children[0].src).includes('<script>'));assert.equal(f.nodes.get('remaining').textContent,ui[lang].remaining.replace('{n}','1'));}
});
test('boot handles blocked localStorage and malformed shared year without crashing',async()=>{
  const f=domFixture('fr');Object.defineProperty(f.window,'localStorage',{get(){throw Error('blocked');}});const runtime=await bootGame(f);assert.ok(runtime);assert.equal(f.nodes.get('status').textContent,ui.fr.storageUnavailable);runtime.controller.draw();assert.equal(runtime.game.getState().storageAvailable,false);
  const era=domFixture('en','https://nanalab.kr/test-game/r/second/?year=0');era.config.kind='era';era.config.sharedResultId='second';era.nodes.get('game-config').textContent=JSON.stringify(era.config);era.window.fetch=async()=>({ok:true,json:async()=>dataset('era')});const eraRuntime=await bootGame(era);assert.ok(eraRuntime);assert.equal(era.nodes.get('status').textContent,ui.en.invalidLink);
});
test('DOM preview hides hero artwork and own-game button preserves the saved result',async()=>{
  const f=domFixture();const data=dataset();const game=createGame(data,{storage:f.window.localStorage,random:()=>0});game.draw();
  f.config.sharedResultId='second';f.nodes.get('game-config').textContent=JSON.stringify(f.config);
  const runtime=await bootGame(f);assert.equal(f.heroArt.hidden,true);assert.equal(f.nodes.get('draw-button').textContent,ui.en.startOwn);assert.equal(f.nodes.get('redraw-button').hidden,true);
  f.nodes.get('draw-button').click();assert.equal(runtime.controller.getDisplayed().id,'first');assert.equal(runtime.game.getState().drawCount,1);assert.equal(f.nodes.get('draw-button').hidden,true);assert.equal(f.nodes.get('redraw-button').hidden,false);
});
test('DOM historical shared year is preserved in the outgoing copied link',async()=>{
  const f=domFixture('ja','https://nanalab.kr/test-game/ja/r/second/?year=2026&private=secret');let copied;
  f.config.kind='era';f.config.sharedResultId='second';f.nodes.get('game-config').textContent=JSON.stringify(f.config);f.window.fetch=async()=>({ok:true,json:async()=>dataset('era')});f.window.navigator.clipboard.writeText=async url=>{copied=url;};
  const runtime=await bootGame(f);assert.equal(f.nodes.get('result-year').textContent,`${ui.ja.year}: ${ui.ja.ce.replace('{n}','2026')}`);await runtime.controller.share('copy');assert.equal(copied,'https://nanalab.kr/test-game/ja/r/second/?year=2026');assert.equal(runtime.game.getState().result,null);
});
test('result source list follows redraw and rejects executable source URLs',async()=>{
  const f=domFixture();const data=dataset();data.sources=[{id:'first-source',url:'https://museum.example/first',label:'First museum'},{id:'second-source',url:'https://museum.example/second',label:'Second museum'},{id:'bad-source',url:'javascript:alert(1)',label:'Bad'}];data.entries[0].sourceIds=['first-source','bad-source'];data.entries[1].sourceIds=['second-source'];f.window.fetch=async()=>({ok:true,json:async()=>data});
  const runtime=await bootGame({...f,random:()=>0});runtime.controller.draw();let links=f.nodes.get('result-sources').children;assert.equal(links.length,1);assert.equal(links[0].children[0].textContent,'First museum');assert.equal(links[0].children[0].rel,'noopener noreferrer');
  runtime.controller.draw();links=f.nodes.get('result-sources').children;assert.equal(links.length,1);assert.equal(links[0].children[0].textContent,'Second museum');
});
test('main-route reload restores exhausted cached result and disables redraw without reroll',async()=>{
  const first=domFixture();const runtime=await bootGame({...first,random:()=>0});runtime.controller.draw();runtime.controller.draw();const saved=first.window.localStorage.value();
  const second=domFixture();second.window.localStorage=first.window.localStorage;const restored=await bootGame({...second,random:()=>{throw Error('unexpected reroll');}});
  assert.equal(restored.controller.getDisplayed().id,'second');assert.equal(restored.game.getState().remaining,0);assert.equal(second.nodes.get('redraw-button').disabled,true);assert.equal(second.nodes.get('draw-button').hidden,true);assert.equal(second.nodes.get('status').textContent,ui.en.resume);assert.equal(second.window.localStorage.value(),saved);
});
test('actual DOM disables all actions while clipboard is pending and restores them after rejection',async()=>{
  const f=domFixture();let reject;f.window.navigator.clipboard.writeText=()=>new Promise((_,failure)=>{reject=failure;});const runtime=await bootGame({...f,random:()=>0});runtime.controller.draw();const pending=runtime.controller.share('copy');
  for(const id of ['draw-button','redraw-button','share-button','copy-button','x-button','facebook-button','download-button'])assert.equal(f.nodes.get(id).disabled,true);
  reject(Error('clipboard blocked'));await pending;assert.equal(f.nodes.get('copy-button').disabled,false);assert.equal(f.nodes.get('redraw-button').disabled,false);assert.equal(runtime.game.getState().remaining,1);assert.equal(f.nodes.get('status').textContent,ui.en.copyFailed);
});
test('failed fetch disables actions and uses localized error',async()=>{
  const f=domFixture('de');f.window.fetch=async()=>({ok:false});assert.equal(await bootGame(f),null);assert.equal(f.nodes.get('status').textContent,ui.de.loadFailed);assert.equal(f.nodes.get('draw-button').disabled,true);
});
test('actual analytics adapter suppresses preview hosts and sends only action records on HTTPS',async()=>{
  for(const href of ['http://localhost/test-game/','https://127.0.0.1/test-game/','https://[::1]/test-game/','https://nanalab.kr/test-game/']){
    const f=domFixture('en',href);const events=[];f.window.gtag=(...args)=>events.push(args);const runtime=await bootGame({...f,random:()=>0});runtime.controller.draw();assert.equal(events.length,href==='https://nanalab.kr/test-game/'?1:0);
  }
});
test('canvas PNG export draws SVG pixels, triggers download, and revokes both object URLs',async()=>{
  const revoked=[],created=[],drawn=[],anchors=[];let counter=0;class Image{set src(value){this.source=value;queueMicrotask(()=>this.onload());}}
  const canvas={getContext:()=>({drawImage:(...args)=>drawn.push(args)}),toBlob:callback=>callback({type:'image/png'})};
  const document={body:{append:anchor=>anchors.push(anchor)},createElement:tag=>tag==='canvas'?canvas:new Element('a')};
  const window={Image,Blob:class Blob{constructor(parts,options){this.parts=parts;this.type=options.type;}},URL:{createObjectURL:blob=>{created.push(blob);return `blob:${++counter}`;},revokeObjectURL:url=>revoked.push(url)},setTimeout:fn=>fn()};
  await downloadPNG('<svg xmlns="http://www.w3.org/2000/svg"/>','result.png',{document,window});assert.equal(created[0].type,'image/svg+xml;charset=utf-8');assert.deepEqual(created[0].parts,['<svg xmlns="http://www.w3.org/2000/svg"/>']);assert.equal(drawn.length,1);assert.deepEqual(drawn[0].slice(1),[0,0,1600,1200]);assert.equal(anchors[0].download,'result.png');assert.equal(anchors[0].clicked,true);assert.equal(anchors[0].removed,true);assert.deepEqual(revoked,['blob:1','blob:2']);
});
