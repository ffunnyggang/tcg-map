/* FUNY PIN map visit mode. Reuses existing server eligibility and mission trigger. */
(function(){
 'use strict';
 if(window.__FUNY_MAP_VISIT)return;window.__FUNY_MAP_VISIT=true;
 const RADIUS=50,SEARCH_RADIUS=500,MAX_ACCURACY=50,MAX_AGE=30000;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const en=()=>localStorage.getItem('funy-pin-lang')==='en';
 const text=(ko,eng)=>en()?eng:ko;
 const country=()=>window.FUNY_MAP_COUNTRY?.get?.()|| (document.body.classList.contains('country-japan')?'JP':'KR');
 const map=()=>window.FUNY_NAVER_MAP_API?.getMap?.();
 const today=()=>new Date(Date.now()+9*3600000).toISOString().slice(0,10);
 let control,notice,overlay=null,epoch=0,active=false,busy=false,checking=false,watch=null,fix=null,shops=[],done=new Set(),day=today(),owner=null,handles=[],boundMap=null,expiryTimer=null;
 const distance=(p,s)=>{const rad=Math.PI/180,a=p.lat*rad,b=Number(s.latitude)*rad,dl=(Number(s.longitude)-p.lng)*rad,dp=b-a;return 6371000*2*Math.asin(Math.sqrt(Math.min(1,Math.sin(dp/2)**2+Math.cos(a)*Math.cos(b)*Math.sin(dl/2)**2)));};
 const valid=p=>p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Number.isFinite(p.accuracy)&&p.accuracy>=0&&p.accuracy<=MAX_ACCURACY&&Date.now()-p.ts<=MAX_AGE;
 const maxZoom=()=>{const value=Number(map()?.getOptions?.('maxZoom'));return Number.isFinite(value)&&value>0?value:19;};
 const maximum=()=>!!map()&&map().getZoom()>=maxZoom()-5-.01;
 const searchable=p=>p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Number.isFinite(p.accuracy)&&p.accuracy>=0&&Date.now()-p.ts<=MAX_AGE;
 const available=()=>searchable(fix)?shops.filter(s=>!done.has(s.id)&&distance(fix,s)<=SEARCH_RADIUS).sort((a,b)=>distance(fix,a)-distance(fix,b)):[];
 function placeNotice(){if(!notice)return;notice.style.removeProperty('top');notice.style.removeProperty('left');}
 function tell(message){if(!notice)return;notice.textContent=message;notice.hidden=false;placeNotice();}
 function syncControl(){if(!control)return;control.hidden=country()!=='KR';const mon=document.getElementById('funymonFindControl');control.classList.toggle('has-funymon',!!mon&&getComputedStyle(mon).display!=='none');control.querySelector('.visit-label').textContent=busy?text('위치 확인 중…','Locating…'):text('방문 인증','Check in');control.querySelector('.visit-start').disabled=busy;control.querySelector('.visit-start').setAttribute('aria-pressed',String(active));control.querySelector('.visit-exit').hidden=!active;placeNotice();}
 function detach(){if(overlay){overlay.setMap(null);overlay=null;}}
 function stop(){epoch++;active=false;busy=false;fix=null;shops=[];detach();if(watch!==null){navigator.geolocation?.clearWatch(watch);watch=null;}clearInterval(expiryTimer);expiryTimer=null;if(notice)notice.hidden=true;syncControl();}
 function position(){return new Promise((resolve,reject)=>{if(!navigator.geolocation){reject(Error(text('위치 기능을 사용할 수 없어요.','Location is unavailable.')));return;}navigator.geolocation.getCurrentPosition(p=>resolve({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy,ts:p.timestamp||Date.now()}),e=>reject(Error(e.code===1?text('기기 설정에서 위치 권한을 허용해주세요.','Allow location access in device settings.'):text('현재 위치를 확인하지 못했어요. 다시 시도해주세요.','Could not locate you. Please try again.'))),{enableHighAccuracy:true,maximumAge:0,timeout:15000});});}
 function buttons(){
  if(!active||country()!=='KR'||document.hidden||!maximum()||!searchable(fix)||today()!==day){detach();return;}
  const rows=available();if(!rows.length){detach();return;}
  if(overlay&&overlay.signature===rows.map(s=>s.id).join('|')){overlay.draw();return;}
  detach();const nm=window.naver?.maps;if(!nm?.OverlayView)return;
  class VisitOverlay extends nm.OverlayView{
   constructor(){super();this.signature=rows.map(s=>s.id).join('|');this.nodes=rows.map(shop=>{const el=document.createElement('div');el.className='visit-map-label';el.innerHTML='<span class="visit-leader" aria-hidden="true"></span><button type="button" data-visit-shop="'+esc(shop.id)+'"><small>'+esc(shop.name)+'</small><b>'+text('방문 인증하기','Check in here')+'</b></button>';const button=el.querySelector('button');['pointerdown','mousedown','touchstart','dblclick'].forEach(type=>el.addEventListener(type,e=>e.stopPropagation()));button.onclick=e=>{e.preventDefault();e.stopPropagation();certify(shop);};return{shop,el,button};});this.setMap(map());}
   onAdd(){this.nodes.forEach(n=>this.getPanes().floatPane.appendChild(n.el));}
   draw(){if(!this.getMap())return;const boxes=[];this.nodes.forEach(n=>{const p=this.getProjection().fromCoordToOffset(new nm.LatLng(Number(n.shop.latitude),Number(n.shop.longitude)));let bottom=p.y-52;for(let i=0;i<rows.length;i++){if(!boxes.some(b=>Math.abs(p.x-b.x)<170&&Math.abs(bottom-b.y)<68))break;bottom-=68;}boxes.push({x:p.x,y:bottom});n.el.style.left=p.x+'px';n.el.style.top=bottom+'px';n.el.style.setProperty('--visit-leader-height',(p.y-bottom-8)+'px');const eligible=valid(fix)&&distance(fix,n.shop)<=RADIUS;n.button.disabled=checking||!eligible;n.button.querySelector('b').textContent=eligible?text('방문 인증하기','Check in here'):!valid(fix)?text('GPS 오차 50m 이하 필요','GPS accuracy ≤50 m required'):text('50m 안으로 이동해주세요','Move within 50 m');});}
   onRemove(){this.nodes.forEach(n=>n.el.remove());}
  }
  overlay=new VisitOverlay();
 }
 function bindMap(){const m=map();if(!m||m===boundMap)return;handles.forEach(h=>window.naver?.maps?.Event.removeListener(h));handles=[];boundMap=m;['zoom_changed','idle'].forEach(name=>handles.push(naver.maps.Event.addListener(m,name,()=>{buttons();if(active&&!maximum())tell(text('최대 확대에서 5단계 이내로 확대하면 인증 버튼이 보여요.','Zoom to within 5 levels of maximum to see check-in buttons.'));else if(active&&searchable(fix)&&available().length)tell(text('500m 이내 매장을 찾았어요. 50m 이내·GPS 오차 50m 이하에서 인증할 수 있어요.','Shops within 500 m. Check in within 50 m with GPS accuracy ≤50 m.'));})));}
 async function start(){
  if(busy||checking)return;if(country()!=='KR')return;
  stop();const ticket=epoch;busy=true;syncControl();tell(text('위치와 주변 카드샵을 확인하고 있어요.','Checking your location and nearby shops.'));
  const live=()=>ticket===epoch&&country()==='KR'&&!document.hidden;
  try{
   if(!map()||!window.naver?.maps)throw Error(text('지도를 불러온 뒤 다시 눌러주세요.','Please wait for the map to load.'));
   const auth=window.FUNY_WEB_AUTH;await auth?.init();if(!live())return;
   if(!auth?.session){auth?.goLogin('/shops.html?visit=1');return;}
   owner=auth.session.user.id;
   const gate=await auth.client.rpc('is_my_feature_tester');if(gate.error)throw gate.error;if(!gate.data)throw Error(text('방문 인증은 현재 준비 중이에요.','Check-in is not available for your account yet.'));
   const p=await position();if(!live())return;if(!searchable(p))throw Error(text('위치를 다시 확인해주세요.','Please refresh your location.'));
   day=today();
   const [near,visits]=await Promise.all([auth.client.from('shops').select('id,name,latitude,longitude').eq('is_active',true).like('id','KR-%').gte('latitude',p.lat-.005).lte('latitude',p.lat+.005).gte('longitude',p.lng-.007).lte('longitude',p.lng+.007),auth.client.from('shop_visit_checkins').select('shop_id').eq('user_id',owner).eq('visit_date_kst',day)]);
   if(near.error)throw near.error;if(visits.error)throw visits.error;if(!live())return;
   fix=p;shops=(near.data||[]).filter(s=>Number.isFinite(Number(s.latitude))&&Number.isFinite(Number(s.longitude)));done=new Set((visits.data||[]).map(s=>s.shop_id));const rows=available();
   if(!rows.length){tell(shops.some(s=>distance(p,s)<=SEARCH_RADIUS)?text('가까운 매장은 오늘 이미 인증했어요.','Nearby shops have already been checked in today.'):text('반경 500m 안에 방문 인증 대상 카드샵이 없어요.','No eligible card shops within 500 m.'));return;}
   active=true;bindMap();window.FUNY_MAP_POPUP?.clear?.();window.FUNY_MAP_SHEET?.collapse?.();
   await new Promise(r=>setTimeout(r,360));if(!live())return;
   const nearest=rows[0];map().setCenter(new naver.maps.LatLng(Number(nearest.latitude),Number(nearest.longitude)));map().setZoom(maxZoom());buttons();tell(text('500m 이내 매장을 찾았어요. 50m 이내·GPS 오차 50m 이하에서 인증할 수 있어요.','Shops within 500 m. Check in within 50 m with GPS accuracy ≤50 m.'));
   watch=navigator.geolocation.watchPosition(p=>{if(!live()||!active)return;fix={lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy,ts:p.timestamp||Date.now()};buttons();if(!valid(fix))tell(text('GPS 정확도가 낮아요. 위치를 다시 확인하고 있어요.','Waiting for a more accurate location.'));},()=>{fix=null;buttons();tell(text('위치를 확인할 수 없어요. 방문 인증을 다시 눌러주세요.','Location unavailable. Tap Check in to retry.'));},{enableHighAccuracy:true,maximumAge:3000,timeout:15000});
   expiryTimer=setInterval(()=>{if(active){buttons();if(today()!==day){stop();tell(text('날짜가 바뀌었어요. 방문 인증을 다시 눌러주세요.','A new day has started. Tap Check in again.'));}}},5000);
  }catch(e){if(live())tell(e.message||text('방문 인증을 준비하지 못했어요. 다시 시도해주세요.','Could not prepare check-in. Please retry.'));}finally{if(ticket===epoch){busy=false;syncControl();}}
 }
 async function certify(shop){
  if(checking||!active||!maximum()||country()!=='KR')return;
  checking=true;const ticket=epoch;buttons();
  try{
   const auth=window.FUNY_WEB_AUTH;if(auth?.session?.user?.id!==owner)throw Error(text('로그인 상태를 다시 확인해주세요.','Please sign in again.'));
   const p=await position();if(ticket!==epoch||!active||!maximum()||country()!=='KR'||document.hidden)return;
   fix=p;if(!valid(p))throw Error(text('GPS 오차가 50m 이하일 때 인증할 수 있어요.','GPS accuracy is low. Please retry.'));
   if(distance(p,shop)>RADIUS)throw Error(text('매장 반경 50m 안에서 인증해주세요.','Check in within 50 m of the shop.'));
   const {data,error}=await auth.client.rpc('my_shop_visit_checkin_test',{p_shop_id:shop.id,p_lat:p.lat,p_lng:p.lng,p_accuracy:p.accuracy});if(error)throw error;
   if(!data?.ok){const messages={too_far:text('매장과 너무 멀리 떨어져 있어요.','You are too far from the shop.'),low_accuracy:text('GPS 오차가 50m 이하일 때 인증할 수 있어요.','GPS accuracy is too low.'),test_access_denied:text('방문 인증은 현재 준비 중이에요.','Check-in is not available yet.'),login_required:text('로그인 후 인증해주세요.','Please sign in first.')};throw Error(messages[data?.error]||text('인증하지 못했어요. 다시 시도해주세요.','Check-in failed. Please retry.'));}
   if(ticket!==epoch)return;done.add(shop.id);buttons();tell(data.new?text(shop.name+' 방문 인증 완료! 미션에 반영했어요.','Checked in at '+shop.name+'! Your mission has been updated.'):text('오늘 이미 인증한 매장이에요.','Already checked in here today.'));
   window.dispatchEvent(new CustomEvent('funy:shopvisitcompleted',{detail:{shopId:shop.id,isNew:!!data.new}}));try{window.FUNY_TRACK?.('shop_visit_checkin',{shop_id:shop.id,is_new:!!data.new,source:'map'});}catch(_){}
  }catch(e){if(ticket===epoch)tell(e.message||text('방문 인증에 실패했어요. 다시 시도해주세요.','Check-in failed. Please retry.'));}finally{checking=false;buttons();}
 }
 function mount(){const wrap=document.querySelector('.map-wrap-hero');if(!wrap||control)return;control=document.createElement('div');control.id='mapVisitControl';control.className='map-visit-control';control.innerHTML='<button type="button" class="visit-start" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><path d="m8 10 3 3 5-5"/></svg><span class="visit-label">'+text('방문 인증','Check in')+'</span></button><button type="button" class="visit-exit" hidden aria-label="방문 인증 모드 종료">×</button>';wrap.appendChild(control);notice=document.createElement('div');notice.className='map-visit-notice';notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');notice.hidden=true;wrap.appendChild(notice);new MutationObserver(syncControl).observe(wrap,{childList:true});control.addEventListener('transitionend',placeNotice);window.addEventListener('resize',placeNotice);control.querySelector('.visit-start').onclick=start;control.querySelector('.visit-exit').onclick=stop;syncControl();bindMap();if(new URLSearchParams(location.search).get('visit')==='1')tell(text('방문 인증 버튼을 눌러 주변 카드샵을 확인해보세요.','Tap Check in to find nearby card shops.'));}
 const setup=setInterval(()=>{mount();bindMap();syncControl();if(control&&map())clearInterval(setup);},250);setTimeout(()=>clearInterval(setup),15000);
 new MutationObserver(()=>{mount();syncControl();if(country()!=='KR'&&(active||busy))stop();}).observe(document.body,{attributes:true,attributeFilter:['class'],childList:true,subtree:false});
 window.addEventListener('funy:mapdatachange',()=>{mount();bindMap();syncControl();if(country()!=='KR')stop();});
 window.addEventListener('funy:sheetchange',syncControl);window.addEventListener('pagehide',stop);window.addEventListener('hashchange',()=>{if(/^#\/shop\//.test(location.hash))stop();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
 window.FUNY_WEB_AUTH?.onChange(()=>{if(owner&&window.FUNY_WEB_AUTH.session?.user?.id!==owner)stop();});
 window.FUNY_MAP_VISIT={start,stop};mount();
})();
