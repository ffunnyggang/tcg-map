
/* FUNY PIN MAP v2 QA controller — production shops.html is untouched */
(function(){
  'use strict';
  if(window.__FUNY_MAP_QA_V2)return;
  window.__FUNY_MAP_QA_V2=true;
  document.documentElement.classList.add('funy-map-qa');
  document.body.classList.add('funy-map-qa');

  const SB_URL='https://wdttzpbmqavaqfcbaywj.supabase.co';
  const SB_KEY='sb_publishable__wrSzngSE-JbGnyE7PZX9w_2QaW8bpq';
  let VENDING=[];
  async function loadVendingData(){
    const qs='select=id,name,address,operator,status,is_active,latitude,longitude,logo_url&order=id.asc';
    const r=await fetch(SB_URL+'/rest/v1/v_public_pokemon_card_vending_machines?'+qs,{
      headers:{apikey:SB_KEY},
      cache:'no-store'
    });
    if(!r.ok)throw new Error('vending DB '+r.status);
    const rows=await r.json();
    VENDING=(rows||[]).map(v=>{
      const lat=Number(v.latitude),lng=Number(v.longitude);
      if(Number.isFinite(lat)&&Number.isFinite(lng))v._coord={lat,lng};
      return v;
    });
    return VENDING;
  }
  async function persistVendingCoords(rows){
    if(!rows?.length)return 0;
    const r=await fetch(SB_URL+'/rest/v1/rpc/seed_pokemon_vending_coordinates_v19',{
      method:'POST',
      headers:{apikey:SB_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({p_rows:rows})
    });
    if(!r.ok)throw new Error('coordinate seed '+r.status);
    return Number(await r.json())||0;
  }
  const layerPrefsKey='funypin_qa_kr_map_layers_v1';
    let savedLayers={};
    try{const parsed=JSON.parse(localStorage.getItem(layerPrefsKey)||'{}');if(parsed&&typeof parsed==='object')savedLayers=parsed}catch(_){}
    const layerValue=(key)=>typeof savedLayers[key]==='boolean'?savedLayers[key]:true;
    const state={tab:'shops',layers:{shops:layerValue('shops'),events:layerValue('events'),vending:layerValue('vending')},operator:'all',vendingSort:'alpha',selectedVending:null};
    function saveLayerPrefs(){try{localStorage.setItem(layerPrefsKey,JSON.stringify({shops:!!state.layers.shops,events:!!state.layers.events,vending:!!state.layers.vending}))}catch(_){}}
  const vendingMarkers=new Map();
const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const normalize=v=>String(v??'').toLowerCase().replace(/\s+/g,'').trim();
  const currentSearch=()=>normalize($('#map-shop-search')?.value||'');
  const category=v=>['롯데마트','이마트','롯데시네마','메가박스','CGV'].includes(v)?v:'기타';
  const operatorLabel=v=>v==='롯데시네마'?'LOTTE\nCINEMA':v==='롯데마트'?'LOTTE\nMART':v==='롯데월드'?'LOTTE\nWORLD':v==='스타필드마켓'?'STARFIELD\nMARKET':v;
  const vendingLogoUrl=v=>String(v?.logo_url||'');
  const addressIcon='<svg class="qa-address-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2.5"/></svg>';

  const badge=document.createElement('div');badge.className='qa-dev-badge';badge.textContent='MAP V2 · QA';document.body.appendChild(badge);
  $('#map-shop-search')?.setAttribute('placeholder','매장명 또는 지역으로 검색');
  $('#map-shop-search')?.setAttribute('aria-label','카드샵 또는 자판기 매장명·지역 검색');

  function mapReady(){return !!(window.naver?.maps?.Service&&typeof naverMap!=='undefined'&&naverMap)}
  function markerMetrics(){
    let z=11;try{z=naverMap.getZoom()}catch(_){}
    if(z<=9)return{pinW:14,pinH:20,markerW:18,markerH:25};
    if(z===10)return{pinW:17,pinH:24,markerW:21,markerH:29};
    if(z===11)return{pinW:20,pinH:28,markerW:24,markerH:34};
    if(z===12)return{pinW:23,pinH:32,markerW:27,markerH:38};
    if(z===13)return{pinW:26,pinH:36,markerW:30,markerH:42};
    if(z===14)return{pinW:29,pinH:40,markerW:33,markerH:46};
    return{pinW:32,pinH:44,markerW:36,markerH:50};
  }
  function vendingIcon(selected=false){
    const m=markerMetrics(),vars='--pin-w:'+m.pinW+'px;--pin-h:'+m.pinH+'px;--marker-w:'+m.markerW+'px;--marker-h:'+m.markerH+'px';
    return {content:'<div class="funy-vending-marker'+(selected?' is-selected':'')+'" style="'+vars+'" aria-hidden="true"><svg viewBox="0 0 98 134" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="vendingPinGrad'+(selected?'S':'N')+'" x1="15" y1="8" x2="84" y2="112" gradientUnits="userSpaceOnUse"><stop stop-color="#FFE46A"/><stop offset=".48" stop-color="#F6C928"/><stop offset="1" stop-color="#D9A900"/></linearGradient></defs><path d="M49 5C23 5 2 26 2 52c0 35 47 77 47 77s47-42 47-77C96 26 75 5 49 5Z" fill="url(#vendingPinGrad'+(selected?'S':'N')+')"/><path d="M6 52h28M64 52h28" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/><circle cx="49" cy="52" r="14.5" fill="#FFFFFF"/></svg></div>',anchor:new naver.maps.Point(Math.round(m.markerW/2),m.markerH)};
  }
  function naverUrl(v){
    return 'https://map.naver.com/p/search/'+encodeURIComponent(v.name||'');
  }
  function logoHtml(v){
    const url=vendingLogoUrl(v),fallback=esc(operatorLabel(v.operator)).replace(/\n/g,'<br>');
    return '<span class="qa-operator-logo" data-operator="'+esc(v.operator)+'">'+
      (url?'<img src="'+esc(url)+'" alt="'+esc(v.operator)+' 로고" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'block\'"><span class="qa-operator-logo-fallback" style="display:none">'+fallback+'</span>':'<span class="qa-operator-logo-fallback">'+fallback+'</span>')+
      '</span>';
  }
  function popupHtml(v){
    return '<div class="map-popup-bubble qa-vending-popup"><div class="map-shop-popup"><span class="qa-popup-copy"><strong class="qa-popup-name">'+esc(v.name)+'</strong><span class="qa-popup-address-row">'+addressIcon+'<span class="qa-popup-address">'+esc(v.address)+'</span></span></span><a class="qa-naver-route" href="'+naverUrl(v)+'" target="_blank" rel="noopener noreferrer">길찾기</a></div></div>';
  }
  function selectVending(v,marker){
    try{if(activeInfoWindow)activeInfoWindow.close()}catch(_){}
    if(state.selectedVending===v.id){state.selectedVending=null;marker.setIcon(vendingIcon(false));try{activeInfoWindow=null}catch(_){};return}
    if(state.selectedVending&&vendingMarkers.get(state.selectedVending))vendingMarkers.get(state.selectedVending).setIcon(vendingIcon(false));
    state.selectedVending=v.id;marker.setIcon(vendingIcon(true));
    const iw=new naver.maps.InfoWindow({content:popupHtml(v),borderWidth:0,backgroundColor:'transparent',anchorSize:new naver.maps.Size(0,0),pixelOffset:new naver.maps.Point(0,-12)});
    iw.open(naverMap,marker);try{activeInfoWindow=iw}catch(_){}
  }
  function makeVendingMarker(v,pos){
    if(!mapReady()||vendingMarkers.has(v.id))return;
    v._coord={lat:+pos.lat,lng:+pos.lng};
    const marker=new naver.maps.Marker({map:state.layers.vending?naverMap:null,position:new naver.maps.LatLng(+pos.lat,+pos.lng),title:v.name,icon:vendingIcon(false),zIndex:110});
    naver.maps.Event.addListener(marker,'click',()=>selectVending(v,marker));
    vendingMarkers.set(v.id,marker);
    applyVendingVisibility();
  }
  function geocodeOne(v,onSeed){
    return new Promise(resolve=>{
      if(v._coord&&Number.isFinite(+v._coord.lat)&&Number.isFinite(+v._coord.lng)){
        makeVendingMarker(v,v._coord);return resolve({ok:true,seeded:false});
      }
      naver.maps.Service.geocode({query:v.address},(status,res)=>{
        if(status===naver.maps.Service.Status.OK&&res?.v2?.addresses?.length){
          const a=res.v2.addresses[0],p={lat:+a.y,lng:+a.x};
          v._coord=p;makeVendingMarker(v,p);
          onSeed?.({id:v.id,latitude:p.lat,longitude:p.lng});
          resolve({ok:true,seeded:true});
        }else resolve({ok:false,seeded:false});
      })
    })
  }
  async function buildVendingMarkers(){
    if(!mapReady()||!VENDING.length)return;
    const missingBefore=VENDING.filter(v=>!v._coord).length;
    const status=document.createElement('div');status.className='qa-geocode-status';
    status.textContent=missingBefore?'DB 좌표 보완 중 0/'+missingBefore:'자판기 위치 불러오는 중…';
    $('.map-wrap-hero')?.appendChild(status);
    let done=0,idx=0,ok=0,seedDone=0;
    const seedRows=[];
    async function worker(){
      while(idx<VENDING.length){
        const i=idx++,v=VENDING[i];
        try{
          const result=await geocodeOne(v,row=>{seedRows.push(row);seedDone++});
          if(result.ok)ok++;
          if(result.seeded){
            if(seedDone%5===0||seedDone===missingBefore)status.textContent='DB 좌표 보완 중 '+seedDone+'/'+missingBefore;
            await new Promise(r=>setTimeout(r,55));
          }
        }catch(_){}
        done++;
      }
    }
    await Promise.all([worker(),worker(),worker()]);
    let saved=0;
    for(let i=0;i<seedRows.length;i+=25){
      try{saved+=await persistVendingCoords(seedRows.slice(i,i+25))}catch(e){console.warn('[FUNY QA] coordinate persist failed',e)}
    }
    status.textContent=missingBefore?(saved+'개 좌표 DB 저장 완료'):(ok+'개 DB 좌표 로드 완료');
    setTimeout(()=>status.remove(),1600);
    renderVendingList();
  }

  function vendingMatchesSearch(v){const q=currentSearch();return !q||normalize([v.name,v.address,v.operator].join(' ')).includes(q)}
  function vendingListRows(){
    let rows=VENDING.filter(v=>state.operator==='all'||category(v.operator)===state.operator).filter(vendingMatchesSearch).slice();
    if(state.vendingSort==='near'&&window.FUNY_CURRENT_LOCATION){
      const h=window.FUNY_CURRENT_LOCATION,rad=x=>x*Math.PI/180,dist=(a,b)=>{const dLat=rad(a.lat-b.lat),dLng=rad(a.lng-b.lng),x=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;return 12742*Math.asin(Math.sqrt(x))};
      rows.sort((a,b)=>{const ac=a._coord?dist(a._coord,h):Infinity,bc=b._coord?dist(b._coord,h):Infinity;return ac-bc||a.name.localeCompare(b.name,'ko')});
    }else rows.sort((a,b)=>a.name.localeCompare(b.name,'ko'));
    return rows;
  }
  function applyVendingVisibility(){
    const q=currentSearch();
    for(const v of VENDING){
      const m=vendingMarkers.get(v.id);if(!m)continue;
      const show=!document.body.classList.contains('country-japan')&&state.layers.vending&&(!q||vendingMatchesSearch(v));
      try{m.setMap(show?naverMap:null)}catch(_){}
    }
  }
  function applyLayers(){
    try{
      const visibleRows=Array.isArray(window.FUNY_VISIBLE_SHOPS)?window.FUNY_VISIBLE_SHOPS:[];
      const visibleIds=new Set(visibleRows.filter(s=>!String(s?.id||'').startsWith('JP-')).map(s=>String(s.id)));
      markerById.forEach((m,id)=>{
        const show=state.layers.shops&&visibleIds.has(String(id));
        m.setMap(show?naverMap:null);
      });
    }catch(_){}
    document.documentElement.classList.toggle('qa-hide-events',!state.layers.events);
    document.body.classList.toggle('qa-hide-events',!state.layers.events);
    applyVendingVisibility();
    document.querySelectorAll('.qa-layer-chip').forEach(b=>b.classList.toggle('active',!!state.layers[b.dataset.layer]));
  }
  function updateEventCount(){
    const n=document.querySelectorAll('.funy-event-pin').length;
    const el=document.querySelector('.qa-layer-chip[data-layer="events"] .qa-layer-count');if(el)el.textContent=String(n);
  }

  let layerControlObserver=null,layerControlTimer=0;
  function buildLayerControls(){
    const track=$('#filters');if(!track)return;
    if(document.body.classList.contains('country-japan')){track.querySelectorAll('.qa-layer-chip').forEach(x=>x.remove());return;}
    const existing=[...track.querySelectorAll('.qa-layer-chip')];
    if(existing.length===3){
      existing.forEach(b=>b.classList.toggle('active',!!state.layers[b.dataset.layer]));
      return;
    }
    existing.forEach(x=>x.remove());
    const shopCount=(()=>{try{return SHOPS.filter(x=>!String(x.id).startsWith('JP-')).length}catch(_){return 0}})();
    const defs=[['shops','카드샵',shopCount],['events','일정',0],['vending','자판기',VENDING.length]];
    const anchor=track.querySelector('.country-filter-sep')||track.querySelector('.country-filter-wrap');
    let ref=anchor?.nextSibling||null;
    defs.forEach(([key,label,count])=>{
      const b=document.createElement('button');b.type='button';b.className='qa-layer-chip'+(state.layers[key]?' active':'');b.dataset.layer=key;
      b.innerHTML='<span class="qa-layer-dot"></span><span>'+label+'</span><span class="qa-layer-count">'+count+'</span>';
      b.onclick=e=>{e.preventDefault();e.stopPropagation();state.layers[key]=!state.layers[key];saveLayerPrefs();applyLayers()};
      track.insertBefore(b,ref);
    });
  }
  function keepLayerControls(){
    const track=$('#filters');if(!track)return;
    if(layerControlObserver)layerControlObserver.disconnect();
    layerControlObserver=new MutationObserver(()=>{clearTimeout(layerControlTimer);layerControlTimer=setTimeout(()=>{buildLayerControls();applyLayers()},20)});
    layerControlObserver.observe(track,{childList:true,subtree:false});
    buildLayerControls();
    setInterval(()=>{buildLayerControls();updateEventCount()},900);
  }
  function shopFilterDefs(){try{return [{id:'all',label:'전체'},...FILTERS]}catch(_){return[{id:'all',label:'전체'}]}}
  function syncShopFilterUI(){
    document.querySelectorAll('.qa-shop-filter-chip[data-filter]').forEach(b=>{
      const src=document.querySelector('#filters .filter-chip[data-filter="'+b.dataset.filter+'"]');
      b.classList.toggle('active',!!src?.classList.contains('active'))
    });
    const any=[...document.querySelectorAll('.qa-shop-filter-chip')].some(b=>b.classList.contains('active'));
    $('.qa-filter-toggle')?.classList.toggle('active',any);
  }
  function ensureQaSortPortal(menu,type){
    if(!menu)return null;
    const id=type==='vending'?'qaVendingSortPortal':'qaShopSortPortal';
    let host=document.getElementById(id);
    if(!host){
      host=document.createElement('div');
      host.id=id;
      host.className='qa-sort-portal-host list-sort'+(type==='vending'?' qa-vending-list-sort':'');
      document.body.appendChild(host);
    }
    if(menu.parentNode!==host)host.appendChild(menu);
    menu.classList.add('qa-sort-floating-menu');
    return host;
  }
  function placeQaSortMenu(btn,menu,type){
    if(!btn||!menu)return;
    const host=ensureQaSortPortal(menu,type);if(!host)return;
    const r=btn.getBoundingClientRect(),w=118,gap=6;
    const left=Math.max(8,Math.min(r.left,window.innerWidth-w-8));
    host.style.setProperty('position','fixed','important');
    host.style.setProperty('left',left+'px','important');
    host.style.setProperty('top',(r.bottom+gap)+'px','important');
    host.style.setProperty('width',w+'px','important');
    host.style.setProperty('z-index','2147482500','important');
  }
  function syncShopSortMenu(){const btn=$('#list-sort-button'),menu=$('#list-sort-menu');if(menu?.classList.contains('open'))placeQaSortMenu(btn,menu,'shop')}
  function syncVendingSortMenu(){const btn=$('#qaVendingSortButton'),menu=$('#qaVendingSortMenu');if(menu?.classList.contains('open'))placeQaSortMenu(btn,menu,'vending')}
  function vendingSortLabel(){return state.vendingSort==='near'?'가까운 순':'가나다 순'}
  function closeVendingSort(){const menu=$('#qaVendingSortMenu'),btn=$('#qaVendingSortButton');menu?.classList.remove('open');btn?.setAttribute('aria-expanded','false')}
  function setVendingSort(value){state.vendingSort=value==='near'?'near':'alpha';const label=$('#qaVendingSortLabel');if(label)label.textContent=vendingSortLabel();document.querySelectorAll('#qaVendingSortMenu [data-vending-sort]').forEach(b=>b.classList.toggle('active',b.dataset.vendingSort===state.vendingSort));closeVendingSort();if(state.vendingSort==='near'&&!window.FUNY_CURRENT_LOCATION)document.getElementById('map-location-btn')?.click();renderVendingList()}
  function buildSheet(){
    const sheet=$('.list-wrap');if(!sheet||sheet.querySelector('.qa-list-tabs'))return;
    const handle=sheet.querySelector('.map-sheet-handle');
    const tabs=document.createElement('div');tabs.className='qa-list-tabs';tabs.innerHTML='<button class="qa-list-tab active" data-tab="shops">TCG 카드샵 <span class="qa-tab-count" id="qaShopCount">0</span></button><button class="qa-list-tab" data-tab="vending">포켓몬 자판기 <span class="qa-tab-count" id="qaVendingCount">'+VENDING.length+'</span></button>';
    handle?.after(tabs);
    if(handle&&!sheet.querySelector('.qa-sheet-sticky-head')){
      const sticky=document.createElement('div');sticky.className='qa-sheet-sticky-head';
      handle.before(sticky);sticky.appendChild(handle);sticky.appendChild(tabs);
    }

    const heading=sheet.querySelector('.list-heading');
    const tools=document.createElement('div');tools.className='qa-shop-tools';
    if(heading){
      heading.before(tools);
      const sort=heading.querySelector('.list-sort');if(sort)tools.appendChild(sort);
    }
    const divider=document.createElement('span');divider.className='qa-tools-divider';divider.setAttribute('aria-hidden','true');tools.appendChild(divider);
    const strip=document.createElement('div');strip.className='qa-shop-filter-strip';
    strip.innerHTML=shopFilterDefs().map(f=>'<button type="button" class="qa-shop-filter-chip" data-filter="'+esc(f.id)+'">'+esc(f.label)+'</button>').join('');
    tools.appendChild(strip);
    strip.onclick=e=>{const b=e.target.closest('[data-filter]');if(!b)return;document.querySelector('#filters .filter-chip[data-filter="'+b.dataset.filter+'"]')?.click();setTimeout(()=>{syncShopFilterUI();applyLayers()},40)};

    [heading,sheet.querySelector('.shop-request-list-banner'),sheet.querySelector('#shop-list'),sheet.querySelector('#empty')].filter(Boolean).forEach(el=>el.classList.add('qa-shop-only'));

    const vp=document.createElement('section');vp.className='qa-vending-panel';vp.hidden=true;
    vp.innerHTML='<div class="qa-vending-tools"><div class="list-sort qa-vending-list-sort"><button id="qaVendingSortButton" class="list-sort-button" type="button" aria-haspopup="menu" aria-expanded="false"><span id="qaVendingSortLabel">가나다 순</span><svg class="list-sort-chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6.25 8 10l4-3.75"/></svg></button><div id="qaVendingSortMenu" class="list-sort-menu" role="menu"><button type="button" class="active" data-vending-sort="alpha">가나다 순</button><button type="button" data-vending-sort="near">가까운 순</button></div></div><span class="qa-tools-divider" aria-hidden="true"></span><div class="qa-operator-strip" id="qaOperatorStrip"></div></div><span class="qa-vending-summary" id="qaVendingSummary"></span><div class="qa-vending-list" id="qaVendingList"></div>';
    sheet.appendChild(vp);
    const ops=['all','롯데마트','이마트','롯데시네마','메가박스','CGV','기타'];
    $('#qaOperatorStrip').innerHTML=ops.map(x=>'<button type="button" class="qa-operator-chip'+(x==='all'?' active':'')+'" data-operator="'+x+'">'+(x==='all'?'전체':x)+'</button>').join('');
    $('#qaOperatorStrip').onclick=e=>{const b=e.target.closest('[data-operator]');if(!b)return;state.operator=b.dataset.operator;document.querySelectorAll('.qa-operator-chip').forEach(x=>x.classList.toggle('active',x===b));renderVendingList()};
    $('#qaVendingSortButton').onclick=e=>{e.preventDefault();e.stopPropagation();const menu=$('#qaVendingSortMenu'),btn=$('#qaVendingSortButton'),open=menu?.classList.toggle('open');btn?.setAttribute('aria-expanded',open?'true':'false');if(open)requestAnimationFrame(syncVendingSortMenu)};
    $('#qaVendingSortMenu').onclick=e=>{const b=e.target.closest('[data-vending-sort]');if(!b)return;e.preventDefault();e.stopPropagation();setVendingSort(b.dataset.vendingSort)};
    document.addEventListener('click',e=>{if(!e.target.closest('.qa-vending-list-sort')&&!e.target.closest('#qaVendingSortPortal'))closeVendingSort()},true);
    tabs.onclick=e=>{const b=e.target.closest('[data-tab]');if(!b)return;setTab(b.dataset.tab)};
    ensureQaSortPortal($('#list-sort-menu'),'shop');
    ensureQaSortPortal($('#qaVendingSortMenu'),'vending');
    $('#list-sort-button')?.addEventListener('click',()=>requestAnimationFrame(syncShopSortMenu));
    tools.addEventListener('scroll',()=>{document.getElementById('list-sort-menu')?.classList.remove('open');document.getElementById('list-sort-button')?.setAttribute('aria-expanded','false')},{passive:true});
    vp.querySelector('.qa-vending-tools')?.addEventListener('scroll',()=>closeVendingSort(),{passive:true});
    setInterval(()=>{const n=document.querySelectorAll('#shop-list .shop-card').length;const el=$('#qaShopCount');if(el)el.textContent=String(n);syncShopFilterUI()},400);
  }
  function syncCountrySpecificQaUI(){
    const jp=document.body.classList.contains('country-japan')||window.FUNY_MAP_COUNTRY?.get?.()==='JP';
    const heading=$('.list-heading');
    const shopTools=$('.qa-shop-tools');
    const sort=document.querySelector('.list-sort:not(.qa-vending-list-sort)');
    const sheet=$('.list-wrap'),handle=sheet?.querySelector('.map-sheet-handle'),tabs=sheet?.querySelector('.qa-list-tabs'),sticky=sheet?.querySelector('.qa-sheet-sticky-head');
    const listTitle=heading?.querySelector('.list-title-label');
    if(listTitle)listTitle.textContent='TCG 카드샵';
    if(jp){
      if(sticky&&handle&&tabs){sticky.before(handle);handle.after(tabs);sticky.remove()}
      if(heading&&sort&&!heading.contains(sort))heading.appendChild(sort);
      document.querySelectorAll('.qa-shop-only').forEach(el=>el.style.display='');
      const vp=$('.qa-vending-panel');if(vp)vp.hidden=true;
      state.tab='shops';document.body.classList.remove('qa-vending-tab-active');
    }else{
      if(sheet&&handle&&tabs&&!sheet.querySelector('.qa-sheet-sticky-head')){const w=document.createElement('div');w.className='qa-sheet-sticky-head';handle.before(w);w.appendChild(handle);w.appendChild(tabs)}
      if(shopTools&&sort&&!shopTools.contains(sort))shopTools.insertBefore(sort,shopTools.firstChild);
      setTab(state.tab);
      buildLayerControls();
    }
  }
  function setTab(tab){
    state.tab=tab==='vending'?'vending':'shops';
    const vendingMode=state.tab==='vending';
    document.body.classList.toggle('qa-vending-tab-active',vendingMode);
    document.querySelectorAll('.qa-list-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===state.tab));
    const vp=$('.qa-vending-panel');if(vp)vp.hidden=!vendingMode;
    if(vendingMode)renderVendingList();
  }
  function renderVendingList(){
    const list=$('#qaVendingList');if(!list)return;const rows=vendingListRows();
    $('#qaVendingSummary').textContent='검색 결과 '+rows.length+'개';const tabCount=$('#qaVendingCount');if(tabCount)tabCount.textContent=String(rows.length);
    list.innerHTML=rows.length?rows.map(v=>'<article class="qa-vending-card" data-vending-id="'+esc(v.id)+'">'+logoHtml(v)+'<div class="qa-vending-copy"><strong class="qa-vending-name">'+esc(v.name)+'</strong><span class="qa-vending-address-row">'+addressIcon+'<span class="qa-vending-address">'+esc(v.address)+'</span></span></div><a class="qa-naver-route" href="'+naverUrl(v)+'" target="_blank" rel="noopener noreferrer">길찾기</a></article>').join(''):'<div class="qa-vending-empty">조건에 맞는 자판기가 없습니다.</div>';
    list.querySelectorAll('.qa-vending-card').forEach(card=>card.onclick=e=>{
      if(e.target.closest('.qa-naver-route'))return;
      const v=VENDING.find(x=>x.id===card.dataset.vendingId),m=v&&vendingMarkers.get(v.id);if(!v)return;
      if(m){naverMap.panTo(m.getPosition());if(naverMap.getZoom()<14)naverMap.setZoom(14);selectVending(v,m)}
      else if(mapReady())geocodeOne(v).then(()=>{const mm=vendingMarkers.get(v.id);if(mm){naverMap.panTo(mm.getPosition());naverMap.setZoom(14);selectVending(v,mm)}})
    });
  }

  let lastSearch='';
  setInterval(()=>{
    const q=$('#map-shop-search')?.value||'';
    if(q===lastSearch)return;lastSearch=q;applyVendingVisibility();renderVendingList()
  },250);

  try{
    const originalSync=syncMapMarkers;
    syncMapMarkers=function(refit=true){originalSync(refit);setTimeout(applyLayers,0)}
  }catch(_){}
  window.addEventListener('funy:mapdatachange',()=>setTimeout(()=>{syncCountrySpecificQaUI();applyLayers()},120));
  window.addEventListener('funy:locationchange',()=>{if(state.vendingSort==='near')renderVendingList()});
  window.addEventListener('funy:list-refresh',()=>setTimeout(applyLayers,20));
  window.addEventListener('funy:shops-source',()=>setTimeout(applyLayers,30));

  window.addEventListener('resize',()=>{syncShopSortMenu();syncVendingSortMenu()},{passive:true});
  new MutationObserver(()=>{syncCountrySpecificQaUI();applyLayers()}).observe(document.body,{attributes:true,attributeFilter:['class']});
  (async function initVendingQa(){
    try{
      await loadVendingData();
    }catch(e){
      console.error('[FUNY QA] vending DB load failed',e);
      const badge=document.querySelector('.qa-dev-badge');if(badge)badge.textContent='MAP V2 · QA · DB ERROR';
      return;
    }
    keepLayerControls();buildSheet();renderVendingList();syncCountrySpecificQaUI();
    let tries=0,t=setInterval(()=>{
      tries++;
      if(mapReady()){
        clearInterval(t);
        try{naver.maps.Event.addListener(naverMap,'zoom_changed',()=>vendingMarkers.forEach((m,id)=>m.setIcon(vendingIcon(id===state.selectedVending))))}catch(_){}
        buildVendingMarkers();
      }else if(tries>80)clearInterval(t)
    },200);
  })();
})();
