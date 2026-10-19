/* FUNY PIN integrated mission management */
(()=>{
  'use strict';

  const SCRIPT_VERSION='20261020-pinned-missions2';
  const MISSION_TYPES={
    daily_checkin:'출석 체크',
    profile_complete:'프로필 편집',
    community_post_create:'게시글 작성',
    community_comment_create:'댓글 작성',
    community_post_like:'게시글 좋아요',
    market_listing_create:'거래 매물 등록',
    shop_favorite_add:'관심 매장 추가',
    market_favorite_add:'관심 매물 추가',
    shop_visit_checkin:'카드샵 방문 인증',
    funymon_capture:'퍼니몬 포획',
    event_entry:'이벤트 참여',
    garapon_participation:'가라폰 참여'
  };
  const CTA_TYPES={
    checkin:'출석 처리',
    route:'내부 화면',
    web:'외부 링크',
    none:'버튼 없음'
  };
  const TYPE_DEFAULTS={
    daily_checkin:['출석 체크','오늘의 출석을 완료해주세요','출석 체크','checkin',''],
    profile_complete:['프로필 편집하기','닉네임 또는 프로필 이미지를 변경해보세요','프로필 편집','route','/my-profile.html'],
    community_post_create:['게시글 작성하기','FUNY TALK에 게시글을 작성해보세요','작성하기','route','/talk.html'],
    community_comment_create:['댓글 작성하기','FUNY TALK 게시글에 댓글을 남겨보세요','댓글 쓰기','route','/talk.html'],
    community_post_like:['게시글 좋아요','마음에 드는 FUNY TALK 게시글에 좋아요를 눌러보세요','둘러보기','route','/talk.html'],
    market_listing_create:['매물 등록하기','거래 매물을 등록해보세요','등록하기','route','/my-market.html'],
    shop_favorite_add:['관심 매장 추가하기','마음에 드는 카드샵을 저장해보세요','둘러보기','route','/shops.html'],
    market_favorite_add:['관심 매물 추가하기','관심 있는 거래 매물을 저장해보세요','둘러보기','route','/my-favorites.html'],
    shop_visit_checkin:['카드샵 방문 인증','가까운 카드샵에서 방문 인증을 완료해보세요','방문 인증','route','/ranking.html'],
    funymon_capture:['퍼니몬 포획하기','지도에서 퍼니몬을 포획해보세요','지도 보기','route','/shops.html'],
    event_entry:['이벤트 참여하기','FUNY PIN 이벤트에 참여해보세요','응모 내역','route','/my-entries.html'],
    garapon_participation:['가라폰 참여하기','퍼니코인으로 가라폰에 참여해보세요','가라폰 보기','route','/garapon.html']
  };

  let state={
    campaigns:[],
    items:[],
    selectedId:'',
    newMode:false,
    settings:{},
    progress:[],
    busy:false
  };

  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));
  const number=value=>Number(value||0).toLocaleString('ko-KR');
  const statusName=value=>({
    draft:'초안',
    scheduled:'예정',
    active:'진행 중',
    paused:'일시 정지',
    ended:'종료'
  }[value]||value||'-');
  const periodName=value=>({
    daily:'일간',
    weekly:'주간',
    monthly:'월간'
  }[value]||value||'-');
  const fmt=value=>{
    if(!value)return '-';
    const date=new Date(value);
    if(Number.isNaN(date.getTime()))return '-';
    return date.toLocaleString('ko-KR',{
      timeZone:'Asia/Seoul',
      year:'numeric',
      month:'2-digit',
      day:'2-digit',
      hour:'2-digit',
      minute:'2-digit',
      hour12:false
    });
  };
  const toInputDate=value=>{
    if(!value)return '';
    const date=new Date(value);
    if(Number.isNaN(date.getTime()))return '';
    const parts=new Intl.DateTimeFormat('en-CA',{
      timeZone:'Asia/Seoul',
      year:'numeric',
      month:'2-digit',
      day:'2-digit',
      hour:'2-digit',
      minute:'2-digit',
      hourCycle:'h23'
    }).formatToParts(date).reduce((acc,part)=>{
      if(part.type!=='literal')acc[part.type]=part.value;
      return acc;
    },{});
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
  };
  const toIso=value=>{
    if(!value)return '';
    const normalized=/[zZ]|[+-]\d\d:\d\d$/.test(value)?value:`${value}:00+09:00`;
    const date=new Date(normalized);
    return Number.isNaN(date.getTime())?'':date.toISOString();
  };
  const qs=(selector,root=document)=>root.querySelector(selector);
  const qsa=(selector,root=document)=>[...root.querySelectorAll(selector)];
  const apiCall=(path,options={})=>{
    if(typeof window.api!=='function')throw new Error('통합 어드민 API가 준비되지 않았습니다.');
    return window.api(path,options);
  };
  const rpc=(name,body={})=>apiCall(`/rest/v1/rpc/${encodeURIComponent(name)}`,{
    method:'POST',
    body:JSON.stringify(body||{})
  });

  function ensureStyle(){
    if(document.querySelector('link[data-admin-missions-integrated]'))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=`/admin-missions-integrated.css?v=${SCRIPT_VERSION}`;
    link.dataset.adminMissionsIntegrated='1';
    document.head.appendChild(link);
  }

  function toast(message,type=''){
    let el=document.getElementById('missionIntegratedToast');
    if(!el){
      el=document.createElement('div');
      el.id='missionIntegratedToast';
      el.className='mission-integrated-toast';
      document.body.appendChild(el);
    }
    el.textContent=message;
    el.className=`mission-integrated-toast show ${type}`.trim();
    clearTimeout(toast.timer);
    toast.timer=setTimeout(()=>{el.className='mission-integrated-toast'},2200);
  }

  function setIntegratedTabUi(){
    try{adminTab='missions'}catch(_){}
    qsa('[data-admin-tab]').forEach(button=>{
      button.classList.toggle('on',button.dataset.adminTab==='missions');
    });
    const desktop=document.getElementById('adminMissionMenuLink');
    const mobile=document.getElementById('adminMissionMobileLink');
    if(desktop)desktop.classList.add('on');
    if(mobile)mobile.classList.add('on');
    const title=document.getElementById('toolbarTitle');
    const sub=document.getElementById('toolbarSub');
    if(title)title.textContent='미션 관리';
    if(sub)sub.textContent='MY 미션 · 퍼니코인 보상 · 사용자 진행 현황';
    try{history.replaceState(history.state,'',`${location.pathname}${location.search}#missions`)}catch(_){}
  }

  function blankItem(index=0){
    return{
      mission_type:'daily_checkin',
      title:'출석 체크',
      description:'오늘의 출석을 완료해주세요',
      target_count:1,
      reward_coin:5,
      cta_type:'checkin',
      cta_label:'출석 체크',
      cta_target:'',
      sort_order:(index+1)*10,
      is_active:true,
      is_pinned:false
    };
  }

  function rootTemplate(){
    return `
      <div class="mission-admin-integrated" id="missionAdminIntegrated">
        <div class="mission-integrated-hero">
          <div>
            <span class="mission-eyebrow">REWARD</span>
            <h2>미션 관리</h2>
            <p>일간·주간·월간 미션과 퍼니코인 보상을 통합 어드민에서 관리합니다.</p>
          </div>
          <div class="mission-hero-actions">
            <span class="mission-release-lock">RELEASE LOCKED</span>
            <button id="missionRefresh" class="mission-button secondary" type="button">새로고침</button>
          </div>
        </div>

        <div class="mission-summary-grid">
          <article><span>전체 세트</span><strong id="missionStatCampaigns">0</strong></article>
          <article><span>진행 중</span><strong id="missionStatActive">0</strong></article>
          <article><span>미션 항목</span><strong id="missionStatItems">0</strong></article>
          <article><span>완료 건</span><strong id="missionStatCompleted">0</strong></article>
          <article><span>지급 코인</span><strong id="missionStatCoins">0</strong></article>
        </div>

        <div id="missionFeatureNotice" class="mission-feature-notice">설정 정보를 불러오는 중입니다.</div>

        <div class="mission-admin-layout">
          <aside class="mission-campaign-sidebar">
            <div class="mission-panel-head">
              <div><b>미션 세트</b><span>노출 순서대로 표시</span></div>
              <button id="missionNewCampaign" class="mission-button compact" type="button">+ 새 세트</button>
            </div>
            <div id="missionCampaignList" class="mission-campaign-list">
              <div class="mission-empty">미션 세트를 불러오는 중입니다.</div>
            </div>
            <div class="mission-private-note">
              <b>비공개 개발 상태</b>
              <span>출시 잠금 중에는 전체 회원 공개를 선택해도 테스트 계정 전용으로 저장됩니다.</span>
            </div>
          </aside>

          <section class="mission-admin-main">
            <div class="mission-two-column">
              <article class="mission-card">
                <div class="mission-card-head"><div><h3>기능 상태</h3><p>MY 노출과 보상 지급을 제어합니다.</p></div></div>
                <div class="mission-form-grid">
                  <label class="mission-field">
                    <span>미션 화면 공개</span>
                    <select id="missionPublicEnabled">
                      <option value="false">OFF · 테스트 계정만</option>
                      <option value="true">ON · 전체 회원</option>
                    </select>
                    <small>출시 잠금 해제 전에는 전체 공개가 저장되지 않습니다.</small>
                  </label>
                  <label class="mission-field">
                    <span>퍼니코인 보상 지급</span>
                    <select id="missionRewardEnabled">
                      <option value="true">ON</option>
                      <option value="false">OFF</option>
                    </select>
                  </label>
                </div>
                <div class="mission-actions"><button id="missionSaveFeature" class="mission-button primary" type="button">기능 상태 저장</button></div>
              </article>

              <article class="mission-card">
                <div class="mission-card-head">
                  <div><h3>선택 세트 상태</h3><p id="missionSelectedId">신규 세트</p></div>
                  <span id="missionCampaignStatus" class="mission-status">신규</span>
                </div>
                <div class="mission-status-actions">
                  <button id="missionActivate" class="mission-button purple" type="button" disabled>시작</button>
                  <button id="missionPause" class="mission-button secondary" type="button" disabled>일시 정지</button>
                  <button id="missionEnd" class="mission-button danger" type="button" disabled>종료</button>
                  <button id="missionDelete" class="mission-button danger" type="button" hidden>삭제</button>
                </div>
                <p class="mission-help">진행 내역이 생성된 세트는 기간·주기·미션 항목을 직접 변경할 수 없습니다.</p>
              </article>
            </div>

            <article class="mission-card">
              <div class="mission-card-head"><div><h3>미션 세트 기본 설정</h3><p>MY에 노출될 카드 한 페이지를 설정합니다.</p></div></div>
              <div class="mission-form-grid">
                <label class="mission-field wide"><span>세트 제목</span><input id="missionCampaignTitle" maxlength="120" placeholder="오늘의 미션"></label>
                <label class="mission-field wide"><span>안내 문구</span><textarea id="missionCampaignDescription" placeholder="미션을 완료하고 퍼니코인을 모아보세요"></textarea></label>
                <label class="mission-field"><span>주기</span><select id="missionPeriodType"><option value="daily">일간</option><option value="weekly">주간</option><option value="monthly">월간</option></select></label>
                <label class="mission-field">
                  <span>미션 노출 방식</span>
                  <select id="missionDisplayMode">
                    <option value="all">등록 미션 전체 노출</option>
                    <option value="random_daily">매일 랜덤 N개 노출</option>
                  </select>
                  <small>랜덤 노출은 일간 세트에서만 사용할 수 있습니다.</small>
                </label>
                <label id="missionRandomCountField" class="mission-field" hidden>
                  <span>하루 노출 개수</span>
                  <input id="missionRandomCount" type="number" min="1" max="100" value="3">
                  <small>고정 노출 미션은 항상 표시하고, 나머지 활성 미션 풀에서 KST 날짜별로 N개를 추가 편성합니다.</small>
                </label>
                <label class="mission-field"><span>노출 우선순위</span><input id="missionPriority" type="number" value="100"></label>
                <label class="mission-field"><span>시작 일시</span><input id="missionStartsAt" type="datetime-local"></label>
                <label class="mission-field"><span>종료 일시</span><input id="missionEndsAt" type="datetime-local"></label>
                <label class="mission-field"><span>공개 범위</span><select id="missionVisibility"><option value="test">테스트 계정</option><option value="public">전체 회원</option></select></label>
                <label class="mission-field"><span>MY 노출</span><select id="missionIsVisible"><option value="true">노출</option><option value="false">숨김</option></select></label>
              </div>
              <div class="mission-actions"><button id="missionSaveCampaign" class="mission-button primary" type="button">기본 설정 저장</button></div>
            </article>

            <article class="mission-card">
              <div class="mission-card-head">
                <div><h3>개별 미션 설정</h3><p>완료 판정, 목표 수량, 보상, 이동 버튼을 설정합니다.</p></div>
                <span id="missionItemCount" class="mission-count-chip">0개</span>
              </div>
              <div id="missionItemList" class="mission-item-list"></div>
              <div class="mission-actions split">
                <button id="missionAddItem" class="mission-button secondary" type="button">+ 미션 추가</button>
                <button id="missionSaveItems" class="mission-button primary" type="button" disabled>미션 항목 저장</button>
              </div>
            </article>

            <article class="mission-card">
              <div class="mission-card-head"><div><h3>최근 사용자 진행 내역</h3><p>최근 갱신된 최대 200건</p></div></div>
              <div class="mission-table-wrap">
                <table class="mission-table">
                  <thead><tr><th>회원</th><th>세트</th><th>미션</th><th>기간</th><th>진행</th><th>상태</th><th>완료·지급</th></tr></thead>
                  <tbody id="missionProgressRows"><tr><td colspan="7"><div class="mission-empty">진행 내역이 없습니다.</div></td></tr></tbody>
                </table>
              </div>
            </article>
          </section>
        </div>
      </div>`;
  }

  function getEl(id){return document.getElementById(id)}

  function renderSummary(){
    const campaigns=state.campaigns;
    getEl('missionStatCampaigns').textContent=number(campaigns.length);
    getEl('missionStatActive').textContent=number(campaigns.filter(item=>item.status==='active').length);
    getEl('missionStatItems').textContent=number(campaigns.reduce((sum,item)=>sum+Number(item.active_item_count||0),0));
    getEl('missionStatCompleted').textContent=number(campaigns.reduce((sum,item)=>sum+Number(item.completion_count||0),0));
    getEl('missionStatCoins').textContent=number(campaigns.reduce((sum,item)=>sum+Number(item.rewarded_coin||0),0));
  }

  function renderSettings(){
    const settings=state.settings||{};
    const publicEnabled=getEl('missionPublicEnabled');
    const rewardEnabled=getEl('missionRewardEnabled');
    publicEnabled.value=String(!!settings.public_enabled);
    rewardEnabled.value=String(settings.reward_enabled!==false);
    publicEnabled.disabled=settings.release_locked!==false;
    getEl('missionFeatureNotice').innerHTML=`
      <b>현재 운영 상태</b>
      <span>미션 공개 <strong>${settings.public_enabled?'ON':'OFF'}</strong></span>
      <span>보상 지급 <strong>${settings.reward_enabled!==false?'ON':'OFF'}</strong></span>
      <span>출시 잠금 <strong>${settings.release_locked!==false?'ON':'OFF'}</strong></span>`;
  }

  function renderCampaignList(){
    const list=getEl('missionCampaignList');
    if(!state.campaigns.length){
      list.innerHTML='<div class="mission-empty">등록된 미션 세트가 없습니다.</div>';
      return;
    }
    list.innerHTML=state.campaigns.map(campaign=>`
      <button type="button" class="mission-campaign-row ${campaign.id===state.selectedId&&!state.newMode?'on':''}" data-mission-campaign="${campaign.id}">
        <span class="mission-campaign-copy">
          <b>${esc(campaign.title)}</b>
          <small>${periodName(campaign.period_type)} · 미션 ${number(campaign.active_item_count)}개${campaign.display_mode==='random_daily'?' · 매일 랜덤 '+number(campaign.random_count||1)+'개':''} · ${esc(statusName(campaign.status))}</small>
        </span>
        <span class="mission-campaign-state ${campaign.status}">${esc(statusName(campaign.status))}</span>
      </button>`).join('');
    qsa('[data-mission-campaign]',list).forEach(button=>{
      button.onclick=()=>selectCampaign(button.dataset.missionCampaign);
    });
  }

  function renderCampaignForm(campaign){
    const isExisting=!!campaign;
    const status=campaign?.status||'new';
    getEl('missionCampaignTitle').value=campaign?.title||'';
    getEl('missionCampaignDescription').value=campaign?.description||'미션을 완료하고 퍼니코인을 모아보세요';
    getEl('missionPeriodType').value=campaign?.period_type||'daily';
    getEl('missionDisplayMode').value=campaign?.display_mode||'all';
    getEl('missionRandomCount').value=String(campaign?.random_count||3);
    getEl('missionPriority').value=String(campaign?.priority??100);
    getEl('missionStartsAt').value=campaign?toInputDate(campaign.starts_at):toInputDate(new Date());
    getEl('missionEndsAt').value=campaign?toInputDate(campaign.ends_at):toInputDate(new Date(Date.now()+30*86400000));
    getEl('missionVisibility').value=campaign?.visibility||'test';
    getEl('missionIsVisible').value=String(campaign?.is_visible!==false);
    getEl('missionSelectedId').textContent=campaign?.id||'신규 세트';
    const statusEl=getEl('missionCampaignStatus');
    statusEl.textContent=isExisting?statusName(status):'신규';
    statusEl.className=`mission-status ${status}`;
    getEl('missionActivate').disabled=!isExisting||status==='active'||status==='ended';
    getEl('missionPause').disabled=!isExisting||status!=='active';
    getEl('missionEnd').disabled=!isExisting||status==='ended';
    const deleteButton=getEl('missionDelete');
    if(deleteButton){
      deleteButton.hidden=!isExisting||status!=='ended';
      deleteButton.disabled=!isExisting||status!=='ended';
    }
    getEl('missionSaveItems').disabled=!isExisting;
    syncRandomUi();
  }

  function syncRandomUi(){
    const mode=getEl('missionDisplayMode');
    const period=getEl('missionPeriodType');
    const field=getEl('missionRandomCountField');
    const count=getEl('missionRandomCount');
    if(!mode||!period||!field||!count)return;
    const random=mode.value==='random_daily';
    field.hidden=!random;
    if(random){
      period.value='daily';
      period.disabled=true;
      count.disabled=false;
    }else{
      period.disabled=false;
      count.disabled=true;
    }
  }

  function itemTemplate(item,index){
    const typeOptions=Object.entries(MISSION_TYPES).map(([value,label])=>
      `<option value="${value}" ${item.mission_type===value?'selected':''}>${esc(label)}</option>`
    ).join('');
    const ctaOptions=Object.entries(CTA_TYPES).map(([value,label])=>
      `<option value="${value}" ${item.cta_type===value?'selected':''}>${esc(label)}</option>`
    ).join('');
    return `
      <div class="mission-item-editor" data-mission-item-index="${index}">
        <div class="mission-item-editor-head">
          <b>미션 ${index+1}</b>
          ${currentCampaign()?.display_mode==='random_daily'&&item.is_pinned?'<span class="mission-selected-today">고정 노출</span>':''}
          ${currentCampaign()?.display_mode==='random_daily'&&item.selected_today?'<span class="mission-selected-today">오늘 노출</span>':''}
          ${currentCampaign()?.display_mode==='random_daily'?'<label class="mission-switch"><input data-key="is_pinned" type="checkbox" '+(item.is_pinned?'checked':'')+'><span>고정</span></label>':''}
          <label class="mission-switch"><input data-key="is_active" type="checkbox" ${item.is_active!==false?'checked':''}><span>사용</span></label>
          <button type="button" class="mission-remove-item" data-remove-item="${index}" aria-label="미션 삭제">×</button>
        </div>
        <div class="mission-item-grid">
          <label class="mission-field"><span>판정 유형</span><select data-key="mission_type">${typeOptions}</select></label>
          <label class="mission-field"><span>미션 타이틀</span><input data-key="title" value="${esc(item.title||'')}"></label>
          <label class="mission-field wide"><span>설명</span><input data-key="description" value="${esc(item.description||'')}"></label>
          <label class="mission-field"><span>목표 수량</span><input data-key="target_count" type="number" min="1" value="${Number(item.target_count||1)}"></label>
          <label class="mission-field"><span>보상 코인</span><input data-key="reward_coin" type="number" min="0" value="${Number(item.reward_coin||0)}"></label>
          <label class="mission-field"><span>CTA 방식</span><select data-key="cta_type">${ctaOptions}</select></label>
          <label class="mission-field"><span>CTA 문구</span><input data-key="cta_label" value="${esc(item.cta_label||'')}" placeholder="하러 가기"></label>
          <label class="mission-field wide"><span>이동 주소</span><input data-key="cta_target" value="${esc(item.cta_target||'')}" placeholder="/talk.html 또는 https://..."></label>
        </div>
      </div>`;
  }

  function renderItems(){
    if(!state.items.length)state.items=[blankItem(0)];
    state.items.forEach((item,index)=>{item.sort_order=(index+1)*10});
    const list=getEl('missionItemList');
    list.innerHTML=state.items.map(itemTemplate).join('');
    getEl('missionItemCount').textContent=`${state.items.length}개`;

    qsa('[data-mission-item-index]',list).forEach(row=>{
      const index=Number(row.dataset.missionItemIndex);
      qsa('[data-key]',row).forEach(input=>{
        input.onchange=()=>{
          const key=input.dataset.key;
          state.items[index][key]=input.type==='number'
            ?Number(input.value||0)
            :input.type==='checkbox'
              ?input.checked
              :input.value;
          if(key==='is_pinned'&&state.items[index].id){
            const item=state.items[index];
            rpc('admin_set_mission_item_pinned',{
              p_mission_id:item.id,
              p_is_pinned:item.is_pinned===true
            }).then(result=>{
              if(!result?.ok)throw new Error(result?.error||'고정 노출 저장 실패');
              item.is_pinned=!!result.item?.is_pinned;
              item.selected_today=item.is_pinned||item.selected_today;
              renderItems();
              toast(item.is_pinned?'고정 노출로 설정했습니다.':'고정 노출을 해제했습니다.','ok');
            }).catch(error=>{
              item.is_pinned=!item.is_pinned;
              renderItems();
              toast(error?.message||'고정 노출 저장에 실패했습니다.','error');
            });
            return;
          }
          if(key==='mission_type'){
            const defaults=TYPE_DEFAULTS[input.value];
            if(defaults){
              state.items[index].title=defaults[0];
              state.items[index].description=defaults[1];
              state.items[index].cta_label=defaults[2];
              state.items[index].cta_type=defaults[3];
              state.items[index].cta_target=defaults[4];
              renderItems();
            }
          }
        };
      });
      const remove=qs('[data-remove-item]',row);
      if(remove)remove.onclick=()=>{
        if(state.items.length<=1){
          toast('미션은 최소 1개 필요합니다.','error');
          return;
        }
        state.items.splice(index,1);
        renderItems();
      };
    });
  }

  function renderProgress(){
    const tbody=getEl('missionProgressRows');
    const rows=state.progress||[];
    if(!rows.length){
      tbody.innerHTML='<tr><td colspan="7"><div class="mission-empty">진행 내역이 없습니다.</div></td></tr>';
      return;
    }
    tbody.innerHTML=rows.map(row=>`
      <tr>
        <td><b>${esc(row.email||'이메일 없음')}</b><small>${esc(String(row.user_id||'').slice(0,8))}</small></td>
        <td>${esc(row.campaign_title||'-')}</td>
        <td><b>${esc(row.mission_title||'-')}</b></td>
        <td>${esc(row.period_key||'-')}</td>
        <td>${number(row.progress_count)} / ${number(row.target_count)}</td>
        <td><span class="mission-progress-status ${row.status}">${row.status==='completed'?'완료':'진행 중'}</span></td>
        <td>${esc(fmt(row.completed_at))}<small>지급 ${esc(fmt(row.rewarded_at))}</small></td>
      </tr>`).join('');
  }

  function currentCampaign(){
    return state.campaigns.find(item=>item.id===state.selectedId)||null;
  }

  function renderAll(){
    renderSummary();
    renderSettings();
    renderCampaignList();
    renderCampaignForm(state.newMode?null:currentCampaign());
    renderItems();
    renderProgress();
  }

  async function refresh(selectedId=state.selectedId){
    if(state.busy)return;
    state.busy=true;
    const refreshButton=getEl('missionRefresh');
    if(refreshButton){refreshButton.disabled=true;refreshButton.textContent='불러오는 중...'}
    try{
      const result=await rpc('admin_get_mission_dashboard',{p_campaign_id:selectedId||null});
      if(!result?.ok)throw new Error(result?.error||'미션 데이터를 불러오지 못했습니다.');
      state.settings=result.settings||{};
      state.campaigns=Array.isArray(result.campaigns)?result.campaigns:[];
      state.progress=Array.isArray(result.recent_progress)?result.recent_progress:[];

      if(state.newMode){
        if(!state.items.length)state.items=[blankItem(0)];
      }else{
        let nextId=selectedId;
        if(!nextId||!state.campaigns.some(item=>item.id===nextId)){
          nextId=state.campaigns[0]?.id||'';
        }
        state.selectedId=nextId;
        if(nextId){
          if(String(result.items?.[0]?.campaign_id||'')===String(nextId)){
            state.items=(result.items||[]).map(item=>({...item}));
          }else{
            const detail=await rpc('admin_get_mission_dashboard',{p_campaign_id:nextId});
            state.progress=Array.isArray(detail?.recent_progress)?detail.recent_progress:state.progress;
            state.items=(detail?.items||[]).map(item=>({...item}));
          }
        }else{
          state.newMode=true;
          state.items=[blankItem(0)];
        }
      }
      renderAll();
    }catch(error){
      console.warn('[INTEGRATED MISSIONS]',error);
      const root=getEl('missionAdminIntegrated');
      if(root)root.innerHTML=`<div class="mission-load-error"><b>미션 관리 데이터를 불러오지 못했습니다.</b><span>${esc(error?.message||error)}</span><button id="missionRetry" class="mission-button primary" type="button">다시 시도</button></div>`;
      const retry=getEl('missionRetry');
      if(retry)retry.onclick=()=>window.loadAdminMissions();
    }finally{
      state.busy=false;
      const current=getEl('missionRefresh');
      if(current){current.disabled=false;current.textContent='새로고침'}
    }
  }

  async function selectCampaign(id){
    state.selectedId=id;
    state.newMode=false;
    state.items=[];
    await refresh(id);
  }

  function newCampaign(){
    state.selectedId='';
    state.newMode=true;
    state.items=[blankItem(0)];
    renderCampaignList();
    renderCampaignForm(null);
    renderItems();
  }

  async function saveFeature(){
    const button=getEl('missionSaveFeature');
    button.disabled=true;
    try{
      const result=await rpc('admin_update_mission_feature_settings',{
        p_public_enabled:getEl('missionPublicEnabled').value==='true',
        p_reward_enabled:getEl('missionRewardEnabled').value==='true'
      });
      if(!result?.ok)throw new Error(result?.error||'저장 실패');
      state.settings=result.settings||state.settings;
      renderSettings();
      toast('기능 상태를 저장했습니다.','ok');
    }catch(error){
      console.warn(error);
      toast('기능 상태 저장에 실패했습니다.','error');
    }finally{button.disabled=false}
  }

  async function saveCampaign(){
    const title=getEl('missionCampaignTitle').value.trim();
    const startsAt=toIso(getEl('missionStartsAt').value);
    const endsAt=toIso(getEl('missionEndsAt').value);
    if(!title||!startsAt||!endsAt){
      toast('제목과 운영 기간을 확인해주세요.','error');
      return;
    }
    const existing=currentCampaign();
    const payload={
      title,
      description:getEl('missionCampaignDescription').value.trim(),
      period_type:getEl('missionPeriodType').value,
      display_mode:getEl('missionDisplayMode').value,
      random_count:getEl('missionDisplayMode').value==='random_daily'?Math.max(1,Math.min(100,Number(getEl('missionRandomCount').value)||1)):null,
      starts_at:startsAt,
      ends_at:endsAt,
      status:existing?.status||'draft',
      visibility:getEl('missionVisibility').value,
      priority:Number(getEl('missionPriority').value)||100,
      is_visible:getEl('missionIsVisible').value==='true'
    };
    const button=getEl('missionSaveCampaign');
    button.disabled=true;
    try{
      const result=await rpc('admin_save_mission_campaign',{
        p_campaign_id:state.newMode?null:(state.selectedId||null),
        p_payload:payload
      });
      if(!result?.ok){
        if(result?.error==='campaign_config_locked')throw new Error('진행 이력이 있어 기간·주기·랜덤 편성 설정을 변경할 수 없습니다.');
        if(result?.error==='random_daily_requires_daily')throw new Error('매일 랜덤 노출은 주기를 일간으로 설정해야 합니다.');
        throw new Error(result?.error||'저장 실패');
      }
      state.selectedId=result.campaign.id;
      state.newMode=false;
      toast('미션 세트 기본 설정을 저장했습니다.','ok');
      await refresh(state.selectedId);
    }catch(error){
      console.warn(error);
      toast(error?.message||'기본 설정 저장에 실패했습니다.','error');
    }finally{
      const current=getEl('missionSaveCampaign');
      if(current)current.disabled=false;
    }
  }

  async function saveItems(){
    if(!state.selectedId)return;
    const payload=state.items.map((item,index)=>({
      mission_type:item.mission_type,
      title:String(item.title||'').trim(),
      description:String(item.description||'').trim()||null,
      target_count:Math.max(1,Number(item.target_count)||1),
      reward_coin:Math.max(0,Number(item.reward_coin)||0),
      cta_type:item.cta_type||'route',
      cta_label:String(item.cta_label||'').trim()||null,
      cta_target:String(item.cta_target||'').trim()||null,
      sort_order:(index+1)*10,
      is_active:item.is_active!==false,
      is_pinned:item.is_pinned===true
    }));
    if(payload.some(item=>!item.title)){
      toast('모든 미션 타이틀을 입력해주세요.','error');
      return;
    }
    const button=getEl('missionSaveItems');
    button.disabled=true;
    try{
      const result=await rpc('admin_replace_mission_items',{
        p_campaign_id:state.selectedId,
        p_items:payload
      });
      if(!result?.ok){
        if(result?.error==='mission_config_locked')throw new Error('진행 이력이 있어 미션 항목을 변경할 수 없습니다.');
        throw new Error(result?.error||'저장 실패');
      }
      toast('미션 항목을 저장했습니다.','ok');
      await refresh(state.selectedId);
    }catch(error){
      console.warn(error);
      toast(error?.message||'미션 항목 저장에 실패했습니다.','error');
    }finally{
      const current=getEl('missionSaveItems');
      if(current)current.disabled=false;
    }
  }

  async function setStatus(status){
    if(!state.selectedId)return;
    try{
      const result=await rpc('admin_set_mission_campaign_status',{
        p_campaign_id:state.selectedId,
        p_status:status
      });
      if(!result?.ok){
        if(result?.error==='items_required')throw new Error('미션 항목을 먼저 저장해주세요.');
        throw new Error(result?.error||'상태 변경 실패');
      }
      toast('미션 세트 상태를 변경했습니다.','ok');
      await refresh(state.selectedId);
    }catch(error){
      console.warn(error);
      toast(error?.message||'상태 변경에 실패했습니다.','error');
    }
  }

  async function deleteCampaign(){
    const campaign=currentCampaign();
    if(!campaign||campaign.status!=='ended')return;
    const confirmed=confirm(`“${campaign.title}” 미션 세트를 삭제할까요?\n\n사용자 진행 이력과 퍼니코인 지급 원장은 유지되고, 관리자 목록에서만 숨김 처리됩니다.`);
    if(!confirmed)return;

    const button=getEl('missionDelete');
    if(button){button.disabled=true;button.textContent='삭제 중...'}
    try{
      const result=await rpc('admin_soft_delete_mission_campaign',{
        p_campaign_id:campaign.id
      });
      if(!result?.ok){
        if(result?.error==='ended_only')throw new Error('종료된 미션 세트만 삭제할 수 있습니다.');
        throw new Error(result?.error||'삭제 실패');
      }
      toast('종료된 미션 세트를 삭제했습니다. 진행·보상 이력은 유지됩니다.','ok');
      state.selectedId='';
      state.newMode=false;
      state.items=[];
      await refresh('');
    }catch(error){
      console.warn(error);
      toast(error?.message||'미션 세트 삭제에 실패했습니다.','error');
    }finally{
      const current=getEl('missionDelete');
      if(current){current.disabled=false;current.textContent='삭제'}
    }
  }

  function bind(){
    getEl('missionRefresh').onclick=()=>refresh(state.selectedId);
    getEl('missionNewCampaign').onclick=newCampaign;
    getEl('missionSaveFeature').onclick=saveFeature;
    getEl('missionSaveCampaign').onclick=saveCampaign;
    getEl('missionDisplayMode').onchange=syncRandomUi;
    getEl('missionPeriodType').onchange=syncRandomUi;
    getEl('missionAddItem').onclick=()=>{state.items.push(blankItem(state.items.length));renderItems()};
    getEl('missionSaveItems').onclick=saveItems;
    getEl('missionActivate').onclick=()=>setStatus('active');
    getEl('missionPause').onclick=()=>setStatus('paused');
    getEl('missionEnd').onclick=()=>setStatus('ended');
    getEl('missionDelete').onclick=deleteCampaign;
  }

  async function openIntegrated(){
    ensureStyle();
    setIntegratedTabUi();
    const feed=document.getElementById('feed');
    if(!feed)return;
    feed.innerHTML=rootTemplate();
    state={
      campaigns:[],
      items:[],
      selectedId:'',
      newMode:false,
      settings:{},
      progress:[],
      busy:false
    };
    bind();
    await refresh('');
  }

  function installMenuOverride(){
    const desktop=document.getElementById('adminMissionMenuLink');
    if(desktop&&!desktop.dataset.integratedMission){
      desktop.dataset.integratedMission='1';
      desktop.dataset.adminTab='missions';
      desktop.onclick=event=>{event.preventDefault();void openIntegrated()};
    }
    const mobile=document.getElementById('adminMissionMobileLink');
    if(mobile&&!mobile.dataset.integratedMission){
      mobile.dataset.integratedMission='1';
      mobile.dataset.adminTab='missions';
      mobile.onclick=event=>{event.preventDefault();void openIntegrated()};
    }
  }

  ensureStyle();
  window.loadAdminMissions=openIntegrated;
  window.FUNY_ADMIN_OPEN_MISSIONS=openIntegrated;
  installMenuOverride();
  new MutationObserver(()=>installMenuOverride()).observe(document.documentElement,{childList:true,subtree:true});

  if(location.hash==='#missions'){
    const timer=setInterval(()=>{
      installMenuOverride();
      const button=document.getElementById('adminMissionMenuLink');
      const loggedIn=!document.querySelector('.main.login-state');
      if(button&&loggedIn){
        clearInterval(timer);
        void openIntegrated();
      }
    },180);
    setTimeout(()=>clearInterval(timer),10000);
  }
})();
