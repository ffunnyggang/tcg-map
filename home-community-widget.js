/* CMS movable HOME TALK and collection blocks. */
(function(){
'use strict';
function start(){
 const flow=document.querySelector('.home-content-flow');if(!flow||window.FUNY_HOME_COMMUNITY)return;
 const shared=window.FUNY_TALK_SHARED;if(!shared)return;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const intentKey='funypin:talk:pending-tab:v1',binderURLs=new Set();
 let mode='popular',posts=[],postsEpoch=0,binderEpoch=0,postsStarted=false,binderStarted=false,authReady=false;
 const talk=document.createElement('section'),binders=document.createElement('section');talk.id='homePopularTalk';binders.id='homeCardCollections';
 for(const el of [talk,binders]){el.className='home-community-block';el.hidden=true;}
 const heading=(title,tab)=>'<div class="home-community-head"><h2>'+title+'</h2><a href="/talk.html'+(tab==='binders'?'?tab=binders':'')+'" data-home-talk-menu="'+tab+'">더보기 ›</a></div>';
 talk.setAttribute('aria-label','인기 TALK');talk.innerHTML=heading('인기 TALK','all')+'<div class="home-talk-tabs" role="tablist" aria-label="인기 TALK 정렬">'+[['popular','요즘 인기'],['likes','공감 많은'],['comments','댓글 많은']].map(([key,label],i)=>'<button type="button" role="tab" id="homeTalkTab-'+key+'" data-home-talk-sort="'+key+'" aria-controls="homePopularTalkList" aria-selected="'+(!i)+'" tabindex="'+(i?-1:0)+'">'+label+'</button>').join('')+'</div><div class="home-talk-list" id="homePopularTalkList" role="tabpanel" aria-labelledby="homeTalkTab-popular" aria-live="polite"><p class="home-community-status">이야기를 불러오는 중이에요.</p></div>';
 binders.setAttribute('aria-label','함께 보는 카드 컬렉션');binders.innerHTML=heading('함께 보는 카드 컬렉션','binders')+shared.binderRailHTML();
 function revokeCovers(){binderURLs.forEach(url=>URL.revokeObjectURL(url));binderURLs.clear();}
 function openTalkMenu(e,tab){if(e&&(e.defaultPrevented||e.button>0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey))return;
  const href='/talk.html'+(tab==='binders'?'?tab=binders':'');if(!window.ReactNativeWebView?.postMessage){if(!e)location.href=href;return;}
  e?.preventDefault();e?.stopPropagation();const at=Date.now();try{localStorage.setItem(intentKey,JSON.stringify({tab,at}))}catch(_){}
  try{window.ReactNativeWebView.postMessage(JSON.stringify({type:'OPEN_NATIVE',route:'/(tabs)/talk?__tabRefresh='+at}))}catch(_){try{localStorage.removeItem(intentKey)}catch(_){}location.href=href}
 }
 for(const el of [talk,binders])el.querySelector('[data-home-talk-menu]').addEventListener('click',e=>openTalkMenu(e,e.currentTarget.dataset.homeTalkMenu));
 const sortButtons=[...talk.querySelectorAll('[data-home-talk-sort]')];
 function selectMode(value){mode=value;sortButtons.forEach(b=>{const active=b.dataset.homeTalkSort===mode;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1});talk.querySelector('[role="tabpanel"]').setAttribute('aria-labelledby','homeTalkTab-'+mode);renderPosts();}
 sortButtons.forEach((b,i)=>{b.onclick=()=>selectMode(b.dataset.homeTalkSort);b.onkeydown=e=>{let n;if(e.key==='ArrowRight')n=(i+1)%3;else if(e.key==='ArrowLeft')n=(i+2)%3;else if(e.key==='Home')n=0;else if(e.key==='End')n=2;else return;e.preventDefault();sortButtons[n].focus();selectMode(sortButtons[n].dataset.homeTalkSort)}});
 function renderPosts(){const list=talk.querySelector('.home-talk-list'),rows=shared.rankPosts(posts,mode,3);list.innerHTML=rows.length?rows.map((x,i)=>'<a class="home-talk-card" href="/talk.html#/post/'+encodeURIComponent(x.id)+'" data-funy-link-mode="inapp" data-funy-inapp-presentation="page" data-funy-native-title-visible="false" aria-label="'+esc(x.title)+'"><span class="home-talk-rank">'+(i+1)+'</span><span class="home-talk-copy"><span class="home-talk-category">'+esc(x.category)+'</span><strong>'+esc(x.title)+'</strong><span class="home-talk-meta">'+esc(x.author||'수집가')+' · 공감 '+x.likes+' · 댓글 '+x.comments+'</span></span>'+(x.image?'<img src="'+esc(x.image)+'" alt="" loading="lazy">':'')+'</a>').join(''):'<p class="home-community-status">아직 인기 게시물이 없어요.</p>';}
 async function refreshPosts(){if(!talk.isConnected||!authReady)return;postsStarted=true;const epoch=++postsEpoch;posts=[];talk.querySelector('.home-talk-list').innerHTML='<p class="home-community-status">이야기를 불러오는 중이에요.</p>';
  try{const session=window.FUNY_WEB_AUTH?.session;const [rows,blocked]=await Promise.all([shared.loadPosts(),shared.loadBlockedOwners(session?.user?.id,session?.access_token)]);if(epoch!==postsEpoch||!talk.isConnected)return;posts=rows.filter(x=>!blocked.has(String(x.ownerUserId||'')));renderPosts()}
  catch(_){if(epoch===postsEpoch)talk.querySelector('.home-talk-list').innerHTML='<p class="home-community-status">이야기를 불러오지 못했어요. <button type="button" data-retry>다시 시도</button></p>';talk.querySelector('[data-retry]')?.addEventListener('click',refreshPosts);}
 }
 const uid=()=>String(window.FUNY_WEB_AUTH?.session?.user?.id||'');
 function requestLogin(){if(window.ReactNativeWebView?.postMessage){window.ReactNativeWebView.postMessage(JSON.stringify({type:'OPEN_NATIVE',route:'/login?next=home'}));return;}if(window.FUNY_WEB_AUTH?.goLogin)window.FUNY_WEB_AUTH.goLogin(location.href);else location.href='/login.html';}
 function refreshBinders(){if(!binders.isConnected||!authReady)return;binderStarted=true;const epoch=++binderEpoch;revokeCovers();const previous=binders.querySelector('.talk-binder-spotlight');if(previous)previous.remove();binders.insertAdjacentHTML('beforeend',shared.binderRailHTML());const rail=binders.querySelector('.talk-binder-rail');void shared.renderBinderRail({rail,live:()=>epoch===binderEpoch&&rail.isConnected,uid,requestLogin,rememberTalkList:()=>{},openBinderShowcase:()=>openTalkMenu(null,'binders'),binderURLs,returnTo:'/'});}
 function sync(){for(const [el,selector] of [[talk,'.fp-cms-home-talk-slot'],[binders,'.fp-cms-home-binders-slot']]){const slot=flow.querySelector('[data-cms-placement="home"] '+selector);if(slot){if(el.parentElement!==slot)slot.append(el);el.hidden=false;}else{el.hidden=true;el.remove();if(el===talk&&postsStarted){postsEpoch++;postsStarted=false;}if(el===binders&&binderStarted){binderEpoch++;binderStarted=false;revokeCovers();}}}if(talk.isConnected&&!postsStarted)void refreshPosts();if(binders.isConnected&&!binderStarted)refreshBinders();}
 window.FUNY_HOME_COMMUNITY={sync};const observer=new MutationObserver(sync);observer.observe(flow,{childList:true,subtree:true});sync();
 let refreshTimer;function refresh(){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{void refreshPosts();refreshBinders();},100)}
 const auth=window.FUNY_WEB_AUTH;Promise.resolve(auth?.init()).catch(()=>{}).then(()=>{authReady=true;sync();auth?.onChange(refresh)});
 window.addEventListener('funy:native-talk-blocked',refresh);window.addEventListener('funy:web-auth-change',()=>{if(authReady)refresh()});
 window.addEventListener('pagehide',()=>{observer.disconnect();postsEpoch++;binderEpoch++;postsStarted=false;binderStarted=false;revokeCovers();});
 window.addEventListener('pageshow',e=>{observer.observe(flow,{childList:true,subtree:true});sync();if(e.persisted)refresh();});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&authReady)refresh()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
