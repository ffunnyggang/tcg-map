/* FUNY PIN country/search/filter stability layer */
(function(){
  'use strict';
  let timer=0;
  const country=()=>{try{return window.FUNY_MAP_COUNTRY?.get?.()||'KR'}catch(_){return'KR'}};
  const isVisible=(shop)=>{try{return typeof window.matches==='function'?!!window.matches(shop):true}catch(_){return true}};

  function syncJapanVisibility(){
    if(country()!=='JP')return;
    const api=window.FUNY_GOOGLE_MAP_API,map=api?.getMap?.(),markers=api?.getMarkers?.();
    if(!map||!markers)return;
    markers.forEach(marker=>{
      try{marker.setMap(isVisible(marker.shop)?map:null)}catch(_){}
    });
    window.FUNY_MAP_CLUSTER?.refresh?.();
  }

  function syncListCount(){
    const count=document.getElementById('count');
    if(count)count.textContent=String(document.querySelectorAll('#shop-list .shop-card').length);
  }

  function schedule(delay=80){
    clearTimeout(timer);
    timer=setTimeout(()=>{
      syncJapanVisibility();
      syncListCount();
      window.dispatchEvent(new CustomEvent('funy:mapdatachange',{detail:{country:country()}}));
    },delay);
  }

  /* Search and filter controls stay above both map engines and remain touchable. */
  const style=document.createElement('style');
  style.textContent='.map-search-float,.map-filter-bar{z-index:220!important}.map-search-box,.map-search-input,.map-search-clear,.map-filter-bar .filter-track,.map-filter-bar .filter-chip,.map-filter-bar .country-filter-wrap,.map-filter-bar .country-filter-select{pointer-events:auto!important;touch-action:manipulation}.funy-google-marker{pointer-events:auto!important;touch-action:manipulation}.funy-google-popup{pointer-events:auto!important}';
  document.head.appendChild(style);

  const input=document.getElementById('map-shop-search');
  input?.addEventListener('input',()=>schedule(180));
  input?.addEventListener('search',()=>schedule(120));
  document.getElementById('map-shop-search-clear')?.addEventListener('click',()=>schedule(120));

  const filters=document.getElementById('filters');
  filters?.addEventListener('click',e=>{
    if(e.target.closest?.('.filter-chip'))schedule(140);
  },true);
  filters?.addEventListener('change',e=>{
    if(e.target.closest?.('.country-filter-select')){
      /* Let the country module finish rebuilding its map/list before syncing. */
      schedule(420);
    }
  },true);

  window.addEventListener('funy:googlemapready',()=>schedule(80));
  window.addEventListener('funy:sheetchange',()=>schedule(80));
  window.addEventListener('funy:shops-source',()=>schedule(100));

  /* Country/filter renderers may replace children; delegated listeners above survive it. */
  const observer=new MutationObserver(()=>schedule(100));
  const list=document.getElementById('shop-list');
  if(list)observer.observe(list,{childList:true});

  schedule(300);
})();
