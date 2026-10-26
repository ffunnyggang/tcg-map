const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function runtime({init=false,app=false,route=false}={}){
  const events=[],clicks=[],listeners={},tags=[];
  class Element{constructor(nodes={}){this.nodes=nodes}closest(s){return this.nodes[s]||null}}
  const window={gtag:(...args)=>events.push(args),addEventListener:(n,f)=>{(listeners[n]??=[]).push(f)}};
  if(app){window.ReactNativeWebView={};window.__FUNY_APP_CONTEXT={surface:'tab',platform:'ios',appVersion:'1.0.0',loggedIn:true};}
  const document={currentScript:{dataset:{gaInit:init?'1':'0',routeTracking:route?'1':'0'}},head:{appendChild:x=>tags.push(x)},createElement:()=>({}),addEventListener:(n,f)=>{if(n==='click')clicks.push(f)}};
  const context={window,document,Element,URLSearchParams,location:{search:app?'?app=1':'',pathname:'/shops.html',hash:''},setTimeout:f=>f(),console};
  vm.createContext(context);vm.runInContext(read('funy-analytics-core.js'),context);
  return {context,events,tags,clicks,listeners,Element};
}
// Missing-tag pages initialize once; pages with a tag do not configure twice.
let r=runtime({init:true});assert.equal(r.events.filter(x=>x[0]==='config').length,1);assert.equal(r.tags.length,1);
vm.runInContext(read('funy-analytics-core.js'),r.context);assert.equal(r.tags.length,1);
r=runtime({app:true});assert.equal(r.events.filter(x=>x[0]==='config').length,0);
r.context.window.FUNY_TRACK('live_pin_submit',{location_type:'direct'});
let p=r.events.at(-1)[2];assert.equal(p.app_platform,'ios');assert.equal(p.login_state,'logged_in');assert.equal(p.location_type,'direct');
// Existing app interception can suppress document handlers, so record at window capture.
const card={dataset:{id:'KR-SEL-001'}};
const touchTarget=new r.Element({'.shop-card[data-id]':card});
r.listeners.touchstart[0]({touches:[{clientX:10,clientY:10}]});
const touch={type:'touchend',target:touchTarget};r.listeners.touchend[0](touch);
const click={type:'click',target:touchTarget};r.listeners.click[0](click);
assert.equal(r.events.filter(x=>x[1]==='shop_list_click').length,1);
assert.equal(touch.__funyAnalyticsCaptured,true);assert.equal(click.__funyAnalyticsCaptured,true);
// Scrolling over a card is not a click.
r.listeners.touchstart[0]({touches:[{clientX:10,clientY:10}]});
r.listeners.touchmove[0]({touches:[{clientX:10,clientY:50}]});
r.listeners.touchend[0]({type:'touchend',target:touchTarget});
assert.equal(r.events.filter(x=>x[1]==='shop_list_click').length,1);
// A plain browser is not incorrectly classified as a logged-out app.
r=runtime();r.context.window.FUNY_TRACK('test');p=r.events.at(-1)[2];assert.equal(p.client_surface,'web');assert.equal(p.login_state,'unknown');
// Current button selectors record actions and the resulting layer state.
const sort={dataset:{sortValue:'near'}},layer={id:'liveTempLayer',classList:{contains:()=>false}};
for(const nodes of [{'#map-location-btn':{}},{'#list-sort-menu [data-sort-value]':sort},{'.qa-layer-chip,#liveTempLayer':layer}])r.clicks[0]({target:new r.Element(nodes)});
assert.equal(r.events.filter(x=>x[1]==='map_my_location_click').length,1);
assert.equal(r.events.find(x=>x[1]==='shop_sort_click')[2].sort_type,'near');
assert.equal(r.events.find(x=>x[1]==='map_layer_toggle')[2].enabled,false);
// A -> map -> A records two detail visits; unrelated legacy bootstrap is excluded.
r=runtime();const addon=read('ga4-events.js').split('/* FUNY PIN analytics additive v1.1')[1];
r.context.location.hash='#/shop/KR-SEL-001';vm.runInContext('/* FUNY PIN analytics additive v1.1'+addon,r.context);
r.context.location.hash='';r.listeners.hashchange.forEach(f=>f());
r.context.location.hash='#/shop/KR-SEL-001';r.listeners.hashchange.forEach(f=>f());
assert.equal(r.events.filter(x=>x[1]==='shop_detail_view').length,2);
// Verify every inline script parses, including completion hooks after successful saves.
const pages=['index.html','shops.html','pick.html','talk.html','live-pin.html','live-pin-test.html','coin-flip.html','oripa-calculator.html','shop-request.html','partner.html','feedback.html','support.html'];
for(const page of pages){const s=read(page);assert.equal((s.match(/src="funy-analytics-core.js/g)||[]).length,1,page);for(const m of s.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){if(/type=["']application\/ld\+json/.test(m[1]))continue;new vm.Script(m[2],{filename:page});}}
for(const page of ['coin-flip.html','oripa-calculator.html','shop-request.html','partner.html'])assert.match(read(page),/data-ga-init="1"/);
assert.match(read('shop-request.html'),/if\(!res.ok\)[\s\S]*shop_request_submit/);
assert.match(read('live-pin.html'),/if\(!res.ok\)[\s\S]*live_pin_request_submit/);
console.log('Analytics v2 checks passed');
