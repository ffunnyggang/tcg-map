/* FUNY PIN map creature prototype */
(function(){
  const defs=[
    {id:'moru',cls:'mon-a',svg:'<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="5" y="2" width="2" height="2" fill="#6f58c9"/><rect x="9" y="2" width="2" height="2" fill="#6f58c9"/><rect x="4" y="4" width="8" height="7" fill="#8b73df"/><rect x="3" y="6" width="2" height="4" fill="#8b73df"/><rect x="11" y="6" width="2" height="4" fill="#8b73df"/><rect x="6" y="6" width="1" height="1" fill="#fff"/><rect x="9" y="6" width="1" height="1" fill="#fff"/><rect x="7" y="8" width="2" height="1" fill="#f7d36b"/><rect x="5" y="11" width="2" height="2" fill="#6f58c9"/><rect x="9" y="11" width="2" height="2" fill="#6f58c9"/></svg>'},
    {id:'nubi',cls:'mon-b',svg:'<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="3" width="3" height="2" fill="#4da47b"/><rect x="10" y="2" width="2" height="3" fill="#4da47b"/><rect x="4" y="5" width="8" height="6" fill="#6dc69a"/><rect x="2" y="7" width="2" height="3" fill="#6dc69a"/><rect x="12" y="7" width="2" height="3" fill="#6dc69a"/><rect x="6" y="7" width="1" height="1" fill="#18392d"/><rect x="9" y="7" width="1" height="1" fill="#18392d"/><rect x="7" y="9" width="2" height="1" fill="#fff"/><rect x="5" y="11" width="2" height="2" fill="#4da47b"/><rect x="9" y="11" width="2" height="2" fill="#4da47b"/></svg>'},
    {id:'piri',cls:'mon-c',svg:'<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="7" y="1" width="2" height="3" fill="#df7551"/><rect x="5" y="4" width="6" height="7" fill="#f08c61"/><rect x="3" y="6" width="2" height="3" fill="#f08c61"/><rect x="11" y="6" width="2" height="3" fill="#f08c61"/><rect x="6" y="6" width="1" height="1" fill="#38251e"/><rect x="9" y="6" width="1" height="1" fill="#38251e"/><rect x="7" y="8" width="2" height="1" fill="#ffe6a3"/><rect x="5" y="11" width="2" height="2" fill="#df7551"/><rect x="9" y="11" width="2" height="2" fill="#df7551"/><rect x="12" y="4" width="2" height="2" fill="#ffd35e"/></svg>'}
  ];
  const markers=[];
  let started=false,tries=0;
  const offsets=[[0.00014,0.00018],[-0.00012,0.00017],[0.00010,-0.00020]];
  function clear(){markers.splice(0).forEach(m=>{try{m.setMap(null)}catch(_){}})}
  function hiddenByRoute(){return location.hash.includes('/shop/')||document.body.classList.contains('country-japan')}
  function syncVisibility(){const hide=hiddenByRoute();markers.forEach(m=>{try{m.setMap(hide?null:naverMap)}catch(_){}})}
  function spawn(){
    if(started)return;
    if(!(window.naver&&naver.maps&&typeof naverMap!=='undefined'&&naverMap)){if(tries++<60)setTimeout(spawn,250);return}
    const shops=(typeof SHOPS!=='undefined'?SHOPS:[]).filter(s=>String(s.id||'').startsWith('KR-')&&s._coord).slice(0,3);
    if(shops.length<3){if(tries++<60)setTimeout(spawn,250);return}
    started=true;
    shops.forEach((s,i)=>{
      const d=defs[i%defs.length],off=offsets[i%offsets.length],lat=Number(s._coord.lat)+off[0],lng=Number(s._coord.lng)+off[1];
      const html='<div class="funy-mon-marker '+d.cls+'" aria-hidden="true"><span class="funy-mon-shadow"></span>'+d.svg+'</div>';
      const marker=new naver.maps.Marker({position:new naver.maps.LatLng(lat,lng),map:hiddenByRoute()?null:naverMap,clickable:false,zIndex:120,icon:{content:html,anchor:new naver.maps.Point(17,24)}});
      markers.push(marker);
    });
  }
  window.addEventListener('hashchange',syncVisibility);
  window.addEventListener('funy:shops-source',()=>{if(!started){tries=0;spawn()}});
  const obs=new MutationObserver(syncVisibility);obs.observe(document.body,{attributes:true,attributeFilter:['class']});
  setTimeout(spawn,450);
  window.FUNY_MON_PROTO={respawn:()=>{clear();started=false;tries=0;spawn()},count:()=>markers.length};
})();