/* FUNY PIN Instagram feed — Master DB L-column eligibility + manual/API-ready feed */
(function(){
  const FEED='data/instagram-feed.json';
  const CONFIG='data/instagram-shops.json';
  const MOCK_SHOP_ID='KR-SEO-005';
  let feedPromise=null,configPromise=null;
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const username=url=>{try{const p=new URL(url).pathname.split('/').filter(Boolean);return p[0]||''}catch(e){return''}};
  const getJSON=url=>fetch(url+'?v='+Date.now(),{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('feed');return r.json()});
  function config(){return configPromise||(configPromise=getJSON(CONFIG).catch(()=>({shops:{}})))}
  function feed(){return feedPromise||(feedPromise=getJSON(FEED).catch(()=>({shops:{}})))}
  function isValidPost(p){
    if(!p)return false;
    const image=p.image||p.thumbnail_url||p.media_url||'';
    const link=p.permalink||'';
    if(!/^https?:\/\//i.test(image)||!/^https:\/\/(?:www\.)?instagram\.com\/(?:p|reel)\/[A-Za-z0-9_-]+\/?/i.test(link))return false;
    try{
      const host=new URL(image).hostname.toLowerCase();
      if(host==='mc.yandex.ru'||host.endsWith('.yandex.ru')||/logo|favicon|avatar|profile/i.test(image))return false;
    }catch(e){return false}
    return true;
  }
  function sectionHTML(shop,posts,isMock){
    if(!posts||!posts.length)return'';
    const handle=username(shop.instagram);
    return `<section class="instagram-feed-section${isMock?' is-mock':''}" data-instagram-feed><div class="instagram-feed-head"><div class="instagram-feed-title-wrap"><h2 class="instagram-feed-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.7" r="1" fill="currentColor" stroke="none"/></svg>Instagram</h2>${handle?`<p class="instagram-feed-handle">@${esc(handle)}${isMock?' · UI 미리보기':''}</p>`:''}</div><a class="instagram-feed-more" href="${esc(shop.instagram)}" target="_blank" rel="noopener">전체보기 →</a></div><div class="instagram-feed-grid">${posts.slice(0,4).map((p,i)=>p.placeholder?`<a class="instagram-feed-item instagram-feed-placeholder" href="${esc(shop.instagram)}" target="_blank" rel="noopener" aria-label="Instagram UI 미리보기 ${i+1}"><span>POST<br>${i+1}</span></a>`:`<a class="instagram-feed-item" href="${esc(p.permalink)}" target="_blank" rel="noopener" aria-label="Instagram 게시물 보기"><img src="${esc(p.image||p.thumbnail_url||p.media_url)}" alt="${esc(shop.name)} Instagram 게시물" loading="lazy" decoding="async" referrerpolicy="no-referrer"></a>`).join('')}</div></section>`;
  }
  function mount(shop,posts,isMock){
    const detail=document.querySelector('#detail .detail-content');if(!detail||document.querySelector('[data-instagram-feed]'))return;
    const review=detail.querySelector('.review-grid')?.closest('.section');
    const temp=document.createElement('div');temp.innerHTML=sectionHTML(shop,posts,isMock);const section=temp.firstElementChild;
    if(section)review?detail.insertBefore(section,review):detail.appendChild(section);
  }
  async function load(shop){
    if(!shop||!shop.instagram)return;
    const cfg=await config(),eligible=cfg.shops&&cfg.shops[shop.id];
    if(!eligible)return; // Master DB L열이 O인 매장만 노출
    const data=await feed(),posts=data.shops?.[shop.id]?.posts||[];
    const valid=posts.filter(isValidPost).slice(0,4);
    if(valid.length){mount(shop,valid,false);return}
    // Meta API 전 임시 단계: 검증된 게시물 URL이 없는 경우 카드가든 UI 샘플만 유지
    if(shop.id===MOCK_SHOP_ID)mount(shop,[{placeholder:true},{placeholder:true},{placeholder:true},{placeholder:true}],true);
  }
  function currentShop(){const m=location.hash.match(/^#\/shop\/([^/?#]+)$/);return m&&typeof SHOPS!=='undefined'?SHOPS.find(s=>s.id===m[1]):null}
  function refresh(){setTimeout(()=>load(currentShop()),0)}
  window.addEventListener('hashchange',refresh);
  const view=document.getElementById('detail-view');if(view)new MutationObserver(()=>{if(!view.hidden)refresh()}).observe(view,{attributes:true,attributeFilter:['hidden']});
  window.FUNY_INSTAGRAM_FEED={refresh};
  refresh();
})();
