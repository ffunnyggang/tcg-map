/* FUNY TALK native community + POKAMO mixed feed */
(function(){
'use strict';
if(!/\/talk\.html$/.test(location.pathname)||window.__FUNY_TALK_COMMUNITY)return;
window.__FUNY_TALK_COMMUNITY=true;
const SB='https://wdttzpbmqavaqfcbaywj.supabase.co',KEY='sb_publishable__wrSzngSE-JbGnyE7PZX9w_2QaW8bpq';
const CATS=['자유 게시판','카드 자랑','카드깡/카드샵 후기','정보 공유'];
const feed=document.getElementById('feed'),fab=document.getElementById('pokamoFab'),popularSort=document.getElementById('popularSort');let mixed=[],current='전체',popularMode='popular',blockedOwners=new Set();let binderEpoch=0;const binderURLs=new Set();

const talkStateKey='funy-talk-list-state-v2';let pendingListScroll=null,rememberedBinderPages=1;
// Restore only history traversal; ordinary menu entry and reload start at All/top.
const talkHistoryEntry=performance.getEntriesByType('navigation')[0]?.type==='back_forward';
try{const saved=talkHistoryEntry?(history.state?.funyTalkList||JSON.parse(sessionStorage.getItem(talkStateKey)||'null')):null;if(saved&&Date.now()-saved.at<86400000){current=saved.current==='카드 자랑'&&saved.showcaseTab==='binders'?'바인더 자랑':saved.current||'전체';popularMode=saved.popularMode||'popular';pendingListScroll=Number(saved.scroll)||0;rememberedBinderPages=Math.max(1,Number(saved.pages)||1);}else{pendingListScroll=0;if('scrollRestoration' in history)history.scrollRestoration='manual';window.scrollTo(0,0);}}catch(_){pendingListScroll=0;}

function rememberTalkList(){if(document.documentElement.classList.contains('funy-talk-post-mode'))return;try{const value=JSON.stringify({current,popularMode,scroll:window.scrollY||0,pages:rememberedBinderPages,at:Date.now()});sessionStorage.setItem(talkStateKey,value);localStorage.setItem(talkStateKey,value);history.replaceState({...history.state,funyTalkList:JSON.parse(value)},'',location.href);}catch(_){}}
function restoreTalkScroll(){if(pendingListScroll===null)return;const y=pendingListScroll;pendingListScroll=null;requestAnimationFrame(()=>window.scrollTo(0,y));}
document.addEventListener('click',e=>{if(e.target.closest?.('.talk-binder-cover,.talk-binder-cover-link'))rememberTalkList();},true);
window.addEventListener('pagehide',rememberTalkList);
window.addEventListener('pageshow',event=>{if(event.persisted){pendingListScroll=window.scrollY||0;refresh().catch(()=>{});}});

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const linkify=s=>{
  const raw=String(s??'');
  const re=/https?:\/\/[^\s<>"']+/gi;
  let out='',last=0,m;
  while((m=re.exec(raw))){
    out+=esc(raw.slice(last,m.index));
    let url=m[0],trail='';
    while(/[),.!?;:]$/.test(url)){trail=url.slice(-1)+trail;url=url.slice(0,-1)}
    out+='<a class="talk-outlink" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer" data-funy-link-mode="external">'+esc(url)+'</a>'+esc(trail);
    last=m.index+m[0].length;
  }
  return out+esc(raw.slice(last));
};
const ago=s=>{if(!s)return'-';const d=new Date(s);if(Number.isNaN(d.getTime()))return'-';const m=Math.max(0,Math.floor((Date.now()-d.getTime())/60000));if(m<1)return'방금 전';if(m<60)return m+'분 전';if(m<1440)return Math.floor(m/60)+'시간 전';if(m<10080)return Math.floor(m/1440)+'일 전';return d.toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul'})};
const token=()=>String(window.__FUNY_ACCESS_TOKEN||window.FUNY_WEB_AUTH?.session?.access_token||'');
const uid=()=>{const webId=window.FUNY_WEB_AUTH?.session?.user?.id;if(webId)return String(webId);try{const raw=token().split('.')[1];if(!raw)return'';const n=raw.replace(/-/g,'+').replace(/_/g,'/');return JSON.parse(decodeURIComponent(Array.from(atob(n.padEnd(Math.ceil(n.length/4)*4,'='))).map(c=>'%'+c.charCodeAt(0).toString(16).padStart(2,'0')).join(''))).sub||''}catch(_){return''}};
const headers=(auth=false)=>{const h={apikey:KEY,'Content-Type':'application/json'};if(auth&&token())h.Authorization='Bearer '+token();return h};
const requestLogin=message=>{alert(message);if(document.documentElement.classList.contains('app-shell')||new URLSearchParams(location.search).get('app')==='1'||window.ReactNativeWebView){try{window.ReactNativeWebView?.postMessage(JSON.stringify({type:'OPEN_NATIVE',route:'/login?next=talk'}))}catch(_){};return}if(window.FUNY_WEB_AUTH?.goLogin){window.FUNY_WEB_AUTH.goLogin(location.href);return}location.href='/login.html'};
async function uploadPostImage(file,postId,index){
 const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';
 const path=uid()+'/'+postId+'/fp1-'+Date.now()+'-'+crypto.randomUUID()+'-'+index+'.'+ext;
 const send=(name,body)=>fetch(SB+'/storage/v1/object/community-posts/'+name,{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+token(),'Content-Type':body.type,'Cache-Control':'max-age=31536000','x-upsert':'false'},body});
 const original=await send(path,file);if(!original.ok)throw Error('이미지 업로드에 실패했습니다.');
 try{const thumb=await window.FUNY_EFFICIENCY?.imageVariant(file,640,.85);if(thumb)await send(path+'.thumb.webp',thumb);}catch(_){}
 return path;
}
const publicImage=path=>`${SB}/storage/v1/object/public/community-posts/${String(path||'').split('/').map(encodeURIComponent).join('/')}`;
let talkFormOverlayOpen=false;
const syncTalkFormOverlay=open=>{open=!!open;if(talkFormOverlayOpen===open)return;talkFormOverlayOpen=open;try{window.ReactNativeWebView?.postMessage(JSON.stringify({type:'TALK_FORM_OVERLAY_STATE',open}))}catch(_){}};window.__FUNY_TALK_FORM_OVERLAY_SYNC=syncTalkFormOverlay;
const style=document.createElement('style');style.textContent=`.talk-binder-spotlight{grid-column:1/-1;min-width:0;padding:20px 0 18px;border-bottom:1px solid #eeeaf2}.talk-binder-rail{display:flex;gap:14px;overflow-x:auto;overscroll-behavior-x:contain;scroll-snap-type:x proximity;padding:3px 0 5px;scrollbar-width:none}.talk-binder-rail::-webkit-scrollbar{display:none}.talk-binder-rail>*{flex:0 0 108px;scroll-snap-align:start}.binder-rail-intro{position:relative;align-self:flex-start;height:150px;border:0;background:#8061c9;color:white;padding:18px 10px;text-align:left;border-radius:5px 12px 12px 5px}.binder-rail-intro b{position:absolute;top:12px;left:10px;right:10px;z-index:1;font-size:13px;line-height:1.45}.binder-rail-art{position:absolute;left:18px;bottom:18px;display:block;width:72px;height:72px;object-fit:contain;pointer-events:none}.binder-rail-plus{position:absolute;bottom:-10px;left:43px;display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:#292232;color:white;font-size:21px}.binder-rail-card{text-decoration:none;min-width:0;color:inherit}.binder-rail-cover{height:150px;position:relative;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;padding:16px 10px;border-radius:4px 10px 10px 4px;background:linear-gradient(110deg,#0000000a,#ffffff24),var(--cover-color);box-shadow:0 3px 8px #32234212;color:white;text-align:center}.binder-rail-cover:before{content:"";position:absolute;left:6px;top:0;bottom:0;border-left:1px solid #ffffff55}.binder-rail-cover b{font-size:12px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}.binder-rail-cover small{font-size:5px;letter-spacing:1px}.binder-rail-cover>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.binder-rail-author{position:relative;display:flex;flex-direction:column;align-items:center;gap:5px;margin-top:-15px;font-size:10px;color:#81768d}.binder-rail-author img,.binder-rail-avatar{width:32px;height:32px;border-radius:50%;background:#e5dfec;border:2px solid white;object-fit:cover}.binder-rail-author>span:last-child{max-width:105px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.binder-rail-more{align-self:flex-start;height:150px;border:0;border-radius:10px;background:#f4f0fa;color:#7857b4;font-size:13px;font-weight:700}.binder-rail-status{display:grid;place-content:center;height:150px;font-size:11px;color:#92849f;text-align:center;line-height:1.6}.binder-rail-login{border:0;background:none;color:#7857b4;font:inherit}
#talkCommentList>.talk-comment{border-top:1px solid #f1edf3}#talkCommentList>.talk-comment:first-child{border-top:0}.talk-comment-content{position:relative}.talk-comment-replies>.talk-comment{border-top:0}.talk-comment-replies>.talk-comment>.talk-comment-content:before{content:"";position:absolute;left:-14px;top:0;bottom:0;width:2px;background:#eee8f4}.talk-comment-head{display:flex;align-items:center;gap:10px}.talk-comment-head .talk-author-avatar{width:34px;height:34px}.talk-comment-identity{display:flex;flex:1;min-width:0;flex-direction:column;gap:4px}.talk-comment-identity b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.talk-comment-identity time{font-size:10px;color:#a198a7}.talk-comment-head .talk-comment-more{position:static!important;margin-left:auto;flex:0 0 34px;width:34px;height:36px;padding:0}.talk-comment-social{display:flex;gap:14px;margin-top:10px}.talk-comment-social button{border:0;background:none;padding:4px 0;font:inherit;font-size:11px;color:#9a90a1}.talk-comment-social button[aria-pressed=true]{color:#7951bc}.talk-comment-replies{margin:12px 0 0 18px;padding-left:12px;border-left:0}#talkReplyTarget{display:flex;justify-content:space-between;font-size:11px;color:#7951bc;padding-bottom:8px}#talkReplyTarget[hidden]{display:none}#talkReplyTarget button{border:0;background:none;color:inherit;font-size:18px}.funy-source{display:inline-flex;align-items:center;height:20px;padding:0 7px;border-radius:999px;margin-right:5px;font-size:9px;font-weight:850}.funy-source.funy{background:#eee8fb;color:#704fc5}.funy-source.pokamo{background:#fff0e5;color:#d86418}.funy-category{display:inline-flex;align-items:center;height:20px;padding:0 7px;border-radius:999px;background:#f5f3f7;color:#756e7b;font-size:9px;font-weight:750}.funy-post-card{cursor:pointer}.card{align-items:center}.thumb-stack{align-self:center}.funy-post-card .thumb-stack{width:88px;height:88px;position:relative;align-self:center}.funy-post-card .thumb-count{position:absolute;right:5px;bottom:5px;padding:2px 6px;border-radius:999px;background:rgba(20,18,24,.72);color:#fff;font-size:9px;font-weight:800}.pokamo-fab{background:linear-gradient(135deg,#8063d7,#6446bd)!important;box-shadow:0 8px 24px rgba(103,74,190,.24)!important;width:132px!important;min-width:46px!important;transition:width .3s cubic-bezier(.22,1,.36,1),min-width .3s cubic-bezier(.22,1,.36,1),padding .3s cubic-bezier(.22,1,.36,1),border-radius .3s ease!important}.pokamo-fab .fab-full{transition:opacity .12s ease,transform .18s ease!important}.pokamo-fab .fab-plus{transition:opacity .12s ease,transform .18s ease!important}.talk-community-modal{position:fixed;inset:0;z-index:10000;display:flex;align-items:flex-end;justify-content:center;background:rgba(24,20,30,.36)}.talk-community-sheet{position:relative;width:min(100%,420px);max-height:92dvh;overflow:auto;background:#fff;border-radius:24px 24px 0 0;padding:10px 16px calc(24px + env(safe-area-inset-bottom));box-shadow:0 -18px 45px rgba(32,24,44,.18)}.talk-community-handle{width:42px;height:5px;border-radius:99px;background:#d8d2dd;margin:0 auto 9px}.talk-community-head{position:sticky;top:-10px;z-index:6;display:flex;align-items:center;justify-content:space-between;height:52px;margin:0 -16px;padding:10px 16px 0;background:#fff;border-bottom:1px solid #f1edf3}.talk-form-sheet{padding-bottom:calc(56px + env(safe-area-inset-bottom))}.talk-form-sheet .talk-community-top{position:sticky;top:0;z-index:8;margin:-10px -16px 0;padding:10px 16px 0;background:#fff;border-radius:24px 24px 0 0}.talk-form-sheet .talk-community-handle{margin:0 auto 4px}.talk-form-sheet .talk-community-head{position:relative;top:auto;z-index:auto;height:48px;margin:0 -16px;padding:0 16px;border-bottom:0}.talk-community-head strong{font-size:17px}.talk-community-close{width:36px;height:36px;border:0;background:transparent;font-size:26px;color:#777}.talk-field{margin-top:14px}.talk-field label{display:block;margin-bottom:7px;font-size:11px;font-weight:800;color:#5b5560}.talk-field select,.talk-field input,.talk-field textarea{width:100%;border:1px solid #e2dde7;border-radius:13px;background:#fff;color:#29252e;font:650 14px 'Pretendard Variable',Pretendard,sans-serif;outline:0}.talk-field select,.talk-field input{height:46px;padding:0 13px}.talk-field textarea{height:170px;padding:12px 13px;resize:none;line-height:1.55}.talk-photo-input{display:none}.talk-photo-btn{min-height:58px;border:1px solid #e3dced;border-radius:14px;display:flex;align-items:center;justify-content:flex-start;gap:10px;padding:0 14px;color:#5f4aa0;font-size:12px;font-weight:850;background:linear-gradient(135deg,#fbf9ff,#f4effd);box-shadow:inset 0 1px 0 rgba(255,255,255,.9)}.talk-photo-btn:before{content:'📷';display:grid;place-items:center;width:34px;height:34px;border-radius:11px;background:#fff;border:1px solid #e5ddef;font-size:17px}.talk-photo-btn small{display:block;margin-top:2px;color:#978e9d;font-size:9.5px;font-weight:650}.talk-photo-list{display:flex;gap:8px;margin-top:8px}.talk-photo-item{width:70px;height:70px;position:relative}.talk-photo-item img{width:70px;height:70px;border-radius:10px;object-fit:cover}.talk-photo-item button{position:absolute;right:-5px;top:-5px;width:22px;height:22px;border:0;border-radius:50%;background:#38323e;color:#fff}.talk-submit{width:100%;height:50px;margin-top:20px;border:0;border-radius:14px;background:#684bbf;color:#fff;font-size:13px;font-weight:900}.talk-policy{margin-top:9px;color:#9b94a0;font-size:10px;line-height:1.5}.talk-detail-body{min-width:0;max-width:100%;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;font-size:13px;line-height:1.65;color:#514b56;margin:13px 0 18px}.talk-detail-body .talk-outlink{color:#5f4bb6;text-decoration:underline;text-underline-offset:2px;overflow-wrap:anywhere;word-break:break-word}.talk-detail-images{display:grid;gap:8px}.talk-detail-images img{display:block;width:100%;border-radius:13px}.talk-detail-meta{margin-top:5px;font-size:10.5px;color:#9b94a0}.talk-report{margin:18px auto 0;display:block;border:0;background:transparent;color:#a19aa6;font-size:11px;text-decoration:underline}.talk-report-options{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:12px}.talk-report-options button{height:42px;border:1px solid #e2dde7;border-radius:11px;background:#fff;color:#5d5661;font-size:11px}.talk-empty-note{padding:45px 20px;text-align:center;color:#999;font-size:13px}.talk-post-page{min-width:0;max-width:100%;overflow-x:hidden;padding:18px 2px 120px}.talk-post-page h1{margin:13px 0 7px;font-size:22px;line-height:1.35;letter-spacing:-.04em;color:#201d24}.talk-post-stats{display:flex;align-items:center;gap:12px;margin:14px 0 4px;color:#8f8794;font-size:11px}.talk-like-btn{height:38px;padding:0 14px;border:1px solid #e2dce9;border-radius:19px;background:#fff;color:#655f69;font:800 12px Pretendard,sans-serif}.talk-like-btn.is-on{background:#f2edfb;border-color:#d8cdf0;color:#684bbf}.talk-comments{margin-top:28px;padding-top:18px;border-top:1px solid #eeeaf2}.talk-comments h3{margin:0 0 12px;font-size:15px}.talk-comment-form{display:flex;gap:8px;margin-bottom:16px}.talk-comment-input{flex:1;min-height:42px;max-height:96px;padding:10px 12px;border:1px solid #e2dce8;border-radius:12px;resize:none;font:650 16px Pretendard,sans-serif}.talk-comment-submit{width:58px;border:0;border-radius:12px;background:#684bbf;color:#fff;font-size:12px;font-weight:850}.talk-comment{position:relative;padding:12px 0;border-top:1px solid #f1edf3}.talk-comment:first-child{border-top:0}.talk-comment-head{display:flex;align-items:center;gap:7px;color:#8f8794;font-size:10px}.talk-comment-head b{color:#4e4854;font-size:11.5px}.talk-comment-body{min-width:0;max-width:100%;margin-top:5px;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;color:#4b4550;font-size:12.5px;line-height:1.55}.talk-comment-more{position:absolute;right:0;top:8px;width:32px;height:32px;border:0;background:transparent;color:#554e59;font-size:24px;font-weight:900;line-height:28px}.talk-inline-menu{position:fixed;z-index:2147483600;min-width:116px;padding:5px;border:1px solid #e6e0ea;border-radius:11px;background:#fff;box-shadow:0 9px 24px rgba(27,22,33,.16)}.talk-inline-menu button{display:block;width:100%;height:38px;padding:0 11px;border:0;border-radius:8px;background:#fff;text-align:left;color:#4e4853;font-size:11.5px;font-weight:800}.talk-inline-menu button:active{background:#f6f2fa}.talk-inline-menu button.danger{color:#d24a57}.talk-action-list{display:grid;gap:6px;margin-top:4px}.talk-action-list button{height:46px;border:1px solid #e6e0ea;border-radius:12px;background:#fff;color:#4f4854;font-size:12px;font-weight:800}.talk-action-list button.danger{color:#d24a57}.funy-talk-post-mode .pokamo-fab{display:none!important}.funy-talk-post-mode .popular-sort,.funy-talk-post-mode .filters{display:none!important}
html.funy-talk-post-mode:not(.app-shell) .portal-header,html.funy-talk-post-mode:not(.app-shell) .portal-bottom-nav{display:none!important}
html.funy-talk-post-mode:not(.app-shell) .portal-shell{background:#fff!important}
html.funy-talk-post-mode:not(.app-shell) main{padding-top:0!important}
html.funy-talk-post-mode:not(.app-shell) .talk-body{padding:0!important}
html.funy-talk-post-mode:not(.app-shell) #feed{padding:0!important}
.talk-post-web-header{position:sticky;top:0;z-index:80;height:54px;padding:0 14px;display:grid;grid-template-columns:36px 1fr 38px;align-items:center;background:rgba(255,255,255,.97);border-bottom:0;box-shadow:none}
.talk-post-web-header button{width:36px;height:36px;border:0;background:transparent;color:#181720;display:grid;place-items:center;padding:0;cursor:pointer}
.talk-post-web-header #talkPostBack{font:400 28px/30px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.talk-post-web-header #talkPostMore{width:40px;height:40px;font:900 26px/30px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:0}
.talk-post-web-header strong{text-align:left;padding-left:4px;font:800 19px/24px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:-.35px;color:#181720}
.talk-post-web-menu-wrap{position:relative;justify-self:end;overflow:visible}
.talk-post-web-menu{display:block;position:absolute;right:0;top:42px;min-width:118px;padding:5px;border:1px solid #e4dfe7;border-radius:12px;background:#fff;box-shadow:0 10px 26px rgba(30,24,38,.16);z-index:2147482000}
.talk-post-web-menu[hidden]{display:none!important}
.talk-post-web-menu button{display:block;width:100%;height:38px;padding:0 12px;border:0;border-radius:8px;background:#fff;text-align:left;color:#504a54;font:750 11.5px Pretendard,sans-serif}
.talk-post-web-menu button:active{background:#f1ecfb;color:#684bbf}
.talk-post-web-menu button.danger{color:#d24a57}
html.funy-talk-post-mode:not(.app-shell) .talk-post-page{padding:18px 16px 64px;max-width:420px;margin:0 auto}

/* Form sheet: fixed chrome + independent scroll body */
.talk-form-sheet{
  padding:0!important;
  overflow:hidden!important;
  display:flex!important;
  flex-direction:column!important;
  max-height:92dvh!important
}
.talk-form-sheet .talk-community-top{
  position:relative!important;
  top:auto!important;
  z-index:8!important;
  flex:0 0 auto!important;
  margin:0!important;
  padding:0 16px!important;
  background:#fff!important;
  border-radius:24px 24px 0 0!important;
  box-shadow:none!important
}
.talk-form-sheet .talk-community-handle{
  width:38px!important;
  height:4px!important;
  min-width:38px!important;
  min-height:4px!important;
  max-width:38px!important;
  max-height:4px!important;
  margin:9px auto 10px!important;
  border-radius:999px!important;
  background:#d9d5dd!important
}
.talk-form-sheet .talk-community-head{
  position:relative!important;
  top:auto!important;
  z-index:auto!important;
  height:48px!important;
  margin:0!important;
  padding:0!important;
  border-bottom:0!important;
  background:#fff!important
}
.talk-form-sheet .talk-form-scroll{
  flex:1 1 auto!important;
  min-height:0!important;
  overflow-y:auto!important;
  overflow-x:hidden!important;
  overscroll-behavior:contain!important;
  -webkit-overflow-scrolling:touch!important;
  padding:0 16px calc(56px + env(safe-area-inset-bottom))!important;
  background:#fff!important
}

/* TALK form handle lock: spacing belongs to fixed chrome, never to the handle itself */
.talk-form-sheet .talk-community-top{
  padding:9px 16px 0!important;
  overflow:hidden!important
}
.talk-form-sheet .talk-community-handle{
  margin:0 auto 10px!important;
  transform:none!important;
  translate:none!important;
  flex:0 0 4px!important
}
.talk-form-sheet .talk-form-scroll{
  padding:0 16px 16px!important
}
.talk-form-sheet .talk-form-footer{
  position:relative!important;
  z-index:12!important;
  flex:0 0 auto!important;
  padding:10px 16px calc(max(env(safe-area-inset-bottom,0px),16px) + 8px)!important;
  background:#fff!important;
  border-top:1px solid #f1edf3!important;
  box-shadow:0 -8px 22px rgba(32,24,44,.06)!important
}
.talk-form-sheet .talk-form-footer .talk-submit{
  width:100%!important;
  margin:0!important
}
html.app-shell .talk-form-sheet .talk-form-footer{
  padding-bottom:calc(max(var(--funy-native-safe-bottom,0px),env(safe-area-inset-bottom,0px),40px) + 8px)!important
}
`;document.head.appendChild(style);

let talkToastTimer;
function talkToast(message){let el=document.getElementById('talkToast');if(!el){el=document.createElement('div');el.id='talkToast';el.setAttribute('role','status');el.setAttribute('aria-live','polite');document.body.appendChild(el);}el.textContent=message;el.classList.add('show');clearTimeout(talkToastTimer);talkToastTimer=setTimeout(()=>el.classList.remove('show'),2600);}
const detailStyle=document.createElement('style');detailStyle.textContent=`
.card .talk-card-counts{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:8px;color:#9a919f;font-size:10px;margin-top:-4px}.card .talk-card-counts>span:last-child{width:88px;flex:none;text-align:right}.card .thumb-stack{grid-column:2;grid-row:1;align-self:center}.talk-thumb-empty{grid-column:2;grid-row:1}.talk-post-author{display:flex;align-items:center;gap:10px;margin:4px 0 22px}.talk-author-avatar{width:38px;height:38px;border-radius:50%;object-fit:cover;flex:none;background:#eee9f3}.talk-avatar-default{position:relative;overflow:hidden}.talk-avatar-default:before{content:'';position:absolute;left:14px;top:8px;width:10px;height:10px;border-radius:50%;background:#bbb3c3}.talk-avatar-default:after{content:'';position:absolute;left:8px;bottom:5px;width:22px;height:13px;border-radius:14px 14px 5px 5px;background:#bbb3c3}.talk-post-author>div{display:flex;flex-direction:column;gap:5px;min-width:0}.talk-post-author b{font-size:13px;color:#403749}.talk-post-author time{font-size:11px;color:#9a919f}.talk-post-page .talk-engagement{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:18px 0 0;padding:12px 0 16px;border-bottom:1px solid #eeeaf2;font-size:12px}.talk-engagement>div{display:flex;align-items:center;gap:16px}.talk-engagement .talk-like-btn{border:0;background:none;padding:0;height:36px;font-size:12px;color:#8f8794;border-radius:0}.talk-engagement .talk-like-btn.is-on{background:none;color:#7961ab}.talk-post-page .talk-comments{margin-top:0;border-top:0}#talkToast{position:fixed;z-index:2147483600;left:50%;bottom:calc(90px + env(safe-area-inset-bottom));transform:translateX(-50%);width:max-content;max-width:calc(100% - 40px);padding:12px 18px;border-radius:12px;background:#302838ed;color:white;font-size:12px;opacity:0;pointer-events:none;transition:opacity .2s}#talkToast.show{opacity:1}

.talk-list-author{display:flex;align-items:center;gap:4px}.talk-list-author svg{width:13px;height:13px;flex:none;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}.talk-card-counts .talk-count-left{display:flex;gap:14px}.talk-count-left>span{display:inline-flex;align-items:center;gap:4px}.talk-count-left svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}html.funy-talk-post-mode #talkCommentForm{position:fixed;left:50%;transform:translateX(-50%);bottom:var(--talk-keyboard-offset,0px);width:min(100%,420px);padding:12px 16px calc(12px + env(safe-area-inset-bottom));border-top:1px solid #eeeaf2;background:white;z-index:85}.talk-post-page #talkCommentForm .talk-comment-form{margin:0;align-items:center}.talk-post-page .talk-comment-input{height:44px;min-height:44px;max-height:96px;line-height:22px;background:white}.talk-post-page .talk-comment-submit{height:44px;flex:none}.talk-post-page .talk-comments{padding-bottom:calc(100px + env(safe-area-inset-bottom))}.talk-comments-empty{text-align:center;padding:24px 0;color:#99909f;font-size:12px}.talk-comments-empty p{margin:0 0 12px}.talk-comments-empty button{display:block;margin:auto;min-height:40px;border:0;border-radius:11px;background:#f0ebf7;color:#7456ad;font-size:12px;font-weight:650;padding:10px 16px}
`;document.head.appendChild(detailStyle);

function syncTalkKeyboard(){const v=window.visualViewport;const offset=v&&document.activeElement?.id==='talkCommentInput'?Math.max(0,window.innerHeight-v.height-v.offsetTop):0;document.documentElement.style.setProperty('--talk-keyboard-offset',offset+'px');}
window.visualViewport?.addEventListener('resize',syncTalkKeyboard);window.visualViewport?.addEventListener('scroll',syncTalkKeyboard);document.addEventListener('focusin',syncTalkKeyboard);document.addEventListener('focusout',()=>setTimeout(syncTalkKeyboard,0));
function modalShell(id,title,body){document.getElementById(id)?.remove();const el=document.createElement('div');el.id=id;el.className='talk-community-modal';const singleDim=id==='funyTalkEditor'||id==='funyTalkPostEdit';if(singleDim){el.dataset.funySingleDim='1';document.documentElement.classList.add('funy-talk-form-open')}const top=`<div class="talk-community-top"><div class="talk-community-handle"></div><div class="talk-community-head"><strong>${esc(title)}</strong><button class="talk-community-close" type="button">×</button></div></div>`;const regularTop=`<div class="talk-community-handle"></div><div class="talk-community-head"><strong>${esc(title)}</strong><button class="talk-community-close" type="button">×</button></div>`;el.innerHTML=`<div class="talk-community-sheet${singleDim?' talk-form-sheet':''}">${singleDim?top+'<div class="talk-form-scroll">'+body+'</div>':regularTop+body}</div>`;if(singleDim){const sheet=el.querySelector('.talk-form-sheet'),scroll=el.querySelector('.talk-form-scroll'),submit=scroll?.querySelector('.talk-submit');if(sheet&&submit){const footer=document.createElement('div');footer.className='talk-form-footer';footer.appendChild(submit);sheet.appendChild(footer)}}const syncAfterClose=()=>{if(!singleDim)return;const stillOpen=!!document.querySelector('.talk-community-modal[data-funy-single-dim="1"]');if(!stillOpen)document.documentElement.classList.remove('funy-talk-form-open');syncTalkFormOverlay(stillOpen)};const close=()=>{el.remove();syncAfterClose()};el.querySelector('.talk-community-close').onclick=close;el.addEventListener('click',e=>{if(e.target===el)close()});document.body.appendChild(el);if(singleDim)syncTalkFormOverlay(true);return el}
function pokamoLimit(n){if(n>=100)return 0;if(n>=50)return 3;if(n>=25)return 6;if(n>=10)return 12;return 30}
async function loadFuny(){const r=await fetch(SB+'/rest/v1/community_posts?select=id,user_id,author_nickname,author_avatar_url,category,title,body,created_at,view_count,like_count,comment_count,report_count,community_post_images(storage_path,sort_order)&status=eq.published&order=created_at.desc&limit=80',{headers:headers(false),cache:'no-store'});if(!r.ok)throw Error('FUNY feed '+r.status);const rows=await r.json();return rows.map(x=>{const imageRows=(x.community_post_images||[]).sort((a,b)=>a.sort_order-b.sort_order),imgs=imageRows.map(i=>publicImage(i.storage_path));return{source:'funy',imageRows,id:x.id,ownerUserId:x.user_id,category:x.category,title:x.title,excerpt:x.body,body:x.body,author:x.author_nickname,avatarUrl:x.author_avatar_url,publishedAt:x.created_at,image:imgs[0]||'',images:imgs,views:Number(x.view_count||0),likes:Number(x.like_count||0),comments:Number(x.comment_count||0),popularityScore:Number(x.like_count||0)*2+Number(x.comment_count||0)*3+Number(x.view_count||0)*.05}})}
async function loadPokamo(){try{const r=await fetch('data/pokamo-feed.json?ts='+Date.now());if(!r.ok)throw Error();const d=await r.json();return(d.items||[]).map(x=>({...x,source:'pokamo'}))}catch(_){return[]}}
async function loadBlockedOwners(){blockedOwners=new Set();if(!uid()||!token())return;try{const r=await fetch(SB+'/rest/v1/community_user_blocks?select=blocked_user_id&blocker_user_id=eq.'+encodeURIComponent(uid()),{headers:headers(true),cache:'no-store'});if(!r.ok)return;const rows=await r.json();blockedOwners=new Set((rows||[]).map(x=>String(x.blocked_user_id||''))) }catch(_){}}
function selectedList(){const visible=mixed.filter(x=>x.source!=='funy'||!blockedOwners.has(String(x.ownerUserId||'')));return current==='인기'?[...visible].sort((a,b)=>popularMode==='likes'?(Number(b.likes)||0)-(Number(a.likes)||0):popularMode==='comments'?(Number(b.comments)||0)-(Number(a.comments)||0):(Number(b.popularityScore)||0)-(Number(a.popularityScore)||0)).filter(x=>(Number(x.popularityScore)||0)>0||(Number(x.likes)||0)>0||(Number(x.comments)||0)>0).slice(0,10):(current==='전체'?visible:visible.filter(x=>x.category===current))}
function pokamoLinkAttrs(){return isAppShell()?'data-pokamo-inapp="1" data-funy-link-source="pokamo"':'target="_blank" rel="noopener noreferrer" data-funy-link-mode="external" data-funy-link-source="pokamo"';}
const talkPersonIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5.5 20c.7-4 3.1-6 6.5-6s5.8 2 6.5 6"/></svg>',talkHeartIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg>',talkCommentIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2Z"/></svg>';
function cardHtml(x){const source=x.source==='funy'?'<span class="funy-source funy">FUNY PIN</span>':'<span class="funy-source pokamo">POKAMO</span>',tags=source+'<span class="funy-category">'+esc(x.category)+'</span>',image=x.image?'<div class="thumb-stack"><img class="thumb" src="'+esc(window.FUNY_EFFICIENCY&&x.source==='funy'&&x.imageRows?.[0]?.storage_path?.split('/').pop().startsWith('fp1-')?x.image+'.thumb.webp':x.image)+'" data-original-src="'+esc(x.image)+'" alt="" loading="lazy">'+(x.images?.length>1?'<span class="thumb-count">+'+(x.images.length-1)+'</span>':'')+'</div>':'<div class="talk-thumb-empty"></div>';
 const stat=n=>Number.isFinite(Number(n))?Math.max(0,Number(n)):'—';
 const body='<div class="talk-card-copy"><div>'+tags+'</div><h2>'+esc(x.title)+'</h2><div class="excerpt">'+esc(x.excerpt)+'</div><div class="meta talk-list-author">'+talkPersonIcon+'<b>'+esc(x.author)+'</b>'+' · '+ago(x.publishedAt)+'</div></div>'+image+'<div class="talk-card-counts"><span class="talk-count-left"><span aria-label="좋아요 '+stat(x.likes)+'">'+talkHeartIcon+stat(x.likes)+'</span><span aria-label="댓글 '+stat(x.comments)+'">'+talkCommentIcon+stat(x.comments)+'</span></span><span>조회 '+stat(x.views)+'</span></div>';
 return x.source==='funy'?'<article class="card funy-post-card" data-funy-post="'+esc(x.id)+'">'+body+'</article>':'<a class="card" href="'+esc(x.url)+'" '+pokamoLinkAttrs()+'>'+body+'</a>';
}

function openBinderShowcase(){current='바인더 자랑';rememberedBinderPages=1;pendingListScroll=0;rememberTalkList();render();}
const binderIntroMonsters=["01-ponanyang","02-bubblelong","03-hatring","04-bulgi","05-namumong","06-ggomagureum","07-bawidong","08-grimjamong","09-beonjjeogi","10-neon","11-longnyang","12-shuffleling","13-neonkong","14-paoring","15-jokerbi"];
const binderIntroMonster=binderIntroMonsters[Math.floor(Math.random()*binderIntroMonsters.length)];
function binderRailHTML(){return '<section class="talk-binder-spotlight" aria-label="인기 바인더 자랑하기"><div class="talk-binder-rail" id="talkBinderRail"><button class="binder-rail-intro" type="button" data-binder-create><b>내 바인더를<br>자랑해보세요</b><img class="binder-rail-art" src="/assets/funymon/'+binderIntroMonster+'.png" alt="퍼니몬" loading="lazy"><span class="binder-rail-plus" aria-hidden="true">+</span></button><div class="binder-rail-status" role="status">인기 바인더를<br>불러오는 중…</div></div></section>';}
function loadBinderCover(client,path,target,title,live){
 const load=()=>{if(!live()||!target.isConnected)return;const task=window.FUNY_EFFICIENCY?window.FUNY_EFFICIENCY.privateImage(client,uid(),path):client.storage.from('binders').download(path).then(r=>{if(r.error)throw r.error;return r.data});
 task.then(blob=>{if(!live()||!target.isConnected)return;const url=URL.createObjectURL(blob);binderURLs.add(url);const image=document.createElement('img');image.src=url;image.alt=title;target.appendChild(image);}).catch(()=>{});};
 if(window.FUNY_EFFICIENCY)window.FUNY_EFFICIENCY.lazy(target,load);else load();
}
window.addEventListener('pagehide',()=>{binderURLs.forEach(url=>URL.revokeObjectURL(url));binderURLs.clear();});
async function renderBinderRail(epoch){
 const rail=document.getElementById('talkBinderRail');if(!rail)return;
 const live=()=>epoch===binderEpoch&&rail.isConnected&&current==='전체';
 rail.querySelector('[data-binder-create]').onclick=()=>{if(!uid()){requestLogin('로그인하고 나만의 바인더를 만들어보세요.');return;}rememberTalkList();const url='/binder.html?view=mine&nativeHeader=1&returnTo=%2Ftalk.html';if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(JSON.stringify({type:'OPEN_INAPP_PAGE',url:location.origin+url,title:'바인더 보관함',showNativeTitle:true}));return;}location.href=url;};
 const more=()=>{rail.insertAdjacentHTML('beforeend','<button class="binder-rail-more" type="button">더 보기 <span aria-hidden="true">›</span></button>');rail.querySelector('.binder-rail-more').onclick=openBinderShowcase;};
 try{
 const auth=window.FUNY_WEB_AUTH;await auth?.init();if(!live())return;
 if(!auth?.session){rail.querySelector('.binder-rail-status').innerHTML='<button type="button" class="binder-rail-login">로그인하고<br>인기 바인더 보기</button>';rail.querySelector('.binder-rail-login').onclick=()=>requestLogin('바인더는 로그인 후 볼 수 있어요.');more();return;}
 const r=await auth.client.rpc('binder_popular_preview');if(r.error)throw r.error;if(!live())return;
 rail.querySelector('.binder-rail-status').remove();
 for(const b of r.data||[]){
 const color=/^#[0-9a-fA-F]{6}$/.test(b.cover_color)?b.cover_color:'#b9a6ca',a=document.createElement('a');a.className='binder-rail-card talk-binder-cover-link';a.href='/binder.html?view=detail&id='+encodeURIComponent(b.id)+'&returnTo=%2Ftalk.html';a.setAttribute('data-funy-link-mode','inapp');a.setAttribute('data-funy-inapp-presentation','page');a.setAttribute('data-funy-native-title-visible','true');a.setAttribute('aria-label',b.title+' 바인더 보기');
 a.innerHTML='<div class="binder-rail-cover binder-cover-depth" style="--cover-color:'+color+'"><b>'+esc(b.title)+'</b><small>MY CARD COLLECTION</small></div><div class="binder-rail-author">'+(/^https:\/\//.test(b.avatar_url||'')?'<img src="'+esc(b.avatar_url)+'" alt="" loading="lazy" referrerpolicy="no-referrer">':'<span class="binder-rail-avatar" aria-hidden="true"></span>')+'<span>'+esc(b.author_nickname||'수집가')+'</span></div>';rail.appendChild(a);
 if(b.cover)loadBinderCover(auth.client,b.cover,a.querySelector('.binder-rail-cover'),b.title,live);
 }
 if(!(r.data||[]).length)rail.insertAdjacentHTML('beforeend','<div class="binder-rail-status">첫 번째 바인더를<br>자랑해보세요.</div>');
 more();
 }catch(_){if(live()){rail.querySelector('.binder-rail-status').textContent='바인더를 불러오지 못했어요.';more();}}
}

function syncTalkFilters(){
 const filters=[...document.querySelectorAll('.filter')];filters.forEach(b=>b.classList.toggle('active',b.dataset.cat===current));
 const active=filters.find(b=>b.dataset.cat===current),track=active?.closest('.filters');
 if(!track?.clientWidth)return;
 const left=active.offsetLeft,right=left+active.offsetWidth;
 if(left<track.scrollLeft+14)track.scrollLeft=Math.max(0,left-14);else if(right>track.scrollLeft+track.clientWidth-14)track.scrollLeft=right-track.clientWidth+14;
}
function render(){syncTalkFilters();popularSort?.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.sort===popularMode));binderEpoch++;binderURLs.forEach(u=>URL.revokeObjectURL(u));binderURLs.clear();const binders=current==='바인더 자랑';document.documentElement.classList.toggle('talk-binder-mode',binders);if(binders){popularSort?.classList.remove('show');renderBinders(binderEpoch);return;}const list=selectedList();popularSort?.classList.toggle('show',current==='인기');feed.innerHTML=list.length?list.map((x,i)=>cardHtml(x)+(current==='전체'&&i===Math.min(9,list.length-1)?binderRailHTML():'')).join(''):'<div class="talk-empty-note">해당 카테고리의 게시글이 없습니다.</div>';feed.querySelectorAll('[data-funy-post]').forEach(el=>el.onclick=()=>openDetail(el.dataset.funyPost));if(current==='전체')renderBinderRail(binderEpoch);restoreTalkScroll()}

