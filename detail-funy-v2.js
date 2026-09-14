/* FUNY PIN detail interaction/render overrides */
(function(){
  function naverMapIcon(){
    return '<svg viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="fpNaverPin" x1="8" y1="4" x2="24" y2="27" gradientUnits="userSpaceOnUse"><stop stop-color="#9b82e6"/><stop offset=".55" stop-color="#8062d8"/><stop offset="1" stop-color="#6749bd"/></linearGradient></defs><path d="M16 2.6A10 10 0 0 0 6 12.6c0 7.1 10 16.8 10 16.8s10-9.7 10-16.8A10 10 0 0 0 16 2.6Z" fill="url(#fpNaverPin)"/><path d="M11 9.2h3.2l3.6 5.4V9.2H21v11.5h-3.1l-3.7-5.4v5.4H11Z" fill="#fff"/></svg>';
  }

  actionsHTML = function(s){
    const a=[];
    if(s.naver)a.push([s.naver,'naver','네이버지도']);
    if(s.google)a.push([s.google,'pin','Google Maps']);
    if(s.instagram)a.push([s.instagram,'ig','Instagram']);
    if(s.phone)a.push([`tel:${s.phone}`,'phone','전화하기']);
    return a.length?`<div class="quick-actions">${a.map(([u,i,l])=>`<a class="quick-action" href="${u}" ${u.startsWith('http')?'target="_blank" rel="noopener"':''}><span class="qa-icon ${i==='naver'?'naver-map-icon':''}">${i==='naver'?naverMapIcon():icon(i)}</span><span>${l}</span></a>`).join('')}</div>`:'';
  };

  compHTML = function(s,rv){
    const tcg=[s.tcg.pokemon&&'포켓몬',s.tcg.onePiece&&'원피스',s.tcg.dragonBall&&'드래곤볼'].filter(Boolean).join(' · ');
    const bars=[['싱글카드',rv.single],['등급카드',rv.graded],['박스제품',rv.box],['오리파',rv.oripa]];
    return `<div class="comp-card"><h3 class="sub-title">상품 구성 상세</h3>${tcg?`<div class="tcg-line"><span class="tcg-label">취급 TCG</span><span class="tcg-value">${tcg}</span></div>`:''}<div class="bar-list">${bars.map(([l,v],idx)=>`<div class="bar-row"><div class="bar-label">${l}</div><div class="bar-track"><div class="bar-fill" style="--bar-width:${v/5*100}%;--bar-delay:${120+idx*90}ms"></div></div></div>`).join('')}</div></div>`;
  };

  heroGalleryHTML = function(s){
    const imgs=SHOP_GALLERIES[s.id]||[];
    if(!imgs.length)return `<div class="hero-placeholder">매장 이미지 준비 중</div><div class="hero-count">${icon('image')}<span>1 / 1</span></div>`;
    return `<div class="hero-gallery" data-gallery><div class="hero-track">${imgs.map((src,i)=>`<div class="hero-slide"><img src="${src}" alt="${esc(s.name)} 매장 사진 ${i+1}" ${i===0?'':'loading="lazy"'} decoding="async"></div>`).join('')}</div><div class="hero-count">${icon('image')}<span data-gallery-count>1 / ${imgs.length}</span></div></div>`;
  };

  bindHeroGallery = function(){
    const g=document.querySelector('[data-gallery]');
    if(!g)return;
    const track=g.querySelector('.hero-track'),slides=[...g.querySelectorAll('.hero-slide')],count=g.querySelector('[data-gallery-count]');
    if(slides.length<2)return;
    let index=0,startX=0,deltaX=0;
    const show=i=>{index=(i+slides.length)%slides.length;track.style.transform=`translateX(-${index*100}%)`;if(count)count.textContent=`${index+1} / ${slides.length}`};
    g.addEventListener('touchstart',e=>{startX=e.touches[0].clientX;deltaX=0},{passive:true});
    g.addEventListener('touchmove',e=>{deltaX=e.touches[0].clientX-startX},{passive:true});
    g.addEventListener('touchend',()=>{if(Math.abs(deltaX)>45)show(index+(deltaX<0?1:-1));startX=0;deltaX=0},{passive:true});
  };

  detailHTML = function(s){
    const rv=REVIEWS[s.id],tags=tagList(s).slice(0,8);
    return `<div class="hero"><div class="hero-top"><button class="icon-btn" id="hero-back" aria-label="뒤로가기">${icon('back')}</button><button class="icon-btn share-btn" aria-label="공유">${icon('share')}</button></div>${heroGalleryHTML(s)}</div><div class="detail-content"><section class="summary-card"><h1 class="d-name">${esc(s.name)}</h1><p class="d-en">${esc(s.en)}</p><p class="d-loc"><span class="loc-icon">${icon('pin')}</span>${esc(s.area)} · ${esc(s.station)} 도보 ${s.walkMin}분</p><div class="d-tags">${tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div>${actionsHTML(s)}</section>${infoHTML(s)}${rv?`<section class="section"><h2 class="section-title"><span class="accent-icon">${icon('chart')}</span>한눈에 보는 매장 분석</h2><p class="analysis-note">※ 깽퐌커플 방문 평점으로 단순 참고용으로 활용해주세요.</p><div class="analysis-card" data-analysis-card><div class="analysis-grid"><div class="radar-card">${radarSVG(rv)}</div>${compHTML(s,rv)}</div></div></section>`:''}${reviewHTML(s)}<div style="height:10px"></div></div>`;
  };

  function bindAnalysisMotion(){
    const card=document.querySelector('[data-analysis-card]');
    if(!card)return;
    if(!('IntersectionObserver' in window)){card.classList.add('is-visible');return;}
    const obs=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){card.classList.add('is-visible');obs.disconnect();}})},{threshold:.28});
    obs.observe(card);
  }

  const originalOpenDetail = openDetail;
  openDetail = function(id){
    const s=SHOPS.find(x=>x.id===id);if(!s)return;
    state.current=id;
    $('#home-view').hidden=true;$('#detail-view').hidden=false;
    $('#detail').innerHTML=detailHTML(s);$('#sticky-name').textContent=s.name;
    window.scrollTo(0,0);
    setTimeout(()=>{bindDetail();bindHeroGallery();loadReviewThumbs();bindAnalysisMotion()},0);
  };

  const m=location.hash.match(/^#\/shop\/(KR-SEO-\d{3})$/);
  if(m && !document.querySelector('#detail-view')?.hidden){openDetail(m[1]);}
})();
