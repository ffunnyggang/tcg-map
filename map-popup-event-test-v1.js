/* Floating map shop popup: thumbnail + name + location + hours */
(function(){
  if(!(window.naver&&naver.maps)) return;
  const pinSvg='<svg class="map-popup-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2.5"/></svg>';
  const clockSvg='<svg class="map-popup-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  const fallbackThumb='<span class="map-popup-thumb map-popup-thumb-empty" aria-hidden="true"><svg viewBox="0 0 98 134"><path class="fallback-pin-body" d="M49 5C23 5 2 26 2 52c0 35 47 77 47 77s47-42 47-77C96 26 75 5 49 5Z"/><path class="fallback-pin-line" d="M6 52h28M64 52h28"/><circle class="fallback-pin-center" cx="49" cy="52" r="14.5"/></svg><b>FUNY PIN</b></span>';
  window.FUNY_MAP_POPUP_FALLBACK=fallbackThumb;
  const bound=new WeakSet();
  let selectedMarker=null;
  let mapDismissBound=false;
  let zoomBound=false;
  const liveShopIds=new Set();
  const eventShopIds=new Set(['KR-SEO-013']); // TEST: CARDVAULT event

  function ensureMarkerStyles(){
    if(document.getElementById('funy-pin-marker-styles')) return;
    const style=document.createElement('style');
    style.id='funy-pin-marker-styles';
    style.textContent=`
      .funy-pin-marker{position:relative;width:var(--marker-w);height:var(--marker-h);filter:drop-shadow(0 3px 5px rgba(88,63,166,.20));transform-origin:50% 100%}
      .funy-pin-marker svg{position:absolute;left:50%;top:0;width:var(--pin-w);height:var(--pin-h);transform:translateX(-50%);overflow:visible}
      .funy-pin-wave{display:none;position:absolute;left:50%;bottom:0;width:var(--wave-w);height:var(--wave-h);transform:translateX(-50%);pointer-events:none}
      .funy-pin-marker.is-selected .funy-pin-wave{display:block}
      .funy-live-mark{position:absolute;left:50%;top:39%;z-index:3;display:flex;align-items:center;justify-content:center;transform:translate(-50%,-50%);color:#6749bd;font:900 clamp(27px,calc(var(--pin-w) * 1.26),42px)/1 Arial,sans-serif;text-shadow:0 1px 2px rgba(255,255,255,.9);pointer-events:none}
      .funy-pin-marker.is-event{filter:drop-shadow(0 3px 5px rgba(88,63,166,.22));animation:funyEventPinGlow 1.45s ease-in-out infinite}
      .funy-pin-marker.is-event:before{content:"";position:absolute;left:50%;top:0;z-index:4;width:var(--pin-w);height:var(--pin-h);transform:translateX(-50%);border-radius:48% 48% 54% 54%;background:linear-gradient(112deg,transparent 20%,rgba(255,255,255,0) 36%,rgba(255,255,255,.92) 49%,rgba(255,255,255,0) 62%,transparent 78%);background-size:220% 100%;background-position:160% 0;mix-blend-mode:screen;clip-path:polygon(50% 0,82% 9%,100% 35%,96% 59%,77% 79%,50% 100%,23% 79%,4% 59%,0 35%,18% 9%);pointer-events:none;animation:funyEventShine 1.45s ease-in-out infinite}
      .funy-event-mark{position:absolute;left:50%;top:-13px;z-index:7;height:18px;padding:0 7px;border:1.5px solid #fff;border-radius:9px;background:linear-gradient(135deg,#ff9f32,#ff6f3c);color:#fff;box-shadow:0 3px 8px rgba(235,112,47,.34);display:flex;align-items:center;justify-content:center;transform:translateX(-50%);white-space:nowrap;font:900 8px/1 Arial,sans-serif;letter-spacing:.04em;pointer-events:none}
      .funy-event-sparkles{position:absolute;inset:-8px -10px 0;z-index:6;pointer-events:none}
      .funy-event-sparkles i{position:absolute;display:block;color:#ffd23f;font-style:normal;font-weight:900;line-height:1;text-shadow:0 0 5px rgba(255,207,55,.8);animation:funySparkle 1.35s ease-in-out infinite}
      .funy-event-sparkles i:nth-child(1){left:-1px;top:10px;font-size:9px}
      .funy-event-sparkles i:nth-child(2){right:-2px;top:17px;font-size:12px;animation-delay:.35s;color:#fff}
      .funy-event-sparkles i:nth-child(3){right:2px;bottom:5px;font-size:8px;animation-delay:.7s;color:#d9c4ff}
      .funy-event-sparkles i:nth-child(4){left:2px;bottom:9px;font-size:11px;animation-delay:1s;color:#fff}
      @keyframes funySparkle{0%,100%{opacity:.18;transform:scale(.55) rotate(0deg)}45%{opacity:1;transform:scale(1.18) rotate(22deg)}70%{opacity:.42;transform:scale(.75) rotate(40deg)}}
      @keyframes funyEventPinGlow{0%,100%{filter:drop-shadow(0 3px 5px rgba(88,63,166,.22)) drop-shadow(0 0 0 rgba(158,124,255,0));transform:scale(1)}50%{filter:drop-shadow(0 4px 7px rgba(88,63,166,.30)) drop-shadow(0 0 7px rgba(158,124,255,.82));transform:scale(1.07)}}
      @keyframes funyEventShine{0%,20%{background-position:160% 0;opacity:0}38%{opacity:1}65%,100%{background-position:-70% 0;opacity:0}}
      @media (prefers-reduced-motion:reduce){.funy-pin-marker.is-event{animation:none;filter:drop-shadow(0 3px 6px rgba(88,63,166,.3)) drop-shadow(0 0 5px rgba(158,124,255,.55))}.funy-pin-marker.is-event:before{animation:none;opacity:.28;background-position:50% 0}.funy-event-sparkles i{animation:none;opacity:.8}}
      .funy-pin-wave:before,.funy-pin-wave:after{content:"";position:absolute;left:50%;top:50%;border:1.5px solid rgba(125,96,214,.24);border-radius:50%;transform:translate(-50%,-50%)}
      .funy-pin-wave:before{width:58%;height:34%;background:rgba(139,111,220,.06)}
      .funy-pin-wave:after{width:94%;height:68%;border-color:rgba(125,96,214,.11)}
    `;
    document.head.appendChild(style);
  }

  function markerMetrics(){
    let z=11;
    try{if(naverMap)z=naverMap.getZoom();}catch(e){}
    if(z<=9)return{pinW:16,pinH:22,markerW:20,markerH:28,waveW:21,waveH:7};
    if(z===10)return{pinW:18,pinH:25,markerW:22,markerH:31,waveW:23,waveH:8};
    if(z===11)return{pinW:21,pinH:29,markerW:25,markerH:35,waveW:27,waveH:9};
    if(z===12)return{pinW:24,pinH:33,markerW:28,markerH:39,waveW:30,waveH:10};
    if(z===13)return{pinW:27,pinH:37,markerW:31,markerH:43,waveW:34,waveH:11};
    if(z===14)return{pinW:30,pinH:41,markerW:34,markerH:47,waveW:37,waveH:12};
    return{pinW:33,pinH:45,markerW:37,markerH:51,waveW:41,waveH:13};
  }

  function markerHTML(selected=false,shopId=''){
    const m=markerMetrics();
    const vars=`--pin-w:${m.pinW}px;--pin-h:${m.pinH}px;--marker-w:${m.markerW}px;--marker-h:${m.markerH}px;--wave-w:${m.waveW}px;--wave-h:${m.waveH}px`;
    return `<div class="funy-pin-marker${selected?' is-selected':''}${eventShopIds.has(shopId)?' is-event':''}" style="${vars}" aria-hidden="true">
      <span class="funy-pin-wave"></span>${liveShopIds.has(shopId)?'<span class="funy-live-mark">⚡</span>':''}${eventShopIds.has(shopId)?'<span class="funy-event-mark">EVENT</span><span class="funy-event-sparkles" aria-hidden="true"><i>✦</i><i>✦</i><i>✦</i><i>✦</i></span>':''}
      <svg viewBox="0 0 98 134" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs><linearGradient id="funyPinGrad${selected?'S':'N'}" x1="15" y1="8" x2="84" y2="112" gradientUnits="userSpaceOnUse"><stop stop-color="#A98BF4"/><stop offset=".48" stop-color="#8061DD"/><stop offset="1" stop-color="#6546C5"/></linearGradient></defs>
        <path d="M49 5C23 5 2 26 2 52c0 35 47 77 47 77s47-42 47-77C96 26 75 5 49 5Z" fill="url(#funyPinGrad${selected?'S':'N'})"/><path d="M6 52h28M64 52h28" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/><circle cx="49" cy="52" r="14.5" fill="#FFFFFF"/>
      </svg>
    </div>`;
  }
  function markerIcon(selected=false,shopId=''){const m=markerMetrics();return {content:markerHTML(selected,shopId),anchor:new naver.maps.Point(Math.round(m.markerW/2),m.markerH)}}
  function setSelected(marker,selected,shopId=''){if(!marker)return;try{marker.setIcon(markerIcon(selected,shopId))}catch(e){}try{marker.setZIndex(selected?500:100)}catch(e){}}
  function clearSelected(closeInfo=false){if(selectedMarker){setSelected(selectedMarker,false,selectedMarker.__funyShopId||'');selectedMarker=null}if(closeInfo){try{if(activeInfoWindow)activeInfoWindow.close()}catch(e){}}}
  function refreshMarkerSizes(){try{SHOPS.forEach(s=>{const marker=markerById.get(s.id);if(marker)setSelected(marker,marker===selectedMarker,s.id)})}catch(e){}}
  function popupHTML(s){const image=(typeof SHOP_IMAGES!=='undefined'&&SHOP_IMAGES[s.id])||((typeof SHOP_GALLERIES!=='undefined'&&SHOP_GALLERIES[s.id]&&SHOP_GALLERIES[s.id][0])||'');const thumb=image?`<span class="map-popup-thumb"><img src="${esc(image)}" alt="${esc(s.name)} 매장 사진" loading="eager" decoding="async"></span>`:fallbackThumb;return `<div class="map-popup-bubble"><button type="button" class="map-shop-popup" onclick="location.hash='#/shop/${s.id}';openDetail('${s.id}');return false;">${thumb}<span class="map-popup-copy"><strong>${esc(s.name)}</strong><span class="map-popup-line">${pinSvg}<span>${esc(s.area)} · ${esc(s.station)} 도보 ${esc(s.walkMin)}분</span></span><span class="map-popup-line">${clockSvg}<span>${esc(todayHours(s))}</span></span></span><span class="map-popup-chevron">›</span></button></div>`}
  function bindMarker(s,marker){if(!marker||bound.has(marker))return;marker.__funyShopId=s.id;setSelected(marker,false,s.id);try{naver.maps.Event.clearInstanceListeners(marker)}catch(e){}naver.maps.Event.addListener(marker,'click',()=>{if(selectedMarker===marker){clearSelected(true);return}if(selectedMarker)setSelected(selectedMarker,false,selectedMarker.__funyShopId||'');selectedMarker=marker;setSelected(marker,true,s.id);try{if(activeInfoWindow)activeInfoWindow.close()}catch(e){}const iw=new naver.maps.InfoWindow({content:popupHTML(s),borderWidth:0,backgroundColor:'transparent',anchorSize:new naver.maps.Size(0,0),anchorSkew:false,pixelOffset:new naver.maps.Point(0,-20)});iw.open(naverMap,marker);try{activeInfoWindow=iw}catch(e){}});bound.add(marker)}
  function bindMapEvents(){if(!naverMap)return;if(!mapDismissBound){naver.maps.Event.addListener(naverMap,'click',()=>clearSelected(true));mapDismissBound=true}if(!zoomBound){naver.maps.Event.addListener(naverMap,'zoom_changed',refreshMarkerSizes);zoomBound=true}}
  
  async function loadLivePins(){
    try{
      const URL='https://wdttzpbmqavaqfcbaywj.supabase.co';
      const KEY='sb_publishable__wrSzngSE-JbGnyE7PZX9w_2QaW8bpq';
      const now=new Date(),kst=new Date(now.getTime()+9*36e5),day=kst.toISOString().slice(0,10);
      const midnight=new Date(day+'T00:00:00+09:00').toISOString();
      const q=new URLSearchParams({select:'shop_id',post_type:'eq.report',shop_id:'like.KR-*',created_at:'gte.'+midnight,is_hidden:'eq.false'});
      const res=await fetch(URL+'/rest/v1/live_reports?'+q,{headers:{apikey:KEY,Authorization:'Bearer '+KEY},cache:'no-store'});
      if(!res.ok)return;
      const rows=await res.json();
      rows.forEach(x=>x.shop_id&&liveShopIds.add(x.shop_id));
      refreshMarkerSizes();
    }catch(e){}
  }
  ensureMarkerStyles();loadLivePins();let tries=0;const timer=setInterval(()=>{tries++;try{SHOPS.forEach(s=>bindMarker(s,markerById.get(s.id)));bindMapEvents();if(markerById.size>=SHOPS.length||tries>60)clearInterval(timer)}catch(e){if(tries>60)clearInterval(timer)}},250)
})();