/* FUNY PIN integrated MARKET test runtime */
(async function(){
  const A=window.FUNY_WEB_AUTH;
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>n==null?'가격 정보 없음':Number(n).toLocaleString('ko-KR')+'원';
  const cats={pokemon:'포켓몬',onepiece:'원피스',dragonball:'드래곤볼',other:'기타'};
  const types={single:'싱글카드',vintage:'빈티지카드',graded:'등급카드',box:'박스제품',other:'기타'};
  const typeDefs=[['all','전체'],['single','싱글카드'],['vintage','빈티지카드'],['graded','등급카드'],['box','박스제품'],['other','기타']];
  const age=v=>{const m=Math.max(0,Math.floor((Date.now()-new Date(v))/60000));if(m<60)return m+'분 전';if(m<1440)return Math.floor(m/60)+'시간 전';return Math.floor(m/1440)+'일 전'};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.body.classList.add('market-test-page');
  const session=await A.init().catch(()=>null);
  if(!session){A.goLogin(location.pathname+location.search+location.hash);return}
  document.documentElement.classList.remove('market-test-locked');
  document.body.classList.add('market-test-ready');

  const watermark=document.createElement('div');
  watermark.className='market-test-watermark';
  watermark.textContent='MARKET TEST · 비공개';
  document.body.appendChild(watermark);

  let rows=[],marketLayerOn=true,marketTabActive=false,marketFilter='all',overlayFilter='all',marketSort='latest';
  let markers=new Map(),popup=null,selectedMarkerId=null;
  let registerMap=null,registerProduct=null,registerType='single',registerDirectBuy=false,registerLat=null,registerLng=null,registerLocation='거래 희망 위치',registerCoordinate=null,registerPin=null,registerCurrentPin=null,registerCurrentAccuracy=null,reverseTimer=null;
  let marketPanel=null,marketTabBtn=null,layerChip=null;
  let chatChannel=null,chatInboxChannel=null,currentChatRoom=null,chatRoomsCache=new Map();

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
    const sl=shop?.querySelector('.qa-tab-label');if(sl)sl.textContent='카드샵';
    const vl=vending?.querySelector('.qa-tab-label');if(vl){vl.textContent='포켓몬 자판기';vl.classList.remove('qa-tab-label-vending')}
    const vc=vending?.querySelector('#qaVendingCount');if(vc)vc.style.display='none';
    const ml=market?.querySelector('.qa-tab-label');if(ml)ml.textContent='거래';
  }

  function listingMatches(x,filter=marketFilter){
    if(filter!=='all'&&x.item_type!==filter)return false;
    const q=($('#map-shop-search')?.value||'').trim().toLowerCase();
    if(q&&!([x.title,x.description,x.location_name,cats[x.tcg_category],types[x.item_type]].filter(Boolean).join(' ').toLowerCase().includes(q)))return false;
    return true;
  }
  function sorted(list,filter=marketFilter){
    const out=list.filter(x=>listingMatches(x,filter)).slice();
    if(marketSort==='low')out.sort((a,b)=>(a.price??Number.MAX_SAFE_INTEGER)-(b.price??Number.MAX_SAFE_INTEGER));
    else if(marketSort==='high')out.sort((a,b)=>(b.price??-1)-(a.price??-1));
    else out.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    return out;
  }
  function cardHtml(x){
    return '<button type="button" class="market-card" data-market-id="'+esc(x.id)+'">'+
      (x.thumbnail_url?'<img class="market-card-thumb" src="'+esc(x.thumbnail_url)+'" alt="" loading="lazy" referrerpolicy="no-referrer">':'<span class="market-card-ph">NO IMAGE</span>')+
      '<span class="market-card-copy"><strong class="market-card-title">'+esc(x.title)+'</strong><span class="market-card-price">'+money(x.price)+'</span><span class="market-card-meta">'+esc(x.location_name||'거래 희망 위치')+' · '+age(x.created_at)+'</span></span><span class="market-card-chev">›</span></button>';
  }
  function renderListInto(el,filter){
    if(!el)return;
    const list=sorted(rows,filter);
    el.innerHTML=list.length?list.map(cardHtml).join(''):'<div class="market-empty">조건에 맞는 거래 매물이 없습니다.<br>매물 등록에서 첫 거래를 등록해보세요.</div>';
  }
  function updateCounts(){
    const n=rows.filter(x=>['active','reserved'].includes(x.listing_status)).length;
    if(layerChip)layerChip.querySelector('.market-layer-count').textContent=String(n);
    const tabCount=$('#marketTestTabCount');if(tabCount)tabCount.textContent=String(n);
    const fullCount=$('#marketOverlayCount');if(fullCount)fullCount.textContent=String(n);
  }

  function markerMetrics(){
    const map=window.FUNY_NAVER_MAP_API?.getMap?.();let z=11;try{z=map?.getZoom?.()??11}catch(_){}
    if(z<=9)return{w:18,h:25};if(z===10)return{w:21,h:29};if(z===11)return{w:24,h:34};if(z===12)return{w:27,h:38};if(z===13)return{w:30,h:42};if(z===14)return{w:33,h:46};return{w:36,h:50};
  }
  function markerIcon(selected=false){
    const m=markerMetrics();
    const svg='<div class="market-map-pin'+(selected?' is-selected':'')+'" style="--marker-w:'+m.w+'px;--marker-h:'+m.h+'px"><svg viewBox="0 0 98 134" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M49 5C23 5 2 26 2 52c0 35 47 77 47 77s47-42 47-77C96 26 75 5 49 5Z" fill="#17151B"/><circle cx="49" cy="49" r="18" fill="#FFD54A"/><path d="M39 40h20v5H39zm0 9h20v5H39zm7-14h6v30h-6z" fill="#17151B" opacity=".9"/></svg></div>';
    return{content:svg,anchor:new naver.maps.Point(Math.round(m.w/2),m.h)};
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
      '<span><strong class="market-popup-title">'+esc(x.title)+'</strong><span class="market-popup-price">'+money(x.price)+'</span><span class="market-popup-meta">'+esc(x.location_name||'거래 희망 위치')+'</span></span><span class="market-popup-chev">›</span></button></div>';
  }
  function selectMarker(x,m){
    const map=window.FUNY_NAVER_MAP_API?.getMap?.();if(!map)return;
    closePopup();selectedMarkerId=x.id;m.setIcon(markerIcon(true));
    popup=new naver.maps.InfoWindow({content:popupHtml(x),borderWidth:0,backgroundColor:'transparent',anchorSize:new naver.maps.Size(0,0),pixelOffset:new naver.maps.Point(0,-8)});
    popup.open(map,m);
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

  function ensureLayerChip(){
    const track=$('#filters');if(!track||isJapan()){layerChip?.remove();layerChip=null;return}
    if(layerChip&&layerChip.isConnected){updateCounts();return}
    layerChip=document.createElement('button');layerChip.type='button';layerChip.className='market-layer-chip'+(marketLayerOn?' active':'');
    layerChip.innerHTML='<span class="market-layer-dot"></span><span>거래</span><span class="market-layer-count">0</span>';
    layerChip.onclick=e=>{e.preventDefault();e.stopPropagation();marketLayerOn=!marketLayerOn;layerChip.classList.toggle('active',marketLayerOn);syncMarkers()};
    track.appendChild(layerChip);updateCounts();
  }

  function marketToolsHtml(scope){
    return '<div class="'+scope+'">'+
      '<button type="button" class="market-sort" data-market-sort>최신순⌄</button><span class="qa-tools-divider" aria-hidden="true"></span>'+
      '<div class="market-filter-strip">'+typeDefs.map(([v,l])=>'<button type="button" class="market-filter-chip'+(v==='all'?' active':'')+'" data-market-filter="'+v+'">'+l+'</button>').join('')+'</div>'+
      '</div>';
  }
  function setupMarketPanel(tabs){
    if(marketPanel?.isConnected)return;
    marketTabBtn=document.createElement('button');marketTabBtn.type='button';marketTabBtn.className='qa-list-tab market-list-tab';marketTabBtn.dataset.tab='market';
    marketTabBtn.innerHTML='<span class="qa-tab-inline"><span class="qa-tab-label">거래</span></span>';
    tabs.appendChild(marketTabBtn);
    marketPanel=document.createElement('section');marketPanel.className='market-sheet-panel market-test-only';marketPanel.hidden=true;
    marketPanel.innerHTML=marketToolsHtml('market-sheet-tools')+'<div class="market-sheet-list" id="marketSheetList"></div>';
    $('.list-wrap')?.appendChild(marketPanel);
    tabs.addEventListener('click',e=>{
      const b=e.target.closest('[data-tab]');if(!b)return;
      if(b.dataset.tab==='market'){
        e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();activateMarketTab();
      }else{
        exitMarketTab();
      }
    },true);
    bindFilterControls(marketPanel,()=>{marketFilter=marketPanel.querySelector('.market-filter-chip.active')?.dataset.marketFilter||'all';renderListInto($('#marketSheetList'),marketFilter)});
    syncMarketTabLabels();
    updateCounts();
  }
  function activateMarketTab(){
    if(isJapan())return;
    marketTabActive=true;marketLayerOn=true;layerChip?.classList.add('active');
    document.body.classList.add('market-tab-active');document.body.classList.remove('qa-vending-tab-active');
    $$('.qa-list-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab==='market'));
    $$('.qa-shop-only').forEach(el=>el.style.setProperty('display','none','important'));
    const vp=$('.qa-vending-panel');if(vp)vp.hidden=true;
    if(marketPanel)marketPanel.hidden=false;
    renderListInto($('#marketSheetList'),marketFilter);syncMarkers();
  }
  function exitMarketTab(){
    if(!marketTabActive)return;
    marketTabActive=false;document.body.classList.remove('market-tab-active');if(marketPanel)marketPanel.hidden=true;
    $('.qa-shop-only').forEach(el=>el.style.removeProperty('display'));
  }
  function bindFilterControls(root,onChange){
    root.addEventListener('click',e=>{
      const f=e.target.closest('[data-market-filter]');
      if(f){root.querySelectorAll('[data-market-filter]').forEach(x=>x.classList.remove('active'));f.classList.add('active');onChange();return}
      const s=e.target.closest('[data-market-sort]');
      if(s){marketSort=marketSort==='latest'?'low':marketSort==='low'?'high':'latest';$$('[data-market-sort]').forEach(x=>x.textContent=marketSort==='latest'?'최신순⌄':marketSort==='low'?'낮은가격순⌄':'높은가격순⌄');onChange()}
    });
  }

  function buildFab(){
    const home=$('#home-view');if(!home||$('#marketFabWrap'))return;
    const wrap=document.createElement('div');wrap.id='marketFabWrap';wrap.className='market-fab-wrap';
    wrap.innerHTML='<div class="market-fab-menu" hidden><a class="market-fab-action" href="live-pin.html"><span>⚡</span><span>LIVE PIN</span><span>›</span></a><button type="button" class="market-fab-action market" data-open-market-overlay><span>▣</span><span>TCG 거래</span><span>›</span></button></div><button type="button" class="market-fab-main" aria-label="빠른 메뉴 열기">＋</button>';
    home.appendChild(wrap);const menu=wrap.querySelector('.market-fab-menu'),main=wrap.querySelector('.market-fab-main');
    main.onclick=()=>{const open=menu.hidden;menu.hidden=!open;main.classList.toggle('open',open);main.textContent=open?'×':'＋'};
    wrap.querySelector('[data-open-market-overlay]').onclick=()=>{menu.hidden=true;main.classList.remove('open');main.textContent='＋';openOverlay()};
  }

  function buildOverlay(){
    if($('#marketOverlay'))return;
    const el=document.createElement('section');el.id='marketOverlay';el.className='market-overlay';el.hidden=true;
    el.innerHTML='<header class="market-overlay-head"><div class="market-overlay-title"><span class="market-overlay-pin">●</span><strong>거래</strong></div><button type="button" class="market-overlay-chat" id="marketChatListBtn">채팅 <span id="marketChatUnreadBadge" hidden>0</span></button><button type="button" class="market-overlay-close" aria-label="닫기">×</button></header>'+
      marketToolsHtml('market-overlay-tools')+'<main class="market-overlay-body"><div class="market-sheet-list" id="marketOverlayList"></div></main><button type="button" class="market-overlay-register" data-open-market-register>+ 매물 등록</button>';
    document.body.appendChild(el);
    el.querySelector('.market-overlay-close').onclick=closeOverlay;
    el.querySelector('#marketChatListBtn').onclick=()=>openChatList();
    el.querySelector('[data-open-market-register]').onclick=openRegister;
    bindFilterControls(el,()=>{overlayFilter=el.querySelector('.market-filter-chip.active')?.dataset.marketFilter||'all';renderListInto($('#marketOverlayList'),overlayFilter)});
  }
  function openOverlay(){buildOverlay();$('#marketOverlay').hidden=false;document.body.style.overflow='hidden';renderListInto($('#marketOverlayList'),overlayFilter);updateCounts()}
  function closeOverlay(){const el=$('#marketOverlay');if(el)el.hidden=true;document.body.style.overflow=''}

  function buildRegister(){
    if($('#marketRegisterOverlay'))return;
    const el=document.createElement('div');el.id='marketRegisterOverlay';el.className='market-register-overlay';el.hidden=true;
    el.innerHTML='<section class="market-register-sheet"><div class="market-register-handle"></div><header class="market-register-head"><strong>매물 등록</strong><button type="button" class="market-register-close" aria-label="닫기">×</button></header><div class="market-register-scroll">'+
      '<div class="market-form-section"><label class="market-form-label">카테고리</label><select id="marketRegisterCategory" class="market-select"><option value="pokemon">포켓몬스터</option><option value="onepiece">원피스</option><option value="dragonball">드래곤볼</option><option value="other">기타</option></select></div>'+
      '<div class="market-form-section"><span class="market-form-label">구분</span><div class="market-type-row">'+Object.entries(types).map(([v,l])=>'<button type="button" class="market-type-btn'+(v==='single'?' active':'')+'" data-register-type="'+v+'">'+l+'</button>').join('')+'</div></div>'+
      '<div class="market-form-section"><label class="market-form-label" for="marketRegisterUrl">당근 매물 링크</label><div class="market-url-row"><input id="marketRegisterUrl" class="market-url-input" value="https://www.daangn.com/articles/1263844918?share=true" placeholder="당근 매물 URL"><button id="marketRegisterLoad" class="market-url-load" type="button">불러오기</button></div><div id="marketPreviewStatus" class="market-preview-status">링크를 입력하면 매물 정보를 자동으로 불러옵니다.</div><div id="marketPreview" class="market-preview"><div id="marketPreviewImages" class="market-preview-images"></div><div id="marketPreviewTitle" class="market-preview-title"></div><div id="marketPreviewPrice" class="market-preview-price"></div><div id="marketPreviewDesc" class="market-preview-desc"></div></div></div>'+
      '<div class="market-form-section"><span class="market-form-label">당근 바로구매</span><div class="market-direct-buy-row"><button type="button" class="active" data-direct-buy="false">미설정</button><button type="button" data-direct-buy="true">바로구매 가능</button></div><div class="market-direct-buy-help">당근 매물에서 바로구매가 실제로 설정된 경우에만 선택해주세요.</div></div>'+
      '<div class="market-form-section"><span class="market-form-label">거래 희망 위치</span><div class="market-location-tip">지도를 터치해 핀을 선택해주세요. 현재 위치는 선택을 돕는 용도로만 사용합니다.</div><button id="marketRegisterHere" class="market-register-here" type="button" style="width:100%;margin-bottom:8px">현재 위치로 이동</button><div class="market-register-map-wrap"><div id="marketRegisterMap"></div></div><p id="marketRegisterCoord" class="market-register-coord-status">위치를 선택해주세요.</p></div>'+
      '<div id="marketRegisterError" class="market-register-error"></div></div><button id="marketRegisterSubmit" class="market-register-submit" type="button" disabled>매물 등록하기</button></section>';
    document.body.appendChild(el);
    el.querySelector('.market-register-close').onclick=closeRegister;
    el.addEventListener('click',e=>{if(e.target===el)closeRegister()});
    el.querySelectorAll('[data-register-type]').forEach(b=>b.onclick=()=>{el.querySelectorAll('[data-register-type]').forEach(x=>x.classList.remove('active'));b.classList.add('active');registerType=b.dataset.registerType});
    el.querySelectorAll('[data-direct-buy]').forEach(b=>b.onclick=()=>{el.querySelectorAll('[data-direct-buy]').forEach(x=>x.classList.remove('active'));b.classList.add('active');registerDirectBuy=b.dataset.directBuy==='true'});
    $('#marketRegisterLoad').onclick=loadPreview;
    $('#marketRegisterUrl').addEventListener('keydown',e=>{if(e.key==='Enter')loadPreview()});
    $('#marketRegisterHere').onclick=moveRegisterToCurrent;
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
    $('#marketRegisterCoord').textContent=registerCoordinate?registerLat.toFixed(6)+', '+registerLng.toFixed(6):'위치를 선택해주세요.';
  }
  function closeRegister(){const el=$('#marketRegisterOverlay');if(el)el.hidden=true;if($('#marketOverlay')?.hidden!==false)document.body.style.overflow=''}
  function setRegisterError(msg){const el=$('#marketRegisterError');if(!el)return;el.textContent=msg||'';el.style.display=msg?'block':'none'}
  function renderPreview(x){
    registerProduct=x;$('#marketPreview').classList.add('show');
    const arr=[...(Array.isArray(x.images)?x.images:[]),x.image].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).slice(0,20);
    $('#marketPreviewImages').innerHTML=arr.length?arr.map(u=>'<img class="market-preview-image" src="'+esc(u)+'" alt="" referrerpolicy="no-referrer">').join(''):'<span class="market-preview-ph">NO IMAGE</span>';
    $('#marketPreviewTitle').textContent=x.title||'상품명 없음';$('#marketPreviewPrice').textContent=x.price||'가격 정보 없음';$('#marketPreviewDesc').textContent=x.description||'상품 설명 없음';$('#marketRegisterSubmit').disabled=false;
  }
  async function loadPreview(){
    const url=$('#marketRegisterUrl')?.value.trim();if(!url)return;
    setRegisterError('');$('#marketRegisterLoad').disabled=true;$('#marketPreviewStatus').textContent='당근 매물 정보를 불러오는 중...';
    try{const {data,error}=await A.client.functions.invoke('daangn-listing-preview-test',{body:{url}});if(error)throw error;if(!data?.ok)throw Error(data?.error||'매물 정보를 불러오지 못했습니다.');renderPreview(data);$('#marketPreviewStatus').textContent='자동 추출 완료 · 등록된 이미지 '+((data.images||[]).length||1)+'장'}
    catch(e){registerProduct=null;$('#marketPreview')?.classList.remove('show');$('#marketRegisterSubmit').disabled=true;setRegisterError(String(e?.message||e));$('#marketPreviewStatus').textContent='매물 정보를 불러오지 못했습니다.'}
    finally{$('#marketRegisterLoad').disabled=false}
  }
  function selectRegisterLocation(lat,lng){
    registerLat=+Number(lat).toFixed(6);registerLng=+Number(lng).toFixed(6);registerCoordinate={lat:registerLat,lng:registerLng};
    const pos=new naver.maps.LatLng(registerLat,registerLng);
    if(!registerPin)registerPin=new naver.maps.Marker({map:registerMap,position:pos,zIndex:220,title:'선택한 위치'});
    else{registerPin.setPosition(pos);registerPin.setMap(registerMap)}
    const coord=$('#marketRegisterCoord');if(coord)coord.textContent=registerLat.toFixed(6)+', '+registerLng.toFixed(6);
    clearTimeout(reverseTimer);reverseTimer=setTimeout(()=>{if(!naver.maps.Service?.reverseGeocode){registerLocation='거래 희망 위치';return}naver.maps.Service.reverseGeocode({coords:pos,orders:[naver.maps.Service.OrderType.ROAD_ADDR,naver.maps.Service.OrderType.ADDR].join(',')},(st,res)=>{if(st!==naver.maps.Service.Status.OK){registerLocation='거래 희망 위치';return}const it=res.v2?.results?.[0],rg=it?.region;registerLocation=it?.land?.name||[rg?.area1?.name,rg?.area2?.name,rg?.area3?.name].filter(Boolean).join(' ')||'거래 희망 위치'})},180);
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
    if(!registerProduct)return;if(!registerCoordinate){setRegisterError('지도에서 거래 희망 위치를 선택해주세요.');return}setRegisterError('');const btn=$('#marketRegisterSubmit');btn.disabled=true;btn.textContent='등록 중...';
    try{
      const profile=await A.getProfile(),user=A.session.user,nick=profile?.nickname||user.user_metadata?.nickname||user.user_metadata?.name||('FUNY회원'+String(user.id).replace(/-/g,'').slice(-4).toUpperCase());
      const raw=String(registerProduct.price_raw||'').replace(/,/g,'').trim(),price=raw&&Number.isFinite(Number(raw))?Math.round(Number(raw)):null;
      const urls=[...(Array.isArray(registerProduct.images)?registerProduct.images:[]),registerProduct.image].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).slice(0,8);
      const row={seller_user_id:user.id,seller_nickname:nick,provider:'daangn',external_url:registerProduct.final_url||registerProduct.source_url||$('#marketRegisterUrl').value.trim(),external_listing_id:registerProduct.article_id||null,title:registerProduct.title||'당근 매물',description:registerProduct.description||null,price,currency:registerProduct.currency||'KRW',thumbnail_url:urls[0]||null,image_urls:urls,external_status:registerProduct.availability||null,direct_buy_available:registerDirectBuy,listing_status:'active',listing_side:'sell',tcg_category:$('#marketRegisterCategory').value,item_type:registerType,country_code:'KR',latitude:registerLat,longitude:registerLng,location_name:registerLocation,fetched_at:registerProduct.fetched_at||new Date().toISOString(),updated_at:new Date().toISOString()};
      let data=null,error=null;
      if(row.external_listing_id){
        const existing=await A.client.from('market_listings').select('id').eq('seller_user_id',user.id).eq('provider','daangn').eq('external_listing_id',row.external_listing_id).maybeSingle();
        if(existing.error)throw existing.error;
        if(existing.data?.id){
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

  function buildDetail(){
    if($('#marketDetailOverlay'))return;
    const el=document.createElement('section');el.id='marketDetailOverlay';el.className='market-detail-overlay';el.hidden=true;
    el.innerHTML='<header class="market-detail-head"><button type="button" id="marketDetailBack">‹</button><strong>매물 상세</strong></header><div id="marketDetailBody" class="market-detail-body"></div>';
    document.body.appendChild(el);$('#marketDetailBack').onclick=closeDetail;
  }
  function openDetail(id){
    const x=rows.find(r=>r.id===id);if(!x)return;
    buildDetail();const ended=['sold','expired','hidden'].includes(x.listing_status),status=x.listing_status==='reserved'?'예약중':ended?'판매완료':'판매중',isOwner=A.session?.user?.id===x.seller_user_id,daangnLabel=x.direct_buy_available?'당근에서 바로구매':'당근에서 보기',chatLabel=isOwner?'문의 채팅 보기':'퍼니핀에서 문의하기';
    const body=$('#marketDetailBody');
    const detailImages=[...(Array.isArray(x.image_urls)?x.image_urls:[]),x.thumbnail_url].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i);
    const hero=detailImages.length?'<div class="market-detail-carousel"><div class="market-detail-carousel-track" id="marketDetailCarousel">'+detailImages.map((u,i)=>'<div class="market-detail-slide"><img src="'+esc(u)+'" alt="매물 이미지 '+(i+1)+'" referrerpolicy="no-referrer"></div>').join('')+'</div>'+(detailImages.length>1?'<button type="button" class="market-detail-carousel-prev" aria-label="이전 이미지">‹</button><button type="button" class="market-detail-carousel-next" aria-label="다음 이미지">›</button><div class="market-detail-page"><span id="marketDetailPageNow">1</span> / '+detailImages.length+'</div>':'')+'</div>':'<div class="market-detail-hero"><div class="market-detail-ph">NO IMAGE</div></div>';
    body.innerHTML=hero+
      '<div class="market-detail-tags"><span class="market-detail-tag daangn">당근</span><span class="market-detail-tag cat">'+esc(cats[x.tcg_category]||'카드거래')+'</span><span class="market-detail-tag type">'+esc(types[x.item_type]||'매물')+'</span><span class="market-detail-tag status">'+status+'</span>'+(x.direct_buy_available?'<span class="market-detail-tag buy">바로구매</span>':'')+'</div>'+
      '<h1 class="market-detail-title">'+esc(x.title)+'</h1><div class="market-detail-price">'+money(x.price)+'</div><div class="market-detail-meta">FUNY PIN · '+esc(x.seller_nickname)+' · '+esc(x.location_name||'거래 희망 위치')+' · '+age(x.created_at)+'</div>'+
      '<div class="market-detail-desc">'+esc(x.description||'등록된 설명이 없습니다.')+'</div>'+
      '<section class="market-detail-section"><h3>거래 희망 위치</h3><div class="market-detail-map-card"><div id="marketDetailMap" class="market-detail-map"></div><div class="market-detail-location">'+esc(x.location_name||'거래 희망 위치')+'</div></div></section>'+
      '<div class="market-detail-bottom"><div class="market-detail-actions"><button id="marketDetailChat" class="market-detail-chat" type="button">'+chatLabel+'</button><a id="marketDetailTrade" class="market-detail-trade'+(ended?' disabled':'')+'" href="'+esc(x.external_url)+'" target="_blank" rel="noopener">'+(ended?'판매가 종료된 매물입니다':daangnLabel)+'</a></div></div>';
    $('#marketDetailOverlay').hidden=false;document.body.style.overflow='hidden';
    if(detailImages.length>1){const track=$('#marketDetailCarousel'),page=$('#marketDetailPageNow');const go=delta=>{const w=track.clientWidth||1,index=Math.round(track.scrollLeft/w),next=Math.max(0,Math.min(detailImages.length-1,index+delta));track.scrollTo({left:next*w,behavior:'smooth'})};$('.market-detail-carousel-prev').onclick=()=>go(-1);$('.market-detail-carousel-next').onclick=()=>go(1);track.addEventListener('scroll',()=>{const w=track.clientWidth||1;page.textContent=String(Math.max(1,Math.min(detailImages.length,Math.round(track.scrollLeft/w)+1)))},{passive:true})}
    setTimeout(()=>{const map=new naver.maps.Map('marketDetailMap',{center:new naver.maps.LatLng(+x.latitude,+x.longitude),zoom:16,draggable:false,scrollWheel:false,disableDoubleClickZoom:true,zoomControl:false,mapDataControl:false,scaleControl:false,logoControl:false});new naver.maps.Marker({map,position:new naver.maps.LatLng(+x.latitude,+x.longitude),icon:markerIcon(true)});naver.maps.Event.trigger(map,'resize')},80);
    $('#marketDetailChat')?.addEventListener('click',()=>isOwner?openChatList(x.id):openOrCreateChat(x));
    $('#marketDetailTrade')?.addEventListener('click',e=>{if(ended)return;if(window.ReactNativeWebView){e.preventDefault();try{window.ReactNativeWebView.postMessage(JSON.stringify({type:'OPEN_EXTERNAL',url:x.external_url}))}catch(_){location.href=x.external_url}}});
  }
  function closeDetail(){const el=$('#marketDetailOverlay');if(el)el.hidden=true;if($('#marketOverlay')?.hidden!==false&&$('#marketRegisterOverlay')?.hidden!==false)document.body.style.overflow=''}

  async function userNickname(){
    const profile=await A.getProfile().catch(()=>null),user=A.session?.user;
    return profile?.nickname||user?.user_metadata?.nickname||user?.user_metadata?.name||('FUNY회원'+String(user?.id||'').replace(/-/g,'').slice(-4).toUpperCase());
  }
  function buildChatList(){
    if($('#marketChatListOverlay'))return;
    const el=document.createElement('section');el.id='marketChatListOverlay';el.className='market-chat-list-overlay';el.hidden=true;
    el.innerHTML='<header class="market-chat-head"><button type="button" id="marketChatListBack">‹</button><strong>거래 채팅</strong><span id="marketChatListCount"></span></header><main id="marketChatListBody" class="market-chat-list-body"></main>';
    document.body.appendChild(el);$('#marketChatListBack').onclick=closeChatList;
  }
  async function unreadByRoom(){
    const uid=A.session?.user?.id;if(!uid)return new Map();
    const {data,error}=await A.client.from('market_chat_messages').select('room_id,sender_user_id').is('read_at',null).neq('sender_user_id',uid);
    if(error)return new Map();const out=new Map();(data||[]).forEach(x=>out.set(x.room_id,(out.get(x.room_id)||0)+1));return out;
  }
  async function refreshChatBadge(){
    const unread=await unreadByRoom(),n=[...unread.values()].reduce((a,b)=>a+b,0),badge=$('#marketChatUnreadBadge');
    if(badge){badge.textContent=n>99?'99+':String(n);badge.hidden=n<1}
  }
  async function openChatList(focusListingId=''){
    buildChatList();const el=$('#marketChatListOverlay');el.hidden=false;document.body.style.overflow='hidden';$('#marketChatListBody').innerHTML='<div class="market-chat-empty">채팅방을 불러오는 중...</div>';
    const {data,error}=await A.client.from('market_chat_rooms').select('id,listing_id,seller_user_id,buyer_user_id,seller_nickname,buyer_nickname,last_message_at,last_message_preview,created_at,market_listings(id,title,price,thumbnail_url,listing_status)').order('last_message_at',{ascending:false,nullsFirst:false}).order('created_at',{ascending:false});
    if(error){$('#marketChatListBody').innerHTML='<div class="market-chat-empty">채팅방을 불러오지 못했습니다.<br>'+esc(error.message)+'</div>';return}
    const unread=await unreadByRoom(),uid=A.session.user.id,rooms=(data||[]).slice().sort((a,b)=>{if(focusListingId){const aa=a.listing_id===focusListingId?1:0,bb=b.listing_id===focusListingId?1:0;if(aa!==bb)return bb-aa}return new Date(b.last_message_at||b.created_at)-new Date(a.last_message_at||a.created_at)});
    chatRoomsCache=new Map(rooms.map(r=>[r.id,r]));$('#marketChatListCount').textContent=rooms.length?rooms.length+'개':'';
    $('#marketChatListBody').innerHTML=rooms.length?rooms.map(r=>{const listing=r.market_listings||rows.find(x=>x.id===r.listing_id)||{},other=uid===r.seller_user_id?r.buyer_nickname:r.seller_nickname,n=unread.get(r.id)||0;return '<button type="button" class="market-chat-list-card" data-chat-room-id="'+esc(r.id)+'">'+(listing.thumbnail_url?'<img src="'+esc(listing.thumbnail_url)+'" alt="" referrerpolicy="no-referrer">':'<span class="market-chat-list-ph">NO IMAGE</span>')+'<span class="market-chat-list-copy"><strong>'+esc(listing.title||'거래 매물')+'</strong><span>'+esc(other||'FUNY PIN 회원')+' · '+money(listing.price)+'</span><em>'+(r.last_message_preview?esc(r.last_message_preview):'대화를 시작해보세요.')+'</em></span>'+(n?'<b class="market-chat-unread">'+n+'</b>':'<span class="market-chat-list-chev">›</span>')+'</button>'}).join(''):'<div class="market-chat-empty">아직 거래 채팅이 없습니다.<br>매물 상세에서 문의를 시작해보세요.</div>';
    $('#marketChatListBody').querySelectorAll('[data-chat-room-id]').forEach(b=>b.onclick=()=>openChatRoom(chatRoomsCache.get(b.dataset.chatRoomId)));
    refreshChatBadge();
  }
  function closeChatList(){const el=$('#marketChatListOverlay');if(el)el.hidden=true;if($('#marketDetailOverlay')?.hidden!==false||$('#marketOverlay')?.hidden!==false)document.body.style.overflow='hidden';else document.body.style.overflow=''}
  async function openOrCreateChat(x){
    if(!x||!A.session?.user)return;
    const uid=A.session.user.id;if(uid===x.seller_user_id){openChatList(x.id);return}
    let {data:room,error}=await A.client.from('market_chat_rooms').select('*').eq('listing_id',x.id).eq('buyer_user_id',uid).maybeSingle();
    if(error)throw alert('채팅방 확인 실패: '+error.message);
    if(!room){
      if(!['active','reserved'].includes(x.listing_status)){alert('판매가 종료된 매물입니다.');return}
      const buyerNickname=await userNickname();
      const created=await A.client.from('market_chat_rooms').insert({listing_id:x.id,seller_user_id:x.seller_user_id,buyer_user_id:uid,seller_nickname:x.seller_nickname,buyer_nickname:buyerNickname}).select('*').single();
      if(created.error){alert('채팅방 생성 실패: '+created.error.message);return}room=created.data;
    }
    room.market_listings=x;openChatRoom(room);
  }
  function buildChatRoom(){
    if($('#marketChatRoomOverlay'))return;
    const el=document.createElement('section');el.id='marketChatRoomOverlay';el.className='market-chat-room-overlay';el.hidden=true;
    el.innerHTML='<header class="market-chat-head"><button type="button" id="marketChatRoomBack">‹</button><div><strong id="marketChatRoomName">거래 문의</strong><span id="marketChatRoomState">실시간 연결</span></div></header><div id="marketChatListing" class="market-chat-listing"></div><main id="marketChatMessages" class="market-chat-messages"></main><form id="marketChatForm" class="market-chat-composer"><input id="marketChatInput" maxlength="500" autocomplete="off" placeholder="메시지를 입력하세요"><button type="submit">전송</button></form>';
    document.body.appendChild(el);$('#marketChatRoomBack').onclick=closeChatRoom;$('#marketChatForm').onsubmit=sendChatMessage;
  }
  async function openChatRoom(room){
    if(!room)return;buildChatRoom();currentChatRoom=room;const uid=A.session.user.id,other=uid===room.seller_user_id?room.buyer_nickname:room.seller_nickname,listing=room.market_listings||rows.find(x=>x.id===room.listing_id)||{};
    $('#marketChatRoomName').textContent=other||'거래 문의';$('#marketChatListing').innerHTML=(listing.thumbnail_url?'<img src="'+esc(listing.thumbnail_url)+'" alt="" referrerpolicy="no-referrer">':'<span class="market-chat-listing-ph">NO IMAGE</span>')+'<span><strong>'+esc(listing.title||'거래 매물')+'</strong><em>'+money(listing.price)+'</em></span>';
    $('#marketChatRoomOverlay').hidden=false;document.body.style.overflow='hidden';await loadChatMessages(room.id);
    if(chatChannel)await A.client.removeChannel(chatChannel).catch(()=>{});
    chatChannel=A.client.channel('market-chat-'+room.id).on('postgres_changes',{event:'INSERT',schema:'public',table:'market_chat_messages',filter:'room_id=eq.'+room.id},()=>loadChatMessages(room.id)).subscribe(status=>{$('#marketChatRoomState').textContent=status==='SUBSCRIBED'?'실시간 연결':'연결 중...'});
  }
  async function loadChatMessages(roomId){
    if(!roomId||currentChatRoom?.id!==roomId)return;const uid=A.session.user.id;
    const {data,error}=await A.client.from('market_chat_messages').select('id,room_id,sender_user_id,message,created_at,read_at').eq('room_id',roomId).order('created_at',{ascending:true}).limit(300);
    if(error){$('#marketChatMessages').innerHTML='<div class="market-chat-empty">메시지를 불러오지 못했습니다.</div>';return}
    const box=$('#marketChatMessages');box.innerHTML=(data||[]).length?(data||[]).map(m=>'<div class="market-chat-message '+(m.sender_user_id===uid?'mine':'other')+'"><span>'+esc(m.message)+'</span><time>'+new Intl.DateTimeFormat('ko-KR',{hour:'2-digit',minute:'2-digit'}).format(new Date(m.created_at))+'</time></div>').join(''):'<div class="market-chat-empty">매물에 대해 궁금한 내용을 문의해보세요.</div>';box.scrollTop=box.scrollHeight;
    await A.client.from('market_chat_messages').update({read_at:new Date().toISOString()}).eq('room_id',roomId).neq('sender_user_id',uid).is('read_at',null);
    refreshChatBadge();
  }
  async function sendChatMessage(e){
    e.preventDefault();if(!currentChatRoom)return;const input=$('#marketChatInput'),msg=input.value.trim();if(!msg)return;const btn=e.currentTarget.querySelector('button');btn.disabled=true;
    const {error}=await A.client.from('market_chat_messages').insert({room_id:currentChatRoom.id,sender_user_id:A.session.user.id,message:msg});
    if(!error){input.value='';await A.client.from('market_chat_rooms').update({last_message_at:new Date().toISOString(),last_message_preview:msg,updated_at:new Date().toISOString()}).eq('id',currentChatRoom.id);await loadChatMessages(currentChatRoom.id)}
    else alert('메시지 전송 실패: '+error.message);btn.disabled=false;input.focus();
  }
  async function closeChatRoom(){
    if(chatChannel){await A.client.removeChannel(chatChannel).catch(()=>{});chatChannel=null}
    currentChatRoom=null;const el=$('#marketChatRoomOverlay');if(el)el.hidden=true;refreshChatBadge();
    if($('#marketChatListOverlay')?.hidden===false||$('#marketDetailOverlay')?.hidden===false||$('#marketOverlay')?.hidden===false)document.body.style.overflow='hidden';else document.body.style.overflow='';
  }

  async function loadRows(){
    const {data,error}=await A.client.from('market_listings').select('*').eq('listing_side','sell').in('listing_status',['active','reserved','sold']).order('created_at',{ascending:false});
    if(error){console.error('[MARKET TEST] load failed',error);return}
    rows=data||[];updateCounts();renderListInto($('#marketSheetList'),marketFilter);renderListInto($('#marketOverlayList'),overlayFilter);syncMarkers();
  }

  document.addEventListener('click',e=>{
    const card=e.target.closest('[data-market-id]');if(card){e.preventDefault();openDetail(card.dataset.marketId);return}
    const pop=e.target.closest('[data-market-popup-id]');if(pop){e.preventDefault();openDetail(pop.dataset.marketPopupId)}
  },true);

  const search=$('#map-shop-search');search?.addEventListener('input',()=>{if(marketTabActive)renderListInto($('#marketSheetList'),marketFilter);syncMarkers()});
  window.addEventListener('funy:mapdatachange',()=>{ensureLayerChip();syncMarkers()});
  new MutationObserver(()=>{ensureLayerChip();if(isJapan()&&marketTabActive){document.querySelector('.qa-list-tab[data-tab="shops"]')?.click()}syncMarkers()}).observe(document.body,{attributes:true,attributeFilter:['class']});

  const map=await waitForMap();
  const tabs=await waitForQaTabs();
  if(tabs)setupMarketPanel(tabs);
  syncMarketSearchPlaceholder();syncMarketTabLabels();
  ensureLayerChip();buildFab();buildOverlay();buildRegister();buildDetail();buildChatList();buildChatRoom();refreshChatBadge();
  chatInboxChannel=A.client.channel('market-chat-inbox').on('postgres_changes',{event:'INSERT',schema:'public',table:'market_chat_messages'},()=>refreshChatBadge()).subscribe();
  if(map)naver.maps.Event.addListener(map,'zoom_changed',()=>syncMarkers());
  setInterval(()=>{syncMarketSearchPlaceholder();syncMarketTabLabels();ensureLayerChip();if(tabs&&!tabs.querySelector('[data-tab="market"]'))setupMarketPanel(tabs);if(marketTabActive){$$('.qa-list-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab==='market'));if(marketPanel)marketPanel.hidden=false}},700);
  await loadRows();
})();