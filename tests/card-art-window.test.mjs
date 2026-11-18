import{test}from'node:test';import assert from'node:assert/strict';import vm from'node:vm';import{readFileSync}from'node:fs';import{pixelWindow,restoreSourceWindow,drawCardOverlay,drawCutGuide}from'../card-art-geometry.mjs';import{drawArtWatermark,makePrintSheet}from'../card-overlay-print.mjs';
import{withProductionCardBleed}from'../card-overlay-print.mjs';

test('production bleed uses actual wide artwork and never reflects edges', () => {
 const {g,calls}=recorder(), image={}, artwork={width:1648,height:2048};
 const canvas=(width,height)=>({width,height,getContext:()=>g});
 const result=withProductionCardBleed(image,canvas,{artwork,matrix:[1,0,0,1,-320,-80],bleed:2.5});
 assert.deepEqual([result.width,result.height],[1104,1488]);
 assert.deepEqual(calls,[['setTransform',1,0,0,1,-272,-40],['drawImage',artwork,0,0],['resetTransform'],['drawImage',image,48,40,1008,1408]]);
 assert.throws(()=>withProductionCardBleed(image,canvas),/확장된 일러스트/);
 assert.throws(()=>withProductionCardBleed(image,canvas,{artwork,matrix:[1,0,0,1,-320,-20]}),/블리드 끝/);
});
const r={x:5.3,y:9.5,w:52.3,h:31.9};
test('public PDF uses the shared texture bleed while keeping the selected window and 64 × 88 trim', async () => {
 const client=readFileSync(new URL('../card-art.mjs',import.meta.url),'utf8');
 const prepare=client.slice(client.indexOf('async function preparePDF('),client.indexOf('function offerPDFDownload('));
 const matrix=[1,0,0,1,-320,-80],image={},output={};
 const entry={window:r,shape:'round',card:{}};
 let bleedArgs,printArgs;
 const context=vm.createContext({ADMIN_PRINT_BLEED:2,ADMIN_PRINT_TRIM_MARGIN:0,printFoil:async()=>null,
  trimmedPrintPreview:()=>({}),drawResult:()=>{},step:3,pdfExport:entry,layerSession:{image,current:matrix,layers:{showBorder:false}},setTimeout,File,canvas:()=>{},
  composeLayers:()=>output,renderManual:()=>output,outputArt:()=>output,withProductionCardBleed:(...args)=>(bleedArgs=args,output),
  makePrintSheet:(...args)=>(printArgs=args,{toBlob:done=>done(new Blob(['jpeg']))}),
  makePDF:()=>new Blob(['pdf']),cardFilename:()=> 'output.pdf',update:()=>{},
 });
 await vm.runInContext(prepare+'\npreparePDF(pdfExport)',context);
 assert.equal(entry.error,undefined);
 assert.equal(entry.file.name,'output.pdf');
 assert.equal(bleedArgs[0],output);
 assert.equal(bleedArgs[2].artwork,image);
 assert.equal(bleedArgs[2].matrix,matrix);
 assert.equal(printArgs[1],r);
 assert.equal(printArgs[2].trimMargin,0);
 assert.equal(printArgs[2].bleed,2);
 context.layerSession.layers.showBorder=true;
 await vm.runInContext('preparePDF(pdfExport)',context);
 assert.equal(bleedArgs[2].artwork,image);
});
test('print mode retains artwork exactly 2mm inside the window and omits the baked-in guide', (t) => {
 const {g,calls}=recorder();
 globalThis.document={createElement:()=>({getContext:()=>g})};
 t.after(()=>delete globalThis.document);
 makePrintSheet({width:1088,height:1472},{x:5.9,y:9.7,w:51.2,h:31.2},
  {production:true,cutoutCard:{display_name:'피카츄',card_number:'017'}});
 const fill = calls.filter(call=>call[0]==='fillRect')[1].slice(1).map(px=>px/12);
 fill.forEach((value,index)=>assert.ok(Math.abs(value-[17.9,21.7,47.2,27.2][index])<.00001));
 assert.equal(calls.some(call=>call[0]==='strokeRect'),false);
 assert.equal(calls.some(call=>call[1]==='CUT OUT INSIDE'),true);
 assert.equal(calls.some(call=>String(call[1]).includes('CELEBRATION')),false);
});
function recorder(){const calls=[];const g=new Proxy({},{get:(_,k)=>typeof k==='string'?(...v)=>calls.push([k,...v]):undefined,set:()=>true});return {g,calls};}
test('source review and generated preview draw the exact same physical cut-window',()=>{for(const [width,height]of[[756,1056],[1008,1408]]){const {g,calls}=recorder(),p=pixelWindow(r,width,height);drawCutGuide(g,r,width,height);assert.deepEqual(calls.filter(c=>c[0]==='strokeRect').map(c=>c.slice(1)),[[p.x,p.y,p.w,p.h],[p.x,p.y,p.w,p.h]]);const src={},result={};drawCardOverlay(g,src,result,r,width,height,true);assert.ok(calls.some(c=>c[0]==='rect'&&c[1]===p.x&&c[2]===p.y&&c[3]===p.w&&c[4]===p.h));assert.ok(calls.some(c=>c[0]==='clip'&&c[1]==='evenodd'));}});
test('original pixels are restored inside the confirmed window, without moving the full source',()=>{const {g,calls}=recorder(),source={width:1008,height:1408},output={width:1008,height:1408,getContext:()=>g};restoreSourceWindow(output,source,r);const p=pixelWindow(r,1008,1408);assert.deepEqual(calls.find(c=>c[0]==='rect'),['rect',p.x,p.y,p.w,p.h]);assert.deepEqual(calls.find(c=>c[0]==='drawImage'),['drawImage',source,0,0,1008,1408,0,0,1008,1408]);});
test('mobile print cut line uses the confirmed coordinates; admin default remains unchanged',()=>{const {g,calls}=recorder();globalThis.document={createElement:()=>({getContext:()=>g})};makePrintSheet({width:1088,height:1472},r,{shape:'round',windowGuideInset:0});const guide=calls.find(c=>c[0]==='strokeRect');assert.equal(guide[0],'strokeRect');[(10+r.x)*12,(10+r.y)*12,r.w*12,r.h*12].forEach((v,i)=>assert.ok(Math.abs(guide[i+1]-v)<1e-9));calls.length=0;makePrintSheet({width:1088,height:1472},r,{shape:'round'});assert.ok(Math.abs(calls.find(c=>c[0]==='strokeRect')[1]-((10+r.x)*12+.07*12))<1e-9);delete globalThis.document;});

