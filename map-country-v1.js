/* FUNY PIN country module loader */
(function(){
  const core=document.createElement('script');
  core.src='map-country-core-v1.js?v=20260916-1419';
  core.async=false;
  core.onload=()=>{
    const cluster=document.createElement('script');
    cluster.src='map-cluster-v1.js?v=20260916-1419';
    cluster.async=false;
    document.body.appendChild(cluster);
  };
  core.onerror=()=>console.error('[FUNY PIN] country module load failed');
  document.body.appendChild(core);
})();