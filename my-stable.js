/* FUNY PIN stable MY for general users */
(async()=>{
  'use strict';
  const A=window.FUNY_WEB_AUTH;
  const root=document.getElementById('root');
  const toast=document.getElementById('myToast');
  if(!A||!root)return;
  if(A.isAppShell()){location.replace('/');return}
  await A.init();
  if(!A.session){A.goLogin('/my.html');return}

  const user=A.session.user;
  const en=localStorage.getItem('funy-pin-lang')==='en';
  let isTester=false;
  try{const {data}=await A.client.rpc('is_my_feature_tester');isTester=data===true}catch(_){isTester=false}

  const T={
    activity:en?'My activity':'내 활동',reward:en?'Rewards & Collection':'리워드 & 컬렉션',settings:en?'Settings':'설정',support:en?'Support':'고객지원',joined:en?'Joined':'가입일',
    community:en?'Post management':'게시글 관리',communitySub:en?'Manage posts, comments, and liked posts':'작성 게시글 · 댓글 · 좋아요한 게시물',
    market:en?'Trade listings':'거래 매물 관리',marketSub:en?'Manage active and inactive listings':'판매중 · 비노출/종료 매물 관리',
    favorites:en?'Favorites':'관심 목록',favoritesSub:en?'Manage saved card shops and items':'관심 카드샵과 저장한 항목 확인',
    coin:en?'FUNY Coin':'퍼니코인',coinSub:en?'Balance, expiring coins, and transaction history':'보유 코인 · 소멸 예정 · 적립/사용 내역',
    ranking:en?'Ranking':'랭킹',rankingSub:en?'Check-in, card-shop visits, and FUNY MON ranking':'출석 · 카드샵 방문 · 퍼니몬 포획 랭킹',
    badges:en?'Badges':'배지',badgesSub:en?'Collect badges earned from missions and activities':'미션과 활동으로 획득한 배지 컬렉션',
    mon:en?'FUNY MON Collection':'퍼니몬 도감',monSub:en?'See your captured FUNY MON collection':'포획한 퍼니몬 컬렉션',
    entries:en?'Entries':'응모 내역',entriesSub:en?'View events and entries you joined':'참여한 이벤트와 응모 내역',coupons:en?'Coupons':'쿠폰함',couponsSub:en?'Check your issued coupons':'발급받은 쿠폰을 확인하세요',
    language:en?'Language':'언어',security:en?'Account security':'계정 보안',blocked:en?'Blocked Users':'차단한 사용자',notice:en?'Notices':'공지사항',faq:en?'FAQ':'자주 묻는 질문',inquiry:en?'Support':'온라인 문의',survey:en?'Service Survey':'서비스 만족도 조사',shopRequest:en?'Add / Update Shop':'매장 등록 · 정보 수정 요청',partner:en?'Advertising & Partnerships':'광고 · 제휴 문의',
    logout:en?'Log out':'로그아웃',loggingOut:en?'Signing out…':'처리 중…',deleteAccount:en?'Delete account':'계정 삭제',deleting:en?'Deleting…':'삭제 중…',terms:en?'Terms of Service':'이용약관',privacy:en?'Privacy Policy':'개인정보처리방침',guidelines:en?'Community Guidelines':'커뮤니티 운영정책',coming:en?'COMING':'준비중'
  };
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const date=value=>{if(!value)return'-';const d=new Date(value);if(Number.isNaN(d.getTime()))return'-';return d.toLocaleDateString(en?'en-US':'ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'}).replace(/\. /g,'.').replace(/\.$/,'')};
  const [{data:profile},{data:wallet}]=await Promise.all([
    A.client.from('profiles').select('nickname,avatar_url,created_at').eq('user_id',user.id).maybeSingle(),
    A.client.from('funy_coin_wallets').select('balance').eq('user_id',user.id).maybeSingle()
  ]);
  const name=profile?.nickname||user.user_metadata?.nickname||user.user_metadata?.name||'FUNY 회원';
  const avatar=profile?.avatar_url||user.user_metadata?.avatar_url||user.user_metadata?.picture||'';
  const joined=profile?.created_at||user.created_at||null;
  const coinBalance=Number(wallet?.balance||0);

  root.innerHTML=`
    <section class="card profile-card">
      <div class="avatar">${avatar?`<img src="${esc(avatar)}" alt="">`:`<img class="default-profile-icon" src="/assets/profile/default-profile.svg?v=20261018-neutral1" alt="">`}</div>
      <div class="profile-copy"><div class="profile-name-row"><div class="profile-name">${esc(name)}</div><a class="profile-edit-inline" href="/my-profile.html">${en?'Edit profile':'프로필 편집'}</a></div><div class="profile-sub">${T.joined} ${esc(date(joined))}</div><div class="profile-coin">FUNY COIN ${coinBalance.toLocaleString(en?'en-US':'ko-KR')}</div></div>
    </section>
    <section class="section"><div class="section-head"><h2>${T.activity}</h2></div><div class="card menu-card">
      <a class="menu-row" href="/my-community.html"><span class="menu-icon">💬</span><span class="menu-copy"><b>${T.community}</b><span>${T.communitySub}</span></span><span class="chev">›</span></a>
      <a class="menu-row" href="/my-market.html"><span class="menu-icon">🃏</span><span class="menu-copy"><b>${T.market}</b><span>${T.marketSub}</span></span><span class="chev">›</span></a>
      <a class="menu-row" href="/my-favorites.html"><span class="menu-icon">⭐</span><span class="menu-copy"><b>${T.favorites}</b><span>${T.favoritesSub}</span></span><span class="chev">›</span></a>
    </div></section>
    <section class="section"><div class="section-head"><h2>${T.reward}</h2></div><div class="card menu-card">
      <a class="menu-row" href="${isTester?'/my-funy-coin.html':'#'}" data-coming="${isTester?'0':'1'}"><span class="menu-icon">🪙</span><span class="menu-copy"><b>${T.coin} <span class="coming-badge">${T.coming}</span></b><span>${T.coinSub}</span></span><span class="chev">›</span></a>
      <a class="menu-row" href="${isTester?'/ranking.html':'#'}" data-coming="${isTester?'0':'1'}"><span class="menu-icon">🏆</span><span class="menu-copy"><b>${T.ranking} <span class="coming-badge">${T.coming}</span></b><span>${T.rankingSub}</span></span><span class="chev">›</span></a>
      <a class="menu-row" href="${isTester?'/my-badges.html':'#'}" data-coming="${isTester?'0':'1'}"><span class="menu-icon">🎖️</span><span class="menu-copy"><b>${T.badges} <span class="coming-badge">${T.coming}</span></b><span>${T.badgesSub}</span></span><span class="chev">›</span></a>
      <a class="menu-row" href="/my-funymon.html"><span class="menu-icon">👾</span><span class="menu-copy"><b>${T.mon}</b><span>${T.monSub}</span></span><span class="chev">›</span></a>
      <a class="menu-row" href="/my-entries.html"><span class="menu-icon">🎟️</span><span class="menu-copy"><b>${T.entries}</b><span>${T.entriesSub}</span></span><span class="chev">›</span></a>
      <a class="menu-row" href="/my-coupons.html"><span class="menu-icon">🎫</span><span class="menu-copy"><b>${T.coupons}</b><span>${T.couponsSub}</span></span><span class="chev">›</span></a>
    </div></section>
    <section class="section"><div class="section-head"><h2>${T.settings}</h2></div><div class="card test-settings-card">
      <div class="test-setting-row test-setting-language"><span class="menu-icon">🌐</span><span class="menu-copy"><b>${T.language}</b><span>${en?'Change the display language':'서비스 표시 언어를 변경해요'}</span></span><div class="test-language-toggle"><button class="test-language-option ${!en?'is-on':''}" data-lang="ko" type="button">한국어</button><button class="test-language-option ${en?'is-on':''}" data-lang="en" type="button">EN</button></div></div>
      <a class="test-setting-row" href="/my-security.html?v=20261018-sms3"><span class="menu-icon">🔐</span><span class="menu-copy"><b>${T.security}</b><span>${en?'Manage login and account security':'로그인 및 계정 보안 설정을 관리해요'}</span></span><span class="chev">›</span></a>
      <a class="test-setting-row" href="/my-blocked-users.html"><span class="menu-icon">🚫</span><span class="menu-copy"><b>${T.blocked}</b><span>${en?'Manage blocked users in FUNY TALK':'FUNY TALK 차단 목록을 관리해요'}</span></span><span class="chev">›</span></a>
    </div></section>
    <section class="section"><div class="section-head"><h2>${T.support}</h2></div><div class="card test-support-card">
      <a class="test-support-row" href="/notice.html"><span class="test-support-label">${T.notice}</span><span class="chev">›</span></a><a class="test-support-row" href="/faq.html"><span class="test-support-label">${T.faq}</span><span class="chev">›</span></a><a class="test-support-row" href="/support.html"><span class="test-support-label">${T.inquiry}</span><span class="chev">›</span></a><a class="test-support-row" href="/feedback.html"><span class="test-support-label">${T.survey}</span><span class="chev">›</span></a><a class="test-support-row" href="/shop-request.html"><span class="test-support-label">${T.shopRequest}</span><span class="chev">›</span></a><a class="test-support-row" href="/partner.html"><span class="test-support-label">${T.partner}</span><span class="chev">›</span></a>
    </div></section>
    <div class="test-account-actions"><button id="logout" class="test-logout-button" type="button">${T.logout}</button><button id="deleteAccount" class="test-delete-button" type="button">${T.deleteAccount}</button><div id="myMessage" class="test-message"></div></div>
    <div class="test-legal-links"><a href="/terms.html">${T.terms}</a><span class="test-legal-divider">·</span><a href="/privacy.html">${T.privacy}</a><span class="test-legal-divider">·</span><a href="/community-guidelines.html">${T.guidelines}</a></div>`;

  document.querySelectorAll('[data-coming="1"]').forEach(anchor=>anchor.addEventListener('click',event=>{event.preventDefault();toast.textContent=en?'This feature is coming soon.':'준비중인 기능입니다.';toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),1600)}));
  document.querySelectorAll('[data-lang]').forEach(button=>button.addEventListener('click',()=>{const next=button.dataset.lang==='en'?'en':'ko';if(next===(en?'en':'ko'))return;localStorage.setItem('funy-pin-lang',next);location.reload()}));

  const logout=document.getElementById('logout'),del=document.getElementById('deleteAccount'),message=document.getElementById('myMessage');
  logout.onclick=async()=>{if(logout.disabled||del.disabled)return;if(!confirm(en?'Log out of FUNY PIN?\n\nYour saved activity remains in your account.':'로그아웃할까요?\n\n로그아웃해도 저장된 관심 매장과 활동 내역은 계정에 유지돼요.'))return;logout.disabled=true;del.disabled=true;logout.textContent=T.loggingOut;try{await A.signOut();location.replace('/')}catch(_){message.textContent=en?'Could not log out.':'로그아웃에 실패했습니다.';logout.disabled=false;del.disabled=false;logout.textContent=T.logout}};
  del.onclick=async()=>{if(logout.disabled||del.disabled)return;if(!confirm(en?'Delete your account? This cannot be undone.':'계정을 삭제할까요?\n계정과 프로필, 관심 매장 등 계정에 연결된 정보가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.'))return;logout.disabled=true;del.disabled=true;del.textContent=T.deleting;try{const {data,error}=await A.client.functions.invoke('delete-account',{body:{}});if(error)throw error;if(data&&data.ok===false)throw new Error(data.message||'delete_failed');try{await A.client.auth.signOut({scope:'local'})}catch(_){}location.replace('/')}catch(_){message.textContent=en?'Could not delete the account.':'계정 삭제에 실패했습니다.';logout.disabled=false;del.disabled=false;del.textContent=T.deleteAccount}};
})().catch(error=>{const root=document.getElementById('root');if(root)root.innerHTML=`<div class="error"><strong>불러오지 못했어요</strong>${String(error?.message||error)}</div>`});
