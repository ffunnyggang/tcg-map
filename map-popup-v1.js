/* Floating map shop popup: name + location + hours, matching list metadata */
(function(){
  if(!(window.naver&&naver.maps)) return;
  const pinSvg='<svg class="map-popup-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2.5"/></svg>';
  const clockSvg='<svg class="map-popup-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  const bound=new WeakSet();
  function popupHTML(s){
    return `<button type="button" class="map-shop-popup" onclick="location.hash='#/shop/${s.id}';openDetail('${s.id}');return false;"><strong>${esc(s.name)}</strong><span class="map-popup-line">${pinSvg}<span>${esc(s.area)} · ${esc(s.station)} 도보 ${esc(s.walkMin)}분</span></span><span class="map-popup-line">${clockSvg}<span>${esc(todayHours(s))}</span></span><span class="map-popup-chevron">›</span></button>`;
  }
  function bindMarker(s,marker){
    if(!marker||bound.has(marker)) return;
    try{naver.maps.Event.clearInstanceListeners(marker);}catch(e){}
    naver.maps.Event.addListener(marker,'click',()=>{
      try{if(activeInfoWindow)activeInfoWindow.close();}catch(e){}
      const iw=new naver.maps.InfoWindow({content:popupHTML(s),borderWidth:0,backgroundColor:'transparent',anchorSize:new naver.maps.Size(14,10),anchorSkew:true,pixelOffset:new naver.maps.Point(0,-14)});
      iw.open(naverMap,marker);
      try{activeInfoWindow=iw;}catch(e){}
    });
    bound.add(marker);
  }
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    try{
      SHOPS.forEach(s=>bindMarker(s,markerById.get(s.id)));
      if(markerById.size>=SHOPS.length||tries>60) clearInterval(timer);
    }catch(e){if(tries>60)clearInterval(timer)}
  },250);
})();