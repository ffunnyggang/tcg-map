/* FUNY PIN card shop list sorting */
(function(){
  if(typeof SHOPS==='undefined'||typeof renderList!=='function')return;

  const RECOMMEND_SCORE={
    'KR-SEO-001':4.4444444444,
    'KR-SEO-010':4.2222222222,
    'KR-SEO-002':3.8888888889,
    'KR-SEO-007':3.8888888889,
    'KR-SEO-009':3.7777777778,
    'KR-SEO-006':3.5555555556,
    'KR-SEO-015':3.3333333333,
    'KR-SEO-012':3.3333333333,
    'KR-SEO-013':3.2222222222,
    'KR-SEO-005':3.1111111111,
    'KR-SEO-011':3.0,
    'KR-SEO-003':3.0,
    'KR-SEO-004':2.8888888889,
    'KR-SEO-014':2.7777777778,
    'KR-SEO-008':2.7777777778
  };

  const baseRenderList=renderList;
  let sortMode='recommend';

  const koCompare=(a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ko',{sensitivity:'base'});
  const radians=v=>v*Math.PI/180;
  function distanceKm(lat1,lng1,lat2,lng2){
    const R=6371;
    const dLat=radians(lat2-lat1),dLng=radians(lng2-lng1);
    const a=Math.sin(dLat/2)**2+Math.cos(radians(lat1))*Math.cos(radians(lat2))*Math.sin(dLng/2)**2;
    return 2*R*Math.asin(Math.sqrt(a));
  }

  function locationOf(s){
    if(s&&s._coord&&Number.isFinite(Number(s._coord.lat))&&Number.isFinite(Number(s._coord.lng)))return s._coord;
    try{
      if(typeof markerById!=='undefined'){
        const marker=markerById.get(s.id);
        if(marker){
          const p=marker.getPosition();
          return{lat:Number(p.lat()),lng:Number(p.lng())};
        }
      }
    }catch(e){}
    return null;
  }

  function compareShops(a,b){
    if(sortMode==='alpha')return koCompare(a,b);
    if(sortMode==='near'){
      const here=window.FUNY_CURRENT_LOCATION;
      if(here){
        const ac=locationOf(a),bc=locationOf(b);
        const ad=ac?distanceKm(here.lat,here.lng,Number(ac.lat),Number(ac.lng)):Infinity;
        const bd=bc?distanceKm(here.lat,here.lng,Number(bc.lat),Number(bc.lng)):Infinity;
        if(ad!==bd)return ad-bd;
      }
      return koCompare(a,b);
    }
    const diff=(RECOMMEND_SCORE[b.id]??-Infinity)-(RECOMMEND_SCORE[a.id]??-Infinity);
    return diff||koCompare(a,b);
  }

  function applySort(){SHOPS.sort(compareShops)}

  renderList=function(){
    applySort();
    baseRenderList();
    const count=document.getElementById('count');
    if(count){
      try{count.textContent=String(SHOPS.filter(matches).length)}catch(e){count.textContent=String(SHOPS.length)}
    }
  };

  function requestCurrentLocation(){
    if(window.FUNY_CURRENT_LOCATION){renderList();return}
    const btn=document.getElementById('map-location-btn');
    if(btn){btn.click();return}
    setTimeout(()=>{
      const delayed=document.getElementById('map-location-btn');
      if(delayed)delayed.click();
      else{
        sortMode='recommend';
        const select=document.getElementById('list-sort-select');
        if(select)select.value='recommend';
        renderList();
      }
    },300);
  }

  const select=document.getElementById('list-sort-select');
  if(select){
    select.value='recommend';
    select.addEventListener('change',()=>{
      sortMode=select.value;
      if(sortMode==='near')requestCurrentLocation();
      else renderList();
    });
  }

  window.addEventListener('funy:locationchange',()=>{if(sortMode==='near')renderList()});
  window.addEventListener('funy:locationerror',()=>{
    if(sortMode!=='near')return;
    sortMode='recommend';
    if(select)select.value='recommend';
    renderList();
  });

  renderList();
})();
