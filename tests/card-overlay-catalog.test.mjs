import {windowPresetType} from '../card-art-window-presets.mjs';
import{test}from'node:test';import assert from'node:assert/strict';import vm from'node:vm';import{readFileSync}from'node:fs';import{catalogPage,catalogLabel,catalogLanguage,catalogPortrait,isDogamAdminCard}from'../card-overlay-catalog.mjs';
const rows=[{id:'30th-en-023',card_number:'023',display_name:'Pikachu'},{id:'me55cc-en-001',card_number:'001',display_name:'Pikachu'},{id:'m6a-ko-01M2FKPHRVHABKX7QV0YY7RJ13',card_number:'001',display_name:'아라리',art_rect:{x:5.3,y:9.1,w:52.6,h:32.3}},{id:'m6a-ja-023',card_number:'023',display_name:'ピカチュウ'},{id:'m6a-ko-energy',card_number:'No. 169',display_name:'기본 풀 에너지'}];
test('catalog filters languages and searches registered names and exact printed numbers',()=>{assert.equal(catalogLanguage(rows[2]),'ko');assert.equal(catalogLanguage(rows[3]),'ja');assert.match(catalogLabel(rows[1]),/Classic Collection/);assert.equal(catalogPage(rows,{search:'Pikachu'}).total,2);assert.equal(catalogPage(rows,{search:'피카츄'}).total,0);assert.equal(catalogPage(rows,{search:'００１'}).total,2);assert.equal(catalogPage(rows,{search:'169'}).total,1);assert.equal(catalogPage(rows,{language:'ja',search:'23'}).rows[0].id,'m6a-ja-023');});
test('catalog pagination keeps all 531 records, clamps filters, and does not mutate input',()=>{const fixture=Array.from({length:531},(_,i)=>({id:'30th-en-'+i,card_number:String(i).padStart(3,'0'),display_name:'Card'}));const original=JSON.stringify(fixture),seen=[];for(let page=0;page<23;page++)seen.push(...catalogPage(fixture,{page}).rows.map(r=>r.id));assert.equal(new Set(seen).size,531);assert.equal(catalogPage(fixture,{page:22}).rows.length,3);assert.equal(catalogPage(fixture,{page:99,search:'001'}).page,0);assert.equal(JSON.stringify(fixture),original);});
test('single portrait images can load; landscape, invalid dimensions and LEGEND pairs cannot stretch into a card',()=>{assert.ok(catalogPortrait(rows[0],{naturalWidth:733,naturalHeight:1024}));assert.ok(catalogPortrait(rows[2],{naturalWidth:868,naturalHeight:1212}));assert.ok(!catalogPortrait({id:'m6a-ja-157'},{width:800,height:573}));assert.ok(!catalogPortrait({id:'m6a-ja-151152'},{width:800,height:1146}));assert.ok(!catalogPortrait(rows[0],{width:0,height:0}));});
const client=readFileSync(new URL('../card-overlay.mjs',import.meta.url),'utf8');
function fixture({signedIn=true,invoke,adminRows=[],appShell=false}={}){
 const elements=new Map(),calls=[];function el(){return{value:'',checked:false,disabled:false,hidden:false,textContent:'',children:[],events:{},open:false,append(...x){this.children.push(...x)},replaceChildren(...x){this.children=x},setAttribute(k,v){this[k]=v},removeAttribute(k){delete this[k]},addEventListener(k,f){this.events[k]=f},showModal(){this.open=true},close(){this.open=false;this.events.close?.()}};}const $=id=>{if(!elements.has(id))elements.set(id,el());return elements.get(id)};$('catalogLanguage').value='all';$('catalogSearch').value='';$('confirmed').checked=true;$('pokemonConfirmed').checked=true;
 const canvas=(width,height)=>({width,height,getContext:()=>({drawImage(){}})});
 const context=vm.createContext({$,catalogPage,catalogPortrait,catalogLabel,catalogLanguage,isDogamAdminCard,windowPresetType,update(){},document:{createElement:el},canvas,W:756,H:1056,cv:canvas(10,10),busy:false,savedLoading:false,savedEpoch:0,historyOnly:true,sampleMode:true,photo:{old:true},card:{old:true},art:{old:true},artBleed:2,corners:[1,2,3,4],revision:7,names:['왼쪽 위'],resetFullArt:()=>calls.push('resetFullArt'),clearReference:()=>calls.push('clearReference'),resetReview:()=>calls.push('resetReview'),applyZoom(){},validRect:r=>r.x>=0&&r.y>=0&&r.w>=5&&r.h>=5&&r.x+r.w<=63&&r.y+r.h<=88,draw:()=>calls.push('draw'),fullArtMode:()=>calls.push('fullArtMode'),autoWindow:()=>calls.push('autoWindow'),toast:()=>{},location:{href:'https://funypin.kr/card-overlay.html'},Image:class{naturalWidth=800;naturalHeight=1117;async decode(){}},A:{isAppShell:()=>appShell,client:{
  from(table){calls.push(table);return {select:()=>({order:async()=>({data:adminRows})})}},
  storage:{from(bucket){return {createSignedUrl:async(path,expires)=>{
   calls.push([bucket,path,expires]);return {data:{signedUrl:'https://example.test/private.png'}};
  }}}}
 },getSession:async()=>signedIn?{}:null,goLogin:()=>calls.push('login'),invokeFunction:async(name,data)=>{calls.push(data.action);if(invoke)return invoke(data);if(data.action==='references')return{references:rows};return{reference:{...rows[2],id:data.id,imageUrl:'https://example.test/signed.png'}};}}});
 const setPhoto=client.slice(client.indexOf('function setPhoto('),client.indexOf('function analyze('));const presets=client.slice(client.indexOf('const overlayWindowPresets='),client.indexOf("$('photo').onchange="));vm.runInContext(setPhoto+'\n'+presets+'\n'+client.slice(client.indexOf('// Source picker reuses')),context);return{$,calls,context,run:code=>vm.runInContext(code,context)};
}
test('logged out catalog shows login without catalog access, image generation or source changes',async()=>{const f=fixture({signedIn:false});await f.run('openCatalog()');assert.equal(f.$('catalogLogin').hidden,false);assert.match(f.$('catalogStatus').textContent,/로그인/);assert.equal(f.run('card.old'),true);assert.equal(f.calls.length,0);});
test('selected private DB image becomes the complete source and clears prior artwork while requiring review',async()=>{const f=fixture();await f.run('openCatalog()');await f.run('selectCatalogImage(catalogRows.find(r=>r.card_number==="001"&&r.id.startsWith("m6a-ko-")))');assert.equal(f.$('catalogUse').disabled,false);f.run('useCatalogImage()');const state=JSON.parse(f.run('JSON.stringify({photo:[photo.width,photo.height],card:[card.width,card.height],art,sampleMode,historyOnly,corners,revision})'));assert.deepEqual(state.photo,[800,1117]);assert.deepEqual(state.card,[756,1056]);assert.equal(state.art,null);assert.equal(state.sampleMode,false);assert.equal(state.historyOnly,false);assert.deepEqual(state.corners,[]);assert.ok(state.revision>7);assert.equal(f.$('confirmed').checked,false);assert.equal(f.$('pokemonConfirmed').checked,false);assert.equal(f.$('settings').disabled,false);assert.equal(f.$('x').value,5.6);assert.equal(f.$('catalogDialog').open,false);assert.equal(f.$('previewTitle').textContent,'DB 카드 · 아라리');assert.ok(f.calls.includes('resetFullArt'));assert.deepEqual(f.calls.filter(x=>['references','reference'].includes(x)),['references','reference']);assert.ok(!f.calls.some(x=>x.startsWith('generate')));});
test('closing picker ignores late private-image responses and preserves the current card',async()=>{let complete;const waiting=new Promise(r=>complete=r);const f=fixture({invoke:d=>d.action==='references'?{references:rows}:waiting});await f.run('openCatalog()');const pending=f.run('selectCatalogImage(catalogRows[0])');f.$('catalogDialog').close();complete({reference:{...rows[0],imageUrl:'https://example.test/late.png'}});await pending;assert.equal(f.run('catalogSelected'),null);assert.equal(f.$('catalogUse').disabled,true);assert.equal(f.run('card.old'),true);});
test('catalog access errors preserve the current source and do not start generation',async()=>{const f=fixture({invoke:()=>{throw Object.assign(new Error('테스트 계정만 사용할 수 있습니다.'),{status:403})}});await f.run('openCatalog()');assert.match(f.$('catalogStatus').textContent,/테스트 계정/);assert.equal(f.$('catalogLogin').hidden,true);assert.equal(f.run('card.old'),true);assert.deepEqual(f.calls,['references','overlay_admin_card_references']);});

