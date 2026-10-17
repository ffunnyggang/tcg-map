/* FUNY PIN integrated MARKET test runtime */
(async function(){
  if(location.pathname.replace(/\/+$/,'')!=='/shops-market-test.html')return;
  const A=window.FUNY_WEB_AUTH;
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>n==null?'가격 정보 없음':Number(n).toLocaleString('ko-KR')+'원';
  const cats={pokemon:'포켓몬',onepiece:'원피스',dragonball:'드래곤볼',other:'기타'};
  const types={single:'싱글카드',vintage:'빈티지카드',graded:'등급카드',box:'박스제품',other:'기타'};
  const providerNames={daangn:'당근',bunjang:'번개장터',break:'BREAK'};
  const providerName=x=>providerNames[x?.provider]||'외부 플랫폼';
  const externalTradeLabel=x=>x?.provider==='daangn'&&x?.direct_buy_available?'당근에서 바로구매':providerName(x)+'에서 거래하기';
  const typeDefs=[['all','전체'],['single','싱글카드'],['vintage','빈티지카드'],['graded','등급카드'],['box','박스제품'],['other','기타']];
  const typeEmojis={all:'✨',single:'🃏',vintage:'🏺',graded:'💎',box:'📦',other:'🎴'};
  const sortDefs=[['latest','최신 순'],['near','가까운 순'],['low','낮은 가격순'],['high','높은 가격순']];
  const categoryBadgeNames={pokemon:'포켓몬스터',onepiece:'원피스',dragonball:'드래곤볼',other:'기타'};
  const funySymbol='<img src="/favicon.svg?v=20261014-header1" alt="" aria-hidden="true">';
  const age=v=>{const m=Math.max(0,Math.floor((Date.now()-new Date(v))/60000));if(m<60)return m+'분 전';if(m<1440)return Math.floor(m/60)+'시간 전';return Math.floor(m/1440)+'일 전'};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const MARKET_TEST_AUTH_BYPASS=true; // PRIVATE TEST ONLY: PASS + external seller verification are forced PASS
  document.body.classList.add('market-test-page');
  const session=await A.init().catch(()=>null);
  if(!session){A.goLogin(location.pathname+location.search+location.hash);return}
  document.documentElement.classList.remove('market-test-locked');
  document.body.classList.add('market-test-ready');

  const watermark=document.createElement('div');
  watermark.className='market-test-watermark';
  watermark.textContent='MARKET TEST · 비공개';
  document.body.appendChild(watermark);

  let rows=[],marketLayerOn=true,marketTabActive=false,marketFilter='all',overlayFilter='all',marketSort='latest',marketSortOrigin=null;
  let markers=new Map(),popup=null,selectedMarkerId=null,addressCache=new Map();
  let registerMap=null,registerProduct=null,registerPreviewUrl='',registerType='single',registerDirectBuy=false,registerExternalVerified=false,registerChallengeId='',registerLat=null,registerLng=null,registerLocation='',registerCoordinate=null,registerPin=null,registerCurrentPin=null,registerCurrentAccuracy=null,reverseTimer=null;
  let marketPanel=null,marketTabBtn=null,layerChip=null,layerOrderObserver=null,layerOrderQueued=false;

  async function waitForMap(){
    for(let i=0;i<120;i++){
      const map=window.FUNY_NAVER_MAP_API?.getMap?.();
      if(map)return map;
      await sleep(100);
    }
    return null;
  }
  async function waitForQaTabs(){
    for(let i=0;i<120;i++){
      const tabs=$('.qa-list-tabs');
      if(tabs)return tabs;
      await sleep(100);
    }
    return null;
  }

  const isJapan=()=>document.body.classList.contains('country-japan')||window.FUNY_MAP_COUNTRY?.get?.()==='JP';
  function syncMarketSearchPlaceholder(){
    const input=$('#map-shop-search');if(!input)return;
    input.placeholder='카드샵 · 자판기 · 거래 매물 검색';
    input.setAttribute('aria-label','카드샵 · 자판기 · 거래 매물 검색');
  }
  function syncMarketTabLabels(){
    const tabs=$('.qa-list-tabs');if(!tabs)return;
    tabs.style.gridTemplateColumns='repeat(3,minmax(0,1fr))';
    const shop=tabs.querySelector('[data-tab="shops"]'),vending=tabs.querySelector('[data-tab="vending"]'),market=tabs.querySelector('[data-tab="market"]');
    const sl=shop?.querySelector('.qa-tab-label');if(sl)sl.textContent='TCG 카드샵';
    const vl=vending?.querySelector('.qa-tab-label');if(vl){vl.textContent='포켓몬 자판기';vl.classList.remove('qa-tab-label-vending')}
    const sc=shop?.querySelector('#qaShopCount');if(sc)sc.style.removeProperty('display');
    const vc=vending?.querySelector('#qaVendingCount');if(vc)vc.style.removeProperty('display');
    const ml=market?.querySelector('.qa-tab-label');if(ml)ml.textContent='TCG 거래';
    if(market&&!market.querySelector('#marketTestTabCount')){
      const inline=market.querySelector('.qa-tab-inline')||market;
      const count=document.createElement('span');count.className='qa-tab-count';count.id='marketTestTabCount';count.textContent='0';inline.appendChild(count);
    }
  }

  function listingMatches(x,filter=marketFilter){
    if(!['active','reserved'].includes(x.listing_status))return false;
    if(filter!=='all'&&x.item_type!==filter)return false;
    const q=($('#map-shop-search')?.value||'').trim().toLowerCase();
    if(q&&!([x.title,x.description,x.location_name,cats[x.tcg_category],categoryBadgeNames[x.tcg_category],types[x.item_type],providerName(x)].filter(Boolean).join(' ').toLowerCase().includes(q)))return false;
    return true;
  }
  function normalizePoint(v){
    if(!v)return null;
    const lat=typeof v.lat==='function'?v.lat():(v.lat??v.latitude??v.coords?.latitude);
    const lng=typeof v.lng==='function'?v.lng():(v.lng??v.longitude??v.coords?.longitude);
    const a=Number(lat),b=Number(lng);return Number.isFinite(a)&&Number.isFinite(b)?{lat:a,lng:b}:null;
  }
  function distanceKm(a,b){
    if(!a||!b)return Number.POSITIVE_INFINITY;
    const rad=x=>x*Math.PI/180,R=6371,dLat=rad(b.lat-a.lat),dLng=rad(b.lng-a.lng);
    const h=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;
    return 2*R*Math.asin(Math.min(1,Math.sqrt(h)));
  }
  async function ensureMarketSortOrigin(){
    if(marketSortOrigin)return marketSortOrigin;
    marketSortOrigin=normalizePoint(window.FUNY_CURRENT_LOCATION);if(marketSortOrigin)return marketSortOrigin;
    if(!navigator.geolocation)throw new Error('현재 위치 기능을 사용할 수 없습니다.');
    marketSortOrigin=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(
      p=>resolve({lat:Number(p.coords.latitude),lng:Number(p.coords.longitude)}),
      ()=>reject(new Error('가까운 순 정렬을 위해 위치 권한을 허용해주세요.')),
      {enableHighAccuracy:true,timeout:12000,maximumAge:60000}
    ));
    return marketSortOrigin;
  }
  function sortLabel(){return sortDefs.find(x=>x[0]===marketSort)?.[1]||'최신 순'}
  function sorted(list,filter=marketFilter){
    const out=list.filter(x=>listingMatches(x,filter)).slice();
    if(marketSort==='near'){
      const origin=marketSortOrigin||normalizePoint(window.FUNY_CURRENT_LOCATION);
      out.sort((a,b)=>distanceKm(origin,{lat:+a.latitude,lng:+a.longitude})-distanceKm(origin,{lat:+b.latitude,lng:+b.longitude}));
    }else if(marketSort==='low')out.sort((a,b)=>(a.price??Number.MAX_SAFE_INTEGER)-(b.price??Number.MAX_SAFE_INTEGER));
    else if(marketSort==='high')out.sort((a,b)=>(b.price??-1)-(a.price??-1));
    else out.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    return out;
  }
  function badgesHtml(x){
    return '<span class="market-card-badges">'+
      '<span class="market-card-badge provider '+esc(x.provider||'')+'">'+esc(providerName(x))+'</span>'+
      '<span class="market-card-badge category">'+esc(categoryBadgeNames[x.tcg_category]||'기타')+'</span>'+
      '<span class="market-card-badge type">'+esc(types[x.item_type]||'기타')+'</span>'+
      '</span>';
  }
  const isGenericMarketLocation=v=>!String(v||'').trim()||['거래 희망 위치','위치를 선택해주세요.','주소 확인 중...'].includes(String(v||'').trim());
  function displayAddress(x){
    const dbRoad=String(x?.road_address||'').trim();
    if(dbRoad&&!isGenericMarketLocation(dbRoad))return dbRoad;
    const dbLocation=String(x?.location_name||'').trim();
    if(dbLocation&&!isGenericMarketLocation(dbLocation))return dbLocation;
    const lat=Number(x?.latitude),lng=Number(x?.longitude);
    if(Number.isFinite(lat)&&Number.isFinite(lng)){
      if(x?._displayAddress&&!isGenericMarketLocation(x._displayAddress))return x._displayAddress;
      return '주소 확인 중...';
    }
    return '위치 정보 없음';
  }
  function cardHtml(x){
    return '<button type="button" class="market-card" data-market-id="'+esc(x.id)+'">'+
      (x.thumbnail_url?'<img class="market-card-thumb" src="'+esc(x.thumbnail_url)+'" alt="" loading="lazy" referrerpolicy="no-referrer">':'<span class="market-card-ph">NO IMAGE</span>')+
      '<span class="market-card-copy">'+badgesHtml(x)+'<strong class="market-card-title">'+esc(x.title)+'</strong><span class="market-card-price">'+money(x.price)+'</span><span class="market-card-location">⌖ '+esc(displayAddress(x))+'</span></span><span class="market-card-chev" aria-hidden="true">›</span></button>';
  }
  function renderListInto(el,filter){
    if(!el)return;
    const list=sorted(rows,filter);
    el.innerHTML=list.length?list.map(cardHtml).join(''):'<div class="market-empty">조건에 맞는 TCG 거래 매물이 없습니다.</div>';
    if(el.id==='marketOverlayList'){const count=$('#marketOverlayListCount');if(count)count.textContent='매물 '+list.length+'개'}
  }
  function updateCounts(){
    const all=rows.filter(x=>listingMatches(x,'all')&&['active','reserved'].includes(x.listing_status));
    if(layerChip){const count=layerChip.querySelector('.market-layer-count');if(count)count.textContent=String(all.length)}
    const tabCount=$('#marketTestTabCount');if(tabCount)tabCount.textContent=String(all.length);
    const fullCount=$('#marketOverlayCount');if(fullCount)fullCount.textContent=String(all.length);
  }

  function markerMetrics(){
    const map=window.FUNY_NAVER_MAP_API?.getMap?.();let z=11;try{z=map?.getZoom?.()??11}catch(_){}
    if(z<=9)return{pinW:16,pinH:22,markerW:20,markerH:28};
    const sizes={10:[18,25,22,31],11:[21,29,25,35],12:[24,33,28,39],13:[27,37,31,43],14:[30,41,34,47]},v=sizes[z]||[33,45,37,51];
    return{pinW:v[0],pinH:v[1],markerW:v[2],markerH:v[3]};
  }
  function markerIcon(selected=false){
    const m=markerMetrics(),vars='--pin-w:'+m.pinW+'px;--pin-h:'+m.pinH+'px;--marker-w:'+m.markerW+'px;--marker-h:'+m.markerH+'px';
    const content='<div class="market-map-pin'+(selected?' is-selected':'')+'" style="'+vars+'" aria-label="TCG 거래">'+
      '<svg viewBox="0 0 98 134" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+
      '<path d="M49 5C23 5 2 26 2 52c0 35 47 77 47 77s47-42 47-77C96 26 75 5 49 5Z" fill="#17151b"/>'+
      '<path d="M6 52h28M64 52h28" stroke="#fff" stroke-width="4" stroke-linecap="round"/>'+
      '<circle cx="49" cy="52" r="14.5" fill="#fff"/></svg><span class="market-map-pin-emoji" aria-hidden="true">🃏</span></div>';
    return{content,anchor:new naver.maps.Point(Math.round(m.markerW/2),m.markerH)};
  }
  function closePopup(){
    try{popup?.close()}catch(_){}
    popup=null;
    if(selectedMarkerId&&markers.has(selectedMarkerId))markers.get(selectedMarkerId).setIcon(markerIcon(false));
    selectedMarkerId=null;
  }
  function popupHtml(x){
    return '<div class="market-popup-bubble"><button type="button" class="market-popup-card" data-market-popup-id="'+esc(x.id)+'">'+
      (x.thumbnail_url?'<img src="'+esc(x.thumbnail_url)+'" alt="" referrerpolicy="no-referrer">':'<span class="market-popup-ph">NO IMAGE</span>')+
      '<span><strong class="market-popup-title">'+esc(x.title)+'</strong><span class="market-popup-price">'+money(x.price)+'</span><span class="market-popup-meta">⌖ '+esc(displayAddress(x))+'</span></span><span class="market-popup-chev">›</span></button></div>';
  }
  function selectMarker(x,m){
    const map=window.FUNY_NAVER_MAP_API?.getMap?.();if(!map)return;
    if(selectedMarkerId===x.id){closePopup();return}
    closePopup();selectedMarkerId=x.id;m.setIcon(markerIcon(true));
    popup=new naver.maps.InfoWindow({content:popupHtml(x),borderWidth:0,backgroundColor:'transparent',anchorSize:new naver.maps.Size(0,0),pixelOffset:new naver.maps.Point(0,-8)});
    popup.open(map,m);
    if(x?._addressResolved!==true)reverseMarketAddress(x).then(()=>{if(selectedMarkerId===x.id){try{popup?.close()}catch(_){}popup=new naver.maps.InfoWindow({content:popupHtml(x),borderWidth:0,backgroundColor:'transparent',anchorSize:new naver.maps.Size(0,0),pixelOffset:new naver.maps.Point(0,-8)});popup.open(map,m);renderListInto($('#marketSheetList'),marketFilter)}}).catch(()=>{});
  }
  function clearMarkers(){
    closePopup();markers.forEach(m=>m.setMap(null));markers.clear();
  }
  async function syncMarkers(){
    const map=await waitForMap();if(!map)return;
    if(!marketLayerOn||isJapan()){markers.forEach(m=>m.setMap(null));closePopup();return}
    const visible=rows.filter(x=>listingMatches(x,'all')&&Number.isFinite(+x.latitude)&&Number.isFinite(+x.longitude)&&['active','reserved'].includes(x.listing_status));
    const ids=new Set(visible.map(x=>x.id));
    markers.forEach((m,id)=>{if(!ids.has(id)){m.setMap(null);markers.delete(id)}});
    visible.forEach(x=>{
      let m=markers.get(x.id);
      if(!m){
        m=new naver.maps.Marker({map,position:new naver.maps.LatLng(+x.latitude,+x.longitude),title:x.title,zIndex:130,icon:markerIcon(false)});
        naver.maps.Event.addListener(m,'click',()=>selectMarker(x,m));markers.set(x.id,m);
      }else{m.setMap(map);m.setIcon(markerIcon(selectedMarkerId===x.id))}
    });
  }

  function syncLayerOrder(){
    const track=$('#filters');if(!track||isJapan())return;
    const desired=[
      track.querySelector('.qa-layer-chip[data-layer="shops"]'),
      track.querySelector('.qa-layer-chip[data-layer="events"]'),
      track.querySelector('.qa-layer-chip[data-layer="vending"]'),
      track.querySelector('#liveTempLayer'),
      layerChip?.isConnected?layerChip:track.querySelector('.market-layer-chip')
    ].filter(Boolean);
    if(desired.length<2)return;
    const wanted=new Set(desired),current=[...track.children].filter(el=>wanted.has(el));
    const same=current.length===desired.length&&current.every((el,i)=>el===desired[i]);
    if(same)return;
    desired.forEach(el=>track.appendChild(el));
  }
  function observeLayerOrder(){
    const track=$('#filters');if(!track)return;
    if(layerOrderObserver){try{layerOrderObserver.disconnect()}catch(_){}}
    layerOrderObserver=new MutationObserver(()=>{
      if(layerOrderQueued)return;layerOrderQueued=true;
      requestAnimationFrame(()=>{layerOrderQueued=false;syncLayerOrder()});
    });
    layerOrderObserver.observe(track,{childList:true});
    syncLayerOrder();
  }

  function ensureLayerChip(){
    const track=$('#filters');if(!track||isJapan()){layerChip?.remove();layerChip=null;return}
    if(layerChip&&layerChip.isConnected){updateCounts();syncLayerOrder();return}
    layerChip=document.createElement('button');layerChip.type='button';layerChip.className='market-layer-chip live-temp-layer'+(marketLayerOn?' active':'');
    layerChip.setAttribute('aria-pressed',marketLayerOn?'true':'false');
    layerChip.innerHTML='<span class="market-layer-emoji" aria-hidden="true">🃏</span><span>거래</span><span class="market-layer-count qa-layer-count">0</span>';
    layerChip.onclick=e=>{e.preventDefault();e.stopPropagation();marketLayerOn=!marketLayerOn;layerChip.classList.toggle('active',marketLayerOn);layerChip.setAttribute('aria-pressed',marketLayerOn?'true':'false');syncMarkers()};
    track.appendChild(layerChip);updateCounts();syncLayerOrder();
  }
  function sortMenuHtml(scope){
    return '<div class="list-sort market-sort-wrap '+scope+'"><button type="button" class="list-sort-button market-sort-button" data-market-sort-button aria-haspopup="menu" aria-expanded="false"><span data-market-sort-label>'+sortLabel()+'</span><svg class="list-sort-chevron market-sort-chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6.25 8 10l4-3.75"/></svg></button><div class="list-sort-menu market-sort-menu" role="menu">'+sortDefs.map(([v,l])=>'<button type="button" class="'+(v===marketSort?'active':'')+'" data-market-sort-value="'+v+'">'+l+'</button>').join('')+'</div></div>';
  }
  function filterStripHtml(scope){
    const withEmoji=String(scope||'').includes('overlay');
    return '<div class="market-filter-strip '+scope+'">'+typeDefs.map(([v,l])=>'<button type="button" class="market-filter-chip'+(v==='all'?' active':'')+'" data-market-filter="'+v+'">'+(withEmoji?(typeEmojis[v]+' '):'')+l+'</button>').join('')+'</div>';
  }
  function marketSheetControlsHtml(){
    return '<div class="market-sheet-tools">'+sortMenuHtml('market-sheet-sort')+'<span class="qa-tools-divider" aria-hidden="true"></span>'+filterStripHtml('market-sheet-filter')+'</div>';
  }
  function syncSortUI(){
    $$('[data-market-sort-label]').forEach(x=>x.textContent=sortLabel());
    $$('[data-market-sort-value]').forEach(x=>x.classList.toggle('active',x.dataset.marketSortValue===marketSort));
  }
  function closeSortMenus(except=null){
    $$('.market-sort-wrap.open').forEach(w=>{if(w===except)return;w.classList.remove('open');w.querySelector('[data-market-sort-button]')?.setAttribute('aria-expanded','false')});
  }
  async function setMarketSort(value){
    if(value==='near'){
      try{await ensureMarketSortOrigin()}catch(e){alert(String(e?.message||e));return false}
    }
    marketSort=sortDefs.some(x=>x[0]===value)?value:'latest';syncSortUI();closeSortMenus();
    renderListInto($('#marketSheetList'),marketFilter);renderListInto($('#marketOverlayList'),overlayFilter);
    return true;
  }

  function setupMarketPanel(tabs){
    if(marketPanel?.isConnected)return;
    marketTabBtn=document.createElement('button');marketTabBtn.type='button';marketTabBtn.className='qa-list-tab market-list-tab';marketTabBtn.dataset.tab='market';
    marketTabBtn.innerHTML='<span class="qa-tab-inline"><span class="qa-tab-label">TCG 거래</span><span class="qa-tab-count" id="marketTestTabCount">0</span></span>';
    tabs.appendChild(marketTabBtn);
    marketTabBtn.addEventListener('pointerdown',()=>{if(!isJapan())document.body.classList.add('market-tab-switching')});
    marketTabBtn.addEventListener('pointercancel',()=>document.body.classList.remove('market-tab-switching'));
    marketPanel=document.createElement('section');marketPanel.className='market-sheet-panel market-test-only';marketPanel.hidden=true;
    marketPanel.innerHTML=marketSheetControlsHtml()+'<div class="market-sheet-list" id="marketSheetList"></div>';
    $('.list-wrap')?.appendChild(marketPanel);
    tabs.addEventListener('click',e=>{
      const b=e.target.closest('[data-tab]');if(!b)return;
      if(b.dataset.tab==='market'){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();activateMarketTab()}
      else exitMarketTab();
    },true);
    bindFilterControls(marketPanel,()=>{marketFilter=marketPanel.querySelector('.market-filter-chip.active')?.dataset.marketFilter||'all';renderListInto($('#marketSheetList'),marketFilter)});
    bindHorizontalScrollers();
    syncMarketTabLabels();updateCounts();
  }
  function enforceMarketTabExclusiveUI(){
    if(!marketTabActive)return;
    const hide=['.qa-shop-tools','.list-heading-v2','.shop-request-list-banner','#shop-list','#empty'];
    hide.forEach(sel=>document.querySelectorAll(sel).forEach(el=>el.style.setProperty('display','none','important')));
    const vp=$('.qa-vending-panel');if(vp)vp.hidden=true;
    if(marketPanel)marketPanel.hidden=false;
  }
  function restoreMarketTabExclusiveUI(){
    const restore=['.qa-shop-tools','.list-heading-v2','.shop-request-list-banner','#shop-list','#empty'];
    restore.forEach(sel=>document.querySelectorAll(sel).forEach(el=>el.style.removeProperty('display')));
  }

  function activateMarketTab(){
    if(isJapan())return;
    marketTabActive=true;marketLayerOn=true;layerChip?.classList.add('active');layerChip?.setAttribute('aria-pressed','true');
    document.body.classList.add('market-tab-active');document.body.classList.remove('market-tab-switching','qa-vending-tab-active');
    document.querySelectorAll('.qa-list-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab==='market'));
    document.querySelectorAll('.qa-shop-only').forEach(el=>el.style.setProperty('display','none','important'));
    const shopTools=$('.qa-shop-tools');if(shopTools)shopTools.style.setProperty('display','none','important');
    const vp=$('.qa-vending-panel');if(vp)vp.hidden=true;
    if(marketPanel)marketPanel.hidden=false;
    enforceMarketTabExclusiveUI();
    renderListInto($('#marketSheetList'),marketFilter);
    hydrateMarketAddresses(rows).then(()=>renderListInto($('#marketSheetList'),marketFilter)).catch(()=>{});
    syncMarkers();
  }
  function exitMarketTab(){
    if(!marketTabActive)return;
    marketTabActive=false;document.body.classList.remove('market-tab-active','market-tab-switching');if(marketPanel)marketPanel.hidden=true;
    document.querySelectorAll('.qa-shop-only').forEach(el=>el.style.removeProperty('display'));
    const shopTools=$('.qa-shop-tools');if(shopTools)shopTools.style.removeProperty('display');
    restoreMarketTabExclusiveUI();
  }
  function bindFilterControls(root,onChange){
    root.addEventListener('click',async e=>{
      const f=e.target.closest('[data-market-filter]');
      if(f){root.querySelectorAll('[data-market-filter]').forEach(x=>x.classList.remove('active'));f.classList.add('active');onChange();return}
      const sortButton=e.target.closest('[data-market-sort-button]');
      if(sortButton){
        e.preventDefault();e.stopPropagation();
        const wrap=sortButton.closest('.market-sort-wrap'),open=!wrap.classList.contains('open');
        closeSortMenus(open?wrap:null);wrap.classList.toggle('open',open);sortButton.setAttribute('aria-expanded',open?'true':'false');
        if(open&&wrap.classList.contains('market-sheet-sort')){
          const menu=wrap.querySelector('.market-sort-menu'),r=sortButton.getBoundingClientRect();
          if(menu){menu.style.setProperty('left',Math.round(r.left)+'px','important');menu.style.setProperty('top',Math.round(r.bottom+6)+'px','important');}
        }
        return;
      }
      const sortValue=e.target.closest('[data-market-sort-value]');
      if(sortValue){e.preventDefault();e.stopPropagation();await setMarketSort(sortValue.dataset.marketSortValue);return}
    });
  }

  function enableHorizontalScroller(el){
    if(!el||el.dataset.marketHorizontalScroll==='1')return;
    el.dataset.marketHorizontalScroll='1';
    let tracking=false,dragging=false,suppressClick=false,startX=0,startLeft=0,pointerId=null;
    el.addEventListener('pointerdown',e=>{
      if(e.pointerType!=='mouse'||e.button!==0)return;
      tracking=true;dragging=false;suppressClick=false;pointerId=e.pointerId;startX=e.clientX;startLeft=el.scrollLeft;
    });
    el.addEventListener('pointermove',e=>{
      if(!tracking||e.pointerId!==pointerId)return;
      const dx=e.clientX-startX;
      if(!dragging&&Math.abs(dx)>6){
        dragging=true;suppressClick=true;
        try{el.setPointerCapture?.(e.pointerId)}catch(_){}
      }
      if(dragging){e.preventDefault();el.scrollLeft=startLeft-dx}
    },{passive:false});
    const end=e=>{
      if(!tracking)return;
      tracking=false;
      if(dragging){try{el.releasePointerCapture?.(pointerId)}catch(_){}}
      dragging=false;pointerId=null;
      setTimeout(()=>{suppressClick=false},0);
    };
    el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
    el.addEventListener('click',e=>{if(suppressClick){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation()}},true);
    el.addEventListener('wheel',e=>{if(el.scrollWidth<=el.clientWidth+2)return;if(Math.abs(e.deltaY)<=Math.abs(e.deltaX))return;e.preventDefault();el.scrollLeft+=e.deltaY},{passive:false});
  }
  function bindHorizontalScrollers(){
    ['#filters','.qa-shop-tools','.qa-vending-tools','.market-sheet-tools','.market-overlay-filter'].forEach(sel=>document.querySelectorAll(sel).forEach(enableHorizontalScroller));
  }

  function compactOnScroll(target,scroller){
    if(!target||!scroller)return;let timer=0;
    scroller.addEventListener('scroll',()=>{if(target.classList.contains('open'))return;target.classList.add('is-scrolling');clearTimeout(timer);timer=setTimeout(()=>target.classList.remove('is-scrolling'),850)},{passive:true});
  }
  function buildFab(){
    const home=$('#home-view');if(!home||$('#marketFabWrap'))return;
    const wrap=document.createElement('div');wrap.id='marketFabWrap';wrap.className='market-fab-wrap';
    wrap.innerHTML='<div class="market-fab-dim" hidden></div><div class="market-fab-menu" hidden>'+
      '<a class="market-fab-action" href="live-pin.html"><span><b class="market-fab-action-emoji">⚡</b> LIVE PIN</span><span>›</span></a>'+
      '<button type="button" class="market-fab-action" data-open-market-overlay><span><b class="market-fab-action-emoji">🃏</b> TCG 거래</span><span>›</span></button></div>'+
      '<button type="button" class="market-fab-main" aria-label="제보 · 매물 등록" aria-expanded="false"><span class="market-fab-plus">＋</span><span class="market-fab-label">제보 · 매물 등록</span></button>';
    home.appendChild(wrap);
    const menu=wrap.querySelector('.market-fab-menu'),main=wrap.querySelector('.market-fab-main'),dim=wrap.querySelector('.market-fab-dim');
    const setOpen=open=>{menu.hidden=!open;dim.hidden=!open;wrap.classList.toggle('open',open);main.classList.toggle('open',open);main.setAttribute('aria-expanded',open?'true':'false');wrap.classList.remove('is-scrolling');wrap.querySelector('.market-fab-plus').textContent=open?'×':'＋'};
    main.onclick=()=>setOpen(menu.hidden);
    dim.onclick=()=>setOpen(false);
    wrap.querySelector('.market-fab-action[href]')?.addEventListener('click',()=>setOpen(false));
    wrap.querySelector('[data-open-market-overlay]').onclick=()=>{setOpen(false);openOverlay()};
    compactOnScroll(wrap,window);compactOnScroll(wrap,$('.list-wrap'));
  }

  function buildOverlay(){
    if($('#marketOverlay'))return;
    const el=document.createElement('section');el.id='marketOverlay';el.className='market-overlay';el.hidden=true;
    el.innerHTML='<header class="market-overlay-head"><div class="market-overlay-title"><span class="market-overlay-symbol">'+funySymbol+'</span><strong>TCG 거래</strong></div><button type="button" class="market-overlay-close" aria-label="닫기">×</button></header>'+
      '<div class="market-overlay-sticky-tools"><div class="market-overlay-filter-row">'+filterStripHtml('market-overlay-filter')+'</div>'+
      '<div class="market-overlay-listbar"><span id="marketOverlayListCount">매물 0개</span>'+sortMenuHtml('market-overlay-sort')+'</div></div>'+
      '<main class="market-overlay-body"><div class="market-sheet-list" id="marketOverlayList"></div></main>'+
      '<button type="button" class="market-overlay-register" data-open-market-register><span class="market-overlay-register-plus">＋</span><span class="market-overlay-register-label">매물 등록</span></button>';
    document.body.appendChild(el);
    el.querySelector('.market-overlay-close').onclick=closeOverlay;
    el.querySelector('[data-open-market-register]').onclick=openRegister;
    bindFilterControls(el,()=>{overlayFilter=el.querySelector('.market-overlay-filter .market-filter-chip.active')?.dataset.marketFilter||'all';renderListInto($('#marketOverlayList'),overlayFilter)});
    bindHorizontalScrollers();
    let lastY=0,ticking=false;
    el.addEventListener('scroll',()=>{
      if(ticking)return;ticking=true;
      requestAnimationFrame(()=>{
        const y=el.scrollTop,dy=y-lastY,tools=el.querySelector('.market-overlay-sticky-tools');
        if(tools){
          if(y<=8)tools.classList.remove('is-hidden');
          else if(dy>4)tools.classList.add('is-hidden');
          else if(dy<-4)tools.classList.remove('is-hidden');
        }
        lastY=y;ticking=false;
      });
    },{passive:true});
  }
  function openOverlay(){
    buildOverlay();const el=$('#marketOverlay');el.hidden=false;el.scrollTop=0;el.querySelector('.market-overlay-sticky-tools')?.classList.remove('is-hidden');el.querySelector('.market-overlay-register')?.classList.remove('is-scrolling');document.body.style.overflow='hidden';
    renderListInto($('#marketOverlayList'),overlayFilter);syncSortUI();updateCounts();
  }
  function closeOverlay(){const el=$('#marketOverlay');if(el)el.hidden=true;closeSortMenus();document.body.style.overflow=''}

  function buildRegister(){
    if($('#marketRegisterOverlay'))return;
    const el=document.createElement('div');el.id='marketRegisterOverlay';el.className='market-register-overlay';el.hidden=true;
    el.innerHTML='<section class="market-register-sheet"><div class="market-register-handle"></div><header class="market-register-head"><strong>매물 등록</strong><button type="button" class="market-register-close" aria-label="닫기">×</button></header><div class="market-register-scroll">'+
      '<div class="market-register-policy"><strong>개인 판매자 전용</strong><span>FUNY PIN은 외부 플랫폼에 등록한 본인 매물을 추가 노출하는 기능만 제공합니다. 실제 거래는 원본 플랫폼에서 진행됩니다.</span></div>'+
      '<div class="market-form-section"><label class="market-form-label">카테고리</label><select id="marketRegisterCategory" class="market-select"><option value="pokemon">포켓몬스터</option><option value="onepiece">원피스</option><option value="dragonball">드래곤볼</option><option value="other">기타</option></select></div>'+
      '<div class="market-form-section"><span class="market-form-label">구분</span><div class="market-type-row">'+Object.entries(types).map(([v,l])=>'<button type="button" class="market-type-btn'+(v==='single'?' active':'')+'" data-register-type="'+v+'">'+l+'</button>').join('')+'</div></div>'+
      '<div class="market-form-section"><label class="market-form-label" for="marketRegisterUrl">외부 플랫폼 매물 링크</label><div class="market-url-row"><input id="marketRegisterUrl" class="market-url-input" value="" placeholder="당근 · 번개장터 · BREAK 매물 URL"><button id="marketRegisterLoad" class="market-url-load" type="button">불러오기</button></div><div id="marketPreviewStatus" class="market-preview-status">지원 플랫폼의 본인 매물 링크를 입력해주세요.</div><div id="marketPreview" class="market-preview"><div id="marketPreviewProvider" class="market-preview-provider"></div><div id="marketPreviewImages" class="market-preview-images"></div><div id="marketPreviewTitle" class="market-preview-title"></div><div id="marketPreviewPrice" class="market-preview-price"></div><div id="marketPreviewDesc" class="market-preview-desc"></div></div></div>'+
      '<div class="market-form-section"><span class="market-form-label">판매자 인증</span><div class="market-test-auth-box"><div class="market-test-auth-row"><span>PASS 본인인증</span><b>TEST PASS ✓</b></div><div class="market-test-auth-row"><span>외부 플랫폼 판매자 인증</span><b id="marketExternalTestPass">TEST PASS ✓</b></div><small>비공개 테스트 전용 자동 PASS입니다. PUBLIC OPEN 전 실제 PASS + 플랫폼 인증으로 전환됩니다.</small></div><div class="market-external-verify-card market-external-verify-legacy" hidden><div id="marketExternalVerifyStatus" class="market-external-verify-status"></div><button id="marketExternalVerifyStart" class="market-external-verify-start" type="button" disabled>외부 판매자 인증 시작</button><div id="marketExternalVerifyChallenge" class="market-external-verify-challenge" hidden><span>아래 코드를 외부 매물 설명 마지막에 잠시 추가해주세요.</span><div class="market-external-code-row"><code id="marketExternalVerifyCode"></code><button id="marketExternalVerifyCopy" type="button">복사</button></div><button id="marketExternalVerifyConfirm" class="market-external-verify-confirm" type="button">인증 확인</button></div></div></div>'+
      '<div class="market-form-section"><span class="market-form-label">거래 희망 위치</span><div class="market-location-tip">지도를 터치해 핀을 선택해주세요. 현재 위치는 선택을 돕는 용도로만 사용합니다.</div><button id="marketRegisterHere" class="market-register-here" type="button" style="width:100%;margin-bottom:8px">현재 위치로 이동</button><div class="market-register-map-wrap"><div id="marketRegisterMap"></div></div></div>'+
      '<div class="market-form-section market-consent-box"><span class="market-form-label">등록 확인</span>'+
      '<label class="market-consent-item"><input id="marketConsentIndividual" type="checkbox"><span>사업자가 아닌 <b>개인 판매자</b>이며 영업 목적의 판매가 아님을 확인합니다.</span></label>'+
      '<label class="market-consent-item"><input id="marketConsentRights" type="checkbox"><span>해당 외부 매물의 판매자이며, 사진·설명을 FUNY PIN에 재게시할 권한이 있음을 확인합니다.</span></label>'+
      '<label class="market-consent-item"><input id="marketConsentExternal" type="checkbox"><span>FUNY PIN은 거래 당사자가 아니며, 실제 거래·결제·배송·환불은 <b>원본 외부 플랫폼</b>에서 진행함을 확인합니다.</span></label></div>'+
      '<div id="marketRegisterError" class="market-register-error"></div></div><button id="marketRegisterSubmit" class="market-register-submit" type="button" disabled>매물 등록하기</button></section>';
    document.body.appendChild(el);
    el.querySelector('.market-register-close').onclick=closeRegister;
    el.addEventListener('click',e=>{if(e.target===el)closeRegister()});
    el.querySelectorAll('[data-register-type]').forEach(b=>b.onclick=()=>{el.querySelectorAll('[data-register-type]').forEach(x=>x.classList.remove('active'));b.classList.add('active');registerType=b.dataset.registerType});
    $('#marketRegisterLoad').onclick=loadPreview;
    $('#marketRegisterUrl').addEventListener('keydown',e=>{if(e.key==='Enter')loadPreview()});
    $('#marketRegisterUrl').addEventListener('input',()=>{if(registerPreviewUrl&&$('#marketRegisterUrl').value.trim()!==registerPreviewUrl){registerProduct=null;$('#marketPreview')?.classList.remove('show');resetExternalVerification('URL이 변경되었습니다. 매물 정보를 다시 불러와주세요.');syncRegisterSubmitState()}});
    $('#marketExternalVerifyStart').onclick=startExternalSellerVerification;
    $('#marketExternalVerifyConfirm').onclick=confirmExternalSellerVerification;
    $('#marketExternalVerifyCopy').onclick=copyExternalVerificationCode;
    $('#marketRegisterHere').onclick=moveRegisterToCurrent;
    ['marketConsentIndividual','marketConsentRights','marketConsentExternal'].forEach(id=>$('#'+id)?.addEventListener('change',syncRegisterSubmitState));
    $('#marketRegisterSubmit').onclick=submitRegister;
  }
  async function openRegister(){
    buildRegister();const el=$('#marketRegisterOverlay');el.hidden=false;document.body.style.overflow='hidden';
    if(!registerMap){
      const main=await waitForMap(),center=main?.getCenter?.();
      const initial=center?new naver.maps.LatLng(center.lat(),center.lng()):new naver.maps.LatLng(37.5665,126.9780);
      registerMap=new naver.maps.Map('marketRegisterMap',{center:initial,zoom:15,minZoom:7,maxZoom:19,zoomControl:false,mapDataControl:false,scaleControl:false,logoControl:false});
      const choose=e=>selectRegisterLocation(e.coord.lat(),e.coord.lng());
      naver.maps.Event.addListener(registerMap,'click',choose);
      naver.maps.Event.addListener(registerMap,'longtap',choose);
      setTimeout(()=>naver.maps.Event.trigger(registerMap,'resize'),120);
    }else setTimeout(()=>naver.maps.Event.trigger(registerMap,'resize'),80);
    syncRegisterSubmitState();
  }
  function closeRegister(){const el=$('#marketRegisterOverlay');if(el)el.hidden=true;if($('#marketOverlay')?.hidden!==false)document.body.style.overflow=''}
  function setRegisterError(msg){const el=$('#marketRegisterError');if(!el)return;el.textContent=msg||'';el.style.display=msg?'block':'none'}
  function registerConsentsOk(){return !!($('#marketConsentIndividual')?.checked&&$('#marketConsentRights')?.checked&&$('#marketConsentExternal')?.checked)}
  function syncRegisterSubmitState(){const btn=$('#marketRegisterSubmit');if(btn)btn.disabled=!(registerProduct&&registerCoordinate&&registerConsentsOk()&&registerExternalVerified)}
  function resetExternalVerification(message='외부 매물을 확인해주세요.'){
    registerExternalVerified=!!(MARKET_TEST_AUTH_BYPASS&&registerProduct);registerChallengeId='';
    const status=$('#marketExternalVerifyStatus'),start=$('#marketExternalVerifyStart'),challenge=$('#marketExternalVerifyChallenge'),code=$('#marketExternalVerifyCode'),testPass=$('#marketExternalTestPass');
    if(status){status.textContent=message;status.classList.toggle('verified',registerExternalVerified)}
    if(start)start.disabled=MARKET_TEST_AUTH_BYPASS||!registerProduct;
    if(challenge)challenge.hidden=true;
    if(code)code.textContent='';
    if(testPass)testPass.textContent=registerProduct?'TEST PASS ✓':'TEST PASS ✓';
    syncRegisterSubmitState();
  }
  function setExternalVerified(message){
    registerExternalVerified=true;registerChallengeId='';
    const status=$('#marketExternalVerifyStatus'),start=$('#marketExternalVerifyStart'),challenge=$('#marketExternalVerifyChallenge');
    if(status){status.textContent=message;status.classList.add('verified')}
    if(start)start.disabled=true;
    if(challenge)challenge.hidden=true;
    syncRegisterSubmitState();
  }
  async function startExternalSellerVerification(){
    if(MARKET_TEST_AUTH_BYPASS){setExternalVerified('TEST PASS · PASS 본인인증 + 외부 플랫폼 판매자 인증');return}
    if(!registerProduct)return;
    const url=registerPreviewUrl||$('#marketRegisterUrl')?.value.trim();if(!url)return;
    const btn=$('#marketExternalVerifyStart');if(btn){btn.disabled=true;btn.textContent='인증 준비 중...'}
    setRegisterError('');
    try{
      const {data,error}=await A.client.functions.invoke('market-external-seller-verify-test',{body:{action:'start',url}});
      if(error)throw error;if(!data?.ok)throw Error(data?.error||'판매자 인증을 시작하지 못했습니다.');
      if(data.already_verified){setExternalVerified(providerName(registerProduct)+' 판매자 계정 인증 완료 ✓ · 추가 인증 없이 등록할 수 있습니다.');return}
      registerChallengeId=data.challenge_id||'';
      const code=$('#marketExternalVerifyCode'),challenge=$('#marketExternalVerifyChallenge'),status=$('#marketExternalVerifyStatus');
      if(code)code.textContent=data.verification_code||'';
      if(challenge)challenge.hidden=false;
      if(status)status.textContent=(data.seller_verification_scope==='account'?'플랫폼 계정 최초 인증':'이 매물 소유 인증')+'이 필요합니다.';
    }catch(e){setRegisterError(String(e?.message||e))}
    finally{if(btn&&!registerExternalVerified){btn.disabled=false;btn.textContent='외부 판매자 인증 시작'}}
  }
  async function confirmExternalSellerVerification(){
    if(MARKET_TEST_AUTH_BYPASS){setExternalVerified('TEST PASS · PASS 본인인증 + 외부 플랫폼 판매자 인증');return}
    if(!registerChallengeId)return;
    const url=registerPreviewUrl||$('#marketRegisterUrl')?.value.trim(),btn=$('#marketExternalVerifyConfirm');
    if(btn){btn.disabled=true;btn.textContent='확인 중...'}setRegisterError('');
    try{
      const {data,error}=await A.client.functions.invoke('market-external-seller-verify-test',{body:{action:'verify',challenge_id:registerChallengeId,url}});
      if(error)throw error;if(!data?.ok||!data?.verified)throw Error(data?.error||'판매자 인증에 실패했습니다.');
      setExternalVerified(data.account_verified?providerName(registerProduct)+' 판매자 계정 인증 완료 ✓':'이 외부 매물의 판매자 인증 완료 ✓');
    }catch(e){setRegisterError(String(e?.message||e))}
    finally{if(btn){btn.disabled=false;btn.textContent='인증 확인'}}
  }
  async function copyExternalVerificationCode(){
    const value=$('#marketExternalVerifyCode')?.textContent?.trim();if(!value)return;
    try{await navigator.clipboard.writeText(value);const b=$('#marketExternalVerifyCopy');if(b){const old=b.textContent;b.textContent='복사됨';setTimeout(()=>b.textContent=old,1000)}}catch(_){prompt('인증코드를 복사해주세요.',value)}
  }
  function syncPurchaseMode(x){
    const section=$('#marketDirectBuySection'),help=$('#marketDirectBuyHelp'),buttons=[...document.querySelectorAll('#marketDirectBuySection [data-direct-buy]')];
    if(!section)return;
    registerDirectBuy=x?.direct_buy_available===true;
    buttons.forEach(b=>{b.classList.toggle('active',(b.dataset.directBuy==='true')===registerDirectBuy);b.disabled=x?.provider!=='daangn'});
    if(x?.provider==='daangn'){
      help.textContent='당근 바로구매 여부는 자동 판별이 어려워 실제 매물 설정과 동일하게 선택해주세요.';
    }else if(x?.provider==='break'){
      help.textContent=x?.direct_buy_available?'BREAK 즉시구매 상품으로 자동 확인했습니다.':'BREAK 원본 매물에서 거래합니다.';
    }else if(x?.provider==='bunjang'){
      help.textContent='번개장터 원본 매물에서 거래합니다. 안전결제 여부는 FUNY PIN에서 임의 판정하지 않습니다.';
    }else{
      help.textContent='매물 정보를 먼저 불러오면 플랫폼에 맞게 적용됩니다.';
    }
  }
  function renderPreview(x){
    registerProduct=x;registerPreviewUrl=$('#marketRegisterUrl')?.value.trim()||'';$('#marketPreview').classList.add('show');
    const arr=[...(Array.isArray(x.images)?x.images:[]),x.image].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).slice(0,20);
    $('#marketPreviewImages').innerHTML=arr.length?arr.map(u=>'<img class="market-preview-image" src="'+esc(u)+'" alt="" referrerpolicy="no-referrer">').join(''):'<span class="market-preview-ph">NO IMAGE</span>';
    $('#marketPreviewProvider').textContent='출처 · '+providerName(x);
    $('#marketPreviewTitle').textContent=x.title||'상품명 없음';$('#marketPreviewPrice').textContent=x.price||'가격 정보 없음';$('#marketPreviewDesc').textContent=x.description||'상품 설명 없음';registerDirectBuy=false;resetExternalVerification(providerName(x)+' 매물 확인 완료 · 테스트 인증 자동 PASS');if(MARKET_TEST_AUTH_BYPASS)setExternalVerified('TEST PASS · PASS 본인인증 + '+providerName(x)+' 판매자 인증');
  }
  async function loadPreview(){
    const url=$('#marketRegisterUrl')?.value.trim();if(!url)return;
    setRegisterError('');registerProduct=null;registerPreviewUrl='';resetExternalVerification('매물 정보를 확인하는 중...');$('#marketRegisterLoad').disabled=true;$('#marketPreviewStatus').textContent='외부 매물 정보를 불러오는 중...';
    try{const {data,error}=await A.client.functions.invoke('market-listing-preview-test',{body:{url}});if(error)throw error;if(!data?.ok)throw Error(data?.error||'매물 정보를 불러오지 못했습니다.');renderPreview(data);$('#marketPreviewStatus').textContent=providerName(data)+' · 자동 추출 완료 · 이미지 '+((data.images||[]).length||1)+'장'}
    catch(e){registerProduct=null;$('#marketPreview')?.classList.remove('show');syncRegisterSubmitState();setRegisterError(String(e?.message||e));$('#marketPreviewStatus').textContent='매물 정보를 불러오지 못했습니다.'}
    finally{$('#marketRegisterLoad').disabled=false}
  }
  function selectRegisterLocation(lat,lng){
    registerLat=+Number(lat).toFixed(6);registerLng=+Number(lng).toFixed(6);registerCoordinate={lat:registerLat,lng:registerLng};registerLocation='';
    const pos=new naver.maps.LatLng(registerLat,registerLng);
    if(!registerPin)registerPin=new naver.maps.Marker({map:registerMap,position:pos,zIndex:220,title:'선택한 위치'});
    else{registerPin.setPosition(pos);registerPin.setMap(registerMap)}
    syncRegisterSubmitState();
    clearTimeout(reverseTimer);reverseTimer=setTimeout(async()=>{
      try{registerLocation=await reverseMarketRoadAddress(registerLat,registerLng)||''}catch(_){registerLocation=''}
      syncRegisterSubmitState();
    },180);
  }
  function clearRegisterCurrent(){
    try{registerCurrentPin?.setMap(null)}catch(_){}
    try{registerCurrentAccuracy?.setMap(null)}catch(_){}
    registerCurrentPin=null;registerCurrentAccuracy=null;
  }
  function showRegisterCurrent(lat,lng,accuracy){
    clearRegisterCurrent();const pos=new naver.maps.LatLng(lat,lng);
    registerCurrentAccuracy=new naver.maps.Circle({map:registerMap,center:pos,radius:Math.max(10,Number(accuracy)||20),strokeColor:'#7057C7',strokeOpacity:.22,strokeWeight:1,fillColor:'#7057C7',fillOpacity:.08,clickable:false,zIndex:80});
    registerCurrentPin=new naver.maps.Marker({map:registerMap,position:pos,zIndex:130,title:'현재 위치',icon:{content:'<div style="width:18px;height:18px;border:4px solid #fff;border-radius:50%;background:#7057C7;box-shadow:0 1px 8px rgba(73,52,123,.35)"></div>',anchor:new naver.maps.Point(9,9)}});
  }
  function moveRegisterToCurrent(){
    if(!navigator.geolocation){alert('현재 위치 기능을 사용할 수 없습니다.');return}
    const status=$('#marketRegisterCoord');if(status)status.textContent='현재 위치를 확인하는 중...';
    navigator.geolocation.getCurrentPosition(p=>{const lat=Number(p.coords.latitude),lng=Number(p.coords.longitude);showRegisterCurrent(lat,lng,p.coords.accuracy);registerMap.setCenter(new naver.maps.LatLng(lat,lng));if(registerMap.getZoom()<16)registerMap.setZoom(16);if(status)status.textContent=registerCoordinate?registerLat.toFixed(6)+', '+registerLng.toFixed(6):'현재 위치를 표시했습니다. 지도에서 거래 위치를 선택해주세요.'},()=>{if(status)status.textContent=registerCoordinate?registerLat.toFixed(6)+', '+registerLng.toFixed(6):'위치를 선택해주세요.';alert('위치 권한을 확인해주세요.')},{enableHighAccuracy:true,timeout:15000,maximumAge:0});
  }
  async function submitRegister(){
    if(!registerProduct)return;if(!registerExternalVerified){setRegisterError('외부 플랫폼 판매자 인증을 완료해주세요.');return}if(!registerCoordinate){setRegisterError('지도에서 거래 희망 위치를 선택해주세요.');return}if(!registerConsentsOk()){setRegisterError('개인 판매자 및 콘텐츠 권리·외부 플랫폼 거래 확인에 모두 동의해주세요.');return}setRegisterError('');const btn=$('#marketRegisterSubmit');btn.disabled=true;btn.textContent='등록 중...';
    try{
      const profile=await A.getProfile(),user=A.session.user,nick=profile?.nickname||user.user_metadata?.nickname||user.user_metadata?.name||('FUNY회원'+String(user.id).replace(/-/g,'').slice(-4).toUpperCase());
      const raw=String(registerProduct.price_raw||'').replace(/,/g,'').trim(),price=raw&&Number.isFinite(Number(raw))?Math.round(Number(raw)):null;
      const urls=[...(Array.isArray(registerProduct.images)?registerProduct.images:[]),registerProduct.image].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i);
      const agreedAt=new Date().toISOString();
      const provider=registerProduct.provider||'daangn',externalListingId=registerProduct.external_listing_id||registerProduct.article_id||null;
      const roadAddress=await reverseMarketRoadAddress(registerLat,registerLng);
      if(!roadAddress)throw new Error('선택한 위치의 도로명 주소를 확인하지 못했습니다. 도로와 가까운 위치로 핀을 조금 이동한 뒤 다시 등록해주세요.');
      registerLocation=roadAddress;
      const row={seller_user_id:user.id,seller_nickname:nick,seller_type:'individual',individual_seller_confirmed_at:agreedAt,rights_republish_agreed_at:agreedAt,external_trade_only_agreed_at:agreedAt,provider,external_url:registerProduct.final_url||registerProduct.source_url||$('#marketRegisterUrl').value.trim(),external_listing_id:externalListingId,title:registerProduct.title||'외부 매물',description:registerProduct.description||null,price,currency:registerProduct.currency||'KRW',thumbnail_url:urls[0]||null,image_urls:urls,external_status:registerProduct.availability||null,direct_buy_available:registerDirectBuy,listing_status:'active',listing_side:'sell',tcg_category:$('#marketRegisterCategory').value,item_type:registerType,country_code:'KR',latitude:registerLat,longitude:registerLng,road_address:roadAddress,location_name:roadAddress,fetched_at:registerProduct.fetched_at||agreedAt,source_last_checked_at:registerProduct.fetched_at||agreedAt,source_refresh_count:1,source_status:registerProduct.source_status||'unknown',updated_at:agreedAt};
      let data=null,error=null;
      if(row.external_listing_id){
        const existing=await A.client.from('market_listings').select('id,source_refresh_count').eq('seller_user_id',user.id).eq('provider',provider).eq('external_listing_id',row.external_listing_id).maybeSingle();
        if(existing.error)throw existing.error;
        if(existing.data?.id){
          row.source_refresh_count=(Number(existing.data.source_refresh_count)||0)+1;
          const updated=await A.client.from('market_listings').update(row).eq('id',existing.data.id).select('*').single();
          data=updated.data;error=updated.error;
        }
      }
      if(!data&&!error){
        const inserted=await A.client.from('market_listings').insert(row).select('*').single();
        data=inserted.data;error=inserted.error;
      }
      if(error)throw error;
      closeRegister();await loadRows();openDetail(data.id);
    }catch(e){setRegisterError(String(e?.message||e))}
    finally{btn.disabled=false;btn.textContent='매물 등록하기'}
  }

  let marketToastTimer=0;
  function marketToast(message){
    let el=$('#marketToast');
    if(!el){el=document.createElement('div');el.id='marketToast';el.className='market-toast';el.setAttribute('role','status');document.body.appendChild(el)}
    el.textContent=message;el.classList.remove('show');requestAnimationFrame(()=>el.classList.add('show'));clearTimeout(marketToastTimer);marketToastTimer=setTimeout(()=>el.classList.remove('show'),1800);
  }
  const heartHtml=on=>on
    ?'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 21s-7.2-4.35-9.55-8.36C.48 9.27 1.53 5.1 5.2 3.74 7.54 2.87 10.08 3.7 12 5.7c1.92-2 4.46-2.83 6.8-1.96 3.67 1.36 4.72 5.53 2.75 8.9C19.2 16.65 12 21 12 21Z"/></svg>'
    :'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"/></svg>';
  const marketShareUrl=id=>location.origin+'/shops-market-test.html#market/'+encodeURIComponent(id);
  function buildMarketImageViewer(){
    if($('#marketImageViewer'))return;
    const el=document.createElement('section');el.id='marketImageViewer';el.className='market-image-viewer';el.hidden=true;
    el.innerHTML='<header><button type="button" id="marketImageViewerClose" aria-label="닫기">×</button><span id="marketImageViewerCount"></span></header><div id="marketImageViewerTrack" class="market-image-viewer-track"></div>';
    document.body.appendChild(el);$('#marketImageViewerClose').onclick=()=>{el.hidden=true};
  }
  function openMarketImageViewer(images,index=0){
    if(!images?.length)return;buildMarketImageViewer();
    const el=$('#marketImageViewer'),track=$('#marketImageViewerTrack'),count=$('#marketImageViewerCount');
    track.innerHTML=images.map((u,i)=>'<div class="market-image-viewer-slide"><img src="'+esc(u)+'" alt="매물 이미지 '+(i+1)+'" referrerpolicy="no-referrer"></div>').join('');
    const update=()=>{const w=track.clientWidth||1,n=Math.max(0,Math.min(images.length-1,Math.round(track.scrollLeft/w)));count.textContent=(n+1)+' / '+images.length};
    track.onscroll=update;el.hidden=false;requestAnimationFrame(()=>{track.scrollLeft=(track.clientWidth||1)*index;update()});
  }
  async function updateMarketDetailStats(id,recordView=false){
    try{
      const fn=recordView?'market_listing_record_view':'market_listing_get_stats';
      const {data,error}=await A.client.rpc(fn,{p_listing_id:id});if(error)throw error;
      const stats=data||{},fav=!!stats.is_favorite,btn=$('#marketDetailFavorite'),meta=$('#marketDetailStats');
      if(btn){btn.classList.toggle('is-on',fav);btn.innerHTML=heartHtml(fav);btn.dataset.on=fav?'1':'0';btn.setAttribute('aria-pressed',String(fav))}
      if(meta)meta.textContent='조회 '+Number(stats.view_count||0).toLocaleString('ko-KR')+' · 관심 '+Number(stats.favorite_count||0).toLocaleString('ko-KR');
      return stats;
    }catch(_){return null}
  }
  async function toggleMarketFavorite(id){
    const btn=$('#marketDetailFavorite');if(!btn||btn.disabled)return;
    const on=btn.dataset.on==='1';btn.disabled=true;
    try{
      if(on){
        const {error}=await A.client.from('market_listing_favorites').delete().eq('listing_id',id).eq('user_id',A.session.user.id);if(error)throw error;
        marketToast('관심 목록에서 해제했어요.');
      }else{
        const {error}=await A.client.from('market_listing_favorites').insert({listing_id:id,user_id:A.session.user.id});if(error&&error.code!=='23505')throw error;
        marketToast('관심 목록에 추가했어요.');
      }
      await updateMarketDetailStats(id,false);
    }catch(_){marketToast('관심 매물 처리에 실패했습니다.')}
    finally{btn.disabled=false}
  }
  function openExternalMarketUrl(url){
    if(window.ReactNativeWebView){try{window.ReactNativeWebView.postMessage(JSON.stringify({type:'OPEN_EXTERNAL',url}));return}catch(_){}}
    window.open(url,'_blank','noopener');
  }
  function buildDetail(){
    if($('#marketDetailOverlay'))return;
    const el=document.createElement('section');el.id='marketDetailOverlay';el.className='market-detail-overlay';el.hidden=true;
    el.innerHTML='<header class="market-detail-head"><button type="button" id="marketDetailBack" class="market-detail-back" aria-label="이전"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18 9 12l6-6"/></svg></button><strong id="marketDetailStickyTitle"></strong><div class="market-detail-head-actions"><button type="button" id="marketDetailShare" aria-label="공유"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m0 0L8 8m4-4 4 4M5 13v6h14v-6"/></svg></button><button type="button" id="marketDetailMore" aria-label="더보기"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/></svg></button></div><div id="marketDetailMoreMenu" class="market-detail-more-menu" hidden></div></header><div id="marketDetailBody" class="market-detail-body"></div>';
    document.body.appendChild(el);$('#marketDetailBack').onclick=closeDetail;
  }
  function openDetail(id){
    const x=rows.find(r=>r.id===id);if(!x)return;
    buildDetail();
    const overlay=$('#marketDetailOverlay'),ended=['sold','expired','hidden'].includes(x.listing_status),sourceName=providerName(x),isOwner=A.session?.user?.id===x.seller_user_id,providerClass='provider-'+(x.provider||'external');
    const body=$('#marketDetailBody'),stickyTitle=$('#marketDetailStickyTitle');
    const detailImages=[...(Array.isArray(x.image_urls)?x.image_urls:[]),x.thumbnail_url].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i);
    overlay.classList.toggle('has-media',detailImages.length>0);overlay.classList.remove('is-scrolled');overlay.scrollTop=0;
    if(stickyTitle)stickyTitle.textContent=x.title||'매물 상세';
    const hero=detailImages.length?'<div class="market-detail-carousel"><div class="market-detail-carousel-track" id="marketDetailCarousel">'+detailImages.map((u,i)=>'<button type="button" class="market-detail-slide" data-market-fullscreen="'+i+'" aria-label="이미지 전체화면 보기"><img src="'+esc(u)+'" alt="매물 이미지 '+(i+1)+'" referrerpolicy="no-referrer"></button>').join('')+'</div>'+(detailImages.length>1?'<div class="market-detail-page"><span id="marketDetailPageNow">1</span> / '+detailImages.length+'</div>':'')+'</div>':'<div class="market-detail-hero"><div class="market-detail-ph">NO IMAGE</div></div>';
    body.innerHTML=hero+
      '<div class="market-detail-info">'+
        '<div class="market-detail-tags"><span class="market-detail-tag provider '+esc(x.provider||'')+'">'+esc(sourceName)+'</span><span class="market-detail-tag cat">'+esc(categoryBadgeNames[x.tcg_category]||'기타')+'</span><span class="market-detail-tag type">'+esc(types[x.item_type]||'기타')+'</span></div>'+
        '<div class="market-detail-title-row"><h1 class="market-detail-title">'+esc(x.title)+'</h1><button type="button" id="marketDetailFavorite" class="market-detail-favorite" aria-label="관심 매물" aria-pressed="false">'+heartHtml(false)+'</button></div>'+
        '<div class="market-detail-price">'+money(x.price)+'</div>'+
        '<div class="market-detail-location-main">⌖ '+esc(displayAddress(x))+'</div>'+
        '<div class="market-detail-seller">'+esc(x.seller_nickname||'회원')+' <span>· '+age(x.created_at)+'</span></div>'+
        '<div id="marketDetailStats" class="market-detail-stats">조회 - · 관심 -</div>'+
      '</div>'+
      '<section class="market-detail-section market-detail-description"><div class="market-detail-desc">'+esc(x.description||'등록된 설명이 없습니다.')+'</div></section>'+
      '<section class="market-detail-section"><h3>거래 희망 위치</h3><div class="market-detail-map-card"><div id="marketDetailMap" class="market-detail-map"></div></div></section>'+
      '<section class="market-detail-guide"><strong>안내사항</strong><p>FUNY PIN은 외부 플랫폼의 매물을 연결해 보여주는 서비스이며 거래 당사자가 아닙니다. 실제 구매·결제·배송·환불은 '+esc(sourceName)+' 원본 매물에서 진행해주세요.</p><span>출처 · '+esc(sourceName)+' · 원본 마지막 확인 '+(x.source_last_checked_at?age(x.source_last_checked_at):'미확인')+'</span></section>'+
      (isOwner?'<div class="market-detail-owner-tools"><button type="button" id="marketDetailRefresh">원본 정보 새로고침</button><button type="button" id="marketDetailHide">매물 숨기기</button></div>':'')+
      '<button type="button" id="marketDetailReport" class="market-detail-report-button">신고 · 권리침해 접수</button>'+
      '<div class="market-detail-bottom"><a id="marketDetailTrade" class="market-detail-trade '+providerClass+(ended?' disabled':'')+'" href="'+esc(x.external_url)+'" target="_blank" rel="noopener">'+(ended?'판매가 종료된 매물입니다':esc(sourceName)+'에서 구매하기')+'</a></div>';
    overlay.hidden=false;document.body.style.overflow='hidden';
    overlay.onscroll=()=>overlay.classList.toggle('is-scrolled',overlay.scrollTop>42);
    if(detailImages.length){
      const track=$('#marketDetailCarousel'),page=$('#marketDetailPageNow');
      track?.addEventListener('scroll',()=>{if(!page)return;const w=track.clientWidth||1;page.textContent=String(Math.max(1,Math.min(detailImages.length,Math.round(track.scrollLeft/w)+1)))},{passive:true});
      body.querySelectorAll('[data-market-fullscreen]').forEach(btn=>btn.onclick=()=>openMarketImageViewer(detailImages,Number(btn.dataset.marketFullscreen)||0));
    }
    if(Number.isFinite(+x.latitude)&&Number.isFinite(+x.longitude))setTimeout(()=>{
      const map=new naver.maps.Map('marketDetailMap',{center:new naver.maps.LatLng(+x.latitude,+x.longitude),zoom:16,draggable:false,scrollWheel:false,disableDoubleClickZoom:true,zoomControl:false,mapDataControl:false,scaleControl:false,logoControl:false});
      new naver.maps.Marker({map,position:new naver.maps.LatLng(+x.latitude,+x.longitude),icon:markerIcon(true)});naver.maps.Event.trigger(map,'resize');
    },80);
    if(isOwner){
      $('#marketDetailRefresh')?.addEventListener('click',()=>refreshOwnedListing(x.id));
      $('#marketDetailHide')?.addEventListener('click',()=>hideOwnedListing(x.id));
    }
    $('#marketDetailFavorite')?.addEventListener('click',()=>toggleMarketFavorite(x.id));
    reverseMarketAddress(x).then(address=>{
      if(!address)return;
      const loc=$('#marketDetailBody .market-detail-location-main');
      if(loc)loc.textContent='⌖ '+address;
      renderListInto($('#marketSheetList'),marketFilter);renderListInto($('#marketOverlayList'),overlayFilter);
    }).catch(()=>{});
    updateMarketDetailStats(x.id,true);
    $('#marketDetailReport')?.addEventListener('click',()=>openMarketReport(x.id));
    const more=$('#marketDetailMore'),moreMenu=$('#marketDetailMoreMenu');
    if(moreMenu)moreMenu.innerHTML='<button type="button" data-market-more-original>원본 매물 보기</button><button type="button" data-market-more-report>신고 · 권리침해 접수</button>';
    if(more)more.onclick=e=>{e.stopPropagation();if(moreMenu)moreMenu.hidden=!moreMenu.hidden};
    const moreOriginal=moreMenu?.querySelector('[data-market-more-original]'),moreReport=moreMenu?.querySelector('[data-market-more-report]');
    if(moreOriginal)moreOriginal.onclick=()=>{moreMenu.hidden=true;openExternalMarketUrl(x.external_url)};
    if(moreReport)moreReport.onclick=()=>{moreMenu.hidden=true;openMarketReport(x.id)};
    const shareBtn=$('#marketDetailShare');
    if(shareBtn)shareBtn.onclick=async()=>{
      const url=marketShareUrl(x.id);
      try{if(navigator.share)await navigator.share({title:x.title,text:x.title,url});else{await navigator.clipboard.writeText(url);marketToast('매물 링크를 복사했어요.')}}catch(_){}
    };
    $('#marketDetailTrade')?.addEventListener('click',e=>{if(ended){e.preventDefault();return}if(window.ReactNativeWebView){e.preventDefault();openExternalMarketUrl(x.external_url)}});
  }
  function closeDetail(){
    const el=$('#marketDetailOverlay');if(el){el.hidden=true;el.classList.remove('is-scrolled');el.onscroll=null}
    if(location.hash.startsWith('#market/'))history.replaceState(null,'',location.pathname+location.search);
    if($('#marketOverlay')?.hidden!==false&&$('#marketRegisterOverlay')?.hidden!==false)document.body.style.overflow='';
  }

  async function refreshOwnedListing(id){
    const btn=$('#marketDetailRefresh');if(btn){btn.disabled=true;btn.textContent='새로고침 중...'}
    try{
      const {data,error}=await A.client.functions.invoke('market-listing-owner-action-test',{body:{action:'refresh',listing_id:id}});
      if(error)throw error;if(!data?.ok)throw Error(data?.error||'원본 정보를 새로고침하지 못했습니다.');
      await loadRows();openDetail(id);
    }catch(e){alert(String(e?.message||e))}
    finally{if(btn){btn.disabled=false;btn.textContent='원본 정보 새로고침'}}
  }
  async function hideOwnedListing(id){
    if(!confirm('이 매물을 FUNY PIN에서 숨길까요? 원본 외부 매물은 삭제되지 않습니다.'))return;
    const btn=$('#marketDetailHide');if(btn)btn.disabled=true;
    try{
      const {data,error}=await A.client.functions.invoke('market-listing-owner-action-test',{body:{action:'hide',listing_id:id,reason:'seller_request'}});
      if(error)throw error;if(!data?.ok)throw Error(data?.error||'매물을 숨기지 못했습니다.');
      closeDetail();await loadRows();
    }catch(e){alert(String(e?.message||e))}
    finally{if(btn)btn.disabled=false}
  }
  function buildMarketReport(){
    if($('#marketReportOverlay'))return;
    const el=document.createElement('div');el.id='marketReportOverlay';el.className='market-report-overlay';el.hidden=true;
    el.innerHTML='<section class="market-report-sheet"><div class="market-register-handle"></div><header><strong>매물 신고</strong><button type="button" id="marketReportClose" aria-label="닫기">×</button></header><div class="market-report-body"><label>신고 유형</label><select id="marketReportType"><option value="rights">권리침해</option><option value="fraud">사기 의심</option><option value="prohibited">부적절한 매물</option><option value="sold_or_unavailable">판매완료·접근불가</option><option value="other">기타</option></select><label>내용 <span>선택</span></label><textarea id="marketReportReason" maxlength="500" placeholder="확인이 필요한 내용을 입력해주세요."></textarea><p>접수된 신고는 운영자가 확인하며 필요한 경우 매물을 즉시 비노출할 수 있습니다.</p><button type="button" id="marketReportSubmit">신고 접수</button></div></section>';
    document.body.appendChild(el);
    $('#marketReportClose').onclick=closeMarketReport;
    el.addEventListener('click',e=>{if(e.target===el)closeMarketReport()});
    $('#marketReportSubmit').onclick=submitMarketReport;
  }
  let marketReportListingId='';
  function openMarketReport(id){buildMarketReport();marketReportListingId=id;$('#marketReportOverlay').hidden=false;document.body.style.overflow='hidden'}
  function closeMarketReport(){const el=$('#marketReportOverlay');if(el)el.hidden=true;marketReportListingId='';if($('#marketDetailOverlay')?.hidden!==false)document.body.style.overflow='hidden';else document.body.style.overflow=''}
  async function submitMarketReport(){
    if(!marketReportListingId)return;const btn=$('#marketReportSubmit');btn.disabled=true;btn.textContent='접수 중...';
    try{
      const {error}=await A.client.from('market_listing_reports').insert({listing_id:marketReportListingId,reporter_user_id:A.session.user.id,report_type:$('#marketReportType').value,reason:$('#marketReportReason').value.trim()||null});
      if(error)throw error;alert('신고가 접수되었습니다.');closeMarketReport();
    }catch(e){alert('신고 접수 실패: '+String(e?.message||e))}
    finally{btn.disabled=false;btn.textContent='신고 접수'}
  }

  async function waitForMarketGeocoder(){
    for(let i=0;i<30;i++){
      if(window.naver?.maps?.Service?.reverseGeocode)return true;
      await sleep(100);
    }
    return false;
  }
  function makeNaverAddress(item){
    if(!item)return '';
    const region=item.region||{},land=item.land||{},isRoad=String(item.name||'').toLowerCase()==='roadaddr';
    const has=v=>v!==undefined&&v!==null&&String(v).trim()!=='';
    let sido=region.area1?.name||'',sigugun=region.area2?.name||'',dong=region.area3?.name||'',ri=region.area4?.name||'',rest='';
    if(has(land.number1)){
      if(has(land.type)&&String(land.type)==='2')rest+='산';
      rest+=String(land.number1);
      if(has(land.number2)&&String(land.number2)!=='0')rest+='-'+String(land.number2);
    }
    if(isRoad){
      if(/면$/.test(dong))ri=land.name||ri;
      else{dong=land.name||dong;ri=''}
      if(has(land.addition0?.value))rest+=(rest?' ':'')+String(land.addition0.value);
    }
    return [sido,sigugun,dong,ri,rest].filter(v=>String(v||'').trim()).join(' ').replace(/\s+/g,' ').trim();
  }
  function marketRoadAddressFromReverseResult(res){
    const direct=String(res?.v2?.address?.roadAddress||'').trim();
    if(direct)return direct;
    const results=Array.isArray(res?.v2?.results)?res.v2.results:[];
    const road=results.find(x=>String(x?.name||'').toLowerCase()==='roadaddr');
    const label=makeNaverAddress(road);
    if(label)return label;
    const legacy=Array.isArray(res?.result?.items)?res.result.items:[];
    const legacyRoad=legacy.find(x=>x?.isRoadAddress===true&&String(x?.address||'').trim());
    return legacyRoad?String(legacyRoad.address).trim():'';
  }
  async function reverseMarketRoadAddress(lat,lng){
    const a=Number(lat),b=Number(lng);
    if(!Number.isFinite(a)||!Number.isFinite(b))return '';
    const ready=await waitForMarketGeocoder();if(!ready)return '';
    const pos=new naver.maps.LatLng(a,b);
    return await new Promise(resolve=>{
      naver.maps.Service.reverseGeocode({coords:pos,orders:naver.maps.Service.OrderType.ROAD_ADDR},(status,res)=>{
        if(status===naver.maps.Service.Status.ERROR||!res){resolve('');return}
        resolve(marketRoadAddressFromReverseResult(res)||'');
      });
    });
  }
  function marketAddressFromReverseResult(res){
    const direct=res?.v2?.address||{};
    const directRoad=String(direct.roadAddress||'').trim();
    const directJibun=String(direct.jibunAddress||'').trim();
    if(directRoad)return directRoad;
    const results=Array.isArray(res?.v2?.results)?res.v2.results:[];
    const road=results.find(x=>String(x?.name||'').toLowerCase()==='roadaddr');
    const roadLabel=makeNaverAddress(road);
    if(roadLabel)return roadLabel;
    if(directJibun)return directJibun;
    for(const item of results){
      const label=makeNaverAddress(item);
      if(label)return label;
    }
    const legacy=Array.isArray(res?.result?.items)?res.result.items:[];
    const legacyRoad=legacy.find(x=>x?.isRoadAddress===true&&String(x?.address||'').trim());
    if(legacyRoad)return String(legacyRoad.address).trim();
    const legacyAny=legacy.find(x=>String(x?.address||'').trim());
    return legacyAny?String(legacyAny.address).trim():'';
  }
  async function reverseMarketAddress(row){
    const persistedRoad=String(row?.road_address||'').trim();
    if(persistedRoad&&!isGenericMarketLocation(persistedRoad)){row._displayAddress=persistedRoad;row._addressResolved=true;return persistedRoad}
    const lat=Number(row?.latitude),lng=Number(row?.longitude);
    const plainFallback=String(row?.location_name||'').trim();
    if(!Number.isFinite(lat)||!Number.isFinite(lng)){
      const fallback=!isGenericMarketLocation(plainFallback)?plainFallback:'위치 정보 없음';
      row._displayAddress=fallback;row._addressResolved=true;return fallback;
    }
    const key=lat.toFixed(6)+','+lng.toFixed(6);
    if(addressCache.has(key)){const v=addressCache.get(key);row._displayAddress=v;row._addressResolved=true;return v}
    const ready=await waitForMarketGeocoder();
    if(!ready){row._displayAddress='';row._addressResolved=false;return ''}
    const pos=new naver.maps.LatLng(lat,lng);
    const call=orders=>new Promise(resolve=>{
      naver.maps.Service.reverseGeocode({coords:pos,orders},(status,res)=>{
        if(status===naver.maps.Service.Status.ERROR||!res){resolve('');return}
        resolve(marketAddressFromReverseResult(res)||'');
      });
    });
    let label='';
    const roadFirst=[naver.maps.Service.OrderType.ROAD_ADDR,naver.maps.Service.OrderType.ADDR].filter(Boolean).join(',');
    const addrFirst=[naver.maps.Service.OrderType.ADDR,naver.maps.Service.OrderType.ROAD_ADDR].filter(Boolean).join(',');
    try{label=await call(roadFirst)}catch(_){}
    if(!label){await sleep(120);try{label=await call(addrFirst)}catch(_){}}
    if(label){
      addressCache.set(key,label);row._displayAddress=label;row._addressResolved=true;return label;
    }
    row._displayAddress='';row._addressResolved=false;return '';
  }
  async function hydrateMarketAddresses(list){
    const queue=(list||[]).filter(x=>x?._addressResolved!==true&&Number.isFinite(+x.latitude)&&Number.isFinite(+x.longitude));let index=0;
    const worker=async()=>{while(index<queue.length){const row=queue[index++];try{await reverseMarketAddress(row)}catch(_){row._displayAddress='';row._addressResolved=false}}};
    await Promise.all([worker(),worker(),worker()]);
  }

  async function loadRows(){
    const {data,error}=await A.client.from('market_listings').select('*').eq('listing_side','sell').in('listing_status',['active','reserved','sold']).order('created_at',{ascending:false});
    if(error){console.error('[MARKET TEST] load failed',error);return}
    rows=data||[];updateCounts();syncMarkers();
    await hydrateMarketAddresses(rows).catch(()=>{});
    renderListInto($('#marketSheetList'),marketFilter);renderListInto($('#marketOverlayList'),overlayFilter);
    const refreshAddresses=()=>hydrateMarketAddresses(rows).then(()=>{
      renderListInto($('#marketSheetList'),marketFilter);renderListInto($('#marketOverlayList'),overlayFilter);
      if(selectedMarkerId){const x=rows.find(r=>r.id===selectedMarkerId),m=markers.get(selectedMarkerId);if(x&&m){try{popup?.close()}catch(_){}popup=new naver.maps.InfoWindow({content:popupHtml(x),borderWidth:0,backgroundColor:'transparent',anchorSize:new naver.maps.Size(0,0),pixelOffset:new naver.maps.Point(0,-8)});popup.open(window.FUNY_NAVER_MAP_API?.getMap?.(),m)}}
    }).catch(()=>{});
    refreshAddresses();setTimeout(refreshAddresses,1600);setTimeout(refreshAddresses,4200);
  }

  document.addEventListener('click',e=>{
    if(!e.target.closest('.market-sort-wrap'))closeSortMenus();
    const popupTarget=e.target.closest('[data-market-popup-id]'),markerTarget=e.target.closest('.market-map-pin');
    if(selectedMarkerId&&!popupTarget&&!markerTarget)closePopup();
    const card=e.target.closest('[data-market-id]');if(card){e.preventDefault();openDetail(card.dataset.marketId);return}
    const pop=popupTarget;if(pop){e.preventDefault();openDetail(pop.dataset.marketPopupId)}
  },true);

  const search=$('#map-shop-search');search?.addEventListener('input',()=>{renderListInto($('#marketSheetList'),marketFilter);renderListInto($('#marketOverlayList'),overlayFilter);updateCounts();syncMarkers()});
  window.addEventListener('funy:mapdatachange',()=>{ensureLayerChip();syncLayerOrder();syncMarkers()});
  new MutationObserver(()=>{ensureLayerChip();if(isJapan()&&marketTabActive){document.querySelector('.qa-list-tab[data-tab="shops"]')?.click()}syncMarkers()}).observe(document.body,{attributes:true,attributeFilter:['class']});

  const map=await waitForMap();
  const tabs=await waitForQaTabs();
  if(tabs)setupMarketPanel(tabs);
  syncMarketSearchPlaceholder();syncMarketTabLabels();
  ensureLayerChip();observeLayerOrder();syncLayerOrder();buildFab();buildOverlay();buildRegister();buildDetail();buildMarketReport();
  if(map){naver.maps.Event.addListener(map,'zoom_changed',()=>syncMarkers());naver.maps.Event.addListener(map,'dragstart',()=>closePopup())}
  setInterval(()=>{syncMarketSearchPlaceholder();syncMarketTabLabels();ensureLayerChip();syncLayerOrder();bindHorizontalScrollers();if(tabs&&!tabs.querySelector('[data-tab="market"]'))setupMarketPanel(tabs);if(marketTabActive){document.querySelectorAll('.qa-list-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab==='market'));enforceMarketTabExclusiveUI()}},700);
  await loadRows();
  const directMarket=location.hash.match(/^#market\/([0-9a-f-]{36})$/i);
  if(directMarket)openDetail(directMarket[1]);
})();