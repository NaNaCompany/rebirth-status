// Original code-drawn artwork. No external images, fonts or third-party characters.
const ENUMS = {
  type: ['human', 'dog', 'cat', 'magic'],
  pattern: ['solid', 'patches', 'stripes', 'spots', 'tuxedo'],
  ear: ['upright', 'floppy', 'folded', 'round'],
  fur: ['short', 'long'],
  headwear: ['none', 'cap', 'hat', 'hood', 'crown'],
  robe: ['tunic', 'robe', 'coat', 'shirt'],
};
const DEFAULTS = { type: 'human', background: '#eee8dc', coat: '#d7ac83', accent: '#53796c', hair: '#42362f', pattern: 'solid', ear: 'upright', fur: 'short', headwear: 'none', robe: 'tunic' };
export const ART_ENUMS = Object.freeze(Object.fromEntries(Object.entries(ENUMS).map(([k,v]) => [k,Object.freeze(v)])));
export function validateArt(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Art must be an object');
  const art = {...DEFAULTS};
  for (const [key,value] of Object.entries(input)) {
    if (!(key in DEFAULTS)) throw new TypeError(`Unknown art parameter: ${key}`);
    if (ENUMS[key]) {
      if (!ENUMS[key].includes(value)) throw new TypeError(`Invalid art ${key}`);
    } else if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) throw new TypeError(`Invalid art color: ${key}`);
    art[key] = value;
  }
  return art;
}
const escape = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const path = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
const ellipse = (cx,cy,rx,ry,fill,extra='') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
const line = d => path(d,'none','stroke="#403b3b" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"');
function hat(a, animal = false) {
  const y = animal ? 208 : 194;
  if (a.headwear === 'none') return '';
  if (a.headwear === 'cap') return path(`M310 ${y} Q400 ${y-130} 490 ${y}Z`,a.accent)+ellipse(420,y,100,13,a.accent)+path(`M345 ${y-25} Q400 ${y-65} 459 ${y-24}`,'none','stroke="#fff" stroke-opacity=".25" stroke-width="7"');
  if (a.headwear === 'hat') return path(`M333 ${y-3} L345 ${y-97} Q400 ${y-119} 455 ${y-97} L469 ${y-3}Z`,a.accent)+ellipse(400,y,136,20,a.accent)+path(`M342 ${y-26} Q400 ${y-12} 460 ${y-26}`,'none','stroke="#e9d6a6" stroke-width="16"');
  if (a.headwear === 'hood') return path(`M280 ${y+120} Q268 ${y-120} 400 ${y-125} Q535 ${y-118} 520 ${y+120} L477 ${y+65} Q470 ${y-69} 400 ${y-74} Q330 ${y-65} 323 ${y+65}Z`,a.accent)+path(`M292 ${y+94} Q280 ${y-107} 400 ${y-109} Q515 ${y-104} 508 ${y+94}`,'none','stroke="#fff" stroke-opacity=".16" stroke-width="7"');
  return path(`M312 ${y} L292 ${y-88} L349 ${y-60} L400 ${y-122} L451 ${y-60} L508 ${y-88} L488 ${y}Z`,'#e2b856')+path(`M315 ${y-8} L486 ${y-8}`,'none','stroke="#f7e2a1" stroke-width="12"')+ellipse(400,y-51,12,17,a.accent)+ellipse(339,y-36,7,10,'#fff2c4')+ellipse(461,y-36,7,10,'#fff2c4');
}
function clothing(a) {
  const base = path('M326 361 Q400 341 474 361 Q550 386 564 550 L236 550 Q250 386 326 361Z',a.accent);
  const seams = path('M290 422 L275 550 M510 422 L525 550','none','stroke="#fff" stroke-opacity=".16" stroke-width="6"');
  if (a.robe === 'shirt') return base+path('M357 359 L400 406 L443 359 L423 430 L377 430Z','#f7eedb')+path('M400 426 L400 548','none','stroke="#fff" stroke-opacity=".38" stroke-width="5"')+ellipse(413,456,4,4,'#fff0ce')+ellipse(413,490,4,4,'#fff0ce')+seams;
  if (a.robe === 'coat') return base+path('M355 355 L390 390 L356 438 L380 459 L343 550 L300 550Z','#ffffff','opacity=".17"')+path('M445 355 L410 390 L444 438 L420 459 L457 550 L500 550Z','#172c32','opacity=".23"')+path('M400 396 L400 550','none','stroke="#273e42" stroke-width="5"')+ellipse(414,461,6,6,'#e4c38a')+ellipse(414,501,6,6,'#e4c38a')+seams;
  if (a.robe === 'robe') return base+path('M351 351 L442 493 L400 550 L316 391Z','#fff2d7','opacity=".85"')+path('M445 353 L357 505 L318 484 L409 351Z',a.accent)+path('M270 489 Q400 509 530 489 L533 518 Q400 540 267 518Z','#293e3c')+path('M447 518 Q452 553 431 569 L415 546Z','#e4c38a')+seams;
  return base+path('M355 354 Q400 409 445 354 L433 386 Q400 429 367 386Z','#f6e5c4')+path('M400 405 L400 462','none','stroke="#e2c99c" stroke-width="6"')+path('M268 504 L532 504 L535 527 L265 527Z','#3c4541')+path('M384 500 L416 500 L416 531 L384 531Z','#e3bc6b')+seams;
}
function faceEyes(y, spacing = 45, animal = false) {
  return ellipse(400-spacing,y,animal?12:8,animal?15:11,'#34393b')+ellipse(400+spacing,y,animal?12:8,animal?15:11,'#34393b')+ellipse(397-spacing,y-5,3,4,'#fff')+ellipse(397+spacing,y-5,3,4,'#fff');
}
function human(a) {
  const longHair = a.fur === 'long' ? path('M285 256 Q264 367 295 412 L338 390 L340 253 M460 253 L462 390 L505 412 Q536 367 515 256Z',a.hair) : '';
  return longHair+clothing(a)+path('M369 323 L369 371 Q400 397 431 371 L431 323Z',a.coat)+ellipse(298,269,19,30,a.coat)+ellipse(502,269,19,30,a.coat)+ellipse(400,254,104,117,a.coat)+path('M295 246 Q278 135 383 123 Q491 109 506 209 L494 252 L474 207 Q416 220 369 173 Q345 217 307 225Z',a.hair)+path('M318 206 Q337 170 369 156','none','stroke="#fff" stroke-opacity=".13" stroke-width="10" stroke-linecap="round"')+faceEyes(264,39)+line('M395 276 L388 301 L404 303')+path('M374 325 Q400 343 426 325','none','stroke="#a2655d" stroke-width="5" stroke-linecap="round"')+ellipse(335,297,18,9,'#dc8e7a','opacity=".24"')+ellipse(465,297,18,9,'#dc8e7a','opacity=".24"')+hat(a);
}
function animalEars(a, cat) {
  const c=a.coat;
  if(a.ear==='floppy') return path('M306 195 Q219 177 242 331 Q254 370 290 323 L330 234Z',c)+path('M494 195 Q581 177 558 331 Q546 370 510 323 L470 234Z',c)+path('M282 213 Q257 221 267 306 M518 213 Q543 221 533 306','none','stroke="#403b3b" stroke-opacity=".17" stroke-width="14" stroke-linecap="round"');
  if(a.ear==='round') return ellipse(307,200,43,48,c)+ellipse(493,200,43,48,c)+ellipse(307,200,25,29,'#dba69b')+ellipse(493,200,25,29,'#dba69b');
  if(a.ear==='folded') return path('M284 240 L273 158 Q310 139 355 205 L327 247Z',c)+path('M516 240 L527 158 Q490 139 445 205 L473 247Z',c)+path('M278 166 L315 221 L341 200 M522 166 L485 221 L459 200','none','stroke="#403b3b" stroke-opacity=".2" stroke-width="8" stroke-linejoin="round"');
  return path(cat?'M281 250 L284 126 L365 199Z':'M286 251 L295 116 L360 201Z',c)+path(cat?'M519 250 L516 126 L435 199Z':'M514 251 L505 116 L440 201Z',c)+path('M301 211 L300 155 L337 203Z','#dca69c')+path('M499 211 L500 155 L463 203Z','#dca69c');
}
function markings(a) {
  if(a.pattern==='patches') return path('M292 229 Q318 185 373 192 Q395 216 373 265 Q335 296 292 264Z',a.hair)+path('M444 302 Q497 279 508 325 Q499 355 460 355Z',a.hair);
  if(a.pattern==='stripes') return path('M357 178 L379 230 L387 176 M405 175 L413 230 L434 177 M288 272 L336 291 L291 305 M512 272 L464 291 L509 305',a.hair,'opacity=".7"');
  if(a.pattern==='spots') return [[338,210,16],[446,223,22],[303,288,17],[480,309,14],[431,343,12],[372,319,9]].map(([x,y,r])=>ellipse(x,y,r,r*.85,a.hair)).join('');
  if(a.pattern==='tuxedo') return path('M400 191 Q379 238 358 269 Q340 309 365 355 L435 355 Q460 309 442 269 Q421 238 400 191Z','#fff4df');
  return '';
}
function animal(a,cat) {
  const fur = a.fur==='long' ? path('M290 273 L266 298 L281 319 L263 343 L299 351 L287 379 L330 369 L335 391 L367 367 L433 367 L465 391 L470 369 L513 379 L501 351 L537 343 L519 319 L534 298 L510 273Z',a.coat) : '';
  const tail = cat ? path('M504 511 Q637 487 583 393 Q567 367 550 387 Q536 402 556 422 Q586 466 498 478Z',a.coat) : path('M502 507 Q611 495 579 434 Q566 415 550 430 Q541 441 555 460 Q564 475 501 476Z',a.coat);
  const eyeY=266;
  return tail+clothing(a)+animalEars(a,cat)+ellipse(400,273,115,104,a.coat)+fur+markings(a)+faceEyes(eyeY,cat?49:43,true)+(cat?path('M344 248 L363 245 M437 245 L456 248','none','stroke="#403b3b" stroke-width="5" stroke-linecap="round"'):path('M343 242 Q354 235 365 241 M435 241 Q446 235 457 242','none','stroke="#403b3b" stroke-opacity=".5" stroke-width="6" stroke-linecap="round"'))+ellipse(373,309,cat?31:37,cat?25:34,'#fff1dc')+ellipse(427,309,cat?31:37,cat?25:34,'#fff1dc')+path(cat?'M385 294 Q400 285 415 294 L400 308Z':'M381 292 Q400 280 419 292 Q420 307 400 311 Q380 307 381 292Z','#57403d')+line('M400 308 L400 321 M400 321 Q386 336 375 322 M400 321 Q414 336 425 322')+(cat?path('M348 306 L290 296 M348 320 L282 323 M452 306 L510 296 M452 320 L518 323','none','stroke="#5f514a" stroke-width="3" stroke-linecap="round"'):path('M390 334 Q400 350 410 334 L409 348 Q400 361 391 348Z','#d78d8b'))+path('M350 371 Q400 397 450 371 L446 388 Q400 416 354 388Z','#e4c99a')+ellipse(400,401,15,18,'#d8ac58')+ellipse(397,398,4,5,'#fff1b8')+hat(a,true);
}
function magic(a) {
  const rays = Array.from({length:12},(_,i)=>`<g transform="rotate(${i*30} 400 290)">${path('M400 112 L400 139','none',`stroke="${a.accent}" stroke-width="5" stroke-linecap="round"`)}</g>`).join('');
  const ring = `<circle cx="400" cy="290" r="156" fill="none" stroke="${a.accent}" stroke-width="2" opacity=".38"/><circle cx="400" cy="290" r="133" fill="none" stroke="${a.accent}" stroke-width="2" stroke-dasharray="8 16" opacity=".5"/>`;
  const symbol = a.pattern === 'stripes' ? path('M414 184 L343 297 L393 297 L373 384 L463 265 L411 265Z',a.accent) : a.pattern === 'spots' ? [[361,247,24],[434,235,19],[448,312,31],[365,327,16],[399,284,14]].map(([x,y,r])=>ellipse(x,y,r,r,a.accent)).join('') : a.pattern === 'patches' ? path('M400 189 Q481 224 467 295 Q453 360 400 387 Q347 360 333 295 Q319 224 400 189Z',a.accent)+path('M400 219 L400 350 M366 257 L434 257','none','stroke="#fff5d7" stroke-width="8" stroke-linecap="round"') : a.pattern === 'tuxedo' ? path('M400 183 L435 252 L493 290 L435 328 L400 397 L365 328 L307 290 L365 252Z',a.accent)+ellipse(400,290,31,31,'#fff1ca') : path('M400 197 L425 261 L492 266 L440 310 L457 375 L400 337 L343 375 L360 310 L308 266 L375 261Z',a.accent);
  return rays+ring+path('M267 489 Q400 454 533 489 L519 533 Q400 557 281 533Z',a.hair)+ellipse(400,487,133,26,a.coat)+ellipse(400,480,109,17,'#fff3db','opacity=".55"')+path('M290 455 Q326 423 353 441 M447 441 Q474 423 510 455','none',`stroke="${a.accent}" stroke-width="10" stroke-linecap="round"`)+ellipse(400,290,105,112,a.coat,'opacity=".35"')+symbol+[[257,201,12],[532,364,9],[288,389,8],[528,195,13]].map(([x,y,r])=>path(`M${x} ${y-r} L${x+3} ${y-3} L${x+r} ${y} L${x+3} ${y+3} L${x} ${y+r} L${x-3} ${y+3} L${x-r} ${y} L${x-3} ${y-3}Z`,a.accent)).join('');
}
export function renderArt(input = {}, {name='',subtitle='',kind=''} = {}) {
  const a=validateArt(input);
  const title=escape(name || kind || a.type);
  const desc=escape(subtitle);
  const picture = a.type==='human' ? human(a) : a.type==='magic' ? magic(a) : animal(a,a.type==='cat');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" role="img" aria-label="${title}"><title>${title}</title>${desc?`<desc>${desc}</desc>`:''}<rect width="800" height="600" rx="36" fill="${a.background}"/><circle cx="400" cy="277" r="223" fill="#fff" opacity=".38"/><path d="M71 488 Q180 445 262 474 M538 474 Q620 445 729 488" fill="none" stroke="${a.accent}" stroke-width="2" opacity=".19"/><ellipse cx="400" cy="553" rx="186" ry="17" fill="${a.accent}" opacity=".13"/>${picture}<path d="M91 129 L91 157 M77 143 L105 143 M683 410 L683 434 M671 422 L695 422" fill="none" stroke="${a.accent}" stroke-width="4" stroke-linecap="round" opacity=".4"/></svg>`;
}

