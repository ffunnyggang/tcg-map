(()=>{
  const TAB='notifications';
  const CATEGORIES=[
    ['service','운영 공지'],
    ['community','TALK'],
    ['market','TCG 거래'],
    ['rewards','리워드 · 배지'],
    ['missions','미션'],
    ['coupons','쿠폰'],
  ];

  const styles=document.createElement('style');
  styles.textContent=`
  .notification-admin{display:grid;gap:16px}
  .notification-admin-grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(280px,.85fr);gap:16px}
  .notification-admin-card{background:#fff;border:1px solid #e9e5ec;border-radius:18px;padding:18px}
  .notification-admin-card h3{margin:0 0 14px;font-size:15px;color:#211d25}
  .notification-admin-field{display:grid;gap:7px;margin-top:13px}
  .notification-admin-field:first-of-type{margin-top:0}
  .notification-admin-field label{font-size:11px;font-weight:800;color:#625b67}
  .notification-admin-field input,.notification-admin-field textarea,.notification-admin-field select{width:100%;box-sizing:border-box;border:1px solid #ded8e3;border-radius:12px;background:#fff;padding:10px 12px;font:inherit;color:#211d25;outline:none}
  .notification-admin-field textarea{min-height:96px;resize:vertical;line-height:1.55}
  .notification-admin-field input:focus,.notification-admin-field textarea:focus,.notification-admin-field select:focus{border-color:#8a6bd0;box-shadow:0 0 0 3px rgba(118,87,214,.09)}
  .notification-admin-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .notification-admin-hint{font-size:10px;line-height:1.5;color:#918993}
  .notification-admin-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:18px;flex-wrap:wrap}
  .notification-admin-actions button{height:38px;border:0;border-radius:11px;padding:0 15px;font-weight:900;cursor:pointer}
  .notification-admin-actions .test{background:#eee8fa;color:#6746b7}
  .notification-admin-actions .send{background:#6746b7;color:#fff}
  .notification-admin-actions button:disabled{opacity:.45;cursor:default}
  .notification-preview{border-radius:18px;background:#f6f3f8;padding:15px}
  .notification-preview-app{font-size:9px;font-weight:800;color:#8b8390}
  .notification-preview-title{margin-top:7px;font-size:13px;font-weight:900;color:#211d25}
  .notification-preview-body{margin-top:4px;font-size:11px;line-height:1.45;color:#655e69;white-space:pre-wrap}
  .notification-preview-meta{margin-top:10px;font-size:9px;color:#9a929e}
  .notification-stat-row{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:14px}
  .notification-stat{padding:11px;border-radius:13px;background:#faf8fb;border:1px solid #eeeaf0}
  .notification-stat b{display:block;font-size:16px;color:#2b2630}.notification-stat span{font-size:9px;color:#918a95}
  .notification-history{display:grid;gap:8px}
  .notification-history-item{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;padding:13px 14px;border:1px solid #ece7ef;border-radius:14px;background:#fff}
  .notification-history-item b{font-size:12px;color:#2b2630}.notification-history-item p{margin:4px 0 0;font-size:10px;line-height:1.45;color:#756e79}
  .notification-history-meta{margin-top:7px;font-size:9px;color:#9b949f}
  .notification-history-status{align-self:start;padding:4px 8px;border-radius:999px;background:#f0ecf8;color:#6d52ad;font-size:9px;font-weight:900;white-space:nowrap}
  .notification-empty{padding:32px;text-align:center;color:#9a939e;font-size:11px}
  @media(max-width:900px){.notification-admin-grid{grid-template-columns:1fr}.notification-admin-row{grid-template-columns:1fr}.notification-stat-row{grid-template-columns:repeat(2,1fr)}}
  `;
  document.head.appendChild(styles);

  function addButtons(){
    if(document.querySelector('[data-admin-tab="'+TAB+'"]'))return;
    const floating=document.querySelector('[data-admin-tab="floating"]');
    if(floating?.parentElement){
      const button=document.createElement('button');
      button.dataset.adminTab=TAB;
      button.textContent='알림 관리';
      floating.insertAdjacentElement('afterend',button);
      button.addEventListener('click',()=>activate(button));
    }
    const mobile=document.getElementById('mobileTabs');
    if(mobile){
      const button=document.createElement('button');
      button.dataset.adminTab=TAB;
      button.textContent='알림 관리';
      const floatMobile=mobile.querySelector('[data-admin-tab="floating"]');
      if(floatMobile)floatMobile.insertAdjacentElement('afterend',button);else mobile.appendChild(button);
      button.addEventListener('click',()=>activate(button));
    }
  }

  function activate(source){
    document.querySelectorAll('[data-admin-tab]').forEach(x=>x.classList.toggle('on',x.dataset.adminTab===TAB));
    const title=document.getElementById('toolbarTitle'),sub=document.getElementById('toolbarSub');
    if(title)title.textContent='알림 관리';
    if(sub)sub.textContent='앱 푸시 · 알림함 · 예약 발송 · 발송 이력';
    loadAdminNotifications();
  }

  const escText=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=value=>{try{return value?new Date(value).toLocaleString('ko-KR'):'-'}catch{return '-'}};
  const statusLabel=status=>({draft:'임시저장',scheduled:'예약',sending:'발송 중',sent:'발송 완료',failed:'실패'}[status]||status||'-');

  async function fetchCampaigns(){
    return api('/rest/v1/notification_campaigns?select=*&order=created_at.desc&limit=40');
  }

  async function fetchStats(){
    const [pending,sent,error,devices]=await Promise.all([
      api('/rest/v1/notifications?select=id&push_status=eq.pending',{headers:{Prefer:'count=exact'}}).catch(()=>[]),
      api('/rest/v1/notifications?select=id&push_status=eq.sent',{headers:{Prefer:'count=exact'}}).catch(()=>[]),
      api('/rest/v1/notifications?select=id&push_status=eq.error',{headers:{Prefer:'count=exact'}}).catch(()=>[]),
      api('/rest/v1/push_devices?select=id,active,app_variant&active=eq.true').catch(()=>[]),
    ]);
    return {
      pending:Array.isArray(pending)?pending.length:0,
      sent:Array.isArray(sent)?sent.length:0,
      error:Array.isArray(error)?error.length:0,
      devices:Array.isArray(devices)?devices.length:0,
      prod:Array.isArray(devices)?devices.filter(x=>x.app_variant==='production').length:0,
      dev:Array.isArray(devices)?devices.filter(x=>x.app_variant==='development').length:0,
    };
  }

  function renderShell(feed,campaigns,stats){
    feed.innerHTML=`
      <section class="notification-admin">
        <div class="notification-admin-grid">
          <article class="notification-admin-card">
            <h3>새 알림 발송</h3>
            <div class="notification-admin-field">
              <label>알림 제목</label>
              <input id="notificationTitle" maxlength="120" placeholder="예: FUNY PIN 업데이트 안내">
            </div>
            <div class="notification-admin-field">
              <label>내용</label>
              <textarea id="notificationBody" maxlength="500" placeholder="사용자에게 전달할 내용을 입력하세요."></textarea>
            </div>
            <div class="notification-admin-row">
              <div class="notification-admin-field">
                <label>알림 유형</label>
                <select id="notificationCategory">${CATEGORIES.map(([v,l])=>'<option value="'+v+'">'+l+'</option>').join('')}</select>
              </div>
              <div class="notification-admin-field">
                <label>대상</label>
                <select id="notificationTarget">
                  <option value="all">전체 회원</option>
                  <option value="self">관리자 본인</option>
                  <option value="user_ids">특정 회원</option>
                </select>
              </div>
            </div>
            <div id="notificationUserIdsWrap" class="notification-admin-field" hidden>
              <label>회원 UUID</label>
              <textarea id="notificationUserIds" placeholder="UUID를 쉼표 또는 줄바꿈으로 구분해 입력"></textarea>
            </div>
            <div class="notification-admin-row">
              <div class="notification-admin-field">
                <label>앱 이동 경로 (선택)</label>
                <input id="notificationRoute" placeholder="/(tabs)/talk 또는 /my/coupons">
              </div>
              <div class="notification-admin-field">
                <label>웹 URL (선택)</label>
                <input id="notificationUrl" placeholder="https://funypin.kr/...">
              </div>
            </div>
            <div class="notification-admin-field">
              <label>예약 시각 (선택)</label>
              <input id="notificationSchedule" type="datetime-local">
              <div class="notification-admin-hint">비워두면 즉시 발송합니다. 예약 발송은 서버에서 자동 처리됩니다.</div>
            </div>
            <div class="notification-admin-actions">
              <button id="notificationTestBtn" class="test" type="button">내 DEV 앱 테스트</button>
              <button id="notificationSendBtn" class="send" type="button">최종 발송</button>
            </div>
          </article>

          <article class="notification-admin-card">
            <h3>미리보기</h3>
            <div class="notification-preview">
              <div class="notification-preview-app">FUNY PIN · 지금</div>
              <div id="notificationPreviewTitle" class="notification-preview-title">알림 제목</div>
              <div id="notificationPreviewBody" class="notification-preview-body">알림 내용을 입력하면 여기에 표시됩니다.</div>
              <div id="notificationPreviewMeta" class="notification-preview-meta">운영 공지 · 전체 회원</div>
            </div>
            <div class="notification-stat-row">
              <div class="notification-stat"><b>${stats.devices}</b><span>활성 기기</span></div>
              <div class="notification-stat"><b>${stats.prod}</b><span>운영 토큰</span></div>
              <div class="notification-stat"><b>${stats.dev}</b><span>DEV 토큰</span></div>
              <div class="notification-stat"><b>${stats.error}</b><span>전송 오류</span></div>
            </div>
            <div class="notification-admin-hint" style="margin-top:12px">테스트 발송은 현재 관리자 계정의 DEV 앱 토큰으로만 전송됩니다. 최종 발송 전에 반드시 테스트를 권장합니다.</div>
          </article>
        </div>

        <article class="notification-admin-card">
          <h3>최근 발송 이력</h3>
          <div id="notificationHistory" class="notification-history">
            ${campaigns.length?campaigns.map(historyItem).join(''):'<div class="notification-empty">아직 발송 이력이 없습니다.</div>'}
          </div>
        </article>
      </section>
    `;

    bind(feed);
  }

  function historyItem(row){
    const target=row.target_type==='all'?'전체':row.target_type==='self'?'본인 테스트':'특정 회원';
    return `<div class="notification-history-item">
      <div>
        <b>${escText(row.title)}</b>
        <p>${escText(row.body)}</p>
        <div class="notification-history-meta">${target} · 대상 ${Number(row.recipient_count||0).toLocaleString()}명 · 생성 ${fmt(row.created_at)}${row.scheduled_at?' · 예약 '+fmt(row.scheduled_at):''}</div>
      </div>
      <span class="notification-history-status">${escText(statusLabel(row.status))}</span>
    </div>`;
  }

  function bind(){
    const title=document.getElementById('notificationTitle');
    const body=document.getElementById('notificationBody');
    const category=document.getElementById('notificationCategory');
    const target=document.getElementById('notificationTarget');
    const userWrap=document.getElementById('notificationUserIdsWrap');
    const preview=()=>{
      const label=CATEGORIES.find(x=>x[0]===category.value)?.[1]||category.value;
      const targetLabel=target.value==='all'?'전체 회원':target.value==='self'?'관리자 본인':'특정 회원';
      document.getElementById('notificationPreviewTitle').textContent=title.value.trim()||'알림 제목';
      document.getElementById('notificationPreviewBody').textContent=body.value.trim()||'알림 내용을 입력하면 여기에 표시됩니다.';
      document.getElementById('notificationPreviewMeta').textContent=label+' · '+targetLabel;
      userWrap.hidden=target.value!=='user_ids';
    };
    [title,body,category,target].forEach(el=>el.addEventListener(el.tagName==='SELECT'?'change':'input',preview));
    preview();

    document.getElementById('notificationTestBtn').onclick=()=>send(true);
    document.getElementById('notificationSendBtn').onclick=()=>send(false);
  }

  function readPayload(test){
    const title=document.getElementById('notificationTitle').value.trim();
    const body=document.getElementById('notificationBody').value.trim();
    if(!title||!body)throw new Error('제목과 내용을 입력해주세요.');

    const category=document.getElementById('notificationCategory').value;
    const requestedTarget=document.getElementById('notificationTarget').value;
    const target=test?'self':requestedTarget;
    const route=document.getElementById('notificationRoute').value.trim()||null;
    const url=document.getElementById('notificationUrl').value.trim()||null;
    const schedule=document.getElementById('notificationSchedule').value;
    const userIds=(document.getElementById('notificationUserIds')?.value||'').split(/[\s,]+/).map(x=>x.trim()).filter(Boolean);

    if(!test&&target==='user_ids'&&!userIds.length)throw new Error('특정 회원 UUID를 입력해주세요.');

    return {
      title,body,category,
      notification_type:category==='service'?'service_notice':category+'_admin',
      target_type:target,
      user_ids:target==='user_ids'?userIds:[],
      route,url,
      scheduled_at:(!test&&schedule)?new Date(schedule).toISOString():null,
      test_push:test,
      data:{admin_manual:true},
    };
  }

  async function send(test){
    let payload;
    try{payload=readPayload(test)}catch(e){alert(e.message);return}

    if(test){
      if(!confirm('현재 관리자 계정의 FUNY PIN DEV 앱으로 테스트 알림을 보낼까요?'))return;
    }else{
      const targetLabel=payload.target_type==='all'?'전체 회원':payload.target_type==='self'?'관리자 본인':'특정 회원 '+payload.user_ids.length+'명';
      const timing=payload.scheduled_at?'예약 '+new Date(payload.scheduled_at).toLocaleString('ko-KR'):'즉시';
      if(!confirm('최종 발송 전 확인\n\n대상: '+targetLabel+'\n시점: '+timing+'\n제목: '+payload.title+'\n\n발송을 진행할까요?'))return;
    }

    const testBtn=document.getElementById('notificationTestBtn');
    const sendBtn=document.getElementById('notificationSendBtn');
    testBtn.disabled=true;sendBtn.disabled=true;
    try{
      const result=await api('/functions/v1/notification-admin-send',{method:'POST',body:JSON.stringify(payload)});
      if(test)alert('DEV 테스트 알림을 요청했습니다.\nFUNY PIN DEV 앱에서 수신 여부를 확인해주세요.');
      else alert(result?.scheduled?'알림 예약이 완료되었습니다.':'알림 발송 요청이 완료되었습니다.');
      await loadAdminNotifications();
    }catch(e){
      alert('알림 발송 실패: '+e.message);
    }finally{
      if(document.getElementById('notificationTestBtn'))document.getElementById('notificationTestBtn').disabled=false;
      if(document.getElementById('notificationSendBtn'))document.getElementById('notificationSendBtn').disabled=false;
    }
  }

  async function loadAdminNotifications(){
    const feed=document.getElementById('feed');
    if(!feed)return;
    feed.innerHTML='<div class="empty">알림 관리 정보를 불러오는 중...</div>';
    try{
      const [campaigns,stats]=await Promise.all([fetchCampaigns(),fetchStats()]);
      renderShell(feed,campaigns,stats);
    }catch(e){
      feed.innerHTML='<div class="empty error">알림 관리 조회 실패: '+escText(e.message)+'</div>';
    }
  }

  window.loadAdminNotifications=loadAdminNotifications;

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addButtons);
  else addButtons();
})();