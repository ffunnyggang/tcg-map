const SUPABASE_URL='https://wdttzpbmqavaqfcbaywj.supabase.co';
const SUPABASE_KEY='sb_publishable__wrSzngSE-JbGnyE7PZX9w_2QaW8bpq';
const $=id=>document.getElementById(id);
const els={gate:$('gate'),gateTitle:$('gateTitle'),gateText:$('gateText'),dashboard:$('dashboard'),adminState:$('adminState'),eventList:$('eventList'),newEvent:$('newEvent'),featureStatus:$('featureStatus'),signupBonus:$('signupBonus'),saveLockedSettings:$('saveLockedSettings'),testerEmail:$('testerEmail'),testerActive:$('testerActive'),testerNote:$('testerNote'),saveTester:$('saveTester'),coinAmount:$('coinAmount'),coinReason:$('coinReason'),adjustCoin:$('adjustCoin'),eventStatusChip:$('eventStatusChip'),eventTitle:$('eventTitle'),eventDescription:$('eventDescription'),eventStarts:$('eventStarts'),eventEnds:$('eventEnds'),eventCost:$('eventCost'),limitMode:$('limitMode'),limitCount:$('limitCount'),turnSeconds:$('turnSeconds'),showRemaining:$('showRemaining'),showInventory:$('showInventory'),saveEvent:$('saveEvent'),copyTestUrl:$('copyTestUrl'),activateEvent:$('activateEvent'),pauseEvent:$('pauseEvent'),endEvent:$('endEvent'),testUrl:$('testUrl'),ballEditor:$('ballEditor'),ballTotal:$('ballTotal'),addBall:$('addBall'),saveBalls:$('saveBalls'),lastRefresh:$('lastRefresh'),statTotal:$('statTotal'),statRemaining:$('statRemaining'),statParticipations:$('statParticipations'),statQueue:$('statQueue'),statClaims:$('statClaims'),participationRows:$('participationRows'),claimRows:$('claimRows'),toast:$('toast')};

let client=null;
let selectedId='';
let events=[];
let balls=[];
let dashboardData=null;
let pollTimer=0;
let toastTimer=0;
let busy=false;

const DEFAULT_BALLS=[
  {color_key:'gold',color_hex:'#FFD95A',result_label:'1등',prize_title:'1등 상품',count:1,is_win:true,claim_required:true,sort_order:1},
  {color_key:'red',color_hex:'#EF5C68',result_label:'2등',prize_title:'2등 상품',count:3,is_win:true,claim_required:true,sort_order:2},
  {color_key:'white',color_hex:'#F7F6F8',result_label:'꽝',prize_title:'다음 기회에',count:96,is_win:false,claim_required:false,sort_order:3}
];

