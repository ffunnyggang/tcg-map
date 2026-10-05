/* FUNY PIN MAP list controller v4 — one owner for search/filter/country/sort */
(function(){
  'use strict';
  if(window.__FUNY_MAP_LIST_V4)return;
  window.__FUNY_MAP_LIST_V4=true;
  if(typeof SHOPS==='undefined'||typeof FILTERS==='undefined')return;

  const pinSvg='<svg class="list-meta-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2.5"/></svg>';
  const clockSvg='<svg class="list-meta-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  const fallbackThumb='<span class="shop-thumb-fallback" aria-hidden="true"><svg viewBox="0 0 98 134" fill="none"><path class="fallback-pin-body" d="M49 5C23 5 2 26 2 52c0 35 47 77 47 77s47-42 47-77C96 26 75 5 49 5Z"/><path class="fallback-pin-line" d="M6 52h28M64 52h28"/><circle class="fallback-pin-center" cx="49" cy="52" r="14.5"/></svg><b>FUNY PIN</b></span>';
  const SCORE={'KR-SEO-001':4.4444444444,'KR-SEO-010':4.2222222222,'KR-SEO-002':3.8888888889,'KR-SEO-007':3.8888888889,'KR-SEO-009':3.7777777778,'KR-SEO-006':3.5555555556,'KR-SEO-015':3.3333333333,'KR-SEO-012':3.3333333333,'KR-SEO-013':3.2222222222,'KR-SEO-005':3.1111111111,'KR-SEO-011':3,'KR-SEO-003':3,'KR-SEO-004':2.8888888889,'KR-SEO-014':2.7777777778,'KR-SEO-008':2.7777777778};
  const FEEDBACK_VISITS_KEY='funypin_feedback_shop_visits',FEEDBACK_DONE_KEY='funypin_feedback_submitted_at',COOLDOWN=30*24*60*60*1000;
  const activeFilters=new Set();
  let sortMode='recommend',sortOpen=false;

  const normalize=v=>String(v??'').toLowerCase().replace(/\s+/g,'').trim();
  const currentCountry=()=>{try{return window.FUNY_MAP_COUNTRY?.get?.()||new URLSearchParams(location.search).get('country')||'KR'}catch(_){return'KR'}};
  const koCompare=(a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ko',{sensitivity:'base'});
  const rad=v=>v*Math.PI/180;
  function dist(lat1,lng1,lat2,lng2){const R=6371,dLat=rad(lat2-lat1),dLng=rad(lng2-lng1),x=Math.sin(dLat/2)**2+Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(dLng/2)**2;return 2*R*Math.asin(Math.sqrt(x))}
  function coord(s){if(s?._coord&&Number.isFinite(+s._coord.lat)&&Number.isFinite(+s._coord.lng))return{lat:+s._coord.lat,lng:+s._coord.lng};if(Number.isFinite(+s?.lat)&&Number.isFinite(+s?.lng))return{lat:+s.lat,lng:+s.lng};return null}
  function searchable(s){
    const fl=FILTERS.filter(f=>{try{return f.test(s)}catch(_){return false}}).map(f=>f.label);
    const ft=typeof FEATURE_LABELS!=='undefined'?Object.entries(FEATURE_LABELS).filter(([k])=>s.f?.[k]===true).map(([,v])=>v):[];
    return normalize([s.name,s.en,s.city,s.area,s.address,s.station,...fl,...ft,s.tcg?.pokemon?'포켓몬':'',s.tcg?.onePiece?'원피스':'',s.tcg?.dragonBall?'드래곤볼':''].filter(Boolean).join(' '));
  }
  function passFilter(s){for(const id of activeFilters){const f=FILTERS.find(x=>x.id===id);if(f&&!f.test(s))return false}return true}
  function passSearch(s){const q=normalize(document.getElementById('map-shop-search')?.value||'');return !q||searchable(s).includes(q)}
  function controllerMatches(s){return passFilter(s)&&passSearch(s)}
  try{matches=controllerMatches}catch(_){}
  window.matches=controllerMatches;

  function compare(a,b){
    if(sortMode==='alpha')return koCompare(a,b);
    if(sortMode==='near'){
      const here=window.FUNY_CURRENT_LOCATION;
      if(here){const ac=coord(a),bc=coord(b),ad=ac?dist(here.lat,here.lng,ac.lat,ac.lng):Infinity,bd=bc?dist(here.lat,here.lng,bc.lat,bc.lng):Infinity;if(ad!==bd)return ad-bd}
      return koCompare(a,b);
    }
    const events=window.FUNY_ACTIVE_EVENT_SHOPS instanceof Set?window.FUNY_ACTIVE_EVENT_SHOPS:null,ae=events?.has(a.id)?1:0,be=events?.has(b.id)?1:0;if(ae!==be)return be-ae;
    const ar=SCORE[a.id],br=SCORE[b.id];if(ar!=null||br!=null){const d=(br??-Infinity)-(ar??-Infinity);if(d)return d}
    return SHOPS.indexOf(a)-SHOPS.indexOf(b);
  }

  function card(s){
    const tags=tagList(s),shown=tags.slice(0,3),extra=tags.length-shown.length;
    const image=SHOP_IMAGES[s.id]?`<img src="${SHOP_IMAGES[s.id]}" alt="${esc(s.name)} 대표 이미지" loading="lazy" decoding="async">`:fallbackThumb;
    const loc=[s.area,s.station?(s.station+(s.walkMin?' 도보 '+s.walkMin+'분':'')):''].filter(Boolean).join(' · ');
    const funyMonActive=window.FUNY_FUNYMON_ACTIVE_SHOPS instanceof Set&&window.FUNY_FUNYMON_ACTIVE_SHOPS.has(s.id);
    const activeClass=(window.FUNY_ACTIVE_EVENT_SHOPS?.has(s.id)?' is-event-shop':'')+(funyMonActive?' is-funymon-shop':'');
    const monBadge=funyMonActive?'<span class="funymon-thumb-badge">FUNY MON</span>':'';
    return `<a class="shop-card shop-card-v1${activeClass}" href="#/shop/${s.id}" data-id="${s.id}"><div class="shop-thumb ${SHOP_IMAGES[s.id]?'has-image':'is-fallback'}">${image}${monBadge}</div><div class="shop-main"><h3 class="shop-name">${esc(s.name)}</h3><p class="shop-meta list-meta-line">${pinSvg}<span>${esc(loc)}</span></p><p class="shop-hours list-meta-line">${clockSvg}<span>${esc(todayHours(s))}</span></p><div class="tag-row">${shown.map(x=>`<span class="tag">${esc(x)}</span>`).join('')}${extra>0?`<span class="tag tag-more">+${extra}</span>`:''}</div></div><div class="chev">›</div></a>`;
  }
  try{cardHTML=card}catch(_){}
  window.cardHTML=card;

  function result(){
    const jp=currentCountry()==='JP';
    return SHOPS.filter(s=>jp===String(s.id).startsWith('JP-')).filter(controllerMatches).slice().sort(compare);
  }
  function feedbackEligible(){try{const done=+localStorage.getItem(FEEDBACK_DONE_KEY)||0,visits=+localStorage.getItem(FEEDBACK_VISITS_KEY)||0;return visits>=2&&(!done||Date.now()-done>=COOLDOWN)}catch(_){return false}}
  function feedback(){const list=document.getElementById('shop-list');if(!list)return;list.querySelector('.feedback-list-banner')?.remove();const cards=[...list.querySelectorAll('.shop-card')];if(!feedbackEligible()||cards.length<4)return;const a=document.createElement('a');a.className='feedback-list-banner';a.href='feedback.html';a.innerHTML='<span class="feedback-banner-copy"><span class="feedback-banner-icon">📝</span><span>서비스 개선을 위해 의견을 들려주세요</span></span><span>›</span>';list.insertBefore(a,cards[Math.min(3,cards.length-1)]||null)}
  function refresh(reason='manual'){
    const rows=result(),list=document.getElementById('shop-list'),empty=document.getElementById('empty'),count=document.getElementById('count');
    window.FUNY_VISIBLE_SHOPS=rows;window.FUNY_LIST_SORT_MODE=sortMode;
    if(list)list.innerHTML=rows.map(card).join('');
    if(empty)empty.hidden=rows.length!==0;
    if(count)count.textContent=String(rows.length);
    feedback();updateFilterVisual();updateSortVisual();
    try{syncMapMarkers(false)}catch(_){}
    try{window.FUNY_MAP_CLUSTER?.refresh?.()}catch(_){}
    try{window.FUNY_TRACK?.('shop_list_render',{country:currentCountry(),sort_type:sortMode,result_count:rows.length,search_active:!!document.getElementById('map-shop-search')?.value.trim(),filter_count:activeFilters.size,reason})}catch(_){}
  }
  try{renderList=()=>refresh('renderList')}catch(_){}
  window.renderList=()=>refresh('renderList');
  window.FUNY_MAP_LIST={refresh,setSort:v=>setSort(v,'api'),getVisible:()=>window.FUNY_VISIBLE_SHOPS||[],getFilters:()=>[...activeFilters]};

  function updateFilterVisual(){const root=document.getElementById('filters');if(!root)return;root.querySelectorAll('.filter-chip').forEach(b=>{const id=b.dataset.filter;b.classList.toggle('active',id==='all'?activeFilters.size===0:activeFilters.has(id))})}
  function sortLabel(){return sortMode==='near'?'가까운 순':sortMode==='alpha'?'가나다 순':'추천 순'}
  function updateSortVisual(){const label=document.getElementById('list-sort-label');if(label)label.textContent=sortLabel();document.querySelectorAll('[data-sort-value]').forEach(b=>b.classList.toggle('active',b.dataset.sortValue===sortMode))}
  function closeSort(){sortOpen=false;document.getElementById('list-sort-menu')?.classList.remove('open');document.getElementById('list-sort-button')?.setAttribute('aria-expanded','false')}
  function toggleSort(e){e?.preventDefault();e?.stopPropagation();sortOpen=!sortOpen;document.getElementById('list-sort-menu')?.classList.toggle('open',sortOpen);document.getElementById('list-sort-button')?.setAttribute('aria-expanded',sortOpen?'true':'false')}
  function setSort(value,reason='sort-change'){sortMode=['near','alpha'].includes(value)?value:'recommend';closeSort();updateSortVisual();if(sortMode==='near'&&!window.FUNY_CURRENT_LOCATION){document.getElementById('map-location-btn')?.click();setTimeout(()=>refresh(reason),80);return}refresh(reason)}

  const heading=document.querySelector('.list-heading');
  if(heading){
    heading.classList.add('list-heading-v2');
    heading.innerHTML='<div class="list-title"><span class="list-title-label">CARD SHOP</span><span class="list-count" id="count"></span></div><div class="list-sort"><button id="list-sort-button" class="list-sort-button" type="button" aria-haspopup="menu" aria-expanded="false"><span id="list-sort-label">추천 순</span><svg class="list-sort-chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6.25 8 10l4-3.75"/></svg></button><div id="list-sort-menu" class="list-sort-menu" role="menu"><button type="button" data-sort-value="recommend">추천 순</button><button type="button" data-sort-value="near">가까운 순</button><button type="button" data-sort-value="alpha">가나다 순</button></div></div>';
  }

  const style=document.createElement('style');
  style.id='funy-map-list-v4-style';
  style.textContent=[
    '.list-heading-v2{overflow:visible!important}',
    '.list-sort{position:relative!important;z-index:120!important;flex:0 0 auto!important}',
    '.list-sort-button{height:38px!important;min-width:104px!important;padding:0 12px 0 15px!important;border:1px solid rgba(204,198,211,.95)!important;border-radius:999px!important;background:#fff!important;color:#332f36!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;font:800 11.5px Pretendard,sans-serif!important;box-shadow:0 3px 12px rgba(40,34,48,.05)!important;pointer-events:auto!important;touch-action:manipulation!important}',
    '.list-sort-chevron{display:block!important;width:14px!important;height:14px!important;flex:0 0 14px!important;fill:none!important;stroke:#625b69!important;stroke-width:1.8!important;stroke-linecap:round!important;stroke-linejoin:round!important;pointer-events:none!important;transition:transform .18s ease!important}',
    '.list-sort-button[aria-expanded="true"] .list-sort-chevron{transform:rotate(180deg)!important}',
    '.list-sort-menu{display:none;position:absolute;right:0;top:44px;min-width:118px;padding:5px;border:1px solid #e4dfe7;border-radius:12px;background:#fff;box-shadow:0 10px 26px rgba(30,24,38,.16);z-index:9999}',
    '.list-sort-menu.open{display:block!important}',
    '.list-sort-menu button{display:block;width:100%;height:38px;padding:0 12px;border:0;border-radius:8px;background:#fff;text-align:left;color:#504a54;font:750 11.5px Pretendard,sans-serif}',
    '.list-sort-menu button.active{background:#f1ecfb;color:#684bbf;font-weight:900}',
    '.map-filter-bar,.map-filter-bar .filter-track,.map-filter-bar .filter-chip,.country-filter-wrap,.country-filter-select{pointer-events:auto!important;touch-action:manipulation!important}'
  ].join('');
  document.head.appendChild(style);

  document.getElementById('list-sort-button')?.addEventListener('click',toggleSort);
  document.getElementById('list-sort-menu')?.addEventListener('click',e=>{const b=e.target.closest?.('[data-sort-value]');if(!b)return;e.preventDefault();e.stopPropagation();setSort(b.dataset.sortValue)});
  document.addEventListener('click',e=>{if(sortOpen&&!e.target.closest?.('.list-sort'))closeSort()},true);

  const filters=document.getElementById('filters');
  if(filters){
    filters.addEventListener('click',e=>{
      const chip=e.target.closest?.('.filter-chip');if(!chip)return;
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      const id=chip.dataset.filter;if(id==='all')activeFilters.clear();else if(id){activeFilters.has(id)?activeFilters.delete(id):activeFilters.add(id)}
      updateFilterVisual();refresh('filter-change');
    },true);
    filters.addEventListener('change',e=>{
      const sel=e.target.closest?.('.country-filter-select');if(!sel)return;
      e.stopPropagation();e.stopImmediatePropagation();
      const next=sel.value==='JP'?'JP':'KR';window.FUNY_MAP_COUNTRY?.set?.(next);setTimeout(()=>refresh('country-change'),20);
    },true);
    new MutationObserver(()=>updateFilterVisual()).observe(filters,{childList:true,subtree:true});
  }

  const search=document.getElementById('map-shop-search'),clear=document.getElementById('map-shop-search-clear');
  const searchHandler=e=>{e.stopPropagation();e.stopImmediatePropagation();if(clear)clear.hidden=!search.value.trim();refresh('search-input')};
  search?.addEventListener('input',searchHandler,true);
  search?.addEventListener('search',searchHandler,true);
  clear?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(search){search.value='';clear.hidden=true;search.focus()}refresh('search-clear')},true);

  const list=document.getElementById('shop-list');
  list?.addEventListener('click',e=>{const a=e.target.closest?.('.shop-card');if(!a)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();try{const n=+localStorage.getItem(FEEDBACK_VISITS_KEY)||0;localStorage.setItem(FEEDBACK_VISITS_KEY,String(Math.min(n+1,99)))}catch(_){}if(typeof state!=='undefined')state.scrollY=window.scrollY||0;location.hash='#/shop/'+a.dataset.id},true);

  window.addEventListener('funy:locationchange',()=>{if(sortMode==='near')refresh('location-change')});
  window.addEventListener('funy:shops-source',()=>refresh('shops-source'));
  window.addEventListener('funy:list-refresh',()=>refresh('external-refresh'));
  window.addEventListener('funy:mapdatachange',()=>refresh('mapdatachange'));
  updateFilterVisual();updateSortVisual();setTimeout(()=>refresh('boot'),0);
})();