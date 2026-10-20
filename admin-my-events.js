/* FUNY PIN MY event catalog admin */
(()=>{
'use strict';
if(window.__FUNY_ADMIN_MY_EVENTS)return;
window.__FUNY_ADMIN_MY_EVENTS=true;
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const apiCall=(path,opt={})=>{if(typeof window.api!=='function')throw new Error('관리자 API가 준비되지 않았습니다.');return window.api(path,opt)};
const local=v=>{if(!v)return'';const d=new Date(v);if(Number.isNaN(d.getTime()))return'';return new Date(d.getTime()+9*3600000).toISOString().slice(0,16)};
const date=v=>{const d=new Date(v);return Number.isNaN(d.getTime())?'-':d.toLocaleDateString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'}).replace(/\. /g,'.').replace(/\.$/,'')};
const period=(a,b)=>date(a)+' ~ '+date(b);
const state=x=>{const n=Date.now(),s=Date.parse(x.starts_at),e=Date.parse(x.ends_at);return e<n?'종료':s<=n&&n<=e?'진행':'예정'};

function ensureStyle(){
 if(document.getElementById('adminMyEventsStyle'))return;
 const el=document.createElement('style');el.id='adminMyEventsStyle';
 el.textContent='.my-event-admin-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px}.my-event-admin-head p{margin:4px 0 0;color:#948c99;font-size:10px}.my-event-list{display:grid;gap:10px}.my-event-row{display:grid;grid-template-columns:110px minmax(0,1fr) auto;gap:13px;align-items:center;padding:11px;border:1px solid #e9e3ed;border-radius:14px;background:#fff}.my-event-thumb{width:110px;height:74px;border-radius:10px;background:#f1edf4;overflow:hidden}.my-event-thumb img{width:100%;height:100%;display:block;object-fit:cover}.my-event-copy{min-width:0}.my-event-copy b{display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.my-event-copy span{display:block;margin-top:5px;color:#918996;font-size:9.5px}.my-event-copy small{display:block;margin-top:5px;color:#aaa1ad;font-size:8.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.my-event-row-actions{display:flex;align-items:center;gap:7px}.my-event-state{height:24px;padding:0 8px;border-radius:999px;background:#f1edf4;color:#746a7b;display:inline-flex;align-items:center;font-size:8.5px;font-weight:850}.my-event-state.on{background:#eaf7ed;color:#39794a}.my-event-state.end{background:#f2eff3;color:#827a88}.my-event-row-actions button{height:34px;padding:0 11px;border:1px solid #ded7e4;border-radius:9px;background:#fff;color:#514a56;font-size:10px;font-weight:800;cursor:pointer}.my-event-editor-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.my-event-field{display:grid;gap:6px}.my-event-field.wide{grid-column:1/-1}.my-event-field label{font-size:10px;font-weight:800;color:#655d69}.my-event-field input,.my-event-field select{width:100%;height:42px;padding:0 11px;border:1px solid #ded7e4;border-radius:10px;background:#fff;font:inherit;font-size:11px}.my-event-preview{width:100%;max-height:220px;object-fit:cover;border-radius:12px;background:#f2eef5;display:none}.my-event-preview.show{display:block}@media(max-width:700px){.my-event-row{grid-template-columns:88px minmax(0,1fr)}.my-event-thumb{width:88px;height:66px}.my-event-row-actions{grid-column:1/-1;justify-content:flex-end}.my-event-editor-grid{grid-template-columns:1fr}.my-event-field.wide{grid-column:auto}}';
 document.head.appendChild(el)
}

async function load(){
 ensureStyle();
 try{adminTab='myevents'}catch(_){}
 document.querySelectorAll('[data-admin-tab]').forEach(b=>b.classList.toggle('on',b.dataset.adminTab==='myevents'));
 if($('toolbarTitle'))$('toolbarTitle').textContent='MY 이벤트 관리';
 if($('toolbarSub'))$('toolbarSub').textContent='MY 이벤트 목록 · 이미지 · 기간 · 상세 URL 관리';
 const f=$('feed');if(!f)return;f.innerHTML='<div class="empty">이벤트를 불러오는 중...</div>';
 try{
  const rows=await apiCall('/rest/v1/my_events?select=id,title,image_url,starts_at,ends_at,detail_url,is_visible,sort_order,created_at,updated_at&order=sort_order.asc,starts_at.desc');
  render(rows||[]);
 }catch(e){f.innerHTML='<div class="empty error">MY 이벤트 조회 실패: '+esc(e.message)+'</div>'}
}

function render(rows){
 const f=$('feed');
 const cards=rows.length?rows.map(x=>{const st=state(x);return '<article class="my-event-row"><div class="my-event-thumb">'+(x.image_url?'<img src="'+esc(x.image_url)+'" alt="">':'')+'</div><div class="my-event-copy"><b>'+esc(x.title)+'</b><span>'+esc(period(x.starts_at,x.ends_at))+'</span><small>'+esc(x.detail_url)+'</small></div><div class="my-event-row-actions"><span class="my-event-state '+(st==='진행'?'on':st==='종료'?'end':'')+'">'+st+'</span><span class="my-event-state">'+(x.is_visible?'노출':'숨김')+'</span><button type="button" data-edit="'+x.id+'">수정</button></div></article>'}).join(''):'<div class="empty">등록된 MY 이벤트가 없습니다.</div>';
 f.innerHTML='<div class="my-event-admin-head"><div><b>MY 이벤트</b><p>목록 정보만 관리합니다. 상세 페이지는 상세 URL에 연결해주세요.</p></div><button id="myEventNew" class="primary" type="button">+ 이벤트 등록</button></div><div class="my-event-list">'+cards+'</div>';
 $('myEventNew').onclick=()=>edit(null);
 f.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>edit(rows.find(x=>x.id===b.dataset.edit)));
}

function edit(row){
 document.getElementById('myEventEditor')?.remove();
 const modal=document.createElement('div');modal.id='myEventEditor';modal.className='editor show';modal.setAttribute('aria-hidden','false');
 modal.innerHTML='<div class="editor-panel" style="max-width:680px"><div class="editor-head"><div><b>'+(row?'MY 이벤트 수정':'MY 이벤트 등록')+'</b><br><span>목록 노출 정보와 상세 페이지 연결을 설정합니다.</span></div><button class="editor-close" id="myEventClose" type="button">×</button></div><div class="editor-body"><div class="my-event-editor-grid"><div class="my-event-field wide"><label>이벤트명</label><input id="myEventTitle" maxlength="120" value="'+esc(row?.title||'')+'"></div><div class="my-event-field wide"><label>이미지 URL</label><input id="myEventImage" type="url" placeholder="https://..." value="'+esc(row?.image_url||'')+'"><img id="myEventPreview" class="my-event-preview'+(row?.image_url?' show':'')+'" src="'+esc(row?.image_url||'')+'" alt=""></div><div class="my-event-field"><label>시작 일시</label><input id="myEventStart" type="datetime-local" value="'+esc(local(row?.starts_at))+'"></div><div class="my-event-field"><label>종료 일시</label><input id="myEventEnd" type="datetime-local" value="'+esc(local(row?.ends_at))+'"></div><div class="my-event-field wide"><label>상세 페이지 URL</label><input id="myEventUrl" placeholder="/event-xxx.html 또는 https://..." value="'+esc(row?.detail_url||'')+'"></div><div class="my-event-field"><label>MY 노출</label><select id="myEventVisible"><option value="true"'+(row?.is_visible!==false?' selected':'')+'>노출</option><option value="false"'+(row?.is_visible===false?' selected':'')+'>숨김</option></select></div><div class="my-event-field"><label>노출 순서</label><input id="myEventSort" type="number" value="'+Number(row?.sort_order??100)+'"></div></div></div><div class="editor-foot">'+(row?'<button id="myEventDelete" class="editor-delete" type="button">삭제</button>':'')+'<button id="myEventCancel" class="editor-cancel" type="button">취소</button><button id="myEventSave" class="editor-save" type="button">저장</button></div></div>';
 document.body.appendChild(modal);
 const close=()=>modal.remove();$('myEventClose').onclick=close;$('myEventCancel').onclick=close;
 $('myEventImage').oninput=()=>{const img=$('myEventPreview'),url=$('myEventImage').value.trim();img.src=url;img.classList.toggle('show',!!url)};
 $('myEventSave').onclick=async()=>{
  const title=$('myEventTitle').value.trim(),image=$('myEventImage').value.trim(),start=$('myEventStart').value,end=$('myEventEnd').value,url=$('myEventUrl').value.trim(),visible=$('myEventVisible').value==='true',sort=Number($('myEventSort').value)||100;
  if(!title||!start||!end||!url){alert('이벤트명, 기간, 상세 페이지 URL을 입력해주세요.');return}
  if(new Date(end)<=new Date(start)){alert('종료 일시는 시작 일시보다 뒤여야 합니다.');return}
  const btn=$('myEventSave');btn.disabled=true;
  try{
   const body={title,image_url:image||null,starts_at:new Date(start).toISOString(),ends_at:new Date(end).toISOString(),detail_url:url,is_visible:visible,sort_order:sort,updated_at:new Date().toISOString()};
   if(row)await apiCall('/rest/v1/my_events?id=eq.'+encodeURIComponent(row.id),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify(body)});
   else await apiCall('/rest/v1/my_events',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(body)});
   close();await load()
  }catch(e){alert('MY 이벤트 저장 실패: '+e.message);btn.disabled=false}
 };
 if(row)$('myEventDelete').onclick=async()=>{if(!confirm('“'+row.title+'” 이벤트를 삭제할까요?'))return;try{await apiCall('/rest/v1/my_events?id=eq.'+encodeURIComponent(row.id),{method:'DELETE',headers:{Prefer:'return=minimal'}});close();await load()}catch(e){alert('삭제 실패: '+e.message)}};
}

function install(){
 document.querySelectorAll('[data-admin-tab="myevents"]').forEach(b=>{if(b.dataset.myEventsBound)return;b.dataset.myEventsBound='1';b.onclick=e=>{e.preventDefault();void load()}});
}
ensureStyle();install();new MutationObserver(install).observe(document.documentElement,{childList:true,subtree:true});
window.FUNY_ADMIN_LOAD_MY_EVENTS=load;
})();