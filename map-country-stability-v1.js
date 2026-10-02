/* FUNY PIN country/search/filter stability layer */
(function(){
  'use strict';
  let timer=0;
  const country=()=>{try{return window.FUNY_MAP_COUNTRY?.get?.()||'KR'}catch(_){return'KR'}};
  function syncJapanVisibility(){
    if(country()!=='JP')return;
    const api=window.FUNY_GOOGLE_MAP_API,map=api?.getMap?.(),markers=api?.getMarkers?.();
    if(!map||!markers)return;
    const visibleIds=Array.isArray(window.FUNY_VISIBLE_SHOPS)?new Set(window.FUNY_VISIBLE_SHOPS.map(s=>s.id)):null;
    markers.forEach(marker=>{try{const on=visibleIds?visibleIds.has(marker.shop?.id):(typeof window.matches==='function'?!!window.matches(marker.shop):true);marker.setMap(on?map:null)}catch(_){}});
  }
  function syncListCount(){const list=document.getElementById('shop-list'),count=document.getElementById('count');if(list&&count)count.textContent=String(list.querySelectorAll('.shop-card').length)}
  function refreshNow(){syncJapanVisibility();syncListCount();try{window.FUNY_MAP_CLUSTER?.refresh?.()}catch(_){}}
  function schedule(delay=40){clearTimeout(timer);timer=setTimeout(refreshNow,delay)}
  const style=document.createElement('style');
  style.textContent=[
    '.map-search-float,.map-filter-bar{z-index:500!important}',
    '.map-search-box,.map-search-input,.map-search-clear,.map-filter-bar .filter-track,.map-filter-bar .filter-chip,.map-filter-bar .country-filter-wrap,.map-filter-bar .country-filter-select{pointer-events:auto!important;touch-action:manipulation!important}',
    '.funy-google-marker,.funy-google-cluster{pointer-events:auto!important;touch-action:manipulation!important;cursor:pointer!important}',
    '.funy-google-marker svg,.funy-google-cluster .funy-map-cluster{pointer-events:none!important}',
    '.funy-google-popup,.funy-google-popup *{pointer-events:auto!important}'
  ].join('');
  document.head.appendChild(style);

  document.getElementById('map-shop-search')?.addEventListener('input',()=>schedule(20));
  document.getElementById('map-shop-search')?.addEventListener('search',()=>schedule(20));
  document.getElementById('map-shop-search-clear')?.addEventListener('click',()=>schedule(20));
  const filters=document.getElementById('filters');
  filters?.addEventListener('click',e=>{if(e.target.closest?.('.filter-chip'))schedule(20)},true);
  filters?.addEventListener('change',e=>{if(e.target.closest?.('.country-filter-select'))schedule(80)},true);
  document.getElementById('list-sort-select')?.addEventListener('change',()=>schedule(20));
  window.addEventListener('funy:googlemapready',()=>schedule(60));
  window.addEventListener('funy:sheetchange',()=>schedule(40));
  window.addEventListener('funy:shops-source',()=>schedule(60));
  window.addEventListener('funy:listchange',()=>schedule(10));
  window.addEventListener('funy:mapdatachange',()=>schedule(40));
  window.addEventListener('hashchange',()=>schedule(80));
  schedule(160);
})();