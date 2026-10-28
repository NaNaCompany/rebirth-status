import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,weightedDraw,drawYear,validateDataset,LANGUAGES} from '../src/engine.mjs';

const dataset = kind => ({schemaVersion:1,slug:'test-game',kind:kind || 'dog',entries:[{id:'first',weight:1,yearRange:{from:-10000,to:-1}},{id:'second',weight:3,yearRange:{from:1,to:2026}}]});
const memory = initial => {let value = initial ?? null; return {getItem:()=>value,setItem:(_,next)=>{value=next;},removeItem:()=>{value=null;},value:()=>value};};

test('eight stable language identifiers',() => assert.deepEqual(LANGUAGES,['ko','en','es','zh','ja','de','fr','pt']));
test('first draw is free, grants one redraw, and repeat initial draw cannot reset it',() => {
  const game = createGame(dataset(),{random:()=>0});
  assert.equal(game.getState().result,null); assert.equal(game.draw().state.remaining,1);
  assert.equal(game.draw().error,'already_drawn');
  assert.equal(game.redraw().state.result.id,'second'); assert.equal(game.getState().remaining,0);
  assert.equal(game.redraw().error,'no_attempts'); assert.equal(game.getState().drawCount,2);
});
test('redraw requires first draw',() => assert.equal(createGame(dataset()).redraw().error,'draw_first'));
test('weighted thresholds and conditional exclusion',() => {
  const entries = dataset().entries;
  assert.equal(weightedDraw(entries,null,()=>0).id,'first');
  assert.equal(weightedDraw(entries,null,()=>0.249999999).id,'first');
  assert.equal(weightedDraw(entries,null,()=>0.25).id,'second');
  assert.equal(weightedDraw(entries,null,()=>0.999999999).id,'second');
  for (const value of [0,.2,.5,.99999]) assert.equal(weightedDraw(entries,'second',()=>value).id,'first');
});
test('stratified weighted distribution matches authored weights exactly',() => {
  const counts = {first:0,second:0};
  for (let n=0;n<4000;n++) counts[weightedDraw(dataset().entries,null,()=>(n+.5)/4000).id]++;
  assert.deepEqual(counts,{first:1000,second:3000});
});
test('invalid random numbers never change state',() => {
  for (const value of [-1,1,NaN,Infinity]) {const game=createGame(dataset(),{random:()=>value}); assert.equal(game.draw().error,'invalid_random'); assert.equal(game.getState().drawCount,0);}
});
test('dataset rejects unsafe IDs, invalid weights, duplicates and invalid periods',() => {
  for (const weight of [0,-1,NaN,Infinity,1e10]) {const data=dataset();data.entries[0].weight=weight;assert.throws(()=>validateDataset(data));}
  for (const id of ['<svg>','../x','A','a_b','']) {const data=dataset();data.entries[0].id=id;assert.throws(()=>validateDataset(data));}
  const duplicate=dataset();duplicate.entries[1].id='first';assert.throws(()=>validateDataset(duplicate));
  for (const range of [{from:0,to:2026},{from:-10001,to:-1},{from:1,to:2027},{from:3,to:2},{from:1.1,to:2}]) {const data=dataset('era');data.entries[0].yearRange=range;assert.throws(()=>validateDataset(data));}
});
test('historical years include endpoints and never include zero',() => {
  assert.equal(drawYear({yearRange:{from:-10000,to:-1}},()=>0),-10000);
  assert.equal(drawYear({yearRange:{from:1,to:2026}},()=>.99999999),2026);
  const values=[];for(let n=0;n<4;n++) values.push(drawYear({yearRange:{from:-2,to:2}},()=>(n+.5)/4));
  assert.deepEqual(values,[-2,-1,1,2]);
});
test('year and attempts persist across reload without reroll',() => {
  const storage=memory();const first=createGame(dataset('era'),{storage,random:()=>0});first.draw();first.redraw();
  const restored=createGame(dataset('era'),{storage,random:()=>{throw Error('must not roll');}});
  assert.deepEqual(restored.getState(),first.getState());assert.equal(restored.getState().result.year,1);
});
test('share bonus is once per current result token, persists, rejects stale result',() => {
  const storage=memory();const game=createGame(dataset(),{storage,random:()=>0});game.draw();const token=game.getState().result.token;
  assert.equal(game.grantShareBonus(token).state.remaining,3);assert.equal(game.grantShareBonus(token).error,'bonus_used');
  const restored=createGame(dataset(),{storage});assert.equal(restored.grantShareBonus(token).error,'bonus_used');
  game.redraw();assert.equal(game.grantShareBonus(token).error,'stale_share');
  assert.equal(game.grantShareBonus(game.getState().result.token).state.remaining,4);
});
test('shared previews do not write saved game or consume randomness',() => {
  const storage=memory();const game=createGame(dataset('era'),{storage,random:()=>0});game.draw();const before=storage.value();
  assert.deepEqual(game.preview('second',2026),{id:'second',year:2026,preview:true});
  assert.equal(storage.value(),before);assert.equal(game.getState().result.id,'first');
  for(const year of [0,-1,2027,NaN,'2026']) assert.equal(game.preview('second',year),null);
  assert.equal(game.preview('<svg>'),null);
});
test('cache validation rejects arbitrary result IDs, years, attempts and reward duplication',() => {
  const storage=memory();const game=createGame(dataset('era'),{storage,random:()=>0});game.draw();const valid=JSON.parse(storage.value());
  const mutations=[v=>v.result.id='<script>',v=>v.result.year=0,v=>v.result.year=2026,v=>v.remaining=999999,v=>v.drawCount=-1,v=>v.slug='other',v=>v.result.token='0.first',v=>v.bonuses=['1.first','1.first'],v=>v.bonuses=['2.second'],v=>v.version=2];
  for(const mutate of mutations){const value=structuredClone(valid);mutate(value);const restored=createGame(dataset('era'),{storage:memory(JSON.stringify(value))});assert.equal(restored.getState().result,null);assert.equal(restored.getState().cacheInvalid,true);}
});
test('malformed and oversized cache never crash the game',() => {
  for(const raw of ['{','null','[]',' '.repeat(500001)]) {const game=createGame(dataset(),{storage:memory(raw)});assert.equal(game.getState().result,null);assert.equal(game.draw().ok,true);}
});
test('blocked storage getter and quota failure permit in-memory play',() => {
  for(const storage of [{getItem(){throw Error('SecurityError');}}, {getItem(){return null;},setItem(){throw Error('QuotaExceededError');}}]){
    const game=createGame(dataset(),{storage,random:()=>0});assert.equal(game.draw().ok,true);assert.equal(game.getState().storageAvailable,false);assert.equal(game.redraw().ok,true);
  }
});
test('state snapshots and entries cannot mutate the engine',() => {
  const game=createGame(dataset(),{random:()=>0});game.draw();const snapshot=game.getState();snapshot.result.id='second';snapshot.remaining=99;snapshot.bonuses.push('evil');
  const entry=game.getEntry('first');entry.weight=999;assert.equal(game.getEntry('first').weight,1);assert.equal(game.getState().result.id,'first');assert.equal(game.getState().remaining,1);
});
test('long session remains bounded and reloadable',() => {
  const storage=memory();const game=createGame(dataset(),{storage,random:()=>0});game.draw();
  for(let n=1;n<4096;n++){game.grantShareBonus(game.getState().result.token);assert.equal(game.redraw().ok,true);}
  assert.equal(game.redraw().error,'draw_limit');
  const restored=createGame(dataset(),{storage});assert.equal(restored.getState().drawCount,4096);assert.equal(restored.redraw().error,'draw_limit');
});
