/* FUNY PIN current-location control */
(function(){
  const ready=()=>window.naver&&naver.maps&&typeof naverMap!=='undefined'&&naverMap;
  let currentMarker=null;
  let accuracyCircle=null;
  let toastTimer=null;
  let watchId=null;
  let heading=null;
  let orientationBound=false;
  let firstFix=true;
  let lastLat=null,lastLng=null;
  const AVATARS=[['ponanyang','포나냥','assets/funymon/01-ponanyang.png'],['bubblelong','버블롱','assets/funymon/02-bubblelong.png'],['hatring','하트링','assets/funymon/03-hatring.png'],['bulgi','불기','assets/funymon/04-bulgi.png']];
  let avatarOn=false,avatarId='ponanyang';try{avatarOn=localStorage.getItem('funypin-location-avatar-on')==='1';avatarId=localStorage.getItem('funypin-location-avatar-id')||avatarId}catch(e){}

  function ensureControl(){
    const wrap=document.querySelector('.map-wrap-hero');
    if(!wrap||document.getElementById('map-location-btn')) return;
    const control=document.createElement('div');
    control.className='map-location-control';
    control.innerHTML=`<button id="map-location-avatar-btn" class="map-location-btn map-location-avatar-btn" type="button" aria-label="현재 위치 마커 설정" title="현재 위치 마커 설정"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 14.2 7.5 19 8.2 15.5 11.6 16.3 16.4 12 14.2 7.7 16.4 8.5 11.6 5 8.2 9.8 7.5Z"/></svg></button><button id="map-location-btn"` class="map-location-btn" type="button" aria-label="내 위치 보기" title="내 위치 보기"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7"/></svg></button>`;
    wrap.appendChild(control);
    control.querySelector('#map-location-btn').addEventListener('click',locateMe);control.querySelector('#map-location-avatar-btn').addEventListener('click',openAvatarSettings);
  }

  function markerContent(){const a=AVATARS.find(x=>x[0]===avatarId)||AVATARS[0];return '<div class="funy-current-location'+(avatarOn?' is-avatar':'')+'" aria-hidden="true"><span class="funy-current-heading"></span>'+(avatarOn?'<img class="funy-current-avatar" src="'+a[2]+'" alt="">':'')+'</div>'}
  function refreshMarkerStyle(){if(!currentMarker)return;currentMarker.setIcon({content:markerContent(),anchor:new naver.maps.Point(18,18)});if(Number.isFinite(heading))applyHeading(heading)}
  function closeAvatarSettings(){document.getElementById('map-location-avatar-sheet')?.remove()}
  function openAvatarSettings(){closeAvatarSettings();const panel=document.createElement('div');panel.id='map-location-avatar-sheet';panel.className='map-location-avatar-sheet';panel.innerHTML='<div class="map-location-avatar-card"><div class="map-location-avatar-head"><strong>내 위치 마커</strong><button type="button" data-avatar-close aria-label="닫기">×</button></div><label class="map-location-avatar-toggle"><span>픽셀 캐릭터 사용</span><input type="checkbox" '+(avatarOn?'checked':'')+'><i></i></label><div class="map-location-avatar-grid">'+AVATARS.map(a=>'<button type="button" data-avatar="'+a[0]+'" class="'+(avatarId===a[0]?'is-selected':'')+'"><img src="'+a[2]+'" alt=""><span>'+a[1]+'</span></button>').join('')+'</div></div>';document.body.appendChild(panel);panel.addEventListener('click',e=>{if(e.target===panel||e.target.closest('[data-avatar-close]')){closeAvatarSettings();return}const b=e.target.closest('[data-avatar]');if(b){avatarId=b.dataset.avatar;avatarOn=true;try{localStorage.setItem('funypin-location-avatar-id',avatarId);localStorage.setItem('funypin-location-avatar-on','1')}catch(_){}panel.querySelector('input').checked=true;panel.querySelectorAll('[data-avatar]').forEach(x=>x.classList.toggle('is-selected',x===b));refreshMarkerStyle()}});panel.querySelector('input').addEventListener('change',e=>{avatarOn=e.target.checked;try{localStorage.setItem('funypin-location-avatar-on',avatarOn?'1':'0')}catch(_){}refreshMarkerStyle()})}
  function showToast(message){
    const wrap=document.querySelector('.map-wrap-hero');
    if(!wrap) return;
    let toast=document.getElementById('map-location-toast');
    if(!toast){toast=document.createElement('div');toast.id='map-location-toast';toast.className='map-location-toast';wrap.appendChild(toast);}
    toast.textContent=message;toast.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toast.hidden=true},2600);
  }

  function closePermissionGuide(){
    const guide=document.getElementById('map-location-guide');
    if(guide)guide.remove();
    document.documentElement.classList.remove('funy-location-modal-open');
  }

  function deviceGuide(){
    const ua=navigator.userAgent||'';
    const isIOS=/iPad|iPhone|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
    const isAndroid=/Android/i.test(ua);
    const isSafari=isIOS&&/Safari/i.test(ua)&&!/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
    const isChrome=(isAndroid&&/Chrome/i.test(ua))||/CriOS/i.test(ua);
    if(isIOS&&isSafari)return{lead:'iPhone Safari에서 아래 순서로 허용해주세요.',steps:['주소창의 <b>페이지 메뉴</b>를 눌러주세요.','<b>웹사이트 설정 → 위치</b>를 선택해주세요.','<b>허용</b>으로 변경한 뒤 다시 시도해주세요.']};
    if(isIOS)return{lead:'iPhone 브라우저에서 위치 권한을 허용해주세요.',steps:['iPhone <b>설정 → 개인정보 보호 및 보안 → 위치 서비스</b>를 열어주세요.','사용 중인 <b>브라우저</b>의 위치 접근을 허용해주세요.','FUNY PIN으로 돌아와 다시 시도해주세요.']};
    if(isAndroid&&isChrome)return{lead:'Android Chrome에서 아래 순서로 허용해주세요.',steps:['주소창 왼쪽의 <b>사이트 정보</b>를 눌러주세요.','<b>권한 → 위치</b>를 선택해주세요.','<b>허용</b>으로 변경한 뒤 다시 시도해주세요.']};
    if(isAndroid)return{lead:'Android 브라우저에서 위치 권한을 허용해주세요.',steps:['브라우저의 <b>사이트 설정 또는 권한</b>을 열어주세요.','현재 사이트의 <b>위치 권한</b>을 허용해주세요.','FUNY PIN으로 돌아와 다시 시도해주세요.']};
    return{lead:'브라우저에서 위치 권한을 허용해주세요.',steps:['주소창의 <b>사이트 정보 또는 설정</b>을 열어주세요.','현재 사이트의 <b>위치 권한</b>을 허용해주세요.','페이지로 돌아와 다시 시도해주세요.']};
  }

  function showPermissionGuide(){
    closePermissionGuide();
    const info=deviceGuide();
    const guide=document.createElement('div');
    guide.id='map-location-guide';
    guide.className='map-location-guide';
    guide.setAttribute('role','dialog');
    guide.setAttribute('aria-modal','true');
    guide.setAttribute('aria-label','위치 권한 안내');
    guide.innerHTML=`<div class="map-location-guide-backdrop" data-location-guide-close></div><div class="map-location-guide-card"><button class="map-location-guide-close" type="button" aria-label="닫기" data-location-guide-close>×</button><div class="map-location-guide-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7"/></svg></div><strong>내 위치를 표시하려면<br>위치 권한이 필요해요</strong><p>${info.lead}</p><ol>${info.steps.map(step=>`<li>${step}</li>`).join('')}</ol><button class="map-location-guide-confirm" type="button" data-location-guide-close>확인</button></div>`;
    document.body.appendChild(guide);
    document.documentElement.classList.add('funy-location-modal-open');
    guide.addEventListener('click',e=>{if(e.target.closest('[data-location-guide-close]'))closePermissionGuide()});
  }

  function setLoading(loading){const btn=document.getElementById('map-location-btn');if(!btn)return;btn.classList.toggle('is-loading',loading);btn.disabled=loading;}

  function applyHeading(value){if(!Number.isFinite(value))return;heading=((value%360)+360)%360;const el=document.querySelector('.funy-current-location');if(el)el.style.setProperty('--funy-heading',heading+'deg')}

  function orientationHandler(e){const h=Number.isFinite(e.webkitCompassHeading)?e.webkitCompassHeading:(Number.isFinite(e.alpha)?360-e.alpha:null);if(Number.isFinite(h))applyHeading(h)}
  async function bindOrientation(){if(orientationBound)return;try{if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function'){const state=await DeviceOrientationEvent.requestPermission();if(state!=='granted')return}}catch(e){return}orientationBound=true;window.addEventListener('deviceorientationabsolute',orientationHandler,true);window.addEventListener('deviceorientation',orientationHandler,true)}
  function movementHeading(lat,lng){if(!Number.isFinite(lastLat)||!Number.isFinite(lastLng))return null;const p1=lastLat*Math.PI/180,p2=lat*Math.PI/180,dl=(lng-lastLng)*Math.PI/180,y=Math.sin(dl)*Math.cos(p2),x=Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl),d=Math.hypot(lat-lastLat,lng-lastLng);lastLat=lat;lastLng=lng;if(d<.000015)return null;return(Math.atan2(y,x)*180/Math.PI+360)%360}

  function updateLocation(lat,lng,accuracy,shouldCenter=false){
    if(!ready()) return;
    const pos=new naver.maps.LatLng(lat,lng);
    if(!currentMarker){currentMarker=new naver.maps.Marker({position:pos,map:naverMap,zIndex:900,title:'내 위치',icon:{content:markerContent(),anchor:new naver.maps.Point(18,18)}})}else{currentMarker.setPosition(pos);currentMarker.setMap(naverMap)}
    if(Number.isFinite(accuracy)&&accuracy>0){if(!accuracyCircle){accuracyCircle=new naver.maps.Circle({map:naverMap,center:pos,radius:accuracy,strokeColor:'#7057C7',strokeOpacity:.18,strokeWeight:1,fillColor:'#7057C7',fillOpacity:.06,clickable:false})}else{accuracyCircle.setCenter(pos);accuracyCircle.setRadius(accuracy);accuracyCircle.setMap(naverMap)}}
    if(Number.isFinite(heading))applyHeading(heading);if(shouldCenter){naverMap.setCenter(pos);try{if(naverMap.getZoom()<15)naverMap.setZoom(15)}catch(e){}}
    const btn=document.getElementById('map-location-btn');if(btn)btn.classList.add('is-active');
  }

  function errorMessage(error){if(!error)return'현재 위치를 확인하지 못했습니다.';if(error.code===1)return'위치 권한을 허용하면 내 위치를 표시할 수 있어요.';if(error.code===2)return'현재 위치 정보를 가져오지 못했습니다.';if(error.code===3)return'위치 확인 시간이 초과됐습니다. 다시 시도해주세요.';return'현재 위치를 확인하지 못했습니다.'}
  function emitLocationError(message,error){window.dispatchEvent(new CustomEvent('funy:locationerror',{detail:{message,error:error||null}}))}

  function locateMe(){
    closePermissionGuide();
    window.dispatchEvent(new CustomEvent('funy:locationrequest'));
    if(!navigator.geolocation){const message='이 브라우저에서는 위치 기능을 지원하지 않습니다.';showToast(message);emitLocationError(message);return}
    if(!ready()){const message='지도를 불러온 뒤 다시 시도해주세요.';showToast(message);emitLocationError(message);return}
    setLoading(true);bindOrientation();firstFix=true;lastLat=null;lastLng=null;if(watchId!==null){navigator.geolocation.clearWatch(watchId);watchId=null}watchId=navigator.geolocation.watchPosition(position=>{setLoading(false);const{latitude,longitude,accuracy,heading:geoHeading}=position.coords;const lat=Number(latitude),lng=Number(longitude),moveHeading=movementHeading(lat,lng);if(Number.isFinite(geoHeading)&&geoHeading>=0)applyHeading(geoHeading);else if(Number.isFinite(moveHeading))applyHeading(moveHeading);if(lastLat===null){lastLat=lat;lastLng=lng}const current={lat:Number(latitude),lng:Number(longitude),accuracy:Number(accuracy)||0,heading:Number.isFinite(heading)?heading:null,ts:Date.now()};window.FUNY_CURRENT_LOCATION=current;updateLocation(current.lat,current.lng,current.accuracy,firstFix);window.dispatchEvent(new CustomEvent('funy:locationchange',{detail:current}));if(firstFix){firstFix=false;showToast('현재 위치를 지도에 표시했습니다.')}} ,error=>{setLoading(false);const message=errorMessage(error);if(error&&error.code===1)showPermissionGuide();else showToast(message);emitLocationError(message,error)},{enableHighAccuracy:true,timeout:10000,maximumAge:3000});
  }

  let tries=0;const timer=setInterval(()=>{tries++;ensureControl();if(document.getElementById('map-location-btn')||tries>40)clearInterval(timer)},200);
})();
