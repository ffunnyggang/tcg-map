(function(){
'use strict';

const $=id=>document.getElementById(id);
const els={
  loading:$('loadingBar'),gate:$('gate'),gateTitle:$('gateTitle'),gateText:$('gateText'),dashboard:$('dashboard'),
  refresh:$('refreshButton'),eventFilter:$('eventFilter'),autoRefresh:$('autoRefresh'),finalize:$('finalizeButton'),reflow:$('reflowButton'),
  adminState:$('adminState'),scopeText:$('scopeText'),cronState:$('cronState'),refreshTime:$('refreshTime'),
  overallCard:$('overallCard'),overallState:$('overallState'),overallDetail:$('overallDetail'),
  eventCount:$('eventCount'),activeEventCount:$('activeEventCount'),participationCount:$('participationCount'),queuedCount:$('queuedCount'),claimCount:$('claimCount'),testerCount:$('testerCount'),walletCount:$('walletCount'),
  healthGrid:$('healthGrid'),eventRows:$('eventRows'),testerRows:$('testerRows'),ledgerRows:$('ledgerRows'),auditRows:$('auditRows'),
  exportHealth:$('exportHealth'),exportEvents:$('exportEvents'),exportTesters:$('exportTesters'),exportLedger:$('exportLedger'),exportAudit:$('exportAudit'),toast:$('toast')
};

let client=null;
let opsData=null;
let eventCatalog=[];
let selectedEventId='';
let refreshing=false;
let autoTimer=0;
let toastTimer=0;

const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const number=value=>Number(value||0).toLocaleString('ko-KR');
const shortId=value=>String(value||'').slice(0,8);
const fmt=value=>{
  if(!value)return'-';
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return'-';
  return d.toLocaleString('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});
};
const statusLabel=value=>({draft:'초안',scheduled:'예정',active:'진행 중',paused:'일시 정지',sold_out:'소진',ended:'종료',cancelled:'취소',queued:'대기',completed:'완료',refunded:'환불',failed:'실패',pending_reveal:'공개 대기',awaiting_instagram:'ID 입력 대기',pending_review:'확인 대기',ready:'처리 대기',verified:'확인 완료',dm_sent:'DM 발송',fulfilled:'전달 완료',expired:'기간 만료'}[value]||value||'-');
const coinTypeLabel=value=>({signup_bonus:'회원가입',mission_reward:'미션 보상',event_reward:'이벤트 보상',garapon_spend:'가라폰 사용',garapon_refund:'가라폰 환불',admin_grant:'관리자 지급',admin_deduct:'관리자 회수'}[value]||value||'-');
const actionLabel=value=>({create_event:'이벤트 생성',update_event:'이벤트 수정',replace_balls:'구슬 구성 변경',set_status:'상태 변경',set_tester:'테스터 설정',adjust_coin:'코인 조정',update_claim:'당첨 상태 변경',refund_participation:'참여 환불',update_feature_settings:'공개 설정 요청',run_maintenance:'운영 정리 실행'}[value]||value||'-');
const chipClass=value=>String(value||'').replace(/[^a-z0-9_-]/gi,'');

function showToast(message){
  clearTimeout(toastTimer);
  els.toast.textContent=message;
  els.toast.classList.add('show');
  toastTimer=setTimeout(()=>els.toast.classList.remove('show'),2200);
}
function setLoading(on){els.loading.classList.toggle('show',!!on)}
function setGate(title,text){
  els.gate.hidden=false;
  els.dashboard.hidden=true;
  els.gateTitle.textContent=title;
  els.gateText.textContent=text;
}
function showDashboard(){els.gate.hidden=true;els.dashboard.hidden=false}
async function rpc(name,body={}){
  const {data,error}=await client.rpc(name,body);
  if(error)throw error;
  return data;
}

function renderEventFilter(){
  const current=selectedEventId;
  els.eventFilter.innerHTML='<option value="">전체 이벤트</option>'+eventCatalog.map(event=>`<option value="${esc(event.id)}">${esc(event.title)} · ${esc(statusLabel(event.status))}</option>`).join('');
  els.eventFilter.value=current;
  els.reflow.disabled=!current||refreshing;
}

function renderSummary(data){
  const summary=data.summary||{};
  els.eventCount.textContent=number(summary.event_count);
  els.activeEventCount.textContent=number(summary.active_event_count);
  els.participationCount.textContent=number(summary.participation_count);
  els.queuedCount.textContent=number(summary.queued_count);
  els.claimCount.textContent=number(summary.claim_action_count);
  els.testerCount.textContent=number(summary.active_tester_count);
  els.walletCount.textContent=`지갑 ${number(summary.wallet_count)}개`;
  els.overallCard.classList.remove('ok','bad');
  els.overallCard.classList.add(data.all_ok?'ok':'bad');
  els.overallState.textContent=data.all_ok?'정상':'점검 필요';
  const failed=(data.health||[]).filter(item=>!item.ok);
  els.overallDetail.textContent=data.all_ok?'모든 내부 진단 항목이 정상입니다.':`${failed.length}개 진단 항목을 확인해주세요.`;
}

function renderHealth(items){
  if(!items?.length){els.healthGrid.innerHTML='<div class="empty">진단 항목이 없습니다.</div>';return}
  els.healthGrid.innerHTML=items.map(item=>`<article class="health-card ${item.ok?'ok':'bad'}"><span class="health-state">${item.ok?'● 정상':'● 점검 필요'}</span><span class="health-count">${number(item.count)}</span><h3>${esc(item.label)}</h3><p>${esc(item.detail)}</p></article>`).join('');
}

function renderEvents(items){
  if(!items?.length){els.eventRows.innerHTML='<tr><td colspan="9" class="empty">등록된 이벤트가 없습니다.</td></tr>';return}
  els.eventRows.innerHTML=items.map(item=>{
    const inventoryOk=Number(item.total_ball_count)===Number(item.ball_initial_sum)&&Number(item.remaining_ball_count)===Number(item.ball_remaining_sum);
    return `<tr><td><b>${esc(item.title)}</b><small class="mono">${esc(item.id)}</small></td><td><span class="status-chip ${chipClass(item.status)}">${esc(statusLabel(item.status))}</span></td><td><span class="status-chip ${item.visibility==='test'?'ok':'paused'}">${item.visibility==='test'?'테스트 전용':'PUBLIC'}</span></td><td><b>${number(item.remaining_ball_count)} / ${number(item.total_ball_count)}</b><small>${inventoryOk?'컬러별 합계 일치':`불일치 · ${number(item.ball_remaining_sum)} / ${number(item.ball_initial_sum)}`}</small></td><td>${number(item.participation_count)}</td><td>${number(item.queued_count)}</td><td>${number(item.claim_count)}</td><td>${number(item.coin_cost)} 코인</td><td>${esc(fmt(item.starts_at))}<small>~ ${esc(fmt(item.ends_at))}</small></td></tr>`;
  }).join('');
}

function renderTesters(items){
  if(!items?.length){els.testerRows.innerHTML='<tr><td colspan="7" class="empty">등록된 비공개 테스터가 없습니다.</td></tr>';return}
  els.testerRows.innerHTML=items.map(item=>`<tr><td><b>${esc(item.email||'이메일 없음')}</b><small class="mono">${esc(shortId(item.user_id))}</small></td><td><span class="status-chip ${item.is_active?'active':'cancelled'}">${item.is_active?'활성':'비활성'}</span></td><td><b>${number(item.wallet_balance)}</b></td><td>${number(item.participation_count)}</td><td>${number(item.claim_count)}</td><td>${esc(fmt(item.last_sign_in_at))}</td><td>${esc(item.note||'-')}<small>설정 ${esc(fmt(item.updated_at))}</small></td></tr>`).join('');
}

function renderLedger(items){
  if(!items?.length){els.ledgerRows.innerHTML='<tr><td colspan="7" class="empty">퍼니코인 원장 내역이 없습니다.</td></tr>';return}
  els.ledgerRows.innerHTML=items.map(item=>{
    const amount=Number(item.amount||0);
    return `<tr><td>${esc(fmt(item.created_at))}</td><td><b>${esc(item.email||'이메일 없음')}</b><small class="mono">${esc(shortId(item.user_id))}</small></td><td>${esc(coinTypeLabel(item.transaction_type))}</td><td class="amount ${amount>=0?'plus':'minus'}">${amount>=0?'+':''}${number(amount)}</td><td>${number(item.balance_after)}</td><td>${esc(item.source_type||'-')}<small class="mono">${esc(shortId(item.source_id))}</small></td><td>${esc(item.description||'-')}</td></tr>`;
  }).join('');
}

function compactJson(value){
  if(value==null)return'-';
  try{const text=JSON.stringify(value);return text.length>220?text.slice(0,217)+'...':text}catch(_){return String(value)}
}
function renderAudit(items){
  if(!items?.length){els.auditRows.innerHTML='<tr><td colspan="6" class="empty">관리자 감사 로그가 없습니다.</td></tr>';return}
  els.auditRows.innerHTML=items.map(item=>`<tr><td>${esc(fmt(item.created_at))}</td><td><b>${esc(item.admin_email||'시스템')}</b><small class="mono">${esc(shortId(item.admin_user_id))}</small></td><td>${esc(actionLabel(item.action))}<small>${esc(item.action)}</small></td><td>${esc(item.target_type||'-')}</td><td class="mono">${esc(item.target_id||'-')}</td><td><div class="json-preview" title="${esc(JSON.stringify(item.after_data||{}))}">${esc(compactJson(item.after_data))}</div></td></tr>`).join('');
}

function renderMeta(data){
  const cron=data.cron||{};
  const cronOk=cron.active&&(cron.last_status==null||cron.last_status==='succeeded');
  els.cronState.textContent=cronOk?`자동 마감 정상 · ${fmt(cron.last_finished_at)}`:`자동 마감 점검 필요 · ${statusLabel(cron.last_status)}`;
  els.cronState.className=cronOk?'status-chip ok':'status-chip failed';
  els.refreshTime.textContent=`데이터 기준 ${fmt(data.generated_at)}`;
  const selected=eventCatalog.find(item=>item.id===selectedEventId);
  els.scopeText.textContent=selected?`선택 이벤트: ${selected.title}`:'전체 이벤트 기준';
}

function render(data){
  renderSummary(data);
  renderHealth(data.health||[]);
  renderEvents(data.events||[]);
  renderTesters(data.testers||[]);
  renderLedger(data.coin_ledger||[]);
  renderAudit(data.audit_logs||[]);
  renderMeta(data);
  renderEventFilter();
}

async function refreshOps(forceCatalog=false){
  if(refreshing||!client)return;
  refreshing=true;
  setLoading(true);
  els.refresh.disabled=true;
  els.finalize.disabled=true;
  els.reflow.disabled=true;
  try{
    const data=await rpc('admin_get_garapon_ops',{p_event_id:selectedEventId||null});
    if(!data?.ok){
      if(data?.error==='admin_required')setGate('관리자 권한이 필요합니다','FUNY PIN 관리자 계정만 접근할 수 있는 비공개 운영 화면입니다.');
      else setGate('운영 데이터를 불러오지 못했습니다',String(data?.error||'알 수 없는 오류가 발생했습니다.'));
      return;
    }
    opsData=data;
    if(!selectedEventId||forceCatalog)eventCatalog=(data.events||[]).slice();
    showDashboard();
    render(data);
  }catch(error){
    console.warn('[GARAPON OPS REFRESH]',error);
    showToast('운영 데이터를 불러오지 못했습니다.');
  }finally{
    refreshing=false;
    setLoading(false);
    els.refresh.disabled=false;
    els.finalize.disabled=false;
    els.reflow.disabled=!selectedEventId;
  }
}

async function runMaintenance(reflow){
  if(refreshing)return;
  if(reflow&&!selectedEventId){showToast('대기열을 재정렬할 이벤트를 먼저 선택해주세요.');return}
  const selected=eventCatalog.find(item=>item.id===selectedEventId);
  const message=reflow
    ? `${selected?.title||'선택 이벤트'}의 공개 전 대기열 시간을 현재 시각부터 다시 정렬합니다. 계속할까요?`
    : `${selected?.title||'전체 이벤트'}의 공개 시각이 지난 결과를 즉시 마감합니다. 계속할까요?`;
  if(!window.confirm(message))return;
  refreshing=true;
  setLoading(true);
  els.finalize.disabled=true;
  els.reflow.disabled=true;
  try{
    const result=await rpc('admin_run_garapon_maintenance',{p_event_id:selectedEventId||null,p_reflow:!!reflow});
    if(!result?.ok)throw new Error(result?.error||'maintenance_failed');
    showToast(reflow?`대기열 ${number(result.reflowed)}건을 재정렬했습니다.`:`결과 ${number(result.finalized)}건을 마감했습니다.`);
  }catch(error){
    console.warn('[GARAPON OPS MAINTENANCE]',error);
    showToast('운영 정리 작업에 실패했습니다.');
  }finally{
    refreshing=false;
    setLoading(false);
    await refreshOps(false);
  }
}

function csvValue(value){
  let text=value==null?'':typeof value==='object'?JSON.stringify(value):String(value);
  return `"${text.replace(/"/g,'""')}"`;
}
function downloadCsv(filename,columns,rows){
  if(!rows?.length){showToast('내보낼 데이터가 없습니다.');return}
  const lines=[columns.map(column=>csvValue(column.label)).join(',')];
  rows.forEach(row=>lines.push(columns.map(column=>csvValue(typeof column.value==='function'?column.value(row):row[column.key])).join(',')));
  const blob=new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function exportDate(){return new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'}).replaceAll('-','')}
function exportHealth(){
  downloadCsv(`garapon-health-${exportDate()}.csv`,[
    {label:'키',key:'key'},{label:'점검 항목',key:'label'},{label:'정상 여부',value:r=>r.ok?'정상':'점검 필요'},{label:'오류 수',key:'count'},{label:'설명',key:'detail'}
  ],opsData?.health||[]);
}
function exportEvents(){
  downloadCsv(`garapon-events-${exportDate()}.csv`,[
    {label:'이벤트 ID',key:'id'},{label:'이벤트명',key:'title'},{label:'상태',key:'status'},{label:'공개 범위',key:'visibility'},
    {label:'총 구슬',key:'total_ball_count'},{label:'남은 구슬',key:'remaining_ball_count'},{label:'컬러별 총합',key:'ball_initial_sum'},{label:'컬러별 남은 합계',key:'ball_remaining_sum'},
    {label:'참여 수',key:'participation_count'},{label:'대기 수',key:'queued_count'},{label:'당첨 수',key:'claim_count'},{label:'코인 비용',key:'coin_cost'},
    {label:'시작',key:'starts_at'},{label:'종료',key:'ends_at'},{label:'수정',key:'updated_at'}
  ],opsData?.events||[]);
}
function exportTesters(){
  downloadCsv(`garapon-testers-${exportDate()}.csv`,[
    {label:'사용자 ID',key:'user_id'},{label:'이메일',key:'email'},{label:'활성',value:r=>r.is_active?'Y':'N'},{label:'메모',key:'note'},
    {label:'퍼니코인',key:'wallet_balance'},{label:'참여 수',key:'participation_count'},{label:'당첨 수',key:'claim_count'},
    {label:'최근 로그인',key:'last_sign_in_at'},{label:'등록',key:'created_at'},{label:'수정',key:'updated_at'}
  ],opsData?.testers||[]);
}
function exportLedger(){
  downloadCsv(`funy-coin-ledger-${exportDate()}.csv`,[
    {label:'원장 ID',key:'id'},{label:'사용자 ID',key:'user_id'},{label:'이메일',key:'email'},{label:'유형',key:'transaction_type'},
    {label:'변동',key:'amount'},{label:'변동 후 잔액',key:'balance_after'},{label:'출처 유형',key:'source_type'},{label:'출처 ID',key:'source_id'},
    {label:'설명',key:'description'},{label:'일시',key:'created_at'}
  ],opsData?.coin_ledger||[]);
}
function exportAudit(){
  downloadCsv(`garapon-audit-${exportDate()}.csv`,[
    {label:'로그 ID',key:'id'},{label:'관리자 ID',key:'admin_user_id'},{label:'관리자 이메일',key:'admin_email'},{label:'작업',key:'action'},
    {label:'대상 유형',key:'target_type'},{label:'대상 ID',key:'target_id'},{label:'변경 전',key:'before_data'},{label:'변경 후',key:'after_data'},{label:'일시',key:'created_at'}
  ],opsData?.audit_logs||[]);
}

function resetAutoRefresh(){
  clearInterval(autoTimer);
  autoTimer=0;
  if(els.autoRefresh.checked)autoTimer=setInterval(()=>{if(!document.hidden)void refreshOps(false)},15000);
}

async function init(){
  try{
    const auth=window.FUNY_WEB_AUTH;
    if(!auth)throw new Error('AUTH_NOT_READY');
    await auth.init();
    const session=await auth.getSession();
    if(!session){auth.goLogin(location.href);return}
    client=auth.client;
    els.adminState.textContent=session.user?.email||'관리자';
    await refreshOps(true);
    resetAutoRefresh();
  }catch(error){
    console.warn('[GARAPON OPS INIT]',error);
    setGate('운영 화면을 시작하지 못했습니다','로그인 상태와 네트워크 연결을 확인한 뒤 다시 시도해주세요.');
    setLoading(false);
  }
}

els.refresh.addEventListener('click',()=>refreshOps(!selectedEventId));
els.eventFilter.addEventListener('change',()=>{
  selectedEventId=els.eventFilter.value;
  els.reflow.disabled=!selectedEventId;
  void refreshOps(false);
});
els.autoRefresh.addEventListener('change',resetAutoRefresh);
els.finalize.addEventListener('click',()=>runMaintenance(false));
els.reflow.addEventListener('click',()=>runMaintenance(true));
els.exportHealth.addEventListener('click',exportHealth);
els.exportEvents.addEventListener('click',exportEvents);
els.exportTesters.addEventListener('click',exportTesters);
els.exportLedger.addEventListener('click',exportLedger);
els.exportAudit.addEventListener('click',exportAudit);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&els.autoRefresh.checked)void refreshOps(false)});
window.addEventListener('pagehide',()=>clearInterval(autoTimer));

void init();
})();