function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]))}
function uuid(){return crypto.randomUUID?crypto.randomUUID():'00000000-0000-4000-8000-'+Math.random().toString(16).slice(2,14).padEnd(12,'0')}
function showToast(message){clearTimeout(toastTimer);els.toast.textContent=message;els.toast.classList.add('show');toastTimer=setTimeout(()=>els.toast.classList.remove('show'),1900)}
function setGate(title,text){els.gate.hidden=false;els.dashboard.hidden=true;els.gateTitle.textContent=title;els.gateText.textContent=text}
function showDashboard(){els.gate.hidden=true;els.dashboard.hidden=false}
function toInputDate(value){if(!value)return'';const d=new Date(value);if(Number.isNaN(d.getTime()))return'';const local=new Date(d.getTime()-d.getTimezoneOffset()*60000);return local.toISOString().slice(0,16)}
function toIso(value){const d=new Date(value);return Number.isNaN(d.getTime())?'':d.toISOString()}
function fmt(value){if(!value)return'-';const d=new Date(value);if(Number.isNaN(d.getTime()))return'-';return d.toLocaleString('ko-KR',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}
function statusLabel(value){return({draft:'초안',scheduled:'예정',active:'진행 중',paused:'일시 정지',sold_out:'소진',ended:'종료',cancelled:'취소',queued:'대기',completed:'완료',refunded:'환불',failed:'실패'}[value]||value||'-')}
function claimLabel(value){return({pending_reveal:'공개 대기',awaiting_instagram:'ID 입력 대기',pending_review:'확인 대기',ready:'처리 대기',verified:'확인 완료',dm_sent:'DM 발송',fulfilled:'전달 완료',expired:'기간 만료',cancelled:'취소'}[value]||value||'-')}

async function rpc(name,body={}){
  const {data,error}=await client.rpc(name,body);if(error)throw error;return data;
}
async function requireAdmin(){
  const auth=window.FUNY_WEB_AUTH;if(!auth)throw new Error('AUTH_NOT_READY');await auth.init();
  const session=await auth.getSession();if(!session){auth.goLogin(location.href);return false}
  client=auth.client;const data=await rpc('admin_get_garapon_dashboard',{p_event_id:null});
  if(!data?.ok){setGate('관리자 권한이 필요합니다','FUNY PIN 관리자 계정만 접근할 수 있는 비공개 개발 화면입니다.');return false}
  els.adminState.textContent=session.user?.email||'관리자';dashboardData=data;showDashboard();return true;
}

function blankEvent(){
  selectedId='';const now=new Date(),end=new Date(now.getTime()+7*86400000);els.eventTitle.value='';els.eventDescription.value='';els.eventStarts.value=toInputDate(now);els.eventEnds.value=toInputDate(end);els.eventCost.value='3';els.limitMode.value='total';els.limitCount.value='5';els.turnSeconds.value='8';els.showRemaining.checked=true;els.showInventory.checked=true;balls=DEFAULT_BALLS.map(x=>({...x}));renderBalls();renderSelectedState(null);renderEventList();clearOperational();
}
function renderSelectedState(event){
  const status=event?.status||'new';els.eventStatusChip.textContent=event?statusLabel(status):'신규';els.eventStatusChip.className='status-chip '+(status==='active'?'active':status==='paused'?'paused':'');
  const has=!!event;els.copyTestUrl.disabled=!has;els.activateEvent.disabled=!has||status==='active'||status==='sold_out'||status==='ended'||status==='cancelled';els.pauseEvent.disabled=!has||status!=='active';els.endEvent.disabled=!has||['ended','cancelled'].includes(status);els.saveBalls.disabled=!has;
  const url=has?`${location.origin}/garapon-event-test.html?event=${event.id}`:'';els.testUrl.textContent=url||'이벤트 저장 후 비공개 테스트 주소가 생성됩니다.';
}
function loadEvent(event){
  selectedId=event.id;els.eventTitle.value=event.title||'';els.eventDescription.value=event.description||'';els.eventStarts.value=toInputDate(event.starts_at);els.eventEnds.value=toInputDate(event.ends_at);els.eventCost.value=String(event.coin_cost??0);els.limitMode.value=event.entry_limit_mode||'total';els.limitCount.value=event.entry_limit_count==null?'':String(event.entry_limit_count);els.turnSeconds.value=String(event.turn_seconds||8);els.showRemaining.checked=event.show_remaining_count!==false;els.showInventory.checked=event.show_prize_inventory!==false;renderSelectedState(event);renderEventList();void refreshDashboard(true);
}
function renderEventList(){
  if(!events.length){els.eventList.innerHTML='<div class="empty">등록된 테스트 이벤트가 없습니다.</div>';return}
  els.eventList.innerHTML=events.map(e=>`<button class="event-item${e.id===selectedId?' on':''}" data-id="${e.id}" type="button"><b>${esc(e.title)}</b><span>${esc(statusLabel(e.status))} · ${esc(fmt(e.starts_at))}</span></button>`).join('');
  els.eventList.querySelectorAll('[data-id]').forEach(b=>b.addEventListener('click',()=>{const e=events.find(x=>x.id===b.dataset.id);if(e)loadEvent(e)}));
}
function renderFeature(data){
  const feature=data?.feature_settings||{},coin=data?.coin_settings||{};els.featureStatus.textContent=`가라폰 공개 ${feature.public_enabled?'ON':'OFF'} · 코인 공개 ${coin.system_enabled?'ON':'OFF'} · 가입 지급 ${coin.signup_bonus_enabled?'ON':'OFF'}`;els.featureStatus.className=feature.public_enabled||coin.system_enabled||coin.signup_bonus_enabled?'error':'ok';els.signupBonus.value=String(coin.signup_bonus??20);
}
function renderBalls(){
  if(!balls.length)balls=[{color_key:'white',color_hex:'#F7F6F8',result_label:'꽝',prize_title:'다음 기회에',count:1,is_win:false,claim_required:false,sort_order:1}];
  els.ballEditor.innerHTML=balls.map((b,i)=>`<div class="ball-row" data-index="${i}"><input data-k="color_key" value="${esc(b.color_key)}" placeholder="컬러키"><input data-k="color_hex" type="color" value="${esc(b.color_hex||'#ffffff')}"><input data-k="result_label" value="${esc(b.result_label)}" placeholder="결과명"><input data-k="prize_title" value="${esc(b.prize_title)}" placeholder="상품명"><input data-k="count" type="number" min="1" value="${Number(b.count??b.initial_count??1)}"><label class="check"><input data-k="is_win" type="checkbox" ${b.is_win?'checked':''}>당첨</label><label class="check"><input data-k="claim_required" type="checkbox" ${b.claim_required?'checked':''}>ID 필요</label><button class="remove" data-remove type="button">×</button></div>`).join('');
  els.ballEditor.querySelectorAll('.ball-row').forEach(row=>{const i=Number(row.dataset.index);row.querySelectorAll('[data-k]').forEach(input=>input.addEventListener('change',()=>{const k=input.dataset.k;balls[i][k]=input.type==='checkbox'?input.checked:input.type==='number'?Math.max(1,Number(input.value)||1):input.value;updateBallTotal()}));row.querySelector('[data-remove]').addEventListener('click',()=>{if(balls.length<=1){showToast('구슬 설정은 최소 1개 필요합니다.');return}balls.splice(i,1);balls.forEach((x,j)=>x.sort_order=j+1);renderBalls()})});updateBallTotal();
}
function updateBallTotal(){const total=balls.reduce((n,x)=>n+Math.max(0,Number(x.count??x.initial_count)||0),0);els.ballTotal.textContent=`합계 ${total.toLocaleString('ko-KR')}개`}
function clearOperational(){els.statTotal.textContent='0';els.statRemaining.textContent='0';els.statParticipations.textContent='0';els.statQueue.textContent='0';els.statClaims.textContent='0';els.participationRows.innerHTML='<tr><td colspan="7" class="empty">이벤트를 선택해주세요.</td></tr>';els.claimRows.innerHTML='<tr><td colspan="6" class="empty">당첨 내역이 없습니다.</td></tr>'}

function renderOperational(data){
  const event=data.events?.[0]||null,parts=data.participations||[],claims=data.claims||[];if(!event){clearOperational();return}
  els.statTotal.textContent=Number(event.total_ball_count||0).toLocaleString('ko-KR');els.statRemaining.textContent=Number(event.remaining_ball_count||0).toLocaleString('ko-KR');els.statParticipations.textContent=parts.length.toLocaleString('ko-KR');els.statQueue.textContent=parts.filter(x=>x.status==='queued'&&new Date(x.reveal_at)>new Date()).length.toLocaleString('ko-KR');els.statClaims.textContent=claims.length.toLocaleString('ko-KR');els.lastRefresh.textContent='갱신 '+new Date().toLocaleTimeString('ko-KR');
  if(!parts.length)els.participationRows.innerHTML='<tr><td colspan="7" class="empty">참여 내역이 없습니다.</td></tr>';else els.participationRows.innerHTML=parts.map(p=>`<tr><td><b>${p.sequence_no}</b></td><td>${esc(p.nickname||'닉네임 없음')}<small>${esc(String(p.user_id).slice(0,8))}</small></td><td>${esc(statusLabel(p.status))}</td><td><b>${esc(p.result?.result_label||'-')}</b><small>${esc(p.result?.prize_title||'')}</small></td><td>${Number(p.coin_cost||0)}개</td><td>${esc(fmt(p.requested_at))}</td><td>${p.status==='queued'&&new Date(p.reveal_at)>new Date()?`<button class="btn danger" data-refund="${p.id}" style="height:28px;padding:0 8px">환불</button>`:'-'}</td></tr>`).join('');
  els.participationRows.querySelectorAll('[data-refund]').forEach(b=>b.addEventListener('click',()=>refundParticipation(b.dataset.refund)));
  if(!claims.length)els.claimRows.innerHTML='<tr><td colspan="6" class="empty">당첨 내역이 없습니다.</td></tr>';else els.claimRows.innerHTML=claims.map(c=>`<tr><td>${esc(c.nickname||'닉네임 없음')}<small>${esc(String(c.user_id).slice(0,8))}</small></td><td><b>${esc(c.prize_title)}</b><small>${esc(c.result_label)}</small></td><td>${c.instagram_id?'@'+esc(c.instagram_id):'<span class="error">미입력</span>'}</td><td>${esc(claimLabel(c.status))}</td><td>${esc(fmt(c.created_at))}</td><td><div class="claim-actions"><button data-claim="${c.id}" data-status="verified">확인</button><button data-claim="${c.id}" data-status="dm_sent">DM 완료</button><button data-claim="${c.id}" data-status="fulfilled">전달 완료</button><button data-claim="${c.id}" data-status="cancelled">취소</button></div></td></tr>`).join('');
  els.claimRows.querySelectorAll('[data-claim]').forEach(b=>b.addEventListener('click',()=>updateClaim(b.dataset.claim,b.dataset.status)));
}

async function refreshDashboard(keepForm=false){
  if(busy)return;busy=true;
  try{
    const data=await rpc('admin_get_garapon_dashboard',{p_event_id:selectedId||null});if(!data?.ok)throw new Error(data?.error||'dashboard');dashboardData=data;renderFeature(data);
    if(selectedId){const event=data.events?.[0];if(event){events=events.map(x=>x.id===event.id?event:x);if(!keepForm)loadEventFieldsOnly(event);balls=(data.balls||[]).map((x,i)=>({...x,count:x.initial_count,sort_order:i+1}));renderBalls();renderSelectedState(event)}renderOperational(data)}
    else{events=data.events||[];renderEventList();clearOperational()}
  }catch(error){console.warn('[GARAPON ADMIN REFRESH]',error);showToast('관리자 데이터를 불러오지 못했습니다.')}
  finally{busy=false}
}
function loadEventFieldsOnly(event){els.eventTitle.value=event.title||'';els.eventDescription.value=event.description||'';els.eventStarts.value=toInputDate(event.starts_at);els.eventEnds.value=toInputDate(event.ends_at);els.eventCost.value=String(event.coin_cost??0);els.limitMode.value=event.entry_limit_mode||'total';els.limitCount.value=event.entry_limit_count==null?'':String(event.entry_limit_count);els.turnSeconds.value=String(event.turn_seconds||8);els.showRemaining.checked=event.show_remaining_count!==false;els.showInventory.checked=event.show_prize_inventory!==false}
async function refreshEventList(){const data=await rpc('admin_get_garapon_dashboard',{p_event_id:null});if(!data?.ok)throw new Error(data?.error||'dashboard');events=data.events||[];renderFeature(data);renderEventList()}

async function saveEvent(){
  const payload={title:els.eventTitle.value.trim(),description:els.eventDescription.value.trim(),starts_at:toIso(els.eventStarts.value),ends_at:toIso(els.eventEnds.value),visibility:'test',coin_cost:Number(els.eventCost.value)||0,entry_limit_mode:els.limitMode.value,entry_limit_count:els.limitMode.value==='unlimited'?null:Math.max(1,Number(els.limitCount.value)||1),turn_seconds:Math.min(30,Math.max(3,Number(els.turnSeconds.value)||8)),show_remaining_count:els.showRemaining.checked,show_prize_inventory:els.showInventory.checked};
  if(!payload.title||!payload.starts_at||!payload.ends_at){showToast('이벤트명과 기간을 입력해주세요.');return}
  els.saveEvent.disabled=true;
  try{const data=await rpc('admin_save_garapon_event',{p_event_id:selectedId||null,p_payload:payload});if(!data?.ok){showToast(data?.error==='event_config_locked'?'참여 이력이 있어 핵심 설정을 변경할 수 없습니다.':'이벤트 저장에 실패했습니다.');return}selectedId=data.event.id;await refreshEventList();const event=events.find(x=>x.id===selectedId)||data.event;loadEvent(event);showToast('이벤트 기본 설정을 저장했습니다.')}catch(error){console.warn(error);showToast('이벤트 저장에 실패했습니다.')}finally{els.saveEvent.disabled=false}
}
async function saveBalls(){
  if(!selectedId)return;const payload=balls.map((b,i)=>({color_key:String(b.color_key||'').trim(),color_hex:String(b.color_hex||'#ffffff'),result_label:String(b.result_label||'').trim(),prize_title:String(b.prize_title||'').trim(),count:Math.max(1,Number(b.count??b.initial_count)||1),is_win:!!b.is_win,claim_required:!!b.claim_required,sort_order:i+1}));
  els.saveBalls.disabled=true;try{const data=await rpc('admin_replace_garapon_balls',{p_event_id:selectedId,p_balls:payload});if(!data?.ok){showToast(data?.error==='event_config_locked'?'참여 이력이 있어 구슬 설정을 변경할 수 없습니다.':'구슬 설정 저장에 실패했습니다.');return}showToast('구슬과 상품 설정을 저장했습니다.');await refreshDashboard()}catch(error){console.warn(error);showToast('구슬 설정을 확인해주세요.')}finally{els.saveBalls.disabled=false}
}
async function setStatus(status){if(!selectedId)return;try{const data=await rpc('admin_set_garapon_event_status',{p_event_id:selectedId,p_status:status});if(!data?.ok){showToast(data?.error==='balls_required'?'먼저 구슬 설정을 저장해주세요.':'상태 변경에 실패했습니다.');return}await refreshEventList();loadEvent(events.find(x=>x.id===selectedId)||data.event);showToast('이벤트 상태를 변경했습니다.')}catch(error){console.warn(error);showToast('상태 변경에 실패했습니다.')}}
async function saveTester(){const email=els.testerEmail.value.trim();if(!email){showToast('테스트 계정 이메일을 입력해주세요.');return}try{const data=await rpc('admin_set_garapon_tester',{p_email:email,p_active:els.testerActive.value==='true',p_note:els.testerNote.value.trim()||null});if(!data?.ok){showToast(data?.error==='user_not_found'?'가입된 회원을 찾을 수 없습니다.':'저장에 실패했습니다.');return}showToast('테스트 계정 권한을 저장했습니다.')}catch(error){console.warn(error);showToast('테스트 계정 저장에 실패했습니다.')}}
async function adjustCoin(){const email=els.testerEmail.value.trim(),amount=Number(els.coinAmount.value),reason=els.coinReason.value.trim();if(!email||!Number.isFinite(amount)||amount===0||!reason){showToast('이메일, 수량, 사유를 확인해주세요.');return}try{const data=await rpc('admin_adjust_funy_coin',{p_email:email,p_amount:amount,p_reason:reason,p_idempotency_key:uuid()});if(!data?.ok){showToast(data?.error==='insufficient_balance'?'회수할 잔액이 부족합니다.':'퍼니코인 반영에 실패했습니다.');return}showToast(`퍼니코인 반영 완료 · 잔액 ${Number(data.balance||0).toLocaleString('ko-KR')}개`)}catch(error){console.warn(error);showToast('퍼니코인 반영에 실패했습니다.')}}
async function saveLockedSettings(){const bonus=Math.max(0,Number(els.signupBonus.value)||0);try{const data=await rpc('admin_update_funy_coin_settings',{p_system_enabled:false,p_signup_bonus_enabled:false,p_signup_bonus:bonus,p_garapon_public_enabled:false});if(!data?.ok)throw new Error(data?.error);showToast('예정 보너스 값을 저장했습니다. 공개 기능은 계속 잠금 상태입니다.');await refreshEventList()}catch(error){console.warn(error);showToast('설정 저장에 실패했습니다.')}}
async function refundParticipation(id){if(!confirm('아직 공개되지 않은 참여를 취소하고 퍼니코인을 환불할까요?'))return;try{const data=await rpc('admin_refund_garapon_participation',{p_participation_id:id,p_reason:'비공개 테스트 관리자 환불'});if(!data?.ok){showToast('현재 상태에서는 환불할 수 없습니다.');return}showToast('참여 취소 및 환불을 완료했습니다.');await refreshDashboard()}catch(error){console.warn(error);showToast('환불 처리에 실패했습니다.')}}
async function updateClaim(id,status){const memo=prompt('관리자 메모를 입력하세요.','')??'';try{const data=await rpc('admin_update_garapon_claim',{p_claim_id:id,p_status:status,p_admin_memo:memo||null});if(!data?.ok)throw new Error(data?.error);showToast('당첨 처리 상태를 변경했습니다.');await refreshDashboard()}catch(error){console.warn(error);showToast('당첨 상태 변경에 실패했습니다.')}}

els.newEvent.addEventListener('click',blankEvent);els.saveEvent.addEventListener('click',saveEvent);els.saveBalls.addEventListener('click',saveBalls);els.addBall.addEventListener('click',()=>{balls.push({color_key:'custom'+(balls.length+1),color_hex:'#8062D8',result_label:'결과',prize_title:'상품',count:1,is_win:false,claim_required:false,sort_order:balls.length+1});renderBalls()});els.activateEvent.addEventListener('click',()=>setStatus('active'));els.pauseEvent.addEventListener('click',()=>setStatus('paused'));els.endEvent.addEventListener('click',()=>setStatus('ended'));els.copyTestUrl.addEventListener('click',async()=>{if(!selectedId)return;const url=`${location.origin}/garapon-event-test.html?event=${selectedId}`;try{await navigator.clipboard.writeText(url);showToast('비공개 테스트 URL을 복사했습니다.')}catch(_){prompt('아래 주소를 복사하세요.',url)}});els.limitMode.addEventListener('change',()=>{els.limitCount.disabled=els.limitMode.value==='unlimited'});els.saveTester.addEventListener('click',saveTester);els.adjustCoin.addEventListener('click',adjustCoin);els.saveLockedSettings.addEventListener('click',saveLockedSettings);

(async()=>{try{if(!await requireAdmin())return;events=dashboardData.events||[];renderFeature(dashboardData);renderEventList();blankEvent();pollTimer=setInterval(()=>{if(selectedId)void refreshDashboard(true)},3000)}catch(error){console.warn('[GARAPON ADMIN INIT]',error);setGate('관리자 화면을 열지 못했어요','로그인 상태와 관리자 권한을 확인해주세요.')}})();window.addEventListener('pagehide',()=>clearInterval(pollTimer));