// Card layout deliberately uses system fonts only. Text remains selectable in SVG
// and is rasterized into downloaded PNGs and social previews.
function graphemes(value) {
  const text=String(value).replace(/\s+/gu,' ').trim().slice(0,4000);
  return typeof Intl.Segmenter==='function' ? [...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text)].map(x=>x.segment) : Array.from(text);
}
function glyphUnits(glyph) {
  if(/^\s$/u.test(glyph))return .34;
  if(/^[ilI1.,:;'!|]$/u.test(glyph))return .35;
  if(/^[mwMW@%&]$/u.test(glyph))return .88;
  if(/^[A-Z0-9]$/u.test(glyph))return .7;
  if(/^[\u0000-\u024f]$/u.test(glyph))return .6;
  return 1.05;
}
function cardLines(value,width,size,maxLines) {
  const chars=graphemes(value),lines=[];
  const capacity=width/size;
  let line=[],units=0;
  while(chars.length){
    const next=chars.shift(),cost=glyphUnits(next);
    if(line.length&&units+cost>capacity){
      // Prefer a word boundary, while still handling long words and CJK text.
      const at=line.lastIndexOf(' ');
      if(at>line.length*.45){const overflow=line.splice(at+1);line.pop();chars.unshift(...overflow,next);}
      else chars.unshift(next);
      lines.push(line.join('').trim());line=[];units=0;
      if(lines.length===maxLines)break;
    }else if(line.length||next!==' '){line.push(next);units+=cost;}
  }
  if(line.length&&lines.length<maxLines)lines.push(line.join('').trim());
  if(chars.length&&lines.length){
    const final=graphemes(lines.at(-1));
    while(final.length&&final.reduce((sum,g)=>sum+glyphUnits(g),0)+glyphUnits('…')>capacity)final.pop();
    lines[lines.length-1]=final.join('').trimEnd()+'…';
  }
  return lines;
}
function cardText(lines,{x,y,size,lineHeight,width,color,bold=false}) {
  return `<text x="${x}" y="${y}" fill="${color}" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="${size}"${bold?' font-weight="700"':''}>${lines.map((text,index)=>{
    // Explicit line lengths prevent host-font differences from overflowing a panel.
    const length=Math.min(width,graphemes(text).reduce((sum,g)=>sum+glyphUnits(g),0)*size);
    return `<tspan x="${x}" y="${y+index*lineHeight}" textLength="${Math.max(1,Math.round(length*100)/100)}" lengthAdjust="spacingAndGlyphs">${escape(text)}</tspan>`;
  }).join('')}</text>`;
}
export function renderCard(input = {}, {name='',subtitle='',kind='',yearText='',details=[]} = {}) {
  const a=validateArt(input);
  if(!Array.isArray(details))throw new TypeError('Card details must be an array');
  const title=String(name||kind||a.type),description=String(subtitle);
  const titleLines=cardLines(title,510,42,4);
  const descriptionLines=cardLines(description,510,25,5);
  const yearLines=cardLines(yearText,510,25,2);
  const rows=details.slice(0,5).map(item=>typeof item==='object'&&item!==null?`${String(item.label??'')}${item.label?': ':''}${String(item.value??'')}`:String(item));
  const artwork=renderArt(a,{name:title,subtitle:description,kind}).replace('<svg ','<svg x="620" y="60" width="530" height="397.5" ');
  const header=cardText(titleLines,{x:60,y:105,size:42,lineHeight:51,width:510,color:'#2d3336',bold:true});
  const body=cardText(descriptionLines,{x:60,y:145+Math.max(0,titleLines.length-1)*51,size:25,lineHeight:32,width:510,color:'#505b61'});
  const year=cardText(yearLines,{x:60,y:505,size:25,lineHeight:32,width:510,color:a.accent,bold:true});
  const content=rows.map((row,index)=>{
    const y=594+index*58;
    return `<path d="M60 ${y-31} H1140" stroke="#d8dedf" stroke-width="1"/>`+cardText(cardLines(row,1080,21,2),{x:60,y,size:21,lineHeight:25,width:1080,color:'#37434a'});
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" role="img" aria-label="${escape(title)}"><title>${escape(title)}</title><desc>${escape([description,yearText,...rows].filter(Boolean).join(' · '))}</desc><rect width="1200" height="900" rx="28" fill="#fbfaf6"/><path d="M60 34 H1140" stroke="${a.accent}" stroke-width="5" stroke-linecap="round"/>${artwork}${header}${body}${year}${content}<path d="M60 866 H1140" stroke="${a.accent}" stroke-width="2" opacity=".45"/></svg>`;
}
