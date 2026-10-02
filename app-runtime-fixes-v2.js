/* FUNY PIN native-app runtime fixes: overlays, links, location, favorites, TALK FAB */
(function(){
  'use strict';
  if(window.__FUNY_APP_RUNTIME_FIXES_V2)return;
  window.__FUNY_APP_RUNTIME_FIXES_V2=true;
  const params=new URLSearchParams(location.search);
  const appShell=params.get('app')==='1'||document.documentElement.classList.contains('app-shell');
  const SB='https://wdttzpbmqavaqfcbaywj.supabase.co',KEY='sb_publishable__wrSzngSE-JbGnyE7PZX9w_2QaW8bpq';
  const post=data=>{try{window.ReactNativeWebView?.postMessage(JSON.stringify(data))}catch(_){}};
  const visible=el=>{if(!el||!el.isConnected)return false;const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity||1)>0&&r.width>0&&r.height>0&&!el.hidden};
  const token=()=>String(window.__FUNY_ACCESS_TOKEN||'');
  const uid=()=>{try{const raw=token().split('.')[1];if(!raw)return'';const n=raw.replace(/-/g,'+').replace(/_/g,'/');return JSON.parse(decodeURIComponent(Array.from(atob(n.padEnd(Math.ceil(n.length/4)*4,'='))).map(c=>'%'+c.charCodeAt(0).toString(16).padStart(2,'0')).join(''))).sub||''}catch(_){return''}};

  /* In the native app, never let WKWebView own location permission. Route every
     geolocation request through Expo Location so iOS shows one permission flow only. */
  if(appShell&&navigator.geolocation&&!window.__FUNY_RUNTIME_GEO_BRIDGED){
    window.__FUNY_RUNTIME_GEO_BRIDGED=true;
    const pending=new Map();let geoSeq=0;
    const request=(once,success,error,options)=>{const id=++geoSeq;pending.set(id,{once,success,error});post({type:'REQUEST_NATIVE_LOCATION',watchId:id,options:options||{}});return id};
    navigator.geolocation.getCurrentPosition=(success,error,options)=>{request(true,success,error,options)};
    navigator.geolocation.watchPosition=(success,error,options)=>request(false,success,error,options);
    navigator.geolocation.clearWatch=id=>{pending.delete(Number(id));post({type:'STOP_NATIVE_LOCATION',watchId:Number(id)})};
    window.addEventListener('funy:nativelocation',ev=>{const d=ev.detail||{};const position={coords:{latitude:Number(d.latitude),longitude:Number(d.longitude),accuracy:Number(d.accuracy)||0,altitude:d.altitude==null?null:Number(d.altitude),altitudeAccuracy:d.altitudeAccuracy==null?null:Number(d.altitudeAccuracy),heading:d.heading==null?null:Number(d.heading),speed:d.speed==null?null:Number(d.speed)},timestamp:Number(d.timestamp)||Date.now()};pending.forEach((item,id)=>{try{item.success?.(position)}catch(_){}if(item.once)pending.delete(id)})});
    window.addEventListener('funy:nativelocationerror',ev=>{const d=ev.detail||{};const err={code:Number(d.code)||2,message:String(d.message||'현재 위치를 확인하지 못했습니다.')};pending.forEach((item,id)=>{try{item.error?.(err)}catch(_){}pending.delete(id)})});
  }

  const style=document.createElement('style');
  style.textContent=`
    html.app-shell.funy-web-overlay-open::before{content:"";position:fixed;inset:0;z-index:2147482000;background:rgba(22,18,28,.42);pointer-events:none}
    html.app-shell .talk-community-modal,html.app-shell #funyMonModal,html.app-shell .map-location-avatar-sheet,html.app-shell .sheetbg.open,html.app-shell .shop-filter-bg.open,html.app-shell .flag-sheet.open,html.app-shell .lightbox.open{z-index:2147483000!important}
    html.app-shell .talk-community-modal{inset:0!important;background:rgba(22,18,28,.42)!important}
    html.app-shell .talk-community-sheet{margin-bottom:0!important;max-height:92dvh!important}
    html.app-shell #funyMonModal .funy-mon-sheet,html.app-shell .funy-mon-outcome-box,html.app-shell .map-location-avatar-card{margin-bottom:0!important}
    html.app-shell .funy-google-marker{pointer-events:auto!important;touch-action:manipulation!important;cursor:pointer!important;border:0!important;background:transparent!important;padding:0!important}
    html.app-shell .funy-google-marker svg{pointer-events:none!important}
    html.app-shell.funy-talk-scrolling .pokamo-fab{width:46px!important;min-width:46px!important;max-width:46px!important;padding:0!important;border-radius:23px!important;font-size:0!important;overflow:hidden!important;transition:width .3s cubic-bezier(.22,1,.36,1),padding .3s cubic-bezier(.22,1,.36,1),border-radius .3s ease!important}
    html.app-shell .pokamo-fab{bottom:calc(max(env(safe-area-inset-bottom,0px),12px) + 64px)!important;right:16px!important}html.app-shell.funy-talk-scrolling .pokamo-fab::before{display:none!important;content:none!important}
    #detail-view .funy-app-favorite{position:absolute;right:16px;top:17px;transform:none;width:36px;height:36px;border:1px solid #e5dfeb;border-radius:18px;background:#fff;color:#8d8492;font-size:22px;line-height:34px;text-align:center;padding:0;z-index:3;box-shadow:0 3px 10px rgba(45,36,55,.06)}
    #detail-view .funy-app-favorite.is-on{color:#7454c7;background:#f2edfb;border-color:#d9cef0}
    #detail-view .d-name{padding-right:58px!important}
    .home-links-block[data-funy-hardcoded-bottom]{display:none!important}
  `;
  document.head.appendChild(style);

  function isOverlayOpen(){
    const selectors=['.talk-community-modal','#funyMonModal','.map-location-avatar-sheet','.sheetbg.open','.shop-filter-bg.open','.flag-sheet.open','.lightbox.open','[data-funy-bottom-sheet].is-open','[role="dialog"].is-open'];
    return selectors.some(sel=>[...document.querySelectorAll(sel)].some(visible));
  }
  let lastOverlay=null,overlayTimer=0;
  function reportOverlay(){clearTimeout(overlayTimer);overlayTimer=setTimeout(()=>{const open=isOverlayOpen();document.documentElement.classList.toggle('funy-web-overlay-open',open);if(lastOverlay===open)return;lastOverlay=open;if(appShell)post({type:'FUNY_WEB_OVERLAY_STATE',open});},20)}
  const observer=new MutationObserver(reportOverlay);
  const startObserver=()=>{observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','style','aria-hidden']});reportOverlay()};
  if(document.body)startObserver();else document.addEventListener('DOMContentLoaded',startObserver,{once:true});

  function decorateLinks(root=document){
    if(!appShell)return;
    root.querySelectorAll?.('a.review-schedule-card[href],#detail-view a[data-review-card][href],#detail-view .related-content a[href],#detail-view .detail-related a[href],#detail-view a.content-card[href],#detail-view a.instagram-feed-item[href]').forEach(a=>{a.dataset.funyLinkMode='inapp';a.dataset.funyInappPresentation='bottom_sheet';a.removeAttribute('target')});
    root.querySelectorAll?.('#detail-view a.instagram-feed-more[href]').forEach(a=>{a.dataset.funyLinkMode='external';delete a.dataset.funyInappPresentation});
  }

  function showFavoriteToast(message){let el=document.getElementById('funy-favorite-toast');if(!el){el=document.createElement('div');el.id='funy-favorite-toast';el.style.cssText='position:fixed;left:50%;bottom:110px;transform:translateX(-50%) translateY(8px);z-index:2147483500;padding:10px 14px;border-radius:999px;background:rgba(28,25,32,.92);color:#fff;font:750 11px/1.2 Pretendard,sans-serif;opacity:0;transition:opacity .18s ease,transform .18s ease;pointer-events:none;white-space:nowrap';document.body.appendChild(el)}el.textContent=message;requestAnimationFrame(()=>{el.style.opacity='1';el.style.transform='translateX(-50%) translateY(0)'});clearTimeout(window.__FUNY_FAVORITE_TOAST_TIMER);window.__FUNY_FAVORITE_TOAST_TIMER=setTimeout(()=>{el.style.opacity='0';el.style.transform='translateX(-50%) translateY(8px)'},1500)}

  async function ensureFavorite(){
    if(!appShell)return;
    const detail=document.getElementById('detail-view'),name=detail?.querySelector('.d-name');
    if(!detail||!name)return;
    const shopId=(location.hash.match(/^#\/shop\/([^/?#]+)/)||[])[1]||'';
    if(!shopId)return;
    const host=name.parentElement;if(!host)return;
    host.style.position='relative';
    let btn=host.querySelector('.funy-app-favorite');
    if(!btn){btn=document.createElement('button');btn.type='button';btn.className='funy-app-favorite';btn.setAttribute('aria-label','관심 매장 등록');btn.textContent='♡';host.appendChild(btn)}
    const user=uid();
    const draw=on=>{btn.classList.toggle('is-on',on);btn.textContent=on?'♥':'♡';btn.setAttribute('aria-label',on?'관심 매장 해제':'관심 매장 등록');btn.dataset.on=on?'1':'0'};
    if(!user){draw(false);btn.onclick=e=>{e.preventDefault();e.stopPropagation();post({type:'OPEN_NATIVE',route:'/account'})};return;}
    const headers={apikey:KEY,Authorization:'Bearer '+token(),'Content-Type':'application/json'};
    try{const r=await fetch(`${SB}/rest/v1/shop_favorites?select=shop_id&user_id=eq.${encodeURIComponent(user)}&shop_id=eq.${encodeURIComponent(shopId)}&limit=1`,{headers});draw(r.ok&&(await r.json()).length>0)}catch(_){draw(false)}
    btn.onclick=async e=>{
      e.preventDefault();e.stopPropagation();if(btn.disabled)return;btn.disabled=true;
      try{
        const on=btn.dataset.on==='1';
        if(on){
          const r=await fetch(`${SB}/rest/v1/shop_favorites?user_id=eq.${encodeURIComponent(user)}&shop_id=eq.${encodeURIComponent(shopId)}`,{method:'DELETE',headers:{...headers,Prefer:'return=minimal'}});
          if(!r.ok)throw Error();
          draw(false);showFavoriteToast('관심 매장에서 해제했어요');
          try{(window.FUNY_TRACK||((n,p)=>window.gtag?.('event',n,p)))('favorite_toggle',{shop_id:shopId,favorite_state:'off'})}catch(_){}
        }else{
          const r=await fetch(`${SB}/rest/v1/shop_favorites`,{method:'POST',headers:{...headers,Prefer:'return=minimal'},body:JSON.stringify({user_id:user,shop_id:shopId})});
          if(!r.ok&&r.status!==409)throw Error();
          draw(true);showFavoriteToast('관심 매장에 등록했어요');
          try{(window.FUNY_TRACK||((n,p)=>window.gtag?.('event',n,p)))('favorite_toggle',{shop_id:shopId,favorite_state:'on'})}catch(_){}
        }
      }catch(_){
        alert('관심 매장 저장에 실패했습니다. 잠시 후 다시 시도해주세요.');
      }finally{btn.disabled=false}
    };
  }

  function returnToMapFromDetail(){
    const currentCountry=window.FUNY_MAP_COUNTRY?.get?.()||'KR';
    try{if(typeof closeDetail==='function')closeDetail();else{document.getElementById('detail-view')?.setAttribute('hidden','');document.getElementById('home-view')?.removeAttribute('hidden')}}catch(_){}
    try{if(location.hash)history.replaceState(null,'',location.pathname+location.search)}catch(_){location.hash=''}
    setTimeout(()=>{
      try{
        if(currentCountry==='JP'){
          document.body.classList.add('country-japan');
          const gm=window.FUNY_GOOGLE_MAP_API?.getMap?.();
          if(gm&&window.google?.maps){google.maps.event.trigger(gm,'resize')}
        }
        window.dispatchEvent(new CustomEvent('funy:mapfitrequest',{detail:{country:currentCountry}}));
        window.dispatchEvent(new CustomEvent('funy:mapdatachange',{detail:{country:currentCountry}}));
      }catch(_){}
    },120);
  }

  function normalizeLabel(value){return String(value||'').replace(/\s+/g,' ').trim()}
  function findNearbySortAction(target){
    const menu=target.closest('.popular-sort');
    if(!menu)return null;
    let node=target;
    while(node&&node!==menu){
      const label=normalizeLabel(node.getAttribute?.('aria-label')||node.getAttribute?.('data-label')||node.textContent);
      const value=String(node.getAttribute?.('data-sort')||node.getAttribute?.('data-value')||node.getAttribute?.('value')||'').trim().toLowerCase();
      if(/^가까운\s*순$/.test(label)||/^(nearby|distance)$/.test(value))return node;
      node=node.parentElement;
    }
    return null;
  }

  decorateLinks();ensureFavorite();
  new MutationObserver(m=>{m.forEach(x=>x.addedNodes.forEach(n=>{if(n.nodeType===1)decorateLinks(n)}));ensureFavorite();reportOverlay()}).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('hashchange',()=>setTimeout(ensureFavorite,20));

  document.addEventListener('click',e=>{
    const target=e.target instanceof Element?e.target:null;if(!target)return;
    const detailTarget=target.closest('#detail-view a,#detail-view button');
    if(detailTarget){
      const label=(detailTarget.getAttribute('aria-label')||detailTarget.textContent||'').replace(/\s+/g,' ').trim();
      if(appShell&&detailTarget.matches('#hero-back,#sticky-back')){e.preventDefault();e.stopPropagation();if(typeof e.stopImmediatePropagation==='function')e.stopImmediatePropagation();if(params.get('from')==='favorites'){post({type:'NATIVE_BACK'});return;}returnToMapFromDetail();return;}
      if(/TCG\s*MAP|다른 카드샵/.test(label)){e.preventDefault();e.stopPropagation();if(typeof e.stopImmediatePropagation==='function')e.stopImmediatePropagation();if(appShell){if(params.has('from')){params.delete('from');try{const u=new URL(location.href);u.searchParams.delete('from');history.replaceState(null,'',u.pathname+(u.searchParams.toString()?'?'+u.searchParams.toString():'')+u.hash)}catch(_){}}returnToMapFromDetail()}else location.href='shops.html';return;}
      if(detailTarget.matches('a[data-review-card],.related-content a,.detail-related a,a.content-card')){const href=detailTarget.href||detailTarget.getAttribute('href');if(href&&appShell){e.preventDefault();e.stopPropagation();const external=detailTarget.dataset.funyLinkMode==='external';post({type:external?'OPEN_EXTERNAL':'OPEN_INAPP_SHEET',url:href});return;}}
    }
    const action=appShell?findNearbySortAction(target):null;
    if(appShell&&action&&navigator.geolocation&&!window.FUNY_CURRENT_LOCATION){
      if(action.dataset.funyLocationRetry==='ready'){delete action.dataset.funyLocationRetry;return;}
      e.preventDefault();e.stopPropagation();if(typeof e.stopImmediatePropagation==='function')e.stopImmediatePropagation();
      if(action.dataset.funyLocationRetry==='loading')return;
      action.dataset.funyLocationRetry='loading';
      try{navigator.geolocation.getCurrentPosition(pos=>{const c=pos.coords||{};window.FUNY_CURRENT_LOCATION={lat:Number(c.latitude),lng:Number(c.longitude),accuracy:Number(c.accuracy)||0,heading:Number.isFinite(c.heading)?c.heading:null,ts:Date.now()};window.dispatchEvent(new CustomEvent('funy:locationchange',{detail:window.FUNY_CURRENT_LOCATION}));action.dataset.funyLocationRetry='ready';setTimeout(()=>{try{if(typeof action.click==='function')action.click();else action.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}))}catch(_){delete action.dataset.funyLocationRetry}},0)},()=>{delete action.dataset.funyLocationRetry},{enableHighAccuracy:true,timeout:12000,maximumAge:1000})}catch(_){delete action.dataset.funyLocationRetry}
      return;
    }
  },true);

  if(/\/talk\.html$/.test(location.pathname)){let scrollTimer=0;window.addEventListener('scroll',()=>{document.documentElement.classList.add('funy-talk-scrolling');clearTimeout(scrollTimer);scrollTimer=setTimeout(()=>document.documentElement.classList.remove('funy-talk-scrolling'),650)},{passive:true});}
  if(location.pathname==='/'||/\/index\.html$/.test(location.pathname)){const removeBottom=()=>{document.querySelectorAll('.fp-home-carousel,.home-banner').forEach(x=>x.remove());const block=document.querySelector('.home-links-block');if(block){block.dataset.funyHardcodedBottom='1';block.remove()}};removeBottom();document.addEventListener('DOMContentLoaded',removeBottom,{once:true});setTimeout(removeBottom,400);}
  window.addEventListener('pagehide',()=>{if(appShell)post({type:'FUNY_WEB_OVERLAY_STATE',open:false})});
})();
