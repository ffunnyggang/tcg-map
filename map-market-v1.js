/* FUNY PIN MARKET production runtime */
(async function(){
  const marketRuntimePath=location.pathname.replace(/\/+$/,'');
  const standaloneMarket=marketRuntimePath==='/market.html';
  const mapDiscoveryMode=marketRuntimePath==='/shops.html';
  if(!standaloneMarket&&!mapDiscoveryMode)return;
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
  const marketAddressIcon='<svg class="market-address-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2.5"/></svg>';
  const marketUserIcon='<svg class="market-user-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5.5 20c.7-4 3.1-6 6.5-6s5.8 2 6.5 6"/></svg>';
  const age=s=>{if(!s)return'-';const d=new Date(s);if(Number.isNaN(d.getTime()))return'-';const m=Math.max(0,Math.floor((Date.now()-d.getTime())/60000));if(m<1)return'방금 전';if(m<60)return m+'분 전';if(m<1440)return Math.floor(m/60)+'시간 전';if(m<10080)return Math.floor(m/1440)+'일 전';return d.toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul'})};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const marketPageUrl=(route='')=>'/market.html'+String(route||'');
  function navigateMarketPage(route=''){
    const target=marketPageUrl(route);
    location.href=target;
  }
  function setStandaloneRoute(route='',replace=false){
    if(!standaloneMarket)return;
    const target=marketPageUrl(route);
    try{history[replace?'replaceState':'pushState']({funyMarketRoute:!!route},'',target)}catch(_){location.hash=route.replace(/^#/,'')}
  }
  function closeStandaloneMarketPage(){
    if(window.ReactNativeWebView){try{window.ReactNativeWebView.postMessage(JSON.stringify({type:'NATIVE_BACK'}));return}catch(_){}}
    if(history.length>1){history.back();return}
    location.href='/shops.html';
  }
  document.body.classList.add('market-page');
  if(standaloneMarket){document.body.classList.add('market-standalone-page');document.documentElement.classList.add('market-standalone-page')}
  const marketEn=localStorage.getItem('funy-pin-lang')==='en';
  const marketTr=(ko,enText)=>marketEn?enText:ko;

  let rows=[],marketRowsLoaded=false,marketLayerOn=true,marketTabActive=false,marketFilter='all',overlayFilter='all',marketSort='latest',marketSortOrigin=null,marketBlockedUserIds=new Set();
  let markers=new Map(),popup=null,selectedMarkerId=null,addressCache=new Map();
  let registerMap=null,registerProduct=null,registerPreviewUrl='',registerType='single',registerDirectBuy=false,registerIdentityVerified=false,registerIdentityLoading=false,registerIdentityConfigured=false,registerIdentityVerifiedAt='',registerIdentityPendingId='',registerExternalVerified=false,registerChallengeId='',registerVerifiedChallengeId='',registerExternalAccountId='',registerVerificationScope='',registerVerifiedAccounts=[],registerSellerStatusLoading=false,registerLat=null,registerLng=null,registerLocation='',registerCoordinate=null,registerPin=null,registerCurrentPin=null,registerCurrentAccuracy=null,reverseTimer=null;
  let marketSellerAllowed=false,marketSellerAccessLoaded=false;
  let marketPanel=null,marketTabBtn=null,layerChip=null,layerOrderObserver=null,layerOrderQueued=false,marketSwitchCleanupTimer=0;
  const authReady=A.init().catch(()=>null);

  async function waitForMap(){
    if(standaloneMarket)return null;
    for(let i=0;i<120;i++){
      const map=window.FUNY_NAVER_MAP_API?.getMap?.();
      if(map)return map;
      await sleep(100);
    }
    return null;
  }
  async function waitForQaTabs(){
    if(standaloneMarket)return null;
    for(let i=0;i<120;i++){
      const tabs=$('.qa-list-tabs');
      if(tabs)return tabs;
      await sleep(100);
    }
    return null;
  }

  const isJapan=()=>standaloneMarket?false:(document.body.classList.contains('country-japan')||window.FUNY_MAP_COUNTRY?.get?.()==='JP');
  function syncMarketSearchPlaceholder(){
    const input=$('#map-shop-search');if(!input)return;
    input.placeholder='카드샵 · 자판기 · 거래 매물 검색';
    input.setAttribute('aria-label','카드샵 · 자판기 · 거래 매물 검색');
  }
  function syncMarketTabLabels(){
    if(standaloneMarket)return;
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
      const count=document.createElement('span');count.className='qa-tab-count';count.id='marketTestTabCount';count.textContent=marketRowsLoaded?String(rows.filter(x=>listingMatches(x,'all')&&['active','reserved'].includes(x.listing_status)).length):'-';inline.appendChild(count);
    }
  }

  function listingMatches(x,filter=marketFilter){
    if(!['active','reserved'].includes(x.listing_status))return false;
    if(filter!=='all'&&x.item_type!==filter)return false;
    const q=($('#map-shop-search')?.value||'').trim().toLowerCase();
    if(q&&!([x.title,x.description,x.location_name,x.place_name,cats[x.tcg_category],categoryBadgeNames[x.tcg_category],types[x.item_type],providerName(x)].filter(Boolean).join(' ').toLowerCase().includes(q)))return false;
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
  function formatMarketRoadAddress(value){
    let v=String(value||'').replace(/\s+/g,' ').trim();
    if(!v)return '';
    const pairs=[
      ['서울특별시','서울'],['부산광역시','부산'],['대구광역시','대구'],['인천광역시','인천'],
      ['광주광역시','광주'],['대전광역시','대전'],['울산광역시','울산'],['세종특별자치시','세종'],
      ['제주특별자치도','제주']
    ];
    for(const [from,to] of pairs){if(v.startsWith(from+' ')){v=to+v.slice(from.length);break}}
    return v;
  }
  function displayAddress(x){
    const dbRoad=formatMarketRoadAddress(x?.road_address);
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
  function displayMarketLocation(x,addressOverride='',includePlace=false){
    const address=formatMarketRoadAddress(addressOverride)||displayAddress(x);
    if(!includePlace)return address;
    const place=String(x?.place_name||'').replace(/\s+/g,' ').trim();
    return place&&address&&!isGenericMarketLocation(address)?address+' · '+place:address;
  }
  function marketLocationHtml(x,addressOverride='',includePlace=false){
    return marketAddressIcon+'<span>'+esc(displayMarketLocation(x,addressOverride,includePlace))+'</span>';
  }
  function cardHtml(x){
    return '<button type="button" class="market-card" data-market-id="'+esc(x.id)+'">'+
      (x.thumbnail_url?'<img class="market-card-thumb" src="'+esc(x.thumbnail_url)+'" alt="" loading="lazy" referrerpolicy="no-referrer">':'<span class="market-card-ph">NO IMAGE</span>')+
      '<span class="market-card-copy">'+badgesHtml(x)+'<strong class="market-card-title">'+esc(x.title)+'</strong><span class="market-card-price">'+money(x.price)+'</span><span class="market-card-location">'+marketLocationHtml(x)+'</span></span><span class="market-card-chev" aria-hidden="true">›</span></button>';
  }
  function renderListInto(el,filter){
    if(!el)return;
    const list=sorted(rows,filter);
    el.innerHTML=list.length?list.map(cardHtml).join(''):'<div class="market-empty">조건에 맞는 TCG 거래 매물이 없습니다.</div>';
    if(el.id==='marketOverlayList'){const count=$('#marketOverlayListCount');if(count)count.textContent='매물 '+list.length+'개'}
  }
  function updateCounts(){
    const all=rows.filter(x=>listingMatches(x,'all')&&['active','reserved'].includes(x.listing_status));
    if(layerChip){const count=layerChip.querySelector('.market-layer-count');if(count)count.textContent=marketRowsLoaded?String(all.length):'-';layerChip.setAttribute('aria-busy',marketRowsLoaded?'false':'true')}
    const tabCount=$('#marketTestTabCount');if(tabCount)tabCount.textContent=marketRowsLoaded?String(all.length):'-';
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
      '<path d="M49 5C23 5 2 26 2 52c0 35 47 77 47 77s47-42 47-77C96 26 75 5 49 5Z" fill="#E34D5C"/>'+
      '<path d="M6 52h28M64 52h28" stroke="#fff" stroke-width="4" stroke-linecap="round"/>'+
      '<circle cx="49" cy="52" r="14.5" fill="#fff"/></svg></div>';
    return{content,anchor:new naver.maps.Point(Math.round(m.markerW/2),m.markerH)};
  }
  function closePopup(){
    try{popup?.close()}catch(_){}
    popup=null;
    if(selectedMarkerId&&markers.has(selectedMarkerId))markers.get(selectedMarkerId).setIcon(markerIcon(false));
    selectedMarkerId=null;
  }
  window.FUNY_MAP_BALLOONS?.register?.('market',closePopup);
  function popupHtml(x){
    return '<div class="market-popup-bubble"><button type="button" class="market-popup-card" data-market-popup-id="'+esc(x.id)+'">'+
      (x.thumbnail_url?'<img src="'+esc(x.thumbnail_url)+'" alt="" referrerpolicy="no-referrer">':'<span class="market-popup-ph">NO IMAGE</span>')+
      '<span><strong class="market-popup-title">'+esc(x.title)+'</strong><span class="market-popup-price">'+money(x.price)+'</span><span class="market-popup-meta">'+marketLocationHtml(x)+'</span></span><span class="market-popup-chev">›</span></button></div>';
  }
  function selectMarker(x,m){
    const map=window.FUNY_NAVER_MAP_API?.getMap?.();if(!map)return;
    window.__FUNY_LAST_MAP_MARKER_TAP=Date.now();
    if(selectedMarkerId===x.id){closePopup();return}
    window.FUNY_MAP_BALLOONS?.activate?.('market');
    closePopup();selectedMarkerId=x.id;m.setIcon(markerIcon(true));
    popup=new naver.maps.InfoWindow({content:popupHtml(x),borderWidth:0,backgroundColor:'transparent',anchorSize:new naver.maps.Size(0,0),pixelOffset:new naver.maps.Point(0,-8),disableAutoPan:true});
    popup.open(map,m);
    if(x?._addressResolved!==true)reverseMarketAddress(x).then(()=>{if(selectedMarkerId===x.id){try{popup?.close()}catch(_){}popup=new naver.maps.InfoWindow({content:popupHtml(x),borderWidth:0,backgroundColor:'transparent',anchorSize:new naver.maps.Size(0,0),pixelOffset:new naver.maps.Point(0,-8),disableAutoPan:true});popup.open(map,m);renderListInto($('#marketSheetList'),marketFilter)}}).catch(()=>{});
  }
  function clearMarkers(){
    closePopup();markers.forEach(m=>m.setMap(null));markers.clear();
  }
  async function syncMarkers(){
    if(standaloneMarket)return;
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
      layerChip?.isConnected?layerChip:track.querySelector('.market-layer-chip'),
      track.querySelector('#liveTempLayer')
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
    if(!layerChip||!layerChip.isConnected)layerChip=track.querySelector('#marketLayerChip')||track.querySelector('.market-layer-chip');
    if(!layerChip){
      layerChip=document.createElement('button');layerChip.id='marketLayerChip';layerChip.type='button';layerChip.className='market-layer-chip live-temp-layer';
      layerChip.innerHTML='<span class="market-layer-emoji" aria-hidden="true">🃏</span><span>거래</span><span class="market-layer-count qa-layer-count">-</span>';
      track.appendChild(layerChip);
    }
    layerChip.id='marketLayerChip';
    layerChip.classList.toggle('active',marketLayerOn);
    layerChip.setAttribute('aria-pressed',marketLayerOn?'true':'false');
    layerChip.onclick=e=>{e.preventDefault();e.stopPropagation();marketLayerOn=!marketLayerOn;layerChip.classList.toggle('active',marketLayerOn);layerChip.setAttribute('aria-pressed',marketLayerOn?'true':'false');syncMarkers()};
    updateCounts();syncLayerOrder();
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
  let marketSortPortal=null;
  function showMarketSortMenu(wrap,button){
    const menu=wrap.querySelector('.market-sort-menu');if(!menu)return;
    const host=document.createElement('div');host.id='marketSortPortal';host.className='market-sort-wrap market-sort-portal open';
    const originalStyle=menu.getAttribute('style');
    document.body.appendChild(host);host.appendChild(menu);marketSortPortal={host,wrap,menu,button,originalStyle};
    const set=(el,key,value)=>el.style.setProperty(key,value,'important');
    set(host,'position','fixed');set(host,'z-index','2147483300');set(host,'width','118px');
    set(menu,'position','absolute');set(menu,'left','0');set(menu,'right','auto');set(menu,'top','0');set(menu,'display','grid');set(menu,'width','118px');set(menu,'min-width','118px');set(menu,'max-height',Math.max(40,window.innerHeight-16)+'px');set(menu,'overflow-y','auto');
    const r=button.getBoundingClientRect(),height=menu.getBoundingClientRect().height||166;
    const left=Math.max(8,Math.min(r.left,window.innerWidth-126));
    const top=r.bottom+6+height<=window.innerHeight-8?r.bottom+6:Math.max(8,r.top-height-6);
    set(host,'left',Math.round(left)+'px');set(host,'top',Math.round(top)+'px');
    host.addEventListener('click',async e=>{const option=e.target.closest('[data-market-sort-value]');if(!option)return;e.preventDefault();e.stopPropagation();await setMarketSort(option.dataset.marketSortValue)});
  }
  function closeSortMenus(except=null){
    if(marketSortPortal&&marketSortPortal.wrap!==except){
      const {host,wrap,menu,originalStyle}=marketSortPortal;marketSortPortal=null;
      wrap.appendChild(menu);if(originalStyle===null)menu.removeAttribute('style');else menu.setAttribute('style',originalStyle);host.remove();
    }
    $$('.market-sort-wrap.open').forEach(w=>{if(w===except||w===marketSortPortal?.host)return;w.classList.remove('open');w.querySelector('[data-market-sort-button]')?.setAttribute('aria-expanded','false')});
  }
  async function setMarketSort(value){
    if(value==='near'){
      try{await ensureMarketSortOrigin()}catch(e){alert(String(e?.message||e));return false}
    }
    marketSort=sortDefs.some(x=>x[0]===value)?value:'latest';syncSortUI();closeSortMenus();
    renderListInto($('#marketSheetList'),marketFilter);renderListInto($('#marketOverlayList'),overlayFilter);
    return true;
  }

  function clearMarketTabSwitching(){
    clearTimeout(marketSwitchCleanupTimer);marketSwitchCleanupTimer=0;
    document.body.classList.remove('market-tab-switching');
  }
  function beginMarketTabSwitching(){
    if(isJapan())return;
    clearMarketTabSwitching();
    document.body.classList.add('market-tab-switching');
    marketSwitchCleanupTimer=setTimeout(clearMarketTabSwitching,700);
  }
  function repairShopTabUI(){
    const shopTab=document.querySelector('.qa-list-tab[data-tab="shops"]');
    if(marketTabActive||!shopTab?.classList.contains('active'))return;
    const list=$('#shop-list'),shopTools=$('.qa-shop-tools');
    const stale=document.body.classList.contains('market-tab-active')||
      document.body.classList.contains('market-tab-switching')||
      list?.style.getPropertyValue('display')==='none'||
      shopTools?.style.getPropertyValue('display')==='none'||
      marketPanel?.hidden===false;
    if(!stale)return;
    clearMarketTabSwitching();
    document.body.classList.remove('market-tab-active','qa-vending-tab-active');
    if(marketPanel)marketPanel.hidden=true;
    document.querySelectorAll('.qa-shop-only').forEach(el=>el.style.removeProperty('display'));
    shopTools?.style.removeProperty('display');
    restoreMarketTabExclusiveUI();
    const vp=$('.qa-vending-panel');if(vp)vp.hidden=true;
    if(list&&!list.children.length&&!window.FUNY_SHOPS_BOOTSTRAPPING&&typeof window.renderList==='function'){
      try{window.renderList()}catch(_){}
    }
    window.dispatchEvent(new CustomEvent('funy:list-refresh',{detail:{source:'market-shop-repair'}}));
  }
  function setupMarketPanel(tabs){
    if(marketPanel?.isConnected)return;
    marketTabBtn=document.createElement('button');marketTabBtn.type='button';marketTabBtn.className='qa-list-tab market-list-tab';marketTabBtn.dataset.tab='market';
    marketTabBtn.innerHTML='<span class="qa-tab-inline"><span class="qa-tab-label">TCG 거래</span><span class="qa-tab-count" id="marketTestTabCount">-</span></span>';
    tabs.appendChild(marketTabBtn);
    marketTabBtn.addEventListener('pointerdown',beginMarketTabSwitching);
    marketTabBtn.addEventListener('pointerup',()=>setTimeout(clearMarketTabSwitching,80));
    marketTabBtn.addEventListener('pointercancel',clearMarketTabSwitching);
    marketTabBtn.addEventListener('pointerleave',()=>{if(document.body.classList.contains('market-tab-switching'))setTimeout(clearMarketTabSwitching,80)});
    marketPanel=document.createElement('section');marketPanel.className='market-sheet-panel market-test-only';marketPanel.hidden=true;
    marketPanel.innerHTML=marketSheetControlsHtml()+'<div class="market-sheet-list" id="marketSheetList"></div>';
    $('.list-wrap')?.appendChild(marketPanel);
    tabs.addEventListener('click',e=>{
      const b=e.target.closest('[data-tab]');if(!b)return;
      if(b.dataset.tab==='market'){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();activateMarketTab()}
      else{exitMarketTab();if(b.dataset.tab==='shops')requestAnimationFrame(repairShopTabUI)}
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
    clearMarketTabSwitching();
    marketTabActive=true;marketLayerOn=true;layerChip?.classList.add('active');layerChip?.setAttribute('aria-pressed','true');
    document.body.classList.add('market-tab-active');document.body.classList.remove('qa-vending-tab-active');
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
    closeSortMenus();
    clearMarketTabSwitching();
    marketTabActive=false;document.body.classList.remove('market-tab-active');if(marketPanel)marketPanel.hidden=true;
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
        if(open)showMarketSortMenu(wrap,sortButton);
        return;
      }
      const sortValue=e.target.closest('[data-market-sort-value]');
      if(sortValue){e.preventDefault();e.stopPropagation();await setMarketSort(sortValue.dataset.marketSortValue);return}
    });
  }

  function marketSheetTops(){
    const vh=window.innerHeight;
    const filter=document.querySelector('.map-filter-bar');
    const filterBottom=filter?Math.max(64,filter.getBoundingClientRect().bottom+8):72;
    return {
      quarter:Math.max(filterBottom+180,Math.round(vh*.75)),
      half:Math.max(filterBottom+110,Math.round(vh*.50)),
      full:filterBottom
    };
  }
  function marketApplySheetMode(next,animate=true){
    const sheet=document.querySelector('.list-wrap'),mapWrap=document.querySelector('.map-wrap-hero');
    if(!sheet||!['quarter','half','full'].includes(next))return;
    const t=marketSheetTops(),top=t[next];
    sheet.style.setProperty('transition',animate?'top .32s cubic-bezier(.22,.8,.24,1)':'none','important');
    sheet.style.setProperty('top',top+'px','important');
    sheet.dataset.sheet=next;
    document.body.classList.toggle('map-sheet-open',next==='full');
    if(next!=='full')sheet.scrollTop=0;
    if(mapWrap){
      mapWrap.style.setProperty('--map-sheet-top',top+'px');
      mapWrap.style.setProperty('--map-sheet-half-top',t.half+'px');
    }
    try{
      const api=window.FUNY_MAP_SHEET;
      if(api?.getMode?.()!==next)api?.setMode?.(next,animate);
    }catch(_){}
  }
  function marketSheetSnapMode(current,top,dy){
    const t=marketSheetTops();
    if(dy<-22)return current==='quarter'?'half':'full';
    if(dy>22)return current==='full'?'half':'quarter';
    return Object.keys(t).reduce((a,b)=>Math.abs(t[b]-top)<Math.abs(t[a]-top)?b:a,'half');
  }
  function ensureMarketSheetControlBridge(){
    const sheet=document.querySelector('.list-wrap');
    if(!sheet)return;
    let handle=sheet.querySelector('.map-sheet-handle');
    if(!handle){
      handle=document.createElement('div');
      handle.className='map-sheet-handle';
      handle.innerHTML='<span></span>';
      const sticky=sheet.querySelector('.qa-sheet-sticky-head');
      if(sticky&&!document.body.classList.contains('country-japan'))sticky.prepend(handle);
      else sheet.prepend(handle);
    }else if(!handle.querySelector('span')){
      handle.innerHTML='<span></span>';
    }
    const sticky=sheet.querySelector('.qa-sheet-sticky-head');
    if(sticky&&!document.body.classList.contains('country-japan')&&handle.parentNode!==sticky)sticky.prepend(handle);
    handle.hidden=false;
    handle.style.removeProperty('display');
    if(handle.dataset.marketSheetController==='1')return;
    handle.dataset.marketSheetController='1';
    delete handle.dataset.marketSheetBridge;
    let pointerId=null,startX=0,startY=0,startTop=0,startMode='half',moved=false;
    const enabled=()=>document.body.classList.contains('market-page');
    handle.addEventListener('pointerdown',e=>{
      if(!enabled()||e.isPrimary===false)return;
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      pointerId=e.pointerId;startX=e.clientX;startY=e.clientY;moved=false;
      startMode=['quarter','half','full'].includes(sheet.dataset.sheet)?sheet.dataset.sheet:(window.FUNY_MAP_SHEET?.getMode?.()||'half');
      startTop=parseFloat(sheet.style.top)||marketSheetTops()[startMode];
      try{handle.setPointerCapture?.(pointerId)}catch(_){}
    },true);
    handle.addEventListener('pointermove',e=>{
      if(pointerId!==e.pointerId||!enabled())return;
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      const dx=e.clientX-startX,dy=e.clientY-startY;
      if(Math.hypot(dx,dy)>6)moved=true;
      const t=marketSheetTops(),top=Math.max(t.full,Math.min(t.quarter,startTop+dy));
      sheet.style.setProperty('transition','none','important');
      sheet.style.setProperty('top',top+'px','important');
      const mapWrap=document.querySelector('.map-wrap-hero');if(mapWrap)mapWrap.style.setProperty('--map-sheet-top',top+'px');
    },true);
    handle.addEventListener('pointerup',e=>{
      if(pointerId!==e.pointerId||!enabled())return;
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      const dy=e.clientY-startY,current=startMode,top=parseFloat(sheet.style.top)||startTop;
      try{handle.releasePointerCapture?.(pointerId)}catch(_){}
      pointerId=null;
      const next=moved?marketSheetSnapMode(current,top,dy):(current==='quarter'?'half':current==='half'?'full':'half');
      moved=false;marketApplySheetMode(next,true);
    },true);
    handle.addEventListener('pointercancel',e=>{
      if(pointerId!==e.pointerId)return;
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      try{handle.releasePointerCapture?.(pointerId)}catch(_){}
      pointerId=null;moved=false;marketApplySheetMode(startMode,true);
    },true);
    handle.addEventListener('click',e=>{
      if(!enabled())return;
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    },true);
    if(enabled()){
      const initial=['quarter','half','full'].includes(sheet.dataset.sheet)?sheet.dataset.sheet:'half';
      marketApplySheetMode(initial,false);
    }
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
    ensureMarketSheetControlBridge();
  }

  function compactOnScroll(target,scroller){
    if(!target||!scroller)return;let timer=0;
    scroller.addEventListener('scroll',()=>{if(target.classList.contains('open'))return;target.classList.add('is-scrolling');clearTimeout(timer);timer=setTimeout(()=>target.classList.remove('is-scrolling'),850)},{passive:true});
  }
  function postNativeMarketOverlayState(open,navMode='hide'){
    if(!window.ReactNativeWebView)return;
    try{window.ReactNativeWebView.postMessage(JSON.stringify({type:'FUNY_WEB_OVERLAY_STATE',open:!!open,source:'market',navMode:open?navMode:'none'}))}catch(_){}
  }
  function postNativeMarketDetailState(open,scrolled=false,hasMedia=false){
    if(!window.ReactNativeWebView)return;
    try{window.ReactNativeWebView.postMessage(JSON.stringify({type:'FUNY_MARKET_DETAIL_STATE',open:!!open,scrolled:!!scrolled,hasMedia:!!hasMedia}))}catch(_){}
  }
  function postNativeMarketRouteState(route){
    if(!window.ReactNativeWebView||!standaloneMarket)return;
    try{window.ReactNativeWebView.postMessage(JSON.stringify({type:'FUNY_MARKET_ROUTE_STATE',route:String(route||'list')}))}catch(_){}
  }
  function syncNativeMarketOverlayState(){
    const ids=standaloneMarket?['marketRegisterOverlay','marketReportOverlay']:['marketOverlay','marketDetailOverlay','marketRegisterOverlay','marketReportOverlay','marketImageViewer'];
    const fabMenu=$('#marketFabWrap .market-fab-menu');
    const fullOpen=ids.some(id=>{const el=$('#'+id);return !!el&&el.hidden===false});
    const menuOpen=!!fabMenu&&fabMenu.hidden===false;
    postNativeMarketOverlayState(fullOpen||menuOpen,fullOpen?'hide':'dim');
  }

  function buildFab(){
    const home=$('#home-view');if(!home||$('#marketFabWrap')||isJapan())return;
    const wrap=document.createElement('div');wrap.id='marketFabWrap';wrap.className='market-fab-wrap';
    const appMode=!!window.ReactNativeWebView||document.documentElement.classList.contains('app-shell');
    const legacyNativeLauncher=false;

    if(legacyNativeLauncher){
      wrap.classList.add('app-trade-only');
      wrap.innerHTML='<button type="button" class="market-fab-main app-market-trade-button" aria-label="TCG 거래"><span class="market-fab-action-emoji">🃏</span><span class="market-fab-label">TCG 거래</span><span class="market-fab-arrow" aria-hidden="true">›</span></button>';
      home.appendChild(wrap);
      const main=wrap.querySelector('.market-fab-main');
      main.onclick=()=>openOverlay();
      return;
    }

    wrap.innerHTML='<div class="market-fab-dim" hidden></div><div class="market-fab-menu" hidden>'+
      '<a class="market-fab-action" href="live-pin.html"><span><b class="market-fab-action-emoji">⚡</b> LIVE PIN</span><span>›</span></a>'+
      '<button type="button" class="market-fab-action" data-open-market-overlay><span><b class="market-fab-action-emoji">🃏</b> TCG 거래</span><span>›</span></button></div>'+
      '<button type="button" class="market-fab-main" aria-label="제보 · 매물 등록" aria-expanded="false"><span class="market-fab-plus">＋</span><span class="market-fab-label">제보 · 매물 등록</span></button>';
    home.appendChild(wrap);
    const menu=wrap.querySelector('.market-fab-menu'),main=wrap.querySelector('.market-fab-main'),dim=wrap.querySelector('.market-fab-dim');
    const setOpen=open=>{menu.hidden=!open;dim.hidden=!open;wrap.classList.toggle('open',open);main.classList.toggle('open',open);main.setAttribute('aria-expanded',open?'true':'false');wrap.classList.remove('is-scrolling');wrap.querySelector('.market-fab-plus').textContent=open?'×':'＋';postNativeMarketOverlayState(open,'dim')};
    main.onclick=()=>setOpen(menu.hidden);
    dim.onclick=()=>setOpen(false);
    wrap.querySelector('.market-fab-action[href]')?.addEventListener('click',()=>setOpen(false));
    wrap.querySelector('[data-open-market-overlay]').onclick=()=>{setOpen(false);navigateMarketPage()};
    compactOnScroll(wrap,window);compactOnScroll(wrap,$('.list-wrap'));
  }
  function syncFabForCountry(){
    let wrap=$('#marketFabWrap');
    if(isJapan()){
      if(wrap){
        const menu=wrap.querySelector('.market-fab-menu'),dim=wrap.querySelector('.market-fab-dim'),main=wrap.querySelector('.market-fab-main');
        if(menu)menu.hidden=true;
        if(dim)dim.hidden=true;
        wrap.classList.remove('open','is-scrolling');
        if(main){main.classList.remove('open');main.setAttribute('aria-expanded','false')}
        const plus=wrap.querySelector('.market-fab-plus');if(plus)plus.textContent='＋';
        wrap.hidden=true;
      }
      postNativeMarketOverlayState(false);
      return;
    }
    if(!wrap){buildFab();wrap=$('#marketFabWrap')}
    if(wrap)wrap.hidden=false;
  }

  function buildOverlay(){
    if($('#marketOverlay'))return;
    const el=document.createElement('section');el.id='marketOverlay';el.className='market-overlay';el.hidden=true;
    el.innerHTML='<header class="market-overlay-head"><div class="market-overlay-title"><span class="market-overlay-symbol">'+funySymbol+'</span><strong>TCG 거래</strong></div><button type="button" class="market-overlay-close" aria-label="닫기">×</button></header>'+
      '<div class="market-overlay-sticky-tools"><div class="market-overlay-filter-row">'+filterStripHtml('market-overlay-filter')+'</div>'+
      '<div class="market-overlay-listbar"><span id="marketOverlayListCount">매물 0개</span>'+sortMenuHtml('market-overlay-sort')+'</div></div>'+
      '<main class="market-overlay-body"><div class="market-sheet-list" id="marketOverlayList"></div></main>'+
      '<button type="button" class="market-overlay-register" data-open-market-register><span class="market-overlay-register-plus">+</span><span class="market-overlay-register-label">매물 등록</span></button>';
    document.body.appendChild(el);
    const floatingRegister=el.querySelector('[data-open-market-register]');
    el.querySelector('.market-overlay-close').onclick=closeOverlay;
    if(floatingRegister){
      floatingRegister.onclick=openRegister;
      floatingRegister.hidden=true;
      document.body.appendChild(floatingRegister);
    }
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
  const MARKET_SAFETY_NOTICE_KEY='funypin_market_safety_notice_v1_dismissed';
  let marketSafetyNoticeShownThisVisit=false;
  function shouldShowMarketSafetyNotice(){
    try{return localStorage.getItem(MARKET_SAFETY_NOTICE_KEY)!=='1'}catch(_){return true}
  }
  function buildMarketSafetyNotice(){
    if($('#marketSafetyNotice'))return;
    const el=document.createElement('div');el.id='marketSafetyNotice';el.className='market-safety-notice';el.hidden=true;
    el.innerHTML='<section class="market-safety-notice-card" role="dialog" aria-modal="true" aria-labelledby="marketSafetyNoticeTitle">'+
      '<div class="market-safety-notice-icon" aria-hidden="true">✓</div>'+
      '<h2 id="marketSafetyNoticeTitle">카드 거래 이용 안내</h2>'+
      '<p>FUNY PIN의 TCG 거래는 회원 간 개인 거래를 연결하는 공간입니다. FUNY PIN은 거래 당사자가 아니며, 회원 간 거래 과정에서 발생하는 분쟁·사기·상품 하자·배송 문제 등은 당사자 간 해결이 원칙입니다.</p>'+
      '<p>안전한 거래를 위해 가능한 한 직접 만나 상품 상태를 확인한 뒤 거래해 주세요. 선입금 요구, 외부 메신저 유도, 과도한 개인정보 요청에 주의하고 주민등록번호·신분증·계좌 비밀번호 등 민감정보는 공유하지 마세요.</p>'+
      '<label class="market-safety-notice-dismiss"><input id="marketSafetyNoticeDismiss" type="checkbox"><span>다시 보지 않기</span></label>'+
      '<button id="marketSafetyNoticeConfirm" type="button">확인하고 시작하기</button>'+
      '</section>';
    document.body.appendChild(el);
    $('#marketSafetyNoticeConfirm').onclick=()=>{
      if($('#marketSafetyNoticeDismiss')?.checked){try{localStorage.setItem(MARKET_SAFETY_NOTICE_KEY,'1')}catch(_){}}
      el.hidden=true;
    };
  }
  function showMarketSafetyNotice(){
    if(!standaloneMarket||marketSafetyNoticeShownThisVisit||!shouldShowMarketSafetyNotice())return;
    buildMarketSafetyNotice();
    marketSafetyNoticeShownThisVisit=true;
    const el=$('#marketSafetyNotice');if(el)el.hidden=false;
  }
  function openOverlay(){
    buildOverlay();const el=$('#marketOverlay'),registerBtn=document.querySelector('body>.market-overlay-register');el.hidden=false;el.scrollTop=0;el.querySelector('.market-overlay-sticky-tools')?.classList.remove('is-hidden');if(registerBtn){registerBtn.hidden=false;registerBtn.classList.remove('is-scrolling')}document.body.style.overflow='hidden';
    renderListInto($('#marketOverlayList'),overlayFilter);syncSortUI();updateCounts();
    if(!standaloneMarket)postNativeMarketOverlayState(true);
    if(standaloneMarket)postNativeMarketRouteState('list');
    showMarketSafetyNotice();
  }
  function closeOverlay(){if(standaloneMarket){closeStandaloneMarketPage();return}const el=$('#marketOverlay'),registerBtn=document.querySelector('body>.market-overlay-register');if(el)el.hidden=true;if(registerBtn)registerBtn.hidden=true;closeSortMenus();document.body.style.overflow='';requestAnimationFrame(syncNativeMarketOverlayState)}

  function sanitizeExternalMarketUrl(raw){
    const text=String(raw||'').trim();
    const match=text.match(/(?:https?:\/\/|www\.)[A-Za-z0-9\-._~:/?#\[\]@!  function buildRegister(){'()*+,;=%]+/i);
    if(!match)return '';
    return match[0].replace(/[\)\]\}>,.;!?]+$/g,'');
  }
  function normalizedExternalMarketUrl(raw){
    const cleanUrl=sanitizeExternalMarketUrl(raw);
    if(!cleanUrl)return '';
    return /^www\./i.test(cleanUrl)?'https://'+cleanUrl:cleanUrl;
  }
  function applyExternalMarketPaste(input,text){
    const cleanUrl=sanitizeExternalMarketUrl(text);
    input.value=cleanUrl;
    input.dispatchEvent(new Event('input',{bubbles:true}));
  }
  function buildRegister(){
    if($('#marketRegisterOverlay'))return;
    const el=document.createElement('div');el.id='marketRegisterOverlay';el.className='market-register-overlay';el.hidden=true;
    el.innerHTML='<section class="market-register-sheet"><div class="market-register-handle"></div><header class="market-register-head"><strong>매물 등록</strong><button type="button" class="market-register-close" aria-label="닫기">×</button></header><div class="market-register-scroll">'+
      '<div class="market-register-policy"><strong>개인 판매자 등록 안내</strong><span>신규 노출은 하루 최대 10개 · 월 최대 30개이며 등록 후 기본 14일간 노출됩니다. 실제 거래는 회원 간 직접 진행되며 FUNY PIN은 거래 당사자가 아닙니다.</span></div>'+
      '<div id="marketIdentitySection" class="market-form-section market-identity-section" hidden><span class="market-form-label">휴대폰 인증</span><div class="market-identity-card"><div class="market-identity-row"><div><strong id="marketIdentityStatus">휴대폰 인증 상태 확인 중...</strong><span id="marketIdentityHelp">거래 기능 이용을 위해 최초 1회 휴대폰 SMS 인증이 필요합니다.</span></div><button id="marketIdentityStart" class="market-identity-start" type="button" disabled>휴대폰 인증</button></div><div id="marketIdentitySms" class="market-identity-sms" hidden><div class="market-identity-phone-row"><input id="marketIdentityPhone" class="market-identity-input" type="tel" inputmode="tel" autocomplete="tel" maxlength="13" placeholder="휴대폰 번호 입력"><button id="marketIdentitySend" class="market-identity-secondary" type="button">인증번호 받기</button></div><div id="marketIdentityOtpRow" class="market-identity-phone-row" hidden><input id="marketIdentityCode" class="market-identity-input" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="인증번호 6자리"><button id="marketIdentityVerify" class="market-identity-secondary" type="button">인증 확인</button></div><div id="marketIdentityMessage" class="market-identity-message" role="status" aria-live="polite"></div></div></div></div>'+
      '<div class="market-form-section"><label class="market-form-label">카테고리</label><select id="marketRegisterCategory" class="market-select"><option value="pokemon">포켓몬스터</option><option value="onepiece">원피스</option><option value="dragonball">드래곤볼</option><option value="other">기타</option></select></div>'+
      '<div class="market-form-section"><span class="market-form-label">구분</span><div class="market-type-row">'+Object.entries(types).map(([v,l])=>'<button type="button" class="market-type-btn'+(v==='single'?' active':'')+'" data-register-type="'+v+'">'+l+'</button>').join('')+'</div></div>'+
      '<div class="market-form-section"><label class="market-form-label" for="marketRegisterUrl">외부 플랫폼 매물 링크</label><div class="market-url-row"><input id="marketRegisterUrl" class="market-url-input" value="" placeholder="당근 · 번개장터 · BREAK 매물 URL"><button id="marketRegisterLoad" class="market-url-load" type="button">불러오기</button></div><div id="marketPreviewStatus" class="market-preview-status">지원 플랫폼의 본인 매물 링크를 입력해주세요.</div><div id="marketPreview" class="market-preview"><div class="market-preview-meta-row"><div id="marketPreviewProvider" class="market-preview-provider"></div><div id="marketPreviewSellerVerified" class="market-preview-seller-verified" hidden><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7.2 5.6 9.8 11 4.4"/></svg><span id="marketPreviewSellerVerifiedText"></span></div></div><div id="marketPreviewImages" class="market-preview-images"></div><div id="marketPreviewTitle" class="market-preview-title"></div><div id="marketPreviewPrice" class="market-preview-price"></div><div id="marketPreviewDesc" class="market-preview-desc"></div></div></div>'+
      '<div id="marketSellerVerifySection" class="market-form-section market-seller-verify-section" hidden><span class="market-form-label">판매자 인증</span><div class="market-external-verify-card"><div id="marketExternalVerifyStatus" class="market-external-verify-status">현재 매물의 판매자 인증이 필요합니다.</div><button id="marketExternalVerifyStart" class="market-external-verify-start" type="button">판매자 인증 시작</button><div id="marketExternalVerifyChallenge" class="market-external-verify-challenge" hidden><span>발급된 인증코드를 외부 플랫폼 게시글 설명 마지막에 추가하고 저장해주세요.</span><div class="market-external-code-row"><code id="marketExternalVerifyCode"></code><button id="marketExternalVerifyCopy" type="button">복사</button></div><small>외부 플랫폼에 저장이 완료된 뒤 아래 인증 확인 버튼을 눌러주세요. 인증 완료 후 코드는 원본 게시글에서 삭제해도 됩니다.</small><button id="marketExternalVerifyConfirm" class="market-external-verify-confirm" type="button">인증 확인</button></div></div></div>'+
      '<div class="market-form-section"><span class="market-form-label">거래 희망 위치</span><div id="marketRegisterLocationTip" class="market-location-tip">지도를 터치해 핀을 선택해주세요. 현재 위치는 선택을 돕는 용도로만 사용합니다.</div><button id="marketRegisterHere" class="market-register-here" type="button" style="width:100%;margin-bottom:8px">현재 위치로 이동</button><div class="market-register-map-wrap"><div id="marketRegisterMap"></div></div><div class="market-place-input-wrap"><input id="marketRegisterPlaceName" class="market-place-input" type="text" maxlength="30" placeholder="(선택) 장소명을 입력해주세요" autocomplete="off"><span id="marketRegisterPlaceCount" class="market-place-count">0/30</span></div></div>'+
      '<div class="market-form-section market-consent-box"><span class="market-form-label">등록 확인</span>'+
      '<label class="market-consent-item market-consent-all"><input id="marketConsentAll" type="checkbox"><span>개인 판매자임을 확인하며, 외부 매물의 사진·설명을 FUNY PIN에 재게시할 권리가 있고 실제 거래·결제·배송·환불은 원본 외부 플랫폼에서 진행되는 것에 동의합니다.</span></label>'+
      '<label class="market-consent-item market-consent-dispute"><input id="marketDisputeConsent" type="checkbox"><span>본 거래는 회원 간 개인 거래이며, 거래 과정에서 발생하는 분쟁·사기·상품 하자·배송 문제는 거래 당사자 간 해결이 원칙이고 FUNY PIN은 거래 당사자가 아님을 확인했습니다.</span></label></div>'+
      '<div id="marketRegisterError" class="market-register-error"></div></div><button id="marketRegisterSubmit" class="market-register-submit" type="button" disabled>매물 등록하기</button></section>';
    document.body.appendChild(el);
    el.querySelector('.market-register-close').onclick=closeRegister;
    el.addEventListener('click',e=>{if(e.target===el)closeRegister()});
    el.querySelectorAll('[data-register-type]').forEach(b=>b.onclick=()=>{el.querySelectorAll('[data-register-type]').forEach(x=>x.classList.remove('active'));b.classList.add('active');registerType=b.dataset.registerType});
    $('#marketIdentityStart').onclick=startMarketIdentityVerification;
    $('#marketIdentitySend').onclick=sendMarketIdentityOtp;
    $('#marketIdentityVerify').onclick=verifyMarketIdentityOtp;
    $('#marketIdentityPhone').addEventListener('input',()=>{const p=$('#marketIdentityPhone');if(p)p.dataset.e164='';const row=$('#marketIdentityOtpRow');if(row)row.hidden=true;setMarketIdentityMessage('')});
    $('#marketRegisterLoad').onclick=loadPreview;
    $('#marketRegisterUrl').addEventListener('keydown',e=>{if(e.key==='Enter')loadPreview()});
    $('#marketRegisterUrl').addEventListener('paste',e=>{
      const text=e.clipboardData?.getData('text')||'';
      const cleanUrl=sanitizeExternalMarketUrl(text);
      if(cleanUrl){e.preventDefault();applyExternalMarketPaste(e.currentTarget,cleanUrl)}
    });
    $('#marketRegisterUrl').addEventListener('blur',e=>{
      const cleanUrl=sanitizeExternalMarketUrl(e.currentTarget.value);
      if(cleanUrl&&cleanUrl!==e.currentTarget.value)e.currentTarget.value=cleanUrl;
    });
    $('#marketRegisterUrl').addEventListener('input',()=>{if(registerPreviewUrl&&normalizedExternalMarketUrl($('#marketRegisterUrl').value)!==registerPreviewUrl){registerProduct=null;$('#marketPreview')?.classList.remove('show');resetExternalVerification('URL이 변경되었습니다. 매물 정보를 다시 불러와주세요.');syncRegisterSubmitState()}});
    $('#marketExternalVerifyStart').onclick=startExternalSellerVerification;
    $('#marketExternalVerifyConfirm').onclick=confirmExternalSellerVerification;
    $('#marketExternalVerifyCopy').onclick=copyExternalVerificationCode;
    $('#marketRegisterHere').onclick=moveRegisterToCurrent;
    $('#marketConsentAll')?.addEventListener('change',syncRegisterSubmitState);
    $('#marketDisputeConsent')?.addEventListener('change',syncRegisterSubmitState);
    $('#marketRegisterPlaceName')?.addEventListener('input',()=>{
      const input=$('#marketRegisterPlaceName'),count=$('#marketRegisterPlaceCount');
      if(input){input.value=input.value.replace(/[\r\n\t]+/g,' ').replace(/\s{2,}/g,' ').slice(0,30)}
      if(count)count.textContent=String(input?.value.length||0)+'/30';
    });
    $('#marketRegisterSubmit').onclick=submitRegister;
  }
  const MARKET_REGISTER_FALLBACK={lat:37.5665,lng:126.9780,zoom:9};
  function registerSellerLocationPoint(product=registerProduct){
    const lat=Number(product?.seller_location_latitude),lng=Number(product?.seller_location_longitude);
    return Number.isFinite(lat)&&Number.isFinite(lng)?{lat,lng}:null;
  }
  function focusRegisterMapForProduct(product=registerProduct){
    if(!registerMap||registerCoordinate)return;
    const point=registerSellerLocationPoint(product);
    const target=point||MARKET_REGISTER_FALLBACK;
    try{registerMap.setCenter(new naver.maps.LatLng(target.lat,target.lng))}catch(_){}
    try{registerMap.setZoom(point?14:MARKET_REGISTER_FALLBACK.zoom)}catch(_){}
    const tip=$('#marketRegisterLocationTip');
    if(tip)tip.textContent=point
      ?'외부 플랫폼에서 확인 가능한 판매자 위치를 기준으로 지도를 표시했습니다. 실제 거래 위치를 지도에서 선택해주세요.'
      :'판매자 위치를 확인할 수 없어 서울·수도권 기준으로 표시했습니다. 실제 거래 위치를 지도에서 선택해주세요.';
  }
  async function loadMarketSellerAccess(force=false){
    if(!A.session?.user?.id){marketSellerAllowed=false;marketSellerAccessLoaded=true;return false}
    if(marketSellerAccessLoaded&&!force)return marketSellerAllowed;
    try{
      const data=await A.invokeFunction('market-listing-register-test',{action:'access'});
      marketSellerAllowed=data?.allowed===true;
    }catch(_){marketSellerAllowed=false}
    marketSellerAccessLoaded=true;
    return marketSellerAllowed;
  }
  async function openRegister(syncRoute=true){
    if(!A.session){A.goLogin(location.pathname+location.search+location.hash);return}
    if(!(await loadMarketSellerAccess(true))){
      marketToast(marketTr('현재 매물 등록은 허용된 계정만 이용할 수 있어요.','Listing registration is currently available only to approved accounts.'));
      return;
    }
    buildRegister();const el=$('#marketRegisterOverlay'),floatingRegister=document.querySelector('body>.market-overlay-register');if(floatingRegister)floatingRegister.hidden=true;el.hidden=false;document.body.style.overflow='hidden';
    if(standaloneMarket&&syncRoute&&!/^#\/register$/i.test(location.hash))setStandaloneRoute('#/register');
    postNativeMarketOverlayState(true);if(standaloneMarket)postNativeMarketRouteState('register');
    const scroll=el.querySelector('.market-register-scroll');if(scroll){scroll.scrollTop=0;requestAnimationFrame(()=>scroll.scrollTo({top:0,left:0,behavior:'auto'}))}

    loadMarketIdentityStatus();
    loadSellerVerificationStatus();
    if(!registerMap){
      const initial=new naver.maps.LatLng(MARKET_REGISTER_FALLBACK.lat,MARKET_REGISTER_FALLBACK.lng);
      registerMap=new naver.maps.Map('marketRegisterMap',{center:initial,zoom:MARKET_REGISTER_FALLBACK.zoom,minZoom:7,maxZoom:19,zoomControl:false,mapDataControl:false,scaleControl:false,logoControl:false});
      const choose=e=>selectRegisterLocation(e.coord.lat(),e.coord.lng());
      naver.maps.Event.addListener(registerMap,'click',choose);
      naver.maps.Event.addListener(registerMap,'longtap',choose);
      setTimeout(()=>{naver.maps.Event.trigger(registerMap,'resize');focusRegisterMapForProduct(registerProduct)},120);
    }else setTimeout(()=>{naver.maps.Event.trigger(registerMap,'resize');focusRegisterMapForProduct(registerProduct)},80);
    syncRegisterSubmitState();
  }
  function closeRegister(){const el=$('#marketRegisterOverlay'),floatingRegister=document.querySelector('body>.market-overlay-register');if(el)el.hidden=true;if($('#marketOverlay')?.hidden===false&&floatingRegister)floatingRegister.hidden=false;if($('#marketOverlay')?.hidden!==false)document.body.style.overflow='';if(standaloneMarket&&/^#\/register$/i.test(location.hash))setStandaloneRoute('',true);if(standaloneMarket)postNativeMarketRouteState('list');requestAnimationFrame(syncNativeMarketOverlayState)}
  function setRegisterError(msg){const el=$('#marketRegisterError');if(!el)return;el.textContent=msg||'';el.style.display=msg?'block':'none'}
  async function marketFunctionErrorMessage(error,fallback='요청을 처리하지 못했습니다.'){
    try{
      const ctx=error?.context;
      if(ctx?.clone){
        const res=ctx.clone();
        const data=await res.json().catch(()=>null);
        const localized=String(marketEn?data?.error_en:data?.error||data?.message||'').trim();
        if(localized)return localized;
      }
    }catch(_){}
    const raw=String(error?.message||'').trim();
    if(/Token has expired or is invalid|otp_expired/i.test(raw))return marketTr('인증번호가 올바르지 않거나 만료되었습니다. 새 인증번호를 받아 다시 시도해주세요.','The verification code is incorrect or has expired. Request a new code and try again.');
    if(/rate.?limit/i.test(raw))return marketTr('인증번호 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.','Too many verification code requests. Please try again later.');
    if(raw&&!/Edge Function returned a non-2xx status code/i.test(raw)&&!/PHONE_[A-Z_]+/.test(raw))return raw;
    return fallback;
  }
  function setMarketIdentityUi({loading=false,verified=registerIdentityVerified,configured=registerIdentityConfigured,message=''}={}){
    const section=$('#marketIdentitySection'),status=$('#marketIdentityStatus'),help=$('#marketIdentityHelp'),btn=$('#marketIdentityStart'),sms=$('#marketIdentitySms');
    if(!section)return;
    section.hidden=!!loading||!!verified;
    section.classList.toggle('is-verified',!!verified);
    if(status)status.textContent=message||(loading?'휴대폰 인증 상태 확인 중...':verified?'휴대폰 인증 완료 ✓':configured?'휴대폰 인증이 필요합니다.':'휴대폰 인증 준비 중');
    if(help)help.textContent=verified
      ?'인증된 휴대폰으로 거래 기능을 이용할 수 있습니다.'
      :configured
        ?'거래 기능 이용을 위해 최초 1회 휴대폰 SMS 인증이 필요합니다.'
        :'SOLAPI 문자 인증 연결이 완료되면 이용할 수 있습니다.';
    if(btn){
      btn.hidden=!!verified;
      btn.disabled=!!loading||!configured;
      btn.textContent=loading?'확인 중...':configured?'휴대폰 인증':'준비 중';
    }
    if(sms&&(verified||!configured)){sms.hidden=true;sms.dataset.open=''}
  }
  function normalizeMarketPhone(raw){
    const digits=String(raw||'').replace(/\D/g,'');
    if(/^010\d{8}$/.test(digits))return '+82'+digits.slice(1);
    if(/^8210\d{8}$/.test(digits))return '+'+digits;
    return '';
  }
  function setMarketIdentityMessage(message='',error=false){
    const el=$('#marketIdentityMessage');if(!el)return;
    el.textContent=message;el.classList.toggle('error',!!error)
  }
  async function loadMarketIdentityStatus(){
    if(registerIdentityLoading)return registerIdentityVerified;
    registerIdentityLoading=true;setMarketIdentityUi({loading:true});
    try{
      const userId=A.session?.user?.id;
      const [verificationResult,settingsResult]=await Promise.all([
        userId
          ?A.client.from('user_verifications').select('phone_verified_at,verification_level').eq('user_id',userId).maybeSingle()
          :Promise.resolve({data:null,error:null}),
        A.client.from('account_verification_settings').select('phone_sms_enabled,sms_provider').eq('id',1).maybeSingle()
      ]);
      if(verificationResult?.error)throw verificationResult.error;
      if(settingsResult?.error)throw settingsResult.error;

      registerIdentityVerified=!!verificationResult?.data?.phone_verified_at&&Number(verificationResult?.data?.verification_level||0)>=2;
      registerIdentityConfigured=settingsResult?.data?.phone_sms_enabled===true;
      registerIdentityVerifiedAt=verificationResult?.data?.phone_verified_at||'';

      setMarketIdentityUi({loading:false,verified:registerIdentityVerified,configured:registerIdentityConfigured});
      syncRegisterSubmitState();

      A.invokeFunction('account-verification',{action:'status'}).catch(()=>{});
      return registerIdentityVerified;
    }catch(e){
      try{
        const data=await A.invokeFunction('account-verification',{action:'status'});
        registerIdentityVerified=!!data?.phone_verified;
        registerIdentityConfigured=data?.phone_sms_enabled===true;
        registerIdentityVerifiedAt=data?.phone_verified_at||'';
        setMarketIdentityUi({loading:false,verified:registerIdentityVerified,configured:registerIdentityConfigured});
        syncRegisterSubmitState();
        return registerIdentityVerified;
      }catch(_){
        registerIdentityVerified=false;registerIdentityConfigured=false;
        setMarketIdentityUi({loading:false,verified:false,configured:false,message:'휴대폰 인증 상태를 확인하지 못했습니다.'});
        syncRegisterSubmitState();
        return false;
      }
    }finally{registerIdentityLoading=false}
  }
  function saveMarketIdentityDraft(){
    try{
      const draft={
        category:$('#marketRegisterCategory')?.value||'pokemon',
        type:registerType||'single',
        url:$('#marketRegisterUrl')?.value||'',
        place:$('#marketRegisterPlaceName')?.value||'',
        consent:!!$('#marketConsentAll')?.checked,
        lat:registerCoordinate?.lat??null,
        lng:registerCoordinate?.lng??null
      };
      sessionStorage.setItem('funy_market_identity_draft',JSON.stringify(draft));
    }catch(_){}
  }
  async function restoreMarketIdentityDraft(){
    let draft=null;
    try{draft=JSON.parse(sessionStorage.getItem('funy_market_identity_draft')||'null')}catch(_){}
    if(!draft)return;
    const category=$('#marketRegisterCategory');if(category&&draft.category)category.value=draft.category;
    registerType=types[draft.type]?draft.type:'single';
    document.querySelectorAll('#marketRegisterOverlay [data-register-type]').forEach(b=>b.classList.toggle('active',b.dataset.registerType===registerType));
    const url=$('#marketRegisterUrl');if(url)url.value=draft.url||'';
    const place=$('#marketRegisterPlaceName');if(place)place.value=String(draft.place||'').slice(0,30);
    const count=$('#marketRegisterPlaceCount');if(count)count.textContent=String(place?.value.length||0)+'/30';
    const consent=$('#marketConsentAll');if(consent)consent.checked=!!draft.consent;
    if(Number.isFinite(Number(draft.lat))&&Number.isFinite(Number(draft.lng))){
      selectRegisterLocation(Number(draft.lat),Number(draft.lng));
      try{registerMap?.setCenter(new naver.maps.LatLng(Number(draft.lat),Number(draft.lng)))}catch(_){}
    }
    if(draft.url)await loadPreview();
    syncRegisterSubmitState();
    try{sessionStorage.removeItem('funy_market_identity_draft')}catch(_){}
  }
  async function startMarketIdentityVerification(){
    if(registerIdentityVerified)return;
    if(!registerIdentityConfigured){setRegisterError(marketTr('휴대폰 SMS 인증을 준비 중입니다. 잠시 후 다시 시도해주세요.','Phone SMS verification is being prepared. Please try again later.'));return}
    const sms=$('#marketIdentitySms'),phone=$('#marketIdentityPhone');
    if(sms){sms.hidden=false;sms.dataset.open='1'}
    setMarketIdentityMessage('');
    setTimeout(()=>phone?.focus(),0)
  }
  let marketSmsResendTimer=0,marketSmsResendLeft=0;
  function startMarketSmsResendCooldown(){
    const send=$('#marketIdentitySend');if(!send)return;
    clearInterval(marketSmsResendTimer);marketSmsResendLeft=60;send.disabled=true;send.textContent='60초 후 재전송';
    marketSmsResendTimer=setInterval(()=>{
      marketSmsResendLeft-=1;
      if(marketSmsResendLeft<=0){clearInterval(marketSmsResendTimer);marketSmsResendTimer=0;send.disabled=false;send.textContent='인증번호 다시 받기';return}
      send.textContent=marketSmsResendLeft+'초 후 재전송';
    },1000)
  }
  async function sendMarketIdentityOtp(){
    const phoneInput=$('#marketIdentityPhone'),send=$('#marketIdentitySend'),otpRow=$('#marketIdentityOtpRow');
    if(send?.disabled||marketSmsResendLeft>0)return;
    const phone=normalizeMarketPhone(phoneInput?.value);
    if(!phone){setMarketIdentityMessage(marketTr('휴대폰 번호를 정확히 입력해주세요.','Please enter a valid phone number.'),true);return}
    if(send){send.disabled=true;send.textContent='전송 중...'}
    setMarketIdentityMessage('');
    saveMarketIdentityDraft();
    let sent=false;
    try{
      const data=await A.invokeFunction('account-verification',{action:'send_phone_otp',phone});
      if(!data?.ok)throw Error(data?.error||'인증번호를 전송하지 못했습니다.');
      if(data?.already_verified){
        registerIdentityVerified=true;registerIdentityConfigured=true;registerIdentityVerifiedAt=data?.phone_verified_at||'';
        setMarketIdentityUi({verified:true,message:'휴대폰 인증 완료 ✓'});syncRegisterSubmitState();return
      }
      sent=true;
      if(phoneInput)phoneInput.dataset.e164=phone;
      if(otpRow)otpRow.hidden=false;
      setMarketIdentityMessage('인증번호를 전송했습니다. 문자로 받은 6자리 번호를 입력해주세요.');
      startMarketSmsResendCooldown();
      setTimeout(()=>$('#marketIdentityCode')?.focus(),0)
    }catch(e){
      setMarketIdentityMessage(await marketFunctionErrorMessage(e,marketTr('인증번호를 전송하지 못했습니다. 잠시 후 다시 시도해주세요.','We couldn\'t send the verification code. Please try again shortly.')),true)
    }finally{if(send&&!sent&&!registerIdentityVerified){send.disabled=false;send.textContent='인증번호 받기'}}
  }
  async function verifyMarketIdentityOtp(){
    const phoneInput=$('#marketIdentityPhone'),codeInput=$('#marketIdentityCode'),verify=$('#marketIdentityVerify');
    const phone=String(phoneInput?.dataset?.e164||normalizeMarketPhone(phoneInput?.value)||'');
    const token=String(codeInput?.value||'').replace(/\D/g,'');
    if(!phone){setMarketIdentityMessage(marketTr('먼저 인증번호를 요청해주세요.','Please request a verification code first.'),true);return}
    if(!/^\d{6}$/.test(token)){setMarketIdentityMessage(marketTr('문자로 받은 인증번호 6자리를 입력해주세요.','Enter the 6-digit verification code from the text message.'),true);return}
    if(verify){verify.disabled=true;verify.textContent='확인 중...'}
    setMarketIdentityMessage('');
    try{
      const data=await A.invokeFunction('account-verification',{action:'verify_phone_otp',phone,token});
      if(!data?.ok||!data?.phone_verified)throw Error(data?.error||'휴대폰 인증 완료 상태를 확인하지 못했습니다.');
      registerIdentityVerified=true;
      registerIdentityConfigured=true;
      registerIdentityVerifiedAt=data?.phone_verified_at||'';
      setMarketIdentityUi({verified:true,message:'휴대폰 인증 완료 ✓'});
      setMarketIdentityMessage('');
      syncRegisterSubmitState();
      marketToast('휴대폰 인증이 완료됐어요.');
    }catch(e){
      setMarketIdentityMessage(await marketFunctionErrorMessage(e,marketTr('인증번호를 확인하지 못했습니다. 다시 시도해주세요.','We couldn\'t verify the code. Please try again.')),true)
    }finally{if(verify){verify.disabled=false;verify.textContent='인증 확인'}}
  }
  async function handleMarketIdentityReturn(){
    try{
      const u=new URL(location.href);
      if(u.searchParams.get('identityReturn')==='1'){
        ['identityReturn','identityVerificationId','identity_verification_id','code','message','pgCode','pgMessage'].forEach(k=>u.searchParams.delete(k));
        history.replaceState(null,'',u.pathname+(u.searchParams.toString()?'?'+u.searchParams.toString():'')+u.hash)
      }
    }catch(_){}
    return false
  }

  function sellerAccountProviderLabel(provider){
    return providerName({provider})||String(provider||'외부 플랫폼');
  }
  function hidePreviewSellerVerification(){
    const el=$('#marketPreviewSellerVerified'),text=$('#marketPreviewSellerVerifiedText');
    if(el)el.hidden=true;
    if(text)text.textContent='';
  }
  function showPreviewSellerVerification(provider){
    const el=$('#marketPreviewSellerVerified'),text=$('#marketPreviewSellerVerifiedText');
    if(text)text.textContent=sellerAccountProviderLabel(provider)+' 판매자 인증 완료';
    if(el)el.hidden=false;
  }
  function showSellerVerificationSection(message='플랫폼 판매자 인증은 최초 1회만 필요합니다.'){
    const section=$('#marketSellerVerifySection'),status=$('#marketExternalVerifyStatus'),start=$('#marketExternalVerifyStart');
    if(section)section.hidden=false;
    if(status){status.textContent=message;status.classList.remove('verified')}
    if(start){start.hidden=false;start.disabled=!registerProduct;start.textContent='최초 판매자 인증'}
  }
  function hideSellerVerificationSection(){
    const section=$('#marketSellerVerifySection');
    if(section)section.hidden=true;
  }
  function matchingVerifiedAccount(product){
    if(!product)return null;
    const provider=String(product.provider||''),sellerId=String(product.external_seller_id||'');
    if(!provider||!sellerId)return null;
    return registerVerifiedAccounts.find(x=>String(x.provider||'')===provider&&String(x.external_seller_id||'')===sellerId)||null;
  }
  function applyCachedSellerAccountVerification(product){
    const account=matchingVerifiedAccount(product);if(!account)return false;
    setExternalVerified(sellerAccountProviderLabel(account.provider)+' 판매자 인증 완료',{accountId:account.id||'',scope:'account'});
    return true;
  }
  async function syncSellerVerificationForProduct(product=registerProduct){
    if(!product)return false;
    if(applyCachedSellerAccountVerification(product))return true;
    hidePreviewSellerVerification();
    const url=registerPreviewUrl||normalizedExternalMarketUrl($('#marketRegisterUrl')?.value);
    if(!url){
      showSellerVerificationSection(sellerAccountProviderLabel(product.provider)+' 판매자 인증이 필요합니다.');
      return false;
    }
    try{
      const {data,error}=await A.client.functions.invoke('market-external-seller-verify-test',{body:{action:'resolve',url}});
      if(error)throw error;
      if(data?.ok&&data?.already_verified){
        setExternalVerified(
          sellerAccountProviderLabel(product.provider)+' 판매자 인증 완료 ✓ · 최초 인증 이력을 사용합니다.',
          {accountId:data.external_account_id||'',scope:'account'}
        );
        return true;
      }
      showSellerVerificationSection(
        data?.account_reuse_supported
          ?sellerAccountProviderLabel(product.provider)+' 판매자 인증은 최초 1회만 필요합니다.'
          :sellerAccountProviderLabel(product.provider)+' 현재 매물의 판매자 인증이 필요합니다.'
      );
      return false;
    }catch(_){
      showSellerVerificationSection(sellerAccountProviderLabel(product.provider)+' 판매자 인증이 필요합니다.');
      return false;
    }
  }
  async function loadSellerVerificationStatus(){
    if(registerSellerStatusLoading)return;
    registerSellerStatusLoading=true;
    try{
      const {data,error}=await A.client.functions.invoke('market-external-seller-verify-test',{body:{action:'status'}});
      if(error)throw error;
      registerVerifiedAccounts=Array.isArray(data?.external_accounts)?data.external_accounts.filter(x=>x?.verification_status==='verified'):[];
      registerSellerStatusLoading=false;
      if(registerProduct&&!registerExternalVerified)syncSellerVerificationForProduct(registerProduct).catch(()=>{});
    }catch(_){
      registerVerifiedAccounts=[];
      registerSellerStatusLoading=false;
      if(registerProduct&&!registerExternalVerified)showSellerVerificationSection(sellerAccountProviderLabel(registerProduct.provider)+' 판매자 인증이 필요합니다.');
    }
  }
  function registerConsentsOk(){return !!$('#marketConsentAll')?.checked&&!!$('#marketDisputeConsent')?.checked}
  function syncRegisterSubmitState(){const btn=$('#marketRegisterSubmit');if(btn)btn.disabled=!(registerIdentityVerified&&registerProduct&&registerCoordinate&&registerConsentsOk()&&registerExternalVerified)}
  function resetExternalVerification(message='외부 매물을 확인해주세요.'){
    registerExternalVerified=false;registerChallengeId='';registerVerifiedChallengeId='';registerExternalAccountId='';registerVerificationScope='';
    const status=$('#marketExternalVerifyStatus'),start=$('#marketExternalVerifyStart'),challenge=$('#marketExternalVerifyChallenge'),code=$('#marketExternalVerifyCode');
    hidePreviewSellerVerification();
    hideSellerVerificationSection();
    if(status){status.textContent=message;status.classList.remove('verified')}
    if(start){start.hidden=false;start.disabled=!registerProduct;start.textContent='최초 판매자 인증'}
    if(challenge)challenge.hidden=true;
    if(code)code.textContent='';
    syncRegisterSubmitState();
  }
  function setExternalVerified(message,{accountId='',challengeId='',scope=''}={}){
    const wasVerified=registerExternalVerified;
    registerExternalVerified=true;registerChallengeId='';registerExternalAccountId=accountId||'';registerVerifiedChallengeId=challengeId||'';registerVerificationScope=scope||'';
    if(accountId&&registerProduct?.provider&&registerProduct?.external_seller_id&&!registerVerifiedAccounts.some(x=>String(x.id)===String(accountId))){
      registerVerifiedAccounts.unshift({id:accountId,provider:registerProduct.provider,external_seller_id:registerProduct.external_seller_id,verification_status:'verified'});
    }
    const status=$('#marketExternalVerifyStatus'),start=$('#marketExternalVerifyStart'),challenge=$('#marketExternalVerifyChallenge');
    if(status){status.textContent=message;status.classList.add('verified')}
    if(start){start.hidden=true;start.disabled=true}
    if(challenge)challenge.hidden=true;
    showPreviewSellerVerification(registerProduct?.provider);
    hideSellerVerificationSection();
    syncRegisterSubmitState();
    if(!wasVerified)marketToast(sellerAccountProviderLabel(registerProduct?.provider)+' 판매자 인증 완료');
  }
  async function startExternalSellerVerification(){
    if(!registerIdentityVerified){setRegisterError('먼저 휴대폰 SMS 인증을 완료해주세요.');return}
    if(!registerProduct)return;
    const url=registerPreviewUrl||normalizedExternalMarketUrl($('#marketRegisterUrl')?.value);if(!url)return;
    const btn=$('#marketExternalVerifyStart');if(btn){btn.disabled=true;btn.textContent='인증 준비 중...'}
    setRegisterError('');
    try{
      const {data,error}=await A.client.functions.invoke('market-external-seller-verify-test',{body:{action:'start',url}});
      if(error)throw error;if(!data?.ok)throw Error(data?.error||'판매자 인증을 시작하지 못했습니다.');
      if(data.already_verified){setExternalVerified(providerName(registerProduct)+' 판매자 계정 인증 완료 ✓ · 추가 인증 없이 등록할 수 있습니다.',{accountId:data.external_account_id||'',scope:'account'});return}
      registerChallengeId=data.challenge_id||'';
      const code=$('#marketExternalVerifyCode'),challenge=$('#marketExternalVerifyChallenge'),status=$('#marketExternalVerifyStatus'),start=$('#marketExternalVerifyStart');
      if(code)code.textContent=data.verification_code||'';
      if(start)start.hidden=true;
      if(challenge)challenge.hidden=false;
      if(status)status.textContent='인증코드를 외부 플랫폼 게시글에 추가하고 저장한 뒤 인증 확인을 눌러주세요.';
    }catch(e){setRegisterError(await marketFunctionErrorMessage(e,'판매자 인증을 시작하지 못했습니다.'))}
    finally{if(btn&&!registerExternalVerified&&!registerChallengeId){btn.hidden=false;btn.disabled=false;btn.textContent='최초 판매자 인증'}}
  }
  async function confirmExternalSellerVerification(){
    if(!registerChallengeId)return;
    const url=registerPreviewUrl||normalizedExternalMarketUrl($('#marketRegisterUrl')?.value),btn=$('#marketExternalVerifyConfirm');
    if(btn){btn.disabled=true;btn.textContent='확인 중...'}setRegisterError('');
    try{
      const {data,error}=await A.client.functions.invoke('market-external-seller-verify-test',{body:{action:'verify',challenge_id:registerChallengeId,url}});
      if(error)throw error;if(!data?.ok||!data?.verified)throw Error(data?.error||'판매자 인증에 실패했습니다.');
      setExternalVerified(
        data.account_verified?providerName(registerProduct)+' 판매자 계정 인증 완료 ✓':'이 외부 매물의 판매자 인증 완료 ✓',
        {accountId:data.external_account_id||'',challengeId:data.challenge_id||registerChallengeId,scope:data.seller_verification_scope||'listing'}
      );
    }catch(e){setRegisterError(await marketFunctionErrorMessage(e,'판매자 인증에 실패했습니다.'))}
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
    registerProduct=x;registerPreviewUrl=normalizedExternalMarketUrl($('#marketRegisterUrl')?.value)||'';$('#marketPreview').classList.add('show');
    focusRegisterMapForProduct(x);
    const arr=[...(Array.isArray(x.images)?x.images:[]),x.image].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).slice(0,20);
    $('#marketPreviewImages').innerHTML=arr.length?arr.map(u=>'<img class="market-preview-image" src="'+esc(u)+'" alt="" referrerpolicy="no-referrer">').join(''):'<span class="market-preview-ph">NO IMAGE</span>';
    $('#marketPreviewProvider').textContent='출처 · '+providerName(x);
    $('#marketPreviewTitle').textContent=x.title||'상품명 없음';$('#marketPreviewPrice').textContent=x.price||'가격 정보 없음';$('#marketPreviewDesc').textContent=x.description||'상품 설명 없음';registerDirectBuy=false;resetExternalVerification(providerName(x)+' 매물 확인 완료');
    if(registerSellerStatusLoading)return;
    syncSellerVerificationForProduct(x).catch(()=>{});
    if(!registerVerifiedAccounts.length)loadSellerVerificationStatus();
  }
  async function loadPreview(){
    const raw=$('#marketRegisterUrl')?.value||'',cleanUrl=sanitizeExternalMarketUrl(raw),url=normalizedExternalMarketUrl(raw);
    if(cleanUrl&&$('#marketRegisterUrl'))$('#marketRegisterUrl').value=cleanUrl;
    if(!url){setRegisterError('http 또는 www로 시작하는 외부 매물 링크를 입력해주세요.');return}
    setRegisterError('');registerProduct=null;registerPreviewUrl='';resetExternalVerification('매물 정보를 확인하는 중...');$('#marketRegisterLoad').disabled=true;$('#marketPreviewStatus').textContent='외부 매물 정보를 불러오는 중...';
    try{
      const {data,error}=await A.client.functions.invoke('market-listing-preview-test',{body:{url}});
      if(error)throw error;
      if(!data?.ok)throw Error(data?.error||marketTr('매물 정보를 불러오지 못했습니다.','We couldn\'t load the listing.'));
      if(data?.tcg_allowed===false){
        registerProduct=null;registerPreviewUrl='';
        $('#marketPreview')?.classList.remove('show');
        resetExternalVerification(marketTr('TCG 관련 매물만 등록할 수 있습니다.','Only TCG-related listings can be registered.'));
        syncRegisterSubmitState();
        setRegisterError(marketTr(
          'TCG 관련 매물만 등록할 수 있어요. 입력한 매물이 트레이딩 카드 또는 TCG 관련 상품인지 확인해주세요.',
          'Only TCG-related listings can be registered. Please check that this listing is for trading cards or a TCG-related product.'
        ));
        $('#marketPreviewStatus').textContent=marketTr('등록할 수 없는 매물입니다.','This listing cannot be registered.');
        return;
      }
      if(data?.provider==='break'&&data?.break_transaction_mode!=='instant'){
        registerProduct=null;registerPreviewUrl='';
        $('#marketPreview')?.classList.remove('show');
        const auction=data?.break_transaction_mode==='auction';
        resetExternalVerification(marketTr("BREAK는 '즉시 거래' 상품만 등록할 수 있습니다.","Only BREAK instant-sale listings can be registered."));
        syncRegisterSubmitState();
        setRegisterError(auction
          ?marketTr("BREAK는 '즉시 거래' 상품만 등록할 수 있어요. 경매 상품은 등록할 수 없습니다.","Only BREAK instant-sale listings can be registered. Auction listings are not supported.")
          :marketTr("BREAK 거래 방식을 확인할 수 없습니다. '즉시 거래' 상품 링크인지 확인해주세요.","We couldn't confirm the BREAK transaction type. Please use an instant-sale listing.")
        );
        $('#marketPreviewStatus').textContent=auction
          ?marketTr('BREAK 경매 상품은 등록할 수 없습니다.','BREAK auction listings cannot be registered.')
          :marketTr('BREAK 즉시 거래 상품 여부를 확인해주세요.','Please confirm this is a BREAK instant-sale listing.');
        return;
      }
      renderPreview(data);
      $('#marketPreviewStatus').textContent=providerName(data)+' · '+marketTr('TCG 매물 확인 완료','TCG listing confirmed')+' · '+marketTr('이미지','Images')+' '+((data.images||[]).length||1)+'장'
    }
    catch(e){
      registerProduct=null;
      $('#marketPreview')?.classList.remove('show');
      syncRegisterSubmitState();
      setRegisterError(await marketFunctionErrorMessage(e,marketTr('매물 정보를 불러오지 못했습니다.','We couldn\'t load the listing.')));
      $('#marketPreviewStatus').textContent=marketTr('매물 정보를 불러오지 못했습니다.','We couldn\'t load the listing.')
    }
    finally{$('#marketRegisterLoad').disabled=false}
  }
  function selectRegisterLocation(lat,lng){
    registerLat=+Number(lat).toFixed(6);registerLng=+Number(lng).toFixed(6);registerCoordinate={lat:registerLat,lng:registerLng};registerLocation='';
    const pos=new naver.maps.LatLng(registerLat,registerLng);
    if(!registerPin)registerPin=new naver.maps.Marker({map:registerMap,position:pos,zIndex:220,title:'선택한 위치'});
    else{registerPin.setPosition(pos);registerPin.setMap(registerMap)}
    syncRegisterSubmitState();
    clearTimeout(reverseTimer);reverseTimer=setTimeout(async()=>{
      try{registerLocation=(await reverseMarketRegistrationAddress(registerLat,registerLng)).displayAddress||''}catch(_){registerLocation=''}
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
  function resetRegisterDraft(){
    registerProduct=null;registerPreviewUrl='';registerType='single';registerDirectBuy=false;registerExternalVerified=false;registerChallengeId='';registerVerifiedChallengeId='';registerExternalAccountId='';registerVerificationScope='';
    registerLat=null;registerLng=null;registerLocation='';registerCoordinate=null;
    clearTimeout(reverseTimer);
    try{registerPin?.setMap(null)}catch(_){}
    registerPin=null;clearRegisterCurrent();
    const category=$('#marketRegisterCategory');if(category)category.value='pokemon';
    document.querySelectorAll('#marketRegisterOverlay [data-register-type]').forEach(b=>b.classList.toggle('active',b.dataset.registerType==='single'));
    const url=$('#marketRegisterUrl');if(url)url.value='';
    const place=$('#marketRegisterPlaceName');if(place)place.value='';
    const placeCount=$('#marketRegisterPlaceCount');if(placeCount)placeCount.textContent='0/30';
    const consent=$('#marketConsentAll');if(consent)consent.checked=false;
    $('#marketPreview')?.classList.remove('show');
    const status=$('#marketPreviewStatus');if(status)status.textContent='지원 플랫폼의 본인 매물 링크를 입력해주세요.';
    const images=$('#marketPreviewImages');if(images)images.innerHTML='';
    ['marketPreviewProvider','marketPreviewTitle','marketPreviewPrice','marketPreviewDesc'].forEach(id=>{const el=$('#'+id);if(el)el.textContent=''});
    setRegisterError('');
    const tip=$('#marketRegisterLocationTip');if(tip)tip.textContent='판매자 위치를 확인할 수 없어 서울·수도권 기준으로 표시했습니다. 실제 거래 위치를 지도에서 선택해주세요.';
    if(registerMap&&!registerCoordinate)focusRegisterMapForProduct(null);
    resetExternalVerification('외부 매물을 확인해주세요.');
    syncRegisterSubmitState();
  }
  async function submitRegister(){
    if(!registerIdentityVerified){setRegisterError('휴대폰 SMS 인증을 완료해주세요.');return}
    if(!registerProduct)return;if(!registerExternalVerified){setRegisterError('외부 플랫폼 판매자 인증을 완료해주세요.');return}if(!registerCoordinate){setRegisterError('지도에서 거래 희망 위치를 선택해주세요.');return}if(!registerConsentsOk()){setRegisterError('등록 확인 항목에 전체 동의해주세요.');return}setRegisterError('');const btn=$('#marketRegisterSubmit');btn.disabled=true;btn.textContent='등록 중...';
    try{
      const profile=await A.getProfile(),user=A.session.user,nick=profile?.nickname||user.user_metadata?.nickname||user.user_metadata?.name||('FUNY회원'+String(user.id).replace(/-/g,'').slice(-4).toUpperCase());
      const resolvedLocation=await reverseMarketRegistrationAddress(registerLat,registerLng);
      if(!resolvedLocation.displayAddress)throw new Error('선택한 위치의 주소를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.');
      registerLocation=resolvedLocation.displayAddress;
      const listing={
        seller_nickname:nick,
        external_url:registerProduct.final_url||registerProduct.source_url||normalizedExternalMarketUrl($('#marketRegisterUrl').value),
        tcg_category:$('#marketRegisterCategory').value,
        item_type:registerType,
        latitude:registerLat,
        longitude:registerLng,
        road_address:resolvedLocation.roadAddress||null,
        location_name:resolvedLocation.displayAddress,
        place_name:($('#marketRegisterPlaceName')?.value||'').trim().slice(0,30)||null
      };
      const {data:registered,error}=await A.client.functions.invoke('market-listing-register-test',{body:{
        listing,
        external_account_id:registerExternalAccountId||null,
        challenge_id:registerVerifiedChallengeId||null
      }});
      if(error)throw error;
      if(!registered?.ok||!registered?.listing?.id)throw Error(registered?.error||'매물을 등록하지 못했습니다.');
      const data=registered.listing;
      resetRegisterDraft();closeRegister();await loadRows();openDetail(data.id);
    }catch(e){setRegisterError(await marketFunctionErrorMessage(e,'매물을 등록하지 못했습니다.'))}
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
  const marketShareUrl=id=>'https://funypin.kr'+'/market.html#/listing/'+encodeURIComponent(id);
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
    if(!A.session){A.goLogin(location.pathname+location.search+location.hash);return}
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
  function marketNaverMaxZoom(map){
    let max=19;
    try{const value=Number(map?.getOptions?.('maxZoom'));if(Number.isFinite(value))max=value}catch(_){}
    return max;
  }
  function marketRequestedFocusZoom(map){
    let raw='max';
    try{raw=String(new URLSearchParams(location.search).get('zoom')||'max').trim().toLowerCase()}catch(_){}
    const max=marketNaverMaxZoom(map);
    if(raw==='max')return max;
    const n=Number(raw);
    return Number.isFinite(n)?Math.max(1,Math.min(max,Math.round(n))):max;
  }
  async function focusMapCoordinateWithCollapsedSheet(lat,lng,{zoom=null,animateSheet=true}={}){
    const map=await waitForMap();
    if(!map||!Number.isFinite(+lat)||!Number.isFinite(+lng))return false;
    ensureMarketSheetControlBridge();
    marketApplySheetMode('quarter',animateSheet);
    try{window.FUNY_MAP_SHEET?.collapse?.()}catch(_){}
    await sleep(animateSheet?180:60);

    const pos=new naver.maps.LatLng(+lat,+lng);
    try{naver.maps.Event.trigger(map,'resize')}catch(_){}
    try{map.setCenter(pos)}catch(_){}
    try{map.setZoom(Number.isFinite(Number(zoom))?Number(zoom):marketRequestedFocusZoom(map))}catch(_){}
    await sleep(180);

    // Production shop-focus 기준: popup/marker selection can never change the target coordinate.
    try{map.setCenter(pos)}catch(_){}
    marketApplySheetMode('quarter',false);
    try{window.FUNY_MAP_SHEET?.collapse?.()}catch(_){}
    return true;
  }
  window.FUNY_MAP_FOCUS_WITH_SHEET=focusMapCoordinateWithCollapsedSheet;

  function marketMapDeepLink(id){
    const u=new URL('/shops.html',location.origin);
    u.hash='';
    u.searchParams.set('focus','market');
    u.searchParams.set('marketId',id);
    u.searchParams.set('zoom','max');
    u.searchParams.set('popup','1');
    return u.pathname+(u.searchParams.toString()?'?'+u.searchParams.toString():'');
  }
  async function focusMarketOnMap(id,{updateUrl=true}={}){
    const x=rows.find(r=>String(r.id)===String(id));
    if(!x||!Number.isFinite(+x.latitude)||!Number.isFinite(+x.longitude))return false;
    if(standaloneMarket){
      try{localStorage.setItem('funy_market_pending_focus',JSON.stringify({id:String(x.id),at:Date.now()}))}catch(_){}
      if(window.ReactNativeWebView){try{window.ReactNativeWebView.postMessage(JSON.stringify({type:'OPEN_NATIVE',route:'/(tabs)/map?country=KR&from=market-'+Date.now()}));return true}catch(_){}}
      location.href=marketMapDeepLink(x.id);return true;
    }
    marketLayerOn=true;
    if(layerChip){layerChip.classList.add('active');layerChip.setAttribute('aria-pressed','true')}
    await syncMarkers();
    const focusMap=await waitForMap();
    const focused=await focusMapCoordinateWithCollapsedSheet(+x.latitude,+x.longitude,{zoom:marketNaverMaxZoom(focusMap),animateSheet:true});
    if(!focused)return false;
    let m=markers.get(x.id);
    if(!m){await syncMarkers();m=markers.get(x.id)}
    if(selectedMarkerId===x.id)closePopup();
    if(m)selectMarker(x,m);
    const map=await waitForMap(),pos=new naver.maps.LatLng(+x.latitude,+x.longitude);
    try{map?.setCenter(pos)}catch(_){}
    marketApplySheetMode('quarter',false);
    try{window.FUNY_MAP_SHEET?.collapse?.()}catch(_){}
    if(updateUrl)history.pushState({focus:'market',marketId:x.id},'',marketMapDeepLink(x.id));
    return true;
  }

  function buildDetail(){
    if($('#marketDetailOverlay'))return;
    const el=document.createElement('section');el.id='marketDetailOverlay';el.className='market-detail-overlay';el.hidden=true;
    el.innerHTML='<header class="market-detail-head"><button type="button" id="marketDetailBack" class="market-detail-back" aria-label="이전"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18 9 12l6-6"/></svg></button><div class="market-detail-head-actions"><button type="button" id="marketDetailShare" aria-label="공유"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m0 0L8 8m4-4 4 4M5 13v6h14v-6"/></svg></button><button type="button" id="marketDetailMore" aria-label="더보기"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/></svg></button></div><div id="marketDetailMoreMenu" class="market-detail-more-menu" hidden></div></header><div id="marketDetailBody" class="market-detail-body"></div>';
    document.body.appendChild(el);$('#marketDetailBack').onclick=closeDetail;
  }
  function openDetail(id,syncRoute=true){
    const x=rows.find(r=>r.id===id);if(!x)return;
    const standaloneDetailHash='#/listing/'+encodeURIComponent(id);
    if(standaloneMarket&&syncRoute&&location.hash!==standaloneDetailHash)setStandaloneRoute(standaloneDetailHash);
    buildDetail();
    const overlay=$('#marketDetailOverlay'),ended=['sold','expired','hidden'].includes(x.listing_status),sourceName=providerName(x),isOwner=A.session?.user?.id===x.seller_user_id,providerClass='provider-'+(x.provider||'external');
    const body=$('#marketDetailBody');
    const detailImages=[...(Array.isArray(x.image_urls)?x.image_urls:[]),x.thumbnail_url].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i);
    overlay.classList.toggle('has-media',detailImages.length>0);overlay.classList.remove('is-scrolled');overlay.scrollTop=0;
    const hero=detailImages.length?'<div class="market-detail-carousel"><div class="market-detail-carousel-track" id="marketDetailCarousel">'+detailImages.map((u,i)=>'<button type="button" class="market-detail-slide" data-market-fullscreen="'+i+'" aria-label="이미지 전체화면 보기"><img src="'+esc(u)+'" alt="매물 이미지 '+(i+1)+'" referrerpolicy="no-referrer"></button>').join('')+'</div>'+(detailImages.length>1?'<div class="market-detail-page"><span id="marketDetailPageNow">1</span> / '+detailImages.length+'</div>':'')+'</div>':'<div class="market-detail-hero"><div class="market-detail-ph">NO IMAGE</div></div>';
    body.innerHTML=hero+
      '<div class="market-detail-info">'+
        '<div class="market-detail-tags"><span class="market-detail-tag provider '+esc(x.provider||'')+'">'+esc(sourceName)+'</span><span class="market-detail-tag cat">'+esc(categoryBadgeNames[x.tcg_category]||'기타')+'</span><span class="market-detail-tag type">'+esc(types[x.item_type]||'기타')+'</span></div>'+
        '<div class="market-detail-title-row"><h1 class="market-detail-title">'+esc(x.title)+'</h1><button type="button" id="marketDetailFavorite" class="market-detail-favorite" aria-label="관심 매물" aria-pressed="false">'+heartHtml(false)+'</button></div>'+
        '<div class="market-detail-price">'+money(x.price)+'</div>'+
        '<div class="market-detail-location-main">'+marketLocationHtml(x,'',true)+'</div>'+
        '<div class="market-detail-seller">'+marketUserIcon+'<span class="market-detail-seller-name">'+esc(x.seller_nickname||'회원')+'</span><span class="market-detail-seller-age">· '+age(x.created_at)+'</span></div>'+
        '<div id="marketDetailStats" class="market-detail-stats">조회 - · 관심 -</div>'+
      '</div>'+
      '<section class="market-detail-section market-detail-description"><div class="market-detail-desc">'+esc(x.description||'등록된 설명이 없습니다.')+'</div></section>'+
      '<section class="market-detail-section market-detail-location-section"><div class="market-detail-section-head"><h3>거래 희망 위치</h3><button type="button" id="marketDetailMapLink" class="market-detail-map-link">위치 확인하기 <span aria-hidden="true">›</span></button></div><div class="market-detail-map-card"><div id="marketDetailMap" class="market-detail-map"></div></div></section>'+
      '<section class="market-detail-safety"><strong>안전한 개인 거래를 위해 확인해주세요</strong><p>FUNY PIN의 TCG 거래는 회원 간 개인 거래를 연결하는 공간입니다. FUNY PIN은 거래 당사자가 아니며, 거래 과정에서 발생하는 분쟁·사기·상품 하자·배송 문제 등은 거래 당사자 간 해결이 원칙입니다.</p><p>가능한 한 직접 만나 상품 상태를 확인한 뒤 거래하고, 선입금 요구·외부 메신저 유도·과도한 개인정보 요청에 주의해주세요.</p></section>'+
      '<section class="market-detail-guide"><strong>안내사항</strong><p>실제 구매·결제·배송·환불은 '+esc(sourceName)+' 원본 매물에서 진행해주세요.</p><span>출처 · '+esc(sourceName)+' · 원본 마지막 확인 '+(x.source_last_checked_at?age(x.source_last_checked_at):'미확인')+' · 권리침해 문의 funypin.kr@gmail.com</span></section>'+
      '<div class="market-detail-bottom"><a id="marketDetailTrade" class="market-detail-trade '+providerClass+(ended?' disabled':'')+'" href="'+esc(x.external_url)+'" target="_blank" rel="noopener">'+(ended?'판매가 종료된 매물입니다':esc(sourceName)+'에서 구매하기')+'</a></div>';
    const floatingRegister=document.querySelector('body>.market-overlay-register');if(floatingRegister)floatingRegister.hidden=true;
    overlay.hidden=false;document.body.style.overflow='hidden';
    if(!standaloneMarket)postNativeMarketOverlayState(true);
    postNativeMarketDetailState(true,false,detailImages.length>0);if(standaloneMarket)postNativeMarketRouteState('detail');
    overlay.scrollTop=0;
    requestAnimationFrame(()=>{overlay.scrollTo({top:0,left:0,behavior:'auto'});const track=$('#marketDetailCarousel');if(track)track.scrollLeft=0});
    setTimeout(()=>overlay.scrollTo({top:0,left:0,behavior:'auto'}),0);
    let detailWasScrolled=false;
    overlay.onscroll=()=>{const scrolled=overlay.scrollTop>42;overlay.classList.toggle('is-scrolled',scrolled);if(scrolled!==detailWasScrolled){detailWasScrolled=scrolled;postNativeMarketDetailState(true,scrolled,detailImages.length>0)}};
    if(detailImages.length){
      const track=$('#marketDetailCarousel'),page=$('#marketDetailPageNow');
      track?.addEventListener('scroll',()=>{if(!page)return;const w=track.clientWidth||1;page.textContent=String(Math.max(1,Math.min(detailImages.length,Math.round(track.scrollLeft/w)+1)))},{passive:true});
      body.querySelectorAll('[data-market-fullscreen]').forEach(btn=>btn.onclick=()=>openMarketImageViewer(detailImages,Number(btn.dataset.marketFullscreen)||0));
    }
    if(Number.isFinite(+x.latitude)&&Number.isFinite(+x.longitude))setTimeout(()=>{
      const map=new naver.maps.Map('marketDetailMap',{center:new naver.maps.LatLng(+x.latitude,+x.longitude),zoom:16,draggable:false,scrollWheel:false,disableDoubleClickZoom:true,zoomControl:false,mapDataControl:false,scaleControl:false,logoControl:false});
      new naver.maps.Marker({map,position:new naver.maps.LatLng(+x.latitude,+x.longitude),icon:markerIcon(true)});naver.maps.Event.trigger(map,'resize');
    },80);
    $('#marketDetailMapLink')?.addEventListener('click',()=>focusMarketOnMap(x.id,{updateUrl:true}));
    $('#marketDetailFavorite')?.addEventListener('click',()=>toggleMarketFavorite(x.id));
    (async()=>{
      let address=await reverseMarketAddress(x).catch(()=> '');
      if(!address||isGenericMarketLocation(address)){
        const resolved=await reverseMarketRegistrationAddress(x.latitude,x.longitude,true).catch(()=>({displayAddress:'',roadAddress:''}));
        if(resolved.displayAddress){
          address=resolved.displayAddress;x._displayAddress=address;x._addressResolved=true;
          persistResolvedMarketLocation(x,address,resolved.roadAddress);
        }
      }
      if(!address)return;
      const loc=$('#marketDetailBody .market-detail-location-main');
      if(loc)loc.innerHTML=marketLocationHtml(x,address,true);
      renderListInto($('#marketSheetList'),marketFilter);renderListInto($('#marketOverlayList'),overlayFilter);
      if(selectedMarkerId===x.id){
        const m=markers.get(x.id);
        if(m){try{popup?.close()}catch(_){}popup=new naver.maps.InfoWindow({content:popupHtml(x),borderWidth:0,backgroundColor:'transparent',anchorSize:new naver.maps.Size(0,0),pixelOffset:new naver.maps.Point(0,-8),disableAutoPan:true});popup.open(window.FUNY_NAVER_MAP_API?.getMap?.(),m)}
      }
    })();
    updateMarketDetailStats(x.id,true);
    const more=$('#marketDetailMore'),moreMenu=$('#marketDetailMoreMenu');
    if(moreMenu)moreMenu.innerHTML=isOwner
      ?'<button type="button" data-market-more-refresh>원본 정보 새로고침</button><button type="button" data-market-more-hide>매물 숨기기</button><button type="button" class="danger" data-market-more-delete>삭제하기</button>'
      :'<button type="button" data-market-more-block>이 사용자의 매물 보지 않기</button><button type="button" data-market-more-report>신고 · 권리침해 접수</button>';
    if(more)more.onclick=e=>{e.stopPropagation();if(moreMenu)moreMenu.hidden=!moreMenu.hidden};
    const moreRefresh=moreMenu?.querySelector('[data-market-more-refresh]'),moreHide=moreMenu?.querySelector('[data-market-more-hide]'),moreDelete=moreMenu?.querySelector('[data-market-more-delete]'),moreBlock=moreMenu?.querySelector('[data-market-more-block]'),moreReport=moreMenu?.querySelector('[data-market-more-report]');
    if(moreRefresh)moreRefresh.onclick=()=>{moreMenu.hidden=true;refreshOwnedListing(x.id,moreRefresh)};
    if(moreHide)moreHide.onclick=()=>{moreMenu.hidden=true;hideOwnedListing(x.id,moreHide)};
    if(moreDelete)moreDelete.onclick=()=>{moreMenu.hidden=true;deleteOwnedListing(x)};
    if(moreBlock)moreBlock.onclick=()=>{moreMenu.hidden=true;blockMarketSeller(x)};
    if(moreReport)moreReport.onclick=()=>{moreMenu.hidden=true;openMarketReport(x.id)};
    const shareBtn=$('#marketDetailShare');
    if(shareBtn)shareBtn.onclick=async()=>{
      const url=marketShareUrl(x.id);
      try{if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(JSON.stringify({type:'SHARE_URL',title:x.title,text:x.title,url}));return;}if(navigator.share)await navigator.share({title:x.title,text:x.title,url});else{await navigator.clipboard.writeText(url);marketToast('매물 링크를 복사했어요.')}}catch(_){}
    };
    $('#marketDetailTrade')?.addEventListener('click',e=>{if(ended){e.preventDefault();return}if(window.ReactNativeWebView){e.preventDefault();openExternalMarketUrl(x.external_url)}});
  }
  function closeDetail(){
    const el=$('#marketDetailOverlay');if(el){el.hidden=true;el.classList.remove('is-scrolled');el.onscroll=null}
    const floatingRegister=document.querySelector('body>.market-overlay-register');
    if(floatingRegister)floatingRegister.hidden=$('#marketOverlay')?.hidden!==false;
    if(standaloneMarket&&/^#\/listing\//i.test(location.hash))setStandaloneRoute('',true);
    else if(/^#\/?market\//i.test(location.hash))history.replaceState(null,'',location.pathname+location.search);
    if($('#marketOverlay')?.hidden!==false&&$('#marketRegisterOverlay')?.hidden!==false)document.body.style.overflow='';
    postNativeMarketDetailState(false,false,false);if(standaloneMarket)postNativeMarketRouteState('list');
    requestAnimationFrame(syncNativeMarketOverlayState);
  }

  async function deleteOwnedListing(x){
    if(!x?.id||x.seller_user_id!==A.session?.user?.id)return;
    if(!confirm('이 매물을 삭제할까요?\n삭제 후 FUNY PIN에서는 더 이상 노출되지 않습니다.'))return;
    try{
      const {data,error}=await A.client.functions.invoke('market-listing-owner-action-test',{body:{action:'delete',listing_id:x.id}});
      if(error)throw error;if(!data?.ok)throw Error(data?.error||'매물을 삭제하지 못했습니다.');
      closeDetail();await loadRows();marketToast('매물을 삭제했어요.');
    }catch(_){marketToast('매물 삭제에 실패했습니다.')}
  }
  async function blockMarketSeller(x){
    if(!A.session){A.goLogin(location.pathname+location.search+location.hash);return}
    const blockedId=x?.seller_user_id;if(!blockedId||blockedId===A.session?.user?.id)return;
    const name=x?.seller_nickname||'이 사용자';
    if(!confirm(name+'님의 매물을 더 이상 보지 않을까요?'))return;
    try{
      const {error}=await A.client.from('market_user_blocks').insert({blocker_user_id:A.session.user.id,blocked_user_id:blockedId});
      if(error&&error.code!=='23505')throw error;
      marketBlockedUserIds.add(String(blockedId));
      closeDetail();await loadRows();marketToast('이 사용자의 매물을 숨겼어요.');
    }catch(_){marketToast('사용자 차단에 실패했습니다.')}
  }

  async function refreshOwnedListing(id,btn=null){
    if(btn){btn.disabled=true;btn.textContent='새로고침 중...'}
    try{
      const {data,error}=await A.client.functions.invoke('market-listing-owner-action-test',{body:{action:'refresh',listing_id:id}});
      if(error)throw error;if(!data?.ok)throw Error(data?.error||'원본 정보를 새로고침하지 못했습니다.');
      await loadRows();openDetail(id);marketToast('원본 정보를 새로고침했어요.');
    }catch(e){alert(await marketFunctionErrorMessage(e,'원본 정보를 새로고침하지 못했습니다.'))}
    finally{if(btn){btn.disabled=false;btn.textContent='원본 정보 새로고침'}}
  }
  async function hideOwnedListing(id,btn=null){
    if(!confirm('이 매물을 FUNY PIN에서 숨길까요? 원본 외부 매물은 삭제되지 않습니다.'))return;
    if(btn)btn.disabled=true;
    try{
      const {data,error}=await A.client.functions.invoke('market-listing-owner-action-test',{body:{action:'hide',listing_id:id,reason:'seller_request'}});
      if(error)throw error;if(!data?.ok)throw Error(data?.error||'매물을 숨기지 못했습니다.');
      closeDetail();await loadRows();marketToast('매물을 숨겼어요.');
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
  function openMarketReport(id){
    if(!A.session){A.goLogin(location.pathname+location.search+location.hash);return}
    buildMarketReport();marketReportListingId=id;$('#marketReportOverlay').hidden=false;document.body.style.overflow='hidden';postNativeMarketOverlayState(true)
  }
  function closeMarketReport(){const el=$('#marketReportOverlay');if(el)el.hidden=true;marketReportListingId='';if($('#marketDetailOverlay')?.hidden!==false)document.body.style.overflow='hidden';else document.body.style.overflow='';requestAnimationFrame(syncNativeMarketOverlayState)}
  async function submitMarketReport(){
    if(!marketReportListingId)return;const btn=$('#marketReportSubmit');btn.disabled=true;btn.textContent='접수 중...';
    try{
      const {error}=await A.client.from('market_listing_reports').insert({listing_id:marketReportListingId,reporter_user_id:A.session.user.id,report_type:$('#marketReportType').value,reason:$('#marketReportReason').value.trim()||null});
      if(error)throw error;alert('신고가 접수되었습니다.');closeMarketReport();
    }catch(e){alert('신고 접수 실패: '+String(e?.message||e))}
    finally{btn.disabled=false;btn.textContent='신고 접수'}
  }

  async function waitForMarketGeocoder(){
    for(let i=0;i<20;i++){
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
    const direct=formatMarketRoadAddress(res?.v2?.address?.roadAddress);
    if(direct)return direct;
    const results=Array.isArray(res?.v2?.results)?res.v2.results:[];
    const road=results.find(x=>String(x?.name||'').toLowerCase()==='roadaddr');
    const label=formatMarketRoadAddress(makeNaverAddress(road));
    if(label)return label;
    const legacy=Array.isArray(res?.result?.items)?res.result.items:[];
    const legacyRoad=legacy.find(x=>x?.isRoadAddress===true&&String(x?.address||'').trim());
    return legacyRoad?formatMarketRoadAddress(legacyRoad.address):'';
  }
  async function reverseMarketRoadAddress(lat,lng){
    const a=Number(lat),b=Number(lng);
    if(!Number.isFinite(a)||!Number.isFinite(b))return '';
    const ready=await waitForMarketGeocoder();if(!ready)return '';
    const pos=new naver.maps.LatLng(a,b);
    const call=orders=>new Promise(resolve=>{
      naver.maps.Service.reverseGeocode({coords:pos,orders},(status,res)=>{
        if(status===naver.maps.Service.Status.ERROR||!res){resolve('');return}
        resolve(marketRoadAddressFromReverseResult(res)||'');
      });
    });
    let label='';
    try{label=await call(naver.maps.Service.OrderType.ROAD_ADDR||'roadaddr')}catch(_){}
    if(!label){
      await sleep(120);
      try{label=await call('roadaddr,addr,admcode,legalcode')}catch(_){}
    }
    return label||'';
  }
  function marketRegionAddressFromReverseResult(res){
    const results=Array.isArray(res?.v2?.results)?res.v2.results:[];
    const pick=names=>results.find(x=>names.includes(String(x?.name||'').toLowerCase()));
    const item=pick(['addr','admcode','legalcode'])||results[0];
    const region=item?.region||{};
    const parts=[
      region.area1?.name||'',
      region.area2?.name||'',
      region.area3?.name||'',
      region.area4?.name||''
    ].filter(Boolean);
    return formatMarketRoadAddress(parts.join(' '));
  }
  function marketRoadLevelAddressFromReverseResult(res){
    const results=Array.isArray(res?.v2?.results)?res.v2.results:[];
    const road=results.find(x=>String(x?.name||'').toLowerCase()==='roadaddr');
    if(!road)return '';
    const region=road.region||{},land=road.land||{};
    const parts=[region.area1?.name||'',region.area2?.name||''];
    if(/(읍|면)$/.test(String(region.area3?.name||'')))parts.push(region.area3.name);
    if(land.name)parts.push(land.name);
    return formatMarketRoadAddress(parts.filter(Boolean).join(' '));
  }
  async function reverseMarketRegistrationAddress(lat,lng,allowServerFallback=true){
    const a=Number(lat),b=Number(lng);
    if(!Number.isFinite(a)||!Number.isFinite(b))return {displayAddress:'',roadAddress:'',source:''};
    let displayAddress='',roadAddress='',source='',naverStatus='';
    const ready=await waitForMarketGeocoder();
    if(ready){
      try{
        const pos=new naver.maps.LatLng(a,b);
        const res=await new Promise(resolve=>{
          naver.maps.Service.reverseGeocode({coords:pos,orders:'roadaddr,addr,admcode,legalcode'},(status,response)=>{
            naverStatus=String(status??'');
            if(status===naver.maps.Service.Status.ERROR||!response){resolve(null);return}
            resolve(response);
          });
        });
        if(res){
          roadAddress=marketRoadLevelAddressFromReverseResult(res);
          displayAddress=roadAddress||marketRegionAddressFromReverseResult(res);
          if(displayAddress)source='naver';
        }
      }catch(e){naverStatus=naverStatus||String(e?.message||e||'exception')}
    }else naverStatus='service_unavailable';
    if(!displayAddress&&allowServerFallback){
      try{
        const {data,error}=await A.client.functions.invoke('market-reverse-geocode-test',{body:{lat:a,lng:b,naver_status:naverStatus}});
        if(!error&&data?.ok){
          displayAddress=formatMarketRoadAddress(data.display_address||'');
          roadAddress=formatMarketRoadAddress(data.road_address||'');
          if(displayAddress)source=data.source||'server';
        }
      }catch(_){}
    }
    return {displayAddress,roadAddress,source};
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
  async function persistResolvedMarketLocation(row,displayAddress,roadAddress=''){
    if(!A.session?.user?.id||String(row?.seller_user_id)!==String(A.session.user.id))return;
    const display=formatMarketRoadAddress(displayAddress),road=formatMarketRoadAddress(roadAddress);
    if(!row?.id||!display||isGenericMarketLocation(display))return;
    if(formatMarketRoadAddress(row.location_name)===display&&formatMarketRoadAddress(row.road_address)===road)return;
    try{
      const update={location_name:display,updated_at:new Date().toISOString()};
      if(road)update.road_address=road;
      const {data,error}=await A.client.from('market_listings')
        .update(update)
        .eq('id',row.id)
        .eq('seller_user_id',A.session.user.id)
        .select('id,road_address,location_name')
        .maybeSingle();
      if(!error&&data?.id){row.location_name=display;if(road)row.road_address=road}
    }catch(_){}
  }
  async function reverseMarketAddress(row){
    const persistedRoad=formatMarketRoadAddress(row?.road_address);
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
    try{
      const resolved=await reverseMarketRegistrationAddress(lat,lng,false);
      if(resolved.displayAddress){
        addressCache.set(key,resolved.displayAddress);row._displayAddress=resolved.displayAddress;row._addressResolved=true;
        persistResolvedMarketLocation(row,resolved.displayAddress,resolved.roadAddress);
        return resolved.displayAddress;
      }
    }catch(_){}
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
      label=formatMarketRoadAddress(label);
      addressCache.set(key,label);row._displayAddress=label;row._addressResolved=true;
      return label;
    }
    row._displayAddress='';row._addressResolved=false;return '';
  }
  async function hydrateMarketAddresses(list){
    const queue=(list||[]).filter(x=>x?._addressResolved!==true&&Number.isFinite(+x.latitude)&&Number.isFinite(+x.longitude));let index=0;
    const worker=async()=>{while(index<queue.length){const row=queue[index++];try{await reverseMarketAddress(row)}catch(_){row._displayAddress='';row._addressResolved=false}}};
    await Promise.all([worker(),worker(),worker()]);
  }

  async function loadRows(){
    marketRowsLoaded=false;updateCounts();
    const userId=A.session?.user?.id||'';
    const listingPromise=A.client.from('market_listings').select('*').eq('listing_side','sell').in('listing_status',['active','reserved']).gt('expires_at',new Date().toISOString()).order('published_at',{ascending:false});
    const blockPromise=userId
      ?A.client.from('market_user_blocks').select('blocked_user_id').eq('blocker_user_id',userId)
      :Promise.resolve({data:[],error:null});
    const [listingRes,blockRes]=await Promise.all([listingPromise,blockPromise]);
    if(listingRes.error){console.error('[MARKET] load failed',listingRes.error);return}
    marketBlockedUserIds=new Set((blockRes.data||[]).map(x=>String(x.blocked_user_id)));
    rows=(listingRes.data||[]).filter(x=>!marketBlockedUserIds.has(String(x.seller_user_id)));
    marketRowsLoaded=true;updateCounts();syncMarkers();
    await hydrateMarketAddresses(rows).catch(()=>{});
    renderListInto($('#marketSheetList'),marketFilter);renderListInto($('#marketOverlayList'),overlayFilter);
    const refreshAddresses=()=>hydrateMarketAddresses(rows).then(()=>{
      renderListInto($('#marketSheetList'),marketFilter);renderListInto($('#marketOverlayList'),overlayFilter);
      if(selectedMarkerId){const x=rows.find(r=>r.id===selectedMarkerId),m=markers.get(selectedMarkerId);if(x&&m){try{popup?.close()}catch(_){}popup=new naver.maps.InfoWindow({content:popupHtml(x),borderWidth:0,backgroundColor:'transparent',anchorSize:new naver.maps.Size(0,0),pixelOffset:new naver.maps.Point(0,-8),disableAutoPan:true});popup.open(window.FUNY_NAVER_MAP_API?.getMap?.(),m)}}
    }).catch(()=>{});
    refreshAddresses();setTimeout(refreshAddresses,1600);setTimeout(refreshAddresses,4200);
  }

  async function applyStandaloneRoute(){
    if(!standaloneMarket)return;
    const listing=location.hash.match(/^#\/listing\/([0-9a-f-]{36})$/i);
    const register=/^#\/register$/i.test(location.hash);
    if(listing){
      if($('#marketRegisterOverlay')?.hidden===false)closeRegister();
      openOverlay();openDetail(decodeURIComponent(listing[1]),false);return;
    }
    if(register){
      if($('#marketDetailOverlay')?.hidden===false)closeDetail();
      openOverlay();await openRegister(false);return;
    }
    if($('#marketDetailOverlay')?.hidden===false)closeDetail();
    if($('#marketRegisterOverlay')?.hidden===false)closeRegister();
    openOverlay();
  }

  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&marketSortPortal){const button=marketSortPortal.button;closeSortMenus();button.focus();}});
  window.addEventListener('resize',()=>closeSortMenus());
  window.addEventListener('scroll',e=>{if(marketSortPortal&&!marketSortPortal.host.contains(e.target))closeSortMenus();},{passive:true,capture:true});
  window.addEventListener('pagehide',()=>closeSortMenus());
  document.addEventListener('click',e=>{
    if(!e.target.closest('.market-sort-wrap'))closeSortMenus();
    const popupTarget=e.target.closest('[data-market-popup-id]'),markerTarget=e.target.closest('.market-map-pin');
    if(selectedMarkerId&&!popupTarget&&!markerTarget)closePopup();
    const card=e.target.closest('[data-market-id]');if(card){e.preventDefault();if(standaloneMarket)openDetail(card.dataset.marketId);else navigateMarketPage('#/listing/'+encodeURIComponent(card.dataset.marketId));return}
    const pop=popupTarget;if(pop){e.preventDefault();if(standaloneMarket)openDetail(pop.dataset.marketPopupId);else navigateMarketPage('#/listing/'+encodeURIComponent(pop.dataset.marketPopupId))}
  },true);

  const search=$('#map-shop-search');search?.addEventListener('input',()=>{renderListInto($('#marketSheetList'),marketFilter);renderListInto($('#marketOverlayList'),overlayFilter);updateCounts();syncMarkers()});
  window.addEventListener('funy:mapdatachange',()=>{ensureLayerChip();syncLayerOrder();syncFabForCountry();syncMarkers()});
  new MutationObserver(()=>{ensureLayerChip();syncFabForCountry();if(isJapan()&&marketTabActive){document.querySelector('.qa-list-tab[data-tab="shops"]')?.click()}syncMarkers()}).observe(document.body,{attributes:true,attributeFilter:['class']});

  const sheetRecoveryObserver=new MutationObserver(()=>ensureMarketSheetControlBridge());
  const sheetRecoveryRoot=document.querySelector('.list-wrap');
  if(sheetRecoveryRoot)sheetRecoveryObserver.observe(sheetRecoveryRoot,{childList:true,subtree:true});

  const bootParams=new URLSearchParams(location.search),bootMarketId=bootParams.get('marketId'),bootRegister=bootParams.get('marketRegister'),bootDetail=bootParams.get('marketDetail'),bootFocus=bootParams.get('focus');
  const legacyHash=location.hash.match(/^#\/?market\/([0-9a-f-]{36})$/i);

  if(mapDiscoveryMode&&(bootRegister==='1'||(bootDetail==='1'&&bootMarketId)||legacyHash)){
    const route=bootRegister==='1'?'#/register':'#/listing/'+encodeURIComponent(bootMarketId||legacyHash?.[1]||'');
    location.replace(marketPageUrl(route));
    return;
  }

  if(standaloneMarket){
    try{document.getElementById('marketReportOverlay')?.remove()}catch(_){}
    marketReportListingId='';
    buildOverlay();openOverlay();
    const rowsReadyPromise=authReady.then(()=>loadRows()).catch(error=>console.error('[MARKET] initial load failed',error));
    setInterval(()=>{bindHorizontalScrollers();syncSortUI()},900);
    window.addEventListener('pagehide',()=>postNativeMarketOverlayState(false));
    await rowsReadyPromise;
    await handleMarketIdentityReturn();
    if(bootRegister==='1'){
      try{const u=new URL(location.href);u.searchParams.delete('marketRegister');history.replaceState(null,'',u.pathname+(u.searchParams.toString()?'?'+u.searchParams.toString():'')+'#/register')}catch(_){}
    }else if(bootDetail==='1'&&bootMarketId){
      try{const u=new URL(location.href);u.searchParams.delete('marketDetail');u.searchParams.delete('marketId');history.replaceState(null,'',u.pathname+(u.searchParams.toString()?'?'+u.searchParams.toString():'')+'#/listing/'+encodeURIComponent(bootMarketId))}catch(_){}
    }else if(legacyHash){
      setStandaloneRoute('#/listing/'+encodeURIComponent(legacyHash[1]),true);
    }
    await applyStandaloneRoute();
    window.addEventListener('popstate',()=>{void applyStandaloneRoute()});
    window.addEventListener('hashchange',()=>{void applyStandaloneRoute()});
    return;
  }

  const mapReadyPromise=waitForMap().then(map=>{if(map){naver.maps.Event.addListener(map,'zoom_changed',()=>syncMarkers());naver.maps.Event.addListener(map,'dragstart',()=>closePopup());syncMarkers()}return map});
  const tabs=await waitForQaTabs().then(readyTabs=>{if(readyTabs)setupMarketPanel(readyTabs);return readyTabs});
  syncMarketSearchPlaceholder();syncMarketTabLabels();
  ensureLayerChip();observeLayerOrder();syncLayerOrder();syncFabForCountry();
  const rowsReadyPromise=authReady.then(()=>loadRows()).catch(error=>console.error('[MARKET] initial load failed',error));
  setInterval(()=>{syncMarketSearchPlaceholder();syncMarketTabLabels();ensureLayerChip();syncLayerOrder();syncFabForCountry();bindHorizontalScrollers();if(tabs&&!tabs.querySelector('[data-tab="market"]'))setupMarketPanel(tabs);if(marketTabActive){document.querySelectorAll('.qa-list-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab==='market'));enforceMarketTabExclusiveUI()}else repairShopTabUI()},900);
  window.addEventListener('resize',()=>{const sheet=document.querySelector('.list-wrap'),mode=sheet?.dataset.sheet||'half';requestAnimationFrame(()=>marketApplySheetMode(mode,false))});
  window.addEventListener('pagehide',()=>postNativeMarketOverlayState(false));
  await Promise.all([rowsReadyPromise,mapReadyPromise]);
  let pendingFocusId='';
  try{const pending=JSON.parse(localStorage.getItem('funy_market_pending_focus')||'null');if(pending&&Date.now()-Number(pending.at||0)<15000)pendingFocusId=String(pending.id||'');localStorage.removeItem('funy_market_pending_focus')}catch(_){}
  const focusId=bootFocus==='market'&&bootMarketId?bootMarketId:pendingFocusId;
  if(focusId)await focusMarketOnMap(focusId,{updateUrl:!(bootFocus==='market'&&bootMarketId)});
})();