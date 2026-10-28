import test from 'node:test';
import assert from 'node:assert/strict';
import {renderArt,renderCard,validateArt,ART_ENUMS} from '../src/art.mjs';

test('four original subjects are distinct, accessible, self-contained SVGs',()=>{
  const rendered=ART_ENUMS.type.map(type=>renderArt({type},{name:'A & B',subtitle:'Local illustration'}));
  assert.equal(new Set(rendered).size,4);
  for(const svg of rendered){
    assert.match(svg,/viewBox="0 0 800 600"/);
    assert.match(svg,/<title>A &amp; B<\/title>/);
    assert.match(svg,/<desc>Local illustration<\/desc>/);
    assert.match(svg,/role="img" aria-label="A &amp; B"/);
    assert.doesNotMatch(svg,/<(?:image|script|foreignObject|style|text)\b|(?:href|src)=|url\(/i);
  }
});
test('localized text is escaped in attributes and element content',()=>{
  const svg=renderArt({type:'cat'},{name:'"/><script>alert(1)</script>&',subtitle:"<img onerror='x'>"});
  assert.doesNotMatch(svg,/<script|<img|onerror='/);
  assert.match(svg,/&quot;\/&gt;&lt;script&gt;/);
  assert.match(svg,/&lt;img onerror=&#39;x&#39;&gt;/);
});
test('enum and color validation rejects all unsafe input channels',()=>{
  for(const [key,values] of Object.entries(ART_ENUMS)){
    for(const value of values)assert.doesNotThrow(()=>validateArt({[key]:value}));
    for(const value of ['',null,{},'bad" onload="alert(1)'])assert.throws(()=>renderArt({[key]:value}),TypeError);
  }
  for(const key of ['background','coat','accent','hair']){
    for(const value of ['red','#fff','#ffffffff','url(https://x)','" onload="x'])assert.throws(()=>renderArt({[key]:value}),TypeError);
    assert.equal(validateArt({[key]:'#Ab09ef'})[key],'#Ab09ef');
  }
  assert.throws(()=>renderArt({onclick:'x'}),TypeError);
  assert.throws(()=>renderArt(null),TypeError);
  assert.throws(()=>renderArt([]),TypeError);
});
test('animal ear, fur, coat, pattern, clothing and headwear change the drawing',()=>{
  for(const type of ['dog','cat']){
    for(const key of ['ear','fur','pattern','headwear','robe']){
      const all=ART_ENUMS[key].map(value=>renderArt({type,[key]:value}));
      assert.equal(new Set(all).size,ART_ENUMS[key].length,`${type} ${key}`);
    }
    for(const key of ['background','coat','accent','hair'])assert.notEqual(renderArt({type,[key]:'#112233',pattern:'patches'}),renderArt({type,[key]:'#aabbcc',pattern:'patches'}));
  }
});
test('human clothing/hair/headwear and magic symbols provide visible variants',()=>{
  for(const key of ['robe','headwear','fur'])assert.equal(new Set(ART_ENUMS[key].map(value=>renderArt({type:'human',[key]:value}))).size,ART_ENUMS[key].length);
  assert.equal(new Set(ART_ENUMS.pattern.map(pattern=>renderArt({type:'magic',pattern}))).size,5);
  assert.equal(renderArt({type:'cat'}),renderArt({type:'cat'}));
});
test('result cards paint name, description, year and five details as actual SVG text',()=>{
  const card=renderCard({type:'cat'},{name:'결과 고양이',subtitle:'창가에서 쉬는 고양이',yearText:'기원전 312년',details:[{label:'성격',value:'호기심이 많음'},'둘','셋','넷','다섯','SHOULD_NOT_RENDER']});
  assert.match(card,/viewBox="0 0 1200 900"/);
  assert.match(card,/<tspan[^>]*>결과 고양이<\/tspan>/);
  assert.match(card,/<tspan[^>]*>창가에서 쉬는 고양이<\/tspan>/);
  assert.match(card,/<tspan[^>]*>기원전 312년<\/tspan>/);
  assert.match(card,/<tspan[^>]*>성격: 호기심이 많음<\/tspan>/);
  assert.doesNotMatch(card,/SHOULD_NOT_RENDER/);
  assert.match(card,/<svg x="620" y="60" width="530" height="397.5"/);
});
test('card text escapes markup and bounds multilingual long text without broken Unicode',()=>{
  const card=renderCard({type:'magic'},{name:'<script>危険 & "悪意"</script> 🐈'.repeat(30),subtitle:'Sonnenaufgangsgutschein '.repeat(50),yearText:'"/><image href="https://evil">',details:['<script>alert(1)</script>']});
  assert.doesNotMatch(card,/<script|<image|href="https|\uFFFD/);
  assert.match(card,/&lt;script&gt;/);
  assert.match(card,/…<\/tspan>/);
  for(const value of card.matchAll(/textLength="([\d.]+)"/g))assert.ok(Number(value[1])<=1080);
  for(const value of card.matchAll(/<tspan[^>]*y="([\d.]+)"/g))assert.ok(Number(value[1])<866);
  assert.throws(()=>renderCard({}, {details:'wrong'}),TypeError);
});
