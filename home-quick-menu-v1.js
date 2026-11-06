/* FUNY PIN HOME quick menu v1 — CMS-sorted feature block, member-scoped preferences. */
(()=>{'use strict';
if(window.FUNY_HOME_QUICK_MENU)return;
const BASE='https://wdttzpbmqavaqfcbaywj.supabase.co';
const API_KEY='sb_publishable__wrSzngSE-JbGnyE7PZX9w_2QaW8bpq';
const STORAGE='funypin.home.quick-menu.selection.v1';
const LEGACY='funypin.home.quick-menu.test.kt.v1';
const DEFAULT=['favorite','box','graded','market'];
const MENU=[
['favorite','관심 목록','Favorites','/my-favorites.html','💜'],
['box','BOX 시세','BOX Prices','/products.html?kind=box','📦'],
['graded','등급카드','Graded Cards','/products.html?kind=graded','🏅'],
['market','TCG 거래','TCG Market','/market.html','🤝'],
['events','이벤트','Events','/my-events.html','🎁'],
['coupons','쿠폰함','Coupons','/my-coupons.html','🎟️'],
['mon','퍼니몬 도감','FUNY MON','/my-funymon.html','👾'],
['ranking','랭킹','Rankings','/ranking.html','🏆'],
['shop_news','카드샵 소식','Shop News','/pick.html?tab=shop_news','📣'],
['information','TCG 정보','TCG Info','/pick.html?tab=information','💡'],
['schedule','TCG 일정','TCG Schedule','/pick.html?tab=schedule','📅'],
['creator','CREATOR','CREATOR','/pick.html?tab=creator','🎨'],
['tools','TCG TOOL','TCG TOOL','/tcg-tools.html','🛠️'],
['entries','내 응모 내역','My Entries','/my-entries.html','📋'],
['binder','내 바인더','My Binder','/binder.html','📒']
].map(([id,ko,en,href,emoji])=>({id,ko,en,href,emoji}));
const BY_ID=new Map(MENU.map(x=>[x.id,x]));
const $=s=>document.querySelector(s);
const english=()=>{try{return localStorage.getItem('funy-pin-lang')==='en'}catch{return false}};
const label=x=>english()?x.en:x.ko;
const allowed=x=>Array.isArray(x)&&x.length<=10&&new Set(x).size===x.length&&x.every(id=>BY_ID.has(id));
function readLocal(){
 try{const x=JSON.parse(localStorage.getItem(STORAGE));if(allowed(x))return [...x]}catch(_){}
 try{const x=JSON.parse(localStorage.getItem(LEGACY))?.selected;if(Array.isArray(x)){const cleaned=[...new Set(x.filter(id=>BY_ID.has(id)))].slice(0,10);if(cleaned.length)return cleaned}}catch(_){}
 return [...DEFAULT];
}
function writeLocal(ids){try{localStorage.setItem(STORAGE,JSON.stringify(ids))}catch(_){}}
let selected=readLocal(),draft=[],host=null,lastFocus=null,activeUser=null,loadSeq=0,saveBusy=false;
const PLUS='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
const safeId=id=>encodeURIComponent(id);
async function authedFetch(user,path,options={}){
 const token=user?.token;if(!token)throw Error('로그인 정보가 없습니다.');
 const response=await fetch(BASE+'/rest/v1/'+path,{...options,headers:{
  apikey:API_KEY,Authorization:'Bearer '+token,'Content-Type':'application/json',...(options.headers||{})
 }});
 if(!response.ok){const error=await response.json().catch(()=>({}));throw Error(error.message||error.error||('HTTP '+response.status))}
 if(response.status===204)return null;
 return response.json().catch(()=>null);
}
function render(){
 if(!host||!host.isConnected)return;
 const rail=host.querySelector('.fqm-rail');if(!rail)return;
 rail.replaceChildren();
 for(const id of selected){const item=BY_ID.get(id);if(!item)continue;
  const a=document.createElement('a');a.className='fqm-tile';a.href=item.href;
  // Native PICK tabs and TCG market must bypass the app's document-start CMS link interceptor.
  if(!['shop_news','information','schedule','creator','tools','market'].includes(id)){
   a.dataset.funyLinkMode='inapp';a.dataset.funyInappPresentation='page';
  }
  if(['shop_news','information','schedule','creator','tools'].includes(id)){
   a.addEventListener('click',e=>{
    if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    if(!window.ReactNativeWebView?.postMessage)return;
    e.preventDefault();e.stopPropagation();
    const at=Date.now(),intentKey='funypin:pick:pending-tab:v1';
    try{localStorage.setItem(intentKey,JSON.stringify({tab:id,at}))}catch(_){}
    try{window.ReactNativeWebView.postMessage(JSON.stringify({type:'OPEN_NATIVE',route:'/(tabs)/pick?__tabRefresh='+at}))
    }catch(err){try{localStorage.removeItem(intentKey)}catch(_){}location.href=item.href}
   });
  }
  a.setAttribute('aria-label',label(item));
  const graphic=document.createElement('span');graphic.className='fqm-emoji';graphic.textContent=item.emoji;graphic.setAttribute('aria-hidden','true');
  const title=document.createElement('span');title.className='fqm-label';title.textContent=label(item);
  a.append(graphic,title);rail.append(a);
 }
 const add=document.createElement('button');add.type='button';add.className='fqm-tile fqm-add';
 add.setAttribute('aria-label',english()?'Edit quick menu':'퀵메뉴 편집');add.innerHTML='<span class="fqm-plus">'+PLUS+'</span>';
 add.addEventListener('click',openEditor);rail.append(add);
}
function toast(message){
 let el=$('#fqm-toast');if(!el){el=document.createElement('div');el.id='fqm-toast';el.className='fqm-toast';el.setAttribute('role','status');document.body.append(el)}
 el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2000);
}
function renderEditor(){
 const grid=$('#fqm-choice-grid');if(!grid)return;grid.replaceChildren();
 const items=[...draft.map(id=>BY_ID.get(id)).filter(Boolean),...MENU.filter(x=>!draft.includes(x.id))];
 for(const item of items){
  const position=draft.indexOf(item.id)+1,btn=document.createElement('button');btn.type='button';btn.className='fqm-choice'+(position?' selected':'');
  btn.dataset.quickId=item.id;btn.setAttribute('aria-pressed',String(!!position));btn.setAttribute('aria-label',label(item)+(position?' '+position:''));
  const name=document.createElement('span');name.textContent=label(item);
  const badge=document.createElement('i');badge.className='fqm-choice-badge';
  if(position)badge.textContent=String(position);else badge.innerHTML=PLUS;badge.setAttribute('aria-hidden','true');
  btn.append(name,badge);grid.append(btn);
 }
 $('#fqm-count').textContent=english()?draft.length+' / 10 selected':draft.length+' / 10개 선택';
 $('#fqm-clear').disabled=draft.length===0;
}
// The app tab bar is native React Native UI, not a DOM layer. The existing
// FUNY_WEB_OVERLAY_STATE bridge hides it while this WebView sheet is open.
function notifyNativeSheet(open){
 try{
  window.ReactNativeWebView?.postMessage(JSON.stringify({
   type:'FUNY_WEB_OVERLAY_STATE',open:!!open,
   source:'home-quick-menu',navMode:open?'hide':'none'
  }));
 }catch(err){console.warn('[FUNY PIN quick menu] native overlay sync unavailable',err)}
}
function openEditor(){
 if($('#fqm-overlay'))return;
 lastFocus=document.activeElement;draft=[...selected];
 const overlay=document.createElement('div');overlay.id='fqm-overlay';overlay.className='fqm-overlay';
 overlay.innerHTML='<section class="fqm-sheet" role="dialog" aria-modal="true" aria-labelledby="fqm-sheet-title">'+
 '<div class="fqm-handle" aria-hidden="true"></div>'+
 '<header class="fqm-sheet-head"><h2 id="fqm-sheet-title"></h2><button type="button" class="fqm-close" id="fqm-close" aria-label="닫기">×</button></header>'+
 '<div class="fqm-sheet-toolbar"><span id="fqm-count" role="status"></span><button type="button" id="fqm-clear"></button></div>'+
 '<div class="fqm-sheet-scroll"><div class="fqm-choice-grid" id="fqm-choice-grid"></div></div>'+
 '<footer class="fqm-sheet-footer"><button type="button" class="fqm-save" id="fqm-save"></button></footer></section>';
 document.body.append(overlay);
 overlay.querySelector('#fqm-sheet-title').textContent=english()?'Set your favorite shortcuts (up to 10)':'자주 찾는 메뉴를 설정하세요. (최대 10개)';
 overlay.querySelector('#fqm-clear').textContent=english()?'Clear all':'전체해제';
 overlay.querySelector('#fqm-save').textContent=english()?'Save':'저장';
 overlay.querySelector('#fqm-close').addEventListener('click',closeEditor);
 overlay.addEventListener('click',e=>{if(e.target===overlay)closeEditor()});
 overlay.querySelector('#fqm-clear').addEventListener('click',()=>{draft=[];renderEditor()});
 overlay.querySelector('#fqm-choice-grid').addEventListener('click',e=>{
  const btn=e.target.closest('[data-quick-id]');if(!btn)return;const id=btn.dataset.quickId;
  if(draft.includes(id))draft=draft.filter(x=>x!==id);
  else if(draft.length<10)draft.push(id);
  else {toast(english()?'Select up to 10 shortcuts':'최대 10개까지 등록할 수 있어요');return}
  renderEditor();
 });
 overlay.querySelector('#fqm-save').addEventListener('click',save);
 document.body.classList.add('fqm-modal-open');notifyNativeSheet(true);renderEditor();overlay.querySelector('#fqm-close').focus();
}
function closeEditor(){
 if(saveBusy)return;
 const wasOpen=!!$('#fqm-overlay');
 $('#fqm-overlay')?.remove();document.body.classList.remove('fqm-modal-open');
 if(wasOpen)notifyNativeSheet(false);
 lastFocus?.focus();
}
async function save(){
 if(saveBusy||!allowed(draft))return;saveBusy=true;
 const button=$('#fqm-save');if(button)button.disabled=true;
 const next=[...draft],user=activeUser;
 try{
  if(user?.id){
   await authedFetch(user,'home_quick_menu_user_preferences?on_conflict=user_id',{
    method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},
    body:JSON.stringify({user_id:user.id,selected_menu_ids:next,updated_at:new Date().toISOString()})
   });
  }
  selected=next;writeLocal(next);render();saveBusy=false;closeEditor();toast(english()?'Quick menu saved':'퀵메뉴가 저장되었습니다');
 }catch(err){saveBusy=false;if(button)button.disabled=false;console.warn('[FUNY PIN quick menu] save failed',err);
  toast(english()?'Could not save. Please try again.':'설정 저장에 실패했습니다. 다시 시도해주세요.');
 }
}
async function loadMember(){
 const A=window.FUNY_WEB_AUTH;
 if(!A)return;
 const seq=++loadSeq;
 try{
  const session=await A.getSession();
  if(seq!==loadSeq)return;
  const user=session?.user,token=session?.access_token;
  if(!user?.id||!token){activeUser=null;selected=readLocal();render();return}
  activeUser={id:user.id,token};
  const rows=await authedFetch(activeUser,'home_quick_menu_user_preferences?user_id=eq.'+safeId(user.id)+'&select=selected_menu_ids&limit=1');
  if(seq!==loadSeq)return;
  if(rows?.[0]&&allowed(rows[0].selected_menu_ids)){selected=[...rows[0].selected_menu_ids];writeLocal(selected);render()}
  else{selected=readLocal();render()}
 }catch(err){console.warn('[FUNY PIN quick menu] preference fetch unavailable',err);if(seq===loadSeq)render()}
}
function sync(){
 const slot=document.querySelector('.fp-cms-quick-menu-slot');
 if(!slot){if(host)host=null;return}
 if(host===slot)return;
 host=slot;slot.innerHTML='<div class="fqm-scroll" aria-label="나의 퀵메뉴"><div class="fqm-rail"></div></div>';
 render();
}
window.addEventListener('funy:native-overlay-dismiss',()=>{if($('#fqm-overlay'))closeEditor()});
window.addEventListener('pagehide',()=>{if($('#fqm-overlay'))notifyNativeSheet(false)});
document.addEventListener('keydown',e=>{
 if(!$('#fqm-overlay'))return;
 if(e.key==='Escape'){closeEditor();return}
 if(e.key==='Tab'){
  const list=[...$('#fqm-overlay').querySelectorAll('button:not(:disabled)')].filter(el=>el.getClientRects().length);
  const first=list[0],last=list[list.length-1];if(!first)return;
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
 }
});
document.addEventListener('funy:web-auth-change',()=>loadMember());
window.addEventListener('storage',e=>{if(e.key===STORAGE&&!activeUser){selected=readLocal();render()}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)loadMember()});
window.FUNY_HOME_QUICK_MENU={sync,refresh:loadMember,getSelected:()=>[...selected]};
const start=()=>{sync();loadMember()};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();