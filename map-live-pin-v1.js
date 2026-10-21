/* Temporary LIVE PIN markers, isolated from shop/event/vending marker engines. */
(function(){
 'use strict';if(window.__FUNY_LIVE_MAP)return;window.__FUNY_LIVE_MAP=true;
 const BASE='https://wdttzpbmqavaqfcbaywj.supabase.co',KEY='sb_publishable__wrSzngSE-JbGnyE7PZX9w_2QaW8bpq',headers={apikey:KEY};
 const layerPrefKey='funypin_map_live_pin_layer_v1';
 function readLayerPref(){try{const saved=localStorage.getItem(layerPrefKey);return saved==='false'?false:true}catch(_){return true}}
 function saveLayerPref(){try{localStorage.setItem(layerPrefKey,String(enabled))}catch(_){}}
 const time=window.FUNY_LIVE_TIME,markers=new Map();let rows=[],enabled=readLayerPref(),popup=null,selected=null,loading=false,liveRowsLoaded=false,reload=false,revision=null,seq=0,channel=null;
 let day=time.bounds().day,lastCountry='',lastSearch='',liveSignature='',lastMetric='',registeredSet=new Set();
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const country=()=>window.FUNY_MAP_COUNTRY?.get?.()||(document.body.classList.contains('country-japan')?'JP':'KR');
 const mapFor=c=>c==='KR'?window.FUNY_NAVER_MAP_API?.getMap?.():window.FUNY_GOOGLE_MAP_API?.getMap?.();
 function close(){try{popup?.close()}catch(_){}popup=null;selected=null;}
 window.FUNY_MAP_BALLOONS?.register?.('live-pin',close);
 function clear(){close();markers.forEach(m=>m.setMap(null));markers.clear();}
 function matches(r){const q=(document.getElementById('map-shop-search')?.value||'').trim().toLowerCase();return !q||(r.shop_name+' '+(r.content||'')).toLowerCase().includes(q)}
 function metrics(c=country()){
  if(c==='JP')return{pinW:33,pinH:45,markerW:37,markerH:51};
  const z=mapFor('KR')?.getZoom?.()??11;
  if(z<=9)return{pinW:16,pinH:22,markerW:20,markerH:28};
  const sizes={10:[18,25,22,31],11:[21,29,25,35],12:[24,33,28,39],13:[27,37,31,43],14:[30,41,34,47]},v=sizes[z]||[33,45,37,51];
  return{pinW:v[0],pinH:v[1],markerW:v[2],markerH:v[3]};
 }
 function pin(c=country()){const m=metrics(c);return '<div class="live-temp-pin" style="--pin-w:'+m.pinW+'px;--pin-h:'+m.pinH+'px;--marker-w:'+m.markerW+'px;--marker-h:'+m.markerH+'px" aria-label="LIVE PIN"><svg viewBox="0 0 98 134" fill="none" aria-hidden="true"><path d="M49 5C23 5 2 26 2 52c0 35 47 77 47 77s47-42 47-77C96 26 75 5 49 5Z" fill="#17151b"/><path d="M6 52h28M64 52h28" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cx="49" cy="52" r="14.5" fill="#fff"/></svg><span>⚡</span></div>'}
 function active(r,now=Date.now()){const b=time.bounds(),created=Date.parse(r.created_at);return !r.is_hidden&&r.post_type==='report'&&!String(r.status||'').startsWith('EVENT_ENTRY')&&created>=b.start&&created<=now&&(r.location_type==='direct'?time.current(r,now):/^(KR-|JP-|PKVM-)/.test(r.shop_id||''));}
 function registeredIds(){return registeredSet;}
 function registeredLive(id){return enabled&&registeredIds().has(String(id));}
 function decorate(){
  const ids=registeredIds(),signature=String(enabled)+':'+[...ids].sort().join(',');
  if(signature!==liveSignature){liveSignature=signature;window.FUNY_MAP_POPUP?.setLiveIds?.(enabled?[...ids]:[]);window.FUNY_QA_LAYERS?.refresh?.();}
  const gm=window.FUNY_GOOGLE_MAP_API?.getMarkers?.();gm?.forEach((m,id)=>{const el=m.el;if(!el)return;const on=enabled&&ids.has(String(id));let badge=el.querySelector('.live-registered-bolt');if(on&&!badge){badge=document.createElement('span');badge.className='live-registered-bolt';badge.textContent='⚡';el.appendChild(badge)}else if(!on&&badge)badge.remove()});
 }
 function content(r){const u=new URL('live-pin.html',location.href);u.searchParams.set('report',r.id);if(new URLSearchParams(location.search).get('app')==='1')u.searchParams.set('app','1');const thumb=r.image_path?'<span class="map-popup-thumb"><img alt="현장 사진" src="'+esc(BASE+'/storage/v1/object/public/live-pin/'+String(r.image_path).split('/').map(encodeURIComponent).join('/'))+'"></span>':'';return '<div class="map-popup-bubble live-temp-popup"><a class="live-temp-open live-temp-card'+(thumb?' has-photo':'')+'" data-live-report="'+esc(r.id)+'" href="'+esc(u.href)+'" aria-label="'+esc(r.shop_name)+' LIVE PIN 보기">'+thumb+'<span class="map-popup-copy"><strong class="live-temp-title"><span class="live-temp-name">'+esc(r.shop_name)+'</span></strong><span class="live-temp-body">'+esc(r.content||'')+'</span></span><span class="map-popup-chevron" aria-hidden="true">›</span></a></div>'}

 function select(r,m){window.__FUNY_LAST_MAP_MARKER_TAP=Date.now();if(selected===String(r.id)){close();return}window.FUNY_MAP_BALLOONS?.activate?.('live-pin');close();selected=String(r.id);const map=mapFor(r.country_code);if(r.country_code==='KR'){popup=new naver.maps.InfoWindow({content:content(r),borderWidth:0,backgroundColor:'transparent',anchorSize:new naver.maps.Size(0,0),pixelOffset:new naver.maps.Point(0,-8)});popup.open(map,m)}else{popup=new google.maps.InfoWindow({content:content(r),position:{lat:r.latitude,lng:r.longitude},pixelOffset:new google.maps.Size(0,-44)});popup.open({map})}}
 function add(r,map){let m;if(r.country_code==='KR'){m=new naver.maps.Marker({map,position:new naver.maps.LatLng(r.latitude,r.longitude),title:r.shop_name,zIndex:125,icon:{content:pin(r.country_code),anchor:new naver.maps.Point(Math.round(metrics(r.country_code).markerW/2),metrics(r.country_code).markerH)}});naver.maps.Event.addListener(m,'click',()=>select(r,m));}
 else{class LiveOverlay extends google.maps.OverlayView{onAdd(){this.el=document.createElement('button');this.el.className='live-temp-google';this.el.type='button';this.el.setAttribute('aria-label',r.shop_name+' LIVE PIN');this.el.innerHTML=pin('JP');this.el.onclick=e=>{e.stopPropagation();select(r,this)};google.maps.OverlayView.preventMapHitsAndGesturesFrom(this.el);this.getPanes().overlayMouseTarget.appendChild(this.el)}draw(){if(!this.el)return;const p=this.getProjection().fromLatLngToDivPixel(new google.maps.LatLng(r.latitude,r.longitude));if(p){this.el.style.left=p.x+'px';this.el.style.top=p.y+'px'}}onRemove(){this.el?.remove();this.el=null}}m=new LiveOverlay();m.setMap(map)}
 markers.set(String(r.id),m);
 }
 function sync(){const now=Date.now(),c=country(),map=mapFor(c),valid=rows.filter(r=>active(r,now));rows=valid;registeredSet=new Set(valid.filter(r=>r.location_type!=='direct').map(r=>r.shop_id));const direct=[...new Map(valid.filter(r=>r.location_type==='direct').map(r=>[r.shop_id||String(r.id),r])).values()];const visible=direct.filter(r=>enabled&&r.country_code===c&&matches(r)),ids=new Set(visible.map(r=>String(r.id)));markers.forEach((m,id)=>{if(!ids.has(id)||lastCountry!==c){m.setMap(null);markers.delete(id);if(selected===id)close()}});if(map)visible.forEach(r=>{if(!markers.has(String(r.id)))add(r,map)});lastCountry=c;chip();decorate();}
 function chip(){let el=document.getElementById('liveTempLayer');const root=document.getElementById('filters');if(!root)return;if(!el){el=document.createElement('button');el.id='liveTempLayer';el.type='button';el.className='live-temp-layer';root.appendChild(el)}el.onclick=e=>{e.preventDefault();e.stopPropagation();enabled=!enabled;saveLayerPref();sync()};const count=new Set(rows.filter(r=>active(r)&&(r.location_type==='direct'?r.country_code===country():country()==='JP'?String(r.shop_id).startsWith('JP-'):!String(r.shop_id).startsWith('JP-'))).map(r=>r.shop_id||String(r.id))).size;el.classList.toggle('active',enabled);el.setAttribute('aria-pressed',String(enabled));el.setAttribute('aria-busy',liveRowsLoaded?'false':'true');const label='<span class="live-layer-bolt" aria-hidden="true">⚡</span><span>LIVE PIN</span><span class="qa-layer-count">'+(liveRowsLoaded?count:'-')+'</span>';if(el.innerHTML!==label)el.innerHTML=label;}
 async function load(){if(loading){reload=true;return}loading=true;liveRowsLoaded=false;chip();const my=++seq,ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),10000),result=[];try{for(let offset=0;;offset+=500){const b=time.bounds();const q=new URLSearchParams({select:'id,shop_id,shop_name,post_type,category,status,content,image_path,created_at,expires_at,is_hidden,location_type,country_code,latitude,longitude',or:'(shop_id.like.KR-*,shop_id.like.JP-*,shop_id.like.PKVM-*,shop_id.like.LIVE-PIN:*)',is_hidden:'eq.false',post_type:'eq.report',created_at:'gte.'+new Date(b.start).toISOString(),order:'id.asc',limit:'500',offset:String(offset)});const res=await fetch(BASE+'/rest/v1/live_reports?'+q,{headers,cache:'no-store',signal:ctrl.signal});if(!res.ok)throw new Error('HTTP '+res.status);const part=await res.json();result.push(...part);if(part.length<500)break}if(my===seq){rows=result;liveRowsLoaded=true;sync()}}catch(e){console.warn('[LIVE PIN map]',e);liveRowsLoaded=false;sync()}finally{clearTimeout(timer);loading=false;if(reload){reload=false;load()}}}
 function changed(){seq++;clear();rows=[];liveRowsLoaded=false;sync();load()}
 async function pollRevision(){if(document.hidden)return;try{const res=await fetch(BASE+'/rest/v1/live_pin_map_revision?select=revision&id=eq.1',{headers,cache:'no-store'});if(!res.ok)return;const data=await res.json(),next=data[0]?.revision;if(revision!==null&&next!==revision)changed();revision=next}catch(_){} }
 async function realtime(){try{if(!window.supabase?.createClient)await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.8/dist/umd/supabase.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});const db=window.supabase.createClient(BASE,KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});channel=db.channel('live-pin-map-visibility').on('postgres_changes',{event:'UPDATE',schema:'public',table:'live_pin_map_revision'},()=>{changed();pollRevision()}).on('postgres_changes',{event:'*',schema:'public',table:'live_reports'},changed).subscribe()}catch(e){console.warn('[LIVE PIN map] realtime unavailable',e)}}
 async function resolveDeepLinkTarget(params){
  const q=params||new URLSearchParams(location.search),reportId=q.get('liveReport'),shopId=q.get('liveShopId')||'',lat=Number(q.get('liveLat')),lng=Number(q.get('liveLng')),countryHint=q.get('liveCountry')||'';
  if(!reportId&&!shopId&&!(Number.isFinite(lat)&&Number.isFinite(lng)))return null;
  if(Number.isFinite(lat)&&Number.isFinite(lng))return{reportId,shopId,lat,lng,country:countryHint==='JP'?'JP':'KR'};
  if(!shopId||shopId==='KR-OTHER')return null;
  try{
    const shops=window.FUNY_NAVER_MAP_API?.getShops?.()||[];
    const shop=shops.find(x=>String(x.id)===String(shopId));
    if(shop){
      const p=shop._coord||{},rlat=Number(p.lat??shop.latitude),rlng=Number(p.lng??shop.longitude);
      if(Number.isFinite(rlat)&&Number.isFinite(rlng))return{reportId,shopId,lat:rlat,lng:rlng,country:String(shop.country_code||countryHint)==='JP'?'JP':'KR'};
    }
  }catch(_){}
  if(shopId.startsWith('PKVM-')){
    try{
      const params=new URLSearchParams({select:'id,latitude,longitude',id:'eq.'+shopId,limit:'1'});
      const res=await fetch(BASE+'/rest/v1/v_public_pokemon_card_vending_machines?'+params,{headers,cache:'no-store'});
      if(!res.ok)return null;
      const row=(await res.json())?.[0],rlat=Number(row?.latitude),rlng=Number(row?.longitude);
      if(Number.isFinite(rlat)&&Number.isFinite(rlng))return{reportId,shopId,lat:rlat,lng:rlng,country:'KR'};
    }catch(_){}
  }
  return null;
 }
 let deepLinkFocused=false,deepLinkPending=false;
 function clearDeepLinkParams(){
  try{
    const u=new URL(location.href);
    ['liveReport','liveShopId','liveLat','liveLng','liveCountry','liveZoom'].forEach(k=>u.searchParams.delete(k));
    history.replaceState(history.state,'',u.pathname+(u.search?u.search:'')+u.hash);
  }catch(_){}
 }
 async function focusDeepLink(){
  if(deepLinkFocused||deepLinkPending)return;
  let q=new URLSearchParams(location.search);
  if(!q.has('liveReport')&&!q.has('liveShopId')&&!q.has('liveLat')){
    try{
      const saved=JSON.parse(localStorage.getItem('funypin_live_map_focus')||'null');
      if(saved&&Date.now()-Number(saved.at||0)<15000){
        q=new URLSearchParams();
        if(saved.reportId)q.set('liveReport',String(saved.reportId));
        if(saved.shopId)q.set('liveShopId',String(saved.shopId));
        if(saved.lat&&saved.lng){q.set('liveLat',String(saved.lat));q.set('liveLng',String(saved.lng))}
        if(saved.country)q.set('liveCountry',String(saved.country));
        q.set('liveZoom','max');
      }
      localStorage.removeItem('funypin_live_map_focus');
    }catch(_){}
  }
  if(!q.has('liveReport')&&!q.has('liveShopId')&&!q.has('liveLat'))return;
  deepLinkPending=true;
  clearDeepLinkParams();
  const target=await resolveDeepLinkTarget(q);
  if(!target){deepLinkPending=false;return}
  enabled=true;saveLayerPref();
  try{window.FUNY_MAP_SHEET?.setMode?.('quarter',false)}catch(_){}
  try{
    const currentCountry=window.FUNY_MAP_COUNTRY?.get?.();
    if(currentCountry!==target.country)window.FUNY_MAP_COUNTRY?.set?.(target.country);
  }catch(_){}
  let attempts=0;
  const apply=()=>{
    attempts++;
    const map=mapFor(target.country);
    if(!map){
      if(attempts<8)setTimeout(apply,180);
      else deepLinkPending=false;
      return;
    }
    try{
      if(target.country==='KR'){
        map.setCenter(new naver.maps.LatLng(target.lat,target.lng));
        map.setZoom(21);
      }else{
        map.setCenter({lat:target.lat,lng:target.lng});
        map.setZoom(21);
      }
      try{window.FUNY_MAP_SHEET?.setMode?.('quarter',false)}catch(_){}
      sync();
      deepLinkFocused=true;deepLinkPending=false;
      try{window.FUNY_TRACK?.('live_pin_map_focus',{report_id:target.reportId||'',shop_id:target.shopId||'',country:target.country,zoom:21})}catch(_){}
    }catch(_){
      if(attempts<8)setTimeout(apply,180);
      else deepLinkPending=false;
    }
  };
  setTimeout(apply,120);
 }
 document.addEventListener('click',e=>{const link=e.target?.closest?.('a.live-temp-open');if(!link||!window.ReactNativeWebView?.postMessage)return;e.preventDefault();e.stopPropagation();try{localStorage.setItem('funypin-live-focus-report',JSON.stringify({id:link.dataset.liveReport,at:Date.now()}))}catch(_){}window.ReactNativeWebView.postMessage(JSON.stringify({type:'OPEN_NATIVE',route:'/live-pin'}));},true);
 const style=document.createElement('style');style.textContent='.live-temp-pin{position:relative;width:var(--marker-w);height:var(--marker-h);filter:drop-shadow(0 3px 5px #0003);transform-origin:50% 100%}.live-temp-pin svg{position:absolute;left:50%;top:0;width:var(--pin-w);height:var(--pin-h);transform:translateX(-50%);overflow:visible}.live-temp-pin span{position:absolute;left:50%;top:39%;z-index:3;transform:translate(-50%,-50%);font-size:calc(var(--pin-w,33px) * .95);line-height:1;pointer-events:none}.live-temp-google{position:absolute;transform:translate(-50%,-100%);width:37px;height:51px;border:0;background:none;padding:0;z-index:125;cursor:pointer}.live-registered-bolt{position:absolute;left:50%;top:39%;z-index:3;transform:translate(-50%,-50%);font-size:calc(var(--pin-w,33px) * .95);line-height:1;pointer-events:none}.live-temp-popup .live-temp-card{position:relative;z-index:3;display:grid;grid-template-columns:minmax(0,1fr) 14px;align-items:center;gap:12px;width:294px;max-width:310px;min-height:96px;box-sizing:border-box;padding:11px 12px 11px 11px;border:1px solid rgba(228,224,234,.94);border-radius:20px;background:rgba(255,255,255,.97);-webkit-backdrop-filter:blur(22px) saturate(150%);backdrop-filter:blur(22px) saturate(150%);box-shadow:0 16px 38px rgba(39,32,52,.18),0 3px 10px rgba(39,32,52,.06),inset 0 1px 0 rgba(255,255,255,.98);overflow:hidden;text-align:left;color:#211e25;cursor:pointer;text-decoration:none;font-family:inherit}.live-temp-popup .live-temp-card.has-photo{grid-template-columns:74px minmax(0,1fr) 14px}.live-temp-popup .live-temp-title{display:flex;align-items:center;justify-content:flex-start;gap:4px;padding:0!important;text-indent:0!important;text-align:left!important;margin:0 0 7px;font-size:16px;font-weight:830;line-height:1.18;letter-spacing:-.025em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.live-temp-popup .live-temp-bolt{flex:0 0 auto;margin:0;padding:0}.live-temp-popup .live-temp-name{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.live-temp-popup .live-temp-body{padding:0!important;text-indent:0!important;text-align:left!important;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-clamp:2;max-height:2.8em;overflow:hidden;text-overflow:ellipsis;overflow-wrap:anywhere;white-space:normal;color:#77717c;font-size:10.8px;line-height:1.4}@media(max-width:430px){.live-temp-popup .live-temp-card{grid-template-columns:minmax(0,1fr) 12px;gap:10px;width:274px;max-width:292px;min-height:90px;padding:10px 11px 10px 10px;border-radius:18px}.live-temp-popup .live-temp-card.has-photo{grid-template-columns:68px minmax(0,1fr) 12px}.live-temp-popup .live-temp-title{font-size:15.5px;margin-bottom:6px}.live-temp-popup .live-temp-body{font-size:10.4px}}';document.head.appendChild(style);
 window.addEventListener('funy:mapdatachange',()=>{close();sync();focusDeepLink()});window.addEventListener('funy:googlemapready',()=>{sync();focusDeepLink()});
 let wiredNaver=null,wiredGoogle=null;
 setInterval(()=>{const b=time.bounds();if(b.day!==day){day=b.day;changed()}const c=country(),q=document.getElementById('map-shop-search')?.value||'';if(q!==lastSearch||c!==lastCountry){lastSearch=q;close()}sync();const metric=JSON.stringify(metrics());if(metric!==lastMetric){lastMetric=metric;markers.forEach(m=>{if(country()==='KR'){const v=metrics();m.setIcon?.({content:pin(),anchor:new naver.maps.Point(Math.round(v.markerW/2),v.markerH)})}})}const n=mapFor('KR'),g=mapFor('JP');if(n&&n!==wiredNaver){wiredNaver=n;naver.maps.Event.addListener(n,'click',close);naver.maps.Event.addListener(n,'zoom_changed',()=>{if(country()!=='KR')return;const v=metrics('KR');markers.forEach(m=>m.setIcon?.({content:pin('KR'),anchor:new naver.maps.Point(Math.round(v.markerW/2),v.markerH)}));lastMetric=JSON.stringify(v)})}if(g&&g!==wiredGoogle){wiredGoogle=g;g.addListener('click',close)}},1000);
 setInterval(pollRevision,5000);setInterval(()=>{if(!document.hidden)load()},30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden){changed();pollRevision()}});window.addEventListener('online',()=>{changed();pollRevision()});
 window.FUNY_LIVE_MAP={refresh:changed,getRows:()=>rows.slice(),hasRegisteredLive:registeredLive,getRegisteredIds:()=>enabled?[...registeredIds()]:[],metrics};load();pollRevision();realtime();focusDeepLink();
})();
