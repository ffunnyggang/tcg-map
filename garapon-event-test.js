import { GaraponMachine } from './garapon-three-machine-v2.js?v=20261016-hole-release1';

const SUPABASE_URL='https://wdttzpbmqavaqfcbaywj.supabase.co';
const SUPABASE_KEY='sb_publishable__wrSzngSE-JbGnyE7PZX9w_2QaW8bpq';
const TURN_REQUIRED=Math.PI*2;
const $=id=>document.getElementById(id);
const els={
  gate:$('gate'),gateTitle:$('gateTitle'),gateText:$('gateText'),gateAction:$('gateAction'),content:$('eventContent'),
  title:$('eventTitle'),description:$('eventDescription'),period:$('eventPeriod'),coinBalance:$('coinBalance'),coinCost:$('coinCost'),
  remaining:$('remainingBalls'),remainingSub:$('remainingSub'),queue:$('queueCount'),resultTitle:$('resultTitle'),resultSub:$('resultSub'),
  stage:$('machineStage'),canvas:$('garaponCanvas'),loading:$('canvasLoading'),fallback:$('webglFallback'),dragTip:$('dragTip'),
  turnTitle:$('turnTitle'),turnText:$('turnText'),turnTimer:$('turnTimer'),turnProgress:$('turnProgress'),join:$('joinButton'),sound:$('soundToggle'),
  ballList:$('ballList'),ballSummary:$('ballSummary'),recent:$('recentResults'),mine:$('myParticipations'),
  resultPop:$('resultPop'),resultBall:$('resultBall'),resultLabel:$('resultLabel'),resultPopTitle:$('resultPopTitle'),resultPopText:$('resultPopText'),resultClose:$('resultClose'),toast:$('toast')
};

let accessToken='';
let eventId='';
let currentState=null;
let machine=null;
let pollTimer=0;
let pollBusy=false;
let machineReady=false;
let activeParticipationId='';
let activeResult=null;
let manualProgress=0;
let drawStarted=false;
let animationReady=false;
let resultReleased=false;
let autoTimer=0;
let autoRunning=false;
let toastTimer=0;
let soundEnabled=true;
let audioCtx=null;
let noiseBuffer=null;
let lastRattleAt=0;

try{soundEnabled=localStorage.getItem('funypin-garapon-event-sound')!=='0'}catch(_){}

function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function uuid(){try{return crypto.randomUUID()}catch(_){return '00000000-0000-4000-8000-'+Math.random().toString(16).slice(2,14).padEnd(12,'0')}}
function showToast(message){clearTimeout(toastTimer);els.toast.textContent=message;els.toast.classList.add('show');toastTimer=setTimeout(()=>els.toast.classList.remove('show'),1800)}
function setGate(title,text,{login=false,error=false}={}){els.content.hidden=true;els.gate.hidden=false;els.gateTitle.textContent=title;els.gateText.textContent=text;els.gateTitle.classList.toggle('restricted',error);els.gateAction.hidden=!login}
function showContent(){els.gate.hidden=true;els.content.hidden=false}
function goBack(){try{if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(JSON.stringify({type:'NATIVE_BACK'}));return}}catch(_){}if(history.length>1)history.back();else location.href='/'}
function formatDate(value){if(!value)return'';const d=new Date(value);if(Number.isNaN(d.getTime()))return'';return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'long',day:'numeric',hour:'numeric',minute:'2-digit'}).format(d)}
function timeAgo(value){const ms=Date.now()-new Date(value).getTime();if(!Number.isFinite(ms))return'';const s=Math.max(0,Math.floor(ms/1000));if(s<10)return'방금 전';if(s<60)return s+'초 전';const m=Math.floor(s/60);if(m<60)return m+'분 전';return formatDate(value)}
function darken(hex,ratio=.72){try{const n=parseInt(String(hex).replace('#',''),16);const r=Math.round(((n>>16)&255)*ratio),g=Math.round(((n>>8)&255)*ratio),b=Math.round((n&255)*ratio);return '#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('')}catch(_){return'#555555'}}

function ensureAudio(){if(!soundEnabled)return null;try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;if(!audioCtx)audioCtx=new AC({latencyHint:'interactive'});if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});return audioCtx}catch(_){return null}}
function noise(ctx){if(noiseBuffer&&noiseBuffer.sampleRate===ctx.sampleRate)return noiseBuffer;const length=Math.floor(ctx.sampleRate*.14),buffer=ctx.createBuffer(1,length,ctx.sampleRate),data=buffer.getChannelData(0);let p=0;for(let i=0;i<length;i++){p=p*.65+(Math.random()*2-1)*.35;data[i]=p}noiseBuffer=buffer;return buffer}
function rattle(motion=.12){const ctx=ensureAudio();if(!ctx)return;const nowMs=performance.now();if(nowMs-lastRattleAt<48)return;lastRattleAt=nowMs;const remain=Number(currentState?.event?.remaining_ball_count||10),density=Math.min(1,Math.log2(remain+1)/7),now=ctx.currentTime;for(let i=0;i<Math.max(1,Math.round(1+density*3));i++){const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),start=now+i*.006;src.buffer=noise(ctx);filter.type='bandpass';filter.frequency.value=560+Math.random()*480;filter.Q.value=2;gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(Math.max(.004,.025*Math.min(1,motion*5)),start+.004);gain.gain.exponentialRampToValueAtTime(.0001,start+.07);src.connect(filter).connect(gain).connect(ctx.destination);src.start(start);src.stop(start+.08)}}
function landSound(){const ctx=ensureAudio();if(!ctx)return;const now=ctx.currentTime,osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.setValueAtTime(520,now);osc.frequency.exponentialRampToValueAtTime(210,now+.13);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.05,now+.006);gain.gain.exponentialRampToValueAtTime(.0001,now+.16);osc.connect(gain).connect(ctx.destination);osc.start(now);osc.stop(now+.17)}
function renderSound(){els.sound.textContent=soundEnabled?'🔊':'🔇';els.sound.setAttribute('aria-pressed',String(soundEnabled))}

