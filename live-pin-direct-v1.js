/* Direct LIVE PIN locations. Registered shops/vending remain on the existing path. */
(function(){
 'use strict';
 const tr=(ko,en)=>{try{return localStorage.getItem('funy-pin-lang')==='en'?en:ko}catch(_){return ko}};
 const section=document.createElement('section');
 const type=document.getElementById('locationType'),shop=document.getElementById('shop'),label=document.getElementById('locationLabel');
 if(!type||!shop)return;
 type.add(new Option(tr('직접 위치 등록','Choose a location'),'direct'));
 section.id='liveDirectFields';section.hidden=true;
 section.innerHTML='<label class="label" for="liveDirectCountry">국가</label><select class="select" id="liveDirectCountry"><option value="KR">한국</option><option value="JP">일본</option></select><label class="label" for="liveDirectName">위치명</label><input class="memo" id="liveDirectName" maxlength="30" aria-describedby="liveDirectNameCount" placeholder="위치명 입력 (공백 포함 최대 30자)"><p class="sub" id="liveDirectNameCount" style="margin:5px 0 0;text-align:right" aria-live="polite">0 / 30</p><label class="label">지도에서 위치 지정</label><p class="sub">지도를 터치해 핀을 선택해주세요. 현재 위치는 선택을 돕는 용도로만 사용합니다.</p><button type="button" class="select" id="liveDirectCurrent">현재 위치로 이동</button><div id="liveDirectMap" style="height:260px;border:1px solid #e4dfe8;border-radius:13px;margin-top:8px;overflow:hidden"></div><p class="sub" id="liveDirectCoord" role="status" style="margin-top:8px">위치를 선택해주세요.</p><p class="sub">직접 지정한 LIVE PIN은 매일 00시(한국시간)에 지도에서 사라집니다.</p>';
 if(tr('ko','en')==='en'){const copy={'지도에서 위치 지정':'Choose a point on the map','국가':'Country','한국':'South Korea','일본':'Japan','위치명':'Location name','예: 행사장 · 마트 카드 판매 코너':'e.g. Event venue · card sales counter','지도를 터치해 핀을 선택해주세요. 현재 위치는 선택을 돕는 용도로만 사용합니다.':'Tap the map to select a pin. Your current location only helps you find a point.','현재 위치로 이동':'Go to my location','위치를 선택해주세요.':'Select a location.','직접 지정한 LIVE PIN은 매일 00시(한국시간)에 지도에서 사라집니다.':'Temporary LIVE PIN markers disappear every day at 00:00 Korean time.'};for(const [ko,en] of Object.entries(copy))section.innerHTML=section.innerHTML.replaceAll(ko,en);}
 shop.after(section);
 const region=section.querySelector('#liveDirectCountry'),title=section.querySelector('#liveDirectName'),mapEl=section.querySelector('#liveDirectMap'),coordEl=section.querySelector('#liveDirectCoord'),current=section.querySelector('#liveDirectCurrent');
 title.placeholder=tr('위치명 입력 (공백 포함 최대 30자)','Location name (max 30 characters)');
 const nameCount=section.querySelector('#liveDirectNameCount');const updateNameCount=()=>{nameCount.textContent=title.value.length+' / 30'};title.addEventListener('input',updateNameCount);updateNameCount();
 let coordinate=null,map=null,pin=null,currentPin=null,currentAccuracy=null,generation=0,activeCountry='',requestMode=false;const scripts=new Map();

 function script(url){if(scripts.has(url))return scripts.get(url);const promise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=url;s.onload=resolve;s.onerror=()=>reject(new Error('지도 로딩 실패'));document.head.appendChild(s)});scripts.set(url,promise);promise.catch(()=>scripts.delete(url));return promise}
 function select(lat,lng){
   coordinate={lat:+Number(lat).toFixed(6),lng:+Number(lng).toFixed(6)};
   coordEl.textContent=coordinate.lat.toFixed(6)+', '+coordinate.lng.toFixed(6);
   if(region.value==='KR'){
     const pos=new naver.maps.LatLng(coordinate.lat,coordinate.lng);
     if(!pin){
       pin=new naver.maps.Marker({map,position:pos,zIndex:220,title:tr('선택한 위치','Selected location'),icon:{content:'<div style="width:22px;height:22px;border:4px solid #fff;border-radius:50% 50% 50% 0;background:#8062d8;box-shadow:0 2px 10px rgba(57,39,99,.38);transform:rotate(-45deg)"><span style="display:block;width:6px;height:6px;margin:4px;border-radius:50%;background:#fff"></span></div>',anchor:new naver.maps.Point(11,20)}});
     }else{
       pin.setPosition(pos);pin.setMap(map);
     }
   }else{
     const pos={lat:coordinate.lat,lng:coordinate.lng};
     if(!pin){
       pin=new google.maps.Marker({map,position:pos,zIndex:220,title:tr('선택한 위치','Selected location'),icon:{path:'M 0,-10 C -5,-10 -9,-6 -9,-1 C -9,5 0,13 0,13 C 0,13 9,5 9,-1 C 9,-6 5,-10 0,-10 Z',fillColor:'#8062d8',fillOpacity:1,strokeColor:'#ffffff',strokeWeight:3,scale:1.2,anchor:new google.maps.Point(0,12)}});
     }else{
       pin.setPosition(pos);pin.setMap(map);
     }
   }
 }
 function clearCurrentLocation(){try{currentPin?.setMap(null)}catch(_){}try{currentAccuracy?.setMap(null)}catch(_){}currentPin=null;currentAccuracy=null}
 function showCurrentLocation(lat,lng,accuracy){
   clearCurrentLocation();
   if(region.value==='KR'){
     const pos=new naver.maps.LatLng(lat,lng);
     currentAccuracy=new naver.maps.Circle({map,center:pos,radius:Math.max(10,Number(accuracy)||20),strokeColor:'#7057C7',strokeOpacity:.22,strokeWeight:1,fillColor:'#7057C7',fillOpacity:.08,clickable:false,zIndex:80});
     currentPin=new naver.maps.Marker({map,position:pos,zIndex:130,title:tr('현재 위치','Current location'),icon:{content:'<div style="width:18px;height:18px;border:4px solid #fff;border-radius:50%;background:#7057C7;box-shadow:0 1px 8px rgba(73,52,123,.35)"></div>',anchor:new naver.maps.Point(9,9)}});
   }else{
     currentAccuracy=new google.maps.Circle({map,center:{lat,lng},radius:Math.max(10,Number(accuracy)||20),strokeColor:'#7057C7',strokeOpacity:.22,strokeWeight:1,fillColor:'#7057C7',fillOpacity:.08,clickable:false,zIndex:80});
     currentPin=new google.maps.Marker({map,position:{lat,lng},zIndex:130,title:tr('현재 위치','Current location'),icon:{path:google.maps.SymbolPath.CIRCLE,scale:7,fillColor:'#7057C7',fillOpacity:1,strokeColor:'#ffffff',strokeWeight:4}});
   }
 }
 async function initMap(){
  const g=++generation;coordinate=null;coordEl.textContent=tr('위치를 선택해주세요.','Select a location.');pin?.setMap(null);pin=null;clearCurrentLocation();map=null;mapEl.textContent=tr('지도를 불러오는 중...','Loading map...');current.disabled=true;
  try{
   if(region.value==='KR'){if(!window.naver?.maps?.Map)await script('https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=zi1ymjvxt9');if(g!==generation)return;mapEl.textContent='';map=new naver.maps.Map(mapEl,{center:new naver.maps.LatLng(37.5665,126.978),zoom:13});naver.maps.Event.addListener(map,'click',e=>select(e.coord.lat(),e.coord.lng()));naver.maps.Event.addListener(map,'longtap',e=>select(e.coord.lat(),e.coord.lng()));naver.maps.Event.addListener(map,'idle',()=>{if(coordinate&&pin){pin.setPosition(new naver.maps.LatLng(coordinate.lat,coordinate.lng));pin.setMap(map)}if(currentPin)currentPin.setMap(map);if(currentAccuracy)currentAccuracy.setMap(map)});}
   else{if(!window.google?.maps?.Map)await script('https://maps.googleapis.com/maps/api/js?key=AIzaSyDBSPRs1jnfePKN9ZvZuyUWvlreMeAXYmw&language=ja');if(g!==generation)return;mapEl.textContent='';map=new google.maps.Map(mapEl,{center:{lat:35.6762,lng:139.6503},zoom:13,streetViewControl:false,mapTypeControl:false,fullscreenControl:false,gestureHandling:'cooperative'});map.addListener('click',e=>{if(e.latLng)select(e.latLng.lat(),e.latLng.lng())});let holdTimer=null,holdLatLng=null;map.addListener('mousedown',e=>{holdLatLng=e.latLng;clearTimeout(holdTimer);holdTimer=setTimeout(()=>{if(holdLatLng)select(holdLatLng.lat(),holdLatLng.lng())},650)});['mouseup','drag','dragstart'].forEach(name=>map.addListener(name,()=>{clearTimeout(holdTimer);holdTimer=null;holdLatLng=null}));map.addListener('idle',()=>{if(coordinate&&pin){pin.setPosition({lat:coordinate.lat,lng:coordinate.lng});pin.setMap(map)}if(currentPin)currentPin.setMap(map);if(currentAccuracy)currentAccuracy.setMap(map)});}
   activeCountry=region.value;current.disabled=false;
  }catch(e){if(g!==generation)return;mapEl.textContent=tr('지도를 불러오지 못했어요. 구분을 다시 선택해주세요.','Unable to load the map. Select the location type again.');activeCountry='';console.warn('[LIVE PIN direct map]',e);}
 }
 region.addEventListener('change',initMap);
 current.onclick=()=>{if(!map||!navigator.geolocation){showLocationPermissionGuide(tr('이 브라우저에서는 위치 기능을 지원하지 않습니다.','Location is not supported in this browser.'));return}const g=generation,requestedAt=Date.now();current.disabled=true;coordEl.textContent=tr('현재 위치를 확인하는 중...','Finding your current location...');
 const fail=err=>{if(g!==generation)return;current.disabled=false;if(err&&Number(err.code)===1)showLocationPermissionGuide();else alert(tr('현재 위치를 확인하지 못했어요. 지도에서 직접 선택해주세요.','Unable to locate you. Select a point on the map.'));};
 const apply=p=>{if(g!==generation)return;const stamp=Number(p?.timestamp)||Date.now(),age=Date.now()-stamp;if(age>10000){navigator.geolocation.getCurrentPosition(apply,fail,{enableHighAccuracy:true,timeout:15000,maximumAge:0});return}const {latitude:lat,longitude:lng,accuracy}=p.coords||{};if(!Number.isFinite(Number(lat))||!Number.isFinite(Number(lng))){fail({code:2});return}current.disabled=false;if(!inRegion(region.value,Number(lat),Number(lng))){alert(tr('선택한 국가의 위치가 아닙니다. 국가를 확인해주세요.','Your location is outside the selected country.'));return}showCurrentLocation(Number(lat),Number(lng),accuracy);if(region.value==='KR'){map.setCenter(new naver.maps.LatLng(Number(lat),Number(lng)));try{if(map.getZoom()<16)map.setZoom(16)}catch(_){}}else{map.setCenter({lat:Number(lat),lng:Number(lng)});map.setZoom(Math.max(map.getZoom()||13,16))}coordEl.textContent=tr('현재 위치를 표시했습니다. 원하는 위치를 탭하거나 길게 눌러 선택해주세요.','Your current location is shown. Tap or long-press the map to choose a point.');};
 navigator.geolocation.getCurrentPosition(apply,fail,{enableHighAccuracy:true,timeout:15000,maximumAge:0});
 setTimeout(()=>{if(g===generation&&current.disabled&&Date.now()-requestedAt>16000){current.disabled=false}},16500);
};
 function showLocationPermissionGuide(custom){
   document.getElementById('liveDirectPermissionGuide')?.remove();
   const ua=navigator.userAgent||'',ios=/iPad|iPhone|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1),android=/Android/i.test(ua);
   const lead=custom||tr('현재 위치를 사용하려면 위치 권한이 필요해요.','Location permission is required to use your current location.');
   const steps=ios?[tr('iPhone 설정 → 개인정보 보호 및 보안 → 위치 서비스를 확인해주세요.','Check iPhone Settings → Privacy & Security → Location Services.'),tr('사용 중인 브라우저 또는 FUNY PIN의 위치 접근을 허용해주세요.','Allow location access for your browser or FUNY PIN.'),tr('FUNY PIN으로 돌아와 다시 시도해주세요.','Return to FUNY PIN and try again.')]:android?[tr('브라우저 또는 FUNY PIN의 앱 권한에서 위치를 허용해주세요.','Allow Location in your browser or FUNY PIN app permissions.'),tr('사이트 권한이 차단되어 있다면 위치 권한을 허용으로 변경해주세요.','If site permission is blocked, change Location to Allow.'),tr('FUNY PIN으로 돌아와 다시 시도해주세요.','Return to FUNY PIN and try again.')]:[tr('브라우저 주소창의 사이트 설정에서 위치 권한을 허용해주세요.','Allow Location in your browser site settings.'),tr('권한 변경 후 다시 시도해주세요.','Try again after changing the permission.')];
   const wrap=document.createElement('div');wrap.id='liveDirectPermissionGuide';wrap.style.cssText='position:fixed;inset:0;z-index:2147483647;background:rgba(25,20,30,.42);display:flex;align-items:flex-end;justify-content:center;pointer-events:auto';
   wrap.innerHTML='<div style="width:min(100%,420px);background:#fff;border-radius:22px 22px 0 0;padding:20px 18px max(24px,env(safe-area-inset-bottom));box-shadow:0 -10px 36px rgba(0,0,0,.12)"><div style="font-size:17px;font-weight:850">'+tr('위치 권한 안내','Location Permission')+'</div><p style="margin:8px 0 12px;color:#756e7b;font-size:12px;line-height:1.55">'+lead+'</p><ol style="margin:0 0 16px;padding-left:20px;color:#6c6571;font-size:11px;line-height:1.7">'+steps.map(x=>'<li>'+x+'</li>').join('')+'</ol><button type="button" style="width:100%;height:46px;border:0;border-radius:13px;background:#28232e;color:#fff;font-weight:850">'+tr('확인','OK')+'</button></div>';
   document.body.appendChild(wrap);wrap.addEventListener('click',e=>{if(e.target===wrap||e.target.closest('button'))wrap.remove()});
 }
 function inRegion(c,lat,lng){return c==='KR'?lat>=33&&lat<=39.8&&lng>=124&&lng<=132:lat>=24&&lat<=46&&lng>=122&&lng<=154}
 function show(direct){section.hidden=!direct;shop.hidden=direct;label.hidden=direct;label.style.display=direct?'none':'';if(direct){requestAnimationFrame(()=>{if(!map||activeCountry!==region.value)initMap();else if(region.value==='KR')naver.maps.Event.trigger(map,'resize');else google.maps.event.trigger(map,'resize')})}}
 function payload(){if(type.value!=='direct')return null;const n=title.value.trim();if(title.value.length>30){title.focus();throw new Error(tr('위치명은 공백 포함 30자 이내로 입력해주세요.','Use no more than 30 characters, including spaces.'))}if(!n){title.focus();throw new Error(tr('위치명을 입력해주세요.','Enter a location name.'))}if(!coordinate)throw new Error(tr('지도에서 위치를 선택해주세요.','Select a location on the map.'));const {lat,lng}=coordinate,c=region.value;if(!inRegion(c,lat,lng))throw new Error(tr('선택한 국가 안의 위치를 지정해주세요.','Select a point within the selected country.'));return{location_type:'direct',country_code:c,latitude:lat,longitude:lng,shop_id:'LIVE-PIN:'+c+':'+lat.toFixed(5)+':'+lng.toFixed(5),shop_name:n}}
 function reset(){title.value='';updateNameCount();coordinate=null;pin?.setMap(null);pin=null;clearCurrentLocation();coordEl.textContent=tr('위치를 선택해주세요.','Select a location.');}
 function setRequest(req){requestMode=req;const previous=type.value,index=[...type.options].findIndex(o=>o.value==='direct');if(req){if(index>=0)type.remove(index);if(previous==='direct'){type.value='shop';type.dispatchEvent(new Event('change'))}}else if(index<0){type.add(new Option(tr('직접 위치 등록','Choose a location'),'direct'))}}

 shop.addEventListener('change',()=>{if(shop.value==='KR-OTHER'&&!requestMode){type.value='direct';type.dispatchEvent(new Event('change'))}});
 document.querySelectorAll('.mode button').forEach(b=>b.addEventListener('click',()=>setRequest(b.dataset.mode==='request')));
 function memoPlaceholder(kind){return kind==='request'?tr('공백 포함 최대 60자 · 궁금한 내용을 입력해주세요','Max 60 characters including spaces · What would you like to know?'):kind==='reply'?tr('공백 포함 최대 60자 · 요청에 대한 현장 정보','Max 60 characters including spaces · Share an on-site update'):tr('공백 포함 최대 60자 · 현장 상황을 입력해주세요','Max 60 characters including spaces · Describe the current situation')}
 const memoInput=document.getElementById('memo');if(memoInput)memoInput.placeholder=memoPlaceholder('report');const photoLabel=document.querySelector?.('.upload b');if(photoLabel)photoLabel.textContent=tr('사진 추가하기 (최대 1장)','Add photo (max 1 image)');
 window.FUNY_LIVE_DIRECT={show,payload,reset,setRequest,memoPlaceholder};
})();
