/* FUNY PIN map country selector */
(function(){
  function loadGlobalI18n(){
    if(!document.querySelector('link[data-funy-i18n]')){const l=document.createElement('link');l.rel='stylesheet';l.href='funy-i18n.css?v=20260915-0523';l.dataset.funyI18n='';document.head.appendChild(l)}
    if(!document.querySelector('script[data-funy-i18n]')){const s=document.createElement('script');s.src='funy-i18n.js?v=20260915-0523';s.dataset.funyI18n='';document.head.appendChild(s)}
  }
  loadGlobalI18n();

  const track=document.getElementById('filters');
  const mapWrap=document.querySelector('.map-wrap-hero');
  const googleMapEl=document.getElementById('google-map');
  if(!track||!mapWrap||typeof renderFilters!=='function'||typeof syncMapMarkers!=='function')return;

  const JAPAN_CENTER={lat:35.698683,lng:139.773148,zoom:15};
  let country='KR';
  let googleMap=null;
  let googleLoader=null;

  function currentLanguage(){return localStorage.getItem('funy-pin-lang')==='en'?'en':'ko'}

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

  function flagSvg(code){
    if(code==='JP')return '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9.4" fill="#fff" stroke="rgba(31,28,36,.14)" stroke-width=".7"/><circle cx="10" cy="10" r="4.2" fill="#bc002d"/></svg>';
    return '<svg viewBox="0 0 20 20" aria-hidden="true"><defs><clipPath id="funy-kr-flag"><circle cx="10" cy="10" r="9.4"/></clipPath></defs><circle cx="10" cy="10" r="9.4" fill="#fff" stroke="rgba(31,28,36,.14)" stroke-width=".7"/><g clip-path="url(#funy-kr-flag)"><path d="M6.1 10a3.9 3.9 0 0 1 7.8 0 1.95 1.95 0 0 0-3.9 0 1.95 1.95 0 0 1-3.9 0Z" fill="#cd2e3a"/><path d="M13.9 10a3.9 3.9 0 0 1-7.8 0 1.95 1.95 0 0 0 3.9 0 1.95 1.95 0 0 1 3.9 0Z" fill="#0047a0"/><g fill="#111"><rect x="4.1" y="4.15" width=".85" height="3.15" rx=".2" transform="rotate(-34 4.525 5.725)"/><rect x="5.45" y="3.25" width=".85" height="3.15" rx=".2" transform="rotate(-34 5.875 4.825)"/><rect x="14.2" y="12.9" width=".85" height="3.15" rx=".2" transform="rotate(-34 14.625 14.475)"/><rect x="15.55" y="12" width=".85" height="3.15" rx=".2" transform="rotate(-34 15.975 13.575)"/></g></g></svg>';
  }

  function updateCountryVisual(){
    const wrap=track.querySelector('.country-filter-wrap');
    if(!wrap)return;
    const flag=wrap.querySelector('.country-filter-flag');
    if(flag)flag.innerHTML=flagSvg(country);
  }

  function ensureCountryControl(){
    if(track.querySelector('[data-country-filter]')){updateCountryVisual();return;}
    const wrap=document.createElement('div');
    wrap.className='country-filter-wrap';
    wrap.setAttribute('data-country-filter','');
    wrap.innerHTML='<span class="country-filter-flag" aria-hidden="true"></span><select class="country-filter-select" aria-label="국가 선택"><option value="KR">한국</option><option value="JP">일본</option></select>';
    const sep=document.createElement('span');
    sep.className='country-filter-sep';
    sep.setAttribute('aria-hidden','true');
    track.prepend(sep);
    track.prepend(wrap);
    wrap.querySelector('select').value=country;
    updateCountryVisual();
  }

  function hideKoreaMarkers(){
    try{if(activeInfoWindow)activeInfoWindow.close()}catch(e){}
    try{markerById.forEach(marker=>marker.setMap(null))}catch(e){}
    try{setMapStatus('',true)}catch(e){}
  }

  function loadGoogleMaps(){
    if(window.google&&google.maps&&google.maps.Map)return Promise.resolve();
    if(googleLoader)return googleLoader;
    const key=(window.FUNY_GOOGLE_MAPS_API_KEY||'').trim();
    if(!key)return Promise.reject(new Error('Google Maps API key is not configured'));

    googleLoader=new Promise((resolve,reject)=>{
      const callback='__funyGoogleMapsReady';
      let settled=false;
      const finish=(ok,error)=>{
        if(settled)return;
        settled=true;
        clearTimeout(timer);
        try{delete window[callback]}catch(e){window[callback]=undefined}
        ok?resolve():reject(error||new Error('Google Maps SDK load failed'));
      };

      window[callback]=()=>{
        if(window.google&&google.maps&&google.maps.Map)finish(true);
        else finish(false,new Error('Google Maps SDK initialized without Map API'));
      };

      const script=document.createElement('script');
      script.id='funy-google-maps-sdk';
      script.src='https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(key)+'&callback='+callback+'&v=weekly&language='+currentLanguage()+'&region=JP';
      script.async=true;
      script.defer=true;
      script.onerror=()=>finish(false,new Error('Google Maps SDK load failed'));
      document.head.appendChild(script);

      const timer=setTimeout(()=>finish(false,new Error('Google Maps SDK load timeout')),12000);
    });

    return googleLoader;
  }

  function initJapanMap(){
    const service=ensureServiceState();
    service.hidden=false;
    if(!googleMapEl)return;

    loadGoogleMaps().then(()=>{
      if(country!=='JP')return;
      const center={lat:JAPAN_CENTER.lat,lng:JAPAN_CENTER.lng};
      if(!googleMap){
        googleMap=new google.maps.Map(googleMapEl,{
          center,
          zoom:JAPAN_CENTER.zoom,
          mapTypeControl:false,
          streetViewControl:false,
          fullscreenControl:false,
          clickableIcons:true,
          gestureHandling:'greedy'
        });
      }else{
        googleMap.setCenter(center);
        googleMap.setZoom(JAPAN_CENTER.zoom);
      }
      requestAnimationFrame(()=>{
        if(window.google&&google.maps&&google.maps.event){
          google.maps.event.trigger(googleMap,'resize');
          googleMap.setCenter(center);
        }
      });
    }).catch(error=>{
      console.error('[FUNY PIN] Google Maps load error:',error);
      service.hidden=false;
    });
  }

  function applyCountry(next){
    country=next==='JP'?'JP':'KR';
    document.body.classList.toggle('country-japan',country==='JP');
    ensureCountryControl();
    const select=track.querySelector('.country-filter-select');
    if(select)select.value=country;
    updateCountryVisual();
    const service=ensureServiceState();

    if(country==='JP'){
      hideKoreaMarkers();
      service.hidden=false;
      requestAnimationFrame(initJapanMap);
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
