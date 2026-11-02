/* FUNY PIN Android launch event entries admin */
(()=>{
'use strict';
if(window.__FUNY_ADMIN_ANDROID_EVENT_ENTRIES)return;
window.__FUNY_ADMIN_ANDROID_EVENT_ENTRIES=true;

const CAMPAIGN_ID='EV-AOS-LAUNCH-SIGNUP-20261102';
const EVENT_TITLE='FUNY PIN Android 출시 기념 이벤트';
const EVENT_PERIOD='2026. 11. 2 ~ 11. 15';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>{if(!v)return'-';const d=new Date(v);return Number.isNaN(d.getTime())?'-':d.toLocaleString('ko-KR')};
const apiCall=(path,opt={})=>{if(typeof window.api!=='function')throw Error('관리자 API가 준비되지 않았습니다.');return window.api(path,opt)};

function ensureStyle(){
 if(document.getElementById('androidEventAdminStyle'))return;
 const s=document.createElement('style');s.id='androidEventAdminStyle';
 s.textContent=`
 .aos-event-badge{display:inline-flex;align-items:center;height:24px;padding:0 8px;border-radius:999px;background:#eee8fa;color:#684ab7;font-size:9px;font-weight:900}
 .aos-event-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:14px 0}
 .aos-event-stat{padding:12px;border:1px solid #e9e3ed;border-radius:12px;background:#fff}.aos-event-stat b{display:block;font-size:18px}.aos-event-stat span{display:block;margin-top:4px;color:#8f8794;font-size:9px}
 .aos-event-tools{display:flex;gap:8px;margin:12px 0}.aos-event-tools input{flex:1;height:40px;padding:0 11px;border:1px solid #ded8e3;border-radius:10px;font:inherit;font-size:11px}.aos-event-tools button{height:40px;padding:0 12px;border:1px solid #ddd6e4;border-radius:10px;background:#fff;font-size:10px;font-weight:800;cursor:pointer}
 .aos-entry-list{display:grid;gap:9px}.aos-entry-row{padding:13px;border:1px solid #e9e3ed;border-radius:13px;background:#fff}.aos-entry-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.aos-entry-user{min-width:0}.aos-entry-user b{display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.aos-entry-user span{display:block;margin-top:3px;color:#8d8591;font-size:9.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.aos-entry-total{flex:0 0 auto;font-size:17px;font-weight:950;color:#6749bd}
 .aos-entry-chips{display:flex;gap:5px;flex-wrap:wrap;margin-top:10px}.aos-entry-chip{display:inline-flex;height:23px;align-items:center;padding:0 7px;border-radius:999px;background:#f2eef6;color:#7c7282;font-size:8.5px;font-weight:800}.aos-entry-chip.on{background:#e5f6eb;color:#2f8453}.aos-entry-chip.pending{background:#fff3d9;color:#8b6a20}
 .aos-entry-meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px 10px;margin-top:10px;padding-top:10px;border-top:1px solid #f0ebf2;color:#8c8490;font-size:8.8px}.aos-entry-meta b{color:#625a67;font-weight:750}
 .aos-event-empty{padding:28px 10px;text-align:center;color:#918997;font-size:11px}
 @media(max-width:700px){.aos-event-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.aos-entry-meta{grid-template-columns:1fr}}
 `;
 document.head.appendChild(s);
}

async function fetchData(){
 return apiCall('/functions/v1/android-launch-event-admin',{method:'POST',body:JSON.stringify({action:'list'})});
}

function statusLabel(v){
 return ({not_submitted:'미참여',pending:'확인 대기',verified:'확인 완료',rejected:'취소'}[v]||v||'-');
}

function exportCsv(rows){
 const header=['email','nickname','user_id','base','favorite','instagram','total','instagram_code','instagram_status','created_at'];
 const lines=[header.join(',')].concat((rows||[]).map(r=>[
  r.email,r.nickname,r.user_id,r.base,r.favorite,r.instagram,r.total,r.instagram_code,r.instagram_verification_status,r.created_at
 ].map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')));
 const blob=new Blob(['\ufeff'+lines.join('\n')],{type:'text/csv;charset=utf-8'});
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='android-launch-event-entries.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);
}

function renderRows(rows,query=''){
 const list=$('aosEventList');if(!list)return;
 const q=String(query||'').trim().toLowerCase();
 const filtered=(rows||[]).filter(r=>!q||[r.email,r.nickname,r.user_id,r.instagram_code].some(v=>String(v||'').toLowerCase().includes(q)));
 if(!filtered.length){list.innerHTML='<div class="aos-event-empty">표시할 응모 내역이 없습니다.</div>';return}
 list.innerHTML=filtered.map(r=>{
  const ig=r.instagram_verification_status||'not_submitted';
  return '<article class="aos-entry-row">'+
   '<div class="aos-entry-top"><div class="aos-entry-user"><b>'+esc(r.nickname||r.email||'회원')+'</b><span>'+esc(r.email||r.user_id)+'</span></div><div class="aos-entry-total">'+Number(r.total||0)+'/3</div></div>'+
   '<div class="aos-entry-chips">'+
    '<span class="aos-entry-chip '+(r.base?'on':'')+'">기본 '+(r.base?'+1':'0')+'</span>'+
    '<span class="aos-entry-chip '+(r.favorite?'on':'')+'">관심매장 '+(r.favorite?'+1':'0')+'</span>'+
    '<span class="aos-entry-chip '+(r.instagram?'on':'')+'">Instagram '+(r.instagram?'+1':'0')+'</span>'+
    '<span class="aos-entry-chip '+(ig==='pending'?'pending':ig==='verified'?'on':'')+'">Instagram '+esc(statusLabel(ig))+'</span>'+
   '</div>'+
   '<div class="aos-entry-meta"><span><b>댓글 코드</b> '+esc(r.instagram_code||'-')+'</span><span><b>응모 생성</b> '+esc(fmt(r.created_at))+'</span><span><b>관심매장 완료</b> '+esc(fmt(r.favorite_verified_at))+'</span><span><b>댓글 참여</b> '+esc(fmt(r.instagram_participated_at))+'</span></div>'+
  '</article>';
 }).join('');
}

async function openDetail(){
 ensureStyle();
 const feed=$('feed');if(!feed)return;
 feed.innerHTML='<div class="empty">Android 이벤트 응모 내역을 불러오는 중...</div>';
 try{
  const data=await fetchData();
  const s=data.summary||{},rows=data.rows||[];
  feed.innerHTML='<div class="event-detail-overlay"><div class="event-detail-panel"><div class="event-detail-head"><div><b>'+esc(EVENT_TITLE)+'</b><span>'+esc(EVENT_PERIOD)+'</span></div><button id="aosEventBack" class="event-detail-close" type="button" aria-label="닫기">×</button></div><div class="event-detail-body">'+
   '<div class="event-detail-title"><b>'+esc(EVENT_TITLE)+'</b><span>'+esc(EVENT_PERIOD)+' · '+esc(CAMPAIGN_ID)+'</span></div>'+
   '<div class="aos-event-stats"><div class="aos-event-stat"><b>'+Number(s.participants||0)+'</b><span>참여 회원</span></div><div class="aos-event-stat"><b>'+Number(s.total_entries||0)+'</b><span>총 응모권</span></div><div class="aos-event-stat"><b>'+Number(s.completed_3||0)+'</b><span>3/3 완료</span></div><div class="aos-event-stat"><b>'+Number(s.instagram_pending||0)+'</b><span>댓글 확인 대기</span></div></div>'+
   '<div class="aos-event-tools"><input id="aosEventSearch" type="search" placeholder="이메일 · 닉네임 · 댓글코드 검색"><button id="aosEventRefresh" type="button">새로고침</button><button id="aosEventCsv" type="button">CSV</button></div>'+
   '<div id="aosEventList" class="aos-entry-list"></div></div></div></div>';
  renderRows(rows,'');
  $('aosEventSearch').oninput=e=>renderRows(rows,e.target.value);
  $('aosEventRefresh').onclick=openDetail;
  $('aosEventCsv').onclick=()=>exportCsv(rows);
  $('aosEventBack').onclick=()=>document.querySelector('[data-admin-tab="event"]')?.click();
 }catch(e){
  feed.innerHTML='<div class="empty error">Android 이벤트 응모 조회 실패: '+esc(e.message)+'</div>';
 }
}

async function injectCard(){
 const list=document.querySelector('.event-campaign-list');
 if(!list||list.querySelector('[data-aos-launch-event]'))return;
 ensureStyle();
 const row=document.createElement('div');row.className='event-campaign-row';row.setAttribute('data-aos-launch-event','1');
 row.innerHTML='<button class="event-campaign-card" type="button"><div><b>'+esc(EVENT_TITLE)+'</b><span>'+esc(EVENT_PERIOD)+' · '+esc(CAMPAIGN_ID)+'</span><span class="event-campaign-entry-count" data-aos-count>응모 현황 조회 중...</span></div><em class="event-status event-status-active">진행중</em><i>›</i></button>';
 list.prepend(row);
 row.querySelector('button').onclick=openDetail;
 try{
  const data=await fetchData();const s=data.summary||{};
  const el=row.querySelector('[data-aos-count]');if(el)el.textContent='참여 '+Number(s.participants||0)+'명 · 총 응모권 '+Number(s.total_entries||0)+'회';
 }catch(_){
  const el=row.querySelector('[data-aos-count]');if(el)el.textContent='응모 내역 보기';
 }
}

const observer=new MutationObserver(()=>{void injectCard()});
observer.observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('click',e=>{
 const t=e.target instanceof Element?e.target.closest('[data-admin-tab="event"]'):null;
 if(t)setTimeout(()=>void injectCard(),80);
});
setTimeout(()=>void injectCard(),300);
})();