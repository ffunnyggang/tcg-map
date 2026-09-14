/* FUNY PIN current-location control */
(function(){
  const ready=()=>window.naver&&naver.maps&&typeof naverMap!=='undefined'&&naverMap;
  let currentMarker=null;
  let accuracyCircle=null;
  let toastTimer=null;

  function ensureControl(){
    const wrap=document.querySelector('.map-wrap-hero');
    if(!wrap||document.getElementById('map-location-btn')) return;
    const control=document.createElement('div');
    control.className='map-location-control';
    control.innerHTML=`<button id="map-location-btn" class="map-location-btn" type="button" aria-label="내 위치 보기" title="내 위치 보기"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7"/></svg></button>`;
    wrap.appendChild(control);
    control.querySelector('button').addEventListener('click',locateMe);
  }

  function showToast(message){
    const wrap=document.querySelector('.map-wrap-hero');
    if(!wrap) return;
    let toast=document.getElementById('map-location-toast');
    if(!toast){
      toast=document.createElement('div');
      toast.id='map-location-toast';
      toast.className='map-location-toast';
      wrap.appendChild(toast);
    }
    toast.textContent=message;
    toast.hidden=false;
    clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>{toast.hidden=true},2600);
  }

  function setLoading(loading){
    const btn=document.getElementById('map-location-btn');
    if(!btn) return;
    btn.classList.toggle('is-loading',loading);
    btn.disabled=loading;
  }

  function updateLocation(lat,lng,accuracy){
    if(!ready()) return;
    const pos=new naver.maps.LatLng(lat,lng);
    if(!currentMarker){
      currentMarker=new naver.maps.Marker({
        position:pos,
        map:naverMap,
        zIndex:900,
        title:'내 위치',
        icon:{content:'<div class="funy-current-location" aria-hidden="true"></div>',anchor:new naver.maps.Point(13,13)}
      });
    }else{
      currentMarker.setPosition(pos);
      currentMarker.setMap(naverMap);
    }

    if(Number.isFinite(accuracy)&&accuracy>0){
      if(!accuracyCircle){
        accuracyCircle=new naver.maps.Circle({
          map:naverMap,
          center:pos,
          radius:accuracy,
          strokeColor:'#4285F4',
          strokeOpacity:.18,
          strokeWeight:1,
          fillColor:'#4285F4',
          fillOpacity:.06,
          clickable:false
        });
      }else{
        accuracyCircle.setCenter(pos);
        accuracyCircle.setRadius(accuracy);
        accuracyCircle.setMap(naverMap);
      }
    }

    naverMap.setCenter(pos);
    try{if(naverMap.getZoom()<15)naverMap.setZoom(15);}catch(e){}
    const btn=document.getElementById('map-location-btn');
    if(btn)btn.classList.add('is-active');
  }

  function errorMessage(error){
    if(!error) return '현재 위치를 확인하지 못했습니다.';
    if(error.code===1) return '위치 권한을 허용하면 내 위치를 표시할 수 있어요.';
    if(error.code===2) return '현재 위치 정보를 가져오지 못했습니다.';
    if(error.code===3) return '위치 확인 시간이 초과됐습니다. 다시 시도해주세요.';
    return '현재 위치를 확인하지 못했습니다.';
  }

  function emitLocationError(message,error){
    window.dispatchEvent(new CustomEvent('funy:locationerror',{detail:{message,error:error||null}}));
  }

  function locateMe(){
    if(!navigator.geolocation){
      const message='이 브라우저에서는 위치 기능을 지원하지 않습니다.';
      showToast(message);
      emitLocationError(message);
      return;
    }
    if(!ready()){
      const message='지도를 불러온 뒤 다시 시도해주세요.';
      showToast(message);
      emitLocationError(message);
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      position=>{
        setLoading(false);
        const {latitude,longitude,accuracy}=position.coords;
        const current={lat:Number(latitude),lng:Number(longitude),accuracy:Number(accuracy)||0,ts:Date.now()};
        window.FUNY_CURRENT_LOCATION=current;
        updateLocation(current.lat,current.lng,current.accuracy);
        window.dispatchEvent(new CustomEvent('funy:locationchange',{detail:current}));
        showToast('현재 위치를 지도에 표시했습니다.');
      },
      error=>{
        setLoading(false);
        const message=errorMessage(error);
        showToast(message);
        emitLocationError(message,error);
      },
      {enableHighAccuracy:true,timeout:10000,maximumAge:15000}
    );
  }

  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    ensureControl();
    if(document.getElementById('map-location-btn')||tries>40)clearInterval(timer);
  },200);
})();
