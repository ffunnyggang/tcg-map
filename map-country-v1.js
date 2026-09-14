/* FUNY PIN map country selector */
(function(){
  const track=document.getElementById('filters');
  const mapWrap=document.querySelector('.map-wrap-hero');
  const googleMapEl=document.getElementById('google-map');
  if(!track||!mapWrap||typeof renderFilters!=='function'||typeof syncMapMarkers!=='function')return;

  const JAPAN_CENTER={lat:35.6984,lng:139.7731,zoom:15};
  let country='KR';
  let googleMap=null;
  let googleLoader=null;

  function ensureServiceState(){
    let state=mapWrap.querySelector('[data-country-service-state]');
    if(state)return state;
    state=document.createElement('div');
    state.className='country-service-state';
    state.setAttribute('data-country-service-state','');
    state.hidden=true;
    state.innerHTML='<span class="country-service-place">일본 · 도쿄 · 아키하바라</span><strong class="country-service-title">서비스 준비 중입니다</strong>';
    mapWrap.appendChild(state);
    return state;
  }

  function ensureCountryControl(){
    if(track.querySelector('[data-country-filter]'))return;
    const wrap=document.createElement('div');
    wrap.className='country-filter-wrap';
    wrap.setAttribute('data-country-filter','');
    wrap.innerHTML='<select class="country-filter-select" aria-label="국가 선택"><option value="KR">한국</option><option value="JP">일본</option></select>';
    const sep=document.createElement('span');
    sep.className='country-filter-sep';
    sep.setAttribute('aria-hidden','true');
    track.prepend(sep);
    track.prepend(wrap);
    wrap.querySelector('select').value=country;
  }

  function hideKoreaMarkers(){
    try{if(activeInfoWindow)activeInfoWindow.close()}catch(e){}
    try{markerById.forEach(marker=>marker.setMap(null))}catch(e){}
    try{setMapStatus('',true)}catch(e){}
  }

  function loadGoogleMaps(){
    if(window.google&&google.maps)return Promise.resolve();
    if(googleLoader)return googleLoader;
    const key=(window.FUNY_GOOGLE_MAPS_API_KEY||'').trim();
    if(!key)return Promise.reject(new Error('Google Maps API key is not configured'));
    googleLoader=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src='https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(key)+'&v=weekly&loading=async';
      script.async=true;
      script.defer=true;
      script.onload=resolve;
      script.onerror=()=>reject(new Error('Google Maps SDK load failed'));
      document.head.appendChild(script);
    });
    return googleLoader;
  }

  function initJapanMap(){
    const service=ensureServiceState();
    if(!googleMapEl){
      service.hidden=false;
      return;
    }
    loadGoogleMaps().then(()=>{
      if(!googleMap){
        googleMap=new google.maps.Map(googleMapEl,{
          center:{lat:JAPAN_CENTER.lat,lng:JAPAN_CENTER.lng},
          zoom:JAPAN_CENTER.zoom,
          mapTypeControl:false,
          streetViewControl:false,
          fullscreenControl:false,
          clickableIcons:true,
          gestureHandling:'greedy'
        });
      }else{
        googleMap.setCenter({lat:JAPAN_CENTER.lat,lng:JAPAN_CENTER.lng});
        googleMap.setZoom(JAPAN_CENTER.zoom);
      }
      service.hidden=false;
      requestAnimationFrame(()=>window.google&&google.maps&&google.maps.event.trigger(googleMap,'resize'));
    }).catch(()=>{
      service.hidden=false;
    });
  }

  function applyCountry(next){
    country=next==='JP'?'JP':'KR';
    document.body.classList.toggle('country-japan',country==='JP');
    ensureCountryControl();
    const select=track.querySelector('.country-filter-select');
    if(select)select.value=country;
    const service=ensureServiceState();

    if(country==='JP'){
      hideKoreaMarkers();
      service.hidden=false;
      initJapanMap();
    }else{
      service.hidden=true;
      try{baseSyncMapMarkers(true)}catch(e){}
    }
  }

  const baseRenderFilters=renderFilters;
  renderFilters=function(){
    baseRenderFilters();
    ensureCountryControl();
  };

  const baseSyncMapMarkers=syncMapMarkers;
  syncMapMarkers=function(refit=true){
    if(country==='JP'){
      hideKoreaMarkers();
      initJapanMap();
      return;
    }
    return baseSyncMapMarkers(refit);
  };

  track.addEventListener('change',e=>{
    const select=e.target.closest('.country-filter-select');
    if(!select)return;
    applyCountry(select.value);
  });

  ensureCountryControl();
  ensureServiceState();
  applyCountry('KR');
  window.FUNY_MAP_COUNTRY={get:()=>country,set:applyCountry};
})();
