(()=>{
'use strict';
if(window.__FUNY_MON_ADMIN_V2)return;
window.__FUNY_MON_ADMIN_V2=true;

const state={
  mode:'events',editingEventId:null,rows:[],attempts:[],events:[],shops:[],claims:[],profiles:[],
  rewards:[],campaigns:[],entries:[],opsLoadedAt:0,opsLoading:null,rewardOverviewBusy:false
};
const okResults=new Set(['caught','winner','entry']);
const names={ponanyang:'포냐냥',bubblelong:'버블롱',hatring:'하트링',bulgi:'불기',namumong:'나무몽',ggomagureum:'꼬마구름',bawidong:'바위동',grimjamong:'그림자몽',beonjjeogi:'번쩍이',neon:'네온'};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dt=v=>v?new Date(v).toLocaleString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}):'-';
const shortEventId=id=>{if(!id)return '-';const s=String(id);return s.length<=12?s:'FM-'+s.replace(/-/g,'').slice(0,8).toUpperCase()};
const monName=id=>names[id]||id||'-';
const profileName=id=>state.profiles.find(x=>x.user_id===id)?.nickname||'회원';
const entryLimitText=(mode,count)=>mode==='unlimited'?'제한 없음':mode==='daily'?'1일 '+Math.max(1,Number(count)||1)+'회':'기간 중 '+Math.max(1,Number(count)||1)+'회';
const kstDay=v=>new Date(new Date(v).getTime()+9*3600000).toISOString().slice(0,10);
const todayKst=()=>kstDay(new Date().toISOString());