const adminEevee={id:'dogam-ko-01M2FKQ11RP549D09ARMYB89WQ',display_name:'이브이',
 card_number:'094/103',set_code:'M6a',set_name:'30th CELEBRATION',variant:'홀로',
 illustrator:'Wintr Wandr',image_path:'eevee/example.png'};
test('web admin references have a private image URL and work as a source',async()=>{
 const f=fixture({adminRows:[adminEevee]});
 await f.run('openCatalog()');
 assert.equal(catalogPage([adminEevee],{language:'ko',search:'m6a'}).total,1);
 await f.run('selectCatalogImage(catalogRows.find(isDogamAdminCard))');
 assert.match(f.$('catalogSelected').textContent,/094\/103.*이브이.*Wintr Wandr/);
 assert.deepEqual(f.calls.at(-1),['overlay-admin-card-references','eevee/example.png',300]);
 f.run('useCatalogImage()');
 assert.equal(f.$('previewTitle').textContent,'DB 카드 · 이브이');
 assert.equal(f.$('pokemonConfirmed').checked,false);
 assert.ok(!f.calls.some(call=>typeof call==='string'&&call.startsWith('generate')));
});
test('native app shell does not request the private reference catalog',async()=>{
 const f=fixture({adminRows:[adminEevee],appShell:true});
 await f.run('openCatalog()');
 assert.ok(!f.run('catalogRows.some(isDogamAdminCard)'));
 assert.deepEqual(f.calls,['references']);
});

test('the three overlay card layouts use the exact mobile window defaults',()=>{
 const f=fixture();
 const expected={
  regular:{x:5.6,y:9.3,w:51.8,h:31.8},
  evolution:{x:5.7,y:10.6,w:51.7,h:30.4},
  classic:{x:7.6,y:12.8,w:47.3,h:32.1}
 };
 for(const [kind,rect] of Object.entries(expected)){
  f.$('layout').value=kind;
  f.run('applyWindowPreset()');
  for(const [key,value] of Object.entries(rect))assert.equal(f.$(key).value,value);
  assert.deepEqual(JSON.parse(f.run('JSON.stringify(fixedArtRect)')),rect);
 }
 assert.equal(f.run(`catalogWindowKind({id:'m6a-ja-002',card_number:'002',display_name:'ナッシー'})`),'evolution');
 assert.equal(f.run(`catalogWindowKind({id:'m6a-ja-136',card_number:'136',display_name:'ピカチュウ'})`),'classic');
});
