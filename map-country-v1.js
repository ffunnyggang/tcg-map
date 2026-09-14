/* FUNY PIN map country selector */
(function(){
  const track=document.getElementById('filters');
  const mapWrap=document.querySelector('.map-wrap-hero');
  if(!track||!mapWrap||typeof renderFilters!=='function'||typeof syncMapMarkers!=='function')return;

  const JAPAN_CENTER={lat:35.6984,lng:139.7731,zoom:15};
  let country='KR';

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

  function centerJapan(){
    try{
      if(naverMap&&window.naver&&naver.maps){
        naverMap.setCenter(new naver.maps.LatLng(JAPAN_CENTER.lat,JAPAN_CENTER.lng));
        naverMap.setZoom(JAPAN_CENTER.zoom);
      }
    }catch(e){}
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
      requestAnimationFrame(()=>requestAnimationFrame(centerJapan));
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
      centerJapan();
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
