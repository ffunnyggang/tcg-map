/* FUNY PIN Admin - notices management */
(function(){
'use strict';
if(!/\/admin\.html$/.test(location.pathname)||window.__FUNY_ADMIN_NOTICES)return;
window.__FUNY_ADMIN_NOTICES=true;

const h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const statusLabel=v=>({draft:'임시저장',published:'공개',hidden:'숨김'})[v]||v||'-';
const dt=v=>v?new Date(v).toLocaleString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}):'-';
const localValue=v=>{if(!v)return '';const d=new Date(v);if(Number.isNaN(d.getTime()))return '';const p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes())};

async function getNotices(){
 return api('/rest/v1/notices?select=id,title,body,status,is_pinned,published_at,created_at,updated_at&order=is_pinned.desc,published_at.desc.nullslast,created_at.desc');
}
async function getHomeNoticeConfig(){
 const [settings,items]=await Promise.all([
  api('/rest/v1/home_notice_settings?select=id,interval_seconds&limit=1'),
  api('/rest/v1/home_notice_items?select=slot,notice_id&order=slot.asc')
 ]);
 return {interval:Number(settings?.[0]?.interval_seconds||3.5),items:Array.isArray(items)?items:[]};
}
function homeNoticePanel(rows,config){
 const published=rows.filter(x=>x.status==='published');
 const bySlot=Object.fromEntries((config.items||[]).map(x=>[Number(x.slot),x.notice_id]));
 const options=slot=>'<option value="">선택 안 함</option>'+published.map(x=>'<option value="'+h(x.id)+'"'+(bySlot[slot]===x.id?' selected':'')+'>'+h(x.title)+'</option>').join('');
 return '<section class="card" style="margin-bottom:16px"><div class="shop" style="margin-top:0">HOME 공지 롤링 설정</div><div class="meta">HOME 히어로 하단 공지 타이틀 영역 · 최대 5개</div>'+
  '<div class="form-grid" style="margin-top:14px">'+
   '<div class="field wide"><label>전환 간격 (초)</label><input id="homeNoticeInterval" class="input" type="number" min="1" max="30" step="0.5" value="'+h(config.interval)+'"><div class="editor-msg">1~30초 · 현재 기본값 3.5초</div></div>'+
   [1,2,3,4,5].map(slot=>'<div class="field"><label>노출 '+slot+'순위</label><select class="select" data-home-notice-slot="'+slot+'">'+options(slot)+'</select></div>').join('')+
   '<div class="field wide"><button id="homeNoticeSave" class="primary" type="button" style="max-width:220px">HOME 공지 설정 저장</button><p id="homeNoticeMsg" class="editor-msg"></p></div>'+
  '</div></section>';
}

async function renderNotices(){
 const f=document.getElementById('feed');
 if(!f)return;
 f.innerHTML='<div class="empty">공지사항을 불러오는 중...</div>';
 try{
  const [rows,homeConfig]=await Promise.all([getNotices(),getHomeNoticeConfig()]);
  const published=rows.filter(x=>x.status==='published').length;
  const drafts=rows.filter(x=>x.status==='draft').length;
  const pinned=rows.filter(x=>x.is_pinned).length;
  f.innerHTML=
   '<div class="shop-admin-tools" style="grid-template-columns:1fr auto"><div><b style="display:block;font-size:13px">공지사항 관리</b><span style="display:block;margin-top:4px;color:#9a929e;font-size:10px">MY &gt; 공지사항 WebView와 HOME 공지 롤링을 함께 관리합니다.</span></div><button id="noticeNew" class="shop-new" type="button">+ 공지사항 등록</button></div>'+
   homeNoticePanel(rows,homeConfig)+
   '<div class="shop-stats"><div class="shop-stat"><b>'+rows.length+'</b><span>전체 공지</span></div><div class="shop-stat"><b>'+published+'</b><span>공개</span></div><div class="shop-stat"><b>'+drafts+'</b><span>임시저장</span></div><div class="shop-stat"><b>'+pinned+'</b><span>상단 고정</span></div></div>'+
   '<div id="noticeAdminList">'+(rows.length?rows.map(noticeCard).join(''):'<div class="empty">등록된 공지사항이 없습니다.</div>')+'</div>';
  document.getElementById('noticeNew').onclick=()=>openNoticeEditor(null);
  document.getElementById('homeNoticeSave').onclick=()=>saveHomeNoticeConfig();
  f.querySelectorAll('[data-notice-edit]').forEach(b=>b.onclick=()=>openNoticeEditor(rows.find(x=>x.id===b.dataset.noticeEdit)));
  f.querySelectorAll('[data-notice-toggle]').forEach(b=>b.onclick=()=>toggleNotice(rows.find(x=>x.id===b.dataset.noticeToggle)));
  f.querySelectorAll('[data-notice-delete]').forEach(b=>b.onclick=()=>deleteNotice(rows.find(x=>x.id===b.dataset.noticeDelete)));
 }catch(e){
  f.innerHTML='<div class="empty error">공지사항 조회 실패: '+h(e.message||e)+'</div>';
 }
}

