(function(){
'use strict';
if(window.__FUNY_WEB_FAVORITES)return;
window.__FUNY_WEB_FAVORITES=true;
const isApp=()=>{try{return !!window.ReactNativeWebView||new URLSearchParams(location.search).get('app')==='1'||document.documentElement.classList.contains('app-shell')}catch(_){return !!window.ReactNativeWebView}};
if(isApp())return;
const style=document.createElement('style');
style.textContent=`
.summary-card{position:relative}
.web-favorite-btn{position:absolute;right:14px;top:17px;width:34px;height:34px;padding:0;border:0;background:transparent;color:#A49DAC;display:grid;place-items:center;z-index:5;cursor:pointer}
.web-favorite-btn svg{width:28px;height:28px;display:block}
.web-favorite-btn.is-on{color:#8062D8}body.country-japan .web-favorite-btn.is-on{color:#D93B55}
.web-favorite-btn:disabled{opacity:.5}
.summary-card>.d-name{padding-right:44px}
.web-favorite-toast{position:fixed;left:50%;bottom:calc(86px + env(safe-area-inset-bottom,0px));z-index:2147483600;max-width:calc(100vw - 36px);padding:10px 14px;border-radius:999px;background:rgba(31,28,35,.92);color:#fff;font:750 11px/1.25 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;white-space:nowrap;opacity:0;transform:translate(-50%,10px);pointer-events:none;transition:opacity .18s ease,transform .2s ease}
.web-favorite-toast.show{opacity:1;transform:translate(-50%,0)}
`;
document.head.appendChild(style);
const heart=on=>on
?'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 21s-7.2-4.35-9.55-8.36C.48 9.27 1.53 5.1 5.2 3.74 7.54 2.87 10.08 3.7 12 5.7c1.92-2 4.46-2.83 6.8-1.96 3.67 1.36 4.72 5.53 2.75 8.9C19.2 16.65 12 21 12 21Z"/></svg>'
:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"/></svg>';
const shopId=()=>{const m=location.hash.match(/^#\/shop\/((?:KR|JP)-[A-Z]{3}-\d{3})/i);return m?m[1].toUpperCase():''};
let toastTimer=0;
function toast(message){
 let el=document.querySelector('.web-favorite-toast');
 if(!el){el=document.createElement('div');el.className='web-favorite-toast';el.setAttribute('role','status');document.body.appendChild(el)}
 el.textContent=message;el.classList.remove('show');requestAnimationFrame(()=>el.classList.add('show'));clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),1800);
}
async function render(){
 const id=shopId(),summary=document.querySelector('#detail .summary-card');if(!id||!summary)return;
 let btn=summary.querySelector('.web-favorite-btn');
 if(!btn){btn=document.createElement('button');btn.type='button';btn.className='web-favorite-btn';btn.setAttribute('aria-label','관심 매장');summary.appendChild(btn)}
 const A=window.FUNY_WEB_AUTH;await A?.init?.();
 let on=false;
 if(A?.session){const {data}=await A.client.from('shop_favorites').select('shop_id').eq('user_id',A.session.user.id).eq('shop_id',id).maybeSingle();on=!!data}
 const draw=()=>{btn.classList.toggle('is-on',on);btn.innerHTML=heart(on);btn.setAttribute('aria-pressed',String(on));btn.setAttribute('aria-label',on?'관심 매장 해제':'관심 매장 등록')};
 draw();
 btn.onclick=async()=>{
  if(!A?.session){A?.goLogin?.(location.href);return}
  btn.disabled=true;
  try{
   if(on){const {error}=await A.client.from('shop_favorites').delete().eq('user_id',A.session.user.id).eq('shop_id',id);if(error)throw error;on=false;toast(localStorage.getItem('funy-pin-lang')==='en'?'Removed from Favorite Shops.':'관심 매장에서 해제했어요.')}
   else{const {error}=await A.client.from('shop_favorites').insert({user_id:A.session.user.id,shop_id:id});if(error&&error.code!=='23505')throw error;on=true;toast(localStorage.getItem('funy-pin-lang')==='en'?'Added to Favorite Shops.':'관심 매장에 등록했어요.')}
   draw();
  }catch(e){toast('관심 매장 처리에 실패했습니다.')}
  finally{btn.disabled=false}
 };
}
const root=document.getElementById('detail');
if(root)new MutationObserver(()=>requestAnimationFrame(render)).observe(root,{childList:true,subtree:false});
window.addEventListener('hashchange',()=>requestAnimationFrame(render));
window.FUNY_WEB_AUTH?.onChange?.(()=>requestAnimationFrame(render));
requestAnimationFrame(render);
})();