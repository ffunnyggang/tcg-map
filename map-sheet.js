(()=>{
  const home=document.getElementById('home-view'),
    sheet=document.querySelector('.list-wrap'),
    mapWrap=document.querySelector('.map-wrap-hero'),
    mapEl=document.getElementById('naver-map');
  if(!home||!sheet||!mapWrap)return;

  sheet.classList.add('map-shop-sheet');
  let handle=sheet.querySelector('.map-sheet-handle');
  if(!handle){
    handle=document.createElement('div');
    handle.className='map-sheet-handle';
    handle.innerHTML='<span></span>';
    sheet.prepend(handle);
  }

  const mq=()=>window.matchMedia('(max-width:430px)').matches;
  let mode='half',startY=0,startTop=0,dragging=false,mapPointerDown=false,mapStartX=0,mapStartY=0,
    touchStartY=0,touchStartX=0,touchTracking=false,touchConsumed=false;

  function tops(){
    const vh=window.innerHeight;
    const filter=document.querySelector('.map-filter-bar');
    const filterBottom=filter?Math.max(64,filter.getBoundingClientRect().bottom+8):72;
    return{
      quarter:Math.max(filterBottom+180,Math.round(vh*.75)),
      half:Math.max(filterBottom+110,Math.round(vh*.50)),
      full:filterBottom
    };
  }

  function fitMapToVisibleArea(){
    if(!mq()||mode==='full')return;
    try{
      if(!(window.naver&&naver.maps)||!naverMap||!markerById||!SHOPS)return;
      const visible=SHOPS.filter(s=>(typeof matches!=='function'||matches(s))&&s._coord&&markerById.get(s.id));
      if(!visible.length)return;

      if(visible.length===1){
        naverMap.setCenter(markerById.get(visible[0].id).getPosition());
        naverMap.setZoom(15);
        return;
      }

      const bounds=new naver.maps.LatLngBounds();
      visible.forEach(s=>bounds.extend(markerById.get(s.id).getPosition()));

      const sheetTop=parseFloat(sheet.style.top)||tops()[mode];
      const covered=Math.max(0,window.innerHeight-sheetTop);
      const filter=document.querySelector('.map-filter-bar');
      const filterBottom=filter?filter.getBoundingClientRect().bottom:62;
      const topPad=Math.max(72,Math.round(filterBottom+14));
      const bottomPad=mode==='half'?Math.round(covered+30):Math.round(covered+20);

      naverMap.fitBounds(bounds,{top:topPad,right:24,bottom:bottomPad,left:24});
    }catch(e){}
  }

  function queueMapFit(){
    requestAnimationFrame(()=>requestAnimationFrame(fitMapToVisibleArea));
  }

  function setMode(next,animate=true){
    if(!mq())return;
    mode=next;
    const t=tops()[next];
    sheet.style.transition=animate?'top .32s cubic-bezier(.22,.8,.24,1)':'none';
    sheet.style.top=t+'px';
    sheet.dataset.sheet=next;
    document.body.classList.toggle('map-sheet-open',next==='full');
    if(next!=='full')sheet.scrollTop=0;
    if(next==='half')setTimeout(queueMapFit,animate?340:0);
  }

  function orderedSnap(top,dy){
    const t=tops();
    if(dy<-22){if(mode==='quarter')return'half';if(mode==='half')return'full';return'full'}
    if(dy>22){if(mode==='full')return'half';if(mode==='half')return'quarter';return'quarter'}
    return Object.keys(t).reduce((a,b)=>Math.abs(t[b]-top)<Math.abs(t[a]-top)?b:a,'half');
  }

  function down(e){
    if(!mq())return;
    if(e.target.closest('.shop-card'))return;
    dragging=true;
    startY=e.touches?e.touches[0].clientY:e.clientY;
    startTop=parseFloat(getComputedStyle(sheet).top)||tops()[mode];
    sheet.style.transition='none';
    handle.setPointerCapture?.(e.pointerId);
  }

  function move(e){
    if(!dragging)return;
    const y=e.touches?e.touches[0].clientY:e.clientY,dy=y-startY,t=tops();
    sheet.style.top=Math.max(t.full,Math.min(t.quarter,startTop+dy))+'px';
    e.preventDefault?.();
  }

  function up(e){
    if(!dragging)return;
    dragging=false;
    const y=e.changedTouches?e.changedTouches[0].clientY:e.clientY,dy=y-startY;
    setMode(orderedSnap(parseFloat(sheet.style.top),dy));
  }

  handle.addEventListener('pointerdown',down);
  window.addEventListener('pointermove',move,{passive:false});
  window.addEventListener('pointerup',up);
  handle.addEventListener('click',()=>setMode(mode==='quarter'?'half':mode==='half'?'full':'half'));
  window.addEventListener('resize',()=>{setMode(mode,false);if(mode==='half')queueMapFit()});

  if(mq())setMode('half',false);
  else{sheet.style.top='';sheet.style.transition=''}

  /* Geocoding finishes asynchronously. Re-fit once every shop marker exists so
     the app's final full-map fit cannot leave pins hidden behind the half sheet. */
  if(mq()){
    let fitTries=0;
    const fitTimer=setInterval(()=>{
      fitTries++;
      try{
        if(mode==='half')fitMapToVisibleArea();
        if((typeof SHOPS!=='undefined'&&typeof markerById!=='undefined'&&markerById.size>=SHOPS.length)||fitTries>=60)clearInterval(fitTimer);
      }catch(e){if(fitTries>=60)clearInterval(fitTimer)}
    },300);
  }

  const filters=document.getElementById('filters');
  if(filters)filters.addEventListener('click',()=>{if(mode==='half')setTimeout(queueMapFit,30)});

  const list=document.getElementById('shop-list');
  if(list){
    list.addEventListener('click',e=>{
      const card=e.target.closest('.shop-card');
      if(card&&mq()&&mode==='quarter')setMode('half');
    },true);
  }

  function collapseForMap(){if(mq()&&mode!=='quarter')setMode('quarter')}

  if(mapEl){
    mapEl.addEventListener('pointerdown',e=>{
      if(e.target.closest?.('.map-filter-bar'))return;
      mapPointerDown=true;mapStartX=e.clientX;mapStartY=e.clientY;
    },{capture:true});
    mapEl.addEventListener('pointermove',e=>{
      if(!mapPointerDown)return;
      if(Math.hypot(e.clientX-mapStartX,e.clientY-mapStartY)>6){collapseForMap();mapPointerDown=false}
    },{capture:true});
    mapEl.addEventListener('pointerup',()=>{if(mapPointerDown)collapseForMap();mapPointerDown=false},{capture:true});
    mapEl.addEventListener('pointercancel',()=>{mapPointerDown=false},{capture:true});
  }

  mapWrap.addEventListener('click',e=>{
    if(e.target.closest('.map-filter-bar'))return;
    if(e.target.closest('.map-sheet-handle'))return;
    collapseForMap();
  },true);

  sheet.addEventListener('touchstart',e=>{
    if(!mq()||e.touches.length!==1)return;
    const t=e.touches[0];
    touchStartY=t.clientY;touchStartX=t.clientX;touchTracking=true;touchConsumed=false;
  },{passive:true});

  sheet.addEventListener('touchmove',e=>{
    if(!mq()||!touchTracking||touchConsumed||e.touches.length!==1)return;
    const t=e.touches[0],dy=t.clientY-touchStartY,dx=t.clientX-touchStartX;
    if(Math.abs(dy)<18||Math.abs(dy)<=Math.abs(dx))return;
    if(mode==='full'){
      if(dy>0&&sheet.scrollTop<=1){touchConsumed=true;e.preventDefault();setMode('half')}
      return;
    }
    if(mode==='half'){
      touchConsumed=true;e.preventDefault();setMode(dy>0?'quarter':'full');return;
    }
    if(mode==='quarter'&&dy<0){touchConsumed=true;e.preventDefault();setMode('half')}
  },{passive:false});

  sheet.addEventListener('touchend',()=>{touchTracking=false;touchConsumed=false},{passive:true});
  sheet.addEventListener('touchcancel',()=>{touchTracking=false;touchConsumed=false},{passive:true});
})();