function noticeCard(x){
 const published=x.status==='published';
 const body=String(x.body||'').replace(/\s+/g,' ').trim();
 return '<article class="card">'+
  '<div class="top">'+(x.is_pinned?'<span class="request-type">상단 고정</span>':'')+
  '<span class="status '+(published?'done':'')+'">'+h(statusLabel(x.status))+'</span>'+
  '<span class="time">'+h(x.published_at?'발행 '+dt(x.published_at):'발행일 미설정')+'</span></div>'+
  '<div class="shop">'+h(x.title)+'</div>'+
  '<div class="body">'+h(body.slice(0,220))+(body.length>220?'…':'')+'</div>'+
  '<div class="actions"><button type="button" data-notice-edit="'+h(x.id)+'">수정</button><button type="button" data-notice-toggle="'+h(x.id)+'">'+(published?'숨김':'바로 공개')+'</button><button class="hide-post" type="button" data-notice-delete="'+h(x.id)+'">삭제</button></div>'+
 '</article>';
}

function openNoticeEditor(item){
 const old=document.getElementById('noticeEditor');if(old)old.remove();
 const isNew=!item;
 const wrap=document.createElement('div');
 wrap.id='noticeEditor';wrap.className='editor show';wrap.setAttribute('aria-hidden','false');
 const status=item?.status||'draft';
 const publishedAt=localValue(item?.published_at);
 wrap.innerHTML='<div class="editor-panel" style="max-width:640px">'+
  '<div class="editor-head"><div><b>'+(isNew?'공지사항 등록':'공지사항 수정')+'</b><br><span>현재 프론트 디자인은 변경하지 않고 내용만 관리합니다.</span></div><button class="editor-close" type="button" aria-label="닫기">×</button></div>'+
  '<div class="editor-body"><div class="editor-section"><div class="form-grid">'+
   '<div class="field wide"><label>제목 *</label><input id="noticeTitle" class="input" maxlength="150" value="'+h(item?.title||'')+'" placeholder="공지 제목을 입력해주세요"></div>'+
   '<div class="field wide"><label>본문 *</label><textarea id="noticeBody" class="textarea" style="min-height:260px" placeholder="문단은 빈 줄로 구분하고, 한 문단 안의 줄바꿈은 그대로 표시됩니다.">'+h(item?.body||'')+'</textarea></div>'+
   '<div class="field"><label>상태</label><select id="noticeStatus" class="select"><option value="draft"'+(status==='draft'?' selected':'')+'>임시저장</option><option value="published"'+(status==='published'?' selected':'')+'>공개</option><option value="hidden"'+(status==='hidden'?' selected':'')+'>숨김</option></select></div>'+
   '<div class="field"><label>상단 고정</label><select id="noticePinned" class="select"><option value="false"'+(!item?.is_pinned?' selected':'')+'>OFF</option><option value="true"'+(item?.is_pinned?' selected':'')+'>ON</option></select></div>'+
   '<div class="field wide"><label>발행 일시</label><input id="noticePublishedAt" class="input" type="datetime-local" value="'+h(publishedAt)+'"><div class="editor-msg">공개 상태에서 발행 일시가 비어 있으면 저장 시 현재 시각으로 자동 설정됩니다.</div></div>'+
  '</div></div><p id="noticeEditorMsg" class="editor-msg"></p></div>'+
  '<div class="editor-foot">'+(!isNew?'<button id="noticeDelete" class="editor-delete" type="button">삭제</button>':'')+'<button id="noticeCancel" class="editor-cancel" type="button">취소</button><button id="noticeSave" class="editor-save" type="button">저장</button></div>'+
 '</div>';
 document.body.appendChild(wrap);
 const close=()=>wrap.remove();
 wrap.querySelector('.editor-close').onclick=close;
 document.getElementById('noticeCancel').onclick=close;
 if(!isNew)document.getElementById('noticeDelete').onclick=()=>deleteNotice(item,close);
 document.getElementById('noticeSave').onclick=async()=>{
  const title=document.getElementById('noticeTitle').value.trim();
  const body=document.getElementById('noticeBody').value.trim();
  const nextStatus=document.getElementById('noticeStatus').value;
  const pinned=document.getElementById('noticePinned').value==='true';
  let at=document.getElementById('noticePublishedAt').value;
  if(!title||!body){setEditorMessage('제목과 본문을 모두 입력해주세요.',true);return}
  if(nextStatus==='published'&&!at)at=localValue(new Date().toISOString());
  const payload={title,body,status:nextStatus,is_pinned:pinned,published_at:at?new Date(at).toISOString():null,updated_at:new Date().toISOString()};
  const btn=document.getElementById('noticeSave');btn.disabled=true;btn.textContent='저장 중...';
  try{
   if(isNew)await api('/rest/v1/notices',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({...payload,created_at:new Date().toISOString()})});
   else await api('/rest/v1/notices?id=eq.'+encodeURIComponent(item.id),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify(payload)});
   close();await renderNotices();
  }catch(e){setEditorMessage('저장 실패: '+(e.message||e),true);btn.disabled=false;btn.textContent='저장'}
 };
 function setEditorMessage(msg,error){const el=document.getElementById('noticeEditorMsg');if(!el)return;el.className='editor-msg'+(error?' error':'');el.textContent=msg}
}