function tabs(){
  return '<div class="fmh-tabs"><button class="fmh-tab '+(state.mode==='events'?'on':'')+'" data-fmh-mode="events">이벤트 관리</button><button class="fmh-tab '+(state.mode==='history'?'on':'')+'" data-fmh-mode="history">포획 · 참여 이력</button></div>';
}
function bindTabs(){
  document.querySelectorAll('[data-fmh-mode]').forEach(b=>b.onclick=()=>{
    const next=b.dataset.fmhMode;if(next===state.mode)return;
    state.mode=next;
    if(next==='events')window.loadFunyMonRewards?.();else loadHistory();
  });
}
async function loadOps(force=false){
  if(!window.api)return;
  if(!force&&Date.now()-state.opsLoadedAt<15000&&state.events.length)return;
  if(state.opsLoading)return state.opsLoading;
  state.opsLoading=(async()=>{
    try{
      const safe=async(p,fallback=[])=>{try{return await window.api(p)}catch(_){return fallback}};
      const [events,catches,attempts,rewards,campaigns,entries,shops]=await Promise.all([
        safe('/rest/v1/funy_mon_events?select=id,title,shop_id,starts_at,ends_at,is_force_paused,is_archived,daily_catch_limit,capture_success_bp,distance_limit_enabled,distance_limit_m&order=created_at.desc'),
        safe('/rest/v1/funy_mon_catches?select=id,event_id,shop_id,monster_id,result,reward_type_snapshot,user_id,anonymous_id,caught_at&order=caught_at.desc&limit=5000'),
        safe('/rest/v1/funy_mon_attempt_logs?select=id,event_id,shop_id,user_id,anonymous_id,error_code,catch_id,attempted_at&order=attempted_at.desc&limit=5000'),
        safe('/rest/v1/funy_mon_rewards?select=id,event_id,reward_type,probability_bp,is_active,entry_campaign_id,stock_total,stock_remaining,title&order=sort_order.asc'),
        safe('/rest/v1/event_campaigns?select=id,title,starts_at,ends_at,status,entry_limit_mode,entry_limit_count&order=created_at.desc'),
        safe('/rest/v1/live_reports?select=id,shop_id,content,created_at,status&status=eq.EVENT_ENTRY&order=created_at.desc&limit=5000'),
        safe('/rest/v1/shops?select=id,name,name_en&order=name.asc')
      ]);
      Object.assign(state,{events:events||[],rows:catches||[],attempts:attempts||[],rewards:rewards||[],campaigns:campaigns||[],entries:entries||[],shops:shops||[],opsLoadedAt:Date.now()});
    }finally{state.opsLoading=null}
  })();
  return state.opsLoading;
}
function metricForEvent(id){
  const catches=state.rows.filter(x=>x.event_id===id);
  const blocked=state.attempts.filter(x=>x.event_id===id&&!x.catch_id&&x.error_code);
  const users=new Set(catches.map(x=>x.user_id||x.anonymous_id).filter(Boolean));
  const campaignIds=new Set(state.rewards.filter(r=>r.event_id===id&&r.reward_type==='entry'&&r.entry_campaign_id).map(r=>r.entry_campaign_id));
  const entries=state.entries.filter(x=>campaignIds.has(x.shop_id));
  return {catches:catches.length,users:users.size,entries:entries.length,blocked:blocked.length,todayEntries:entries.filter(x=>kstDay(x.created_at)===todayKst()).length};
}
function eventState(ev){
  const now=Date.now(),s=new Date(ev.starts_at).getTime(),e=new Date(ev.ends_at).getTime();
  if(ev.is_archived)return'보관';
  if(ev.is_force_paused)return'일시중지';
  if(now>e)return'종료';
  if(now<s)return'진행예정';
  return'진행중';
}
async function patchEvent(id,payload,success){
  try{
    await window.api('/rest/v1/funy_mon_events?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({...payload,updated_at:new Date().toISOString()})});
    state.opsLoadedAt=0;await loadOps(true);await window.loadFunyMonRewards?.();if(success)alert(success);
  }catch(e){alert('이벤트 상태 변경 실패: '+(e.message||e))}
}
function addEventActions(row,ev){
  if(row.querySelector('.fmh-event-actions'))return;
  const del=row.querySelector('[data-mon-event-delete]'),edit=row.querySelector('[data-mon-event-edit]');
  if(!del&&!edit)return;
  const box=document.createElement('div');box.className='fmh-event-actions';
  if(edit)box.appendChild(edit);
  const pause=document.createElement('button');pause.type='button';pause.className='fmh-action secondary';
  pause.textContent=ev.is_force_paused?'재개':'일시중지';
  pause.onclick=e=>{e.stopPropagation();if(ev.is_archived)return;patchEvent(ev.id,{is_force_paused:!ev.is_force_paused},ev.is_force_paused?'이벤트를 재개했습니다.':'이벤트를 일시중지했습니다.')};
  box.appendChild(pause);
  const archive=document.createElement('button');archive.type='button';archive.className='fmh-action muted';archive.textContent=ev.is_archived?'보관됨':'보관';
  archive.disabled=!!ev.is_archived;
  archive.onclick=e=>{e.stopPropagation();if(!confirm('이 이벤트를 보관할까요?\n포획/응모 이력은 유지되며 지도에서는 노출되지 않습니다.'))return;patchEvent(ev.id,{is_archived:true,archived_at:new Date().toISOString(),is_force_paused:true},'이벤트를 보관했습니다.')};
  box.appendChild(archive);
  if(del){del.textContent='삭제';del.classList.add('fmh-action','danger');box.appendChild(del)}
  row.appendChild(box);
}
async function enhanceEventRows(){
  if(state.mode!=='events'||!document.querySelector('#monEventRows'))return;
  await loadOps();
  const head=document.querySelector('.mon-admin-list .mon-admin-head');
  if(head&&!head.querySelector('.fmh-event-head')){const s=document.createElement('span');s.className='fmh-event-head';s.textContent='이벤트 ID';head.insertBefore(s,head.firstChild)}
  document.querySelectorAll('.mon-admin-row[data-mon-event]').forEach(row=>{
    const id=row.dataset.monEvent,ev=state.events.find(x=>x.id===id);if(!ev)return;
    if(!row.querySelector('.fmh-event-cell')){const cell=document.createElement('div');cell.className='fmh-event-cell';cell.textContent=shortEventId(id);cell.title=id;row.insertBefore(cell,row.firstChild)}
    const shop=row.querySelector('.shop-admin-name');
    if(shop&&!shop.querySelector('.fmh-event-kpis')){const m=metricForEvent(id),span=document.createElement('span');span.className='fmh-event-kpis';span.textContent='포획 '+m.catches+' · 참여 '+m.users+' · 응모 '+m.entries+(m.blocked?' · 제한 '+m.blocked:'');shop.appendChild(span)}
    const status=row.querySelector('.mon-event-status');
    if(status){const s=eventState(ev);status.textContent=s;status.classList.toggle('fmh-paused',s==='일시중지');status.classList.toggle('fmh-archived',s==='보관')}
    addEventActions(row,ev);
  });
}
function linkedEntryInfo(eventId){
  const rewards=state.rewards.filter(r=>r.event_id===eventId&&r.is_active&&r.reward_type==='entry'&&r.entry_campaign_id);
  return rewards.map(r=>({reward:r,campaign:state.campaigns.find(c=>c.id===r.entry_campaign_id)})).filter(x=>x.campaign);
}
async function renderEditorGuard(){
  const pane=document.querySelector('[data-mon-pane="basic"]');if(!pane||!state.editingEventId||state.editingEventId==='new')return;
  await loadOps();
  let box=pane.querySelector('.fmh-editor-guard');
  if(!box){box=document.createElement('div');box.className='fmh-editor-guard';const grid=pane.querySelector('.mon-config-grid');(grid||pane).insertAdjacentElement('afterend',box)}
  const ev=state.events.find(x=>x.id===state.editingEventId);
  if(!ev){box.remove();return}
  const linked=linkedEntryInfo(ev.id),daily=Math.max(0,Number(document.getElementById('monDailyLimit')?.value??ev.daily_catch_limit)||0),success=Math.max(0,Number(document.getElementById('monCaptureSuccess')?.value??(ev.capture_success_bp/100))||0);
  const notes=[],warn=[];
  if(linked.length){
    linked.forEach(({campaign})=>{
      const total=state.entries.filter(x=>x.shop_id===campaign.id).length,today=state.entries.filter(x=>x.shop_id===campaign.id&&kstDay(x.created_at)===todayKst()).length;
      notes.push('응모: '+campaign.title+' · '+entryLimitText(campaign.entry_limit_mode,campaign.entry_limit_count)+' · 누적 '+total+'회 · 오늘 '+today+'회');
      if(campaign.entry_limit_mode==='daily'&&daily>0&&Number(campaign.entry_limit_count||1)>daily)warn.push('응모 제한은 1일 '+campaign.entry_limit_count+'회지만 퍼니몬 포획은 1일 '+daily+'회라 실제 응모 가능 횟수가 더 적습니다.');
    });
    if(success<100)warn.push('응모형 리워드가 연결되어 있습니다. 포획 실패도 일일 포획 횟수에 포함되므로 포획 성공률 100%를 권장합니다.');
  }
  box.innerHTML='<div class="fmh-guard-title"><b>운영 체크</b><span>'+eventState(ev)+'</span></div>'+(notes.length?'<div class="fmh-guard-info">'+notes.map(x=>'<p>'+esc(x)+'</p>').join('')+'</div>':'<p class="fmh-guard-muted">연결된 응모형 리워드가 없습니다.</p>')+(warn.length?'<div class="fmh-guard-warn">'+warn.map(x=>'<p>⚠ '+esc(x)+'</p>').join('')+'</div>':'<div class="fmh-guard-ok">현재 설정에서 충돌하는 참여 제한이 없습니다.</div>')+(linked.length?'<div class="fmh-guard-actions">'+linked.map(({campaign})=>'<button type="button" data-fmh-open-campaign="'+esc(campaign.id)+'">'+esc(campaign.title)+' 응모 내역 보기</button>').join('')+'</div>':'');
  box.querySelectorAll('[data-fmh-open-campaign]').forEach(btn=>btn.onclick=()=>{
    const campaign=state.campaigns.find(x=>x.id===btn.dataset.fmhOpenCampaign);if(!campaign)return;
    document.querySelector('[data-admin-tab="event"]')?.click();
    setTimeout(()=>window.loadEventEntries?.({id:'campaign-'+campaign.id,title:campaign.title,shopId:campaign.id,period:dt(campaign.starts_at)+' ~ '+dt(campaign.ends_at),status:'진행중',managed:true,limitMode:campaign.entry_limit_mode,limitCount:campaign.entry_limit_count}),80);
  });
  ['monDailyLimit','monCaptureSuccess'].forEach(id=>{const el=document.getElementById(id);if(el&&!el.dataset.fmhGuard){el.dataset.fmhGuard='1';el.addEventListener('input',()=>renderEditorGuard())}});
}
async function enhanceRewardOverview(){
  if(state.rewardOverviewBusy||!state.editingEventId||state.editingEventId==='new')return;
  const pane=document.querySelector('[data-mon-pane="detail"]');if(!pane||pane.querySelector('.fmh-reward-overview'))return;
  state.rewardOverviewBusy=true;
  try{
    await loadOps();
    const rewards=state.rewards.filter(r=>r.event_id===state.editingEventId),active=rewards.filter(r=>r.is_active),sum=active.reduce((a,r)=>a+(Number(r.probability_bp)||0),0),remain=Math.max(0,10000-sum);
    const rows=rewards.map(r=>{const sold=Number(r.stock_remaining)<=0,status=!r.is_active?'비활성':sold?'소진':'운영중';return '<div class="fmh-stock-row"><div><b>'+esc(r.title||'-')+'</b><span>'+esc(({win:'당첨',entry:'응모',lose:'꽝'}[r.reward_type]||r.reward_type||'-'))+'</span></div><div><strong>'+Number(r.stock_remaining||0)+'</strong> / '+Number(r.stock_total||0)+'</div><em class="'+(sold?'sold':'')+'">'+status+'</em></div>'}).join('')||'<div class="fmh-stock-empty">등록된 리워드가 없습니다.</div>';
    const box=document.createElement('div');box.className='fmh-reward-overview';box.innerHTML='<div class="fmh-overview-head"><b>리워드 운영 현황</b><span class="'+(sum===10000?'ok':sum>10000?'bad':'warn')+'">활성 확률 '+(sum/100).toFixed(2).replace(/\.00$/,'')+'%</span></div>'+(sum<10000?'<p>잔여 '+(remain/100).toFixed(2).replace(/\.00$/,'')+'%는 자동으로 꽝 처리됩니다.</p>':'')+(sum>10000?'<p class="bad">활성 확률 합계는 100%를 초과할 수 없습니다.</p>':'')+'<div class="fmh-stock-list">'+rows+'</div>';pane.insertBefore(box,pane.firstChild);
  }finally{state.rewardOverviewBusy=false}
}
async function validateEventSave(btn){
  const shop=document.getElementById('monEventShop')?.value,start=document.getElementById('monEventStart')?.value,end=document.getElementById('monEventEnd')?.value;
  if(!shop||!start||!end){btn.dataset.fmhBypass='1';btn.click();delete btn.dataset.fmhBypass;return}
  try{
    const events=await window.api('/rest/v1/funy_mon_events?select=id,shop_id,starts_at,ends_at,is_archived&shop_id=eq.'+encodeURIComponent(shop)+'&is_archived=eq.false');
    const s=new Date(start).getTime(),e=new Date(end).getTime(),overlap=(events||[]).find(x=>x.id!==state.editingEventId&&s<=new Date(x.ends_at).getTime()&&e>=new Date(x.starts_at).getTime());
    if(overlap){alert('같은 카드샵에 운영기간이 겹치는 FUNY MON 이벤트가 있습니다.\n기존 이벤트 기간을 확인해주세요.');return}
  }catch(err){alert('이벤트 중복 확인 실패: '+(err.message||err));return}
  btn.dataset.fmhBypass='1';btn.click();delete btn.dataset.fmhBypass;
}
async function validateRewardSave(btn){
  const card=btn.closest('.mon-card');if(!card||!state.editingEventId){btn.dataset.fmhBypass='1';btn.click();delete btn.dataset.fmhBypass;return}
  const get=k=>card.querySelector('[data-k="'+k+'"]'),pct=Math.max(0,Number(get('probability')?.value)||0),active=String(get('is_active')?.value)==='true';
  try{
    const rewards=await window.api('/rest/v1/funy_mon_rewards?select=id,probability_bp,is_active&event_id=eq.'+encodeURIComponent(state.editingEventId));
    const currentId=card.dataset.monId,sum=(rewards||[]).filter(r=>r.id!==currentId&&r.is_active).reduce((a,r)=>a+(Number(r.probability_bp)||0),0)+(active?Math.round(pct*100):0);
    if(sum>10000){alert('활성 리워드 확률 합계는 100%를 초과할 수 없습니다.\n현재 설정 기준 '+(sum/100).toFixed(2).replace(/\.00$/,'')+'%입니다.');return}
  }catch(_){}
  btn.dataset.fmhBypass='1';btn.click();delete btn.dataset.fmhBypass;
}

function attemptClass(code){
  if(code==='too_far')return{key:'distance',label:'거리 제한',detail:'포획 반경 밖'};
  if(code==='daily_catch_limit'||code==='already_caught_today')return{key:'limit',label:'참여 제한',detail:'일일 횟수 초과'};
  if(code==='event_unavailable'||code==='shop_unavailable'||code==='monster_unavailable')return{key:'event',label:'운영 제한',detail:code==='event_unavailable'?'이벤트 미운영':code==='shop_unavailable'?'매장 비활성':'퍼니몬 설정 변경'};
  return{key:'error',label:'시스템 오류',detail:'요청 처리 오류'};
}
function combinedRows(){
  const catches=state.rows.map(x=>({...x,_kind:'catch',_time:x.caught_at}));
  const attempts=state.attempts.filter(x=>!x.catch_id&&x.error_code).map(x=>({...x,_kind:'attempt',_time:x.attempted_at}));
  return [...catches,...attempts].sort((a,b)=>new Date(b._time)-new Date(a._time));
}
function filteredHistoryRows(){
  const ev=document.getElementById('fmhEvent')?.value||'',shop=document.getElementById('fmhShop')?.value||'',mon=document.getElementById('fmhMonster')?.value||'',res=document.getElementById('fmhResult')?.value||'',q=(document.getElementById('fmhSearch')?.value||'').trim().toLowerCase();
  return combinedRows().filter(x=>{
    if(ev&&x.event_id!==ev)return false;if(shop&&x.shop_id!==shop)return false;if(mon&&x.monster_id!==mon)return false;
    if(res){
      if(res==='success'&&!(x._kind==='catch'&&okResults.has(x.result)))return false;
      if(res==='failed'&&!(x._kind==='catch'&&x.result==='failed'))return false;
      if(res.startsWith('blocked_')&&!(x._kind==='attempt'&&attemptClass(x.error_code).key===res.slice(8)))return false;
    }
    const user=x.user_id?profileName(x.user_id):x.anonymous_id;
    if(q&&![x.event_id,shortEventId(x.event_id),x.claim_code,x.anonymous_id,x.user_id,user,x.reward_title_snapshot,x.shop_name_snapshot,x.error_code,monName(x.monster_id)].filter(Boolean).join(' ').toLowerCase().includes(q))return false;
    return true;
  });
}
function statsHtml(rows){
  const catches=rows.filter(x=>x._kind==='catch'),blocked=rows.filter(x=>x._kind==='attempt'),success=catches.filter(x=>okResults.has(x.result)).length,failed=catches.filter(x=>x.result==='failed').length,users=new Set(rows.map(x=>x.user_id||x.anonymous_id).filter(Boolean)).size,entries=catches.filter(x=>x.reward_type_snapshot==='entry').length,rate=catches.length?((success/catches.length)*100).toFixed(1):'0.0';
  return '<div class="fmh-stat"><b>'+rows.length+'</b><span>전체 시도</span></div><div class="fmh-stat"><b>'+success+'</b><span>포획 성공</span></div><div class="fmh-stat"><b>'+failed+'</b><span>포획 실패</span></div><div class="fmh-stat"><b>'+blocked.length+'</b><span>참여 제한</span></div><div class="fmh-stat"><b>'+rate+'%</b><span>판정 성공률</span></div><div class="fmh-stat"><b>'+users+'</b><span>고유 참여자</span></div><div class="fmh-stat"><b>'+entries+'</b><span>응모권 획득</span></div>';
}
function userLabel(x){
  if(x.user_id)return '<span class="fmh-user-kind member">회원</span><b>'+esc(profileName(x.user_id))+'</b><small>'+esc(String(x.user_id).slice(0,8))+'…</small>';
  const id=String(x.anonymous_id||'-');return '<span class="fmh-user-kind anon">비회원</span><b>익명</b><small>'+esc(id.length>16?id.slice(0,8)+'…'+id.slice(-5):id)+'</small>';
}
function rewardName(x){
  if(x._kind==='attempt')return attemptClass(x.error_code).detail;
  if(x.result==='failed')return'-';
  return({win:'당첨',entry:'응모',lose:'꽝',none:'리워드 없음',fail:'-'}[x.reward_type_snapshot]||'-');
}
function resultHtml(x){
  if(x._kind==='attempt'){const a=attemptClass(x.error_code);return '<span class="fmh-result blocked '+a.key+'">'+a.label+'</span>'}
  if(x.result==='failed')return '<span class="fmh-result failed">포획 실패</span>';
  return '<span class="fmh-result">포획 성공</span>';
}
function claimSelect(claim){
  if(!claim)return'-';
  const opts=[['issued','발급'],['posted','게시완료'],['verified','확인완료'],['reward_sent','지급완료'],['expired','만료'],['invalid','무효']];
  return '<select class="fmh-claim-select" data-claim-id="'+esc(claim.id)+'" data-prev="'+esc(claim.status)+'">'+opts.map(([v,l])=>'<option value="'+v+'"'+(claim.status===v?' selected':'')+'>'+l+'</option>').join('')+'</select>';
}
async function updateClaimStatus(id,status,select){
  select.disabled=true;try{const patch={status};if(status==='verified')patch.verified_at=new Date().toISOString();if(status==='reward_sent')patch.sent_at=new Date().toISOString();await window.api('/rest/v1/funy_mon_reward_claims?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify(patch)});const c=state.claims.find(x=>x.id===id);if(c)c.status=status;select.dataset.prev=status}catch(e){select.value=select.dataset.prev||'issued';alert('당첨 상태 변경 실패: '+(e.message||e))}finally{select.disabled=false}
}
function renderHistoryRows(rows){
  const root=document.getElementById('fmhRows');if(!root)return;
  if(!rows.length){root.innerHTML='<div class="empty">조건에 맞는 포획·참여 이력이 없습니다.</div>';return}
  root.innerHTML=rows.map(x=>{
    const claim=x._kind==='catch'?state.claims.find(c=>(x.id&&c.catch_id===x.id)||(x.claim_code&&c.claim_code===x.claim_code)):null;
    const shop=state.shops.find(s=>s.id===x.shop_id);
    return '<div class="fmh-row '+(x._kind==='attempt'?'fmh-attempt-row':'')+'"><div class="fmh-event-id" title="'+esc(x.event_id||'')+'">'+esc(shortEventId(x.event_id))+'</div><div>'+dt(x._time)+'</div><div>'+esc(x.shop_name_snapshot||shop?.name||x.shop_id||'-')+'</div><div>'+esc(monName(x.monster_id))+'</div><div>'+resultHtml(x)+'</div><div>'+esc(rewardName(x))+'</div><div class="fmh-code">'+esc(x.claim_code||'-')+'</div><div>'+claimSelect(claim)+'</div><div class="fmh-user">'+userLabel(x)+'</div></div>';
  }).join('');
  root.querySelectorAll('.fmh-claim-select').forEach(s=>s.onchange=()=>updateClaimStatus(s.dataset.claimId,s.value,s));
}
function refreshHistory(){
  const rows=filteredHistoryRows();const stats=document.getElementById('fmhStats');if(stats)stats.innerHTML=statsHtml(rows);renderHistoryRows(rows);
}
function downloadCsv(){
  const rows=filteredHistoryRows(),headers=['이벤트 ID','포획/시도 일시','카드샵','퍼니몬','구분','상세','리워드','코드','사용자 유형','사용자'];
  const body=rows.map(x=>{const a=x._kind==='attempt'?attemptClass(x.error_code):null;return[shortEventId(x.event_id),dt(x._time),state.shops.find(s=>s.id===x.shop_id)?.name||x.shop_id||'',monName(x.monster_id),a?a.label:(x.result==='failed'?'포획 실패':'포획 성공'),a?.detail||'',rewardName(x),x.claim_code||'',x.user_id?'회원':'비회원',x.user_id?(profileName(x.user_id)+' '+x.user_id):(x.anonymous_id||'')]});
  const csv=[headers,...body].map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\n'),blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='funymon-history-'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
async function loadHistory(){
  const f=document.getElementById('feed');if(!f)return;f.innerHTML=tabs()+'<div class="empty">포획·참여 이력을 불러오는 중...</div>';bindTabs();
  try{
    await loadOps(true);
    const safe=async(p,fallback=[])=>{try{return await window.api(p)}catch(_){return fallback}};
    const [claims,profiles]=await Promise.all([
      safe('/rest/v1/funy_mon_reward_claims?select=id,catch_id,event_id,reward_id,claim_code,status,reward_type_snapshot,reward_title_snapshot,created_at&order=created_at.desc&limit=5000'),
      safe('/rest/v1/profiles?select=user_id,nickname&limit=5000')
    ]);
    state.claims=claims||[];state.profiles=profiles||[];
    const eventOptions=[...new Set(combinedRows().map(x=>x.event_id).filter(Boolean))],shopOptions=[...new Map(combinedRows().map(x=>[x.shop_id,state.shops.find(s=>s.id===x.shop_id)?.name||x.shop_id]).filter(x=>x[0])).entries()],monsterOptions=[...new Set(combinedRows().map(x=>x.monster_id).filter(Boolean))];
    f.innerHTML=tabs()+'<div class="fmh-filters"><select id="fmhEvent" class="select"><option value="">전체 이벤트</option>'+eventOptions.map(x=>'<option value="'+esc(x)+'">'+esc(shortEventId(x))+'</option>').join('')+'</select><select id="fmhShop" class="select"><option value="">전체 카드샵</option>'+shopOptions.map(x=>'<option value="'+esc(x[0])+'">'+esc(x[1])+'</option>').join('')+'</select><select id="fmhMonster" class="select"><option value="">전체 퍼니몬</option>'+monsterOptions.map(x=>'<option value="'+esc(x)+'">'+esc(monName(x))+'</option>').join('')+'</select><select id="fmhResult" class="select"><option value="">전체 결과</option><option value="success">포획 성공</option><option value="failed">포획 실패</option><option value="blocked_distance">거리 제한</option><option value="blocked_limit">참여 제한</option><option value="blocked_event">운영 제한</option><option value="blocked_error">시스템 오류</option></select><input id="fmhSearch" class="input" type="search" placeholder="이벤트 · 코드 · 회원/익명 ID 검색"></div><div class="fmh-history-actions"><button id="fmhDownload" class="fmh-download" type="button">CSV 다운로드</button></div><div id="fmhStats" class="fmh-stats">'+statsHtml(combinedRows())+'</div><div class="fmh-list"><div class="fmh-head"><span>이벤트</span><span>일시</span><span>카드샵</span><span>퍼니몬</span><span>결과</span><span>상세/리워드</span><span>코드</span><span>상태</span><span>사용자</span></div><div id="fmhRows"></div></div>';
    bindTabs();['fmhEvent','fmhShop','fmhMonster','fmhResult'].forEach(id=>document.getElementById(id).onchange=refreshHistory);document.getElementById('fmhSearch').oninput=refreshHistory;document.getElementById('fmhDownload').onclick=downloadCsv;refreshHistory();
  }catch(e){f.innerHTML=tabs()+'<div class="empty error">포획 이력 조회 실패: '+esc(e.message)+'</div>';bindTabs()}
}
async function enhanceEvents(){
  if(state.mode!=='events')return;
  const active=document.querySelector('[data-admin-tab="mon"].on'),f=document.getElementById('feed');if(!active||!f)return;
  if(!f.querySelector('.fmh-tabs')){f.insertAdjacentHTML('afterbegin',tabs());bindTabs()}
  await enhanceEventRows();await renderEditorGuard();await enhanceRewardOverview();
}
document.addEventListener('click',e=>{
  if(e.target.closest?.('[data-admin-tab="mon"]'))state.mode='events';
  const row=e.target.closest?.('[data-mon-event]');if(row)state.editingEventId=row.dataset.monEvent||null;
  const b=e.target.closest?.('button'),text=(b?.textContent||'').trim();if(text.includes('이벤트 만들기')||text.includes('이벤트 추가'))state.editingEventId='new';
  const evSave=e.target.closest?.('#monEventSave');if(evSave&&!evSave.dataset.fmhBypass){e.preventDefault();e.stopImmediatePropagation();validateEventSave(evSave)}
  const rwSave=e.target.closest?.('[data-mon-save]');if(rwSave&&!rwSave.dataset.fmhBypass){e.preventDefault();e.stopImmediatePropagation();validateRewardSave(rwSave)}
},true);
const observer=new MutationObserver(()=>{clearTimeout(window.__fmhTimer);window.__fmhTimer=setTimeout(enhanceEvents,30)});observer.observe(document.documentElement,{subtree:true,childList:true});
window.FunyMonHistoryAdmin={load:loadHistory,enhanceEvents,refreshOps:()=>loadOps(true)};
setTimeout(enhanceEvents,0);
})();