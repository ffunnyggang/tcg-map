/* FUNY PIN Instagram feed — Master DB L-column eligibility + 3-column renderer */
(function(){
  const ELIGIBLE=new Set([
    'KR-SEO-001','KR-SEO-002','KR-SEO-003','KR-SEO-005','KR-SEO-006','KR-SEO-007','KR-SEO-008',
    'KR-SEO-009','KR-SEO-010','KR-SEO-011','KR-SEO-012','KR-SEO-014','KR-SEO-016'
  ]);
  const API=String(window.FUNY_INSTAGRAM_FEED_ENDPOINT||'').trim();
  const MOCK_SHOP_ID='KR-SEO-005';
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const username=url=>{try{const p=new URL(url).pathname.split('/').filter(Boolean);return p[0]||''}catch(e){return''}};
  function sectionHTML(shop,posts,isMock){
    if(!posts||!posts.length)return'';
    const handle=username(shop.instagram);
    return `<section class="instagram-feed-section${isMock?' is-mock':''}" data-instagram-feed><div class="instagram-feed-head"><div class="instagram-feed-title-wrap"><h2 class="instagram-feed-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.7" r="1" fill="currentColor" stroke="none"/></svg>Instagram</h2>${handle?`<p class="instagram-feed-handle">@${esc(handle)}${isMock?' · UI 미리보기':''}</p>`:''}</div><a class="instagram-feed-more" href="${esc(shop.instagram)}" target="_blank" rel="noopener">전체보기 →</a></div><div class="instagram-feed-grid">${posts.slice(0,3).map((p,i)=>p.placeholder?`<a class="instagram-feed-item instagram-feed-placeholder" href="${esc(shop.instagram)}" target="_blank" rel="noopener" aria-label="Instagram UI 미리보기 ${i+1}"><span>POST<br>${i+1}</span></a>`:`<a class="instagram-feed-item" href="${esc(p.permalink||shop.instagram)}" target="_blank" rel="noopener" aria-label="Instagram 게시물 보기"><img src="${esc(p.image||p.thumbnail_url||p.media_url)}" alt="${esc(shop.name)} Instagram 게시물" loading="lazy" decoding="async" referrerpolicy="no-referrer"></a>`).join('')}</div></section>`;
  }
  function mount(shop,posts,isMock){
    const detail=document.querySelector('#detail .detail-content');if(!detail||document.querySelector('[data-instagram-feed]'))return;
    const review=detail.querySelector('.review-grid')?.closest('.section');
    const temp=document.createElement('div');temp.innerHTML=sectionHTML(shop,posts,isMock);const section=temp.firstElementChild;
    if(section)review?detail.insertBefore(section,review):detail.appendChild(section);
  }
  async function load(shop){
    if(!shop||!ELIGIBLE.has(shop.id)||!shop.instagram)return;
    if(!API){
      if(shop.id===MOCK_SHOP_ID)mount(shop,[{placeholder:true},{placeholder:true},{placeholder:true}],true);
      return;
    }
    try{
      const u=username(shop.instagram);if(!u)return;
      const r=await fetch(API+(API.includes('?')?'&':'?')+'username='+encodeURIComponent(u),{headers:{Accept:'application/json'}});
      if(!r.ok)throw new Error('feed');
      const data=await r.json();const posts=Array.isArray(data)?data:(data.posts||data.data||[]);
      const valid=posts.filter(p=>p&&(p.image||p.thumbnail_url||p.media_url)).slice(0,3);
      if(valid.length)mount(shop,valid,false);
    }catch(e){/* Fail closed: no empty Instagram block. */}
  }
  function currentShop(){const m=location.hash.match(/^#\/shop\/([^/?#]+)$/);return m&&typeof SHOPS!=='undefined'?SHOPS.find(s=>s.id===m[1]):null}
  function refresh(){setTimeout(()=>load(currentShop()),0)}
  window.addEventListener('hashchange',refresh);
  const view=document.getElementById('detail-view');if(view)new MutationObserver(()=>{if(!view.hidden)refresh()}).observe(view,{attributes:true,attributeFilter:['hidden']});
  window.FUNY_INSTAGRAM_FEED={eligible:ELIGIBLE,refresh};
  refresh();
})();
