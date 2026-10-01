/* FUNY TALK safety controls: hide blocked authors + block from post detail */
(function(){
'use strict';
if(!/\/talk\.html$/.test(location.pathname)||window.__FUNY_TALK_SAFETY)return;
window.__FUNY_TALK_SAFETY=true;
const SB='https://wdttzpbmqavaqfcbaywj.supabase.co';
const KEY='sb_publishable__wrSzngSE-JbGnyE7PZX9w_2QaW8bpq';
const token=()=>String(window.__FUNY_ACCESS_TOKEN||'');
const uid=()=>{try{const raw=token().split('.')[1];if(!raw)return'';const normalized=raw.replace(/-/g,'+').replace(/_/g,'/');const json=decodeURIComponent(Array.from(atob(normalized.padEnd(Math.ceil(normalized.length/4)*4,'='))).map(c=>'%'+c.charCodeAt(0).toString(16).padStart(2,'0')).join(''));return JSON.parse(json).sub||''}catch(_){return''}};
const authHeaders=()=>({apikey:KEY,Authorization:'Bearer '+token(),'Content-Type':'application/json'});
let blocked=new Set(),postOwners=new Map(),lastPostId='';

const style=document.createElement('style');style.textContent='.talk-block-user{margin:9px auto 0;display:block;border:0;background:transparent;color:#a19aa6;font-size:11px;text-decoration:underline}.talk-blocked-note{padding:12px 14px;border-radius:12px;background:#f7f4fa;color:#7e7682;font-size:11px;text-align:center;margin-top:12px}';document.head.appendChild(style);

async function loadState(){
  if(!uid()||!token())return;
  try{
    const [blocksRes,postsRes]=await Promise.all([
      fetch(SB+'/rest/v1/community_user_blocks?select=blocked_user_id&blocker_user_id=eq.'+encodeURIComponent(uid()),{headers:authHeaders()}),
      fetch(SB+'/rest/v1/community_posts?select=id,user_id&status=eq.published&limit=200',{headers:{apikey:KEY}})
    ]);
    if(blocksRes.ok){const rows=await blocksRes.json();blocked=new Set((rows||[]).map(x=>String(x.blocked_user_id)))}
    if(postsRes.ok){const rows=await postsRes.json();postOwners=new Map((rows||[]).map(x=>[String(x.id),String(x.user_id)]))}
    applyHidden();
  }catch(_){}
}
function applyHidden(){document.querySelectorAll('[data-funy-post]').forEach(el=>{const owner=postOwners.get(String(el.dataset.funyPost||''));el.style.display=owner&&blocked.has(owner)?'none':''})}
async function blockOwner(postId,modal){
  if(!uid()||!token()){alert('작성자 차단은 FUNY PIN 앱에서 로그인 후 이용할 수 있어요.');return}
  let owner=postOwners.get(postId);
  if(!owner){try{const r=await fetch(SB+'/rest/v1/community_posts?select=user_id&id=eq.'+encodeURIComponent(postId)+'&limit=1',{headers:{apikey:KEY}});const rows=await r.json();owner=rows?.[0]?.user_id;postOwners.set(postId,String(owner||''))}catch(_){}}
  if(!owner||owner===uid())return;
  if(blocked.has(owner)){alert('이미 차단한 사용자예요.');return}
  if(!confirm('이 작성자를 차단할까요?\n차단한 사용자의 FUNY PIN 게시물은 보이지 않아요.'))return;
  try{
    const r=await fetch(SB+'/rest/v1/community_user_blocks',{method:'POST',headers:{...authHeaders(),Prefer:'return=minimal'},body:JSON.stringify({blocker_user_id:uid(),blocked_user_id:owner})});
    if(!r.ok){const e=await r.json().catch(()=>({}));throw Error(e.message||'차단 처리에 실패했습니다.')}
    blocked.add(owner);applyHidden();modal?.remove();alert('작성자를 차단했습니다.\nMY에서 차단을 해제할 수 있어요.');
  }catch(e){alert(e.message||String(e))}
}
function decorateDetail(){
  const modal=document.getElementById('funyTalkDetail');if(!modal||!lastPostId||modal.querySelector('.talk-block-user'))return;
  const owner=postOwners.get(lastPostId);if(!owner||owner===uid())return;
  const sheet=modal.querySelector('.talk-community-sheet');if(!sheet)return;
  const btn=document.createElement('button');btn.type='button';btn.className='talk-block-user';btn.textContent=blocked.has(owner)?'차단한 사용자':'작성자 차단';btn.disabled=blocked.has(owner);btn.onclick=()=>blockOwner(lastPostId,modal);sheet.appendChild(btn);
}
document.addEventListener('click',e=>{const card=e.target.closest?.('[data-funy-post]');if(card){lastPostId=String(card.dataset.funyPost||'');setTimeout(decorateDetail,0)}},true);
const observer=new MutationObserver(()=>{applyHidden();decorateDetail()});observer.observe(document.body,{childList:true,subtree:true});
loadState();
})();
