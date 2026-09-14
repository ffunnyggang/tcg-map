/* FUNY PIN map popup: selected marker + thumbnail + quick shop summary */
(function(){
  if(!(window.naver&&naver.maps)) return;

  const locationSvg='<svg class="map-popup-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2.5"/></svg>';
  const clockSvg='<svg class="map-popup-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  const bound=new WeakSet();
  let selectedMarker=null;
  let mapClickBound=false;

  function markerHTML(selected=false){
    return `<div class="funy-map-marker${selected?' is-selected':''}" aria-hidden="true"><span class="funy-map-marker-core"><span class="funy-map-marker-dot"></span></span></div>`;
  }

  function markerIcon(selected=false){
    return {
      content:markerHTML(selected),
      anchor:new naver.maps.Point(selected?18:15,selected?38:32)
    };
  }

  function setMarkerSelected(marker,selected){
    if(!marker)return;
    try{marker.setIcon(markerIcon(selected));}catch(e){}
    try{marker.setZIndex(selected?500:100);}catch(e){}
  }

  function clearSelection(closeInfo=true){
    if(selectedMarker){
      setMarkerSelected(selectedMarker,false);
      selectedMarker=null;
    }
    if(closeInfo){
      try{if(activeInfoWindow)activeInfoWindow.close();}catch(e){}
    }
  }

  function selectMarker(marker){
    if(selectedMarker&&selectedMarker!==marker)setMarkerSelected(selectedMarker,false);
    selectedMarker=marker;
    setMarkerSelected(marker,true);
  }

  function tcgLabels(s){
    if(!s||!s.tcg)return[];
    return [s.tcg.pokemon&&'포켓몬',s.tcg.onePiece&&'원피스',s.tcg.dragonBall&&'드래곤볼'].filter(Boolean);
  }

  function popupHTML(s){
    const image=(typeof SHOP_IMAGES!=='undefined'&&SHOP_IMAGES[s.id])||((typeof SHOP_GALLERIES!=='undefined'&&SHOP_GALLERIES[s.id]&&SHOP_GALLERIES[s.id][0])||'');
    const thumb=image
      ? `<span class="map-popup-thumb"><img src="${esc(image)}" alt="${esc(s.name)} 매장 사진" loading="eager" decoding="async"></span>`
      : `<span class="map-popup-thumb map-popup-thumb-empty" aria-hidden="true">TCG</span>`;
    const hours=todayHours(s);
    const isOpen=String(hours).startsWith('운영 중');
    const tcg=tcgLabels(s);
    const badges=tcg.length?`<span class="map-popup-badges">${tcg.slice(0,3).map(label=>`<span>${esc(label)}</span>`).join('')}</span>`:'';
    return `<div class="map-popup-bubble"><button type="button" class="map-shop-popup" aria-label="${esc(s.name)} 상세정보 보기" onclick="location.hash='#/shop/${s.id}';openDetail('${s.id}');return false;">${thumb}<span class="map-popup-copy"><span class="map-popup-title-row"><strong>${esc(s.name)}</strong><span class="map-popup-status ${isOpen?'is-open':'is-closed'}">${isOpen?'영업중':'영업정보'}</span></span><span class="map-popup-line">${locationSvg}<span>${esc(s.area)} · ${esc(s.station)} 도보 ${esc(s.walkMin)}분</span></span><span class="map-popup-line">${clockSvg}<span>${esc(hours)}</span></span>${badges}</span><span class="map-popup-chevron">›</span></button></div>`;
  }

  function bindMarker(s,marker){
    if(!marker||bound.has(marker)) return;
    setMarkerSelected(marker,false);
    try{naver.maps.Event.clearInstanceListeners(marker);}catch(e){}
    naver.maps.Event.addListener(marker,'click',()=>{
      selectMarker(marker);
      try{if(activeInfoWindow)activeInfoWindow.close();}catch(e){}
      const iw=new naver.maps.InfoWindow({
        content:popupHTML(s),
        borderWidth:0,
        backgroundColor:'transparent',
        anchorSize:new naver.maps.Size(0,0),
        anchorSkew:false,
        pixelOffset:new naver.maps.Point(0,-25)
      });
      iw.open(naverMap,marker);
      try{activeInfoWindow=iw;}catch(e){}
    });
    bound.add(marker);
  }

  function bindMapDismiss(){
    if(mapClickBound||!naverMap)return;
    naver.maps.Event.addListener(naverMap,'click',()=>clearSelection(true));
    mapClickBound=true;
  }

  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    try{
      SHOPS.forEach(s=>bindMarker(s,markerById.get(s.id)));
      bindMapDismiss();
      if(markerById.size>=SHOPS.length||tries>60)clearInterval(timer);
    }catch(e){
      if(tries>60)clearInterval(timer);
    }
  },250);
})();