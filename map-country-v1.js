/* FUNY PIN country module loader */
(function(){
  if(window.__FUNY_COUNTRY_LOADER)return;
  window.__FUNY_COUNTRY_LOADER=true;
  const core=document.createElement('script');
  core.src='map-country-core-v1.js?v=20261006-engine-visibility2';
  core.async=false;
  core.onload=()=>{
    if(document.querySelector('script[data-funy-country-stability]'))return;
    const stability=document.createElement('script');
    stability.src='map-country-stability-v1.js?v=20261003-0038';
    stability.async=false;
    stability.dataset.funyCountryStability='1';
    stability.onerror=()=>console.error('[FUNY PIN] country stability module load failed');
    document.body.appendChild(stability);
  };
  core.onerror=()=>console.error('[FUNY PIN] country module load failed');
  document.body.appendChild(core);
})();