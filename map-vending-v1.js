/* FUNY PIN vending module v1 — isolated from country/map core */
(function(){
  'use strict';
  if(window.__FUNY_VENDING_V1)return;
  window.__FUNY_VENDING_V1=true;

  document.documentElement.classList.add('funy-map-qa');
  const SB_URL='https://wdttzpbmqavaqfcbaywj.supabase.co';
  const SB_KEY='sb_publishable__wrSzngSE-JbGnyE7PZX9w_2QaW8bpq';
  const state={tab:'shops',operator:'all',sort:'alpha',layer:true,rows:[],selected:null};
  const markers=new Map();
  let info=null,ready=false;

  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const norm=v=>String(v??'').toLowerCase().replace(/\s+/g,'').trim();
  const country=()=>{try{return window.FUNY_MAP_COUNTRY?.get?.()||'KR'}catch(_){return'KR'}};
  const isKR=()=>country()!=='JP'&&!document.body.classList.contains('country-japan');
  const category=v=>['롯데마트','이마트','롯데시네마','메가박스','CGV'].includes(v)?v:'기타';
  const naverUrl=v=>'https://map.naver.com/p/search/'+encodeURIComponent(v.name||'');
  const addressIcon='<svg class="vm-address-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2.5"/></svg>';

  async function load(){
    const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),6500);
    try{
      const q='select=id,name,address,operator,status,is_active,latitude,longitude,logo_url&order=id.asc';
      const r=await fetch(SB_URL+'/rest/v1/v_public_pokemon_card_vending_machines?'+q,{headers:{apikey:SB_KEY},cache:'no-store',signal:ctrl.signal});
      if(!r.ok)throw new Error('HTTP '+r.status);
      const rows=await r.json();
      state.rows=(rows||[]).map(v=>{
        const lat=v.latitude==null||v.latitude===''?NaN:Number(v.latitude);
        const lng=v.longitude==null||v.longitude===''?NaN:Number(v.longitude);
        if(Number.isFinite(lat)&&Number.isFinite(lng))v._coord={lat,lng};
        return v;
      });
      return true;
    }finally{clearTimeout(timer)}
  }

  function markerMetrics(){
    let z=11;try{z=naverMap.getZoom()}catch(_){}
    if(z<=9)return{pinW:16,pinH:22,markerW:20,markerH:28};
    if(z===10)return{pinW:18,pinH:25,markerW:22,markerH:31};
    if(z===11)return{pinW:21,pinH:29,markerW:25,markerH:35};
    if(z===12)return{pinW:24,pinH:33,markerW:28,markerH:39};
    if(z===13)return{pinW:27,pinH:37,markerW:31,markerH:43};
    if(z===14)return{pinW:30,pinH:41,markerW:34,markerH:47};
    return{pinW:33,pinH:45,markerW:37,markerH:51};
  }
  function markerIcon(selected=false){
    const m=markerMetrics(),vars='--pin-w:'+m.pinW+'px;--pin-h:'+m.pinH+'px;--marker-w:'+m.markerW+'px;--marker-h:'+m.markerH+'px';
    return {content:'<div class="vm-marker funy-vending-marker'+(selected?' selected is-selected':'')+'" style="'+vars+'"><svg viewBox="0 0 98 134" fill="none"><defs><linearGradient id="vmg'+(selected?'s':'n')+'" x1="15" y1="8" x2="84" y2="112"><stop stop-color="#FFE46A"/><stop offset=".48" stop-color="#F6C928"/><stop offset="1" stop-color="#D9A900"/></linearGradient></defs><path d="M49 5C23 5 2 26 2 52c0 35 47 77 47 77s47-42 47-77C96 26 75 5 49 5Z" fill="url(#vmg'+(selected?'s':'n')+')"/><path d="M6 52h28M64 52h28" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cx="49" cy="52" r="14.5" fill="#fff"/></svg></div>',anchor:new naver.maps.Point(Math.round(m.markerW/2),m.markerH)};
  }
  function mapReady(){return !!(window.naver?.maps&&typeof naverMap!=='undefined'&&naverMap)}
  function addMarker(v){
    if(!mapReady()||!v._coord||markers.has(v.id))return;
    const m=new naver.maps.Marker({map:isKR()&&state.layer?naverMap:null,position:new naver.maps.LatLng(v._coord.lat,v._coord.lng),title:v.name,icon:markerIcon(false),zIndex:110});
    naver.maps.Event.addListener(m,'click',()=>select(v,m));
    markers.set(v.id,m);
  }
  function popup(v){
    return '<div class="map-popup-bubble vm-popup qa-vending-popup"><div class="map-shop-popup"><span class="vm-popup-copy qa-popup-copy"><strong class="qa-popup-name">'+esc(v.name)+'</strong><span class="vm-popup-address qa-popup-address-row">'+addressIcon+'<span class="qa-popup-address">'+esc(v.address)+'</span></span></span><a class="vm-route qa-naver-route" href="'+naverUrl(v)+'" target="_blank" rel="noopener noreferrer">길찾기</a></div></div>';
  }
  function select(v,m){
    try{info?.close()}catch(_){}
    if(state.selected===v.id){state.selected=null;m.setIcon(markerIcon(false));return}
    if(state.selected&&markers.get(state.selected))markers.get(state.selected).setIcon(markerIcon(false));
    state.selected=v.id;m.setIcon(markerIcon(true));
    info=new naver.maps.InfoWindow({content:popup(v),borderWidth:0,backgroundColor:'transparent',anchorSize:new naver.maps.Size(0,0),pixelOffset:new naver.maps.Point(0,-12)});
    info.open(naverMap,m);
  }
  async function geocodeMissing(){
    if(!window.naver?.maps?.Service)return;
    const pending=state.rows.filter(v=>!v._coord);
    const seeded=[];
    let idx=0;
    async function one(v){
      return new Promise(resolve=>naver.maps.Service.geocode({query:v.address},(status,res)=>{
        if(status===naver.maps.Service.Status.OK&&res?.v2?.addresses?.length){
          const a=res.v2.addresses[0],lat=+a.y,lng=+a.x;
          if(Number.isFinite(lat)&&Number.isFinite(lng)){v._coord={lat,lng};seeded.push({id:v.id,latitude:lat,longitude:lng});addMarker(v)}
        }
        resolve();
      }));
    }
    async function worker(){while(idx<pending.length){const v=pending[idx++];try{await one(v)}catch(_){} await new Promise(r=>setTimeout(r,80));}}
    await Promise.all([worker(),worker()]);
    for(let i=0;i<seeded.length;i+=25){
      try{await fetch(SB_URL+'/rest/v1/rpc/seed_pokemon_vending_coordinates_v19',{method:'POST',headers:{apikey:SB_KEY,'Content-Type':'application/json'},body:JSON.stringify({p_rows:seeded.slice(i,i+25)})})}catch(_){}
    }
  }

  function matches(v){const q=norm($('#map-shop-search')?.value||'');return !q||norm([v.name,v.address,v.operator].join(' ')).includes(q)}
  function rows(){
    let r=state.rows.filter(v=>state.operator==='all'||category(v.operator)===state.operator).filter(matches).slice();
    if(state.sort==='near'&&window.FUNY_CURRENT_LOCATION){
      const h=window.FUNY_CURRENT_LOCATION,rad=x=>x*Math.PI/180,dist=p=>{const dLat=rad(p.lat-h.lat),dLng=rad(p.lng-h.lng),a=Math.sin(dLat/2)**2+Math.cos(rad(h.lat))*Math.cos(rad(p.lat))*Math.sin(dLng/2)**2;return 12742*Math.asin(Math.sqrt(a))};
      r.sort((a,b)=>(a._coord?dist(a._coord):Infinity)-(b._coord?dist(b._coord):Infinity)||a.name.localeCompare(b.name,'ko'));
    }else r.sort((a,b)=>a.name.localeCompare(b.name,'ko'));
    return r;
  }
  function syncMarkers(){
    const q=norm($('#map-shop-search')?.value||'');
    state.rows.forEach(v=>{
      const m=markers.get(v.id);if(!m)return;
      const show=isKR()&&state.layer&&(!q||matches(v));
      try{m.setMap(show?naverMap:null)}catch(_){}
    });
  }
  function logo(v){
    const url=String(v.logo_url||'');
    const fallback=esc(v.operator||'');
    return '<span class="vm-logo qa-operator-logo" data-operator="'+esc(v.operator)+'">'+(url?'<img src="'+esc(url)+'" alt="'+fallback+' 로고" loading="lazy" decoding="async" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'grid\'"><span class="vm-logo-fallback qa-operator-logo-fallback" style="display:none">'+fallback+'</span>':'<span class="vm-logo-fallback qa-operator-logo-fallback">'+fallback+'</span>')+'</span>';
  }
  function render(){
    const list=$('#vmList'),count=$('#vmCount');if(!list)return;
    const r=rows();if(count)count.textContent=String(r.length);
    list.innerHTML=r.length?r.map(v=>'<article class="vm-card qa-vending-card" data-id="'+esc(v.id)+'">'+logo(v)+'<div class="vm-copy qa-vending-copy"><strong class="qa-vending-name">'+esc(v.name)+'</strong><span class="qa-vending-address-row">'+addressIcon+'<span class="qa-vending-address">'+esc(v.address)+'</span></span></div><a class="vm-route qa-naver-route" href="'+naverUrl(v)+'" target="_blank" rel="noopener noreferrer">길찾기</a></article>').join(''):'<div class="vm-empty qa-vending-empty">조건에 맞는 자판기가 없습니다.</div>';
    list.querySelectorAll('.vm-card').forEach(card=>card.addEventListener('click',e=>{
      if(e.target.closest('.vm-route'))return;
      const v=state.rows.find(x=>x.id===card.dataset.id),m=v&&markers.get(v.id);if(!v||!m)return;
      naverMap.panTo(m.getPosition());if(naverMap.getZoom()<14)naverMap.setZoom(14);select(v,m);
    }));
    syncMarkers();
  }

  function setTab(tab){
    state.tab=tab==='vending'?'vending':'shops';
    document.body.classList.toggle('vm-tab-vending',state.tab==='vending');
    document.body.classList.toggle('qa-vending-tab-active',state.tab==='vending');
    document.querySelectorAll('.vm-tab,.qa-list-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===state.tab));
    document.querySelectorAll('.qa-shop-only,.qa-shop-tools').forEach(el=>{el.style.display=state.tab==='shops'?'':'none'});
    const panel=$('#vmPanel');if(panel)panel.hidden=state.tab!=='vending';
  }
  function buildSheet(){
    const sheet=$('.list-wrap');if(!sheet||$('#vmTabs'))return;
    const handle=sheet.querySelector('.map-sheet-handle');
    const tabs=document.createElement('div');tabs.id='vmTabs';tabs.className='vm-tabs qa-list-tabs';tabs.innerHTML='<button class="vm-tab qa-list-tab active" data-tab="shops">TCG 카드샵 <span class="qa-tab-count" id="vmShopCount">0</span></button><button class="vm-tab qa-list-tab" data-tab="vending">포켓몬 자판기 <span class="qa-tab-count" id="vmCount">'+state.rows.length+'</span></button>';
    if(handle){handle.after(tabs);const sticky=document.createElement('div');sticky.className='qa-sheet-sticky-head';handle.before(sticky);sticky.appendChild(handle);sticky.appendChild(tabs)}else sheet.prepend(tabs);
    tabs.addEventListener('click',e=>{const b=e.target.closest('.vm-tab');if(b)setTab(b.dataset.tab)});

    const heading=sheet.querySelector('.list-heading');
    const shopTools=document.createElement('div');shopTools.className='qa-shop-tools';
    if(heading)heading.before(shopTools);
    const existingSort=sheet.querySelector('.list-sort');if(existingSort)shopTools.appendChild(existingSort);
    const shopDivider=document.createElement('span');shopDivider.className='qa-tools-divider';shopTools.appendChild(shopDivider);
    const shopStrip=document.createElement('div');shopStrip.className='qa-shop-filter-strip';shopTools.appendChild(shopStrip);
    const syncShopFilters=()=>{const src=[...document.querySelectorAll('#filters .filter-chip[data-filter]')];shopStrip.innerHTML=src.map(b=>'<button type="button" class="qa-shop-filter-chip'+(b.classList.contains('active')?' active':'')+'" data-filter="'+esc(b.dataset.filter)+'">'+esc(b.textContent.trim())+'</button>').join('')};
    syncShopFilters();shopStrip.addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;document.querySelector('#filters .filter-chip[data-filter="'+b.dataset.filter+'"]')?.click();setTimeout(syncShopFilters,60)});
    [heading,sheet.querySelector('.shop-request-list-banner'),sheet.querySelector('#shop-list'),sheet.querySelector('#empty')].filter(Boolean).forEach(el=>el.classList.add('qa-shop-only'));
    const panel=document.createElement('section');panel.id='vmPanel';panel.className='vm-panel qa-vending-panel';panel.hidden=true;
    panel.innerHTML='<div class="vm-tools qa-vending-tools"><button class="vm-sort qa-control-pill" type="button" data-sort="alpha">가나다 순</button><span class="vm-divider qa-tools-divider"></span><div class="vm-operators qa-operator-strip"></div></div><div id="vmList" class="vm-list qa-vending-list"></div>';
    sheet.appendChild(panel);
    const ops=[['all','전체'],['롯데마트','롯데마트'],['이마트','이마트'],['롯데시네마','롯데시네마'],['메가박스','메가박스'],['CGV','CGV'],['기타','기타']];
    const strip=panel.querySelector('.vm-operators');
    strip.innerHTML=ops.map(([k,l])=>'<button class="vm-op qa-operator-chip'+(k==='all'?' active':'')+'" data-op="'+k+'">'+l+'</button>').join('');
    strip.addEventListener('click',e=>{const b=e.target.closest('.vm-op');if(!b)return;state.operator=b.dataset.op;strip.querySelectorAll('.vm-op').forEach(x=>x.classList.toggle('active',x===b));render()});
    panel.querySelector('.vm-sort').addEventListener('click',e=>{state.sort=state.sort==='alpha'?'near':'alpha';e.currentTarget.textContent=state.sort==='near'?'가까운 순':'가나다 순';if(state.sort==='near'&&!window.FUNY_CURRENT_LOCATION)$('#map-location-btn')?.click();render()});
  }
  function buildLayerChip(){
    const track=$('#filters');if(!track||$('#vmLayerChip'))return;
    const b=document.createElement('button');b.id='vmLayerChip';b.type='button';b.className='vm-layer-chip qa-layer-chip active';b.dataset.layer='vending';b.innerHTML='<span class="qa-layer-dot"></span><span>자판기</span><span class="qa-layer-count">'+state.rows.length+'</span>';
    const sep=track.querySelector('.country-filter-sep');if(sep)sep.after(b);else track.appendChild(b);
    b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();state.layer=!state.layer;b.classList.toggle('active',state.layer);syncMarkers()});
  }
  function syncCountry(){
    const jp=!isKR();
    document.body.classList.toggle('vm-country-jp',jp);
    if(jp&&state.tab==='vending')setTab('shops');
    syncMarkers();
  }
  function syncShopCount(){const n=$$('#shop-list .shop-card').length;const e=$('#vmShopCount');if(e)e.textContent=String(n)}
  function $$(s){return [...document.querySelectorAll(s)]}

  async function init(){
    try{
      await load();
    }catch(e){
      console.error('[FUNY vending] DB load failed',e);
      return;
    }
    buildSheet();buildLayerChip();render();syncCountry();syncShopCount();
    let tries=0;
    const t=setInterval(()=>{
      tries++;
      if(mapReady()){
        clearInterval(t);
        state.rows.forEach(addMarker);
        syncMarkers();
        try{naver.maps.Event.addListener(naverMap,'zoom_changed',()=>markers.forEach((m,id)=>m.setIcon(markerIcon(id===state.selected))))}catch(_){}
        geocodeMissing();
      }else if(tries>80)clearInterval(t);
    },200);
    let lastSearch='';
    setInterval(()=>{const q=$('#map-shop-search')?.value||'';if(q!==lastSearch){lastSearch=q;render()}syncShopCount()},350);
    window.addEventListener('funy:mapdatachange',()=>setTimeout(syncCountry,80));
    window.addEventListener('funy:locationchange',()=>{if(state.sort==='near')render()});
    new MutationObserver(syncCountry).observe(document.body,{attributes:true,attributeFilter:['class']});
  }
  init();
})();