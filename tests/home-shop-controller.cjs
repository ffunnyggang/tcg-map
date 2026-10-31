// Dependency: npm install --prefix /tmp/fhs-testdeps linkedom@0.18.12
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {parseHTML}=require(process.env.FHS_LINKEDOM||'/tmp/fhs-testdeps/node_modules/linkedom');
const {window}=parseHTML('<html><body><div data-cms-placement="home"><div class="fp-cms-home-shops-slot"></div></div></body></html>');
const document=window.document,Event=window.Event;const M=require('../home-shop-model.js');window.FUNY_HOME_SHOP_MODEL=M;let recent=[],recentReads=0,fetches=0;
const shops=Array.from({length:7},(_,i)=>({id:'KR-SEO-00'+(i+1),name:'Shop'+i,is_active:true,status:'운영',region_code:i<3?'SEO':'GGI',images:[],features:[]}));const stats=shops.map((s,i)=>({shop_id:s.id,favorite_count:i,detail_views_30d:0,engagement_ready:false}));window.FUNY_WEB_AUTH={init:async()=>{},session:null};window.FUNY_SHOP_RECENT={read:async()=>{recentReads++;return{rows:recent,local:true}}};
const ctx=vm.createContext({window,document,location:{origin:'https://funypin.kr'},URL,URLSearchParams,CustomEvent:window.CustomEvent,navigator:{},console,fetch:async url=>{fetches++;return{ok:true,json:async()=>url.includes('shop_sort_stats')?stats:shops}}});
vm.runInContext(fs.readFileSync(require.resolve('../home-shop-discovery.js'),'utf8'),ctx);
const tick=async()=>{for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r))};
const block=(enabled)=>({id:'block',title:'Test',home_shop_config:{enabled,today:shops.map(x=>x.id),themes:{beginner:shops.slice(0,3).map(x=>x.id)}}});
(async()=>{
 window.FUNY_HOME_SHOPS.sync(block({today:false,browse:false,themes:false,mine:false}));await tick();assert.equal(fetches,0);assert.equal(recentReads,0);assert.equal(document.querySelector('#funy-home-shops').hidden,true);
 window.FUNY_HOME_SHOPS.sync(block({today:true,browse:true,themes:true,mine:true}));await tick();assert.equal(document.querySelectorAll('.fhs-section').length,4);assert.equal(document.querySelectorAll('#fhs-browse-panel .fhs-shop').length,5);assert.equal(document.querySelectorAll('#fhs-theme-panel a').length,3);assert.match(document.querySelector('#fhs-mine-panel').textContent,/로그인/);
 document.querySelector('[data-browse="directions"]').click();assert.match(document.querySelector('#fhs-browse-panel').textContent,/수집/);assert.equal(document.querySelectorAll('#fhs-browse-panel .fhs-shop').length,0);
 document.querySelector('[data-mine="recent"]').click();assert.match(document.querySelector('#fhs-mine-panel').textContent,/없습니다/);
 recent=[{shop_id:shops[0].id,viewed_at:new Date().toISOString()}];const e=new Event('pageshow');Object.defineProperty(e,'persisted',{value:true});window.dispatchEvent(e);await tick();assert.equal(document.querySelectorAll('#fhs-mine-panel a').length,1);
 const before=fetches;window.FUNY_HOME_SHOPS.sync(block({today:true,browse:true,themes:true,mine:true}));await tick();assert.equal(fetches,before);assert.equal(document.querySelectorAll('#funy-home-shops').length,1);
 window.FUNY_HOME_SHOPS.sync(null);assert.equal(document.querySelector('#funy-home-shops'),null);
 console.log('HOME controller: all-off avoids fetch/private reads; guest CTA; 5/3 limits; pending directions; BFCache recent refresh; idempotent remount; disable PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