async function toggleNotice(item){
 if(!item)return;
 const toPublish=item.status!=='published';
 const payload={status:toPublish?'published':'hidden',updated_at:new Date().toISOString()};
 if(toPublish&&!item.published_at)payload.published_at=new Date().toISOString();
 try{await api('/rest/v1/notices?id=eq.'+encodeURIComponent(item.id),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify(payload)});await renderNotices()}
 catch(e){alert('상태 변경 실패: '+(e.message||e))}
}

async function deleteNotice(item,onDone){
 if(!item||!confirm('“'+item.title+'” 공지사항을 삭제할까요?\n\n삭제 후 복구할 수 없습니다.'))return;
 try{await api('/rest/v1/notices?id=eq.'+encodeURIComponent(item.id),{method:'DELETE',headers:{Prefer:'return=minimal'}});if(onDone)onDone();await renderNotices()}
 catch(e){alert('공지사항 삭제 실패: '+(e.message||e))}
}

async function saveHomeNoticeConfig(){
 const interval=Math.max(1,Math.min(30,Number(document.getElementById('homeNoticeInterval')?.value||3.5)));
 const selects=[...document.querySelectorAll('[data-home-notice-slot]')];
 const picked=selects.map(x=>({slot:Number(x.dataset.homeNoticeSlot),notice_id:String(x.value||'')})).filter(x=>x.notice_id);
 const ids=picked.map(x=>x.notice_id);
 const msg=document.getElementById('homeNoticeMsg');
 if(new Set(ids).size!==ids.length){if(msg){msg.className='editor-msg error';msg.textContent='같은 공지사항을 중복 선택할 수 없습니다.'}return}
 const btn=document.getElementById('homeNoticeSave');if(btn){btn.disabled=true;btn.textContent='저장 중...'}
 try{
  await api('/rest/v1/home_notice_settings?id=eq.default',{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({interval_seconds:interval,updated_at:new Date().toISOString()})});
  await api('/rest/v1/home_notice_items?slot=gte.1',{method:'DELETE',headers:{Prefer:'return=minimal'}});
  if(picked.length)await api('/rest/v1/home_notice_items',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(picked.map(x=>({...x,created_at:new Date().toISOString(),updated_at:new Date().toISOString()})))});
  if(msg){msg.className='editor-msg';msg.textContent='HOME 공지 롤링 설정이 저장되었습니다.'}
  await renderNotices();
 }catch(e){
  if(msg){msg.className='editor-msg error';msg.textContent='저장 실패: '+(e.message||e)}
  if(btn){btn.disabled=false;btn.textContent='HOME 공지 설정 저장'}
 }
}

window.loadAdminNotices=renderNotices;
})();
