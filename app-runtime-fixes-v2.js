/* FUNY PIN native-app runtime fixes: overlays, links, location, TALK FAB */
(function(){
  'use strict';
  if(window.__FUNY_APP_RUNTIME_FIXES_V2)return;
  window.__FUNY_APP_RUNTIME_FIXES_V2=true;
  const params=new URLSearchParams(location.search);
  const appShell=params.get('app')==='1'||document.documentElement.classList.contains('app-shell');
  const post=data=>{try{window.ReactNativeWebView?.postMessage(JSON.stringify(data))}catch(_){}};
  const visible=el=>{if(!el||!el.isConnected)return false;const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity||1)>0&&r.width>0&&r.height>0&&!el.hidden};

  const style=document.createElement('style');
  style.textContent=`
    html.app-shell.funy-web-overlay-open::before{content:"";position:fixed;inset:0;z-index:2147482000;background:rgba(22,18,28,.42);pointer-events:none}
    html.app-shell .talk-community-modal,html.app-shell #funyMonModal,html.app-shell .map-location-avatar-card,html.app-shell .live-pin-modal,html.app-shell .live-pin-sheet-modal{z-index:2147483000!important}
    html.app-shell .talk-community-modal{inset:0!important;background:rgba(22,18,28,.42)!important}
    html.app-shell .talk-community-sheet{margin-bottom:0!important;max-height:92dvh!important}
    html.app-shell #funyMonModal .funy-mon-sheet,html.app-shell .funy-mon-outcome-box,html.app-shell .map-location-avatar-card{margin-bottom:0!important}
    html.app-shell .funy-google-marker{pointer-events:auto!important;touch-action:manipulation!important;cursor:pointer!important}
    html.app-shell .funy-google-marker svg{pointer-events:none!important}
    html.app-shell.funy-talk-scrolling .pokamo-fab{width:46px!important;min-width:46px!important;max-width:46px!important;padding:0!important;border-radius:23px!important;font-size:0!important;overflow:hidden!important;transition:width .3s cubic-bezier(.22,1,.36,1),padding .3s cubic-bezier(.22,1,.36,1),border-radius .3s ease!important}
    html.app-shell.funy-talk-scrolling .pokamo-fab::before{content:"＋";font-size:21px;font-weight:700;line-height:46px;color:#fff}
    .home-links-block[data-funy-hardcoded-bottom]{display:none!important}
  `;
  document.head.appendChild(style);

  function isOverlayOpen(){
    const selectors=['.talk-community-modal','#funyMonModal','.map-location-avatar-card','.live-pin-modal','.live-pin-sheet-modal','[data-funy-bottom-sheet].is-open','[role="dialog"].is-open'];
    return selectors.some(sel=>[...document.querySelectorAll(sel)].some(visible));
  }
  let lastOverlay=null,overlayTimer=0;
  function reportOverlay(){
    clearTimeout(overlayTimer);
    overlayTimer=setTimeout(()=>{
      const open=isOverlayOpen();
      document.documentElement.classList.toggle('funy-web-overlay-open',open);
      if(lastOverlay===open)return;
      lastOverlay=open;
      if(appShell)post({type:'FUNY_WEB_OVERLAY_STATE',open});
    },20);
  }
  const observer=new MutationObserver(reportOverlay);
  const startObserver=()=>{observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','style','aria-hidden']});reportOverlay()};
  if(document.body)startObserver();else document.addEventListener('DOMContentLoaded',startObserver,{once:true});

  function decorateLinks(root=document){
    root.querySelectorAll?.('a.review-schedule-card[href]').forEach(a=>{a.dataset.funyLinkMode='inapp';a.dataset.funyInappPresentation='bottom_sheet';a.removeAttribute('target')});
    root.querySelectorAll?.('#detail-view a[data-review-card][href],#detail-view .related-content a[href],#detail-view .detail-related a[href]').forEach(a=>{a.dataset.funyLinkMode='inapp';a.dataset.funyInappPresentation='bottom_sheet';a.removeAttribute('target')});
  }
  decorateLinks();
  new MutationObserver(m=>{m.forEach(x=>x.addedNodes.forEach(n=>{if(n.nodeType===1)decorateLinks(n)}));reportOverlay()}).observe(document.documentElement,{childList:true,subtree:true});

  document.addEventListener('click',e=>{
    const target=e.target instanceof Element?e.target:null;if(!target)return;
    const detailTarget=target.closest('#detail-view a,#detail-view button');
    if(detailTarget){
      const label=(detailTarget.getAttribute('aria-label')||detailTarget.textContent||'').replace(/\s+/g,' ').trim();
      if(/TCG\s*MAP|다른 카드샵/.test(label)){
        e.preventDefault();e.stopPropagation();
        if(appShell)post({type:'OPEN_NATIVE',route:'/(tabs)/map'});else location.href='shops.html';
        return;
      }
      if(detailTarget.matches('a[data-review-card],.related-content a,.detail-related a')){
        const href=detailTarget.href||detailTarget.getAttribute('href');
        if(href&&appShell){e.preventDefault();e.stopPropagation();post({type:'OPEN_INAPP_SHEET',url:href});return;}
      }
    }
    const label=(target.closest('button,a,select')?.textContent||'').replace(/\s+/g,' ').trim();
    if(appShell&&(/내 위치/.test(label)||/가까운 순/.test(label))&&navigator.geolocation){
      try{navigator.geolocation.getCurrentPosition(()=>{},()=>{},{enableHighAccuracy:true,timeout:12000,maximumAge:1000})}catch(_){}
    }
  },true);

  if(/\/talk\.html$/.test(location.pathname)){
    let scrollTimer=0;
    window.addEventListener('scroll',()=>{document.documentElement.classList.add('funy-talk-scrolling');clearTimeout(scrollTimer);scrollTimer=setTimeout(()=>document.documentElement.classList.remove('funy-talk-scrolling'),650)},{passive:true});
  }

  if(location.pathname==='/'||/\/index\.html$/.test(location.pathname)){
    const removeBottom=()=>{const block=document.querySelector('.home-links-block');if(block){block.dataset.funyHardcodedBottom='1';block.remove()}};
    removeBottom();document.addEventListener('DOMContentLoaded',removeBottom,{once:true});setTimeout(removeBottom,400);
  }

  window.addEventListener('pagehide',()=>{if(appShell)post({type:'FUNY_WEB_OVERLAY_STATE',open:false})});
})();
