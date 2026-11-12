import{test}from'node:test';import assert from'node:assert/strict';import{prepareFullCard,FULL_ART_SIZE}from'../card-fullart-test.mjs';import{readFileSync}from'node:fs';
test('full card keeps the 63:88 ratio and includes the complete source',()=>{let drawn;const card={width:733,height:1024};const out=prepareFullCard(card,(width,height)=>({width,height,getContext:()=>({drawImage:(...args)=>drawn=args})}));assert.deepEqual([out.width,out.height],[1008,1408]);assert.equal(FULL_ART_SIZE.width/FULL_ART_SIZE.height,63/88);assert.deepEqual(drawn,[card,0,0,1008,1408]);});
test('new option does not replace the previous default or overlay controls',()=>{const html=readFileSync(new URL('../card-overlay.html',import.meta.url),'utf8');assert.match(html,/<select id="generationMode"><option value="independent">/);assert.match(html,/<option value="original">/);assert.match(html,/<option value="fullart">/);for(const id of['shape','tolerance','png','pdf','fullArtPng','fullArtAccepted'])assert.ok(html.includes('id="'+id+'"'));});

import vm from 'node:vm';
const client=readFileSync(new URL('../card-overlay.mjs',import.meta.url),'utf8');
function clientFlow(mode='illustration',resultMode='illustration',reviewed=true){
 const elements=new Map();const $=id=>{if(!elements.has(id))elements.set(id,{value:'',checked:false,textContent:'',hidden:false});return elements.get(id);};$('generationMode').value=mode;$('fullArtAccepted').checked=reviewed;$('shape').value='round';$('tolerance').value='0.2';
 const result={id:'result'};let printed;const context=vm.createContext({$,isOriginalMode:()=>false,isWideMode:()=>false,isManualMode:()=>false,fullArtResult:result,fullArtResultMode:resultMode,fullArtIsSample:false,busy:false,savedLoading:false,historyOnly:false,card:{},ready:true,corners:[],alignmentReview:false,art:null,rect:()=>({x:5,y:13,w:53,h:33}),withCardBleed:x=>({source:x}),makePrintSheet:(...args)=>(printed=args,{printed:true})});
 const section=(start,end)=>client.slice(client.indexOf(start),client.indexOf(end));vm.runInContext(section('function isFullCardMode(','function draw(){'),context);vm.runInContext(section('function sheet(){',"$('png').onclick"),context);return{context,$,result,printed:()=>printed};
}
test('illustration option preserves old options and explains removal for review',()=>{const html=readFileSync(new URL('../card-overlay.html',import.meta.url),'utf8');for(const mode of['independent','original','fullart','illustration'])assert.ok(html.includes('value="'+mode+'"'));assert.ok(html.includes('id="fullArtReviewText"'));assert.match(client,/캐릭터의 위치·배경 연결과 글자·테두리 제거 상태를 확인했습니다/);});
test('both full-card modes export with the existing cut-guide settings',()=>{for(const mode of['illustration','fullart']){const a=clientFlow(mode,mode);vm.runInContext('update();sheet();',a.context);assert.equal(a.$('png').disabled,false);const args=a.printed();assert.equal(args[0].source,a.result);assert.equal(args[2].shape,'round');assert.equal(args[2].tolerance,.2);assert.equal(args[2].bleed,2);}});
test('changing full-card mode cannot export a result from the other mode',()=>{const a=clientFlow('illustration','fullart');vm.runInContext('update()',a.context);assert.equal(a.$('png').disabled,true);assert.equal(a.$('fullArtPng').disabled,true);assert.throws(()=>vm.runInContext('sheet()',a.context));assert.equal(a.printed(),undefined);});
test('illustration exports require result review',()=>{const a=clientFlow('illustration','illustration',false);vm.runInContext('update()',a.context);assert.equal(a.$('png').disabled,true);assert.equal(a.$('pdf').disabled,true);assert.throws(()=>vm.runInContext('sheet()',a.context));});
test('history restores illustration mode and matches the full-card result',()=>{const start=client.indexOf('async function loadSavedGeneration(');const restore=client.slice(start);assert.match(restore,/if\(isFullCardMode\(row.mode\)\)\{fullArtResultMode=row.mode;fullArtResult=restored/);assert.match(restore,/\$\('generationMode'\).value=row.mode/);assert.match(client,/illustration:'일러스트만 확장'/);});

test('face-masked layers send the approved masked source to both AI requests and keep local restoration original',async()=>{
 const elements=new Map();
 const $=id=>{
  if(!elements.has(id))elements.set(id,{value:'',checked:false,textContent:'',hidden:false});
  return elements.get(id);
 };
 const original={toDataURL:()=>'original'},masked={toDataURL:()=>'masked'};
 const mask={toDataURL:()=>'window-mask'};
 const r={x:5.6,y:9.3,w:51.8,h:31.8};
 const requests=[];
 const context=vm.createContext({
  $,canvas(){},card:original,approvedFaceSource:masked,revision:1,busy:false,ready:true,
  rect:()=>r,extractPreviewRevision:1,prepareFullCard:card=>card,
  windowMask:()=>mask,resetFullArt(){},draw(){},update(){},toast(){},sourceMetadata:()=>({}),
  padCard:(source,_canvas,maskOnly)=>({toDataURL:()=>maskOnly?'padded-mask':'padded-'+source.toDataURL()}),
  loadSharedSymbol:async()=>({image:{},placement:{}}),aiHeaderDraft:null,
  A:{invokeFunction:async(_name,body)=>{requests.push(body);return {image:'png'}}},
  decodeTextLayer:async()=>({}),Image:class{width=1648;height=2048;async decode(){}},
  alignWide:async source=>{assert.equal(source,original);return {matrix:[],trusted:true}},
  isOriginalMode:()=>false,wideVariant:()=>null,showStorage(){},fullArtMode(){},
  editWideResult:async()=>{},wideManualState:null,fullArtSource:null
 });
 vm.runInContext(client.slice(client.indexOf('const FACE_LAYER_MODE'),client.indexOf('const ORIGINAL_REFERENCES')),context);
 vm.runInContext(client.slice(client.indexOf('function isWideMode'),client.indexOf('import {padCard')),context);
 vm.runInContext(client.slice(client.indexOf("$('generate').onclick"),client.indexOf('function sheet(){')),context);
 vm.runInContext(client.slice(client.indexOf('async function generateFullArt'),client.indexOf('async function generateLayerAtlas')),context);
 vm.runInContext('const isFullCardMode=()=>true;',context);
 $('generationMode').value='fullart_header_layers_face';
 $('confirmed').checked=$('pokemonConfirmed').checked=true;
 await vm.runInContext("$('generate').onclick()",context);
 assert.equal(requests.length,0);
 $('extractAccepted').checked=true;
 await vm.runInContext("$('generate').onclick()",context);
 assert.deepEqual(requests.map(({action,image})=>[action,image]),[
  ['generate_text_layer','masked'],['generate_fullart_wide','padded-masked']
 ]);
 assert.equal(vm.runInContext('wideManualState.source',context),original);
 assert.equal(vm.runInContext('wideManualState.layers.kind',context),'ai-text');
 requests.length=0;
 $('generationMode').value='fullart_header_layers';
 await vm.runInContext('generateFullArt(rect())',context);
 assert.deepEqual(requests.map(({action,image})=>[action,image]),[
  ['generate_text_layer','original'],['generate_fullart_wide','padded-original']
 ]);
});
