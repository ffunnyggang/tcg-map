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
    html.app-shell .talk-community-modal,html.app-shell #funyMonModal,html.app-shell .map-location-avatar-card,html.app-shell .sheetbg.open,html.app-shell .flag-sheet.open,html.app-shell .lightbox.open{z-index:2147483000!important}
    html.app-shell .talk-community-modal{inset:0!important;background:rgba(22,18,28,.42)!important}
    html.app-shell .talk-community-sheet{margin-bottom:0!important;max-height:92dvh!important}
    html.app-shell #funyMonModal .funy-mon-sheet,html.app-shell .funy-mon-outcome-box,html.app-shell .map-location-avatar-card{margin-bottom:0!important}
    html.app-shell .funy-google-marker{pointer-events:auto!important;touch-action:manipulation!important;cursor:pointer!important;border:0!important;background:transparent!important;padding:0!important}
    html.app-shell .funy-google-marker svg{pointer-events:none!important}
    html.app-shell.funy-talk-scrolling .pokamo-fab{width:46px!important;min-width:46px!important;max-width:46px!important;padding:0!important;border-radius:23px!important;font-size:0!important;overflow:hidden!important;transition:width .3s cubic-bezier(.22,1,.36,1),padding .3s cubic-bezier(.22,1,.36,1),border-radius .3s ease!important}
    html.app-shell.funy-talk-scrolling .pokamo-fab::before{content:"＋";font-size:21px;font-weight:700;line-height:46px;color:#fff}
    #detail-view .funy-app-favorite{position:absolute;right:0;top:50%;transform:translateY(-50%);width:36px;height:36px;border:1px solid #e5dfeb;border-radius:18px;background:#fff;color:#8d8492;font-size:22px;line-height:34px;text-align:center;padding:0;z-index:3;box-shadow:0 3px 10px rgba(45,36,55,.06)}
    #detail-view .funy-app-favorite.is-on{color:#7454c7;background:#f2edfb;border-color:#d9cef0}
    #detail-view .d-name{padding-right:42px!important}
    .home-links-block[data-funy-hardcoded-bottom]{display:none!important}
  `;
  document.head.appendChild(style);

  function isOverlayOpen(){
    const selectors=['.talk-community-modal','#funyMonModal','.map-location-avatar-card','.sheetbg.open','.flag-sheet.open','.lightbox.open','[data-funy-bottom-sheet].is-open','[role="dialog"].is-open'];
    return selectors.some(sel=>[...document.querySelectorAll(sel)].some(visible));
  }
  let lastOverlay=null,overlayTimer=0;
  function reportOverlay(){clearTimeout(overlayTimer);overlayTimer=setTimeout(()=>{const open=isOverlayOpen();document.documentElement.classList.toggle('funy-web-overlay-open',open);if(lastOverlay===open)return;lastOverlay=open;if(appShell)post({type:'FUNY_WEB_OVERLAY_STATE',open});},20)}
  const observer=new MutationObserver(reportOverlay);
  const startObserver=()=>{observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','style','aria-hidden']});reportOverlay()};
  if(document.body)startObserver();else document.addEventListener('DOMContentLoaded',startObserver,{once:true});

  function decorateLinks(root=document){
    root.querySelectorAll?.('a.review-schedule-card[href]').forEach(a=>{a.dataset.funyLinkMode='inapp';a.dataset.funyInappPresentation='bottom_sheet';a.removeAttribute('target')});
    root.querySelectorAll?.('#detail-view a[data-review-card][href],#detail-view .related-content a[href],#detail-view .detail-related a[href]').forEach(a=>{a.dataset.funyLinkMode='inapp';a.dataset.funyInappPresentation='bottom_sheet';a.removeAttribute('target')});
  }

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
    btn.onclick=async e=>{e.preventDefault();e.stopPropagation();if(btn.disabled)return;btn.disabled=true;try{const on=btn.dataset.on==='1';if(on){const r=await fetch(`${SB}/rest/v1/shop_favorites?user_id=eq.${encodeURIComponent(user)}&shop_id=eq.${encodeURIComponent(shopId)}`,{method:'DELETE',headers:{...headers,Prefer:'return=minimal'}});if(!r.ok)throw Error();draw(false)}else{const r=await fetch(`${SB}/rest/v1/shop_favorites`,{method:'POST',headers:{...headers,Prefer:'return=minimal'},body:JSON.stringify({user_id:user,shop_id:shopId})});if(!r.ok&&r.status!==409)throw Error();draw(true)}}catch(_){alert('관심 매장 저장에 실패했습니다. 잠시 후 다시 시도해주세요.')}finally{btn.disabled=false}};
  }

  decorateLinks();ensureFavorite();
  new MutationObserver(m=>{m.forEach(x=>x.addedNodes.forEach(n=>{if(n.nodeType===1)decorateLinks(n)}));ensureFavorite();reportOverlay()}).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('hashchange',()=>setTimeout(ensureFavorite,20));

  document.addEventListener('click',e=>{
    const target=e.target instanceof Element?e.target:null;if(!target)return;
    const detailTarget=target.closest('#detail-view a,#detail-view button');
    if(detailTarget){
      const label=(detailTarget.getAttribute('aria-label')||detailTarget.textContent||'').replace(/\s+/g,' ').trim();
      if(/TCG\s*MAP|다른 카드샵/.test(label)){e.preventDefault();e.stopPropagation();if(appShell)post({type:'OPEN_NATIVE',route:'/(tabs)/map'});else location.href='shops.html';return;}
      if(detailTarget.matches('a[data-review-card],.related-content a,.detail-related a')){const href=detailTarget.href||detailTarget.getAttribute('href');if(href&&appShell){e.preventDefault();e.stopPropagation();post({type:'OPEN_INAPP_SHEET',url:href});return;}}
    }
    const action=target.closest('button,a,select');
    const label=(action?.textContent||'').replace(/\s+/g,' ').trim();
    if(appShell&&/가까운 순/.test(label)&&navigator.geolocation&&!window.FUNY_CURRENT_LOCATION&&action){
      if(action.dataset.funyLocationRetry==='ready'){delete action.dataset.funyLocationRetry;return;}
      e.preventDefault();e.stopPropagation();if(typeof e.stopImmediatePropagation==='function')e.stopImmediatePropagation();
      if(action.dataset.funyLocationRetry==='loading')return;
      action.dataset.funyLocationRetry='loading';
      try{navigator.geolocation.getCurrentPosition(pos=>{const c=pos.coords||{};window.FUNY_CURRENT_LOCATION={lat:Number(c.latitude),lng:Number(c.longitude),accuracy:Number(c.accuracy)||0,heading:Number.isFinite(c.heading)?c.heading:null,ts:Date.now()};window.dispatchEvent(new CustomEvent('funy:locationchange',{detail:window.FUNY_CURRENT_LOCATION}));action.dataset.funyLocationRetry='ready';setTimeout(()=>action.click(),0)},()=>{delete action.dataset.funyLocationRetry},{enableHighAccuracy:true,timeout:12000,maximumAge:1000})}catch(_){delete action.dataset.funyLocationRetry}
      return;
    }
    if(appShell&&/내 위치/.test(label)&&navigator.geolocation){try{navigator.geolocation.getCurrentPosition(()=>{},()=>{},{enableHighAccuracy:true,timeout:12000,maximumAge:1000})}catch(_){}}
  },true);

  if(/\/talk\.html$/.test(location.pathname)){let scrollTimer=0;window.addEventListener('scroll',()=>{document.documentElement.classList.add('funy-talk-scrolling');clearTimeout(scrollTimer);scrollTimer=setTimeout(()=>document.documentElement.classList.remove('funy-talk-scrolling'),650)},{passive:true});}
  if(location.pathname==='/'||/\/index\.html$/.test(location.pathname)){const removeBottom=()=>{const block=document.querySelector('.home-links-block');if(block){block.dataset.funyHardcodedBottom='1';block.remove()}};removeBottom();document.addEventListener('DOMContentLoaded',removeBottom,{once:true});setTimeout(removeBottom,400);}
  window.addEventListener('pagehide',()=>{if(appShell)post({type:'FUNY_WEB_OVERLAY_STATE',open:false})});
})();
