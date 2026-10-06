/* FUNY PIN country module loader */
(function(){
  const core=document.createElement('script');
  core.src='map-country-core-v1.js?v=20261006-route-unify2';
  core.async=false;
  core.onload=()=>{
    const stability=document.createElement('script');
    stability.src='map-country-stability-v1.js?v=20261002-01';
    stability.async=false;
    stability.onload=()=>{
      const cluster=document.createElement('script');
      cluster.src='map-cluster-v1.js?v=20261002-01';
      cluster.async=false;
      document.body.appendChild(cluster);
    };
    stability.onerror=()=>console.error('[FUNY PIN] country stability module load failed');
    document.body.appendChild(stability);
  };
  core.onerror=()=>console.error('[FUNY PIN] country module load failed');
  document.body.appendChild(core);
})();