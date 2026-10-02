/* FUNY PIN country/search/filter stability layer */
(function(){
  'use strict';
  let timer=0,lateTimer=0;
  const country=()=>{try{return window.FUNY_MAP_COUNTRY?.get?.()||'KR'}catch(_){return'KR'}};
  const isVisible=(shop)=>{try{return typeof window.matches==='function'?!!window.matches(shop):true}catch(_){return true}};
  function syncJapanVisibility(){
    if(country()!=='JP')return;
    const api=window.FUNY_GOOGLE_MAP_API,map=api?.getMap?.(),markers=api?.getMarkers?.();
    if(!map||!markers)return;
    markers.forEach(marker=>{try{marker.setMap(isVisible(marker.shop)?map:null)}catch(_){}});
  }
  function syncListCount(){
    const list=document.getElementById('shop-list');
    if(!list)return;
    const count=document.getElementById('count');
    if(count)count.textContent=String(list.querySelectorAll('.shop-card').length);
  }
  function refreshNow(){
    syncJapanVisibility();
    syncListCount();
    try{window.FUNY_MAP_CLUSTER?.refresh?.()}catch(_){}
    window.dispatchEvent(new CustomEvent('funy:mapdatachange',{detail:{country:country()}}));
  }
  function schedule(delay=60){
    clearTimeout(timer);clearTimeout(lateTimer);
    timer=setTimeout(refreshNow,delay);
    lateTimer=setTimeout(refreshNow,delay+180);
  }
  const style=document.createElement('style');
  style.textContent=[
    '.map-search-float,.map-filter-bar{z-index:500!important}',
    '.map-search-box,.map-search-input,.map-search-clear,.map-filter-bar .filter-track,.map-filter-bar .filter-chip,.map-filter-bar .country-filter-wrap,.map-filter-bar .country-filter-select{pointer-events:auto!important;touch-action:manipulation!important}',
    '.funy-google-marker{pointer-events:auto!important;touch-action:manipulation!important;cursor:pointer!important;z-index:60!important}',
    '.funy-google-marker svg{pointer-events:none!important}',
    '.funy-google-popup,.funy-google-popup *{pointer-events:auto!important}',
    'html.app-shell .map-location-avatar-card,html.app-shell #funyMonModal .funy-mon-sheet,html.app-shell .funy-mon-outcome-box{margin-bottom:0!important}'
  ].join('');
  document.head.appendChild(style);

  const input=document.getElementById('map-shop-search');
  input?.addEventListener('input',()=>schedule(120));
  input?.addEventListener('search',()=>schedule(80));
  document.getElementById('map-shop-search-clear')?.addEventListener('click',()=>schedule(80));

  const filters=document.getElementById('filters');
  filters?.addEventListener('pointerup',e=>{if(e.target.closest?.('.filter-chip'))schedule(30);},true);
  filters?.addEventListener('click',e=>{if(e.target.closest?.('.filter-chip'))schedule(30);},true);
  filters?.addEventListener('change',e=>{if(e.target.closest?.('.country-filter-select'))schedule(180);},true);
  document.addEventListener('change',e=>{if(e.target.closest?.('#list-sort-select,.country-filter-select'))schedule(60);},true);

  try{
    if(typeof window.applyFilters==='function'&&!window.__FUNY_FILTER_REFRESH_WRAPPED){
      window.__FUNY_FILTER_REFRESH_WRAPPED=true;
      const base=window.applyFilters;
      window.applyFilters=function(){const out=base.apply(this,arguments);schedule(20);return out};
    }
    if(typeof window.renderList==='function'&&!window.__FUNY_LIST_REFRESH_WRAPPED){
      window.__FUNY_LIST_REFRESH_WRAPPED=true;
      const base=window.renderList;
      window.renderList=function(){const out=base.apply(this,arguments);setTimeout(syncListCount,0);return out};
    }
  }catch(_){}

  window.addEventListener('funy:googlemapready',()=>schedule(40));
  window.addEventListener('funy:sheetchange',()=>schedule(40));
  window.addEventListener('funy:shops-source',()=>schedule(60));
  window.addEventListener('hashchange',()=>schedule(80));
  const observer=new MutationObserver(()=>schedule(60));
  const list=document.getElementById('shop-list');
  if(list)observer.observe(list,{childList:true,subtree:false});
  schedule(220);
})();
