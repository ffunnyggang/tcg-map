/* FUNY PIN aggregate shop activity v1. Independent of existing GA4.
   Only completed detail render and explicit user actions are recorded.
   The collector deduplicates repeated visits server-side. */
(function(){
 'use strict';
 if(window.__FUNY_SHOP_ACTIVITY_V1)return;
 window.__FUNY_SHOP_ACTIVITY_V1=true;
 const ENDPOINT='https://wdttzpbmqavaqfcbaywj.supabase.co/functions/v1/shop-activity-track';
 const valid=id=>/^(KR|JP)-[A-Z]{3}-\d{3}$/.test(String(id||''));
 const ctx=()=>window.__FUNY_ANALYTICS_CORE?.context?.()||{};
 let lastDetail='',lastDetailAt=0;
 const currentId=()=>String(document.querySelector('#detail')?.dataset.shopId||location.hash.match(/^#\/shop\/([^/?#]+)/)?.[1]||'');
 function visitor(){
  try{const key='funypin:shop-activity-visitor:v1';let id=localStorage.getItem(key);if(!id){id=crypto.randomUUID?.()||String(Date.now())+'-'+Math.random().toString(36).slice(2);localStorage.setItem(key,id);}return id;}catch(_){return '';}
 }
 function record(event_type,id){
  if(!valid(id))return;
  const c=ctx();
  const app=c.client_surface==='app_webview'||!!window.ReactNativeWebView||new URLSearchParams(location.search).get('app')==='1';
  const platform=String(c.app_platform||new URLSearchParams(location.search).get('appPlatform')||(app?'unknown':'web')).toLowerCase();
  const data={shop_id:id,event_type,visitor_id:visitor(),client_surface:app?'app_webview':'web',app_platform:['web','ios','android'].includes(platform)?platform:'unknown'};
  try{fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),keepalive:true,mode:'cors',credentials:'omit'}).catch(()=>{});}catch(_){}
 }
 function detail(id){
  if(!valid(id)||document.querySelector('#detail-view')?.hidden)return;
  const now=Date.now();if(lastDetail===id&&now-lastDetailAt<3000)return;
  lastDetail=id;lastDetailAt=now;record('detail_view',id);
 }
 document.addEventListener('funy:shop-detail-opened',e=>detail(e.detail?.shopId));
 document.addEventListener('DOMContentLoaded',()=>{const d=document.querySelector('#detail');if(d?.dataset.shopId)detail(d.dataset.shopId);},{once:true});
 document.addEventListener('click',e=>{
  const t=e.target instanceof Element?e.target:null;
  const action=t?.closest('#detail-view a,#detail-view button,#detail-sticky a,#detail-sticky button');
  if(!action)return;
  const id=currentId();if(!valid(id))return;
  const label=String(action.getAttribute('aria-label')||action.textContent||'').trim();
  const href=String(action.getAttribute('href')||'');
  if(action.matches('.share-btn')){record('share_click',id);return;}
  const isDirection=action.matches('.quick-action')&&(/naver\.me|map\.naver\.com|google\.com\/maps|maps\.app\.goo\.gl/i.test(href)||/네이버지도|Naver Map|Google Maps/i.test(label));
  if(isDirection||/길찾기|directions|route/i.test(label))record('directions_click',id);
 },true);
})();
