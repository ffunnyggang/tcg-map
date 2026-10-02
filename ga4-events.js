/* FUNY PIN GA4 interaction events */
(function(){
  const context=()=>{const c=window.__FUNY_APP_CONTEXT||{};return{client_surface:c.surface||'web',app_platform:c.platform||'web',app_version:c.appVersion||'',app_build:c.buildVersion||'',login_state:c.loggedIn?'logged_in':'logged_out'}};const send=(name,params={})=>{try{if(typeof window.gtag==='function')window.gtag('event',name,{...context(),...params})}catch(e){}};
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim().slice(0,100);
  const fileName=src=>{try{return decodeURIComponent(new URL(src,location.href).pathname.split('/').pop()||'')}catch(e){return clean(src)}};
  const shop=()=>{const id=(window.state&&state.current)||location.hash.match(/^#\/shop\/([^/?#]+)/)?.[1]||'';const s=window.SHOPS&&SHOPS.find(x=>x.id===id);return{id, name:s?.name||document.querySelector('#detail-view .d-name')?.textContent||''}};
  const actionLabel=el=>clean(el.getAttribute('aria-label')||el.dataset.action||el.querySelector('span:last-child')?.textContent||el.textContent||el.getAttribute('href')||el.id||el.className);
  send('funy_page_view',{page_path:location.pathname});
  const bannerParams=(el,placement)=>{const img=el.querySelector('img'),all=[...el.parentElement.children].filter(x=>x.matches('a,article,.fp-carousel-slide,.home-hero-slide,.review-banner-slide'));return{banner_placement:placement,banner_id:fileName(img?.getAttribute('src')||''),banner_name:clean(img?.alt||''),banner_position:Math.max(1,all.indexOf(el)+1),link_url:clean(el.getAttribute('href')||el.querySelector('a')?.getAttribute('href')||'')}};

  document.addEventListener('click',e=>{
    const target=e.target instanceof Element?e.target:null;if(!target)return;
    const hero=target.closest('.home-hero-slide');if(hero){send('hero_banner_click',bannerParams(hero,'home_hero'));return}
    const homeBanner=target.closest('.fp-home-carousel a,.fp-carousel-slide a');if(homeBanner){const slide=homeBanner.closest('.fp-carousel-slide')||homeBanner;send('home_banner_click',bannerParams(slide,'home_middle'));return}
    const card=target.closest('#shop-list .shop-card');if(card){const id=card.dataset.id||'',s=window.SHOPS&&SHOPS.find(x=>x.id===id);send('shop_list_click',{shop_id:id,shop_name:clean(s?.name||card.querySelector('.shop-name')?.textContent||'')});return}
    const filter=target.closest('#filters button');if(filter&&!filter.closest('[data-country-filter]')){send('map_filter_click',{filter_name:clean(filter.dataset.filter||filter.dataset.key||filter.textContent)});return}
    const infoTab=target.closest('.info-tab');if(infoTab){send('info_tab_click',{tab_name:clean(infoTab.dataset.tab||infoTab.textContent)});return}
    const infoBanner=target.closest('.review-banner-slide a');if(infoBanner){const slide=infoBanner.closest('.review-banner-slide');send('info_banner_click',bannerParams(slide,'info_top'));return}
    const talkTab=target.closest('.filters .filter');if(talkTab){send('talk_tab_click',{tab_name:clean(talkTab.dataset.cat||talkTab.textContent)});return}
    const write=target.closest('#pokamoFab');if(write){send('pokamo_write_click',{link_url:clean(write.getAttribute('href'))});return}
    const detailEl=target.closest('#detail-view a,#detail-view button');if(detailEl){
      const s=shop(),href=detailEl.getAttribute('href')||'';let action=actionLabel(detailEl);
      if(detailEl.matches('.share-btn'))action='공유';else if(detailEl.id==='hero-back'||detailEl.id==='sticky-back')action='뒤로가기';else if(detailEl.matches('.quick-action'))action=clean(detailEl.textContent);else if(detailEl.matches('[data-review-card]'))action='리뷰_'+clean(detailEl.dataset.platform);else if(detailEl.matches('.google-place-more'))action='Google Maps 전체보기';else if(detailEl.matches('.other-shops-fab'))action='다른 카드샵 더 찾아보기';
      send('shop_detail_click',{shop_id:s.id,shop_name:clean(s.name),action_name:action,link_url:clean(href)});
    }
  },true);

  document.addEventListener('change',e=>{const t=e.target;if(!(t instanceof Element))return;if(t.matches('.country-filter-select'))send('country_change',{country:t.value==='JP'?'JP':'KR'});if(t.matches('#list-sort-select'))send('shop_sort_click',{sort_type:clean(t.value)});},true);
  const input=document.getElementById('map-shop-search');if(input){let timer=null,last='';const record=()=>{const term=clean(input.value);if(!term||term===last)return;last=term;send('map_search',{search_term:term})};input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(record,900)});input.addEventListener('keydown',e=>{if(e.key==='Enter'){clearTimeout(timer);record()}});input.addEventListener('search',()=>{clearTimeout(timer);record()});}
})();

