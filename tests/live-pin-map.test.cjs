const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 let country='KR',rows=[],handlers={},intervals=[],created=[],googleCreated=0;
 const elements=new Map();
 function el(){return{style:{},classList:{toggle(){}},setAttribute(){},appendChild(e){e.parent=this;if(e.id)elements.set(e.id,e)},remove(){},textContent:'',value:''}}
 const filters=el();elements.set('filters',filters);elements.set('map-shop-search',el());
 const document={hidden:false,head:el(),body:{classList:{contains:()=>country==='JP'}},getElementById:id=>elements.get(id),createElement:el,addEventListener(){}};
 class Marker{constructor(opts){this.map=opts.map;this.opts=opts;this.setMap=m=>this.map=m;created.push(this)}}
 class Overlay{setMap(map){this.map=map;if(map){googleCreated++;this.onAdd();this.draw()}else this.onRemove()}getPanes(){return{overlayMouseTarget:el()}}getProjection(){return{fromLatLngToDivPixel:()=>({x:20,y:30})}}}
 Overlay.preventMapHitsAndGesturesFrom=()=>{};
 class Info{constructor(){}close(){}open(){}}
 const fakeNow=Date.parse('2026-10-13T12:00:00+09:00');let now=fakeNow;
 class Clock extends Date{static now(){return now}}
 const w={FUNY_MAP_COUNTRY:{get:()=>country},FUNY_NAVER_MAP_API:{getMap:()=>({})},FUNY_GOOGLE_MAP_API:{getMap:()=>({addListener(){}})},addEventListener(){},supabase:{createClient:()=>({channel:()=>({on(event,filter,cb){handlers[filter.table]=cb;return this},subscribe(){}})})}};
 const context={window:w,document,Date:Clock,location:{href:'https://funypin.kr/shops.html',search:''},URL,URLSearchParams,AbortController,console,setTimeout:()=>1,clearTimeout(){},setInterval:fn=>intervals.push(fn),fetch:async url=>({ok:true,json:async()=>url.includes('revision')?[{revision:1}]:rows}),naver:{maps:{Marker,InfoWindow:Info,Size:class{},Point:class{},LatLng:class{},Event:{addListener(){}}}},google:{maps:{OverlayView:Overlay,InfoWindow:Info,LatLng:class{},Size:class{}}}};
 vm.createContext(context);vm.runInContext(fs.readFileSync('live-pin-time-v1.js','utf8'),context);
 const report={id:1,location_type:'direct',post_type:'report',is_hidden:false,country_code:'KR',latitude:37.5,longitude:127,created_at:'2026-10-13T11:00:00+09:00',expires_at:'2026-10-14T00:00:00+09:00',shop_name:'Temp location',content:'stock'};rows=[report,{...report,id:2,country_code:'JP',latitude:35.6,longitude:139.7}];
 vm.runInContext(fs.readFileSync('map-live-pin-v1.js','utf8'),context);const flush=async()=>{for(let i=0;i<15;i++)await Promise.resolve()};await flush();
 assert.equal(created.length,1);assert(created[0].opts.icon.content.includes('⚡'));assert(created[0].opts.icon.content.includes('#17151b'));
 country='JP';intervals[0]();assert.equal(created[0].map,null);assert.equal(googleCreated,1);
 rows=[{...report,id:3,location_type:'registered',shop_id:'KR-SEO-001'}];w.FUNY_LIVE_MAP.refresh();await flush();assert(w.FUNY_LIVE_MAP.hasRegisteredLive('KR-SEO-001'));elements.get('liveTempLayer').onclick({preventDefault(){},stopPropagation(){}});assert(!w.FUNY_LIVE_MAP.hasRegisteredLive('KR-SEO-001'));elements.get('liveTempLayer').onclick({preventDefault(){},stopPropagation(){}});assert(w.FUNY_LIVE_MAP.hasRegisteredLive('KR-SEO-001'));assert.equal(w.FUNY_LIVE_MAP.metrics('JP').pinW,33);assert.equal(w.FUNY_LIVE_MAP.metrics('KR').pinW,21);rows=[];handlers.live_pin_map_revision();await flush();assert.equal(w.FUNY_LIVE_MAP.getRows().length,0);
 country='KR';rows=[report];w.FUNY_LIVE_MAP.refresh();await flush();assert.equal(w.FUNY_LIVE_MAP.getRows().length,1);
 now=Date.parse('2026-10-14T00:00:00+09:00');intervals[0]();await flush();assert.equal(w.FUNY_LIVE_MAP.getRows().length,0);assert.equal(created.at(-1).map,null);
 console.log('KR black/bolt marker, JP switch, moderation signal, and midnight map removal passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