test('public PDF trim adds half a millimetre per edge without scaling art or moving the window', (t) => {
 const {g,calls}=recorder();
 const art={width:1088,height:1472};
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
   [5,9.5],[9,5.5],[78,9.5],[74,5.5],
   [5,98.5],[9,102.5],[78,98.5],[74,102.5]
  ]);
  const roundGuide=output.find(c=>c[0]==='roundRect');
  assert.deepEqual(roundGuide,shape==='round'?['roundRect',108,114,780,1068,36]:undefined);
  assert.ok(output.some(c=>c[0]==='fillText'&&c[1]===`65 x 89 mm · ${shape==='round'?'ROUND R3':'SQUARE'} · BLEED 1.5 mm`));
 }
});

test('public PDF watermark is inside both trim shapes and absent from the admin default', (t) => {
 const {g,calls}=recorder();
 globalThis.document={createElement:()=>({getContext:()=>g})};
 t.after(()=>delete globalThis.document);
 const art={width:1088,height:1472};
 makePrintSheet(art,r);
 assert.equal(calls.some(c=>c[1]==='funypin.kr'),false);
 for(const shape of ['round','square']){
  calls.length=0;
  makePrintSheet(art,r,{shape,trimMargin:.5,watermark:true});
  const mark=calls.filter(c=>c[1]==='funypin.kr');
  assert.equal(mark.length,2);
  assert.deepEqual(mark.map(c=>c[0]),['strokeText','fillText']);
  for(const [, , x,y] of mark){
   assert.equal(x,69.5*12);
   assert.ok(Math.abs(y-96.75*12)<1e-9);
  }
 }
});

test('result preview draws the watermark with text enabled or disabled, and skips original comparison',()=>{
 const source=readFileSync(new URL('../card-art.mjs',import.meta.url),'utf8');
 const drawResult=source.slice(source.indexOf('function drawResult()'),source.indexOf('async function reference('));
 const {g,calls}=recorder();
 const canvas={width:756,height:1056,getContext:()=>g};
 const state=vm.createContext({
  pdfExport:null,source:{},result:{},resultWindow:r,$:()=>canvas,shape:'round',showExpanded:true,
  outputArt:()=>state.result,drawCardOverlay,drawCutGuide,drawArtWatermark
 });
 for(const showText of [true,false]){
  state.result={showText};
  calls.length=0;
  vm.runInContext(drawResult+';drawResult()',state);
  assert.ok(calls.some(c=>c[0]==='fillText'&&c[1]==='funypin.kr'));
 }
 state.showExpanded=false;
 calls.length=0;
 vm.runInContext('drawResult()',state);
 assert.equal(calls.some(c=>c[1]==='funypin.kr'),false);
});

test('preview crops exactly the PDF trim and keeps watermark on native card coordinates',async()=>{
 const {trimmedPrintPreview}=await import('../card-overlay-print.mjs');
 const {g,calls}=recorder(),art={width:1088,height:1472};
 const preview=trimmedPrintPreview(art,(width,height)=>({width,height,getContext:()=>g}),true);
 assert.deepEqual([preview.width,preview.height],[1024,1408]);
 assert.deepEqual(calls.find(c=>c[0]==='drawImage'),['drawImage',art,32,32,1024,1408,0,0,1024,1408]);
 const mark=calls.find(c=>c[0]==='fillText'&&c[1]==='funypin.kr');
 assert.deepEqual(mark.slice(2),[8+(63-3.5)*16,(88-1.25)*16]);
});