/* FUNY MON saved-image layout: only winning rewards are included. */
(function(){
  if(window.__funyMonSaveLayoutV2)return;window.__funyMonSaveLayoutV2=true;let lastReward=null;const nativeFetch=window.fetch.bind(window);
  window.fetch=async function(input,init){const res=await nativeFetch(input,init);try{const url=typeof input==='string'?input:(input&&input.url)||'';if(url.includes('/functions/v1/funy-mon-catch')){res.clone().json().then(data=>{if(data&&data.ok)lastReward=data.reward||null}).catch(()=>{})}}catch(_){}return res;};
  const nativeToBlob=HTMLCanvasElement.prototype.toBlob;
  HTMLCanvasElement.prototype.toBlob=function(callback,type,quality){const source=this;const modal=document.getElementById('funyMonModal');if(source.width!==1080||source.height!==1350||!modal||modal.hidden)return nativeToBlob.call(source,callback,type,quality);try{const reward=lastReward;const rewardType=reward?(reward.reward_type||(reward.is_win===true?'win':'lose')):'none';const isWin=rewardType==='win';const out=document.createElement('canvas');out.width=1080;out.height=isWin?1350:960;const ctx=out.getContext('2d');ctx.drawImage(source,0,0,1080,Math.min(source.height,out.height),0,0,1080,Math.min(source.height,out.height));if(isWin){ctx.fillStyle='#ffffff';ctx.shadowColor='rgba(77,55,110,.12)';ctx.shadowBlur=22;ctx.beginPath();ctx.roundRect(105,850,870,330,28);ctx.fill();ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.textAlign='center';ctx.fillStyle='#8062d8';ctx.font='900 28px "Pretendard Variable",Pretendard,sans-serif';ctx.fillText(String(reward.result_label||'당첨!'),540,910);ctx.fillStyle='#2d2832';ctx.font='900 42px "Pretendard Variable",Pretendard,sans-serif';ctx.fillText(String(reward.title||'당첨 상품'),540,970);if(reward.description){ctx.fillStyle='#746d78';ctx.font='700 24px "Pretendard Variable",Pretendard,sans-serif';const text=String(reward.description),max=760;let line='',lines=[];for(const ch of text){const test=line+ch;if(ctx.measureText(test).width>max&&line){lines.push(line);line=ch}else line=test}if(line)lines.push(line);lines.slice(0,2).forEach((v,i)=>ctx.fillText(v,540,1020+i*34))}if(reward.claim_code){ctx.fillStyle='#f4f0fb';ctx.beginPath();ctx.roundRect(285,1090,510,64,14);ctx.fill();ctx.fillStyle='#5f49a7';ctx.font='850 25px ui-monospace,monospace';ctx.fillText('당첨 코드  '+String(reward.claim_code),540,1132)}}else{ctx.fillStyle='#faf8ff';ctx.fillRect(0,850,1080,110);ctx.textAlign='center';ctx.fillStyle='#9a92a0';ctx.font='700 22px ui-monospace,monospace';ctx.fillText('funypin.kr',540,915)}return nativeToBlob.call(out,callback,type,quality)}catch(_){return nativeToBlob.call(source,callback,type,quality)}};
})();

/* 2026-10-02 release bootstrap: shared nav, runtime bridge, FUNY TALK, PICK in-app links. */
(function(){
  try{
    if(!document.querySelector('link[data-funy-nav-release]')){const nav=document.createElement('link');nav.rel='stylesheet';nav.href='nav-v4.css?v=20261002-1805';nav.dataset.funyNavRelease='1';document.head.appendChild(nav);}
    if(!document.querySelector('script[data-funy-runtime-fixes]')){const runtime=document.createElement('script');runtime.src='app-runtime-fixes-v2.js?v=20261002-1806';runtime.async=false;runtime.dataset.funyRuntimeFixes='1';document.body.appendChild(runtime);}
    const path=String(location.pathname||'').toLowerCase();
    if(/\/talk\.html$/.test(path)&&!document.querySelector('script[data-funy-talk-community]')){
      const community=document.createElement('script');community.src='talk-community-v1.js?v=20261002-1805';community.async=false;community.dataset.funyTalkCommunity='1';community.onload=()=>{if(document.querySelector('script[data-funy-talk-safety]'))return;const safety=document.createElement('script');safety.src='talk-safety-v1.js?v=20261002-1805';safety.async=false;safety.dataset.funyTalkSafety='1';document.body.appendChild(safety)};document.body.appendChild(community);
    }
    if(/\/reviews\.html$/.test(path)){const decorate=()=>document.querySelectorAll('a.review-schedule-card[href]').forEach(a=>{const href=a.getAttribute('href')||'';if(!href||href==='#'||href.startsWith('javascript:'))return;a.setAttribute('data-funy-link-mode','inapp');a.setAttribute('data-funy-inapp-presentation','bottom_sheet');a.removeAttribute('target')});decorate();const root=document.querySelector('.review-schedule-list')||document.body;new MutationObserver(decorate).observe(root,{childList:true,subtree:true});}
  }catch(_){}
})();