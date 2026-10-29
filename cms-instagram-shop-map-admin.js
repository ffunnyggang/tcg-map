/* New registrations only. This module never writes CMS rows or scans old content. */
(()=>{'use strict';
function canonical(value){try{const u=new URL(value);return u.protocol==='https:'&&['instagram.com','www.instagram.com'].includes(u.hostname)&&!u.username&&!u.password&&!u.port&&/^\/(p|reel)\/[A-Za-z0-9_-]{1,100}\/?$/.test(u.pathname)?'https://www.instagram.com'+u.pathname.replace(/\/?$/,'/'):null}catch{return null}}
function mount({isNew,urlInput,shopSelect,lookup}){
 if(!isNew)return {settle:async()=>{},destroy(){}};
 const note=document.createElement('p');note.className='cms-final-note';note.setAttribute('role','status');note.setAttribute('aria-live','polite');shopSelect.after(note);
 let manual=!!shopSelect.value,autoValue='',lastUrl='',timer=null,pending=null,controller=null,seq=0,closed=false;
 const status=s=>note.textContent=s;
 function invalidate(){++seq;clearTimeout(timer);timer=null;controller?.abort();controller=null}
 async function run(){clearTimeout(timer);timer=null;const url=canonical(urlInput.value);if(!url||manual||closed)return;const ticket=++seq;controller?.abort();controller=new AbortController();status('Instagram 계정과 연결된 카드샵을 확인 중입니다.');const task=(async()=>{try{const result=await lookup(url,controller.signal);if(closed||ticket!==seq||manual||canonical(urlInput.value)!==url)return;if(result.status==='matched'&&result.shop?.id){const option=[...shopSelect.options].find(o=>o.value===result.shop.id);if(!option){status('연결 가능한 카드샵이 없습니다. 직접 선택해주세요.');return}shopSelect.value=result.shop.id;autoValue=result.shop.id;status(option.textContent+' · '+(result.source==='collected_url'?'수집된 게시물 URL':'Instagram 계정')+'로 자동 연결됨 · 변경 가능');}else{shopSelect.value='';autoValue='';status(result.reason==='ambiguous'?'동일 계정의 매장 또는 작성자가 여러 곳입니다. 카드샵을 직접 선택해주세요.':'연결된 카드샵을 확인하지 못했습니다. 직접 선택해주세요.')}}catch(e){if(ticket===seq&&e.name!=='AbortError')status('카드샵 자동 조회에 실패했습니다. 직접 선택해주세요.')}finally{if(pending===task)pending=null}})();pending=task;await task}
 function input(){const url=canonical(urlInput.value);if(url===lastUrl)return;lastUrl=url;invalidate();if(autoValue&&shopSelect.value===autoValue)shopSelect.value='';autoValue='';if(manual){status('직접 선택한 카드샵을 유지합니다.');return}if(!url){status('');return}status('Instagram 카드샵 자동 연결 대기 중입니다.');timer=setTimeout(()=>{void run()},500)}
 function chosen(){manual=true;autoValue='';invalidate();status('직접 선택한 카드샵을 사용합니다.');}
 urlInput.addEventListener('input',input);shopSelect.addEventListener('change',chosen);input();
 return {async settle(){if(closed||manual)return;if(timer)await run();else if(pending)await pending},destroy(){closed=true;invalidate();urlInput.removeEventListener('input',input);shopSelect.removeEventListener('change',chosen);note.remove()}};
}
window.FunyCmsInstagramShopMap={canonical,mount};})();
