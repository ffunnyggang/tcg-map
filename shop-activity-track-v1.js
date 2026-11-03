/* FUNY PIN shop activity v2 — web & app WebView.
   Existing GA4 untouched. Server is authoritative for validity/deduplication.
   List/map markers never count as detail views. */
(function(){
 'use strict';
 if(window.__FUNY_SHOP_ACTIVITY_V2)return;
 window.__FUNY_SHOP_ACTIVITY_V2=true;
 const ENDPOINT='https://wdttzpbmqavaqfcbaywj.supabase.co/functions/v1/shop-activity-track';
 const valid=id=>/^(KR|JP)-[A-Z]{3}-\d{3}$/.test(String(id||''));
 const context=()=>window.__FUNY_ANALYTICS_CORE?.context?.()||{};
 const qs=()=>new URLSearchParams(location.search);
 const cleanPlatform=p=>{p=String(p||'').toLowerCase();return ['ios','android','web'].includes(p)?p:'unknown'};
 function clientInfo(){
   const q=qs(),c=context();
   const hasBridge=!!window.ReactNativeWebView;
   const app=hasBridge||q.get('app')==='1'||c.client_surface==='app_webview';
   let platform=cleanPlatform(q.get('appPlatform'));
   if(platform==='unknown'){
     // Native iOS shells provide app=1 but may omit appPlatform.
     if(app && /iPhone|iPad|iPod/i.test(navigator.userAgent))platform='ios';
     else if(app && /Android/i.test(navigator.userAgent))platform='android';
     else platform=cleanPlatform(c.app_platform);
   }
   if(!app)platform='web';
   return {client_surface:app?'app_webview':'web',app_platform:platform};
 }
 let lastViewId='',lastViewTime=0;
 const latestAction=new Map();
 const currentId=()=>String(document.querySelector('#detail')?.dataset.shopId||location.hash.match(/^#\/shop\/([^/?#]+)/)?.[1]||'').toUpperCase();
 const detailVisible=()=>{const el=document.querySelector('#detail-view');return !!el&&!el.hidden && getComputedStyle(el).display!=='none';};
 function visitor(){
   try{const key='funypin:shop-activity-visitor:v1';let id=localStorage.getItem(key);
     if(!id){id=crypto.randomUUID?.()||String(Date.now())+'-'+Math.random().toString(36).slice(2);localStorage.setItem(key,id);}
     return id;
   }catch(_){return '';}
 }
 function record(type,id){
   if(!valid(id))return;
   const data={shop_id:id,event_type:type,visitor_id:visitor(),...clientInfo()};
   try{fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),keepalive:true,mode:'cors',credentials:'omit'}).catch(()=>{});}catch(_){}
 }
 function onDetail(id){
   id=String(id||'').toUpperCase();
   if(!valid(id)||!detailVisible())return;
   const now=Date.now();if(id===lastViewId&&now-lastViewTime<3000)return;
   lastViewId=id;lastViewTime=now;record('detail_view',id);
 }
 function scanDetail(){
   if(!detailVisible())return;
   const id=currentId();if(valid(id))onDetail(id);
 }
 document.addEventListener('funy:shop-detail-opened',e=>onDetail(e.detail?.shopId));
 // Covers old iOS HTML/assets that do not dispatch the custom event.
 function setupObserver(){
   const target=document.querySelector('#detail-view')||document.documentElement;
   const observer=new MutationObserver(()=>{if(detailVisible() && currentId()!==lastViewId)scanDetail();});
   observer.observe(target,{attributes:true,attributeFilter:['hidden','style','class'],childList:true,subtree:true});
   scanDetail();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setupObserver,{once:true});
 else setupObserver();
 window.addEventListener('hashchange',()=>setTimeout(scanDetail,0));
 window.addEventListener('pageshow',()=>setTimeout(scanDetail,0));
 function activityAction(node){
   const action=node?.closest?.('#detail-view a,#detail-view button,#detail-sticky a,#detail-sticky button');
   if(!action||!detailVisible())return null;
   const id=currentId();if(!valid(id))return null;
   if(action.matches('.share-btn'))return ['share_click',id];
   const label=String(action.getAttribute('aria-label')||action.textContent||'').trim();
   const href=String(action.getAttribute('href')||'');
   const externalMap=action.matches('.quick-action')&&(/naver\.me|map\.naver\.com|google\.com\/maps|maps\.app\.goo\.gl/i.test(href)||/네이버지도|Naver Map|Google Maps/i.test(label));
   if(externalMap||/길찾기|directions|route/i.test(label))return ['directions_click',id];
   return null;
 }
 function emitAction(pair){
   if(!pair)return;
   const key=pair.join(':');const now=Date.now();
   if(now-(latestAction.get(key)||0)<1200)return;
   latestAction.set(key,now);record(pair[0],pair[1]);
 }
 // Window capture precedes document-level early native navigation interceptors.
 let touching=null;
 window.addEventListener('touchstart',e=>{const t=e.touches?.[0];touching=t?{x:t.clientX,y:t.clientY,pair:activityAction(e.target)}:null;},{capture:true,passive:true});
 window.addEventListener('touchend',e=>{if(!touching)return;const t=e.changedTouches?.[0];
   const started=touching;touching=null;
   if(!t||Math.abs(t.clientX-started.x)>12||Math.abs(t.clientY-started.y)>12)return;
   emitAction(started.pair);
 },{capture:true,passive:true});
 document.addEventListener('click',e=>{emitAction(activityAction(e.target))},true);
})();
