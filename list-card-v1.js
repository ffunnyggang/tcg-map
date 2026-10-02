/* FUNY PIN MAP list controller v3 — single source of truth for search/filter/country/sort */
(function(){
  'use strict';
  if(window.__FUNY_MAP_LIST_V3)return;
  window.__FUNY_MAP_LIST_V3=true;
  if(typeof SHOPS==='undefined'||typeof FILTERS==='undefined'||typeof state==='undefined')return;

  const pinSvg='<svg class="list-meta-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2.5"/></svg>';
  const clockSvg='<svg class="list-meta-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  const fallbackThumb='<span class="shop-thumb-fallback" aria-hidden="true"><svg viewBox="0 0 98 134" fill="none"><path class="fallback-pin-body" d="M49 5C23 5 2 26 2 52c0 35 47 77 47 77s47-42 47-77C96 26 75 5 49 5Z"/><path class="fallback-pin-line" d="M6 52h28M64 52h28"/><circle class="fallback-pin-center" cx="49" cy="52" r="14.5"/></svg><b>FUNY PIN</b></span>';
  const RECOMMEND_SCORE={'KR-SEO-001':4.4444444444,'KR-SEO-010':4.2222222222,'KR-SEO-002':3.8888888889,'KR-SEO-007':3.8888888889,'KR-SEO-009':3.7777777778,'KR-SEO-006':3.5555555556,'KR-SEO-015':3.3333333333,'KR-SEO-012':3.3333333333,'KR-SEO-013':3.2222222222,'KR-SEO-005':3.1111111111,'KR-SEO-011':3,'KR-SEO-003':3,'KR-SEO-004':2.8888888889,'KR-SEO-014':2.7777777778,'KR-SEO-008':2.7777777778};
  const FEEDBACK_VISITS_KEY='funypin_feedback_shop_visits',FEEDBACK_DONE_KEY='funypin_feedback_submitted_at',FEEDBACK_COOLDOWN=30*24*60*60*1000;
  let sortMode='recommend';

  const normalize=v=>String(v??'').toLowerCase().replace(/\s+/g,'').trim();
  const country=()=>{try{return window.FUNY_MAP_COUNTRY?.get?.()||new URLSearchParams(location.search).get('country')||'KR'}catch(_){return'KR'}};
  const koCompare=(a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ko',{sensitivity:'base'});
  const radians=v=>v*Math.PI/180;
  function distanceKm(lat1,lng1,lat2,lng2){const R=6371,dLat=radians(lat2-lat1),dLng=radians(lng2-lng1),x=Math.sin(dLat/2)**2+Math.cos(radians(lat1))*Math.cos(radians(lat2))*Math.sin(dLng/2)**2;return 2*R*Math.asin(Math.sqrt(x))}
  function locationOf(s){if(s?._coord&&Number.isFinite(Number(s._coord.lat))&&Number.isFinite(Number(s._coord.lng)))return s._coord;if(Number.isFinite(Number(s?.lat))&&Number.isFinite(Number(s?.lng)))return{lat:Number(s.lat),lng:Number(s.lng)};return null}
  function searchableText(s){const filters=FILTERS.filter(f=>{try{return f.test(s)}catch(_){return false}}).map(f=>f.label);const features=typeof FEATURE_LABELS!=='undefined'?Object.entries(FEATURE_LABELS).filter(([k])=>s.f?.[k]===true).map(([,v])=>v):[];const tcg=[s.tcg?.pokemon?'포켓몬':'',s.tcg?.onePiece?'원피스':'',s.tcg?.dragonBall?'드래곤볼':''];return normalize([s.name,s.en,s.city,s.area,s.address,s.station,...filters,...features,...tcg].filter(Boolean).join(' '))}
  function passesFilters(s){for(const id of state.filters){const f=FILTERS.find(x=>x.id===id);if(f&&!f.test(s))return false}return true}
  function passesSearch(s){const q=normalize(document.getElementById('map-shop-search')?.value||'');return !q||searchableText(s).includes(q)}
  function compareShops(a,b){
    if(sortMode==='alpha')return koCompare(a,b);
    if(sortMode==='near'){
      const here=window.FUNY_CURRENT_LOCATION;
      if(here){const ac=locationOf(a),bc=locationOf(b),ad=ac?distanceKm(here.lat,here.lng,Number(ac.lat),Number(ac.lng)):Infinity,bd=bc?distanceKm(here.lat,here.lng,Number(bc.lat),Number(bc.lng)):Infinity;if(ad!==bd)return ad-bd}
      return koCompare(a,b);
    }
    const events=window.FUNY_ACTIVE_EVENT_SHOPS instanceof Set?window.FUNY_ACTIVE_EVENT_SHOPS:null,ae=events?.has(a.id)?1:0,be=events?.has(b.id)?1:0;if(ae!==be)return be-ae;
    const ar=RECOMMEND_SCORE[a.id],br=RECOMMEND_SCORE[b.id];if(ar!=null||br!=null){const d=(br??-Infinity)-(ar??-Infinity);if(d)return d}
    const ai=SHOPS.indexOf(a),bi=SHOPS.indexOf(b);if(ai!==bi)return ai-bi;return koCompare(a,b);
  }

  function cardHTMLv3(s){
    const tags=tagList(s),shown=tags.slice(0,3),extra=tags.length-shown.length;
    const image=SHOP_IMAGES[s.id]?`<img src="${SHOP_IMAGES[s.id]}" alt="${esc(s.name)} 대표 이미지" loading="lazy" decoding="async">`:fallbackThumb;
    const loc=[s.area,s.station?(s.station+(s.walkMin?' 도보 '+s.walkMin+'분':'')):''].filter(Boolean).join(' · ');
    return `<a class="shop-card shop-card-v1${window.FUNY_ACTIVE_EVENT_SHOPS?.has(s.id)?' is-event-shop':''}" href="#/shop/${s.id}" data-id="${s.id}"><div class="shop-thumb ${SHOP_IMAGES[s.id]?'has-image':'is-fallback'}">${image}</div><div class="shop-main"><h3 class="shop-name">${esc(s.name)}</h3><p class="shop-meta list-meta-line">${pinSvg}<span>${esc(loc)}</span></p><p class="shop-hours list-meta-line">${clockSvg}<span>${esc(todayHours(s))}</span></p><div class="tag-row">${shown.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}${extra>0?`<span class="tag tag-more">+${extra}</span>`:''}</div></div><div class="chev">›</div></a>`;
  }
  window.cardHTML=cardHTMLv3;

  function feedbackEligible(){try{const done=Number(localStorage.getItem(FEEDBACK_DONE_KEY)||0),visits=Number(localStorage.getItem(FEEDBACK_VISITS_KEY)||0);return visits>=2&&(!done||Date.now()-done>=FEEDBACK_COOLDOWN)}catch(_){return false}}
  function injectFeedbackBanner(){const list=document.getElementById('shop-list');if(!list)return;list.querySelector('.feedback-list-banner')?.remove();const cards=[...list.querySelectorAll('.shop-card')];if(!feedbackEligible()||cards.length<4)return;const index=Math.min(3,cards.length-1),a=document.createElement('a');a.className='feedback-list-banner';a.href='feedback.html';a.innerHTML='<span class="feedback-banner-copy"><span class="feedback-banner-icon">📝</span><span>서비스 개선을 위해 의견을 들려주세요</span></span><span>›</span>';list.insertBefore(a,cards[index]||null)}

  function computeVisible(){
    const c=country();
    return SHOPS.filter(s=>(c==='JP')===String(s.id).startsWith('JP-')).filter(passesFilters).filter(passesSearch).slice().sort(compareShops);
  }
  function refresh(reason='manual'){
    const visible=computeVisible(),list=document.getElementById('shop-list'),empty=document.getElementById('empty'),count=document.getElementById('count');
    window.FUNY_VISIBLE_SHOPS=visible;window.FUNY_LIST_SORT_MODE=sortMode;
    if(list)list.innerHTML=visible.map(cardHTMLv3).join('');
    if(empty)empty.hidden=visible.length!==0;
    if(count)count.textContent=String(visible.length);
    injectFeedbackBanner();
    try{window.FUNY_MAP_CLUSTER?.refresh?.()}catch(_){}
    try{window.dispatchEvent(new CustomEvent('funy:listchange',{detail:{country:country(),sort:sortMode,count:visible.length,reason}}))}catch(_){}
    try{window.FUNY_TRACK?.('shop_list_render',{country:country(),sort_type:sortMode,result_count:visible.length,search_active:!!document.getElementById('map-shop-search')?.value.trim(),filter_count:state.filters.size,reason})}catch(_){}
  }
  window.renderList=()=>refresh('renderList');
  window.FUNY_MAP_LIST={refresh,setSort:v=>{sortMode=v;const s=document.getElementById('list-sort-select');if(s)s.value=v;refresh('sort-api')},getVisible:()=>window.FUNY_VISIBLE_SHOPS||[]};

  const heading=document.querySelector('.list-heading');
  if(heading){heading.classList.add('list-heading-v2');heading.innerHTML='<div class="list-title"><span class="list-title-label">CARD SHOP</span><span class="list-count" id="count"></span></div><label class="list-sort"><span class="sr-only">카드샵 정렬</span><select id="list-sort-select" class="list-sort-select" aria-label="카드샵 정렬"><option value="recommend">추천 순</option><option value="near">가까운 순</option><option value="alpha">가나다 순</option></select><svg class="list-sort-chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></label>'}

  const style=document.createElement('style');style.textContent='.list-sort{position:relative!important;z-index:100!important;pointer-events:auto!important}.list-sort-select{position:relative!important;z-index:101!important;pointer-events:auto!important;touch-action:manipulation!important}.map-filter-bar,.map-filter-bar .filter-track,.map-filter-bar .filter-chip,.country-filter-wrap,.country-filter-select{pointer-events:auto!important;touch-action:manipulation!important}';document.head.appendChild(style);

  function requestNear(){
    if(window.FUNY_CURRENT_LOCATION){refresh('near-ready');return}
    const btn=document.getElementById('map-location-btn');
    if(btn){btn.click();return}
    sortMode='recommend';const s=document.getElementById('list-sort-select');if(s)s.value='recommend';refresh('near-fallback');
  }
  function bindSort(){
    const select=document.getElementById('list-sort-select');if(!select)return;
    select.value=sortMode;
    select.onchange=e=>{e.stopPropagation();sortMode=select.value||'recommend';window.FUNY_LIST_SORT_MODE=sortMode;if(sortMode==='near')requestNear();else refresh('sort-change')};
    select.oninput=select.onchange;
  }
  function bindFilters(){
    document.querySelectorAll('#filters .filter-chip').forEach(chip=>{
      chip.onclick=e=>{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();const id=chip.dataset.filter;if(id==='all')state.filters.clear();else if(id){state.filters.has(id)?state.filters.delete(id):state.filters.add(id)};renderFilterUI();refresh('filter-change')};
    });
    const countrySelect=document.querySelector('#filters .country-filter-select');
    if(countrySelect){
      countrySelect.onchange=e=>{e.stopPropagation();e.stopImmediatePropagation();const next=countrySelect.value==='JP'?'JP':'KR';window.FUNY_MAP_COUNTRY?.set?.(next);setTimeout(()=>{bindFilters();refresh('country-change')},40)};
      countrySelect.oninput=countrySelect.onchange;
    }
  }
  function renderFilterUI(){
    const root=document.getElementById('filters');if(!root)return;
    root.querySelectorAll('.filter-chip').forEach(chip=>{const id=chip.dataset.filter;chip.classList.toggle('active',id==='all'?state.filters.size===0:state.filters.has(id))});
  }
  const originalRenderFilters=window.renderFilters;
  if(typeof originalRenderFilters==='function'){
    window.renderFilters=function(){originalRenderFilters();queueMicrotask(()=>{renderFilterUI();bindFilters()})};
  }

  const search=document.getElementById('map-shop-search'),clear=document.getElementById('map-shop-search-clear');
  if(search){search.oninput=()=>{if(clear)clear.hidden=!search.value.trim();refresh('search-input')};search.onsearch=()=>refresh('search-submit')}
  if(clear){clear.onclick=e=>{e.preventDefault();e.stopPropagation();if(search){search.value='';clear.hidden=true;search.focus()}refresh('search-clear')}}

  const list=document.getElementById('shop-list');
  if(list){list.onclick=e=>{const card=e.target.closest?.('.shop-card');if(!card)return;e.preventDefault();e.stopPropagation();try{const visits=Number(localStorage.getItem(FEEDBACK_VISITS_KEY)||0);localStorage.setItem(FEEDBACK_VISITS_KEY,String(Math.min(visits+1,99)))}catch(_){}state.scrollY=window.scrollY||0;location.hash='#/shop/'+card.dataset.id}}

  window.addEventListener('funy:locationchange',()=>{if(sortMode==='near')refresh('location-change')});
  window.addEventListener('funy:locationerror',()=>{if(sortMode==='near'){sortMode='recommend';bindSort();refresh('location-error')}});
  window.addEventListener('funy:shops-source',()=>refresh('shops-source'));
  window.addEventListener('funy:list-refresh',()=>refresh('external-refresh'));
  window.addEventListener('funy:mapdatachange',()=>{bindFilters();refresh('mapdatachange')});
  bindSort();renderFilterUI();bindFilters();
  setTimeout(()=>refresh('boot'),0);
})();