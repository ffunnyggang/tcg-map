/* Selected list design 01: clean basic + list sorting */
(function(){
  const pinSvg='<svg class="list-meta-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2.5"/></svg>';
  const clockSvg='<svg class="list-meta-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  cardHTML=function(s){
    const tags=tagList(s);
    const shown=tags.slice(0,3);
    const extra=tags.length-shown.length;
    return `<a class="shop-card shop-card-v1" href="#/shop/${s.id}" data-id="${s.id}"><div class="shop-thumb ${SHOP_IMAGES[s.id]?'has-image':''}">${SHOP_IMAGES[s.id]?`<img src="${SHOP_IMAGES[s.id]}" alt="${esc(s.name)} 대표 이미지" loading="lazy" decoding="async">`:esc(s.name)}</div><div class="shop-main"><h3 class="shop-name">${esc(s.name)}</h3><p class="shop-meta list-meta-line">${pinSvg}<span>${esc(s.area)} · ${esc(s.station)} 도보 ${esc(s.walkMin)}분</span></p><p class="shop-hours list-meta-line">${clockSvg}<span>${esc(todayHours(s))}</span></p><div class="tag-row">${shown.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}${extra>0?`<span class="tag tag-more">+${extra}</span>`:''}</div></div><div class="chev">›</div></a>`;
  };

  const heading=document.querySelector('.list-heading');
  if(heading){
    heading.classList.add('list-heading-v2');
    heading.innerHTML='<div class="list-title"><span class="list-title-label">CARD SHOP</span><span class="list-count" id="count"></span></div><label class="list-sort"><span class="sr-only">카드샵 정렬</span><select id="list-sort-select" class="list-sort-select" aria-label="카드샵 정렬"><option value="recommend">추천 순</option><option value="near">가까운 순</option><option value="alpha">가나다 순</option></select><svg class="list-sort-chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></label>';
  }

  const RECOMMEND_SCORE={
    'KR-SEO-001':4.4444444444,'KR-SEO-010':4.2222222222,'KR-SEO-002':3.8888888889,'KR-SEO-007':3.8888888889,'KR-SEO-009':3.7777777778,
    'KR-SEO-006':3.5555555556,'KR-SEO-015':3.3333333333,'KR-SEO-012':3.3333333333,'KR-SEO-013':3.2222222222,'KR-SEO-005':3.1111111111,
    'KR-SEO-011':3.0,'KR-SEO-003':3.0,'KR-SEO-004':2.8888888889,'KR-SEO-014':2.7777777778,'KR-SEO-008':2.7777777778
  };
  const baseRenderList=renderList;
  let sortMode='recommend';
  const koCompare=(a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ko',{sensitivity:'base'});
  const radians=v=>v*Math.PI/180;
  function distanceKm(lat1,lng1,lat2,lng2){
    const R=6371,dLat=radians(lat2-lat1),dLng=radians(lng2-lng1);
    const a=Math.sin(dLat/2)**2+Math.cos(radians(lat1))*Math.cos(radians(lat2))*Math.sin(dLng/2)**2;
    return 2*R*Math.asin(Math.sqrt(a));
  }
  function locationOf(s){
    if(s&&s._coord&&Number.isFinite(Number(s._coord.lat))&&Number.isFinite(Number(s._coord.lng)))return s._coord;
    try{
      const marker=markerById.get(s.id);
      if(marker){const p=marker.getPosition();return{lat:Number(p.lat()),lng:Number(p.lng())}}
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
  renderList=function(){
    SHOPS.sort(compareShops);
    baseRenderList();
    const count=document.getElementById('count');
    if(count){try{count.textContent=String(SHOPS.filter(matches).length)}catch(e){count.textContent=String(SHOPS.length)}}
  };
  function requestCurrentLocation(){
    if(window.FUNY_CURRENT_LOCATION){renderList();return}
    const trigger=()=>{
      const btn=document.getElementById('map-location-btn');
      if(btn){btn.click();return true}
      return false;
    };
    if(!trigger())setTimeout(()=>{if(!trigger()){sortMode='recommend';const s=document.getElementById('list-sort-select');if(s)s.value='recommend';renderList()}},350);
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