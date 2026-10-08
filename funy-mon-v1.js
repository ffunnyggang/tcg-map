/* FUNY PIN map creature MVP */
(function(){
  const ENDPOINT='https://wdttzpbmqavaqfcbaywj.supabase.co/functions/v1/funy-mon-catch';
  const SUPABASE_URL='https://wdttzpbmqavaqfcbaywj.supabase.co';
  const SUPABASE_KEY='sb_publishable__wrSzngSE-JbGnyE7PZX9w_2QaW8bpq';
  let TARGET_SHOP_ID='';
  const ANON_KEY='funypin_mon_anon_id';
  const HISTORY_KEY='funypin_mon_history_v1';
  const DAILY_KEY='funypin_mon_daily_catch_v2';
  const PENDING_ENTRY_KEY='funypin_mon_pending_entries_v1';
  window.FUNY_FUNYMON_ACTIVE_SHOPS=window.FUNY_FUNYMON_ACTIVE_SHOPS instanceof Set?window.FUNY_FUNYMON_ACTIVE_SHOPS:new Set();
  window.FUNY_FUNYMON_ACTIVE_EVENTS=window.FUNY_FUNYMON_ACTIVE_EVENTS instanceof Map?window.FUNY_FUNYMON_ACTIVE_EVENTS:new Map();
  const defs=[
    {id:'ponanyang',no:'01',name:'포냐냥',type:'노말',tier:'COMMON',spawnable:true,cls:'mon-01',asset:'assets/funymon/01-ponanyang.png'},
    {id:'bubblelong',no:'02',name:'버블롱',type:'물',tier:'COMMON',spawnable:true,cls:'mon-02',asset:'assets/funymon/02-bubblelong.png'},
    {id:'hatring',no:'03',name:'하트링',type:'페어리',tier:'UNCOMMON',spawnable:true,cls:'mon-03',asset:'assets/funymon/03-hatring.png'},
    {id:'bulgi',no:'04',name:'불기',type:'불',tier:'UNCOMMON',spawnable:true,cls:'mon-04',asset:'assets/funymon/04-bulgi.png'},
    {id:'namumong',no:'05',name:'나무몽',type:'풀',tier:'UNCOMMON',spawnable:true,cls:'mon-05',asset:'assets/funymon/05-namumong.png'},
    {id:'ggomagureum',no:'06',name:'꼬마구름',type:'비행',tier:'RARE',spawnable:false,cls:'mon-06',asset:'assets/funymon/06-ggomagureum.png'},
    {id:'bawidong',no:'07',name:'바위동',type:'바위',tier:'RARE',spawnable:false,cls:'mon-07',asset:'assets/funymon/07-bawidong.png'},
    {id:'grimjamong',no:'08',name:'그림자몽',type:'고스트',tier:'SUPER RARE',spawnable:false,cls:'mon-08',asset:'assets/funymon/08-grimjamong.png'},
    {id:'beonjjeogi',no:'09',name:'번쩍이',type:'전기',tier:'SUPER RARE',spawnable:false,cls:'mon-09',asset:'assets/funymon/09-beonjjeogi.png'},
    {id:'neon',no:'10',name:'네온',type:'코스믹',tier:'LEGENDARY',spawnable:false,cls:'mon-10',asset:'assets/funymon/10-neon.png'}
  ];
  const offsets=[
    {lat:0.00010,lng:0.00013},
    {lat:-0.00009,lng:0.00012},
    {lat:0.00006,lng:-0.00015},
    {lat:-0.00013,lng:-0.00010},
    {lat:0.00015,lng:-0.00002}
  ];
  const markers=[];
  const hiddenMarkers=new Set();
  const hiddenKeys=new Set();
  const markerKeys=new Set();
  let started=false,tries=0,busy=false,resultNeedsSave=false,currentResultData=null;

  function todayKst(){
    const d=new Date(Date.now()+9*60*60*1000);
    return d.toISOString().slice(0,10);
  }
  function uuid(){
    if(crypto.randomUUID)return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=crypto.getRandomValues(new Uint8Array(1))[0]&15,v=c==='x'?r:(r&3|8);return v.toString(16)});
  }
  function anonId(){
    try{
      let v=localStorage.getItem(ANON_KEY);
      if(v)return v;
      v=uuid();localStorage.setItem(ANON_KEY,v);return v;
    }catch(_){return uuid()}
  }
  function saveHistory(item){
    try{
      const arr=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');
      arr.unshift(item);
      localStorage.setItem(HISTORY_KEY,JSON.stringify(arr.slice(0,100)));
    }catch(_){}
  }
  function historyItems(){
    try{return JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]')}catch(_){return[]}
  }
  function wasCaughtBefore(monsterId){
    return historyItems().some(x=>x&&x.monster_id===monsterId&&x.result!=='failed');
  }
  function pendingEntries(){
    try{
      const rows=JSON.parse(localStorage.getItem(PENDING_ENTRY_KEY)||'[]');
      return Array.isArray(rows)?rows.filter(x=>x&&x.claim_code):[];
    }catch(_){return[]}
  }
  function savePendingEntry(data,def){
    const r=data?.reward||{};
    if((r.reward_type||'')!=='entry'||!r.entry_apply_enabled||!r.entry_campaign_id||!r.claim_code)return;
    try{
      const rows=pendingEntries().filter(x=>x.claim_code!==r.claim_code);
      rows.unshift({claim_code:r.claim_code,campaign_id:r.entry_campaign_id,monster_id:def.id,data,created_at:Date.now()});
      localStorage.setItem(PENDING_ENTRY_KEY,JSON.stringify(rows.slice(0,20)));
    }catch(_){}
    renderPendingEntryButton();
  }
  function removePendingEntry(claim){
    if(!claim)return;
    try{localStorage.setItem(PENDING_ENTRY_KEY,JSON.stringify(pendingEntries().filter(x=>x.claim_code!==claim)))}catch(_){}
    renderPendingEntryButton();
  }
  function ensurePendingEntryButton(){
    let el=document.getElementById('funyMonPendingEntry');
    if(el)return el;
    el=document.createElement('button');
    el.id='funyMonPendingEntry';el.className='funy-mon-pending-entry';el.type='button';el.hidden=true;
    el.innerHTML='<span class="funy-mon-pending-dot" aria-hidden="true"></span><span><b>미완료 응모</b><small id="funyMonPendingEntryCount"></small></span><i>›</i>';
    el.addEventListener('click',()=>{
      const item=pendingEntries()[0];if(!item)return;
      const def=defById(item.monster_id);if(!def)return;
      const data=item.data||{};data._isNew=false;
      openResult(data,def);
    });
    document.body.appendChild(el);return el;
  }
  function renderPendingEntryButton(){
    const el=ensurePendingEntryButton(),rows=pendingEntries(),count=document.getElementById('funyMonPendingEntryCount');
    el.hidden=!rows.length;if(count)count.textContent=rows.length+'건 · 이어서 응모하기';
  }
  function syncEventDetailBanner(){
    document.querySelector('.funymon-detail-banner')?.remove();
    const m=location.hash.match(/#\/shop\/((?:KR|JP)-[A-Z]{3}-\d{3})/i);if(!m)return;
    const shopId=m[1].toUpperCase(),ev=window.FUNY_FUNYMON_ACTIVE_EVENTS.get(shopId);if(!ev)return;
    const summary=document.querySelector('#detail .summary-card');if(!summary)return;
    const box=document.createElement('div');box.className='funymon-detail-banner';
    const end=ev.ends_at?new Date(ev.ends_at).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}):'';
    box.innerHTML='<span class="funymon-detail-kicker">FUNY MON</span><div><b>퍼니몬 출현 중</b><small>'+String(ev.title||'매장 이벤트').replace(/[<>]/g,'')+(end?' · '+end+'까지':'')+'</small></div><i>›</i>';
    summary.insertAdjacentElement('afterend',box);
  }
  function syncActiveEventShops(events){
    const set=window.FUNY_FUNYMON_ACTIVE_SHOPS,map=window.FUNY_FUNYMON_ACTIVE_EVENTS;set.clear();map.clear();
    (events||[]).forEach(ev=>{if(ev?.shop_id){set.add(ev.shop_id);if(!map.has(ev.shop_id))map.set(ev.shop_id,ev)}});
    try{window.dispatchEvent(new CustomEvent('funy:list-refresh',{detail:{reason:'funymon-events'}}))}catch(_){}
    setTimeout(syncEventDetailBanner,0);
  }
  function markCaughtToday(){
    try{localStorage.setItem(DAILY_KEY,JSON.stringify({shop_id:TARGET_SHOP_ID,date:todayKst()}))}catch(_){}
  }
  function caughtToday(){
    try{
      const v=JSON.parse(localStorage.getItem(DAILY_KEY)||'null');
      return !!(v&&v.shop_id===TARGET_SHOP_ID&&v.date===todayKst());
    }catch(_){return false}
  }
  function hiddenByRoute(){
    return location.hash.includes('/shop/')||document.body.classList.contains('country-japan');
  }
  function currentZoom(){try{return naverMap.getZoom()}catch(_){return 0}}
  function syncVisibility(){
    const hide=hiddenByRoute();
    markers.forEach(m=>{try{m.setMap(hide||hiddenMarkers.has(m)||hiddenKeys.has(m.__funyMonKey)?null:naverMap)}catch(_){}});
  }
  function hideAll(){markers.forEach(m=>{try{m.setMap(null)}catch(_){}})}
  function clear(){hideAll();markers.length=0;markerKeys.clear()}
  function defById(id){return defs.find(x=>x.id===id)||defs[0]}

  function ensureModal(){
    if(document.getElementById('funyMonModal'))return;
    const el=document.createElement('div');
    el.id='funyMonModal';el.className='funy-mon-modal';el.hidden=true;
    el.innerHTML='<div class="funy-mon-backdrop" data-mon-close></div><section class="funy-mon-sheet" role="dialog" aria-modal="true" aria-labelledby="funyMonTitle"><div class="funy-mon-handle" aria-hidden="true"></div><button class="funy-mon-close" type="button" data-mon-close aria-label="닫기">×</button><div class="funy-mon-pixel-corners" aria-hidden="true"></div><div class="funy-mon-visual"><div class="funy-mon-fx" id="funyMonFx" aria-hidden="true"></div><div class="funy-mon-result-icon" id="funyMonIcon"></div></div><h3 id="funyMonTitle"></h3><div class="funy-mon-meta" id="funyMonMeta" hidden></div><p class="funy-mon-location" id="funyMonCopy"></p><p class="funy-mon-event-caption" id="funyMonEventCaption" hidden></p><div class="funy-mon-reward-kuji" id="funyMonReward" hidden><div class="funy-mon-reward-result" id="funyMonRewardResult"></div><div class="funy-mon-reward-cover" id="funyMonRewardCover"><span class="funy-mon-kuji-label">REWARD</span><strong>→ 오른쪽으로 밀어 결과 확인</strong></div></div><div class="funy-mon-actions"><button class="funy-mon-primary" id="funyMonSave" type="button" disabled>이미지 저장</button></div></section>';
    document.body.appendChild(el);
    el.querySelectorAll('[data-mon-close]').forEach(b=>b.addEventListener('click',()=>{const r=currentResultData?.reward||{},entryPending=(r.reward_type==='entry'&&r.entry_apply_enabled&&r.claim_code&&pendingEntries().some(x=>x.claim_code===r.claim_code));if(entryPending){resultNeedsSave=false;closeModal();return}if(resultNeedsSave&&!confirm('이미지를 저장하지 않았어요!\n지금 닫으면 포획 결과 화면이 닫혀요.'))return;resultNeedsSave=false;closeModal()}));
  }
  function closeModal(){
    const el=document.getElementById('funyMonModal');
    if(!el)return;
    el.hidden=true;document.body.style.overflow='';document.body.classList.remove('funy-mon-open');currentResultData=null;
  }
  function setResultState(state){
    const sheet=document.querySelector('#funyMonModal .funy-mon-sheet');
    if(!sheet)return;
    sheet.classList.remove('is-fail','is-success','is-prize');
    sheet.classList.add(state);
    const fx=document.getElementById('funyMonFx');
    if(fx)fx.innerHTML=state==='is-fail'?'<i>💔</i><i>·</i><i>·</i>':state==='is-prize'?'<i>✦</i><i>✦</i><i>★</i><i>✦</i><i>✦</i>':'<i>♡</i><i>✦</i><i>♡</i>';
  }
  function ensureCatchLoading(){
    if(document.getElementById('funyMonCatchLoading'))return;
    const el=document.createElement('div');el.id='funyMonCatchLoading';el.className='funy-mon-catch-loading';el.hidden=true;
    el.innerHTML='<div class="funy-mon-catch-loading-card"><span class="funy-mon-catch-spinner" aria-hidden="true"></span><strong>퍼니몬 포획 중...</strong><small>잠시만 기다려주세요</small></div>';
    document.body.appendChild(el);
  }
  function showCatchLoading(){ensureCatchLoading();const el=document.getElementById('funyMonCatchLoading');if(el)el.hidden=false}
  function hideCatchLoading(){const el=document.getElementById('funyMonCatchLoading');if(el)el.hidden=true}

  function ensureCatchOutcome(){
    if(document.getElementById('funyMonOutcome'))return;
    const el=document.createElement('div');
    el.id='funyMonOutcome';el.className='funy-mon-outcome';el.hidden=true;
    el.innerHTML='<div class="funy-mon-outcome-box"><span class="funy-mon-outcome-kicker">FUNY MON</span><strong id="funyMonOutcomeTitle"></strong><p id="funyMonOutcomeCopy"></p><button id="funyMonOutcomeConfirm" type="button">확인</button></div>';
    document.body.appendChild(el);
  }
  function showCatchOutcome(success,copy,onDone){
    ensureCatchOutcome();
    const el=document.getElementById('funyMonOutcome'),btn=document.getElementById('funyMonOutcomeConfirm');
    el.className='funy-mon-outcome '+(success?'is-catch-success':'is-catch-fail');
    document.getElementById('funyMonOutcomeTitle').textContent=success?'포획 성공!':'포획 실패!';
    document.getElementById('funyMonOutcomeCopy').textContent=copy||'';
    btn.onclick=()=>{el.hidden=true;el.className='funy-mon-outcome';btn.onclick=null;if(success&&onDone)onDone()};
    el.hidden=false;
  }
  function showMessage(title,copy){
    showCatchOutcome(false,title+' · '+copy);
  }
  function ensureRewardImageViewer(){
    if(document.getElementById('funyMonRewardImageViewer'))return;
    const el=document.createElement('div');
    el.id='funyMonRewardImageViewer';el.className='funy-mon-reward-viewer';el.hidden=true;
    el.innerHTML='<div class="funy-mon-reward-viewer-bg" data-reward-viewer-close></div><div class="funy-mon-reward-viewer-card"><button type="button" data-reward-viewer-close aria-label="닫기">×</button><img id="funyMonRewardImage" alt="당첨 상품 이미지"></div>';
    document.body.appendChild(el);
    el.querySelectorAll('[data-reward-viewer-close]').forEach(b=>b.addEventListener('click',()=>{el.hidden=true}));
  }
  function openRewardImage(url){
    if(!url)return;
    ensureRewardImageViewer();
    const viewer=document.getElementById('funyMonRewardImageViewer'),img=document.getElementById('funyMonRewardImage');
    img.src=url;viewer.hidden=false;
  }
  async function submitEventEntry(data){
    const r=data?.reward||{},campaign=String(r.entry_campaign_id||'').trim(),claim=String(r.claim_code||'').trim(),input=document.getElementById('funyMonEntryInstagram'),btn=document.getElementById('funyMonEntrySubmit'),msg=document.getElementById('funyMonEntryMessage');
    if(!campaign||!claim||!input||!btn)return;
    const id=input.value.trim().replace(/^@/,'').toLowerCase();
    if(!/^[a-z0-9._]{1,30}$/.test(id)){if(msg)msg.textContent='Instagram 아이디를 정확히 입력해주세요.';return}
    btn.disabled=true;if(msg){msg.classList.remove('done');msg.textContent='응모 확인 중...'}
    try{
      const headers={apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY,'Content-Type':'application/json','Accept':'application/json'};
      try{if(window.__FUNY_ACCESS_TOKEN)headers.Authorization='Bearer '+window.__FUNY_ACCESS_TOKEN}catch(_){}
      const saved=await fetch(SUPABASE_URL+'/rest/v1/rpc/submit_funymon_event_entry',{
        method:'POST',
        headers,
        cache:'no-store',
        body:JSON.stringify({p_campaign_id:campaign,p_instagram_id:id,p_client_id:anonId(),p_claim_code:claim})
      });
      const result=await saved.json().catch(()=>null);
      if(!saved.ok)throw new Error('응모 저장 실패');
      if(!result?.ok){
        const code=result?.error||'';
        if(code==='daily_entry_limit'){removePendingEntry(claim);if(msg)msg.textContent='오늘은 이미 '+Number(result.limit||1)+'회 응모했어요. 내일 다시 참여해주세요.';return}
        if(code==='campaign_entry_limit'){removePendingEntry(claim);if(msg)msg.textContent='이 이벤트는 최대 '+Number(result.limit||1)+'회까지 응모할 수 있어요.';return}
        if(code==='already_submitted'){removePendingEntry(claim);if(msg)msg.textContent='이미 사용한 응모권입니다.';return}
        if(code==='campaign_not_started'){if(msg)msg.textContent='아직 이벤트 응모 기간이 시작되지 않았어요.';return}
        if(code==='campaign_ended'||code==='campaign_unavailable'){removePendingEntry(claim);if(msg)msg.textContent='이벤트 응모 기간이 종료되었거나 현재 참여할 수 없어요.';return}
        if(code==='invalid_claim_code'||code==='missing_claim_code'){removePendingEntry(claim);if(msg)msg.textContent='응모권 정보를 확인하지 못했어요. 퍼니몬을 다시 포획해주세요.';return}
        if(msg)msg.textContent='응모 처리 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.';return
      }
      input.disabled=true;btn.textContent='응모 완료';
      const total=Number(result.entry_count_total||1),today=Number(result.entry_count_today||1),mode=String(result.limit_mode||'');
      let done='이벤트 응모가 완료됐어요! · 누적 '+total+'회';
      if(mode==='daily'&&result.limit)done='응모 완료! · 오늘 '+today+'/'+Number(result.limit)+'회 · 누적 '+total+'회';
      else if(mode==='total'&&result.limit)done='응모 완료! · 누적 '+total+'/'+Number(result.limit)+'회';
      if(msg){msg.classList.add('done');msg.textContent=done}
      resultNeedsSave=false;removePendingEntry(claim)
    }catch(e){
      if(msg)msg.textContent='응모 처리 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.'
    }finally{
      if(!input.disabled)btn.disabled=false
    }
  }
  function rewardMarkup(data){
    const r=data.reward||{title:'꽝',description:'아쉬워요! 다음 기회에 다시 도전해보세요!',reward_type:'lose',is_win:false,claim_code:null,image_url:null,action_url:null};
    const type=r.reward_type||(r.is_win===true?'win':'lose'),win=type==='win',entry=type==='entry',lose=type==='lose';
    const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const action=r.action_url?'<button class="funy-mon-reward-detail" type="button" data-reward-url="'+esc(r.action_url)+'">'+esc(r.url_action_label||r.action_label||'자세히보기')+'</button>':'';
    const rule=entry&&r.entry_apply_enabled?('<div class="funy-mon-entry-rule">'+esc(r.entry_campaign_title||'이벤트 응모')+' · '+esc(r.entry_limit_mode==='unlimited'?'응모 제한 없음':r.entry_limit_mode==='daily'?'1일 '+Number(r.entry_limit_count||1)+'회':'이벤트 기간 중 '+Number(r.entry_limit_count||1)+'회')+'</div>'):'';
    return '<div class="funy-mon-reward-retro '+(lose?'lose':'win')+'">'+esc(r.result_label||(entry?'응모권':win?'당첨!':'꽝'))+'</div>'+(!lose?'<strong class="funy-mon-reward-title">'+esc(r.title||(entry?'이벤트 응모하기':'당첨 상품'))+'</strong>':'')+rule+(!lose&&r.description?'<div class="funy-mon-post-guide">'+esc(r.description)+'</div>':'')+(!lose&&r.image_url?'<button class="funy-mon-reward-detail" type="button" data-reward-image="'+esc(r.image_url)+'">'+esc(r.image_action_label||r.action_label||'이미지 보기')+'</button>':'')+(!lose?action:'')+(lose?'<p class="funy-mon-lose-copy">'+esc(r.description||'아쉬워요! 다음 기회에 다시 도전해보세요!')+'</p>':'')+(entry&&r.entry_apply_enabled&&r.entry_campaign_id?'<div class="funy-mon-entry-apply"><input id="funyMonEntryInstagram" type="text" maxlength="30" autocomplete="off" placeholder="@제외 Instagram 아이디 입력"><button id="funyMonEntrySubmit" type="button">응모</button><div id="funyMonEntryMessage" class="funy-mon-entry-message"></div></div>':'')+(!entry&&!lose&&r.claim_code?'<div class="funy-mon-claim-code"><span>당첨 코드</span><b>'+esc(r.claim_code)+'</b></div>':'');
  }
  function revealReward(data,def){
    const reward=document.getElementById('funyMonReward'),cover=document.getElementById('funyMonRewardCover'),save=document.getElementById('funyMonSave');
    if(!reward||reward.classList.contains('is-revealed'))return;
    reward.classList.remove('is-swiping');reward.classList.add('is-revealed','is-flashing');
    cover.style.transition='transform .34s steps(5,end),opacity .2s ease';cover.style.transform='translateX(112%) rotate(2deg)';cover.style.opacity='0';cover.style.pointerEvents='none';
    if((data.reward?.reward_type||(data.reward?.is_win===true?'win':'lose'))!=='lose')document.querySelector('#funyMonModal .funy-mon-sheet')?.classList.add('is-prize');
    reward.querySelector('[data-reward-image]')?.addEventListener('click',e=>openRewardImage(e.currentTarget.dataset.rewardImage));
    reward.querySelector('[data-reward-url]')?.addEventListener('click',e=>{const url=e.currentTarget.dataset.rewardUrl;if(url)window.open(url,'_blank','noopener,noreferrer')});
    reward.querySelector('#funyMonEntrySubmit')?.addEventListener('click',()=>submitEventEntry(data));
    reward.querySelector('#funyMonEntryInstagram')?.addEventListener('keydown',e=>{if(e.key==='Enter')submitEventEntry(data)});
    save.disabled=false;save.onclick=async()=>{await savePrizeImage(data,def);resultNeedsSave=false};setTimeout(()=>reward.classList.remove('is-flashing'),900);
  }
  function bindRewardSwipe(data,def){
    const reward=document.getElementById('funyMonReward'),cover=document.getElementById('funyMonRewardCover');if(!reward||!cover)return;
    let active=false,startX=0,dx=0,revealed=false;
    const reset=()=>{active=false;dx=0;reward.classList.remove('is-swiping');cover.style.transition='transform .18s steps(3,end)';cover.style.transform='translateX(0) rotate(0)';setTimeout(()=>cover.style.transition='',200)};
    cover.onpointerdown=e=>{if(revealed)return;active=true;startX=e.clientX;dx=0;reward.classList.add('is-swiping');cover.setPointerCapture?.(e.pointerId);cover.style.transition='none'};
    cover.onpointermove=e=>{if(!active||revealed)return;dx=Math.max(0,e.clientX-startX);const max=reward.clientWidth||300,ratio=dx/max;const jitter=Math.min(10,dx*.045),rot=((Math.floor(dx/12)%2)?1:-1)*Math.min(2.2,dx/90);cover.style.transform='translateX('+jitter+'px) rotate('+rot+'deg)';if(ratio>=.60){revealed=true;active=false;revealReward(data,def)}};
    cover.onpointerup=cover.onpointercancel=()=>{if(!revealed&&active)reset()};
  }
  function funyMonFxMarkup(def){
    const shapes={ponanyang:['✦','♡','✧','♡','✦'],bubblelong:['○','✦','◌','✦','○'],hatring:['♡','♥','✦','♥','♡'],bulgi:['✦','◆','✧','◆','✦'],namumong:['❖','✦','❧','✦','❖'],ggomagureum:['✧','☁','✦','☁','✧'],bawidong:['◆','✦','◇','✦','◆'],grimjamong:['✦','☾','✧','☾','✦'],beonjjeogi:['✦','ϟ','✧','ϟ','✦'],neon:['✦','✧','★','✧','✦']};
    return (shapes[def.id]||shapes.ponanyang).map(x=>'<i>'+x+'</i>').join('');
  }
  function openResult(data,def){
    resultNeedsSave=true;currentResultData=data;ensureModal();
    const icon=document.getElementById('funyMonIcon'),title=document.getElementById('funyMonTitle'),meta=document.getElementById('funyMonMeta'),copy=document.getElementById('funyMonCopy'),eventCaption=document.getElementById('funyMonEventCaption'),reward=document.getElementById('funyMonReward'),rewardResult=document.getElementById('funyMonRewardResult'),cover=document.getElementById('funyMonRewardCover'),save=document.getElementById('funyMonSave'),sheet=document.querySelector('#funyMonModal .funy-mon-sheet');
    [...sheet.classList].filter(x=>x.startsWith('mon-')).forEach(x=>sheet.classList.remove(x));sheet.classList.remove('is-fail','is-prize');sheet.classList.add('is-success','mon-'+def.id);document.getElementById('funyMonFx').innerHTML=funyMonFxMarkup(def);
    icon.innerHTML='<img class="funy-mon-result-sprite" src="'+def.asset+'" alt="" draggable="false">'+(data._isNew?'<span class="funy-mon-new-badge">NEW!</span>':'');title.textContent=def.name;meta.innerHTML='<span>No.'+def.no+'</span><span class="type-'+def.id+'">'+def.type+'</span><span>'+def.tier+'</span>';meta.hidden=false;copy.textContent='📍 '+data.shop_name+'에서 포획했어요';if(eventCaption){eventCaption.textContent=data.event_title||'';eventCaption.hidden=!data.event_title}
    const hasReward=!!data.reward;
    if(hasReward){
      rewardResult.innerHTML=rewardMarkup(data);reward.hidden=false;reward.classList.remove('is-revealed','is-flashing','is-swiping');cover.style.transform='translateX(0)';cover.style.opacity='1';cover.style.pointerEvents='auto';cover.style.transition='';save.disabled=true;save.onclick=null;
    }else{
      reward.hidden=true;reward.classList.remove('is-revealed','is-flashing','is-swiping');rewardResult.innerHTML='';save.disabled=false;save.onclick=async()=>{await savePrizeImage(data,def);resultNeedsSave=false};
    }
    document.getElementById('funyMonModal').hidden=false;document.body.classList.add('funy-mon-open');document.body.style.overflow='hidden';
    if(hasReward){const rewardType=data.reward?.reward_type||(data.reward?.is_win===true?'win':'lose');if(rewardType==='entry'){savePendingEntry(data,def);revealReward(data,def)}else bindRewardSwipe(data,def)}
  }
  function getPosition(){return new Promise((resolve,reject)=>{if(!navigator.geolocation)return reject(new Error('unsupported'));navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:10000,maximumAge:10000})})}
  async function catchMonster(meta){
    if(busy)return;busy=true;showCatchLoading();try{window.gtag?.('event','funymon_catch_start',{shop_id:meta.shop.id,monster_id:meta.def.id})}catch(_){}
    try{
      const effectDone=new Promise(resolve=>setTimeout(resolve,620));const positionPromise=getPosition();const pos=await positionPromise;
      const captureHeaders={'Content-Type':'application/json'};
      try{if(window.__FUNY_ACCESS_TOKEN)captureHeaders.Authorization='Bearer '+window.__FUNY_ACCESS_TOKEN}catch(_){}
      const fetchPromise=fetch(ENDPOINT,{method:'POST',headers:captureHeaders,body:JSON.stringify({anonymous_id:anonId(),shop_id:meta.shop.id,monster_id:meta.def.id,latitude:pos.coords.latitude,longitude:pos.coords.longitude})});
      await effectDone;const res=await fetchPromise;const data=await res.json().catch(()=>({error:'invalid_response'}));
      if(!res.ok){
        if(data.error==='too_far')showMessage('포획 가능 거리 밖이에요','현재 위치에서 '+meta.shop.name+'까지 약 '+data.distance_m+'m예요. 포획 가능 거리는 '+(data.required_m||100)+'m 이내예요.');
        else if(data.error==='daily_catch_limit')showMessage('오늘 포획 가능 횟수를 모두 사용했어요','이 이벤트에서는 하루 '+data.limit+'회까지 포획할 수 있어요.');
        else if(data.error==='already_caught_today')showMessage('오늘 포획을 완료했어요','내일 다시 도전해주세요.');
        else if(data.error==='event_unavailable')showMessage('이벤트에 참여할 수 없어요','이벤트가 종료되었거나 현재 운영 중이 아니에요.');
        else if(data.error==='monster_unavailable')showMessage('포획할 수 없는 퍼니몬이에요','이벤트 설정이 변경되었어요. 지도를 새로고침해주세요.');
        else if(data.error==='shop_unavailable')showMessage('카드샵 정보를 확인할 수 없어요','잠시 후 다시 시도해주세요.');
        else if(data.error==='invalid_payload'||data.error==='invalid_anonymous_id')showMessage('포획 정보를 확인하지 못했어요','페이지를 새로고침한 뒤 다시 시도해주세요.');
        else showMessage('포획 처리 중 오류가 발생했어요','잠시 후 다시 시도해주세요.');return;
      }
      data._isNew=data.result!=='failed'&&!wasCaughtBefore(meta.def.id);data.event_title=meta.event?.title||'';saveHistory({monster_id:meta.def.id,shop_id:meta.shop.id,shop_name:data.shop_name,caught_at:data.caught_at,result:data.result,reward:data.reward||null});hiddenMarkers.add(meta.marker);hiddenKeys.add(meta.key);try{meta.marker.setMap(null)}catch(_){}syncVisibility();
      try{window.gtag?.('event','funymon_catch_result',{shop_id:meta.shop.id,monster_id:meta.def.id,result:data.result,reward_type:data.reward?.reward_type||''})}catch(_){}if(data.result==='failed'){showCatchOutcome(false,'아쉽게 놓쳤어요! 다른 퍼니몬을 포획해보세요.');return}showCatchOutcome(true,'퍼니몬을 포획했어요!',()=>openResult(data,meta.def));
    }catch(err){const code=err&&typeof err==='object'&&'code' in err?err.code:null;if(code===1)showMessage('위치 권한이 필요해요','현재 위치를 확인해야 가까운 FUNY MON을 포획할 수 있어요.');else if(code===2)showMessage('현재 위치를 확인하지 못했어요','GPS 또는 위치 서비스를 켠 뒤 다시 시도해주세요.');else if(code===3)showMessage('위치 확인 시간이 초과됐어요','잠시 후 다시 시도해주세요.');else showMessage('현재 위치를 확인하지 못했어요','위치 서비스를 켠 뒤 다시 시도해주세요.')}finally{busy=false;hideCatchLoading()}
  }

  function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
  function wrapText(ctx,text,x,y,maxWidth,lineHeight,maxLines){const words=String(text||'').split(' ');let line='',lines=[];for(const w of words){const test=line?line+' '+w:w;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=w}else line=test}if(line)lines.push(line);lines.slice(0,maxLines).forEach((l,i)=>ctx.fillText(l,x,y+i*lineHeight))}
  function loadCanvasImage(src){return new Promise((resolve,reject)=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>resolve(im);im.onerror=reject;im.src=src})}
  function notifyImageSaved(){let n=document.getElementById('funyMonSaveNotice');if(!n){n=document.createElement('div');n.id='funyMonSaveNotice';n.className='funy-mon-save-notice';document.body.appendChild(n)}n.textContent='이미지 저장이 완료되었습니다.';n.classList.add('show');clearTimeout(n._timer);n._timer=setTimeout(()=>n.classList.remove('show'),2200)}
  async function savePrizeImage(data,def){
    const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;const ctx=canvas.getContext('2d'),r=data.reward||{title:'꽝',is_win:false},win=r.is_win===true;
    const fxMap={ponanyang:['✦','♡','✧','♡','✦'],bubblelong:['○','✦','◌','✦','○'],hatring:['♡','♥','✦','♥','♡'],bulgi:['✦','◆','✧','◆','✦'],namumong:['❖','✦','❧','✦','❖'],ggomagureum:['✧','☁','✦','☁','✧'],bawidong:['◆','✦','◇','✦','◆'],grimjamong:['✦','☾','✧','☾','✦'],beonjjeogi:['✦','ϟ','✧','ϟ','✦'],neon:['✦','✧','★','✧','✦']};
    const g=ctx.createLinearGradient(0,0,1080,1350);g.addColorStop(0,'#faf8ff');g.addColorStop(.48,'#ffffff');g.addColorStop(1,'#f4f0f8');ctx.fillStyle=g;ctx.fillRect(0,0,1080,1350);
    ctx.textAlign='center';ctx.fillStyle='#765bc1';ctx.font='900 24px ui-monospace,monospace';ctx.fillText('FUNY MON',540,88);
    const aura=ctx.createRadialGradient(540,365,30,540,365,270);aura.addColorStop(0,'rgba(142,116,202,.20)');aura.addColorStop(.55,'rgba(142,116,202,.07)');aura.addColorStop(1,'rgba(142,116,202,0)');ctx.fillStyle=aura;ctx.beginPath();ctx.arc(540,365,270,0,Math.PI*2);ctx.fill();
    const marks=fxMap[def.id]||fxMap.ponanyang,pts=[[300,390],[365,245],[540,215],[715,250],[780,395]];const fxColors={ponanyang:'#8b72d8',bubblelong:'#59b9df',hatring:'#ed79ad',bulgi:'#ee7b4d',namumong:'#67a85b',ggomagureum:'#9db9d4',bawidong:'#9b8c74',grimjamong:'#7764ae',beonjjeogi:'#e5b633',neon:'#8a71ff'};ctx.fillStyle=fxColors[def.id]||'#8b72d8';ctx.font='800 34px sans-serif';marks.forEach((m,i)=>ctx.fillText(m,pts[i][0],pts[i][1]));
    try{const mon=await loadCanvasImage(def.asset);const size=390,x=(1080-size)/2,y=185;ctx.drawImage(mon,x,y,size,size)}catch(_){}
    ctx.fillStyle='#2d2832';ctx.font='950 64px "DotGothic16",monospace';ctx.fillText(def.name,540,650);
    const chip=(x,w,label,bg,fg)=>{ctx.fillStyle=bg;roundRect(ctx,x,684,w,54,8);ctx.fillStyle=fg;ctx.font='850 23px ui-monospace,monospace';ctx.fillText(label,x+w/2,719)};
    const typeColors={ponanyang:['#eeeef1','#5e5c66'],bubblelong:['#e7f6ff','#2587ba'],hatring:['#fff0f7','#ce5f91'],bulgi:['#fff0e9','#d65d34'],namumong:['#edf8e9','#448d48'],ggomagureum:['#eef5fb','#6e8ba5'],bawidong:['#f3efe9','#806f58'],grimjamong:['#eeeafd','#67539d'],beonjjeogi:['#fff8df','#b18417'],neon:['#f0edff','#7057db']},tc=typeColors[def.id]||typeColors.ponanyang;chip(397,132,'No.'+def.no,'#302855','#ffffff');chip(541,142,def.type,tc[0],tc[1]);ctx.fillStyle='#746d78';ctx.font='700 27px sans-serif';ctx.fillText('📍 '+data.shop_name+'에서 포획했어요',540,790);ctx.fillStyle='#9a92a0';ctx.font='700 22px ui-monospace,monospace';ctx.fillText('funypin.kr',540,1275);
    const isAndroid=/Android/i.test(navigator.userAgent);const mime=isAndroid?'image/jpeg':'image/png';const ext=isAndroid?'jpg':'png';const fileName='FUNY-MON-'+def.id+'-'+Date.now()+'.'+ext;const blob=await new Promise(resolve=>canvas.toBlob(resolve,mime,isAndroid?.94:undefined));
    if(blob){const file=new File([blob],fileName,{type:mime});if(!isAndroid&&navigator.canShare&&navigator.share&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:'FUNY MON 이미지'});notifyImageSaved();return}catch(e){if(e&&e.name==='AbortError')return}}const url=URL.createObjectURL(blob),a=document.createElement('a');a.download=fileName;a.href=url;a.rel='noopener';a.style.display='none';document.body.appendChild(a);a.click();setTimeout(()=>{a.remove();URL.revokeObjectURL(url)},10000);notifyImageSaved()}
  }

  function pageAnonKey(){return SUPABASE_KEY}
  async function spawn(){
    if(started)return;const key=pageAnonKey();if(!key){if(tries++<80)setTimeout(spawn,250);return}if(!(window.naver&&naver.maps&&typeof naverMap!=='undefined'&&naverMap)){if(tries++<80)setTimeout(spawn,250);return}
    let events=[];try{const now=new Date().toISOString();const r=await fetch(SUPABASE_URL+'/rest/v1/funy_mon_events?select=id,title,shop_id,target_type,selected_monsters,spawn_count,ends_at,daily_catch_limit,distance_limit_enabled,distance_limit_m,capture_success_bp&is_force_paused=eq.false&is_archived=eq.false&starts_at=lte.'+encodeURIComponent(now)+'&ends_at=gte.'+encodeURIComponent(now)+'&order=starts_at.desc',{headers:{apikey:key,Authorization:'Bearer '+key},cache:'no-store'});if(!r.ok)return;events=await r.json();syncActiveEventShops(events)}catch(_){return}
    if(!events.length){clear();syncActiveEventShops([]);return}const shops=typeof SHOPS!=='undefined'?SHOPS:[],mapEvents=events.filter(ev=>ev?.shop_id&&ev.target_type!=='schedule');if(!mapEvents.length){clear();started=true;return}const ready=mapEvents.every(ev=>shops.some(s=>s.id===ev.shop_id&&s._coord));if(!ready){if(tries++<240)setTimeout(spawn,500);return}started=true;clear();
    mapEvents.forEach((ev,eventIndex)=>{const shop=shops.find(s=>s.id===ev.shop_id&&s._coord);if(!shop)return;const ids=Array.isArray(ev.selected_monsters)&&ev.selected_monsters.length?ev.selected_monsters:defs.slice(0,5).map(x=>x.id);const selected=ids.map(defById).filter(Boolean),count=Math.max(1,Math.min(Number(ev.spawn_count)||5,selected.length,10));const visible=selected.length>count?[...selected].sort(()=>Math.random()-.5).slice(0,count):selected.slice(0,count);
      visible.forEach((d,i)=>{const ring=Math.floor(i/offsets.length),base=offsets[i%offsets.length],mul=1+ring*.7,off={lat:base.lat*mul,lng:base.lng*mul};const lat=Number(shop._coord.lat)+off.lat,lng=Number(shop._coord.lng)+off.lng;const markerHtml='<div class="funy-mon-marker '+d.cls+' move-'+(i%3)+'" role="button" aria-label="'+d.name+' 포획"><span class="funy-mon-sprite"><img src="'+d.asset+'" alt="" draggable="false"></span><span class="funy-mon-shadow"></span></div>';const marker=new naver.maps.Marker({position:new naver.maps.LatLng(lat,lng),map:hiddenByRoute()?null:naverMap,clickable:true,zIndex:120+eventIndex,icon:{content:markerHtml,anchor:new naver.maps.Point(24,34)}});const meta={marker,shop,def:d,event:ev,eventId:ev.id,key:ev.id+'|'+shop.id+'|'+d.id};if(markerKeys.has(meta.key)){try{marker.setMap(null)}catch(_){}return}markerKeys.add(meta.key);marker.__funyMonKey=meta.key;markers.push(marker);if(hiddenKeys.has(meta.key))try{marker.setMap(null)}catch(_){}
        naver.maps.Event.addListener(marker,'click',()=>{if(busy)return;document.querySelectorAll('.funy-mon-marker.is-selected').forEach(el=>el.classList.remove('is-selected'));const markerEl=marker.getElement?.()?.querySelector?.('.funy-mon-marker')||document.querySelector('[aria-label="'+d.name+' 포획"]');if(markerEl){markerEl.classList.add('is-selected');markerEl.querySelector('.funy-mon-surprise')?.remove();markerEl.insertAdjacentHTML('beforeend','<span class="funy-mon-surprise" aria-hidden="true"><i>!</i><i>!</i><i>!</i></span>')}catchMonster(meta)})
      })
    });
    try{naver.maps.Event.addListener(naverMap,'zoom_changed',syncVisibility)}catch(_){}syncVisibility();
  }
  window.addEventListener('hashchange',()=>{syncVisibility();setTimeout(syncEventDetailBanner,0)});window.addEventListener('funy:shops-source',()=>{if(!started){tries=0;spawn()}});window.addEventListener('pageshow',()=>{if(!started){tries=0;spawn()}else syncVisibility()});document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!started){tries=0;spawn()}});new MutationObserver(()=>{if(!started)spawn();else syncVisibility()}).observe(document.body,{attributes:true,attributeFilter:['class']});setTimeout(spawn,450);setTimeout(()=>{if(!started){tries=0;spawn()}},2500);setTimeout(()=>{if(!started){tries=0;spawn()}},6000);
  renderPendingEntryButton();setTimeout(syncEventDetailBanner,300);
  window.FUNY_MON_PROTO={respawn:()=>{clear();started=false;tries=0;try{localStorage.removeItem(DAILY_KEY)}catch(_){}spawn()},count:()=>markers.length,history:historyItems,pendingEntries:pendingEntries,targetShop:()=>TARGET_SHOP_ID};
})();