async function waitForNativeToken(){
  if(window.__FUNY_ACCESS_TOKEN)return String(window.__FUNY_ACCESS_TOKEN);
  return new Promise(resolve=>{
    let settled=false;
    const done=value=>{if(settled)return;settled=true;window.removeEventListener('funy:auth-ready',handler);clearTimeout(timer);resolve(String(value||''))};
    const handler=()=>done(window.__FUNY_ACCESS_TOKEN||'');
    window.addEventListener('funy:auth-ready',handler);
    const timer=setTimeout(()=>done(window.__FUNY_ACCESS_TOKEN||''),7000);
  });
}
async function resolveAccessToken(){
  if(window.ReactNativeWebView){return waitForNativeToken()}
  const auth=window.FUNY_WEB_AUTH;
  if(!auth)throw new Error('AUTH_NOT_READY');
  await auth.init();
  const session=await auth.getSession();
  return session?.access_token||'';
}
async function rpc(name,body={}){
  if(!accessToken)throw new Error('LOGIN_REQUIRED');
  const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`,{
    method:'POST',cache:'no-store',
    headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json'},
    body:JSON.stringify(body)
  });
  let data=null;try{data=await response.json()}catch(_){}
  if(!response.ok)throw new Error(data?.message||data?.error||`HTTP_${response.status}`);
  return data;
}

function errorText(code){return({
  login_required:'로그인이 필요합니다.',feature_hidden:'현재 비공개 테스트 계정만 참여할 수 있습니다.',event_not_found:'이벤트를 찾을 수 없습니다.',
  event_not_active:'현재 참여할 수 없는 이벤트입니다.',event_not_started:'아직 이벤트가 시작되지 않았습니다.',event_ended:'종료된 이벤트입니다.',
  sold_out:'모든 구슬이 소진되었습니다.',insufficient_funy_coin:'퍼니코인이 부족합니다.',total_entry_limit:'이벤트 참여 가능 횟수를 모두 사용했습니다.',
  daily_entry_limit:'오늘 참여 가능 횟수를 모두 사용했습니다.',active_participation_exists:'현재 대기 중인 참여가 끝난 뒤 다시 참여해주세요.'
}[code]||'요청을 처리하지 못했습니다.')}

function initMachine(){
  try{
    machine=new GaraponMachine(els.canvas,{
      stage:els.stage,dragTip:els.dragTip,
      onReady:()=>{machineReady=true;els.loading.style.display='none';els.fallback.style.display='none';syncPile()},
      canInteract:()=>canManualRotate(),
      invalid:()=>showToast(canManualRotate()?'손잡이를 반시계 방향으로 돌려주세요.':'내 차례가 되면 손잡이를 돌릴 수 있어요.'),
      delta:onManualDelta
    });
  }catch(error){
    console.warn('[GARAPON EVENT 3D]',error);els.loading.style.display='none';els.fallback.style.display='flex';
    machine={
      releaseBall(_c,_e,done){setTimeout(done,650)},autoSequence({onForward,onReady}){let p=0;const id=setInterval(()=>{p=Math.min(1,p+.08);onForward?.(p);if(p>=1){clearInterval(id);onReady?.()}},65)},
      setPileBalls(){},resetBall(){},setInteractionState(){}
    };
    machineReady=true;
  }
}
function currentMine(){return currentState?.my_participations?.find(x=>x.status==='revealing'||x.status==='queued')||null}
function canManualRotate(){const p=currentMine();return !!(p&&p.status==='revealing'&&!drawStarted&&!autoRunning&&!p.result)}
function onManualDelta(delta){
  if(delta>=0||!canManualRotate())return;
  ensureAudio();rattle(Math.abs(delta));manualProgress+=-delta;els.turnProgress.style.width=Math.min(100,manualProgress/TURN_REQUIRED*100)+'%';
  els.dragTip.innerHTML='<b>반시계 방향</b> 회전 '+Math.min(100,Math.round(manualProgress/TURN_REQUIRED*100))+'%';
  if(manualProgress>=TURN_REQUIRED){drawStarted=true;animationReady=true;clearTimeout(autoTimer);els.dragTip.innerHTML='<b>추첨 완료</b> 결과 구슬을 확인하고 있어요';attemptRelease()}
}
function startAutoDraw(){
  if(drawStarted||autoRunning)return;
  drawStarted=true;autoRunning=true;manualProgress=0;ensureAudio();
  els.dragTip.innerHTML='<b>자동 회전</b> 추첨을 마무리하고 있어요';
  machine.autoSequence?.({
    onForward:p=>{manualProgress=TURN_REQUIRED*p;els.turnProgress.style.width=Math.round(p*100)+'%';rattle(.18)},
    onReady:()=>{autoRunning=false;animationReady=true;attemptRelease()}
  });
}
function resetTurn(participation){
  clearTimeout(autoTimer);activeParticipationId=participation?.id||'';activeResult=null;manualProgress=0;drawStarted=false;animationReady=false;resultReleased=false;autoRunning=false;
  els.turnProgress.style.width='0%';machine?.resetBall?.();syncPile();
}
function scheduleAuto(participation){
  clearTimeout(autoTimer);if(!participation||participation.status!=='revealing'||drawStarted)return;
  const remain=new Date(participation.reveal_at).getTime()-Date.now();
  autoTimer=setTimeout(()=>{if(!drawStarted)startAutoDraw()},Math.max(0,remain-1500));
}
function syncTurn(participation){
  if(!participation){
    if(activeParticipationId)resetTurn(null);
    els.turnTitle.textContent='참여 준비';els.turnText.textContent='퍼니코인을 사용해 이벤트에 참여할 수 있어요.';els.turnTimer.textContent='-';els.turnProgress.style.width='0%';
    els.resultTitle.textContent='참여 버튼을 눌러 대기열에 들어가세요';els.resultSub.textContent='내 차례가 되면 손잡이를 반시계 방향으로 한 바퀴 돌려주세요';return;
  }
  if(activeParticipationId!==participation.id)resetTurn(participation);
  const now=Date.now(),start=new Date(participation.turn_starts_at).getTime(),reveal=new Date(participation.reveal_at).getTime();
  if(participation.status==='queued'){
    const seconds=Math.max(0,Math.ceil((start-now)/1000));els.turnTitle.textContent='대기열에 참여했어요';els.turnText.textContent=`내 순번 ${participation.sequence_no}번 · 페이지를 닫아도 결과는 유지됩니다.`;els.turnTimer.textContent=seconds+'초';
    els.resultTitle.textContent='내 차례를 기다리고 있어요';els.resultSub.textContent='차례가 되면 가라폰이 자동으로 활성화됩니다.';
  }else if(participation.status==='revealing'){
    const seconds=Math.max(0,Math.ceil((reveal-now)/1000));els.turnTitle.textContent=drawStarted?'추첨 결과 확인 중':'지금 내 차례예요';els.turnText.textContent=drawStarted?'서버에서 확정된 결과 구슬을 불러오고 있어요.':'손잡이를 반시계 방향으로 한 바퀴 돌려주세요.';els.turnTimer.textContent=seconds+'초';
    els.resultTitle.textContent=drawStarted?'가라폰이 추첨 중이에요':'손잡이를 반시계 방향으로 돌려보세요';els.resultSub.textContent=drawStarted?'결과 공개 시간까지 잠시만 기다려주세요.':'시간 안에 돌리지 않으면 자동으로 진행됩니다.';scheduleAuto(participation);
  }
  if(participation.result){activeResult=participation.result;if(!drawStarted)startAutoDraw();attemptRelease()}
}
function attemptRelease(){
  if(!activeResult||!animationReady||resultReleased)return;
  resultReleased=true;const color=activeResult.color_hex||'#ffffff';
  machine.releaseBall?.(color,darken(color),()=>{landSound();showResult(activeResult);pollNow()});
}
function showResult(result){
  els.resultBall.style.setProperty('--ball',result.color_hex||'#ddd');els.resultLabel.textContent=result.result_label||'RESULT';els.resultPopTitle.textContent=result.prize_title||'추첨 결과';
  els.resultPopText.textContent=result.is_win?(result.claim_required?'당첨됐어요! MY > 응모 내역에서 Instagram ID를 입력해주세요.':'당첨됐어요! MY > 응모 내역에서 처리 상태를 확인할 수 있어요.'):'이번에는 아쉽지만 다음 기회에 다시 도전해보세요.';
  els.resultPop.classList.add('show');try{navigator.vibrate?.([18,40,28])}catch(_){}
}
function syncPile(){
  if(!machineReady||!machine||!currentState)return;
  const active=currentMine();const items=(currentState.recent_results||[]).filter(x=>!(active&&!resultReleased&&x.sequence_no===active.sequence_no)).slice().reverse().map(x=>({color:x.color_hex||'#fff',edge:darken(x.color_hex||'#fff')}));
  machine.setPileBalls?.(items);
}

function renderBalls(data){
  const balls=data||[];if(!balls.length){els.ballList.innerHTML='<div class="empty">구슬 설정을 확인할 수 없어요.</div>';return}
  const remaining=balls.reduce((n,x)=>n+Number(x.remaining_count||0),0);
  els.ballSummary.textContent=remaining.toLocaleString('ko-KR')+'개 남음';
  els.ballList.innerHTML=balls.map(x=>`<div class="ball-row"><span class="ball-dot" style="--ball:${esc(x.color_hex)}"></span><span class="ball-copy"><b>${esc(x.result_label)}</b><span>${esc(x.prize_title||'상품 정보 비공개')}</span></span><span class="ball-value"><b>${x.remaining_count==null?'공개 안 함':Number(x.remaining_count).toLocaleString('ko-KR')+'개'}</b><span>${x.initial_count==null?'':`최초 ${Number(x.initial_count).toLocaleString('ko-KR')}개`}</span></span></div>`).join('');
}
function renderRecent(items){
  if(!items?.length){els.recent.innerHTML='<div class="empty">아직 공개된 결과가 없어요.</div>';return}
  els.recent.innerHTML=items.map(x=>`<div class="feed-item"><span class="ball-dot" style="--ball:${esc(x.color_hex)}"></span><span><b>${esc(x.nickname)} · ${esc(x.result_label)}</b><br><span>${esc(x.is_win?x.prize_title:'추첨 완료')}</span></span><time>${esc(timeAgo(x.reveal_at))}</time></div>`).join('');
}
function statusLabel(status){return({queued:'대기 중',revealing:'추첨 중',completed:'완료',refunded:'환불',failed:'실패',cancelled:'취소'}[status]||status)}
function renderMine(items){
  if(!items?.length){els.mine.innerHTML='<div class="empty">아직 참여 내역이 없어요.</div>';return}
  els.mine.innerHTML=items.map(x=>`<article class="my-card"><div class="my-top"><span class="my-seq">순번 ${x.sequence_no}</span><span class="my-status">${esc(statusLabel(x.status))}</span></div>${x.result?`<div class="my-result">${esc(x.result.prize_title)} · ${esc(x.result.result_label)}</div>`:''}<div class="my-meta">${esc(formatDate(x.requested_at))}${x.status==='queued'?` · 시작 예정 ${esc(formatDate(x.turn_starts_at))}`:''}</div></article>`).join('');
}
function canJoin(state){
  const e=state.event,active=state.my_participations?.some(x=>x.status==='queued'||x.status==='revealing');if(active)return{ok:false,text:'현재 참여 결과를 기다리는 중'};
  if(e.status!=='active')return{ok:false,text:e.status==='sold_out'?'구슬 소진':'현재 참여할 수 없음'};
  if(Number(state.wallet?.balance||0)<Number(e.coin_cost||0))return{ok:false,text:'퍼니코인 부족'};
  if(e.remaining_ball_count===0)return{ok:false,text:'모든 구슬 소진'};
  const mode=e.entry_limit_mode,limit=Number(e.entry_limit_count||0),used=mode==='daily'?Number(state.usage?.today||0):Number(state.usage?.total||0);
  if(mode!=='unlimited'&&used>=limit)return{ok:false,text:'참여 횟수 소진'};
  return{ok:true,text:`퍼니코인 ${Number(e.coin_cost||0).toLocaleString('ko-KR')}개로 참여하기`};
}
function renderState(state){
  currentState=state;showContent();const e=state.event;
  els.title.textContent=e.title||'가라폰 이벤트';els.description.textContent=e.description||'퍼니코인으로 참여하는 실시간 가라폰 이벤트입니다.';els.period.textContent=`${formatDate(e.starts_at)} ~ ${formatDate(e.ends_at)}`;
  els.coinBalance.textContent=Number(state.wallet?.balance||0).toLocaleString('ko-KR');els.coinCost.textContent=Number(e.coin_cost||0).toLocaleString('ko-KR');
  els.remaining.textContent=e.remaining_ball_count==null?'비공개':Number(e.remaining_ball_count).toLocaleString('ko-KR');els.remainingSub.textContent=e.remaining_ball_count==null?'재고 비공개':`총 ${Number(e.total_ball_count||0).toLocaleString('ko-KR')}개`;
  els.queue.textContent=Number(state.queue?.waiting_count||0).toLocaleString('ko-KR');
  renderBalls(state.balls);renderRecent(state.recent_results);renderMine(state.my_participations);syncPile();
  const active=state.my_participations?.find(x=>x.status==='revealing'||x.status==='queued')||null;syncTurn(active);
  const join=canJoin(state);els.join.disabled=!join.ok;els.join.textContent=join.text;
}

async function pollNow(){
  if(pollBusy||!eventId||!accessToken)return;pollBusy=true;
  try{
    const data=await rpc('garapon_get_event_state',{p_event_id:eventId});
    if(!data?.ok){if(data?.error==='feature_hidden')setGate('비공개 테스트 기능입니다','관리자 또는 등록된 테스트 계정만 접근할 수 있습니다.',{error:true});else setGate('이벤트를 열 수 없어요',errorText(data?.error),{error:true});return}
    renderState(data);
  }catch(error){console.warn('[GARAPON EVENT POLL]',error);if(!currentState)setGate('이벤트 정보를 불러오지 못했어요','잠시 후 다시 시도해주세요.',{error:true})}
  finally{pollBusy=false}
}
async function joinEvent(){
  if(!currentState||els.join.disabled)return;ensureAudio();els.join.disabled=true;els.join.textContent='대기열 등록 중...';
  try{
    const data=await rpc('garapon_join_event',{p_event_id:eventId,p_idempotency_key:uuid()});
    if(!data?.ok){showToast(errorText(data?.error));await pollNow();return}
    showToast(`순번 ${data.sequence_no}번으로 참여했어요.`);try{window.FUNY_TRACK?.('garapon_event_join',{event_id:eventId,sequence_no:data.sequence_no,coin_cost:currentState.event.coin_cost})}catch(_){}await pollNow();
  }catch(error){console.warn('[GARAPON EVENT JOIN]',error);showToast('참여 요청을 처리하지 못했어요.');await pollNow()}
}

async function init(){
  eventId=new URLSearchParams(location.search).get('event')||'';
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(eventId)){setGate('이벤트 주소가 올바르지 않아요','관리자가 발급한 비공개 테스트 주소로 접속해주세요.',{error:true});return}
  initMachine();renderSound();
  try{accessToken=await resolveAccessToken()}catch(error){console.warn('[GARAPON EVENT AUTH]',error)}
  if(!accessToken){
    if(window.ReactNativeWebView)setGate('로그인이 필요합니다','FUNY PIN 앱에서 로그인한 뒤 다시 열어주세요.',{error:true});
    else{setGate('로그인이 필요합니다','회원가입 또는 로그인 후 비공개 테스트에 참여할 수 있습니다.',{login:true});els.gateAction.onclick=()=>window.FUNY_WEB_AUTH?.goLogin(location.href)}
    return;
  }
  await pollNow();pollTimer=setInterval(pollNow,900);
}

$('backButton').addEventListener('click',goBack);els.join.addEventListener('click',joinEvent);els.sound.addEventListener('click',()=>{soundEnabled=!soundEnabled;try{localStorage.setItem('funypin-garapon-event-sound',soundEnabled?'1':'0')}catch(_){}if(soundEnabled)ensureAudio();renderSound();showToast(soundEnabled?'사운드를 켰어요.':'사운드를 껐어요.')});els.canvas.addEventListener('pointerdown',ensureAudio,{passive:true});els.resultClose.addEventListener('click',()=>{els.resultPop.classList.remove('show');activeResult=null;animationReady=false;setTimeout(pollNow,80)});window.addEventListener('pagehide',()=>{clearInterval(pollTimer);clearTimeout(autoTimer)});init();
