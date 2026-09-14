/* Floating map shop popup: thumbnail + name + location + hours */
(function(){
  if(!(window.naver&&naver.maps)) return;
  const pinSvg='<svg class="map-popup-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2.5"/></svg>';
  const clockSvg='<svg class="map-popup-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  const bound=new WeakSet();
  let selectedMarker=null;
  let mapDismissBound=false;
  let zoomBound=false;

  function ensureMarkerStyles(){
    if(document.getElementById('funy-pin-marker-styles')) return;
    const style=document.createElement('style');
    style.id='funy-pin-marker-styles';
    style.textContent=`
      .funy-pin-marker{position:relative;width:var(--marker-w);height:var(--marker-h);filter:drop-shadow(0 3px 5px rgba(88,63,166,.20));transform-origin:50% 100%}
      .funy-pin-marker svg{position:absolute;left:50%;top:0;width:var(--pin-w);height:var(--pin-h);transform:translateX(-50%);overflow:visible}
      .funy-pin-wave{display:none;position:absolute;left:50%;bottom:0;width:var(--wave-w);height:var(--wave-h);transform:translateX(-50%);pointer-events:none}
      .funy-pin-marker.is-selected .funy-pin-wave{display:block}
      .funy-pin-wave:before,.funy-pin-wave:after{content:"";position:absolute;left:50%;top:50%;border:1.5px solid rgba(125,96,214,.24);border-radius:50%;transform:translate(-50%,-50%)}
      .funy-pin-wave:before{width:58%;height:34%;background:rgba(139,111,220,.06)}
      .funy-pin-wave:after{width:94%;height:68%;border-color:rgba(125,96,214,.11)}
    `;
    document.head.appendChild(style);
  }

  function markerMetrics(){
    let z=11;
    try{if(naverMap)z=naverMap.getZoom();}catch(e){}
    if(z<=9)return{pinW:15,pinH:21,markerW:19,markerH:26,waveW:20,waveH:7};
    if(z===10)return{pinW:17,pinH:24,markerW:21,markerH:29,waveW:22,waveH:8};
    if(z===11)return{pinW:19,pinH:27,markerW:23,markerH:32,waveW:25,waveH:9};
    if(z===12)return{pinW:22,pinH:31,markerW:26,markerH:36,waveW:28,waveH:10};
    if(z===13)return{pinW:25,pinH:35,markerW:29,markerH:40,waveW:32,waveH:11};
    if(z===14)return{pinW:28,pinH:39,markerW:32,markerH:44,waveW:35,waveH:12};
    return{pinW:31,pinH:43,markerW:35,markerH:48,waveW:39,waveH:13};
  }

  function markerHTML(selected=false){
    const m=markerMetrics();
    const vars=`--pin-w:${m.pinW}px;--pin-h:${m.pinH}px;--marker-w:${m.markerW}px;--marker-h:${m.markerH}px;--wave-w:${m.waveW}px;--wave-h:${m.waveH}px`;
    return `<div class="funy-pin-marker${selected?' is-selected':''}" style="${vars}" aria-hidden="true">
      <span class="funy-pin-wave"></span>
      <svg viewBox="0 0 98 136" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="funyPinGrad${selected?'S':'N'}" x1="15" y1="8" x2="84" y2="112" gradientUnits="userSpaceOnUse">
            <stop stop-color="#A98BF4"/>
            <stop offset=".48" stop-color="#8061DD"/>
            <stop offset="1" stop-color="#6546C5"/>
          </linearGradient>
        </defs>
        <path d="M49 4C22 4 0 26 0 53c0 37 49 79 49 79s49-42 49-79C98 26 76 4 49 4Z" fill="url(#funyPinGrad${selected?'S':'N'})"/>
        <path d="M5 53h29M64 53h29" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/>
        <circle cx="49" cy="53" r="14.5" fill="#FFFFFF"/>
        <circle cx="49" cy="53" r="8.5" fill="#8B6CE2"/>
      </svg>
    </div>`;
  }

  function markerIcon(selected=false){
    const m=markerMetrics();
    return {content:markerHTML(selected),anchor:new naver.maps.Point(Math.round(m.markerW/2),m.markerH)};
  }

  function setSelected(marker,selected){
    if(!marker) return;
    try{marker.setIcon(markerIcon(selected));}catch(e){}
    try{marker.setZIndex(selected?500:100);}catch(e){}
  }

  function clearSelected(closeInfo=false){
    if(selectedMarker){
      setSelected(selectedMarker,false);
      selectedMarker=null;
    }
    if(closeInfo){
      try{if(activeInfoWindow)activeInfoWindow.close();}catch(e){}
    }
  }

  function refreshMarkerSizes(){
    try{
      SHOPS.forEach(s=>{
        const marker=markerById.get(s.id);
        if(marker)setSelected(marker,marker===selectedMarker);
      });
    }catch(e){}
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
      if(selectedMarker===marker){
        clearSelected(true);
        return;
      }
      if(selectedMarker)setSelected(selectedMarker,false);
      selectedMarker=marker;
      setSelected(marker,true);
      try{if(activeInfoWindow)activeInfoWindow.close();}catch(e){}
      const iw=new naver.maps.InfoWindow({content:popupHTML(s),borderWidth:0,backgroundColor:'transparent',anchorSize:new naver.maps.Size(0,0),anchorSkew:false,pixelOffset:new naver.maps.Point(0,-20)});
      iw.open(naverMap,marker);
      try{activeInfoWindow=iw;}catch(e){}
    });
    bound.add(marker);
  }

  function bindMapEvents(){
    if(!naverMap)return;
    if(!mapDismissBound){
      naver.maps.Event.addListener(naverMap,'click',()=>clearSelected(true));
      mapDismissBound=true;
    }
    if(!zoomBound){
      naver.maps.Event.addListener(naverMap,'zoom_changed',refreshMarkerSizes);
      zoomBound=true;
    }
  }

  ensureMarkerStyles();
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    try{
      SHOPS.forEach(s=>bindMarker(s,markerById.get(s.id)));
      bindMapEvents();
      if(markerById.size>=SHOPS.length||tries>60) clearInterval(timer);
    }catch(e){if(tries>60)clearInterval(timer)}
  },250);
})();