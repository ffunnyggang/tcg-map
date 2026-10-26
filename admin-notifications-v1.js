(()=>{
  const TAB='notifications';
  const CATEGORIES=[
    ['service','운영 공지'],
    ['community','TALK · 바인더'],
    ['market','TCG 거래'],
    ['rewards','이벤트 · 리워드 · 배지'],
    ['missions','미션'],
    ['coupons','쿠폰'],
  ];
  const ROUTES=[
    ['','선택 안 함'],
    ['/(tabs)','HOME'],
    ['/(tabs)/map','TCG MAP'],
    ['/(tabs)/pick','PICK'],
    ['/(tabs)/talk','TALK'],
    ['/(tabs)/my','MY'],
    ['/my/notifications','알림함'],
    ['/my/notification-settings','알림 설정'],
    ['/my/coupons','쿠폰함'],
    ['/my/entries','응모 내역'],
    ['/my/favorites','관심 매장'],
    ['/my/funymon','퍼니몬'],
    ['/market','TCG 거래'],
    ['/live-pin','LIVE PIN'],
    ['__talk_post__','TALK 특정 게시글'],
    ['__shop__','카드샵 상세'],
    ['__custom__','직접 입력'],
  ];
  const AUTO_NOTIFICATIONS=[
    {
      category:'TALK · 바인더',
      condition:'다른 사용자가 내 TALK 게시글을 좋아요',
      title:'내 게시글에 좋아요가 눌렸어요',
      body:'{닉네임}님이 회원님의 게시글을 좋아합니다.',
      destination:'해당 TALK 게시글',
    },
    {
      category:'TALK · 바인더',
      condition:'내 TALK 게시글에 댓글 등록',
      title:'새 댓글이 달렸어요',
      body:'{닉네임}님이 회원님의 게시글에 댓글을 남겼습니다.',
      destination:'해당 TALK 게시글',
    },
    {
      category:'TALK · 바인더',
      condition:'내 TALK 댓글에 답글 등록',
      title:'내 댓글에 답글이 달렸어요',
      body:'{닉네임}님이 회원님의 댓글에 답글을 남겼습니다.',
      destination:'해당 TALK 게시글',
    },
    {
      category:'TALK · 바인더',
      condition:'내 게시글의 다른 사람 댓글에 답글 등록',
      title:'내 게시글에 답글이 달렸어요',
      body:'{닉네임}님이 회원님의 게시글에 답글을 남겼습니다.',
      destination:'해당 TALK 게시글',
    },
    {
      category:'TALK · 바인더',
      condition:'다른 사용자가 내 TALK 댓글을 좋아요',
      title:'내 댓글에 좋아요가 눌렸어요',
      body:'{닉네임}님이 회원님의 댓글을 좋아합니다.',
      destination:'해당 TALK 게시글',
    },
    {
      category:'TALK · 바인더',
      condition:'다른 사용자가 내 공개 바인더를 좋아요',
      title:'내 바인더에 좋아요가 눌렸어요',
      body:'{닉네임}님이 회원님의 바인더를 좋아합니다.',
      destination:'해당 바인더',
    },
    {
      category:'TALK · 바인더',
      condition:'내 공개 바인더에 댓글 등록',
      title:'내 바인더에 새 댓글이 달렸어요',
      body:'{닉네임}님이 회원님의 바인더에 댓글을 남겼습니다.',
      destination:'해당 바인더',
    },
    {
      category:'TALK · 바인더',
      condition:'내 바인더 댓글에 답글 등록',
      title:'내 바인더 댓글에 답글이 달렸어요',
      body:'{닉네임}님이 회원님의 댓글에 답글을 남겼습니다.',
      destination:'해당 바인더',
    },
    {
      category:'TALK · 바인더',
      condition:'내 바인더의 다른 사람 댓글에 답글 등록',
      title:'내 바인더에 답글이 달렸어요',
      body:'{닉네임}님이 회원님의 바인더에 답글을 남겼습니다.',
      destination:'해당 바인더',
    },
    {
      category:'TALK · 바인더',
      condition:'다른 사용자가 내 바인더 댓글을 좋아요',
      title:'내 바인더 댓글에 좋아요가 눌렸어요',
      body:'{닉네임}님이 회원님의 댓글을 좋아합니다.',
      destination:'해당 바인더',
    },
    {
      category:'TCG 거래',
      condition:'TCG 거래 채팅 메시지 수신',
      title:'새 거래 메시지가 도착했어요',
      body:'{상대 닉네임}님: {메시지 내용}',
      destination:'TCG 거래',
    },
    {
      category:'TCG 거래',
      condition:'등록 매물 상태 변경',
      title:'거래 매물 상태가 변경됐어요',
      body:'{매물명} · 판매중 / 거래 완료 / 종료 / 비노출',
      destination:'TCG 거래',
    },
    {
      category:'이벤트 · 리워드 · 배지',
      condition:'퍼니몬 이벤트 등 실제 응모 완료',
      title:'이벤트 응모가 완료됐어요',
      body:'{이벤트명} 응모가 정상적으로 완료되었습니다. · 필요 시 오늘 N회 / 총 N회',
      destination:'응모 내역',
    },
    {
      category:'이벤트 · 리워드 · 배지',
      condition:'퍼니몬 실제 리워드 지급 (응모권 entry 제외)',
      title:'리워드가 지급됐어요',
      body:'{리워드명}을 확인해보세요.',
      destination:'응모 내역',
    },
    {
      category:'이벤트 · 리워드 · 배지',
      condition:'새 배지 획득',
      title:'새 배지를 획득했어요',
      body:'{배지명} 배지가 추가되었습니다.',
      destination:'배지 페이지',
    },
    {
      category:'미션',
      condition:'미션 상태가 최초로 완료 처리',
      title:'미션을 완료했어요',
      body:'{미션명} · +N FUNY COIN',
      destination:'MY',
    },
    {
      category:'쿠폰',
      condition:'새 쿠폰 발급',
      title:'새 쿠폰이 발급됐어요',
      body:'{쿠폰명}을 쿠폰함에서 확인해보세요.',
      destination:'쿠폰함',
    },
  ];

  const styles=document.createElement('style');
  styles.textContent=`
  .notification-admin{display:grid;gap:18px;align-items:start}
  .notification-admin-grid{display:grid;grid-template-columns:minmax(0,1.22fr) minmax(300px,.78fr);gap:18px;align-items:start}
  .notification-admin-card{background:#fff;border:1px solid #e9e5ec;border-radius:16px;padding:20px;box-sizing:border-box;min-width:0}
  .notification-admin-card-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}
  .notification-admin-card h3{margin:0;font-size:15px;line-height:1.35;font-weight:900;color:#211d25;text-align:left}
  .notification-admin-card>h3{margin-bottom:18px}
  .notification-admin-guide-btn{height:34px;border:1px solid #ded7e8;border-radius:10px;background:#fff;color:#684dae;padding:0 11px;font-size:11px;font-weight:800;white-space:nowrap;cursor:pointer}
  .notification-admin-guide-btn:hover{background:#f7f4fb}
  .notification-admin-field{display:grid;gap:7px;margin-top:14px;min-width:0}
  .notification-admin-field label{display:flex;align-items:center;min-height:16px;font-size:11px;line-height:16px;font-weight:800;color:#625b67;text-align:left}
  .notification-admin-field input,.notification-admin-field select{width:100%;height:42px;box-sizing:border-box;border:1px solid #ded8e3;border-radius:11px;background:#fff;padding:0 12px;font:inherit;font-size:12px;color:#211d25;outline:none}
  .notification-admin-field textarea{width:100%;min-height:100px;box-sizing:border-box;border:1px solid #ded8e3;border-radius:11px;background:#fff;padding:11px 12px;font:inherit;font-size:12px;line-height:1.55;color:#211d25;outline:none;resize:vertical}
  .notification-admin-field input:focus,.notification-admin-field textarea:focus,.notification-admin-field select:focus{border-color:#8a6bd0;box-shadow:0 0 0 3px rgba(118,87,214,.09)}
  .notification-admin-field input:disabled{background:#f6f3f8;color:#aaa3ad;cursor:not-allowed}
  .notification-admin-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;align-items:start}
  .notification-admin-row>.notification-admin-field{margin-top:14px}
  .notification-admin-hint{font-size:10px;line-height:1.5;color:#918993;text-align:left}
  .notification-admin-route-result{margin-top:10px;padding:9px 11px;border-radius:10px;background:#f8f6fa;border:1px solid #eee9f2;font-size:10px;line-height:1.45;color:#746d79;word-break:break-all}
  .notification-admin-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:20px;padding-top:16px;border-top:1px solid #f0ecf2;flex-wrap:wrap}
  .notification-admin-actions button{height:40px;border:0;border-radius:10px;padding:0 16px;font-size:11px;font-weight:900;cursor:pointer}
  .notification-admin-actions .test{background:#eee8fa;color:#6746b7}
  .notification-admin-actions .send{background:#6746b7;color:#fff}
  .notification-admin-actions button:disabled{opacity:.45;cursor:default}
  .notification-preview{border-radius:14px;background:#f7f4f9;padding:16px;border:1px solid #f0ebf3}
  .notification-preview-app{font-size:9px;font-weight:800;color:#8b8390}
  .notification-preview-title{margin-top:7px;font-size:13px;line-height:1.4;font-weight:900;color:#211d25}
  .notification-preview-body{margin-top:5px;font-size:11px;line-height:1.55;color:#655e69;white-space:pre-wrap}
  .notification-preview-meta{margin-top:11px;font-size:9px;line-height:1.45;color:#9a929e;word-break:break-all}
  .notification-stat-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:14px}
  .notification-stat{padding:12px;border-radius:12px;background:#faf8fb;border:1px solid #eeeaf0;text-align:left}
  .notification-stat b{display:block;font-size:16px;line-height:1.2;color:#2b2630}
  .notification-stat span{display:block;margin-top:3px;font-size:9px;color:#918a95}
  .notification-history{display:grid;gap:8px}
  .notification-history-item{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;padding:14px 15px;border:1px solid #ece7ef;border-radius:12px;background:#fff}
  .notification-history-item b{display:block;font-size:12px;line-height:1.4;color:#2b2630;text-align:left}
  .notification-history-item p{margin:4px 0 0;font-size:10px;line-height:1.5;color:#756e79;text-align:left}
  .notification-history-meta{margin-top:7px;font-size:9px;line-height:1.45;color:#9b949f;text-align:left;word-break:break-all}
  .notification-history-status{align-self:start;padding:5px 8px;border-radius:999px;background:#f0ecf8;color:#6d52ad;font-size:9px;font-weight:900;white-space:nowrap}
  .notification-empty{padding:32px;text-align:center;color:#9a939e;font-size:11px}
  .notification-auto-overlay{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(25,21,29,.42);backdrop-filter:blur(2px)}
  .notification-auto-overlay[hidden]{display:none}
  .notification-auto-modal{width:min(760px,100%);max-height:min(760px,calc(100vh - 48px));display:flex;flex-direction:column;background:#fff;border-radius:18px;box-shadow:0 20px 70px rgba(30,24,35,.2);overflow:hidden}
  .notification-auto-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:20px 22px 16px;border-bottom:1px solid #eee9f0}
  .notification-auto-head h3{margin:0;font-size:16px;line-height:1.35;color:#211d25}
  .notification-auto-head p{margin:6px 0 0;font-size:10px;line-height:1.5;color:#8d8590}
  .notification-auto-close{width:34px;height:34px;flex:0 0 auto;border:0;border-radius:10px;background:#f5f2f7;color:#5f5763;font-size:19px;line-height:1;cursor:pointer}
  .notification-auto-list{overflow:auto;padding:14px 22px 22px;display:grid;gap:9px}
  .notification-auto-item{display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:11px;align-items:start;padding:13px 14px;border:1px solid #ece7ef;border-radius:12px;background:#fff}
  .notification-auto-num{width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:9px;background:#f1ecf8;color:#6c50b1;font-size:10px;font-weight:900}
  .notification-auto-category{display:inline-flex;margin-bottom:5px;padding:4px 7px;border-radius:999px;background:#f1ecf8;color:#6c50b1;font-size:8.5px;font-weight:900}\n  .notification-auto-condition{font-size:10px;font-weight:800;color:#8b8390}
  .notification-auto-title{margin-top:3px;font-size:12px;line-height:1.4;font-weight:900;color:#29242d}
  .notification-auto-body{margin-top:4px;font-size:10px;line-height:1.5;color:#756e79}
  .notification-auto-dest{padding:5px 8px;border-radius:8px;background:#f7f5f8;font-size:9px;font-weight:800;color:#746b78;white-space:nowrap}
  .notification-auto-foot{padding:0 22px 18px;font-size:9px;line-height:1.5;color:#9a929e}
  @media(max-width:900px){
    .notification-admin-grid{grid-template-columns:1fr}
    .notification-admin-row{grid-template-columns:1fr}
    .notification-admin-row>.notification-admin-field{margin-top:14px}
  }
  @media(max-width:600px){
    .notification-admin-card{padding:16px}
    .notification-admin-card-head{align-items:flex-start}
    .notification-admin-guide-btn{height:32px}
    .notification-admin-actions{display:grid;grid-template-columns:1fr 1fr}
    .notification-admin-actions button{width:100%;padding:0 10px}
    .notification-history-item{grid-template-columns:1fr}
    .notification-history-status{justify-self:start}
    .notification-auto-overlay{padding:12px;align-items:flex-end}
    .notification-auto-modal{max-height:88vh;border-radius:18px 18px 0 0}
    .notification-auto-head{padding:18px 16px 14px}
    .notification-auto-list{padding:12px 16px 18px}
    .notification-auto-item{grid-template-columns:28px minmax(0,1fr)}
    .notification-auto-dest{grid-column:2;justify-self:start}
    .notification-auto-foot{padding:0 16px 16px}
  }
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
            <div class="notification-admin-card-head">
              <h3>새 알림 발송</h3>
              <button id="notificationAutoGuideBtn" class="notification-admin-guide-btn" type="button">자동 기본 알림 ${AUTO_NOTIFICATIONS.length}종 보기</button>
            </div>
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
                <label>앱 이동 화면 (선택)</label>
                <select id="notificationRoutePreset">
                  ${ROUTES.map(([v,l])=>'<option value="'+v+'">'+l+'</option>').join('')}
                </select>
                <div class="notification-admin-hint">앱 내부 화면으로 이동할 때 선택하세요.</div>
              </div>
              <div class="notification-admin-field">
                <label>웹 URL (선택)</label>
                <input id="notificationUrl" placeholder="https://funypin.kr/...">
                <div id="notificationUrlHint" class="notification-admin-hint">앱 이동 화면을 선택하지 않았을 때 사용합니다.</div>
              </div>
            </div>
            <div id="notificationRouteDetailWrap" class="notification-admin-field" hidden>
              <label id="notificationRouteDetailLabel">세부 ID</label>
              <input id="notificationRouteDetail" placeholder="">
            </div>
            <div id="notificationCustomRouteWrap" class="notification-admin-field" hidden>
              <label>직접 입력 경로</label>
              <input id="notificationCustomRoute" placeholder="/my/coupons">
              <div class="notification-admin-hint">Expo Router 경로를 / 로 시작해 입력하세요.</div>
            </div>
            <div id="notificationResolvedRoute" class="notification-admin-route-result">앱 이동 없음</div>
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
            <div class="notification-admin-hint" style="margin-top:12px">테스트 발송은 현재 관리자 로그인 계정과 동일한 회원 ID의 DEV 앱 토큰으로만 전송됩니다. 최종 발송 전에 반드시 테스트를 권장합니다.</div>
          </article>
        </div>

        <article class="notification-admin-card">
          <h3>최근 발송 이력</h3>
          <div id="notificationHistory" class="notification-history">
            ${campaigns.length?campaigns.map(historyItem).join(''):'<div class="notification-empty">아직 발송 이력이 없습니다.</div>'}
          </div>
        </article>
      </section>

      <div id="notificationAutoModal" class="notification-auto-overlay" role="dialog" aria-modal="true" aria-labelledby="notificationAutoTitle" tabindex="-1" hidden>
        <section class="notification-auto-modal">
          <div class="notification-auto-head">
            <div>
              <h3 id="notificationAutoTitle">자동 기본 알림 ${AUTO_NOTIFICATIONS.length}종</h3>
              <p>사용자 행동이나 상태 변경 시 자동으로 생성되는 기본 알림 예시입니다.</p>
            </div>
            <button id="notificationAutoClose" class="notification-auto-close" type="button" aria-label="닫기">×</button>
          </div>
          <div class="notification-auto-list">
            ${AUTO_NOTIFICATIONS.map((item,index)=>`
              <div class="notification-auto-item">
                <div class="notification-auto-num">${index+1}</div>
                <div>
                  <div class="notification-auto-category">${escText(item.category)}</div>
                  <div class="notification-auto-condition">${escText(item.condition)}</div>
                  <div class="notification-auto-title">${escText(item.title)}</div>
                  <div class="notification-auto-body">${escText(item.body)}</div>
                </div>
                <div class="notification-auto-dest">→ ${escText(item.destination)}</div>
              </div>
            `).join('')}
          </div>
          <div class="notification-auto-foot">※ 중괄호({ }) 영역은 실제 사용자·게시글·이벤트·리워드 정보로 자동 치환됩니다. 본인이 자기 게시글·댓글·바인더에 한 행동은 알림에서 제외되며, 동일 반응은 중복 생성되지 않습니다. 퍼니몬 응모권(entry) 발급만으로는 리워드 알림이 생성되지 않고 실제 응모 완료 시 ‘이벤트 응모가 완료됐어요’ 알림이 생성됩니다. 푸시를 꺼도 앱 알림함에는 기록될 수 있습니다.</div>
        </section>
      </div>
    `;

    bind(feed);
  }

  function historyItem(row){
    const target=row.target_type==='all'?'전체':row.target_type==='self'?'본인 테스트':'특정 회원';
    const destination=row.route?'앱 '+row.route:(row.url?'웹 '+row.url:'이동 없음');
    return `<div class="notification-history-item">
      <div>
        <b>${escText(row.title)}</b>
        <p>${escText(row.body)}</p>
        <div class="notification-history-meta">${target} · 대상 ${Number(row.recipient_count||0).toLocaleString()}명 · ${escText(destination)} · 생성 ${fmt(row.created_at)}${row.scheduled_at?' · 예약 '+fmt(row.scheduled_at):''}</div>
      </div>
      <span class="notification-history-status">${escText(statusLabel(row.status))}</span>
    </div>`;
  }

  function resolveNotificationRoute(validate=false){
    const preset=document.getElementById('notificationRoutePreset')?.value||'';
    const detail=document.getElementById('notificationRouteDetail')?.value.trim()||'';
    const custom=document.getElementById('notificationCustomRoute')?.value.trim()||'';

    if(preset==='__talk_post__'){
      if(validate&&!detail)throw new Error('TALK 게시글 ID를 입력해주세요.');
      return detail?'/(tabs)/talk?postId='+encodeURIComponent(detail):null;
    }
    if(preset==='__shop__'){
      if(validate&&!detail)throw new Error('카드샵 ID를 입력해주세요.');
      return detail?'/shop/'+encodeURIComponent(detail):null;
    }
    if(preset==='__custom__'){
      if(validate&&!custom)throw new Error('직접 입력할 앱 경로를 입력해주세요.');
      if(validate&&custom&&!custom.startsWith('/'))throw new Error('직접 입력 경로는 / 로 시작해야 합니다.');
      return custom||null;
    }
    return preset||null;
  }

  function bind(){
    const title=document.getElementById('notificationTitle');
    const body=document.getElementById('notificationBody');
    const category=document.getElementById('notificationCategory');
    const target=document.getElementById('notificationTarget');
    const userWrap=document.getElementById('notificationUserIdsWrap');
    const routePreset=document.getElementById('notificationRoutePreset');
    const routeDetailWrap=document.getElementById('notificationRouteDetailWrap');
    const routeDetailLabel=document.getElementById('notificationRouteDetailLabel');
    const routeDetail=document.getElementById('notificationRouteDetail');
    const customRouteWrap=document.getElementById('notificationCustomRouteWrap');
    const customRoute=document.getElementById('notificationCustomRoute');
    const resolvedRoute=document.getElementById('notificationResolvedRoute');
    const url=document.getElementById('notificationUrl');
    const urlHint=document.getElementById('notificationUrlHint');
    const autoGuideBtn=document.getElementById('notificationAutoGuideBtn');
    const autoModal=document.getElementById('notificationAutoModal');
    const autoClose=document.getElementById('notificationAutoClose');

    const preview=()=>{
      const label=CATEGORIES.find(x=>x[0]===category.value)?.[1]||category.value;
      const targetLabel=target.value==='all'?'전체 회원':target.value==='self'?'관리자 본인':'특정 회원';
      const route=resolveNotificationRoute(false);
      const destination=route?' · 이동: '+route:(url.value.trim()?' · 웹: '+url.value.trim():' · 이동 없음');
      document.getElementById('notificationPreviewTitle').textContent=title.value.trim()||'알림 제목';
      document.getElementById('notificationPreviewBody').textContent=body.value.trim()||'알림 내용을 입력하면 여기에 표시됩니다.';
      document.getElementById('notificationPreviewMeta').textContent=label+' · '+targetLabel+destination;
      userWrap.hidden=target.value!=='user_ids';
    };

    const syncRoute=()=>{
      const preset=routePreset.value;
      const talkPost=preset==='__talk_post__';
      const shopDetail=preset==='__shop__';
      routeDetailWrap.hidden=!(talkPost||shopDetail);
      customRouteWrap.hidden=preset!=='__custom__';

      if(talkPost){
        routeDetailLabel.textContent='TALK 게시글 ID';
        routeDetail.placeholder='게시글 ID 입력';
      }else if(shopDetail){
        routeDetailLabel.textContent='카드샵 ID';
        routeDetail.placeholder='예: SHOP-...';
      }

      const hasAppRoute=!!preset;
      url.disabled=hasAppRoute;
      if(hasAppRoute)url.value='';
      urlHint.textContent=hasAppRoute
        ?'앱 이동 화면을 사용하므로 웹 URL은 비활성화됩니다.'
        :'앱 이동 화면을 선택하지 않았을 때 사용합니다.';

      const route=resolveNotificationRoute(false);
      resolvedRoute.textContent=route?'최종 앱 경로: '+route:'앱 이동 없음';
      preview();
    };

    [title,body,category,target].forEach(el=>el.addEventListener(el.tagName==='SELECT'?'change':'input',preview));
    routePreset.addEventListener('change',()=>{
      routeDetail.value='';
      customRoute.value='';
      syncRoute();
    });
    routeDetail.addEventListener('input',syncRoute);
    customRoute.addEventListener('input',syncRoute);
    url.addEventListener('input',preview);

    const closeAutoModal=()=>{
      if(!autoModal||autoModal.hidden)return;
      autoModal.hidden=true;
      document.body.style.overflow=autoModal.dataset.prevOverflow||'';
    };
    const openAutoModal=()=>{
      if(!autoModal)return;
      autoModal.dataset.prevOverflow=document.body.style.overflow||'';
      autoModal.hidden=false;
      document.body.style.overflow='hidden';
      autoModal.focus();
    };
    autoGuideBtn?.addEventListener('click',openAutoModal);
    autoClose?.addEventListener('click',closeAutoModal);
    autoModal?.addEventListener('click',e=>{if(e.target===autoModal)closeAutoModal()});
    autoModal?.addEventListener('keydown',e=>{if(e.key==='Escape')closeAutoModal()});

    syncRoute();

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
    const route=resolveNotificationRoute(true);
    const url=document.getElementById('notificationUrl').value.trim()||null;
    const schedule=document.getElementById('notificationSchedule').value;
    const userIds=(document.getElementById('notificationUserIds')?.value||'').split(/[\s,]+/).map(x=>x.trim()).filter(Boolean);

    if(route&&url)throw new Error('앱 이동 화면과 웹 URL은 동시에 사용할 수 없습니다.');
    if(url&&!/^https?:\/\//i.test(url))throw new Error('웹 URL은 http:// 또는 https:// 로 시작해야 합니다.');
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

    const destination=payload.route?'앱 '+payload.route:(payload.url?'웹 '+payload.url:'이동 없음');
    if(test){
      if(!confirm('현재 관리자 계정의 FUNY PIN DEV 앱으로 테스트 알림을 보낼까요?\n\n이동: '+destination))return;
    }else{
      const targetLabel=payload.target_type==='all'?'전체 회원':payload.target_type==='self'?'관리자 본인':'특정 회원 '+payload.user_ids.length+'명';
      const timing=payload.scheduled_at?'예약 '+new Date(payload.scheduled_at).toLocaleString('ko-KR'):'즉시';
      if(!confirm('최종 발송 전 확인\n\n대상: '+targetLabel+'\n시점: '+timing+'\n이동: '+destination+'\n제목: '+payload.title+'\n\n발송을 진행할까요?'))return;
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