const binderStyle=document.createElement('style');binderStyle.textContent=`
html.talk-binder-mode #pokamoFab{display:none!important}.talk-binder-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px 16px;padding:20px 0 30px}.talk-binder-cover{aspect-ratio:3/4;background:linear-gradient(110deg,#0000000c,#ffffff25),var(--cover-color);border-radius:4px 12px 12px 4px;box-shadow:0 6px 16px #37274617;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;text-decoration:none;padding:18px;color:white;text-align:center}.talk-binder-cover:before{content:'';position:absolute;left:8px;top:0;bottom:0;border-left:1px solid #ffffff50}.talk-binder-cover img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.talk-binder-cover b{font-size:17px;overflow-wrap:anywhere}.talk-binder-author{display:flex;align-items:center;gap:6px;margin-top:12px;font-size:11px;min-width:0}.talk-binder-identity{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}.talk-binder-published{display:block;white-space:nowrap;font-size:8px;letter-spacing:-.35px;color:#aaa1af;font-variant-numeric:tabular-nums}.talk-binder-author img,.talk-binder-avatar{width:30px;height:30px;border-radius:50%;background:#eee9f3;object-fit:cover;flex:none}.talk-binder-author span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.talk-binder-more{margin-left:auto;flex:0 0 22px;padding:0;background:none;border:0;min-width:22px;min-height:36px;font-size:24px;color:#82748d}.talk-binder-more{position:relative;display:grid;place-items:center}.talk-binder-more select{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;font-size:16px}.talk-binder-more:focus-within{outline:2px solid #7456ad;border-radius:6px}.talk-binder-meta{font-size:10px;color:#aaa1af;margin-top:5px;line-height:1.6}.talk-binder-retry{border:1px solid #e5dfeb;border-radius:10px;background:white;padding:10px 16px;color:#7456ad}
`;document.head.appendChild(binderStyle);
async function renderBinders(epoch){
 feed.innerHTML='<div class="loading">바인더를 불러오는 중...</div>';
 const live=()=>epoch===binderEpoch;
 try{
 const auth=window.FUNY_WEB_AUTH;await auth?.init();if(!live())return;
 if(!auth?.session){feed.innerHTML='<div class="talk-empty-note">로그인하고 수집가들의 바인더를 만나보세요.<br><br><button class="talk-binder-retry" id="binderLogin">로그인</button></div>';document.getElementById('binderLogin').onclick=()=>requestLogin('바인더는 로그인 후 볼 수 있어요.');return;}
 const db=auth.client;let offset=0,loading=false;feed.innerHTML='<div class="talk-binder-grid" id="talkBinderGrid"></div><div id="talkBinderMore"></div>';
 const load=async()=>{if(loading||!live())return;loading=true;try{
 const r=await db.from('binder_publications').select('*,binder_likes(count),binder_comments(count),binder_views(count)').eq('is_public',true).eq('is_listed',true).eq('hidden',false).order('published_at',{ascending:false}).range(offset,offset+19);if(r.error)throw r.error;if(!live())return;
 const rows=r.data||[],grid=document.getElementById('talkBinderGrid');
 if(!rows.length&&!offset){feed.innerHTML='<div class="talk-empty-note">아직 공개된 바인더가 없어요.<br>보관함에서 자랑하기를 선택하면 이곳에 보여요.</div>';return;}
 for(const b of rows){
 const card=document.createElement('article'),color=/^#[0-9a-fA-F]{6}$/.test(b.cover_color)?b.cover_color:'#b9a6ca';
 card.innerHTML='<a class="talk-binder-cover binder-cover-depth" data-funy-link-mode="inapp" data-funy-inapp-presentation="page" data-funy-native-title-visible="true" style="--cover-color:'+color+'" href="/binder.html?view=detail&id='+encodeURIComponent(b.id)+'&returnTo=%2Ftalk.html" aria-label="'+esc(b.title)+' 보기"><b>'+esc(b.title)+'</b></a><div class="talk-binder-author">'+(/^https:\/\//.test(b.avatar_url||'')?'<img src="'+esc(b.avatar_url)+'" alt="" loading="lazy" referrerpolicy="no-referrer">':'<i class="talk-binder-avatar"></i>')+'<div class="talk-binder-identity"><span>'+esc(b.author_nickname||'수집가')+'</span><time class="talk-binder-published" datetime="'+esc(b.updated_at||b.published_at)+'">'+esc(ago(b.updated_at||b.published_at))+'</time></div>'+(b.user_id===auth.session.user.id?'<label class="talk-binder-more"><span aria-hidden="true">⋮</span><select aria-label="바인더 더보기"><option value="share">공유하기</option><option value="stop">자랑 멈추기</option></select></label>':'')+'</div><div class="talk-binder-meta">좋아요 '+(b.binder_likes?.[0]?.count||0)+' · 댓글 '+(b.binder_comments?.[0]?.count||0)+' · 조회 '+(b.binder_views?.[0]?.count||0)+'</div>';grid.appendChild(card);card.querySelectorAll('.talk-binder-more select').forEach(el=>el.selectedIndex=-1);
 if(b.cover)loadBinderCover(db,b.cover,card.querySelector('a'),b.title+' 표지',live);
 card.querySelector('.talk-binder-more select')?.addEventListener('change',async e=>{
 const select=e.currentTarget,action=select.value;select.value='';
 if(action==='share'){const url=location.origin+'/binder.html?view=detail&id='+encodeURIComponent(b.id);try{if(navigator.share)await navigator.share({title:b.title,text:'한 장씩 모은 나의 컬렉션, 함께 넘겨보세요.',url});else{await navigator.clipboard.writeText(url);alert('바인더 링크를 복사했어요.')}}catch(err){if(err.name!=='AbortError'){const menu=modalShell('talkBinderShare','공유하기','<p class="talk-policy">링크를 복사해 공유해주세요.</p><input readonly aria-label="바인더 공유 링크" value="'+esc(url)+'">');menu.querySelector('input').select();}}return;}
 if(action==='stop'){if(!confirm('바인더 자랑을 멈출까요? 자랑 목록에서만 제외되며 공유한 링크는 유지됩니다.'))return;select.disabled=true;try{const r=await db.from('binder_publications').update({is_listed:false}).eq('id',b.id);if(r.error)throw r.error;if(live())render();}catch(err){alert('자랑을 멈추지 못했어요. 다시 시도해주세요.');select.disabled=false;}}
 });
 }
 offset+=rows.length;const more=document.getElementById('talkBinderMore');more.innerHTML=rows.length===20?'<button class="talk-binder-retry">더 보기</button>':'';more.querySelector('button')?.addEventListener('click',()=>{rememberedBinderPages++;load().catch(fail)});
 }finally{loading=false;}};
 const fail=()=>{if(!live())return;feed.innerHTML='<div class="talk-empty-note">바인더를 불러오지 못했어요.<br><br><button class="talk-binder-retry">다시 시도</button></div>';feed.querySelector('button').onclick=()=>render();};
 await load().catch(fail);for(let page=1;page<rememberedBinderPages&&live()&&document.querySelector('#talkBinderMore button');page++)await load().catch(fail);if(live())restoreTalkScroll();
 }catch(e){if(live()){feed.innerHTML='<div class="talk-empty-note">바인더를 불러오지 못했어요.<br><button class="talk-binder-retry">다시 시도</button></div>';feed.querySelector('button').onclick=()=>render();}}
}

function bindFilters(){document.querySelectorAll('.filter').forEach(b=>b.onclick=()=>{document.querySelectorAll('.filter').forEach(x=>x.classList.remove('active'));b.classList.add('active');current=b.dataset.cat||'전체';rememberedBinderPages=1;rememberTalkList();render()});popularSort?.querySelectorAll('button').forEach(b=>b.onclick=()=>{popularSort.querySelectorAll('button').forEach(x=>x.classList.remove('active'));b.classList.add('active');popularMode=b.dataset.sort||'popular';rememberTalkList();render()})}

const isAppShell=()=>document.documentElement.classList.contains('app-shell')||new URLSearchParams(location.search).get('app')==='1'||!!window.ReactNativeWebView;
let currentPost=null;const viewedPosts=new Set();
function renderAppPostPage(x,pushHash=true){
  if(!x)return;
  if(x.source==='funy'&&blockedOwners.has(String(x.ownerUserId||''))){
    currentPost=null;
    document.documentElement.classList.remove('funy-talk-post-mode');
    if(fab)fab.style.removeProperty('display');
    document.querySelector('.filters')?.removeAttribute('hidden');
    if(popularSort)popularSort.hidden=false;
    if(location.hash)history.replaceState(null,'',location.pathname+location.search);
    render();
    return;
  }
  if(currentPost?.id!==x.id){talkReplyParent=null;talkOpenReplies.clear();}currentPost=x;
  try{window.ReactNativeWebView?.postMessage(JSON.stringify({type:'TALK_POST_CONTEXT',postId:x.id,mine:x.ownerUserId===uid()}))}catch(_){}
  if(pushHash&&location.hash!=='#/post/'+x.id)location.hash='#/post/'+x.id;
  document.documentElement.classList.add('funy-talk-post-mode');
  if(fab)fab.style.setProperty('display','none','important');
  document.querySelector('.filters')?.setAttribute('hidden','');
  if(popularSort)popularSort.hidden=true;
  const imgs=(x.images||[]).map(src=>'<img src="'+esc(src)+'" alt="">').join('');
  const mine=x.ownerUserId===uid();const webHead=!isAppShell()?'<header class="talk-post-web-header"><button id="talkPostBack" type="button" aria-label="뒤로가기">‹</button><span></span><div class="talk-post-web-menu-wrap"><button id="talkPostMore" type="button" aria-label="더보기">⋮</button><div id="talkPostMenu" class="talk-post-web-menu" hidden><button type="button" data-action="share">공유하기</button>'+(mine?'<button type="button" data-action="edit">수정하기</button><button class="danger" type="button" data-action="delete">삭제하기</button>':'<button class="danger" type="button" data-action="report">신고하기</button><button class="danger" type="button" data-action="block">차단하기</button>')+'</div></div></header>':'';
  const authorTime=ago(x.publishedAt);
  const avatar=/^https:\/\//.test(x.avatarUrl||'')?'<img class="talk-author-avatar" src="'+esc(x.avatarUrl)+'" alt="" referrerpolicy="no-referrer">':'<span class="talk-author-avatar talk-avatar-default" aria-hidden="true"></span>';
  feed.innerHTML=webHead+'<article class="talk-post-page"><div class="talk-post-author">'+avatar+'<div><b>'+esc(x.author)+'</b><time datetime="'+esc(x.publishedAt)+'">'+esc(authorTime)+'</time></div></div><h1>'+esc(x.title)+'</h1><div class="talk-detail-body">'+linkify(x.body)+'</div>'+(imgs?'<div class="talk-detail-images">'+imgs+'</div>':'')+'<div class="talk-post-stats talk-engagement"><div><button id="talkLikeBtn" class="talk-like-btn" type="button" aria-pressed="false"><span id="talkLikeIcon" aria-hidden="true">♡</span> <span id="talkLikeCount">좋아요 '+Number(x.likes||0)+'</span></button><span id="talkCommentCount">댓글 '+Number(x.comments||0)+'</span></div><span id="talkViewCount">조회 '+Number(x.views||0)+'</span></div><section class="talk-comments"><h3>댓글</h3><div id="talkCommentForm"></div><div id="talkCommentList"><div class="loading">댓글을 불러오는 중...</div></div></section></article>';
  if(!isAppShell()){
    document.getElementById('talkPostBack')?.addEventListener('click',()=>{if(location.hash)history.back();else exitAppPostPage()});
    const more=document.getElementById('talkPostMore'),menu=document.getElementById('talkPostMenu');
    more?.addEventListener('click',e=>{e.stopPropagation();if(menu)menu.hidden=!menu.hidden});
    menu?.addEventListener('click',e=>{e.stopPropagation();const btn=e.target.closest('[data-action]');if(!btn)return;menu.hidden=true;const action=btn.dataset.action;if(action==='share'){if(navigator.share)navigator.share({title:x.title,url:location.href}).catch(()=>{});else navigator.clipboard?.writeText(location.href).then(()=>alert('링크를 복사했습니다.')).catch(()=>{});return}if(action==='edit'){openPostEdit();return}if(action==='delete'){deleteCurrentPost();return}if(action==='report'){openReportSheet(x.id);return}if(action==='block'){if(window.FUNY_TALK_BLOCK_POST)window.FUNY_TALK_BLOCK_POST(x.id)}});
    const closeMenu=()=>{if(menu)menu.hidden=true};setTimeout(()=>document.addEventListener('click',closeMenu,{once:true}),0);
  }
  window.scrollTo(0,0);
  hydratePostDetail(x);
  maybeOpenRequestedPostEdit(x);
}
function maybeOpenRequestedPostEdit(x){
  try{
    const u=new URL(location.href),editId=u.searchParams.get('editPost');
    if(!editId||String(editId)!==String(x?.id)||String(x?.ownerUserId||'')!==String(uid()||''))return;
    u.searchParams.delete('editPost');
    history.replaceState(null,'',u.pathname+(u.searchParams.toString()?'?'+u.searchParams.toString():'')+u.hash);
    setTimeout(()=>openPostEdit(),0);
  }catch(_){}
}
function exitAppPostPage(){
  currentPost=null;
  document.documentElement.classList.remove('funy-talk-post-mode');
  if(fab)fab.style.removeProperty('display');
  document.querySelector('.filters')?.removeAttribute('hidden');
  if(popularSort)popularSort.hidden=false;
  render();
}
async function fetchPostStats(postId){
  try{const r=await fetch(SB+'/rest/v1/community_posts?select=view_count,like_count,comment_count&id=eq.'+encodeURIComponent(postId)+'&limit=1',{headers:headers(!!token()),cache:'no-store'});if(!r.ok)return null;const rows=await r.json();return rows[0]||null}catch(_){return null}
}
function applyPostStats(stats){
  if(!stats||!currentPost)return;
  currentPost.views=Number(stats.view_count??currentPost.views??0);currentPost.likes=Number(stats.like_count??currentPost.likes??0);currentPost.comments=Number(stats.comment_count??currentPost.comments??0);
  const v=document.getElementById('talkViewCount'),l=document.getElementById('talkLikeCount'),c=document.getElementById('talkCommentCount');
  if(v)v.textContent='조회 '+currentPost.views;if(l)l.textContent='좋아요 '+currentPost.likes;if(c)c.textContent='댓글 '+currentPost.comments;
}

let talkReplyParent=null;const talkOpenReplies=new Set();
function setTalkReply(c){talkReplyParent=c;let target=document.getElementById('talkReplyTarget');if(!target){target=document.createElement('div');target.id='talkReplyTarget';document.getElementById('talkCommentForm')?.prepend(target);}target.hidden=!c;target.innerHTML=c?'<span>'+esc(c.author_nickname)+'님에게 답글 작성 중</span><button type="button" aria-label="답글 취소">×</button>':'';target.querySelector('button')?.addEventListener('click',()=>setTalkReply(null));}
async function commentRequest(path,options={}){const r=await fetch(SB+'/rest/v1/'+path,{...options,headers:{...headers(true),...options.headers},cache:'no-store'});if(!r.ok)throw Error('댓글 요청을 처리하지 못했어요.');const body=await r.text();return body?JSON.parse(body):null;}
async function loadComments(postId){
 const list=document.getElementById('talkCommentList');if(!list)return;
 try{
 const rows=await commentRequest('community_comments?select=id,user_id,author_nickname,author_avatar_url,parent_id,body,created_at,updated_at&post_id=eq.'+encodeURIComponent(postId)+'&status=eq.published&order=created_at.asc');
 const stats=[];for(let i=0;i<rows.length;i+=100)stats.push(...await commentRequest('rpc/community_comment_stats',{method:'POST',body:JSON.stringify({ids:rows.slice(i,i+100).map(c=>c.id)})}));
 if(currentPost?.id!==postId||!list.isConnected)return;
 const byId=new Map(stats.map(x=>[x.comment_id,x]));
 const html=c=>{const st=byId.get(c.id)||{},avatar=/^https:\/\//.test(c.author_avatar_url||'')?'<img class="talk-author-avatar" src="'+esc(c.author_avatar_url)+'" alt="" loading="lazy" referrerpolicy="no-referrer">':'<span class="talk-author-avatar talk-avatar-default" aria-hidden="true"></span>';
 return '<article class="talk-comment" data-comment="'+esc(c.id)+'"><div class="talk-comment-content"><div class="talk-comment-head">'+avatar+'<div class="talk-comment-identity"><b>'+esc(c.author_nickname)+'</b><time datetime="'+esc(c.created_at)+'">'+ago(c.created_at)+'</time></div><button class="talk-comment-more" type="button" data-comment-menu="'+esc(c.id)+'" aria-label="댓글 더보기">⋮</button></div><div class="talk-comment-body">'+esc(c.body)+'</div><div class="talk-comment-social"><button type="button" data-comment-like="'+esc(c.id)+'" aria-pressed="'+!!st.liked+'">'+(st.liked?'♥':'♡')+' 좋아요 '+Number(st.like_count||0)+'</button><button type="button" data-comment-reply="'+esc(c.parent_id||c.id)+'">댓글 '+Number(st.reply_count||0)+'</button></div></div>'+(!c.parent_id&&talkOpenReplies.has(c.id)?'<div class="talk-comment-replies">'+rows.filter(r=>r.parent_id===c.id).map(html).join('')+'</div>':'')+'</article>';};
 list.innerHTML=rows.length?rows.filter(c=>!c.parent_id).map(html).join(''):'<div class="talk-comments-empty"><p>첫 댓글을 남겨보세요.</p><button type="button" id="talkWriteFirst">댓글 쓰기</button></div>';
 list.querySelector('#talkWriteFirst')?.addEventListener('click',()=>document.getElementById('talkCommentInput')?.focus());
 list.querySelectorAll('[data-comment-menu]').forEach(btn=>btn.onclick=e=>{e.stopPropagation();openCommentMenu(rows.find(x=>x.id===btn.dataset.commentMenu),btn)});
 list.querySelectorAll('[data-comment-reply]').forEach(btn=>btn.onclick=async()=>{const c=rows.find(x=>x.id===btn.dataset.commentReply);talkOpenReplies.add(c.id);setTalkReply(c);await loadComments(postId);document.getElementById('talkCommentInput')?.focus();});
 list.querySelectorAll('[data-comment-like]').forEach(btn=>btn.onclick=async()=>{btn.disabled=true;const on=btn.getAttribute('aria-pressed')==='true';try{await commentRequest('community_comment_likes'+(on?'?comment_id=eq.'+encodeURIComponent(btn.dataset.commentLike)+'&user_id=eq.'+encodeURIComponent(uid()):''),{method:on?'DELETE':'POST',headers:{Prefer:'return=minimal'},...(on?{}:{body:JSON.stringify({comment_id:btn.dataset.commentLike,user_id:uid()})})});talkToast(on?'좋아요를 취소했어요.':'좋아요를 눌렀어요.');await loadComments(postId);}catch(e){talkToast(e.message);btn.disabled=false;}});
 if(talkReplyParent&&!rows.some(c=>c.id===talkReplyParent.id))setTalkReply(null);
 }catch(_){list.innerHTML='<div class="talk-empty-note" style="padding:18px 0">댓글을 불러오지 못했어요.</div>';}
}
async function refreshPostInteraction(){
  if(!currentPost)return;
  const stats=await fetchPostStats(currentPost.id);applyPostStats(stats);await loadComments(currentPost.id);
}
async function hydratePostDetail(x){
  if(!viewedPosts.has(x.id)){viewedPosts.add(x.id);try{const r=await fetch(SB+'/rest/v1/rpc/increment_community_post_view',{method:'POST',headers:headers(!!token()),body:JSON.stringify({p_post_id:x.id})});if(r.ok){const n=await r.json();x.views=Number(n||x.views||0)}}catch(_){}}
  const likeBtn=document.getElementById('talkLikeBtn'),form=document.getElementById('talkCommentForm');
  let liked=false;
  if(uid()){try{const r=await fetch(SB+'/rest/v1/community_post_likes?select=post_id&post_id=eq.'+encodeURIComponent(x.id)+'&user_id=eq.'+encodeURIComponent(uid())+'&limit=1',{headers:headers(true),cache:'no-store'});liked=r.ok&&(await r.json()).length>0}catch(_){}}
  const drawLike=()=>{if(!likeBtn)return;likeBtn.classList.toggle('is-on',liked);likeBtn.setAttribute('aria-pressed',String(liked));const icon=likeBtn.querySelector('#talkLikeIcon');if(icon)icon.textContent=liked?'♥':'♡'};
  drawLike();
  if(likeBtn)likeBtn.onclick=async()=>{if(!uid()){requestLogin('좋아요는 로그인 후 이용할 수 있어요.');return}likeBtn.disabled=true;try{if(liked){const r=await fetch(SB+'/rest/v1/community_post_likes?post_id=eq.'+encodeURIComponent(x.id)+'&user_id=eq.'+encodeURIComponent(uid()),{method:'DELETE',headers:{...headers(true),Prefer:'return=minimal'}});if(!r.ok)throw Error();liked=false}else{const r=await fetch(SB+'/rest/v1/community_post_likes',{method:'POST',headers:{...headers(true),Prefer:'return=minimal'},body:JSON.stringify({post_id:x.id,user_id:uid()})});if(!r.ok&&r.status!==409)throw Error();liked=true}drawLike();talkToast(liked?'좋아요를 눌렀어요.':'좋아요를 취소했어요.');await refreshPostInteraction();try{window.FUNY_TRACK?.('talk_post_like',{post_id:x.id,like_state:liked?'on':'off'})}catch(_){}}catch(_){alert('좋아요 처리에 실패했어요.')}finally{likeBtn.disabled=false}};
  if(form){form.innerHTML=uid()?'<div class="talk-comment-form"><textarea id="talkCommentInput" class="talk-comment-input" maxlength="1200" placeholder="댓글을 입력해주세요"></textarea><button id="talkCommentSubmit" class="talk-comment-submit" type="button">등록</button></div>':'<button id="talkCommentLogin" class="talk-like-btn" type="button">로그인 후 댓글 작성</button>';form.querySelector('#talkCommentLogin')?.addEventListener('click',()=>requestLogin('댓글 작성은 로그인 후 이용할 수 있어요.'));const submit=form.querySelector('#talkCommentSubmit');if(submit)submit.onclick=async()=>{const input=form.querySelector('#talkCommentInput'),body=input.value.trim();if(!body)return;submit.disabled=true;try{const r=await fetch(SB+'/rest/v1/community_comments',{method:'POST',headers:{...headers(true),Prefer:'return=minimal'},body:JSON.stringify({post_id:x.id,user_id:uid(),body,parent_id:talkReplyParent?.id||null})});if(!r.ok){const e=await r.json().catch(()=>({}));throw Error(e.message||'댓글 등록 실패')}input.value='';setTalkReply(null);talkToast('댓글을 등록했어요.');await refreshPostInteraction();try{window.FUNY_TRACK?.('talk_comment_create',{post_id:x.id})}catch(_){}}catch(e){alert(e.message||String(e))}finally{submit.disabled=false}}}
  await refreshPostInteraction();
}
function nativeShareCurrent(){try{window.ReactNativeWebView?.postMessage(JSON.stringify({type:'SHARE_URL',url:location.href,title:currentPost?.title||'FUNY TALK'}))}catch(_){}}
function openPostEdit(){
  if(!currentPost||currentPost.ownerUserId!==uid())return;
  const rows=(currentPost.imageRows||[]).map((r,i)=>({...r,url:currentPost.images?.[i]||publicImage(r.storage_path),removed:false}));let files=[];
  const el=modalShell('funyTalkPostEdit','게시물 수정',
    '<div class="talk-field"><label>게시판</label><select id="editPostCategory">'+CATS.map(x=>'<option '+(x===currentPost.category?'selected':'')+'>'+esc(x)+'</option>').join('')+'</select></div>'+
    '<div class="talk-field"><label>제목</label><input id="editPostTitle" maxlength="80" value="'+esc(currentPost.title)+'"></div>'+
    '<div class="talk-field"><label>내용</label><textarea id="editPostBody" maxlength="3000">'+esc(currentPost.body)+'</textarea></div>'+
    '<div class="talk-field"><label>사진 <small>(최대 3장 · 장당 5MB)</small></label><label class="talk-photo-btn" id="editPostPhotoBtn" for="editPostPhotos"><span><b>사진 추가</b><small>이미지를 선택해주세요</small></span></label><input class="talk-photo-input" id="editPostPhotos" type="file" accept="image/jpeg,image/png,image/webp" multiple><div class="talk-photo-list" id="editPhotoList"></div></div>'+
    '<div class="talk-policy">카드 거래 게시물은 FUNY PIN 자체 게시판에서 지원하지 않습니다.</div><button id="editPostSave" class="talk-submit" type="button">수정 완료</button>');
  const input=el.querySelector('#editPostPhotos'),list=el.querySelector('#editPhotoList'),photoBtn=el.querySelector('#editPostPhotoBtn');
  const activeRows=()=>rows.filter(r=>!r.removed);
  const draw=()=>{const total=activeRows().length+files.length;if(photoBtn)photoBtn.style.display=total>=3?'none':'flex';list.innerHTML=activeRows().map((r,i)=>'<div class="talk-photo-item"><img src="'+esc(r.url)+'"><button type="button" data-old="'+i+'">×</button></div>').join('')+files.map((f,i)=>'<div class="talk-photo-item"><img src="'+URL.createObjectURL(f)+'"><button type="button" data-new="'+i+'">×</button></div>').join('');list.querySelectorAll('[data-old]').forEach(b=>b.onclick=()=>{activeRows()[Number(b.dataset.old)].removed=true;draw()});list.querySelectorAll('[data-new]').forEach(b=>b.onclick=()=>{files.splice(Number(b.dataset.new),1);draw()})};
  input.onchange=()=>{for(const file of [...input.files]){if(activeRows().length+files.length>=3)break;if(!['image/jpeg','image/png','image/webp'].includes(file.type)){alert('JPG, PNG, WebP 이미지만 첨부할 수 있어요.');continue}if(file.size>5*1024*1024){alert('이미지는 장당 5MB 이하만 첨부할 수 있어요.');continue}files.push(file)}input.value='';draw()};draw();
  el.querySelector('#editPostSave').onclick=async e=>{const btn=e.currentTarget,category=el.querySelector('#editPostCategory').value,title=el.querySelector('#editPostTitle').value.trim(),body=el.querySelector('#editPostBody').value.trim();if(!title||!body){alert('제목과 내용을 입력해주세요.');return}btn.disabled=true;btn.textContent='수정 중…';try{
    const pr=await fetch(SB+'/rest/v1/community_posts?id=eq.'+encodeURIComponent(currentPost.id)+'&user_id=eq.'+encodeURIComponent(uid()),{method:'PATCH',headers:{...headers(true),Prefer:'return=minimal'},body:JSON.stringify({category,title,body,updated_at:new Date().toISOString()})});if(!pr.ok)throw Error('수정에 실패했습니다.');
    for(const row of rows.filter(r=>r.removed)){await fetch(SB+'/rest/v1/community_post_images?post_id=eq.'+encodeURIComponent(currentPost.id)+'&storage_path=eq.'+encodeURIComponent(row.storage_path),{method:'DELETE',headers:{...headers(true),Prefer:'return=minimal'}})}
    let order=activeRows().length;
    for(let i=0;i<files.length;i++){const path=await uploadPostImage(files[i],currentPost.id,i);const ir=await fetch(SB+'/rest/v1/community_post_images',{method:'POST',headers:{...headers(true),Prefer:'return=minimal'},body:JSON.stringify({post_id:currentPost.id,user_id:uid(),storage_path:path,sort_order:order++})});if(!ir.ok)throw Error('이미지 정보를 저장하지 못했습니다.')}
    el.remove();await refresh();
  }catch(err){alert(err.message||String(err))}finally{btn.disabled=false;btn.textContent='수정 완료'}};
}
async function deleteCurrentPost(){
  if(!currentPost||currentPost.ownerUserId!==uid())return;if(!confirm('게시물을 삭제할까요?'))return;
  try{const id=currentPost.id,r=await fetch(SB+'/rest/v1/community_posts?id=eq.'+encodeURIComponent(id)+'&user_id=eq.'+encodeURIComponent(uid()),{method:'PATCH',headers:{...headers(true),Prefer:'return=minimal'},body:JSON.stringify({status:'deleted',updated_at:new Date().toISOString()})});if(!r.ok)throw Error('삭제에 실패했습니다.');mixed=mixed.filter(v=>v.id!==id);location.hash='';exitAppPostPage();try{window.FUNY_TRACK?.('talk_post_delete',{post_id:id})}catch(_){}}catch(e){alert(e.message||String(e))}
}
function openPostMenu(){
  if(!currentPost)return;const mine=currentPost.ownerUserId===uid(),el=modalShell('funyTalkPostMenu','더보기','<div class="talk-action-list"><button type="button" data-action="share">공유하기</button>'+(mine?'<button type="button" data-action="edit">수정하기</button><button class="danger" type="button" data-action="delete">삭제하기</button>':'<button class="danger" type="button" data-action="report">신고하기</button>')+'</div>');
  el.querySelector('[data-action="share"]').onclick=()=>{el.remove();nativeShareCurrent()};el.querySelector('[data-action="edit"]')?.addEventListener('click',()=>{el.remove();openPostEdit()});el.querySelector('[data-action="delete"]')?.addEventListener('click',()=>{el.remove();deleteCurrentPost()});el.querySelector('[data-action="report"]')?.addEventListener('click',()=>{el.remove();openReportSheet(currentPost.id)});
}
function closeInlineMenus(){document.querySelectorAll('.talk-inline-menu').forEach(x=>x.remove())}
function openInlineMenu(anchor,items){
  closeInlineMenus();const r=anchor.getBoundingClientRect(),menu=document.createElement('div');menu.className='talk-inline-menu';
  menu.innerHTML=items.map((x,i)=>'<button type="button" data-i="'+i+'" class="'+(x.danger?'danger':'')+'">'+esc(x.label)+'</button>').join('');
  document.body.appendChild(menu);const mw=menu.offsetWidth||116,mh=menu.offsetHeight||80;menu.style.left=Math.max(8,Math.min(window.innerWidth-mw-8,r.right-mw))+'px';menu.style.top=Math.max(8,Math.min(window.innerHeight-mh-8,r.bottom+4))+'px';
  menu.querySelectorAll('[data-i]').forEach(btn=>btn.onclick=e=>{e.stopPropagation();const item=items[Number(btn.dataset.i)];menu.remove();item?.run?.()});
  const close=e=>{if(!menu.contains(e.target)&&e.target!==anchor){menu.remove();document.removeEventListener('click',close,true)}};setTimeout(()=>document.addEventListener('click',close,true),0);
}
function openCommentMenu(comment,anchor){
  if(!comment||!anchor)return;const mine=comment.user_id===uid(),items=mine?[
    {label:'수정하기',run:()=>openCommentEdit(comment)},
    {label:'삭제하기',danger:true,run:async()=>{if(!confirm('댓글을 삭제할까요? 작성된 답글도 함께 삭제됩니다.'))return;const r=await fetch(SB+'/rest/v1/community_comments?id=eq.'+encodeURIComponent(comment.id)+'&user_id=eq.'+encodeURIComponent(uid()),{method:'DELETE',headers:{...headers(true),Prefer:'return=minimal'}});if(r.ok){talkToast('댓글을 삭제했어요.');await refreshPostInteraction();}else talkToast('댓글 삭제에 실패했습니다.')}}
  ]:[{label:'신고하기',danger:true,run:()=>openCommentReport(comment.id)}];
  openInlineMenu(anchor,items);
}
function openCommentEdit(comment){
  const el=modalShell('funyCommentEdit','댓글 수정','<div class="talk-field"><textarea id="editCommentBody" maxlength="1200">'+esc(comment.body)+'</textarea></div><button id="editCommentSave" class="talk-submit" type="button">수정 완료</button>');
  el.querySelector('#editCommentSave').onclick=async e=>{const body=el.querySelector('#editCommentBody').value.trim();if(!body)return;e.currentTarget.disabled=true;try{const r=await fetch(SB+'/rest/v1/community_comments?id=eq.'+encodeURIComponent(comment.id)+'&user_id=eq.'+encodeURIComponent(uid()),{method:'PATCH',headers:{...headers(true),Prefer:'return=minimal'},body:JSON.stringify({body})});if(!r.ok)throw Error();el.remove();refreshPostInteraction()}catch(_){alert('댓글 수정에 실패했습니다.')}finally{e.currentTarget.disabled=false}};
}
function openCommentReport(commentId){
  if(!uid()){requestLogin('댓글 신고는 로그인 후 이용할 수 있어요.');return}const reasons=[['spam','도배 · 광고'],['abuse','욕설 · 괴롭힘'],['inappropriate','부적절한 콘텐츠'],['privacy','개인정보 노출'],['other','기타']],el=modalShell('funyCommentReport','댓글 신고','<p class="talk-policy">신고 사유를 선택해주세요.</p><div class="talk-report-options">'+reasons.map(([v,l])=>'<button type="button" data-reason="'+v+'">'+l+'</button>').join('')+'</div>');el.querySelectorAll('[data-reason]').forEach(btn=>btn.onclick=async()=>{btn.disabled=true;try{const r=await fetch(SB+'/rest/v1/community_comment_reports',{method:'POST',headers:{...headers(true),Prefer:'return=minimal'},body:JSON.stringify({comment_id:commentId,reporter_user_id:uid(),reason:btn.dataset.reason})});if(!r.ok){if(r.status===409)throw Error('이미 신고한 댓글이에요.');throw Error('신고 처리에 실패했습니다.')}el.remove();alert('신고가 접수되었습니다.');try{window.FUNY_TRACK?.('talk_comment_report',{comment_id:commentId,reason:btn.dataset.reason})}catch(_){}}catch(e){alert(e.message||String(e))}finally{btn.disabled=false}});
}

window.addEventListener('funy:native-talk-edit',()=>openPostEdit());
window.addEventListener('funy:native-talk-delete',()=>deleteCurrentPost());
window.addEventListener('funy:native-talk-report',()=>{if(currentPost?.id)openReportSheet(currentPost.id)});
window.addEventListener('funy:native-talk-block',(e)=>{const postId=String(e?.detail?.postId||currentPost?.id||'');if(postId&&window.FUNY_TALK_BLOCK_POST)window.FUNY_TALK_BLOCK_POST(postId)});
function handleBlockedOwner(owner,postId=''){
  owner=String(owner||'');postId=String(postId||'');if(!owner)return;
  blockedOwners.add(owner);
  const viewingBlocked=currentPost&&(String(currentPost.ownerUserId||'')===owner||(postId&&String(currentPost.id||'')===postId));
  if(viewingBlocked){
    try{history.replaceState(null,'',location.pathname+location.search.replace(/([?&])editPost=[^&]*&?/,'$1').replace(/[?&]$/,''))}catch(_){if(location.hash)location.hash=''}
    exitAppPostPage();
    window.scrollTo(0,0);
    return;
  }
  render();
}
window.FUNY_TALK_HANDLE_BLOCKED_OWNER=handleBlockedOwner;
window.addEventListener('funy:native-talk-blocked',e=>handleBlockedOwner(e?.detail?.ownerId,e?.detail?.postId));/* funy:native-talk-blocked-feed */
function openReportSheet(postId){
  if(!token()||!uid()){requestLogin('게시물 신고는 로그인 후 이용할 수 있어요.');return}
  const reasons=[['spam','도배 · 광고'],['abuse','욕설 · 괴롭힘'],['inappropriate','부적절한 콘텐츠'],['privacy','개인정보 노출'],['other','기타']];
  const el=modalShell('funyTalkReportSheet','게시물 신고',`<p class="talk-policy">신고 사유를 선택해주세요. 신고 내용은 LIVE PIN 신고와 별도로 관리됩니다.</p><div class="talk-report-options">${reasons.map(([v,l])=>'<button type="button" data-reason="'+v+'">'+l+'</button>').join('')}</div>`);
  el.querySelectorAll('[data-reason]').forEach(btn=>btn.onclick=async()=>{btn.disabled=true;try{const r=await fetch(SB+'/rest/v1/community_post_reports',{method:'POST',headers:{...headers(true),Prefer:'return=minimal'},body:JSON.stringify({post_id:postId,reporter_user_id:uid(),reason:btn.dataset.reason})});if(!r.ok){const e=await r.json().catch(()=>({}));if(r.status===409)throw Error('이미 신고한 게시물이에요.');throw Error(e.message||'신고 처리에 실패했습니다.')}try{(window.FUNY_TRACK||((n,p)=>window.gtag?.('event',n,p)))('talk_post_report',{reason:btn.dataset.reason,post_id:postId})}catch(_){}el.remove();alert('신고가 접수되었습니다.')}catch(e){alert(e.message||String(e))}finally{btn.disabled=false}})
}
window.addEventListener('hashchange',()=>{const m=location.hash.match(/^#\/post\/([^/?#]+)/);if(m){const x=mixed.find(v=>String(v.id)===decodeURIComponent(m[1])&&v.source==='funy');if(x)renderAppPostPage(x,false)}else if(currentPost)exitAppPostPage()});
async function openDetail(id){const x=mixed.find(v=>v.source==='funy'&&v.id===id);if(!x)return;if(window.FUNY_WEB_AUTH&&!isAppShell())try{await window.FUNY_WEB_AUTH.init()}catch(_){}if(!uid()||!token()){requestLogin('게시물 상세보기는 로그인 후 이용할 수 있어요.');return}renderAppPostPage(x,true);try{window.FUNY_TRACK?.('talk_post_open',{post_id:x.id,detail_mode:'page'})}catch(_){}}
function openReport(postId,parent){if(!token()||!uid()){requestLogin('게시물 신고는 로그인 후 이용할 수 있어요.');return}const reasons=[['spam','도배 · 광고'],['abuse','욕설 · 괴롭힘'],['inappropriate','부적절한 콘텐츠'],['privacy','개인정보 노출'],['other','기타']],wrap=document.createElement('div');wrap.className='talk-report-options';wrap.innerHTML=reasons.map(([v,l])=>`<button type="button" data-reason="${v}">${l}</button>`).join('');parent.querySelector('.talk-report-options')?.remove();parent.querySelector('.talk-community-sheet').appendChild(wrap);wrap.querySelectorAll('button').forEach(btn=>btn.onclick=async()=>{btn.disabled=true;try{const r=await fetch(SB+'/rest/v1/community_post_reports',{method:'POST',headers:{...headers(true),Prefer:'return=minimal'},body:JSON.stringify({post_id:postId,reporter_user_id:uid(),reason:btn.dataset.reason})});if(!r.ok){const e=await r.json().catch(()=>({}));if(r.status===409)throw Error('이미 신고한 게시물이에요.');throw Error(e.message||'신고 처리에 실패했습니다.')}alert('신고가 접수되었습니다.');wrap.remove()}catch(e){alert(e.message||String(e))}finally{btn.disabled=false}})}
function openEditor(){if(!token()||!uid()){requestLogin('게시물 등록은 로그인 후 이용할 수 있어요.');return}const el=modalShell('funyTalkEditor','게시물 등록',`<div class="talk-field"><label>게시판</label><select id="funyPostCategory">${CATS.map(x=>`<option>${x}</option>`).join('')}</select></div><div class="talk-field"><label>제목</label><input id="funyPostTitle" maxlength="80" placeholder="제목을 입력해주세요"></div><div class="talk-field"><label>내용</label><textarea id="funyPostBody" maxlength="3000" placeholder="함께 나누고 싶은 이야기를 적어주세요"></textarea></div><div class="talk-field"><label>사진</label><label class="talk-photo-btn" id="funyPostPhotoBtn" for="funyPostPhotos"><span><b>사진 첨부</b><small>최대 3장 · 장당 5MB</small></span></label><input class="talk-photo-input" id="funyPostPhotos" type="file" accept="image/jpeg,image/png,image/webp" multiple><div class="talk-photo-list" id="funyPhotoList"></div></div><div class="talk-policy">도배 방지를 위해 1분에 1개, 시간당 최대 5개까지 등록할 수 있어요. 카드 거래 게시물은 FUNY PIN 자체 게시판에서 지원하지 않습니다.</div><button class="talk-submit" id="funyPostSubmit" type="button">등록하기</button>`);const input=el.querySelector('#funyPostPhotos'),list=el.querySelector('#funyPhotoList'),photoBtn=el.querySelector('#funyPostPhotoBtn');let files=[];const draw=()=>{if(photoBtn){const b=photoBtn.querySelector('b');if(b)b.textContent=files.length?'사진 추가 ('+files.length+'/3)':'사진 첨부'}list.innerHTML=files.map((f,i)=>`<div class="talk-photo-item"><img src="${URL.createObjectURL(f)}"><button type="button" data-i="${i}">×</button></div>`).join('');list.querySelectorAll('button').forEach(b=>b.onclick=()=>{files.splice(Number(b.dataset.i),1);draw()})};input.onchange=()=>{for(const f of [...input.files]){if(files.length>=3)break;if(!['image/jpeg','image/png','image/webp'].includes(f.type)){alert('JPG, PNG, WebP 이미지만 첨부할 수 있어요.');continue}if(f.size>5*1024*1024){alert('이미지는 장당 5MB 이하만 첨부할 수 있어요.');continue}files.push(f)}draw();input.value=''};el.querySelector('#funyPostSubmit').onclick=async e=>{const btn=e.currentTarget,category=el.querySelector('#funyPostCategory').value,title=el.querySelector('#funyPostTitle').value.trim(),body=el.querySelector('#funyPostBody').value.trim();if(!title||!body){alert('제목과 내용을 입력해주세요.');return}btn.disabled=true;btn.textContent='등록 중…';try{const r=await fetch(SB+'/rest/v1/community_posts',{method:'POST',headers:{...headers(true),Prefer:'return=representation'},body:JSON.stringify({user_id:uid(),author_nickname:'-',category,title,body})}),data=await r.json().catch(()=>[]);if(!r.ok){const msg=String(data.message||'');if(msg.includes('POST_RATE_LIMIT_HOURLY'))throw Error('시간당 최대 5개의 게시물을 등록할 수 있어요.');if(msg.includes('POST_RATE_LIMIT_SHORT'))throw Error('게시물은 1분 간격으로 등록할 수 있어요.');throw Error(msg||'게시물 등록에 실패했습니다.')}const post=Array.isArray(data)?data[0]:data;if(!post?.id)throw Error('게시물 등록 결과를 확인하지 못했습니다.');for(let i=0;i<files.length;i++){const path=await uploadPostImage(files[i],post.id,i);const ir=await fetch(SB+'/rest/v1/community_post_images',{method:'POST',headers:{...headers(true),Prefer:'return=minimal'},body:JSON.stringify({post_id:post.id,user_id:uid(),storage_path:path,sort_order:i})});if(!ir.ok)throw Error('이미지 정보를 저장하지 못했습니다.')}el.remove();current='전체';document.querySelectorAll('.filter').forEach(x=>x.classList.toggle('active',x.dataset.cat==='전체'));await refresh();window.scrollTo({top:0,behavior:'smooth'});try{(window.FUNY_TRACK||((n,p)=>window.gtag?.('event',n,p)))('talk_post_create',{category,has_images:files.length>0,image_count:files.length})}catch(_){}alert('게시물이 등록되었습니다.')}catch(err){alert(err.message||String(err))}finally{btn.disabled=false;btn.textContent='등록하기'}}}
async function refresh(){if(!currentPost&&pendingListScroll===null&&feed.querySelector('.talk-binder-grid'))pendingListScroll=window.scrollY||0;feed.innerHTML='<div class="loading">최신 이야기를 불러오는 중...</div>';await loadBlockedOwners();const [funy,pokamo]=await Promise.all([loadFuny().catch(()=>[]),loadPokamo()]);mixed=[...funy,...pokamo.slice(0,pokamoLimit(funy.length))].sort((a,b)=>new Date(b.publishedAt)-new Date(a.publishedAt));const m=location.hash.match(/^#\/post\/([^/?#]+)/);if(m){const x=mixed.find(v=>String(v.id)===decodeURIComponent(m[1])&&v.source==='funy');if(x){if(window.FUNY_WEB_AUTH&&!isAppShell())try{await window.FUNY_WEB_AUTH.init()}catch(_){}if(!uid()||!token()){requestLogin('게시물 상세보기는 로그인 후 이용할 수 있어요.');return}renderAppPostPage(x,false);return}}render()}
if(fab){fab.removeAttribute('href');fab.removeAttribute('target');fab.removeAttribute('rel');fab.removeAttribute('data-funy-link-mode');fab.removeAttribute('data-funy-link-source');fab.setAttribute('role','button');fab.setAttribute('tabindex','0');fab.setAttribute('aria-label','게시물 등록');const full=fab.querySelector('.fab-full'),mini=fab.querySelector('.fab-plus');if(full)full.textContent='+ 게시물 등록';if(mini)mini.textContent='+';fab.onclick=e=>{e.preventDefault();try{(window.FUNY_TRACK||((n,p)=>window.gtag?.('event',n,p)))('floating_action_click',{action_name:'talk_post_create'})}catch(_){}openEditor()}}
let reloadingTalk=false;
async function reloadTalk(){if(reloadingTalk)return;reloadingTalk=true;try{if(currentPost)exitAppPostPage();if(location.hash.startsWith('#/post/'))history.replaceState(null,'',location.pathname+location.search);document.querySelectorAll('.talk-community-modal').forEach(el=>el.remove());document.querySelectorAll('.filters,.popular-sort').forEach(el=>el.classList.remove('is-hidden'));current='전체';popularMode='popular';pendingListScroll=0;rememberedBinderPages=1;window.scrollTo(0,0);rememberTalkList();render();await refresh();window.scrollTo(0,0);}finally{reloadingTalk=false;}}
window.addEventListener('funy:talk-reselect',reloadTalk);
document.querySelector('.portal-bottom-nav a[href="talk.html"]')?.addEventListener('click',e=>{if(currentPost)return;e.preventDefault();e.stopPropagation();void reloadTalk();});
bindFilters();refresh();
if(window.FUNY_WEB_AUTH&&!isAppShell()){
  window.FUNY_WEB_AUTH.init().then(()=>refresh()).catch(()=>{});
  window.FUNY_WEB_AUTH.onChange(()=>refresh());
}
})();

new MutationObserver(()=>{const formOpen=!!document.querySelector('.talk-community-modal[data-funy-single-dim="1"]');if(!formOpen)document.documentElement.classList.remove('funy-talk-form-open');try{window.__FUNY_TALK_FORM_OVERLAY_SYNC?.(formOpen)}catch(_){}}).observe(document.body,{childList:true,subtree:false});
