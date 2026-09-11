/* Selected list design 01: clean basic */
(function(){
  const pinSvg='<svg class="list-meta-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2.5"/></svg>';
  const clockSvg='<svg class="list-meta-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  cardHTML=function(s){
    const tags=tagList(s);
    const shown=tags.slice(0,3);
    const extra=tags.length-shown.length;
    return `<a class="shop-card shop-card-v1" href="#/shop/${s.id}" data-id="${s.id}"><div class="shop-thumb ${SHOP_IMAGES[s.id]?'has-image':''}">${SHOP_IMAGES[s.id]?`<img src="${SHOP_IMAGES[s.id]}" alt="${esc(s.name)} 대표 이미지" loading="lazy" decoding="async">`:esc(s.name)}</div><div class="shop-main"><h3 class="shop-name">${esc(s.name)}</h3><p class="shop-meta list-meta-line">${pinSvg}<span>${esc(s.area)} · ${esc(s.station)} 도보 ${esc(s.walkMin)}분</span></p><p class="shop-hours list-meta-line">${clockSvg}<span>${esc(todayHours(s))}</span></p><div class="tag-row">${shown.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}${extra>0?`<span class="tag tag-more">+${extra}</span>`:''}</div></div><div class="chev">›</div></a>`;
  };
  renderList();
})();