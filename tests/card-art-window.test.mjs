import{test}from'node:test';import assert from'node:assert/strict';import vm from'node:vm';import{readFileSync}from'node:fs';import{pixelWindow,restoreSourceWindow,drawCardOverlay,drawCutGuide}from'../card-art-geometry.mjs';import{makePrintSheet}from'../card-overlay-print.mjs';
const r={x:5.3,y:9.5,w:52.3,h:31.9};
function recorder(){const calls=[];const g=new Proxy({},{get:(_,k)=>typeof k==='string'?(...v)=>calls.push([k,...v]):undefined,set:()=>true});return {g,calls};}
test('source review and generated preview draw the exact same physical cut-window',()=>{for(const [width,height]of[[756,1056],[1008,1408]]){const {g,calls}=recorder(),p=pixelWindow(r,width,height);drawCutGuide(g,r,width,height);assert.deepEqual(calls.filter(c=>c[0]==='strokeRect').map(c=>c.slice(1)),[[p.x,p.y,p.w,p.h],[p.x,p.y,p.w,p.h]]);const src={},result={};drawCardOverlay(g,src,result,r,width,height,true);assert.ok(calls.some(c=>c[0]==='rect'&&c[1]===p.x&&c[2]===p.y&&c[3]===p.w&&c[4]===p.h));assert.ok(calls.some(c=>c[0]==='clip'&&c[1]==='evenodd'));}});
test('original pixels are restored inside the confirmed window, without moving the full source',()=>{const {g,calls}=recorder(),source={width:1008,height:1408},output={width:1008,height:1408,getContext:()=>g};restoreSourceWindow(output,source,r);const p=pixelWindow(r,1008,1408);assert.deepEqual(calls.find(c=>c[0]==='rect'),['rect',p.x,p.y,p.w,p.h]);assert.deepEqual(calls.find(c=>c[0]==='drawImage'),['drawImage',source,0,0,1008,1408,0,0,1008,1408]);});
test('mobile print cut line uses the confirmed coordinates; admin default remains unchanged',()=>{const {g,calls}=recorder();globalThis.document={createElement:()=>({getContext:()=>g})};makePrintSheet({width:1072,height:1472},r,{shape:'round',windowGuideInset:0});const guide=calls.find(c=>c[0]==='strokeRect');assert.equal(guide[0],'strokeRect');[(10+r.x)*12,(10+r.y)*12,r.w*12,r.h*12].forEach((v,i)=>assert.ok(Math.abs(guide[i+1]-v)<1e-9));calls.length=0;makePrintSheet({width:1072,height:1472},r,{shape:'round'});assert.ok(Math.abs(calls.find(c=>c[0]==='strokeRect')[1]-((10+r.x)*12+.07*12))<1e-9);delete globalThis.document;});

test('public PDF trim adds half a millimetre per edge without scaling art or moving the window', (t) => {
 const {g,calls}=recorder();
 const art={width:1072,height:1472};
 const canvas={getContext:()=>g};
 globalThis.document={createElement:()=>canvas};
 t.after(()=>delete globalThis.document);
 const draw=(shape,trimMargin)=>{
  calls.length=0;
  makePrintSheet(art,r,{shape,trimMargin,windowGuideInset:0});
  return calls.slice();
 };
 const original=draw('square',0);
 for(const shape of ['round','square']){
  const output=draw(shape,.5);
  for(const method of ['drawImage','strokeRect']){
   assert.deepEqual(output.find(c=>c[0]===method),original.find(c=>c[0]===method));
  }
  assert.equal(canvas.width,83*12);
  assert.equal(canvas.height,118*12);
  const cropEnds=output.filter(c=>c[0]==='lineTo').slice(0,8);
  assert.deepEqual(cropEnds.map(c=>c.slice(1).map(n=>n/12)),[
   [5.5,9.5],[9.5,5.5],[77.5,9.5],[73.5,5.5],
   [5.5,98.5],[9.5,102.5],[77.5,98.5],[73.5,102.5]
  ]);
  const roundGuide=output.find(c=>c[0]==='roundRect');
  assert.deepEqual(roundGuide,shape==='round'?['roundRect',114,114,768,1068,36]:undefined);
  assert.ok(output.some(c=>c[0]==='fillText'&&c[1]===`64 x 89 mm · ${shape==='round'?'ROUND R3':'SQUARE'} · BLEED 1.5 mm`));
 }
});
