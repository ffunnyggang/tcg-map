/* FUNY PIN detail interaction/render overrides */
(function(){
  let otherShopsScrollHandler=null,otherShopsScrollTimer=null;

  function naverMapIcon(){
    return '<svg viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="fpNaverPin" x1="8" y1="4" x2="24" y2="27" gradientUnits="userSpaceOnUse"><stop stop-color="#9b82e6"/><stop offset=".55" stop-color="#8062d8"/><stop offset="1" stop-color="#6749bd"/></linearGradient></defs><path d="M16 2.6A10 10 0 0 0 6 12.6c0 7.1 10 16.8 10 16.8s10-9.7 10-16.8A10 10 0 0 0 16 2.6Z" fill="url(#fpNaverPin)"/><path d="M11 9.2h3.2l3.6 5.4V9.2H21v11.5h-3.1l-3.7-5.4v5.4H11Z" fill="#fff"/></svg>';
  }

  function shareIcon(){
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3"/><path d="M8.5 6.5 12 3l3.5 3.5"/><path d="M6 10H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1"/></svg>';
  }

  function visitDateHTML(s){
    if(!s.verified)return'';
    const m=String(s.verified).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const date=m?`${m[1]}. ${m[2]}. ${m[3]}`:String(s.verified);
    return `<div class="analysis-visit-date"><span class="analysis-visit-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5.5" width="17" height="15" rx="2.5"/><path d="M7.5 3.5v4M16.5 3.5v4M3.5 9.5h17"/><path d="m8.5 15 2 2 4.5-4.5"/></svg></span><span>매장 방문일 ${esc(date)}</span></div>`;
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

  const REVIEW_META_TTL=1000*60*60*24*7;
  function reviewMetaKey(url){return 'funy-review-meta-v2:'+url;}
  function getCachedReviewMeta(url){
    try{
      const v=JSON.parse(localStorage.getItem(reviewMetaKey(url))||'null');
      if(v&&Date.now()-v.ts<REVIEW_META_TTL)return v;
    }catch(e){}
    return null;
  }
  function setCachedReviewMeta(url,data){
    try{localStorage.setItem(reviewMetaKey(url),JSON.stringify({...data,ts:Date.now()}));}catch(e){}
  }
  function cleanMetaTitle(value,platform){
    const t=String(value||'').replace(/\s+/g,' ').trim();
    if(!t)return '';
    if(platform==='Instagram'&&/^(instagram|instagram reel|reel)$/i.test(t))return '';
    return t;
  }
  function metaTarget(url){
    return /^https:\/\/blog\.naver\.com\//.test(url)?url.replace('https://blog.naver.com/','https://m.blog.naver.com/'):url;
  }
  async function fetchReviewMeta(url,platform){
    const cached=getCachedReviewMeta(url);
    if(cached)return cached;
    const api='https://api.microlink.io/?meta=true&url='+encodeURIComponent(metaTarget(url));
    const r=await fetch(api,{mode:'cors'});
    if(!r.ok)throw new Error('metadata');
    const j=await r.json(),d=j&&j.data||{};
    const image=d.image&&(d.image.url||d.image)||'';
    let title=cleanMetaTitle(d.title,platform);
    if(!title&&platform==='Instagram')title=cleanMetaTitle(d.description,platform);
    const out={image,title};
    setCachedReviewMeta(url,out);
    return out;
  }

  reviewHTML = function(s){
    const cs=CONTENTS.filter(c=>c.shop===s.id);if(!cs.length)return'';
    const picks=[],reel=cs.find(c=>c.type==='Reel'),blog=cs.find(c=>c.type==='Blog');
    if(reel)picks.push(reel);if(blog)picks.push(blog);
    return `<section class="section"><h2 class="section-title"><span class="accent-icon">${icon('review')}</span>깽퐌커플 리뷰</h2><div class="review-grid">${picks.map(c=>`<a class="content-card" href="${c.url}" target="_blank" rel="noopener" data-review-card data-review-url="${esc(c.url)}" data-platform="${esc(c.platform)}"><div class="content-thumb loading" data-review-thumb>${esc(c.platform)}</div><div class="content-body"><p class="content-title" data-review-title>${esc(c.title)}</p><div class="content-platform"><span class="platform-icon">${icon(c.platform==='Instagram'?'ig':'globe')}</span>${esc(c.platform)}</div></div></a>`).join('')}</div></section>`;
  };

  loadReviewThumbs = function(){
    document.querySelectorAll('[data-review-card]').forEach(async card=>{
      const url=card.dataset.reviewUrl,platform=card.dataset.platform,thumb=card.querySelector('[data-review-thumb]'),titleEl=card.querySelector('[data-review-title]');
      if(!url)return;
      try{
        const meta=await fetchReviewMeta(url,platform);
        if(meta.image&&thumb){thumb.innerHTML=`<img src="${esc(meta.image)}" alt="${esc(meta.title||titleEl?.textContent||'리뷰')} 썸네일" loading="lazy" referrerpolicy="no-referrer">`;thumb.classList.remove('loading');}
        else if(thumb){thumb.classList.remove('loading');thumb.textContent=platform||'Review';}
        if(meta.title&&titleEl)titleEl.textContent=meta.title;
      }catch(e){
        if(thumb){thumb.classList.remove('loading');thumb.textContent=platform||'Review';}
      }
    });
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

  function otherShopsFabHTML(){
    return `<div class="other-shops-fab-wrap" data-other-shops-fab><button class="other-shops-fab" type="button" aria-label="다른 카드샵 더 찾아보기"><span class="other-shops-fab-icon">${icon('pin')}</span><span>다른 카드샵 더 찾아보기</span></button></div>`;
  }

  detailHTML = function(s){
    const rv=REVIEWS[s.id],tags=tagList(s).slice(0,8);
    return `<div class="hero"><div class="hero-top"><button class="icon-btn" id="hero-back" aria-label="뒤로가기">${icon('back')}</button><button class="icon-btn share-btn" aria-label="공유">${shareIcon()}</button></div>${heroGalleryHTML(s)}</div><div class="detail-content"><section class="summary-card"><h1 class="d-name">${esc(s.name)}</h1><p class="d-en">${esc(s.en)}</p><p class="d-loc"><span class="loc-icon">${icon('pin')}</span>${esc(s.area)} · ${esc(s.station)} 도보 ${s.walkMin}분</p><div class="d-tags">${tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div>${actionsHTML(s)}</section>${infoHTML(s)}${rv?`<section class="section"><h2 class="section-title"><span class="accent-icon">${icon('chart')}</span>한눈에 보는 매장 분석</h2><p class="analysis-note">※ 깽퐌커플 방문 평점 바탕으로 주관적인 분석으로 단순 참고용으로 활용해주세요.</p><div class="analysis-card" data-analysis-card><div class="analysis-grid"><div class="radar-card">${radarSVG(rv)}</div>${compHTML(s,rv)}</div>${visitDateHTML(s)}</div></section>`:''}${reviewHTML(s)}<div style="height:10px"></div></div>${otherShopsFabHTML()}`;
  };

  function bindAnalysisMotion(){
    const card=document.querySelector('[data-analysis-card]');
    if(!card)return;
    if(!('IntersectionObserver' in window)){card.classList.add('is-visible');return;}
    const obs=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){card.classList.add('is-visible');obs.disconnect();}})},{threshold:.28});
    obs.observe(card);
  }

  function bindOtherShopsFab(){
    const wrap=document.querySelector('[data-other-shops-fab]');
    if(!wrap)return;
    const btn=wrap.querySelector('.other-shops-fab');
    if(btn)btn.addEventListener('click',()=>{document.querySelector('#hero-back')?.click();});
    if(otherShopsScrollHandler)window.removeEventListener('scroll',otherShopsScrollHandler);
    otherShopsScrollHandler=()=>{
      if(document.querySelector('#detail-view')?.hidden)return;
      wrap.classList.add('is-hidden');
      clearTimeout(otherShopsScrollTimer);
      otherShopsScrollTimer=setTimeout(()=>{
        if(!document.querySelector('#detail-view')?.hidden)wrap.classList.remove('is-hidden');
      },220);
    };
    window.addEventListener('scroll',otherShopsScrollHandler,{passive:true});
  }

  openDetail = function(id){
    const s=SHOPS.find(x=>x.id===id);if(!s)return;
    state.current=id;
    $('#home-view').hidden=true;$('#detail-view').hidden=false;
    $('#detail').innerHTML=detailHTML(s);$('#sticky-name').textContent=s.name;
    const stickyShare=document.querySelector('#detail-sticky .share-btn');if(stickyShare)stickyShare.innerHTML=shareIcon();
    window.scrollTo(0,0);
    setTimeout(()=>{bindDetail();bindHeroGallery();loadReviewThumbs();bindAnalysisMotion();bindOtherShopsFab()},0);
  };

  const m=location.hash.match(/^#\/shop\/(KR-SEO-\d{3})$/);
  if(m && !document.querySelector('#detail-view')?.hidden){openDetail(m[1]);}
})();
