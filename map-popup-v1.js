/* Floating map shop popup: thumbnail + name + location + hours */
(function(){
  if(!(window.naver&&naver.maps)) return;
  const pinSvg='<svg class="map-popup-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2.5"/></svg>';
  const clockSvg='<svg class="map-popup-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  const bound=new WeakSet();
  let selectedMarker=null;
  let mapDismissBound=false;

  function ensureMarkerStyles(){
    if(document.getElementById('funy-pin-marker-styles')) return;
    const style=document.createElement('style');
    style.id='funy-pin-marker-styles';
    style.textContent=`
      .funy-pin-marker{position:relative;width:42px;height:52px;filter:drop-shadow(0 5px 8px rgba(84,58,165,.24));transform-origin:50% 100%}
      .funy-pin-marker svg{position:absolute;left:50%;top:0;width:38px;height:48px;transform:translateX(-50%);overflow:visible}
      .funy-pin-wave{display:none;position:absolute;left:50%;bottom:-3px;width:38px;height:14px;transform:translateX(-50%);pointer-events:none}
      .funy-pin-marker.is-selected .funy-pin-wave{display:block}
      .funy-pin-wave:before,.funy-pin-wave:after{content:"";position:absolute;left:50%;top:50%;border:2px solid rgba(113,82,200,.28);border-radius:50%;transform:translate(-50%,-50%)}
      .funy-pin-wave:before{width:20px;height:6px}
      .funy-pin-wave:after{width:34px;height:11px;border-color:rgba(113,82,200,.16)}
      @media(max-width:430px){.funy-pin-marker{width:40px;height:50px}.funy-pin-marker svg{width:36px;height:46px}.funy-pin-wave{width:36px}}
    `;
    document.head.appendChild(style);
  }

  function markerHTML(selected=false){
    return `<div class="funy-pin-marker${selected?' is-selected':''}" aria-hidden="true">
      <span class="funy-pin-wave"></span>
      <svg viewBox="0 0 98 136" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="funyPinGrad${selected?'S':'N'}" x1="15" y1="8" x2="84" y2="112" gradientUnits="userSpaceOnUse">
            <stop stop-color="#A98BF4"/>
            <stop offset=".48" stop-color="#8061DD"/>
            <stop offset="1" stop-color="#6546C5"/>
          </linearGradient>
          <radialGradient id="funyBtnGrad${selected?'S':'N'}" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(40 42) rotate(48) scale(35)">
            <stop stop-color="#FFFFFF"/>
            <stop offset="1" stop-color="#ECE8FA"/>
          </radialGradient>
        </defs>
        <path d="M49 4C22 4 0 26 0 53c0 37 49 79 49 79s49-42 49-79C98 26 76 4 49 4Z" fill="url(#funyPinGrad${selected?'S':'N'})"/>
        <path d="M2 53h31M65 53h31" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round"/>
        <circle cx="49" cy="53" r="16.5" fill="url(#funyBtnGrad${selected?'S':'N'})"/>
        <ellipse cx="27" cy="23" rx="12" ry="6" transform="rotate(-28 27 23)" fill="#FFFFFF" fill-opacity=".18"/>
      </svg>
    </div>`;
  }

  function markerIcon(selected=false){
    return {content:markerHTML(selected),anchor:new naver.maps.Point(21,49)};
  }

  function setSelected(marker,selected){
    if(!marker) return;
    try{marker.setIcon(markerIcon(selected));}catch(e){}
    try{marker.setZIndex(selected?500:100);}catch(e){}
  }

  function selectMarker(marker){
    if(selectedMarker&&selectedMarker!==marker)setSelected(selectedMarker,false);
    selectedMarker=marker;
    setSelected(marker,true);
  }

  function clearSelected(){
    if(selectedMarker){
      setSelected(selectedMarker,false);
      selectedMarker=null;
    }
  }

  function popupHTML(s){
    const image=(typeof SHOP_IMAGES!=='undefined'&&SHOP_IMAGES[s.id])||((typeof SHOP_GALLERIES!=='undefined'&&SHOP_GALLERIES[s.id]&&SHOP_GALLERIES[s.id][0])||'');
    const thumb=image
      ? `<span class="map-popup-thumb"><img src="${esc(image)}" alt="${esc(s.name)} 매장 사진" loading="eager" decoding="async"></span>`
      : `<span class="map-popup-thumb map-popup-thumb-empty" aria-hidden="true">TCG</span>`;
    return `<div class="map-popup-bubble"><button type="button" class="map-shop-popup" onclick="location.hash='#/shop/${s.id}';openDetail('${s.id}');return false;">${thumb}<span class="map-popup-copy"><strong>${esc(s.name)}</strong><span class="map-popup-line">${pinSvg}<span>${esc(s.area)} · ${esc(s.station)} 도보 ${esc(s.walkMin)}분</span></span><span class="map-popup-line">${clockSvg}<span>${esc(todayHours(s))}</span></span></span><span class="map-popup-chevron">›</span></button></div>`;
  }

  function bindMarker(s,marker){
    if(!marker||bound.has(marker)) return;
    setSelected(marker,false);
    try{naver.maps.Event.clearInstanceListeners(marker);}catch(e){}
    naver.maps.Event.addListener(marker,'click',()=>{
      selectMarker(marker);
      try{if(activeInfoWindow)activeInfoWindow.close();}catch(e){}
      const iw=new naver.maps.InfoWindow({content:popupHTML(s),borderWidth:0,backgroundColor:'transparent',anchorSize:new naver.maps.Size(0,0),anchorSkew:false,pixelOffset:new naver.maps.Point(0,-20)});
      iw.open(naverMap,marker);
      try{activeInfoWindow=iw;}catch(e){}
    });
    bound.add(marker);
  }

  function bindMapDismiss(){
    if(mapDismissBound||!naverMap)return;
    naver.maps.Event.addListener(naverMap,'click',()=>clearSelected());
    mapDismissBound=true;
  }

  ensureMarkerStyles();
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    try{
      SHOPS.forEach(s=>bindMarker(s,markerById.get(s.id)));
      bindMapDismiss();
      if(markerById.size>=SHOPS.length||tries>60) clearInterval(timer);
    }catch(e){if(tries>60)clearInterval(timer)}
  },250);
})();