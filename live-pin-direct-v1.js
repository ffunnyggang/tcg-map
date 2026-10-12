/* Direct LIVE PIN locations. Registered shops/vending remain on the existing path. */
(function(){
 'use strict';
 const tr=(ko,en)=>{try{return localStorage.getItem('funy-pin-lang')==='en'?en:ko}catch(_){return ko}};
 const section=document.createElement('section');
 const type=document.getElementById('locationType'),shop=document.getElementById('shop'),label=document.getElementById('locationLabel');
 if(!type||!shop)return;
 type.add(new Option(tr('직접 위치 지정','Choose a location'),'direct'));
 section.id='liveDirectFields';section.hidden=true;
 section.innerHTML='<label class="label" for="liveDirectCountry">국가</label><select class="select" id="liveDirectCountry"><option value="KR">한국</option><option value="JP">일본</option></select><label class="label" for="liveDirectName">위치명</label><input class="memo" id="liveDirectName" maxlength="100" placeholder="예: 행사장 · 마트 카드 판매 코너"><label class="label">지도에서 위치 지정</label><p class="sub">지도를 터치해 핀을 선택해주세요. 현재 위치는 선택을 돕는 용도로만 사용합니다.</p><button type="button" class="select" id="liveDirectCurrent">현재 위치로 이동</button><div id="liveDirectMap" style="height:260px;border:1px solid #e4dfe8;border-radius:13px;margin-top:8px;overflow:hidden"></div><p class="sub" id="liveDirectCoord" role="status" style="margin-top:8px">위치를 선택해주세요.</p><p class="sub">직접 지정한 LIVE PIN은 매일 00시(한국시간)에 지도에서 사라집니다.</p>';
 if(tr('ko','en')==='en'){const copy={'지도에서 위치 지정':'Choose a point on the map','국가':'Country','한국':'South Korea','일본':'Japan','위치명':'Location name','예: 행사장 · 마트 카드 판매 코너':'e.g. Event venue · card sales counter','지도를 터치해 핀을 선택해주세요. 현재 위치는 선택을 돕는 용도로만 사용합니다.':'Tap the map to select a pin. Your current location only helps you find a point.','현재 위치로 이동':'Go to my location','위치를 선택해주세요.':'Select a location.','직접 지정한 LIVE PIN은 매일 00시(한국시간)에 지도에서 사라집니다.':'Temporary LIVE PIN markers disappear every day at 00:00 Korean time.'};for(const [ko,en] of Object.entries(copy))section.innerHTML=section.innerHTML.replaceAll(ko,en);}
 shop.after(section);
 const region=section.querySelector('#liveDirectCountry'),title=section.querySelector('#liveDirectName'),mapEl=section.querySelector('#liveDirectMap'),coordEl=section.querySelector('#liveDirectCoord'),current=section.querySelector('#liveDirectCurrent');
 let coordinate=null,map=null,pin=null,generation=0,activeCountry='';const scripts=new Map();

 function script(url){if(scripts.has(url))return scripts.get(url);const promise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=url;s.onload=resolve;s.onerror=()=>reject(new Error('지도 로딩 실패'));document.head.appendChild(s)});scripts.set(url,promise);promise.catch(()=>scripts.delete(url));return promise}
 function select(lat,lng){coordinate={lat:+Number(lat).toFixed(6),lng:+Number(lng).toFixed(6)};coordEl.textContent=coordinate.lat.toFixed(6)+', '+coordinate.lng.toFixed(6);if(region.value==='KR'){pin?.setMap(null);pin=new naver.maps.Marker({map,position:new naver.maps.LatLng(lat,lng)})}else{pin?.setMap(null);pin=new google.maps.Marker({map,position:{lat,lng}})}}
 async function initMap(){
  const g=++generation;coordinate=null;coordEl.textContent=tr('위치를 선택해주세요.','Select a location.');pin?.setMap(null);pin=null;map=null;mapEl.textContent=tr('지도를 불러오는 중...','Loading map...');current.disabled=true;
  try{
   if(region.value==='KR'){if(!window.naver?.maps?.Map)await script('https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=zi1ymjvxt9');if(g!==generation)return;mapEl.textContent='';map=new naver.maps.Map(mapEl,{center:new naver.maps.LatLng(37.5665,126.978),zoom:13});naver.maps.Event.addListener(map,'click',e=>select(e.coord.lat(),e.coord.lng()));}
   else{if(!window.google?.maps?.Map)await script('https://maps.googleapis.com/maps/api/js?key=AIzaSyDBSPRs1jnfePKN9ZvZuyUWvlreMeAXYmw&language=ja');if(g!==generation)return;mapEl.textContent='';map=new google.maps.Map(mapEl,{center:{lat:35.6762,lng:139.6503},zoom:13,streetViewControl:false,mapTypeControl:false,fullscreenControl:false,gestureHandling:'cooperative'});map.addListener('click',e=>{if(e.latLng)select(e.latLng.lat(),e.latLng.lng())});}
   activeCountry=region.value;current.disabled=false;
  }catch(e){if(g!==generation)return;mapEl.textContent=tr('지도를 불러오지 못했어요. 구분을 다시 선택해주세요.','Unable to load the map. Select the location type again.');activeCountry='';console.warn('[LIVE PIN direct map]',e);}
 }
 region.addEventListener('change',initMap);
 current.onclick=()=>{if(!map||!navigator.geolocation)return;const g=generation;current.disabled=true;navigator.geolocation.getCurrentPosition(p=>{if(g!==generation)return;const {latitude:lat,longitude:lng}=p.coords;current.disabled=false;if(!inRegion(region.value,lat,lng)){alert(tr('선택한 국가의 위치가 아닙니다. 국가를 확인해주세요.','Your location is outside the selected country.'));return}coordinate=null;pin?.setMap(null);pin=null;if(region.value==='KR')map.panTo(new naver.maps.LatLng(lat,lng));else map.panTo({lat,lng});coordEl.textContent=tr('지도를 터치해 위치를 확정해주세요.','Tap the map to confirm the location.');},()=>{if(g!==generation)return;current.disabled=false;alert(tr('현재 위치를 확인하지 못했어요. 지도에서 직접 선택해주세요.','Unable to locate you. Select a point on the map.'));},{enableHighAccuracy:true,timeout:12000,maximumAge:60000})};
 function inRegion(c,lat,lng){return c==='KR'?lat>=33&&lat<=39.8&&lng>=124&&lng<=132:lat>=24&&lat<=46&&lng>=122&&lng<=154}
 function show(direct){section.hidden=!direct;shop.hidden=direct;label.hidden=direct;if(direct){requestAnimationFrame(()=>{if(!map||activeCountry!==region.value)initMap();else if(region.value==='KR')naver.maps.Event.trigger(map,'resize');else google.maps.event.trigger(map,'resize')})}}
 function payload(){if(type.value!=='direct')return null;const n=title.value.trim();if(!n){title.focus();throw new Error(tr('위치명을 입력해주세요.','Enter a location name.'))}if(!coordinate)throw new Error(tr('지도에서 위치를 선택해주세요.','Select a location on the map.'));const {lat,lng}=coordinate,c=region.value;if(!inRegion(c,lat,lng))throw new Error(tr('선택한 국가 안의 위치를 지정해주세요.','Select a point within the selected country.'));return{location_type:'direct',country_code:c,latitude:lat,longitude:lng,shop_id:'LIVE-PIN:'+c+':'+lat.toFixed(5)+':'+lng.toFixed(5),shop_name:n}}
 function reset(){title.value='';coordinate=null;pin?.setMap(null);pin=null;coordEl.textContent=tr('위치를 선택해주세요.','Select a location.');}
 function setRequest(req){const option=[...type.options].find(o=>o.value==='direct');option.disabled=req;option.hidden=req;if(req&&type.value==='direct'){type.value='shop';type.dispatchEvent(new Event('change'))}}
 document.querySelectorAll('.mode button').forEach(b=>b.addEventListener('click',()=>setRequest(b.dataset.mode==='request')));
 window.FUNY_LIVE_DIRECT={show,payload,reset,setRequest};
})();
