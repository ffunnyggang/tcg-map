/* FUNY PIN TCG MAP: personal same-day visit status, list and popup only. */
(function(){
'use strict';
if(window.FUNY_MAP_TODAY_VISITS)return;
let visited=new Set(),day='',uid='',busy=false,lastCheck=0;
const today=()=>new Date(Date.now()+32400000).toISOString().slice(0,10);
function paint(){
 document.querySelectorAll('#shop-list [data-funy-visit-badge],.map-popup-bubble [data-funy-visit-badge]').forEach(el=>{
  el.hidden=!(day===today()&&visited.has(el.dataset.funyVisitBadge));
 });
}
function repaint(){window.FUNY_MAP_LIST?.refresh?.('today-visit-badge');paint()}
async function reload(){
 if(busy)return;
 busy=true;
 const stamp=today();
 try{
  const auth=window.FUNY_WEB_AUTH;
  if(!auth)throw Error('AUTH_UNAVAILABLE');
  await auth.init();
  await auth.refreshNativeSession?.();
  let session=auth.session;
  if(!session?.user?.id&&window.ReactNativeWebView){
   await new Promise(done=>setTimeout(done,900));
   await auth.refreshNativeSession?.();
   session=auth.session;
  }
  if(stamp!==today())return;
  const id=session?.user?.id||'';
  if(!id){visited=new Set();day=stamp;uid='';repaint();return}
  const {data,error}=await auth.client.from('shop_visit_checkins').select('shop_id').eq('user_id',id).eq('visit_date_kst',stamp).limit(1000);
  if(error)throw error;
  if(stamp!==today())return;
  visited=new Set((data||[]).map(row=>row.shop_id));day=stamp;uid=id;lastCheck=Date.now();repaint();
 }catch(error){
  visited=new Set();day=stamp;uid='';repaint();
  console.warn('[FUNY TODAY VISIT]',error?.message||error);
 }finally{busy=false}
}
window.FUNY_MAP_TODAY_VISITS={has:id=>day===today()&&visited.has(id),refresh:reload};
const observer=new MutationObserver(mutations=>{
 for(const mutation of mutations){
  if(Array.from(mutation.addedNodes).some(node=>node.nodeType===1&&
   (node.matches?.('.map-popup-bubble')||node.querySelector?.('.map-popup-bubble [data-funy-visit-badge]')))){
   paint();break;
  }
 }
});
observer.observe(document.body,{childList:true,subtree:true});
window.addEventListener('funy:shopvisitcompleted',()=>{void reload()});
window.addEventListener('funy:web-auth-change',()=>{if(!busy)void reload()});
window.addEventListener('pageshow',()=>{void reload()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void reload()});
setInterval(()=>{
 if(day!==today()){visited=new Set();day=today();repaint();void reload()}
 else if(!document.hidden&&Date.now()-lastCheck>90000)void reload();
},30000);
void reload();
})();