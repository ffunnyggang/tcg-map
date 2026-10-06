/* FUNY PIN shared portal bootstrap + GA4 interaction events */
(function(){
  if(!document.querySelector('link[data-funy-nav-v4]')){const nav=document.createElement('link');nav.rel='stylesheet';nav.href='nav-v4.css?v=20261002-01';nav.dataset.funyNavV4='1';document.head.appendChild(nav);}

  const send=(name,params={})=>{try{if(typeof window.gtag==='function')window.gtag('event',name,params)}catch(e){}};
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim().slice(0,100);
  const fileName=src=>{try{return decodeURIComponent(new URL(src,location.href).pathname.split('/').pop()||'')}catch(e){return clean(src)}};
  const shop=()=>{const id=(window.state&&state.current)||location.hash.match(/^#\/shop\/([^/?#]+)/)?.[1]||'';const s=window.SHOPS&&SHOPS.find(x=>x.id===id);return{id,name:s?.name||document.querySelector('#detail-view .d-name')?.textContent||''}};
  const actionLabel=el=>clean(el.getAttribute('aria-label')||el.dataset.action||el.querySelector('span:last-child')?.textContent||el.textContent||el.getAttribute('href')||el.id||el.className);
  const bannerParams=(el,placement)=>{const img=el.querySelector('img'),all=[...el.parentElement.children].filter(x=>x.matches('a,article,.fp-carousel-slide,.home-hero-slide,.review-banner-slide'));return{banner_placement:placement,banner_id:fileName(img?.getAttribute('src')||''),banner_name:clean(img?.alt||''),banner_position:Math.max(1,all.indexOf(el)+1),link_url:clean(el.getAttribute('href')||el.querySelector('a')?.getAttribute('href')||'')}};

  document.addEventListener('click',e=>{
    const target=e.target instanceof Element?e.target:null;if(!target)return;
    const hero=target.closest('.home-hero-slide');if(hero){send('hero_banner_click',bannerParams(hero,'home_hero'));return}
    const homeBanner=target.closest('.fp-home-carousel a,.fp-carousel-slide a');if(homeBanner){const slide=homeBanner.closest('.fp-carousel-slide')||homeBanner;send('home_banner_click',bannerParams(slide,'home_middle'));return}
    const card=target.closest('#shop-list .shop-card');if(card){const id=card.dataset.id||'',s=window.SHOPS&&SHOPS.find(x=>x.id===id);send('shop_list_click',{shop_id:id,shop_name:clean(s?.name||card.querySelector('.shop-name')?.textContent||'')});return}
    const filter=target.closest('#filters button');if(filter&&!filter.closest('[data-country-filter]')){send('map_filter_click',{filter_name:clean(filter.dataset.filter||filter.dataset.key||filter.textContent)});return}
    const infoTab=target.closest('.info-tab');if(infoTab){send('info_tab_click',{tab_name:clean(infoTab.dataset.tab||infoTab.textContent)});return}
    const infoBanner=target.closest('.review-banner-slide a');if(infoBanner){const slide=infoBanner.closest('.review-banner-slide');send('info_banner_click',bannerParams(slide,'info_top'));return}
    const schedule=target.closest('.review-schedule-card');if(schedule){send('pick_schedule_click',{title:clean(schedule.querySelector('.review-schedule-name')?.textContent||''),link_url:clean(schedule.getAttribute('href')||'')});return}
    const talkTab=target.closest('.filters .filter');if(talkTab){send('talk_tab_click',{tab_name:clean(talkTab.dataset.cat||talkTab.textContent)});return}
    const write=target.closest('#pokamoFab');if(write){send('talk_write_click',{source:'funypin'});return}
    const detailEl=target.closest('#detail-view a,#detail-view button');if(detailEl){const s=shop(),href=detailEl.getAttribute('href')||'';let action=actionLabel(detailEl);if(detailEl.matches('.share-btn'))action='공유';else if(detailEl.id==='hero-back'||detailEl.id==='sticky-back')action='뒤로가기';else if(detailEl.matches('.quick-action'))action=clean(detailEl.textContent);else if(detailEl.matches('[data-review-card]'))action='리뷰_'+clean(detailEl.dataset.platform);else if(detailEl.matches('.google-place-more'))action='Google Maps 전체보기';else if(detailEl.matches('.other-shops-fab'))action='다른 카드샵 더 찾아보기';send('shop_detail_click',{shop_id:s.id,shop_name:clean(s.name),action_name:action,link_url:clean(href)});}
  },true);

  document.addEventListener('change',e=>{const t=e.target;if(!(t instanceof Element))return;if(t.matches('.country-filter-select'))send('country_change',{country:t.value==='JP'?'JP':'KR'});if(t.matches('#list-sort-select'))send('shop_sort_click',{sort_type:clean(t.value)});},true);

  const input=document.getElementById('map-shop-search');
  if(input){let timer=null,last='';const record=()=>{const term=clean(input.value);if(!term||term===last)return;last=term;send('map_search',{search_term:term})};input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(record,900)});input.addEventListener('keydown',e=>{if(e.key==='Enter'){clearTimeout(timer);record()}});input.addEventListener('search',()=>{clearTimeout(timer);record()});}

  if(/\/reviews\.html$/.test(location.pathname)){
    const decorate=()=>document.querySelectorAll('a.review-schedule-card[href]').forEach(a=>{const href=a.getAttribute('href')||'';if(!href||href==='#'||href.startsWith('javascript:'))return;a.setAttribute('data-funy-link-mode','inapp');a.setAttribute('data-funy-inapp-presentation','bottom_sheet');a.removeAttribute('target')});
    decorate();const root=document.querySelector('.review-schedule-list')||document.body;new MutationObserver(decorate).observe(root,{childList:true,subtree:true});
  }

  if(/\/talk\.html$/.test(location.pathname)&&!document.querySelector('script[data-funy-talk-community]')){
    const s=document.createElement('script');s.src='talk-community-v1.js?v=20261006-pokamo-external';s.async=false;s.dataset.funyTalkCommunity='1';
    s.onload=()=>{if(!document.querySelector('script[data-funy-talk-safety]')){const safe=document.createElement('script');safe.src='talk-safety-v1.js?v=20261002-01';safe.async=false;safe.dataset.funyTalkSafety='1';document.body.appendChild(safe)}};
    document.body.appendChild(s);
  }
})();