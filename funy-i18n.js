/* FUNY PIN global i18n: ko/en */
(function(){
  const KEY='funy-pin-lang';
  const supported=['ko','en'];
  const stored=localStorage.getItem(KEY);
  let lang=supported.includes(stored)?stored:'ko';
  const path=location.pathname||'/';
  const isHome=/(^|\/)(index\.html)?$/.test(path);
  const NAV_PNG={home:{active:'/assets/nav-icons-final-v2/funypin_nav_home_on.png?v=20261013-nav-unify',inactive:'/assets/nav-icons-final-v2/funypin_nav_home_off.png?v=20261013-nav-unify'},map:{active:'/assets/nav-icons-final-v2/funypin_nav_map_on.png?v=20261013-nav-unify',inactive:'/assets/nav-icons-final-v2/funypin_nav_map_off.png?v=20261013-nav-unify'},pick:{active:'/assets/nav-icons-final-v2/funypin_nav_pick_on.png?v=20261013-nav-unify',inactive:'/assets/nav-icons-final-v2/funypin_nav_pick_off.png?v=20261013-nav-unify'},talk:{active:'/assets/nav-icons-final-v2/funypin_nav_talk_on.png?v=20261013-nav-unify',inactive:'/assets/nav-icons-final-v2/funypin_nav_talk_off.png?v=20261013-nav-unify'}};
  function applyPngNavIcons(){
    const nav=document.querySelector('.portal-bottom-nav,.shops-bottom-nav');if(!nav)return;
    nav.querySelectorAll('a').forEach(a=>{const h=(a.getAttribute('href')||'').split('?')[0].replace(/^\.\//,'');let k=h==='shops.html'?'map':h==='reviews.html'?'pick':h==='talk.html'?'talk':(h===''||h==='index.html'||h==='/')?'home':null;if(!k)return;let img=a.querySelector('img.nav-icon');if(!img){img=document.createElement('img');img.className='nav-icon';img.alt='';img.setAttribute('aria-hidden','true');a.prepend(img)}img.dataset.navIcon=k;img.src=NAV_PNG[k][a.classList.contains('active')?'active':'inactive'];});
  }

  document.documentElement.lang=lang;
  document.body&&document.body.classList.toggle('funy-lang-home',isHome);

  const textMap={
'다가오는 TCG 일정':{en:'Upcoming TCG Events'},
'더보기 메뉴':{en:'More menu'},'서비스 메뉴':{en:'Service menu'},'자주 묻는 질문':{en:'FAQ'},'서비스 만족도 조사':{en:'Service Survey'},'매장 등록 · 정보 수정 요청':{en:'Add / Update Shop'},'광고 · 제휴 문의':{en:'Advertising & Partnerships'},
'FUNY PIN은 현재 베타 서비스입니다.':{en:'FUNY PIN is currently in beta.'},'카드샵 정보는 계속 업데이트 중이에요.':{en:'Card shop information is continuously updated.'},'안내 닫기':{en:'Close notice'},'FUNY PIN BETA 서비스 안내':{en:'FUNY PIN BETA Notice'},
'FUNY PIN은 현재 BETA 서비스로 운영 중입니다.':{en:'FUNY PIN is currently operating as a BETA service.'},'카드샵 데이터는 지속적으로 업데이트하고 있으며, 일부 정보는 실제 매장 정보와 다를 수 있습니다.':{en:'Card shop data is continuously updated, and some information may differ from the actual shop.'},'이용 중 발견한 오류나 잘못된 정보, 개선 의견이 있다면 편하게 제보해주세요 :)':{en:'If you find an error or have a suggestion, please let us know :)'},
'카드샵 추천':{en:'Recommended Card Shops'},'TCG MAP에서 카드샵 찾아보기':{en:'Find card shops on TCG MAP'},'카드샵 소식':{en:'Card Shop News'},'링크 모음':{en:'Links'},'실시간으로 정보 공유해요!':{en:'Share card shop updates in real time!'},'LIVE PIN 열기':{en:'Open LIVE PIN'},'새 글':{en:'New'},'하단 메뉴':{en:'Bottom navigation'},
'카드샵 이름 또는 지역으로 검색':{en:'Search by shop name or area'},'검색어 지우기':{en:'Clear search'},'매장 위치를 불러오는 중...':{en:'Loading shop locations...'},'카드를 눌러 상세정보 보기':{en:'Tap a card to view details'},'매장 등록 및 정보 수정 요청':{en:'Add or update a shop'},'새로운 카드샵 또는 변경된 정보를 알려주세요':{en:'Tell us about a new shop or updated information'},'조건에 맞는 카드샵이 없습니다.':{en:'No card shops match these filters.'},'뒤로가기':{en:'Back'},'공유':{en:'Share'},
'💡 정보':{en:'💡 INFO'},'📅 일정':{en:'📅 EVENTS'},'📝 깽퐌커플 리뷰':{en:'📝 FFUNNYGGANG REVIEWS'},'추천 배너':{en:'Featured banner'},'광고주 모집중':{en:'Advertising Available'},'깽퐌커플 TCG 정보':{en:'FFUNNYGGANG TCG Info'},'📅 다가오는 TCG 일정':{en:'📅 Upcoming TCG Events'},'일정을 불러오는 중입니다.':{en:'Loading events...'},'깽퐌커플 카드샵 리뷰':{en:'FFUNNYGGANG Card Shop Reviews'},
'전체':{en:'All'},'✨ 전체':{en:'✨ All'},'인기':{en:'Popular'},'🔥 인기':{en:'🔥 Popular'},'자유 게시판':{en:'General'},'💬 자유 게시판':{en:'💬 General'},'카드 자랑':{en:'Showcase'},'🃏 카드 자랑':{en:'🃏 Showcase'},'카드깡/카드샵 후기':{en:'Pack / Shop Reviews'},'📍 카드샵 후기':{en:'📍 Shop Reviews'},'정보 공유':{en:'Tips & Info'},'💡 정보 공유':{en:'💡 Tips & Info'},'카드거래':{en:'Trading'},'🤝 카드거래':{en:'🤝 Trading'},'인기 게시글 정렬':{en:'Sort popular posts'},'요즘 인기':{en:'Trending'},'공감 많은':{en:'Most Reactions'},'댓글 많은':{en:'Most Comments'},'최신 이야기를 불러오는 중...':{en:'Loading the latest posts...'},'POKAMO에 글쓰기':{en:'Post on POKAMO'},'+ POKAMO에 글쓰기':{en:'+ Post on POKAMO'},'해당 카테고리의 게시글이 없습니다.':{en:'No posts in this category.'},'게시글을 불러오지 못했습니다.':{en:'Could not load posts.'},'잠시 후 다시 확인해주세요.':{en:'Please try again shortly.'},
'추천순':{en:'Recommended'},'거리순':{en:'Distance'},'영업중':{en:'Open Now'},'싱글카드':{en:'Singles'},'위탁판매':{en:'Consignment'},'무인매장':{en:'Unmanned'},'필터':{en:'Filter'},'영업시간':{en:'Hours'},'주소':{en:'Address'},'방문정보':{en:'Visit Info'},'리뷰':{en:'Reviews'},'가능':{en:'Available'},'불가':{en:'Unavailable'},'운영':{en:'Open'},
'퍼니핀':{en:'FUNY PIN'},'by 깽퐌커플':{en:'by FFUNNYGGANG'},'FUNY PIN 주요 콘텐츠':{en:'FUNY PIN Main Content'},'TCG MAP 바로가기':{en:'Go to TCG MAP'},'PICK 바로가기':{en:'Go to PICK'},'TALK 바로가기':{en:'Go to TALK'},'배너 페이지':{en:'Banner page'},'1번 배너':{en:'Banner 1'},'2번 배너':{en:'Banner 2'},'3번 배너':{en:'Banner 3'},'4번 배너':{en:'Banner 4'},
'TCG 카드샵 네이버 지도':{en:'TCG card shop Naver map'},'일본 TCG 카드샵 Google 지도':{en:'Japan TCG card shop Google map'},
'PICK 콘텐츠':{en:'PICK Content'},'No Rarity 카드가 비싼 이유는?':{en:'Why are No Rarity cards expensive?'},'포켓몬카드 금지카드 수집 가치는 어떨까?':{en:'Are banned Pokémon cards worth collecting?'},
'분 전':{en:'min ago'},'시간 전':{en:'hr ago'},'일 전':{en:'days ago'},'FUNY PIN 테스트 일정':{en:'FUNY PIN Test Event'},'서울 · 캘린더 연동 전 UI 미리보기':{en:'Seoul · Calendar integration UI preview'}
};
  /* WEB_I18N_V2 */
  Object.assign(textMap,{
    '공지사항':{en:'Notices'},'온라인 문의':{en:'Support'},'만족도 조사':{en:'Service Survey'},
    '이용약관':{en:'Terms of Service'},'개인정보처리방침':{en:'Privacy Policy'},'커뮤니티 운영정책':{en:'Community Guidelines'},
    '주요 콘텐츠':{en:'Main Content'},'정보':{en:'INFO'},'일정':{en:'EVENTS'},'깽퐌커플 리뷰':{en:'FFUNNYGGANG Reviews'},
    '다시 보지 않기':{en:"Don't show again"},'닫기':{en:'Close'},'팝업 닫기':{en:'Close popup'},
    '더카드룸 × FUNY PIN 이벤트 안내':{en:'THE CARD ROOM × FUNY PIN Event'},
    '더카드룸 × FUNY PIN 퍼니몬 이벤트 참여 안내':{en:'THE CARD ROOM × FUNY PIN FUNY MON Event'},
    '이벤트':{en:'Event'},'이벤트 기간':{en:'Event Period'},'당첨자 발표':{en:'Winner Announcement'},'경품(총 3명)':{en:'Prizes (3 winners)'},
    '이벤트 참여방법 및 응모':{en:'How to Join'},'인스타그램 팔로우':{en:'Follow on Instagram'},
    '더카드룸 & 깽퐌커플 계정을 모두 팔로우해주세요':{en:'Follow both THE CARD ROOM and FFUNNYGGANG on Instagram.'},
    'tcr_kr 인스타그램 방문하기 ›':{en:'Visit @tcr_kr on Instagram ›'},'깽퐌커플 인스타그램 방문하기 ›':{en:'Visit FFUNNYGGANG on Instagram ›'},
    'FUNY PIN 지도에서 퍼니몬 포획하고\n이벤트 응모!':{en:'Catch a FUNY MON on the FUNY PIN map and enter!'},
    '퍼니몬 포획하고 응모하기':{en:'Catch FUNY MON & Enter'},'내 응모이력 조회하기':{en:'Check My Entries'},
    '@제외 Instagram 아이디 입력':{en:'Enter Instagram ID without @'},'조회':{en:'Search'},'조회중':{en:'Searching'},
    '종합 테스트 | FUNY PIN':{en:'LIVE PIN | FUNY PIN'},'지금 카드샵은?':{en:"What's happening at card shops now?"},
    '오픈런 대기부터 재고·이벤트까지, 카드샵 현황을 실시간으로 공유해보세요.':{en:'Share real-time shop updates, from queues and stock to events.'},
    '전체 위치':{en:'All Locations'},'매장':{en:'Shop'},'재고':{en:'Stock'},'대기':{en:'Queue'},'요청':{en:'Request'},
    '대기 현황':{en:'Queue Status'},'재고 현황':{en:'Stock Status'},'지금도 맞아요':{en:'Still accurate'},'정보가 달라요':{en:'Not accurate'},'신고하기':{en:'Report'},
    '응모':{en:'Entry'},'응모 완료':{en:'Entry Complete'},'응모 내역':{en:'Entries'},'응모 코드':{en:'Entry Code'},
    '관심 매장':{en:'Favorites'},'퍼니몬 도감':{en:'FUNY MON Collection'},'쿠폰함':{en:'Coupons'},'차단한 사용자':{en:'Blocked Users'},
    '서비스 개선 의견 | FUNY PIN':{en:'Service Feedback | FUNY PIN'},'더 나은 FUNY PIN을 만들 수 있도록':{en:'Help us improve FUNY PIN'},'이용 경험과 의견을 들려주세요.':{en:'Tell us about your experience.'},
    '서비스 이용 경험에 얼마나 만족하시나요?':{en:'How satisfied are you with FUNY PIN?'},'아쉬워요':{en:'Not satisfied'},'만족해요':{en:'Satisfied'},
    '불편한점을 알려주세요.':{en:'What was inconvenient?'},'개선할 부분이 있다면 알려주세요.':{en:'What should we improve?'},'답변을 적어주세요.':{en:'Enter your response.'},'제출하기':{en:'Submit'},'제출 중...':{en:'Submitting...'},
    '어떤 요청인가요?':{en:'Request Type'},'신규 매장 등록':{en:'Add New Shop'},'정보 수정 요청':{en:'Update Shop Info'},'매장명':{en:'Shop Name'},'매장 주소':{en:'Shop Address'},
    '네이버지도 URL':{en:'Naver Map URL'},'영업시간':{en:'Business Hours'},'담당자 정보':{en:'Contact Information'},
    '광고 · 제휴 문의':{en:'Advertising & Partnerships'},'캠페인 정보 입력':{en:'Campaign Information'},'문의 유형':{en:'Inquiry Type'},'광고':{en:'Advertising'},'공동구매':{en:'Group Purchase'},'협찬':{en:'Sponsorship'},'제품제공':{en:'Product Support'},
    '온라인 문의':{en:'Support'},'문의 유형':{en:'Inquiry Type'},'서비스 이용':{en:'Service Usage'},'계정':{en:'Account'},'기타':{en:'Other'},'제목':{en:'Subject'},'문의 내용':{en:'Message'},'답변 받을 이메일 (선택)':{en:'Reply Email (Optional)'},'문의 접수':{en:'Submit Inquiry'},'접수 중...':{en:'Submitting...'},
    'FUNY PIN 이용에 궁금한 내용을 확인해보세요.':{en:'Find answers about using FUNY PIN.'},
    'FUNY PIN은 어떤 서비스인가요?':{en:'What is FUNY PIN?'},'카드샵 정보는 어떻게 확인하나요?':{en:'How do I find card shop information?'}
  });

  /* WEB_I18N_V3 */
  Object.assign(textMap,{
    'FUNY PIN의 새로운 소식과 안내를 확인해보세요.':{en:'Check the latest news and updates from FUNY PIN.'},
    'FUNY PIN 이용에 궁금한 내용을 확인해보세요.':{en:'Find answers to common questions about FUNY PIN.'},
    '카드샵 정보가 실제와 달라요.':{en:'The card shop information is incorrect.'},
    '영업시간, 주소, 취급 상품 등 매장 정보는 변경될 수 있어요. 잘못되거나 변경된 정보를 발견하셨다면':{en:'Shop details such as hours, address, and products may change. If you find incorrect or outdated information,'},
    '을 통해 알려주세요.':{en:'please let us know through the form.'},
    '정보 수정 요청하기 ›':{en:'Request an Update ›'},
    '새로운 카드샵을 등록하고 싶어요.':{en:'I want to add a new card shop.'},
    '매장 등록 · 정보 수정 요청 페이지에서 매장명과 주소를 입력해 보내주세요. 확인 후 FUNY PIN 카드샵 정보에 순차적으로 반영합니다.':{en:'Enter the shop name and address on the Add / Update Shop page. After review, the information will be added to FUNY PIN.'},
    '매장 등록 요청하기 ›':{en:'Add a Card Shop ›'},
    '카드샵 정보는 실시간으로 업데이트되나요?':{en:'Is card shop information updated in real time?'},
    '모든 매장 정보가 실시간으로 자동 갱신되는 것은 아닙니다. FUNY PIN은 현재 베타 서비스로, 카드샵 데이터를 계속 확인하고 업데이트하고 있어요. 방문 전에는 매장의 공식 채널에서 최신 영업정보를 함께 확인하는 것을 권장합니다.':{en:'Not all shop information is updated automatically in real time. FUNY PIN is currently in beta and we continue to review and update shop data. Please check the shop’s official channels before visiting.'},
    '일본 카드샵도 볼 수 있나요?':{en:'Can I find card shops in Japan?'},
    '네. TCG MAP의 국가 변경 기능을 이용해 등록된 일본 카드샵도 확인할 수 있습니다. 지역과 매장 데이터는 계속 추가·보완하고 있어요.':{en:'Yes. Use the country selector in TCG MAP to browse registered card shops in Japan. We continue to add and improve regional shop data.'},
    'PICK와 TALK에서는 무엇을 볼 수 있나요?':{en:'What can I find in PICK and TALK?'},
    '에서는 TCG 관련 정보, 일정, 깽퐌커플의 카드샵 방문기를 확인할 수 있고,':{en:'offers TCG information, events, and FFUNNYGGANG card shop visits, while'},
    '에서는 카드 수집 관련 커뮤니티 콘텐츠를 모아볼 수 있습니다.':{en:'offers community content for card collectors.'},
    '광고나 제휴 문의는 어디로 하면 되나요?':{en:'How can I contact FUNY PIN about advertising or partnerships?'},
    'FUNY PIN 내 배너, 카드샵·브랜드 소개 등 광고 및 제휴 문의는 전용 문의 페이지를 이용해주세요.':{en:'For banners, card shop or brand features, and other advertising or partnership inquiries, please use our dedicated inquiry page.'},
    '광고 · 제휴 문의하기 ›':{en:'Advertising & Partnership Inquiry ›'},
    '서비스 오류나 개선 의견을 보내고 싶어요.':{en:'I want to report an issue or suggest an improvement.'},
    '서비스 만족도 조사를 통해 불편했던 점이나 개선 의견을 남겨주세요. 보내주신 의견은 FUNY PIN 개선에 참고합니다.':{en:'Share issues or suggestions through the Service Survey. Your feedback helps us improve FUNY PIN.'},
    '서비스 만족도 조사 ›':{en:'Service Survey ›'},

    '새로운 카드샵을 알려주시거나':{en:'Tell us about a new card shop or'},
    '등록된 매장 정보를 수정 요청해주세요.':{en:'request an update to an existing shop.'},
    '국문명과 영문명이 함께 있다면':{en:'If the shop has both Korean and English names,'},
    '/ 로 구분해주세요.':{en:'separate them with /.'},
    '예) 퍼니카드 / FUNY CARD':{en:'e.g. 퍼니카드 / FUNY CARD'},
    '네이버지도에 표시된 도로명 주소를 입력해주세요':{en:'Enter the road address shown on Naver Map'},
    '네이버지도 공유하기 URL을 붙여넣어주세요':{en:'Paste the Naver Map share URL'},
    '영업하는 요일만 체크하고 시간을 입력해주세요. 체크하지 않거나 시간이 비어 있는 요일은 정기휴무로 처리됩니다.':{en:'Select only the days the shop is open and enter the hours. Unchecked days or days without hours will be treated as regular closing days.'},
    '월':{en:'Mon'},'화':{en:'Tue'},'수':{en:'Wed'},'목':{en:'Thu'},'금':{en:'Fri'},'토':{en:'Sat'},'일':{en:'Sun'},
    '취급 항목':{en:'Shop Features'},'FUNY PIN의 카드샵 필터 항목과 동일하며 여러 개 선택할 수 있어요.':{en:'These match the filters in FUNY PIN. You can select multiple options.'},
    '포켓몬':{en:'Pokémon'},'원피스':{en:'ONE PIECE'},'드래곤볼':{en:'Dragon Ball'},'기타 TCG':{en:'Other TCG'},
    '등급카드':{en:'Graded Cards'},'빈티지카드':{en:'Vintage Cards'},'오리파':{en:'Oripa'},'박스제품':{en:'Booster Boxes'},'낱개팩':{en:'Packs'},'카드용품':{en:'Accessories'},'카드매입':{en:'Buyback'},'등급대행':{en:'Grading Service'},'플레이공간':{en:'Play Space'},'면세':{en:'Tax Free'},
    '공식 홈페이지 URL':{en:'Official Website URL'},'전화번호':{en:'Phone Number'},'매장 연락처':{en:'Shop Contact'},'주차':{en:'Parking'},'미확인':{en:'Unknown'},
    '매장 이미지':{en:'Shop Images'},'매장 로고':{en:'Shop Logo'},'정사각형(1:1) 이미지를 권장해요.':{en:'A square (1:1) image is recommended.'},
    '사진 추가':{en:'Add Photo'},'매장 사진':{en:'Shop Photos'},'최대 5장':{en:'Up to 5 photos'},'상세페이지 매장 사진 영역에 등록할 이미지를 첨부해주세요.':{en:'Upload images to display in the shop photo section.'},
    '추가로 알려주실 내용':{en:'Additional Information'},'수정이 필요한 내용을 알려주세요':{en:'Tell us what needs to be updated'},'그 외 매장 이용에 도움이 되는 정보를 적어주세요.':{en:'Add any other information that may help visitors.'},'현재 정보와 다른 부분을 자세히 적어주세요.':{en:'Describe what differs from the current information.'},
    '요청자 연락처':{en:'Your Contact'},'내용 확인이 필요한 경우에만 연락드려요.':{en:'We will contact you only if we need to verify the request.'},'인스타그램 ID 또는 이메일':{en:'Instagram ID or Email'},
    '제출된 내용은 확인 후 FUNY PIN에 반영됩니다.':{en:'Submitted information will be reviewed before being reflected on FUNY PIN.'},
    '실제 매장 정보와 다르거나 확인이 어려운 경우 반영되지 않을 수 있습니다.':{en:'Information that cannot be verified or differs from the actual shop may not be reflected.'},
    '매장 관계자뿐 아니라 이용자도 자유롭게 제보할 수 있어요.':{en:'Both shop representatives and users are welcome to submit updates.'},
    '개인정보 수집 및 이용에 동의합니다.':{en:'I agree to the collection and use of personal information.'},
    '매장 등록 및 정보 수정 요청 확인을 위해 요청자 연락처를 수집하며, 요청 내용 확인 및 처리 목적으로만 이용합니다.':{en:'We collect your contact information only to verify and process shop registration or update requests.'},
    '요청 보내기':{en:'Submit Request'},'요청 보내는 중...':{en:'Submitting Request...'},'이미지 업로드 중...':{en:'Uploading Image...'},

    'FUNY PIN과 함께할 브랜드와 카드샵의':{en:'We welcome ideas from brands and card shops'},
    '다양한 제안을 기다리고 있어요.':{en:'that want to work with FUNY PIN.'},
    '브랜드 / 업체명':{en:'Brand / Company'},'브랜드 또는 업체명을 입력해 주세요':{en:'Enter the brand or company name'},
    '상품 / 서비스명':{en:'Product / Service'},'제안하실 상품 또는 서비스를 입력해 주세요':{en:'Enter the product or service you would like to propose'},
    '담당자 정보':{en:'Contact Information'},'담당자명':{en:'Contact Name'},'담당자명을 입력해 주세요':{en:'Enter the contact name'},
    '회신 이메일':{en:'Reply Email'},'회신받을 이메일을 입력해 주세요':{en:'Enter the email address for our reply'},'연락처':{en:'Contact'},'전화번호 또는 연락 가능한 채널':{en:'Phone number or other contact channel'},
    '제안서 작성':{en:'Proposal'},'제안 내용':{en:'Proposal Details'},'캠페인 일정, 예산, 희망 광고 영역 등 제안 내용을 자유롭게 작성해 주세요.':{en:'Describe your proposal, including campaign schedule, budget, preferred placements, and other details.'},
    '최대 2,000자까지 작성할 수 있어요.':{en:'Up to 2,000 characters.'},
    '문의 확인 및 회신을 위해 담당자명, 이메일, 연락처를 수집하며 문의 처리 목적으로만 이용합니다.':{en:'We collect the contact name, email, and contact information only to review and respond to your inquiry.'},
    '문의 보내기':{en:'Send Inquiry'},'입력하신 정보는 광고·제휴 문의 확인 및 회신 목적으로 사용됩니다.':{en:'The information you provide will only be used to review and respond to your advertising or partnership inquiry.'},

    '매장명 또는 지역으로 검색':{en:'Search by shop name or area'},'카드샵 또는 자판기 매장명·지역 검색':{en:'Search card shops or vending machines by name or area'},
    '한국':{en:'Korea'},'일본':{en:'Japan'},'카드샵':{en:'Card Shops'},'자판기':{en:'Vending Machines'},'TCG 카드샵':{en:'TCG Card Shops'},'포켓몬 자판기':{en:'Pokémon Vending Machines'},
    '추천 순':{en:'Recommended'},'가까운 순':{en:'Nearest'},'가나다 순':{en:'A–Z'},'가까운 순':{en:'Nearest'},'가나다순':{en:'A–Z'},
    '플레이공간':{en:'Play Space'},

    '게시물 등록':{en:'Create Post'},'등록하기':{en:'Post'},'등록':{en:'Post'},'게시판':{en:'Board'},'제목을 입력해주세요':{en:'Enter a title'},'함께 나누고 싶은 이야기를 적어주세요':{en:'Share your story or question'},'사진 첨부':{en:'Add Photos'},'사진 추가':{en:'Add Photos'},'최대 3장 · 장당 5MB':{en:'Up to 3 photos · 5 MB each'},'등록 중':{en:'Posting...'},

    '※ LIVE PIN은 매일 00시에 초기화됩니다.':{en:'※ LIVE PIN resets every day at 00:00.'},
    '아직 등록된 LIVE PIN이 없어요.':{en:'No LIVE PIN updates yet.'},'현재 카드샵·자판기 현황을 가장 먼저 공유해보세요.':{en:'Be the first to share the latest card shop or vending machine status.'},
    '위치 선택':{en:'Select Location'},'LIVE PIN 등록':{en:'Add LIVE PIN'},'📍 현장 정보 알려주기':{en:'📍 Share On-site Info'},'🙋 정보 요청하기':{en:'🙋 Request Info'},
    '구분':{en:'Location Type'},'카드샵을 불러오는 중...':{en:'Loading card shops...'},'자판기를 불러오는 중...':{en:'Loading vending machines...'},'포켓몬카드 자판기':{en:'Pokémon Vending Machine'},
    '제보 종류':{en:'Update Type'},'요청 종류':{en:'Request Type'},'내용':{en:'Details'},'궁금한 내용':{en:'Question'},
    '현장 상황을 간단히 알려주세요':{en:'Briefly describe the current situation'},'요청에 대한 현장 정보를 알려주세요':{en:'Share an update for this request'},'예: 30주년 박스 재고 있나요?':{en:'e.g. Is the 30th Anniversary box in stock?'},
    '현장 사진':{en:'On-site Photo'},'선택':{en:'Optional'},'사진 추가하기':{en:'Add Photo'},'사진이 있으면 현장 정보를 확인하는 데 도움이 돼요.':{en:'A photo helps others verify the update.'},'사진 삭제':{en:'Remove Photo'},
    '• 같은 기기 연속 제보 제한 · 같은 위치 반복 제보 제한':{en:'• Repeated submissions from the same device or location are limited'},
    '• 허위 정보·광고·부적절한 사진은 신고 가능':{en:'• False information, ads, or inappropriate photos can be reported'},
    '신고 사유를 선택하세요':{en:'Select a report reason'},'잘못된 정보':{en:'Incorrect Information'},'욕설·비방·혐오 표현':{en:'Abusive or Hateful Content'},'광고·홍보·도배':{en:'Ads / Spam'},'부적절한 사진·내용':{en:'Inappropriate Photo / Content'},
    '현장 사진 크게 보기':{en:'View On-site Photo'},'현장 정보 알려주기':{en:'Share On-site Info'},'정보 요청하기':{en:'Request Info'},'등록 중...':{en:'Submitting...'},'사진 업로드 중...':{en:'Uploading Photo...'}
  });

  /* WEB_I18N_V4 */
  Object.assign(textMap,{
    'FUNY PIN은 카드 수집을 좋아하는 분들이':{en:'FUNY PIN is a service for card collectors that brings together'},
    '카드샵 위치와 매장 정보, TCG 정보·일정·방문기, 커뮤니티 콘텐츠':{en:'card shop locations and details, TCG information and events, shop visits, and community content'},
    '를 한곳에서 조금 더 편하게 확인할 수 있도록 깽퐌커플이 직접 만들고 있는 서비스입니다.':{en:'in one convenient place, created and operated by FFUNNYGGANG.'},
    'TCG MAP에서 지도와 매장 리스트를 이용해 확인할 수 있어요. 국가와 취급 항목 등의 필터를 이용하면 원하는 카드샵을 조금 더 쉽게 찾아볼 수 있습니다.':{en:'Use the map and shop list in TCG MAP. Country and shop-feature filters make it easier to find the card shop you want.'},
    '영업시간, 주소, 취급 상품 등 매장 정보는 변경될 수 있어요. 잘못되거나 변경된 정보를 발견하셨다면':{en:'Shop details such as business hours, address, and products may change. If you find incorrect or outdated information,'},
    '매장 등록 · 정보 수정 요청':{en:'Add / Update Shop'},
    'PICK':{en:'PICK'},'TALK':{en:'TALK'},
    '📍 카드샵':{en:'📍 Card Shops'},'🧃 자판기':{en:'🧃 Vending Machines'},'🏪 카드샵':{en:'🏪 Card Shops'},'🏪 매장':{en:'🏪 Shop'},'📦 재고':{en:'📦 Stock'},'👥 대기':{en:'👥 Queue'},'🙋 요청':{en:'🙋 Request'},
    '🇰🇷 한국':{en:'🇰🇷 Korea'},'🇯🇵 일본':{en:'🇯🇵 Japan'},
    '추천순':{en:'Recommended'},'가까운순':{en:'Nearest'},'TCG 카드샵':{en:'TCG Card Shops'},'포켓몬카드 자판기':{en:'Pokémon Vending Machines'},
    '싱글카드':{en:'Singles'},'위탁판매':{en:'Consignment'},'무인매장':{en:'Unmanned Shop'},
    '🏪 매장 현황':{en:'🏪 Shop Status'},'📦 재고 현황':{en:'📦 Stock Status'},'👥 대기 현황':{en:'👥 Queue Status'},
    '⚡ LIVE PIN 등록':{en:'⚡ Add LIVE PIN'},'LIVE PIN 등록':{en:'Add LIVE PIN'},
    '카드샵을 선택해주세요':{en:'Select a card shop'},'자판기를 선택해주세요':{en:'Select a vending machine'},
    '기타 · 등록되지 않은 카드샵':{en:'Other · Unlisted Card Shop'},
    '사진 첨부':{en:'Add Photos'},'게시물 등록은 로그인 후 이용할 수 있어요.':{en:'Please log in to create a post.'},
    '게시물 등록':{en:'Create Post'},'등록하기':{en:'Post'}
  });

  /* WEB_I18N_V5: recent LIVE PIN additions. */
  Object.assign(textMap,{
  "전체 위치": {
    "en": "All Locations"
  },
  "📍 기타": {
    "en": "📍 Other"
  },
  "직접 위치 등록": {
    "en": "Choose a Location"
  },
  "위치명": {
    "en": "Location Name"
  },
  "LIVE PIN은 매일 00시에 초기화됩니다.": {
    "en": "LIVE PIN resets daily at 00:00 Korea time."
  },
  "※ LIVE PIN은 매일 00시에 초기화됩니다.": {
    "en": "※ LIVE PIN resets daily at 00:00 Korea time."
  },
  "제보 내용 보기": {
    "en": "View Update"
  },
  "지금도 맞아요": {
    "en": "Still Accurate"
  },
  "정보가 달라요": {
    "en": "Outdated Information"
  },
  "목록을 불러오지 못했어요. 다시 열어주세요.": {
    "en": "Unable to load locations. Close and reopen this form."
  },
  "직접 위치 지정은 현장 제보에서만 사용할 수 있어요.": {
    "en": "You can choose a location only when sharing an update."
  },
  "카드샵 또는 자판기를 선택해주세요.": {
    "en": "Select a card shop or vending machine."
  },
  "요청 종류를 선택해주세요.": {
    "en": "Select a request type."
  },
  "제보 종류를 선택해주세요.": {
    "en": "Select an update type."
  },
  "내용을 입력해주세요.": {
    "en": "Enter the details."
  },
  "정보 요청이 등록됐어요.": {
    "en": "Your information request has been posted."
  },
  "현장 제보가 등록됐어요.": {
    "en": "Your update has been posted."
  },
  "잠시 후 다시 등록해주세요.\nLIVE PIN은 30초에 한 번 등록할 수 있어요.": {
    "en": "Please try again shortly.\nYou can post a LIVE PIN once every 30 seconds."
  },
  "같은 카드샵의 같은 유형 정보는 5분 후 다시 등록할 수 있어요.": {
    "en": "Wait 5 minutes before posting the same type of update for the same card shop."
  },
  "기기 확인에 실패했어요. 페이지를 새로고침한 뒤 다시 시도해주세요.": {
    "en": "Unable to verify your device. Refresh the page and try again."
  },
  "신고 사유를 선택해주세요.": {
    "en": "Select a report reason."
  },
  "신고가 정상 접수됐어요.": {
    "en": "Your report has been submitted."
  },
  "이미 신고한 LIVE PIN이에요.": {
    "en": "You have already reported this LIVE PIN."
  },
  "신고 접수에 실패했어요.": {
    "en": "Unable to submit your report."
  },
  "사진 압축 실패": {
    "en": "Unable to process the photo."
  },
  "사진 업로드 경로를 받지 못했어요.": {
    "en": "The uploaded photo could not be located."
  },
  "LIVE PIN을 불러오는 중...": {
    "en": "Loading LIVE PIN..."
  }
});

  /* WEB_I18N_V6: FAQ, forms, events, FUNY MON and CMS UI. */
  Object.assign(textMap,{
  "FUNY PIN 이용 방법·자주 묻는 질문": {
    "en": "FUNY PIN Help & FAQ"
  },
  "FUNY PIN 이용에 궁금한 내용을 확인해보세요.": {
    "en": "Find answers to your questions about FUNY PIN."
  },
  "FUNY PIN은 어떤 서비스인가요?": {
    "en": "What is FUNY PIN?"
  },
  "카드샵 정보는 어떻게 확인하나요?": {
    "en": "How can I find card shop details?"
  },
  "카드샵 정보가 실제와 달라요.": {
    "en": "The shop information is incorrect."
  },
  "을 통해 알려주세요.": {
    "en": "to let us know."
  },
  "정보 수정 요청하기 ›": {
    "en": "Request an Update ›"
  },
  "새로운 카드샵을 등록하고 싶어요.": {
    "en": "How can I add a new card shop?"
  },
  "매장 등록 · 정보 수정 요청 페이지에서 매장명과 주소를 입력해 보내주세요. 확인 후 FUNY PIN 카드샵 정보에 순차적으로 반영합니다.": {
    "en": "Submit the shop name and address on the Add / Update Shop page. We will review your request and update FUNY PIN."
  },
  "매장 등록 요청하기 ›": {
    "en": "Add a Shop ›"
  },
  "카드샵 정보는 실시간으로 업데이트되나요?": {
    "en": "Is shop information updated in real time?"
  },
  "모든 매장 정보가 실시간으로 자동 갱신되는 것은 아닙니다. FUNY PIN은 현재 베타 서비스로, 카드샵 데이터를 계속 확인하고 업데이트하고 있어요. 방문 전에는 매장의 공식 채널에서 최신 영업정보를 함께 확인하는 것을 권장합니다.": {
    "en": "Not all shop information updates automatically in real time. FUNY PIN is currently in beta, and we continue to verify and update shop data. Check the shop’s official channels for the latest opening hours before visiting."
  },
  "일본 카드샵도 볼 수 있나요?": {
    "en": "Can I find card shops in Japan?"
  },
  "네. TCG MAP의 국가 변경 기능을 이용해 등록된 일본 카드샵도 확인할 수 있습니다. 지역과 매장 데이터는 계속 추가·보완하고 있어요.": {
    "en": "Yes. Select Japan in TCG MAP to see listed shops. We continue to add and improve shop and area information."
  },
  "PICK와 TALK에서는 무엇을 볼 수 있나요?": {
    "en": "What can I find in PICK and TALK?"
  },
  "에서는 TCG 관련 정보, 일정, 깽퐌커플의 카드샵 방문기를 확인할 수 있고,": {
    "en": "features TCG news, events, and shop visits by FFUNNYGGANG, while"
  },
  "에서는 카드 수집 관련 커뮤니티 콘텐츠를 모아볼 수 있습니다.": {
    "en": "brings together community posts about card collecting."
  },
  "광고나 제휴 문의는 어디로 하면 되나요?": {
    "en": "How can I contact you about advertising or partnerships?"
  },
  "FUNY PIN 내 배너, 카드샵·브랜드 소개 등 광고 및 제휴 문의는 전용 문의 페이지를 이용해주세요.": {
    "en": "Use our partnership inquiry page for advertising, banners, and shop or brand promotions on FUNY PIN."
  },
  "광고 · 제휴 문의하기 ›": {
    "en": "Advertising / Partnerships ›"
  },
  "서비스 오류나 개선 의견을 보내고 싶어요.": {
    "en": "How can I report a problem or share feedback?"
  },
  "서비스 만족도 조사를 통해 불편했던 점이나 개선 의견을 남겨주세요. 보내주신 의견은 FUNY PIN 개선에 참고합니다.": {
    "en": "Share problems and suggestions in our service feedback survey. Your feedback helps us improve FUNY PIN."
  },
  "서비스 만족도 조사 ›": {
    "en": "Share Feedback ›"
  },
  "캠페인 정보 입력": {
    "en": "Campaign Details"
  },
  "광고": {
    "en": "Advertising"
  },
  "공동구매": {
    "en": "Group Purchase"
  },
  "협찬": {
    "en": "Sponsorship"
  },
  "제품제공": {
    "en": "Product Samples"
  },
  "제휴": {
    "en": "Partnership"
  },
  "가능": {
    "en": "Available"
  },
  "불가": {
    "en": "Unavailable"
  },
  "국문명과 영문명이 함께 있다면": {
    "en": "If the shop has Korean and English names,"
  },
  "로 구분해주세요.": {
    "en": "separate them with a slash."
  },
  "예) 퍼니카드 / FUNY CARD": {
    "en": "e.g. 퍼니카드 / FUNY CARD"
  },
  "네이버지도에 표시된 도로명 주소를 입력해주세요": {
    "en": "Enter the street address shown on Naver Maps"
  },
  "네이버지도 공유하기 URL을 붙여넣어주세요": {
    "en": "Paste the Naver Maps share URL"
  },
  "영업하는 요일만 체크하고 시간을 입력해주세요. 체크하지 않거나 시간이 비어 있는 요일은 정기휴무로 처리됩니다.": {
    "en": "Select opening days and enter the hours. Unchecked days or days without hours will be marked as closed."
  },
  "TCG MAP의 카드샵 필터 항목과 동일하며 여러 개 선택할 수 있어요.": {
    "en": "These match the TCG MAP shop filters. You can select multiple options."
  },
  "매장 사진 미리보기": {
    "en": "Shop photo preview"
  },
  "로고 삭제": {
    "en": "Remove Logo"
  },
  "개인정보 수집 및 이용에 동의해주세요.": {
    "en": "Please agree to the collection and use of personal information."
  },
  "매장 등록/정보 수정 요청이 접수되었습니다.": {
    "en": "Your shop registration or update request has been submitted."
  },
  "광고 · 제휴 문의가 접수되었습니다.": {
    "en": "Your advertising or partnership inquiry has been submitted."
  },
  "문의 접수에 실패했습니다. 잠시 후 다시 시도해주세요.": {
    "en": "Unable to submit your inquiry. Please try again shortly."
  },
  "요청을 보내지 못했어요. 잠시 후 다시 시도해주세요.": {
    "en": "Unable to submit your request. Please try again shortly."
  },
  "등록된 공지사항이 없습니다.": {
    "en": "No announcements yet."
  },
  "미완료 응모": {
    "en": "Pending Entries"
  },
  "FUNY MON 이벤트 자세히 보기": {
    "en": "View FUNY MON Event"
  },
  "퍼니몬 출현 중": {
    "en": "FUNY MON Spotted"
  },
  "매장 이벤트": {
    "en": "Shop Event"
  },
  "→ 오른쪽으로 밀어 결과 확인": {
    "en": "→ Swipe right to reveal your reward"
  },
  "이미지 저장": {
    "en": "Save Image"
  },
  "이벤트 응모가 아직 완료되지 않았어요.\n응모를 완료하지 않고 닫을까요?": {
    "en": "Your event entry is incomplete.\nClose without completing it?"
  },
  "이미지를 저장하지 않았어요!\n지금 닫으면 포획 결과 화면이 닫혀요.": {
    "en": "You have not saved the image!\nClosing will dismiss your catch result."
  },
  "퍼니몬 포획 중...": {
    "en": "Catching FUNY MON..."
  },
  "잠시만 기다려주세요": {
    "en": "Please wait"
  },
  "포획 성공!": {
    "en": "Caught!"
  },
  "포획 실패!": {
    "en": "Catch Failed!"
  },
  "당첨 상품 이미지": {
    "en": "Prize image"
  },
  "Instagram 아이디를 정확히 입력해주세요.": {
    "en": "Enter a valid Instagram username."
  },
  "응모 확인 중...": {
    "en": "Checking entry..."
  },
  "오늘 응모 가능 횟수를 모두 사용했어요. 내일 다시 참여해주세요.": {
    "en": "You have reached today’s entry limit. Please try again tomorrow."
  },
  "이벤트 기간 중 응모 가능 횟수를 모두 사용했어요.": {
    "en": "You have reached the entry limit for this event."
  },
  "이미 사용한 응모권이에요.": {
    "en": "This entry ticket has already been used."
  },
  "아직 이벤트 응모 기간이 시작되지 않았어요.": {
    "en": "This event has not opened for entries yet."
  },
  "이벤트 응모 기간이 종료되었거나 현재 응모할 수 없어요.": {
    "en": "Entries are closed or currently unavailable."
  },
  "응모권 정보를 확인하지 못했어요. 퍼니몬을 다시 포획해주세요.": {
    "en": "Unable to verify your entry ticket. Please catch a FUNY MON again."
  },
  "응모 처리 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.": {
    "en": "Unable to process your entry. Please try again shortly."
  },
  "응모 완료": {
    "en": "Entry Complete"
  },
  "꽝": {
    "en": "No Prize"
  },
  "아쉬워요! 다음 기회에 다시 도전해보세요!": {
    "en": "Better luck next time! Try again for another chance."
  },
  "자세히보기": {
    "en": "View Details"
  },
  "이벤트 기간 중 응모 회수 제한 없음(중복 응모 가능)": {
    "en": "Unlimited entries during the event. Repeat entries are allowed."
  },
  "이벤트 기간 중 1회 응모 가능": {
    "en": "One entry during the event."
  },
  "응모권": {
    "en": "Entry Ticket"
  },
  "당첨!": {
    "en": "You Won!"
  },
  "이벤트 응모하기": {
    "en": "Enter Event"
  },
  "당첨 상품": {
    "en": "Prize"
  },
  "이미지 보기": {
    "en": "View Image"
  },
  "Instagram 아이디 입력": {
    "en": "Enter Instagram username"
  },
  "응모": {
    "en": "Enter"
  },
  "당첨 코드": {
    "en": "Prize Code"
  },
  "포획 가능 거리 밖이에요": {
    "en": "You are outside the catch range"
  },
  "오늘 포획 가능 횟수를 모두 사용했어요": {
    "en": "You have reached today’s catch limit"
  },
  "오늘 포획을 완료했어요": {
    "en": "You have already caught one today"
  },
  "내일 다시 도전해주세요.": {
    "en": "Please try again tomorrow."
  },
  "이벤트에 참여할 수 없어요": {
    "en": "This event is unavailable"
  },
  "이벤트가 종료되었거나 현재 운영 중이 아니에요.": {
    "en": "The event has ended or is currently inactive."
  },
  "포획할 수 없는 퍼니몬이에요": {
    "en": "This FUNY MON cannot be caught"
  },
  "이벤트 설정이 변경되었어요. 지도를 새로고침해주세요.": {
    "en": "The event settings have changed. Please refresh the map."
  },
  "카드샵 정보를 확인할 수 없어요": {
    "en": "Unable to verify the card shop"
  },
  "잠시 후 다시 시도해주세요.": {
    "en": "Please try again shortly."
  },
  "포획 정보를 확인하지 못했어요": {
    "en": "Unable to verify the catch"
  },
  "페이지를 새로고침한 뒤 다시 시도해주세요.": {
    "en": "Refresh the page and try again."
  },
  "포획 처리 중 오류가 발생했어요": {
    "en": "Unable to process the catch"
  },
  "아쉽게 놓쳤어요! 다른 퍼니몬을 포획해보세요.": {
    "en": "It got away! Try catching another FUNY MON."
  },
  "퍼니몬을 포획했어요!": {
    "en": "You caught a FUNY MON!"
  },
  "위치 권한이 필요해요": {
    "en": "Location permission required"
  },
  "현재 위치를 확인해야 가까운 FUNY MON을 포획할 수 있어요.": {
    "en": "Allow location access to catch nearby FUNY MON."
  },
  "현재 위치를 확인하지 못했어요": {
    "en": "Unable to find your location"
  },
  "GPS 또는 위치 서비스를 켠 뒤 다시 시도해주세요.": {
    "en": "Turn on GPS or location services and try again."
  },
  "위치 확인 시간이 초과됐어요": {
    "en": "Location request timed out"
  },
  "위치 서비스를 켠 뒤 다시 시도해주세요.": {
    "en": "Turn on location services and try again."
  },
  "이미지 저장이 완료되었습니다.": {
    "en": "Image saved."
  },
  "FUNY MON 이미지": {
    "en": "FUNY MON Image"
  },
  "노말": {
    "en": "Normal"
  },
  "물": {
    "en": "Water"
  },
  "페어리": {
    "en": "Fairy"
  },
  "불": {
    "en": "Fire"
  },
  "풀": {
    "en": "Grass"
  },
  "비행": {
    "en": "Flying"
  },
  "바위": {
    "en": "Rock"
  },
  "고스트": {
    "en": "Ghost"
  },
  "전기": {
    "en": "Electric"
  },
  "코스믹": {
    "en": "Cosmic"
  },
  "악": {
    "en": "Dark"
  },
  "에스퍼": {
    "en": "Psychic"
  },
  "이벤트": {
    "en": "Event"
  },
  "🗓️ 이벤트 기간": {
    "en": "🗓️ Event Period"
  },
  "📢 당첨자 발표": {
    "en": "📢 Winners Announcement"
  },
  "🎁 경품(총 3명)": {
    "en": "🎁 Prizes (3 Winners)"
  },
  "🎁 경품(총 4명)": {
    "en": "🎁 Prizes (4 Winners)"
  },
  "이벤트 참여방법 및 응모": {
    "en": "How to Participate"
  },
  "인스타그램 팔로우": {
    "en": "Follow on Instagram"
  },
  "깽퐌커플 인스타그램 방문하기 ›": {
    "en": "Visit FFUNNYGGANG on Instagram ›"
  },
  "퍼니몬 포획하고 응모하기": {
    "en": "Catch FUNY MON & Enter"
  },
  "내 응모이력 조회하기": {
    "en": "View My Entries"
  },
  "@제외 Instagram 아이디 입력": {
    "en": "Instagram username without @"
  },
  "@ 제외하고 아이디 입력": {
    "en": "Username without @"
  },
  "조회": {
    "en": "Search"
  },
  "조회중": {
    "en": "Searching..."
  },
  "조회 중": {
    "en": "Searching..."
  },
  "이벤트 응모 캠페인 연결 후 조회할 수 있어요.": {
    "en": "Entry history will be available once this campaign is connected."
  },
  "응모이력을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.": {
    "en": "Unable to load your entry history. Please try again shortly."
  },
  "THE CARD ROOM × FUNY PIN 퍼니몬 이벤트": {
    "en": "THE CARD ROOM × FUNY PIN — FUNY MON Event"
  },
  "더카드룸 방문해서": {
    "en": "Visit THE CARD ROOM,"
  },
  "퍼니몬 포획하고, 응모하고 🎯": {
    "en": "catch FUNY MON and enter 🎯"
  },
  "특별한 선물까지! 🎁": {
    "en": "for a chance to win special prizes! 🎁"
  },
  "FUNY PIN 서비스 ‘TCG MAP’에서": {
    "en": "In FUNY PIN’s TCG MAP,"
  },
  "더카드룸 주변의 퍼니몬을 포획하면": {
    "en": "catch a FUNY MON near THE CARD ROOM"
  },
  "이벤트에 응모할 수 있어요": {
    "en": "to enter the event."
  },
  "2026년 10월 12일(월) ~ 10월 30일(금) 오후 10시까지": {
    "en": "Oct 12 (Mon) – Oct 30 (Fri), 2026, until 10 PM KST"
  },
  "2026년 10월 31일(토)": {
    "en": "Oct 31 (Sat), 2026"
  },
  "포켓몬카드 일본판 30주년 1BOX(1명)": {
    "en": "Japanese Pokémon TCG 30th Anniversary: 1 box (1 winner)"
  },
  "포켓몬카드 일본판 메가드림ex 1BOX(1명)": {
    "en": "Japanese Pokémon TCG MEGA Dream ex: 1 box (1 winner)"
  },
  "포켓몬카드 북미판 퍼스트파트너 1BOX(1명)": {
    "en": "North American Pokémon TCG First Partner: 1 box (1 winner)"
  },
  "※ 당첨 경품은 더카드룸 매장 방문 수령입니다.": {
    "en": "※ Prizes must be collected in person at THE CARD ROOM."
  },
  "더카드룸 & 깽퐌커플 계정을 모두 팔로우해주세요": {
    "en": "Follow both THE CARD ROOM and FFUNNYGGANG."
  },
  "tcr_kr 인스타그램 방문하기 ›": {
    "en": "Visit tcr_kr on Instagram ›"
  },
  "※ 당첨자의 Instagram 팔로우 여부를 확인하여 조건 미충족시 당첨이 취소될 수 있습니다": {
    "en": "※ Winners’ Instagram follows will be checked. A prize may be revoked if the requirements are not met."
  },
  "FUNY PIN 지도에서 퍼니몬 포획하고": {
    "en": "Catch FUNY MON on the FUNY PIN map"
  },
  "이벤트 응모!": {
    "en": "and enter the event!"
  },
  "• 이벤트 기간 동안 Instagram ID 기준 하루 1회 응모할 수 있어요.": {
    "en": "• One entry per Instagram username per day during the event."
  },
  "• 매일 참여할수록 응모 횟수가 쌓여 당첨 확률이 높아져요.": {
    "en": "• Enter daily to accumulate entries and increase your chance of winning."
  },
  "KOREA TCG FAIR × FUNY PIN 이벤트": {
    "en": "KOREA TCG FAIR × FUNY PIN Event"
  },
  "코티페에서 퍼니몬 잡고": {
    "en": "Catch FUNY MON at KOREA TCG FAIR"
  },
  "이벤트 응모까지! 🎯🎁": {
    "en": "and enter the event! 🎯🎁"
  },
  "코티페 참석해서 FUNY PIN 지도에서": {
    "en": "At KOREA TCG FAIR, use the FUNY PIN map"
  },
  "퍼니몬을 잡아 포획하면 응모할 수 있어요": {
    "en": "to catch FUNY MON and enter the event."
  },
  "2026년 10월 3일(토)": {
    "en": "Oct 3 (Sat), 2026"
  },
  "오전 10시 30분 ~ 오후 5시 30분까지": {
    "en": "10:30 AM – 5:30 PM KST"
  },
  "2026년 10월 3일(토) 오후 6시": {
    "en": "Oct 3 (Sat), 2026, at 6 PM KST"
  },
  "- 포켓몬카드 일본판 100덱 3BOX(각 1BOX 씩 3명)": {
    "en": "- Japanese Pokémon TCG 100 Deck: 3 boxes (1 each for 3 winners)"
  },
  "- 포켓몬카드 한국판 스톰에메랄다 1BOX(1명)": {
    "en": "- Korean Pokémon TCG Storm Emeralda: 1 box (1 winner)"
  },
  "※ 본 이벤트 경품은 행사 당일 현장에서 제공됩니다": {
    "en": "※ Prizes are provided at the venue on the event day."
  },
  "코티페 & 깽퐌커플 계정을 모두 팔로우해주세요": {
    "en": "Follow both KOREA TCG FAIR and FFUNNYGGANG."
  },
  "KTF.official 인스타그램 방문하기 ›": {
    "en": "Visit KTF.official on Instagram ›"
  },
  "퍼니몬은 별도의 자리 이동 없이": {
    "en": "You can find FUNY MON without changing seats"
  },
  "FUNY PIN 지도에서 찾으실 수 있어요!": {
    "en": "on the FUNY PIN map!"
  },
  "※ Instagram 아이디 기준 1인 1회 참여 가능합니다": {
    "en": "※ One entry per person, based on Instagram username."
  },
  "FUNY PIN × 카드볼트 한가위 이벤트": {
    "en": "FUNY PIN × CARDVAULT Chuseok Event"
  },
  "카드볼트 이벤트": {
    "en": "CARDVAULT Event"
  },
  "한가위 카드볼트": {
    "en": "Celebrate Chuseok at CARDVAULT"
  },
  "방문 인증 이벤트 🌕 🐰": {
    "en": "Visit & Enter Event 🌕 🐰"
  },
  "카드볼트에 방문하고 FUNY PIN으로 인증하면": {
    "en": "Visit CARDVAULT and verify your visit with FUNY PIN"
  },
  "한가위 이벤트에 응모할 수 있어요": {
    "en": "to enter the Chuseok event."
  },
  "2026년 9월 22일(화) ~ 9월 27일(일) 오후 10시까지": {
    "en": "Sep 22 (Tue) – Sep 27 (Sun), 2026, until 10 PM KST"
  },
  "2026년 9월 28일(월)": {
    "en": "Sep 28 (Mon), 2026"
  },
  "- 포켓몬 퍼스트파트너 시리즈1 1BOX(1명)": {
    "en": "- Pokémon First Partner Series 1: 1 box (1 winner)"
  },
  "- 유미의 세포들 콜렉션 카드 1BOX(1명)": {
    "en": "- Yumi’s Cells Collection Cards: 1 box (1 winner)"
  },
  "- 캐치 티니핑 콜렉션 카드 1BOX(1명)": {
    "en": "- Catch! Teenieping Collection Cards: 1 box (1 winner)"
  },
  "※ 본 이벤트 경품은 카드볼트 매장에서 직접 수령만 가능합니다": {
    "en": "※ Prizes must be collected in person at CARDVAULT."
  },
  "경품 안내": {
    "en": "Prize Details"
  },
  "카드볼트 매장 방문 및 방문 인증": {
    "en": "Visit CARDVAULT & Verify Your Visit"
  },
  "매장에 비치된 이벤트 QR코드를 스캔해주세요": {
    "en": "Scan the event QR code displayed in the shop."
  },
  "방문 인증하기": {
    "en": "Verify Visit"
  },
  "깽퐌커플 & 카드볼트 계정을 모두 팔로우해주세요": {
    "en": "Follow both FFUNNYGGANG and CARDVAULT."
  },
  "카드볼트 인스타그램 방문하기 ›": {
    "en": "Visit CARDVAULT on Instagram ›"
  },
  "깽퐌커플 & 카드볼트 계정을 모두 팔로우했습니다": {
    "en": "I follow both FFUNNYGGANG and CARDVAULT."
  },
  "이벤트 응모": {
    "en": "Event Entry"
  },
  "인스타그램 아이디를 입력하고 이벤트에 응모하세요": {
    "en": "Enter your Instagram username to join the event."
  },
  "※ 인스타그램 아이디 기준 1인 1회 참여 가능합니다": {
    "en": "※ One entry per person, based on Instagram username."
  },
  "※ 당첨자 선정 시 방문 인증 및 두 계정의 팔로우 여부를 확인하며 조건 미충족 시 당첨이 취소될 수 있습니다": {
    "en": "※ Visit verification and both Instagram follows will be checked. A prize may be revoked if the requirements are not met."
  },
  "응모가 완료됐어요!": {
    "en": "Your entry is complete!"
  },
  "9월 28일(월) 당첨자 발표를 확인해주세요": {
    "en": "Check the winners announcement on Sep 28 (Mon)."
  },
  "FUNY PIN X CARDVAULT 이벤트에 참여해주셔서 감사합니다 💜": {
    "en": "Thank you for joining the FUNY PIN × CARDVAULT event 💜"
  },
  "이벤트 게시물에 응모 완료 댓글 남기러가기 >": {
    "en": "Leave a comment on the event post >"
  },
  "FUNY PIN × CARDVAULT 이벤트 경품 안내": {
    "en": "FUNY PIN × CARDVAULT Prize Details"
  },
  "카드볼트 방문 인증": {
    "en": "Verify Your CARDVAULT Visit"
  },
  "매장에 비치된 FUNY PIN QR코드를 화면 안에 맞춰주세요": {
    "en": "Place the shop’s FUNY PIN QR code inside the frame."
  },
  "QR 인증이 어려우신가요? 직원 인증 코드 사용": {
    "en": "Having trouble scanning? Use a staff verification code"
  },
  "6자리 코드": {
    "en": "6-digit code"
  },
  "인증": {
    "en": "Verify"
  },
  "방문 인증 완료": {
    "en": "Visit Verified"
  },
  "카메라를 열 수 없어요. 브라우저 카메라 권한을 확인해주세요.": {
    "en": "Unable to open the camera. Check your browser’s camera permission."
  },
  "이벤트용 QR코드가 아니에요": {
    "en": "This is not an event QR code."
  },
  "인증 코드를 다시 확인해주세요.": {
    "en": "Please check the verification code."
  },
  "인스타그램 아이디를 정확히 입력해주세요.": {
    "en": "Enter a valid Instagram username."
  },
  "해당 아이디의 응모이력이 없습니다": {
    "en": "No entries found for this username."
  },
  "응모이력을 불러오지 못했어요. 잠시 후 다시 시도해주세요.": {
    "en": "Unable to load your entry history. Please try again shortly."
  },
  "먼저 카드볼트 방문 인증을 완료해주세요.": {
    "en": "Verify your CARDVAULT visit first."
  },
  "깽퐌커플과 카드볼트 두 계정 모두 팔로우 후 확인에 체크해주세요.": {
    "en": "Follow both FFUNNYGGANG and CARDVAULT, then select the confirmation checkbox."
  },
  "이미 이 이벤트에 응모했어요.": {
    "en": "You have already entered this event."
  },
  "현재 이벤트 응모 기간이 아닙니다.": {
    "en": "This event is not currently accepting entries."
  },
  "이미 응모한 인스타그램 아이디입니다.": {
    "en": "This Instagram username has already entered."
  },
  "응모 중...": {
    "en": "Submitting entry..."
  },
  "추천 카드샵": {
    "en": "Recommended Card Shops"
  },
  "카드샵 소식": {
    "en": "Shop Updates"
  },
  "링크 모음": {
    "en": "Useful Links"
  },
  "다가오는 TCG 일정": {
    "en": "Upcoming TCG Events"
  },
  "등록된 일정이 없습니다.": {
    "en": "No events listed yet."
  },
  "일정": {
    "en": "Events"
  },
  "월": {
    "en": "Mon"
  },
  "화": {
    "en": "Tue"
  },
  "수": {
    "en": "Wed"
  },
  "목": {
    "en": "Thu"
  },
  "금": {
    "en": "Fri"
  },
  "토": {
    "en": "Sat"
  },
  "일": {
    "en": "Sun"
  },
  "• 제출된 내용은 확인 후 FUNY PIN에 반영됩니다.": {
    "en": "• Submitted information will be reviewed before being added to FUNY PIN."
  },
  "• 실제 매장 정보와 다르거나 확인이 어려운 경우 반영되지 않을 수 있습니다.": {
    "en": "• Information that differs from the actual shop or cannot be verified may not be added."
  },
  "• 매장 관계자뿐 아니라 이용자도 자유롭게 제보할 수 있어요.": {
    "en": "• Both shop representatives and users are welcome to submit updates."
  }
});

  Object.assign(textMap,{"서비스 이용 중 오류, 계정, 카드샵 정보, FUNY TALK 관련 문의를 바로 접수해주세요.":{"en":"Contact us about service errors, your account, shop information, or FUNY TALK."},"확인 후 필요한 경우 입력한 이메일로 답변드립니다.":{"en":"We will review your inquiry and reply to the email provided if needed."},"문의 제목을 입력해주세요":{"en":"Enter an inquiry subject"},"발생 화면, 재현 방법 등을 함께 적어주시면 확인에 도움이 됩니다.":{"en":"Include the affected screen and steps to reproduce the issue."},"문의가 접수되었습니다.":{"en":"Your inquiry has been submitted."},"서비스 개선 의견 | FUNY PIN":{"en":"Service Feedback | FUNY PIN"},"만족도 조사":{"en":"Feedback Survey"},"더 나은 FUNY PIN을 만들 수 있도록":{"en":"Help us improve FUNY PIN."},"이용 경험과 의견을 들려주세요.":{"en":"Tell us about your experience and suggestions."},"서비스 이용 경험에 얼마나 만족하시나요?":{"en":"How satisfied are you with FUNY PIN?"},"아쉬워요":{"en":"Dissatisfied"},"만족해요":{"en":"Satisfied"},"불편한점을 알려주세요.":{"en":"Tell us what was inconvenient."},"개선할 부분이 있다면 알려주세요.":{"en":"What could we improve?"},"답변을 적어주세요.":{"en":"Enter your answer."},"제출하기":{"en":"Submit"},"제출 완료":{"en":"Submitted"},"제출 중...":{"en":"Submitting..."},"이미 의견을 보내주셨어요. 30일 후 다시 참여할 수 있어요.":{"en":"You have already submitted feedback. You can participate again after 30 days."},"서비스 만족도 조사가 접수되었습니다.":{"en":"Your service feedback has been submitted."},"제출하지 못했어요. 잠시 후 다시 시도해 주세요.":{"en":"Unable to submit. Please try again shortly."},"추석 연휴 카드샵 영업시간 안내":{"en":"Card Shop Hours During Chuseok"},"추석 연휴 기간에는 카드샵별 영업시간과 휴무 일정이 평소와 다를 수 있습니다.":{"en":"Shop hours and closing days may differ during the Chuseok holiday."},"FUNY PIN에 등록된 영업정보도 연휴 기간의 임시 운영시간까지 실시간으로 반영되지 않을 수 있으니, 방문 전에는 꼭 해당 카드샵의 공식 SNS나 매장에 직접 확인해주세요.":{"en":"Temporary holiday hours may not appear immediately on FUNY PIN. Check the shop’s official social channels or contact the shop before visiting."},"즐겁고 편안한 추석 연휴 보내시고, FUNY PIN도 앞으로 더 편리하고 좋은 서비스로 보답하겠습니다 💜":{"en":"Have a wonderful Chuseok holiday. We will keep working to make FUNY PIN more useful 💜"},"by 깽퐌커플":{"en":"by FFUNNYGGANG"},"FUNY PIN 서비스 안내":{"en":"About FUNY PIN"},"FUNY PIN은 TCG 카드샵 탐색 및 커뮤니티 서비스를 제공하고 있습니다.":{"en":"FUNY PIN helps you discover TCG card shops and connect with the collecting community."},"카드샵 데이터는 지속적으로 업데이트하고 있으며, 일부 정보는 실제 매장 정보와 다를 수 있습니다.":{"en":"We continuously update shop data. Some details may differ from current shop information."},"이용 중 발견한 오류나 잘못된 정보, 개선 의견이 있다면 편하게 제보해주세요 :)":{"en":"Please let us know about errors, incorrect information, or suggestions :)"},"FUNY PIN 서비스 오픈🎉":{"en":"FUNY PIN Is Live 🎉"},"포켓몬카드를 수집하면서 카드샵을 직접 다니다 보니 “카드샵 정보를 한곳에서 편하게 볼 수 있으면 좋겠다”는 생각으로 시작한 FUNY PIN!":{"en":"FUNY PIN began with an idea while collecting Pokémon cards and visiting shops: “What if all the shop information were in one convenient place?”"},"아직 부족한 부분도 많고 카드샵 데이터도 계속 업데이트 중이지만, 더 미루지 않고 그냥 오픈합니다 😂":{"en":"There is still plenty to improve, and we are updating shop data, but we decided to launch without waiting any longer 😂"},"🗺️ TCG 카드샵 지도":{"en":"🗺️ TCG Card Shop Map"},"🔍 카드샵 검색 & 필터":{"en":"🔍 Shop Search & Filters"},"📍 매장 상세정보":{"en":"📍 Shop Details"},"📝 TCG 소식 • 일정 • 방문 리뷰":{"en":"📝 TCG News • Events • Shop Reviews"},"여러분과 함께 하나씩 채워가는 TCG 서비스로 만들어보겠습니다 💜":{"en":"Let’s build this TCG service together, one step at a time 💜"}});
  textMap['\uB9AC\uD504\uD2B8\uBC14\uC6B4\uB4DC']={en:'Riftbound'};
  function translateDynamic(value){
    const rules=[
      [/^(\d+)건 · 이어서 응모하기$/,m=>m[1]+' pending · Continue entry'],
      [/^이벤트 기간 중 1일 (\d+)회 응모 가능\(중복 응모 가능\)$/,m=>m[1]+' entries per day during the event. Repeat entries are allowed.'],
      [/^이벤트 기간 중 (\d+)회 응모 가능\(중복 응모 가능\)$/,m=>m[1]+' entries during the event. Repeat entries are allowed.'],
      [/^응모 완료! · 오늘 (\d+\/\d+)회 · 누적 (\d+)회$/,m=>'Entry complete! · Today '+m[1]+' · Total '+m[2]],
      [/^응모 완료! · 누적 (\d+(?:\/\d+)?)회$/,m=>'Entry complete! · Total '+m[1]],
      [/^📍 (.+)에서 포획했어요$/,m=>'📍 Caught at '+m[1]],
      [/^현재 위치에서 (.+)까지 약 (\d+)m예요\. 포획 가능 거리는 (\d+)m 이내예요\.$/,m=>'You are about '+m[2]+' m from '+m[1]+'. Catch range: '+m[3]+' m.'],
      [/^이 이벤트에서는 하루 (\d+)회까지 포획할 수 있어요\.$/,m=>'You can catch up to '+m[1]+' per day in this event.'],
      [/^연속 등록 방지를 위해 (\d+)분 후 다시 요청해주세요\.$/,m=>'Please wait '+m[1]+' minutes before submitting another request.'],
      [/^도배 방지를 위해 하루 최대 (\d+)건까지 요청할 수 있어요\.$/,m=>'You can submit up to '+m[1]+' requests per day.'],
      [/^이미지 업로드 중\.\.\. (\d+\/\d+)$/,m=>'Uploading image... '+m[1]],
      [/^요청을 보내지 못했어요\. 잠시 후 다시 시도해주세요\.\n([\s\S]*)$/,m=>'Unable to submit your request. Please try again shortly.\n'+m[1]],
      [/^(.+)에서 도보 (\d+)분$/,m=>m[2]+' min walk from '+m[1]],
      [/^· 총 (\d+)회 응모 완료 🎁$/,m=>'· '+m[1]+' entries complete 🎁'],
      [/^최근 응모 (.+)$/,m=>'Latest entry: '+m[1]],
      [/^· 더카드룸 이벤트 응모이력이 없습니다\.$/,()=> '· No entries found for THE CARD ROOM event.'],
      [/^· 코티페 이벤트 응모이력이 없습니다\.$/,()=> '· No entries found for KOREA TCG FAIR.'],
      [/^· 응모 완료 🎁$/,()=> '· Entry complete 🎁'],
      [/^응모일시 (.+)$/,m=>'Entry date: '+m[1]],
      [/^응모 완료 · (.+)$/,m=>'Entry complete · '+m[1]]
    ];
    /* WEB_I18N_V9_SHOP_RULES */
    rules.push(
      [/^운영 중 · 24시간$/,()=> 'Open · 24 Hours'],
      [/^운영 중 · (\d{1,2}:\d{2})[~–](\d{1,2}:\d{2})$/,m=>'Open · '+m[1]+'–'+m[2]],
      [/^영업마감 · (\d{1,2}:\d{2})[~–](\d{1,2}:\d{2})$/,m=>'Closed · '+m[1]+'–'+m[2]]
    );

    /* WEB_I18N_V7_COIN_RULES */
    rules.push(
      [/^앞면!$/,()=> 'Heads!'],
      [/^뒷면!$/,()=> 'Tails!'],
      [/^(\d+(?:\.\d+)?)초$/,m=>m[1]+'s'],
      [/^회전 시간 (\d+(?:\.\d+)?)초 · 눌러서 변경$/,m=>'Flip duration '+m[1]+' seconds · tap to change'],
      [/^회전 시간을 (\d+(?:\.\d+)?)초로 설정했어요\.$/,m=>'Flip duration set to '+m[1]+' seconds.'],
      [/^튕긴 순간부터 약 (\d+(?:\.\d+)?)초 후 결과가 결정돼요\.$/,m=>'The result will be decided about '+m[1]+' seconds after the flip.'],
      [/^앞면 스킨을 (?:계정에|이 기기에) 저장했어요\.$/,()=> 'Front skin saved.'],
      [/^뒷면 스킨을 (?:계정에|이 기기에) 저장했어요\.$/,()=> 'Back skin saved.'],
      [/^앞면 스킨을 초기화했어요\.$/,()=> 'Front skin reset.'],
      [/^뒷면 스킨을 초기화했어요\.$/,()=> 'Back skin reset.']
    );

    /* WEB_I18N_V4_CORE_RULES */
    rules.push(
      [/^매장 방문일 (.+)$/,m=>'Visited '+m[1]],
      [/^매장 사진 (\d+)$/,m=>'Shop Photo '+m[1]],
      [/^사진 추가 \((\d+)\/(\d+)\)$/,m=>'Add Photos ('+m[1]+'/'+m[2]+')']
    );

    /* WEB_I18N_V4_LIVE_RULES */
    rules.push(
      [/^(.+)를 선택해주세요 \((\d+)개\)$/,m=>'Please select '+m[1]+' ('+m[2]+')'],
      [/^(\d+)분 전$/,m=>m[1]+' min ago'],
      [/^(\d+)시간 전$/,m=>m[1]+' hr ago'],
      [/^(\d+)일 전$/,m=>m[1]+' days ago']
    );

    /* WEB_I18N_V4_TOOL_RULES */
    rules.push(
      [/^(\d+)회$/,m=>m[1]+' times'],
      [/^(\d+)번째$/,m=>'#'+m[1]],
      [/^(\d+)개 구매 시 1개 이상 당첨 기준$/,m=>'Chance of at least one win when buying '+m[1]],
      [/^(\d+(?:\.\d+)?)% 판매 · (\d+(?:\.\d+)?)% 남음$/,m=>m[1]+'% sold · '+m[2]+'% remaining'],
      [/^(\d+(?:\.\d+)?)% 이상$/,m=>m[1]+'% or more'],
      [/^(\d+(?:\.\d+)?)개$/,m=>m[1]+' items'],
      [/^상대 카드 쪽 가치가 약 (\d+(?:\.\d+)?)% 높습니다\.$/,m=>'Their side is worth about '+m[1]+'% more.'],
      [/^내 카드 쪽 가치가 약 (\d+(?:\.\d+)?)% 높습니다\.$/,m=>'My side is worth about '+m[1]+'% more.']
    );
    for(const [pattern,format] of rules){const match=value.match(pattern);if(match)return format(match)}
    return value;
  }


  /* WEB_I18N_V4_TOOLS */
  Object.assign(textMap,{
    '코인플립, 오리파 확률, 센터링 측정, 그레이딩 손익, 트레이딩 비교를 한곳에서 이용하세요.':{en:'Use coin flip, Oripa odds, centering, grading ROI, and trade comparison tools in one place.'},
    '카드 수집과 플레이에 자주 필요한 기능을 빠르게 사용할 수 있어요.':{en:'Quick access to useful tools for card collecting and play.'},
    '코인플립':{en:'Coin Flip'},'실제 코인처럼 3D로 던져 앞면·뒷면 결정':{en:'Flip a 3D coin to decide heads or tails'},
    '오리파 확률 계산기':{en:'Oripa Odds Calculator'},'구매 수량에 따른 실제 당첨 확률 계산':{en:'Calculate win odds based on purchase quantity'},
    '카드 센터링 측정':{en:'Card Centering Tool'},'사진으로 좌우·상하 센터링 비율 확인':{en:'Check left/right and top/bottom centering from a photo'},
    '등급 확률 · 손익 계산기':{en:'Grading Odds & ROI Calculator'},'그레이딩 전 예상가치와 손익 계산':{en:'Estimate grading value and profit before submission'},
    '트레이딩 가치 비교':{en:'Trade Value Compare'},'교환 카드의 보정 가치를 한눈에 비교':{en:'Compare adjusted trade values at a glance'},

    '코인플립 | FUNY PIN':{en:'Coin Flip | FUNY PIN'},
    '실제 코인처럼 입체적으로 회전하는 3D 코인플립으로 앞면·뒷면을 공정하게 결정하는 무료 TCG 도구입니다.':{en:'A free TCG tool with a 3D coin flip to fairly decide heads or tails.'},
    '실제 코인처럼 입체적으로 회전하는 3D 코인플립으로 앞면·뒷면을 빠르고 공정하게 결정하세요.':{en:'Quickly and fairly decide heads or tails with a realistic 3D coin flip.'},
    'FUNY PIN 코인플립':{en:'FUNY PIN Coin Flip'},'실제 코인처럼 입체적으로 회전해 앞면·뒷면을 결정하는 무료 3D 코인플립 도구':{en:'A free 3D coin flip tool for deciding heads or tails.'},
    '효과음 켜짐':{en:'Sound On'},'효과음 꺼짐':{en:'Sound Off'},'코인을 던져보세요':{en:'Flip the coin'},'결과는 브라우저에서 무작위로 결정됩니다.':{en:'The result is randomly generated in your browser.'},
    '코인 던지기':{en:'Flip Coin'},'앞':{en:'Front'},'뒤':{en:'Back'},'앞면':{en:'Heads'},'뒷면':{en:'Tails'},
    '브라우저 난수로 결정 · 서버 전송 없음':{en:'Browser-generated randomness · No server transmission'},'오늘 전체 코인플립 통계':{en:"Today's Coin Flip Stats"},
    '오늘 앞면':{en:'Heads Today'},'오늘 뒷면':{en:'Tails Today'},'오늘 전체':{en:'Total Today'},'00:00 리셋':{en:'Resets at 00:00'},
    '내 오늘 최근 결과':{en:"My Recent Results Today"},'기록 초기화':{en:'Reset History'},'아직 결과가 없습니다.':{en:'No results yet.'},
    '· 코인 또는 아래 버튼을 눌러 다시 던질 수 있어요.':{en:'· Tap the coin or the button below to flip again.'},'코인 플립 중...':{en:'Flipping coin...'},
    '코인을 다시 눌러 새로운 결과를 확인해보세요.':{en:'Tap the coin again for a new result.'},'오늘 전체 확률 집계 연결을 확인해주세요.':{en:'Unable to load today’s aggregate stats.'},
    '코인플립 결과가 결정되었습니다.':{en:'Coin flip result decided.'},'코인이 회전 중...':{en:'Coin is spinning...'},'잠시만 기다려주세요.':{en:'Please wait a moment.'},
    '내 오늘 기록을 초기화했어요.':{en:"Today's history has been reset."},'효과음을 켰어요.':{en:'Sound turned on.'},'효과음을 껐어요.':{en:'Sound turned off.'},'새로운 날짜의 기록이 시작됐어요.':{en:'A new day of results has started.'},

    '오리파 확률 계산기 | FUNY PIN':{en:'Oripa Odds Calculator | FUNY PIN'},
    '전체 수량, 당첨 수량, 구매 수량을 입력해 실물 오리파의 실제 당첨 확률을 계산합니다.':{en:'Enter total stock, winning stock, and purchase quantity to calculate Oripa win odds.'},
    '오리파 당첨 확률':{en:'Oripa Win Odds'},'당첨 가능성을 계산해보세요':{en:'Calculate your chance of winning'},'구매 수량을 입력해주세요':{en:'Enter purchase quantity'},
    '오리파 수량 선택':{en:'Oripa Quantity'},'전체 수량':{en:'Total Quantity'},'전체 수량 직접 입력':{en:'Enter Total Quantity'},'남은 수량':{en:'Remaining Quantity'},'남은 수량 직접 입력':{en:'Enter Remaining Quantity'},
    '남은 당첨 수량':{en:'Remaining Winners'},'남은 당첨 수량 직접 입력':{en:'Enter Remaining Winners'},'구매 정보 입력':{en:'Purchase Information'},'구매 예정 수량':{en:'Quantity to Buy'},'한게임 가격':{en:'Price per Draw'},
    '총 구매 금액':{en:'Total Purchase Cost'},'판매 진행률':{en:'Sales Progress'},'계산 결과는 입력한 오리파 구성에 대한 수학적 확률입니다. 실제 당첨을 보장하지 않습니다.':{en:'Results are mathematical probabilities based on the entered Oripa setup and do not guarantee a win.'},
    '1개 당첨 확률':{en:'Single-Draw Win Rate'},'모두 실패할 확률':{en:'Chance of No Wins'},'예상 당첨 개수':{en:'Expected Wins'},'당첨 1개당 구성 수량':{en:'Items per Winning Slot'},
    '구매 수량별 당첨 확률':{en:'Win Odds by Purchase Quantity'},'1개 이상 당첨 기준':{en:'Chance of at Least One Win'},'목표 확률별 필요한 구매 수량':{en:'Purchases Needed by Target Probability'},
    '실물 오리파처럼 한 번 뽑은 상품이 재고에서 빠지는 비복원 추출 기준으로 계산합니다.':{en:'Calculated without replacement, matching physical Oripa where drawn items leave the remaining stock.'},
    '수량 정보를 확인해주세요.':{en:'Please check the quantity values.'},'🌱 당첨 가능성이 낮은 편이에요':{en:'🌱 The chance of winning is low'},'🎯 당첨 가능성이 높은 편이에요':{en:'🎯 The chance of winning is high'},
    '✨ 당첨 가능성이 꽤 있는 편이에요':{en:'✨ The chance of winning is fairly good'},'🍀 당첨 가능성이 조금 있는 편이에요':{en:'🍀 There is a modest chance of winning'},'달성 불가':{en:'Not reachable'},

    '등급 확률 · 손익 계산기 | FUNY PIN':{en:'Grading Odds & ROI Calculator | FUNY PIN'},
    'Raw 카드 가격, 그레이딩 비용, 등급별 예상가와 확률로 기대 손익을 계산합니다.':{en:'Estimate expected profit using raw card value, grading costs, grade values, and probabilities.'},
    '그레이딩 전 비용과 예상 등급별 판매가를 넣어 기대가치와 손익을 계산해보세요.':{en:'Enter grading costs and expected sale values by grade to calculate expected value and profit.'},
    '투입 비용':{en:'Input Costs'},'RAW 카드 가치':{en:'Raw Card Value'},'그레이딩 비용':{en:'Grading Cost'},'배송 · 기타 비용':{en:'Shipping & Other Costs'},
    '등급별 예상 판매가 · 확률':{en:'Expected Sale Value & Probability by Grade'},'10등급 예상가':{en:'Grade 10 Value'},'10등급 확률 (%)':{en:'Grade 10 Probability (%)'},'9등급 예상가':{en:'Grade 9 Value'},'9등급 확률 (%)':{en:'Grade 9 Probability (%)'},'8이하 예상가':{en:'Grade 8 or Lower Value'},'8이하 확률 (%)':{en:'Grade 8 or Lower Probability (%)'},
    '확률 가중 예상 손익':{en:'Probability-Weighted Expected Profit'},'기대가치에서 총 투입비용을 차감합니다.':{en:'Total input cost is deducted from expected value.'},'총 투입비용':{en:'Total Input Cost'},'예상 그레이딩 가치':{en:'Expected Graded Value'},'예상 수익률':{en:'Expected ROI'},'손익분기 10등급 확률':{en:'Break-Even Grade 10 Probability'},
    '※ 실제 등급과 시세는 달라질 수 있습니다. 본 도구는 사용자가 직접 입력한 가정에 따른 기대값 계산용입니다.':{en:'※ Actual grades and market prices may vary. This tool calculates expected values based on your inputs.'},
    '등급 확률 합계를 100%로 맞춰주세요.':{en:'Grade probabilities must total 100%.'},'100% 초과':{en:'Over 100%'},'확률 가중 기대가치 기준입니다.':{en:'Based on probability-weighted expected value.'},'확률 합계가 100%가 아니어서 결과를 확인해주세요.':{en:'The probabilities do not total 100%. Please review the result.'},

    '트레이딩 가치 비교 | FUNY PIN':{en:'Trade Value Compare | FUNY PIN'},'내 카드와 상대 카드의 시장가치와 상태를 입력해 트레이딩 가치 차이를 비교합니다.':{en:'Compare trade value by entering the market value and condition of both sides.'},
    '양쪽 카드 가격과 상태를 입력해 교환 가치 차이를 빠르게 비교합니다.':{en:'Enter card prices and conditions on both sides to compare trade value quickly.'},'내가 주는 카드':{en:'My Cards'},'+ 카드 추가':{en:'+ Add Card'},'보정 총가치':{en:'Adjusted Total Value'},
    '상대가 주는 카드':{en:"Their Cards"},'트레이딩 가치 차이':{en:'Trade Value Difference'},'양쪽 카드 가치를 입력해주세요.':{en:'Enter card values for both sides.'},'내 카드 총가치':{en:'My Total Value'},'상대 카드 총가치':{en:'Their Total Value'},
    '상태 보정 기본값: Mint 100% · NM 95% · LP 85% · MP 70%. 실제 거래가격과 개인 선호도에 따라 가치는 달라질 수 있습니다.':{en:'Default condition adjustments: Mint 100% · NM 95% · LP 85% · MP 70%. Actual trade value may vary by transaction price and personal preference.'},
    '카드':{en:'Card'},'카드명':{en:'Card Name'},'카드 가치':{en:'Card Value'},'가격':{en:'Price'},'상태':{en:'Condition'},'가치 차이가 5% 이내로 비교적 균형적입니다.':{en:'The values are relatively balanced within 5%.'},

    '포켓몬카드 센터링 측정 도구 | FUNY PIN':{en:'Pokémon Card Centering Tool | FUNY PIN'},'카드 사진을 올려 좌우·상하 센터링 비율을 확인하는 무료 카드 측정 도구입니다. 포켓몬카드 등급 평가 전 참고용으로 활용하세요.':{en:'A free tool to check left/right and top/bottom centering from a card photo before grading.'},
    '포켓몬카드 센터링 측정 도구':{en:'Pokémon Card Centering Tool'},'카드 사진으로 좌우·상하 센터링 비율을 확인하는 무료 웹 도구':{en:'A free web tool for checking card centering from a photo'},
    '카드 사진을 올린 뒤 흰색 선은 카드 외곽, 보라색 선은 안쪽 프레임에 맞춰주세요. 사진은 서버로 전송하지 않고 현재 브라우저에서만 처리됩니다.':{en:'Upload a card photo, align the white guides to the card edges and the purple guides to the inner frame. The image is processed only in your browser and is not uploaded.'},
    '＋ 카드 사진 선택':{en:'＋ Choose Card Photo'},'정면에서 촬영한 카드 사진을 준비해주세요':{en:'Use a straight-on photo of the card'},'기울어짐과 원근 왜곡이 적을수록 측정값이 정확해집니다.':{en:'Results are more accurate with minimal tilt and perspective distortion.'},'측정할 카드':{en:'Card to measure'},
    '선을 직접 드래그해 테두리에 맞춰주세요. 바깥쪽 4개 선과 안쪽 4개 선 사이의 간격으로 센터링을 계산합니다.':{en:'Drag the guides to match the borders. Centering is calculated from the spacing between the four outer and four inner guides.'},
    '가이드 초기화':{en:'Reset Guides'},'사진 −':{en:'Photo −'},'사진 ＋':{en:'Photo ＋'},'최대 중심 편차':{en:'Maximum Center Deviation'},'가이드라인을 맞춰주세요':{en:'Align the guides'},'선을 움직이면 결과가 실시간으로 계산됩니다.':{en:'Results update in real time as you move the guides.'},
    '※ 본 결과는 이미지상의 센터링 비율을 계산한 참고용 측정값입니다. 실제 PSA·BGS·CGC 등 그레이딩 등급을 보장하거나 예측하지 않습니다. 촬영 각도와 이미지 왜곡에 따라 오차가 발생할 수 있습니다.':{en:'※ This is a reference measurement based on image centering. It does not guarantee or predict PSA, BGS, CGC, or other grading results. Camera angle and image distortion may affect accuracy.'},
    '다른 카드 측정하기':{en:'Measure Another Card'},'센터링이 매우 균형적이에요':{en:'Centering is very balanced'},'이미지 기준으로 좌우·상하 편차가 작습니다.':{en:'Left/right and top/bottom deviation is small in the image.'},
    '센터링이 비교적 양호해요':{en:'Centering looks fairly good'},'한쪽으로 약간 치우쳐 보일 수 있습니다.':{en:'It may appear slightly shifted to one side.'},'센터링 편차가 보여요':{en:'Centering deviation detected'},'가이드 위치와 촬영 각도를 다시 확인해보세요.':{en:'Check the guide positions and camera angle again.'}
  });


  /* WEB_I18N_V4_LIVE_PIN */
  Object.assign(textMap,{
    '공백 포함 최대 60자 · 현장 상황을 입력해주세요':{en:'Up to 60 characters including spaces · Describe the current situation'},
    '사진 추가하기 (최대 1장)':{en:'Add Photo (Max 1)'},
    '방금 전':{en:'Just now'},'나도 궁금해요':{en:'I want to know too'},
    '선택한 조건에 등록된 LIVE PIN이 없어요.':{en:'No LIVE PIN posts match the selected filters.'},
    'LIVE PIN 조회 실패:':{en:'Failed to load LIVE PIN:'},'반응 등록 실패:':{en:'Failed to add reaction:'},
    '등록 실패:':{en:'Submission failed:'},'사진 업로드 실패 / HTTP':{en:'Photo upload failed / HTTP'},'신고 접수 실패: HTTP':{en:'Report submission failed: HTTP'},
    '잠시 후 다시 등록해주세요.':{en:'Please try submitting again shortly.'}
  });


  /* WEB_I18N_V4_CORE_DYNAMIC */
  Object.assign(textMap,{
    'TCG 카드샵·포켓몬카드 자판기 지도 | FUNY PIN':{en:'TCG Card Shop & Pokémon Card Vending Machine Map | FUNY PIN'},
    '한국과 일본의 TCG 카드샵, 포켓몬카드 자판기 위치를 지도에서 검색하세요. 포켓몬·원피스·드래곤볼 취급 매장과 길찾기 정보를 제공합니다.':{en:'Find TCG card shops and Pokémon Card vending machines across Korea and Japan, including shops for Pokémon, ONE PIECE, Dragon Ball, and directions.'},
    'FUNY PIN TCG 카드샵 지도':{en:'FUNY PIN TCG Card Shop Map'},'TCG 카드샵·포켓몬카드 자판기 지도':{en:'TCG Card Shop & Pokémon Card Vending Machine Map'},
    '전화하기':{en:'Call'},'상품 구성 상세':{en:'Product Details'},'취급 TCG':{en:'TCG Titles'},'썸네일':{en:'Thumbnail'},'매장 이미지 준비 중':{en:'Shop images coming soon'},'TCG MAP으로 돌아가기':{en:'Back to TCG MAP'},
    '한눈에 보는 매장 분석':{en:'Shop Overview'},'※ 깽퐌커플 방문 평점 바탕으로 주관적인 분석으로 단순 참고용으로 활용해주세요.':{en:'※ This is a subjective overview based on FFUNNYGGANG visit ratings and is provided for reference only.'},
    'Google 매장 정보':{en:'Google Shop Information'},'Google 정보를 불러오는 중...':{en:'Loading Google information...'},'별점':{en:'Rating'},'Google 사용자':{en:'Google User'},'Google 매장 사진':{en:'Google Shop Photos'},
    'Google 평점 · 리뷰':{en:'Google Rating & Reviews'},'Google 리뷰':{en:'Google Reviews'},'Google Maps에서 전체 보기':{en:'View All on Google Maps'},'Google Maps 제공 정보':{en:'Information provided by Google Maps'},'Google 매장 정보를 불러오지 못했습니다.':{en:'Could not load Google shop information.'},
    '길찾기':{en:'Directions'},'조건에 맞는 자판기가 없습니다.':{en:'No vending machines match these filters.'},

    '현재 위치 마커 설정':{en:'Current Location Marker'},'내 위치 보기':{en:'Show My Location'},'내 위치 표시':{en:'Show My Location'},'캐릭터 사용':{en:'Use Character'},
    '남자 1':{en:'Male 1'},'남자 2':{en:'Male 2'},'여자 1':{en:'Female 1'},'여자 2':{en:'Female 2'},
    'iPhone Safari에서 아래 순서로 허용해주세요.':{en:'On iPhone Safari, allow location access as follows.'},'주소창의':{en:'In the address bar, tap'},'페이지 메뉴':{en:'Page Menu'},'를 눌러주세요.':{en:'.'},
    '웹사이트 설정 → 위치':{en:'Website Settings → Location'},'허용':{en:'Allow'},'으로 변경한 뒤 다시 시도해주세요.':{en:'and try again.'},'iPhone 브라우저에서 위치 권한을 허용해주세요.':{en:'Please allow location access in your iPhone browser.'},
    '설정 → 개인정보 보호 및 보안 → 위치 서비스':{en:'Settings → Privacy & Security → Location Services'},'를 열어주세요.':{en:'.'},'사용 중인':{en:'Allow location access for'},'의 위치 접근을 허용해주세요.':{en:'.'},'FUNY PIN으로 돌아와 다시 시도해주세요.':{en:'Return to FUNY PIN and try again.'},
    'Android Chrome에서 아래 순서로 허용해주세요.':{en:'On Android Chrome, allow location access as follows.'},'주소창 왼쪽의':{en:'Tap the icon to the left of the address bar:'},'사이트 정보':{en:'Site Information'},'권한 → 위치':{en:'Permissions → Location'},
    'Android 브라우저에서 위치 권한을 허용해주세요.':{en:'Please allow location access in your Android browser.'},'브라우저의':{en:'Open your browser’s'},'사이트 설정 또는 권한':{en:'Site Settings or Permissions'},'현재 사이트의':{en:'For this site, set'},'을 허용해주세요.':{en:'to Allow.'},
    '브라우저에서 위치 권한을 허용해주세요.':{en:'Please allow location access in your browser.'},'사이트 정보 또는 설정':{en:'Site Information or Settings'},'페이지로 돌아와 다시 시도해주세요.':{en:'Return to the page and try again.'},'위치 권한 안내':{en:'Location Permission'},
    '내 위치를 표시하려면':{en:'To show your location,'},'내 위치':{en:'My Location'},'현재 위치를 확인하지 못했습니다.':{en:'Could not determine your current location.'},'위치 권한을 허용하면 내 위치를 표시할 수 있어요.':{en:'Allow location access to show your current location.'},
    '현재 위치 정보를 가져오지 못했습니다.':{en:'Could not retrieve your current location.'},'위치 확인 시간이 초과됐습니다. 다시 시도해주세요.':{en:'Location request timed out. Please try again.'},'이 브라우저에서는 위치 기능을 지원하지 않습니다.':{en:'This browser does not support location services.'},'지도를 불러온 뒤 다시 시도해주세요.':{en:'Please wait for the map to load and try again.'},'현재 위치를 지도에 표시했습니다.':{en:'Your current location is shown on the map.'},

    'TCG 카드 수집가 커뮤니티 | FUNY TALK':{en:'TCG Collector Community | FUNY TALK'},'포켓몬카드, 원피스카드 등 TCG 수집 정보와 카드 자랑, 질문, 트레이딩 이야기를 나누는 FUNY PIN 커뮤니티입니다.':{en:'FUNY PIN community for sharing TCG collecting tips, card showcases, questions, and trading stories including Pokémon and ONE PIECE cards.'},'TCG 카드 수집가 커뮤니티 FUNY TALK':{en:'TCG Collector Community FUNY TALK'},
    '좋아요':{en:'Like'},'♡ 좋아요':{en:'♡ Like'},'♥ 좋아요':{en:'♥ Like'},'댓글을 불러오는 중...':{en:'Loading comments...'},'첫 댓글을 남겨보세요.':{en:'Be the first to comment.'},'댓글을 불러오지 못했어요.':{en:'Could not load comments.'},
    '좋아요는 로그인 후 이용할 수 있어요.':{en:'Please sign in to like posts.'},'좋아요 처리에 실패했어요.':{en:'Could not update like.'},'댓글을 입력해주세요':{en:'Enter a comment'},'로그인 후 댓글 작성':{en:'Sign in to comment'},'댓글 작성은 로그인 후 이용할 수 있어요.':{en:'Please sign in to comment.'},'댓글 등록 실패':{en:'Failed to post comment'},
    '게시물 수정':{en:'Edit Post'},'(최대 3장 · 장당 5MB)':{en:'(Up to 3 images · 5MB each)'},'이미지를 선택해주세요':{en:'Select images'},'카드 거래 게시물은 FUNY PIN 자체 게시판에서 지원하지 않습니다.':{en:'Card sales/trade listing posts are not supported on the FUNY PIN board.'},'수정 완료':{en:'Save Changes'},
    'JPG, PNG, WebP 이미지만 첨부할 수 있어요.':{en:'Only JPG, PNG, and WebP images can be attached.'},'이미지는 장당 5MB 이하만 첨부할 수 있어요.':{en:'Each image must be 5MB or smaller.'},'제목과 내용을 입력해주세요.':{en:'Enter a title and content.'},'수정 중…':{en:'Saving…'},'수정에 실패했습니다.':{en:'Failed to save changes.'},'이미지 업로드에 실패했습니다.':{en:'Image upload failed.'},'이미지 정보를 저장하지 못했습니다.':{en:'Could not save image information.'},
    '게시물을 삭제할까요?':{en:'Delete this post?'},'삭제에 실패했습니다.':{en:'Delete failed.'},'수정하기':{en:'Edit'},'삭제하기':{en:'Delete'},'댓글을 삭제할까요?':{en:'Delete this comment?'},'댓글 삭제에 실패했습니다.':{en:'Failed to delete comment.'},'댓글 수정':{en:'Edit Comment'},'댓글 수정에 실패했습니다.':{en:'Failed to edit comment.'},
    '댓글 신고는 로그인 후 이용할 수 있어요.':{en:'Please sign in to report comments.'},'도배 · 광고':{en:'Spam · Advertising'},'욕설 · 괴롭힘':{en:'Abuse · Harassment'},'부적절한 콘텐츠':{en:'Inappropriate Content'},'개인정보 노출':{en:'Personal Information'},'댓글 신고':{en:'Report Comment'},'이미 신고한 댓글이에요.':{en:'You already reported this comment.'},'신고 처리에 실패했습니다.':{en:'Failed to submit report.'},'신고가 접수되었습니다.':{en:'Report submitted.'},
    '게시물 신고는 로그인 후 이용할 수 있어요.':{en:'Please sign in to report posts.'},'게시물 신고':{en:'Report Post'},'신고 사유를 선택해주세요. 신고 내용은 LIVE PIN 신고와 별도로 관리됩니다.':{en:'Select a reason. TALK reports are managed separately from LIVE PIN reports.'},'이미 신고한 게시물이에요.':{en:'You already reported this post.'},'게시물 첨부 이미지':{en:'Post Attachment'},'게시물 신고하기':{en:'Report Post'},
    '도배 방지를 위해 1분에 1개, 시간당 최대 5개까지 등록할 수 있어요. 카드 거래 게시물은 FUNY PIN 자체 게시판에서 지원하지 않습니다.':{en:'To prevent spam, you can post once per minute and up to 5 times per hour. Card sales/trade listing posts are not supported on the FUNY PIN board.'},
    '등록 중…':{en:'Posting…'},'시간당 최대 5개의 게시물을 등록할 수 있어요.':{en:'You can post up to 5 times per hour.'},'게시물은 1분 간격으로 등록할 수 있어요.':{en:'Posts can be submitted once per minute.'},'게시물 등록에 실패했습니다.':{en:'Failed to create post.'},'게시물 등록 결과를 확인하지 못했습니다.':{en:'Could not confirm the post result.'},'게시물이 등록되었습니다.':{en:'Post published.'},'+ 게시물 등록':{en:'+ New Post'},
    '사용자 차단과 함께 자동 접수된 신고입니다.':{en:'This report was automatically submitted with the user block.'},'작성자 차단은 로그인 후 이용할 수 있어요.':{en:'Please sign in to block authors.'},'작성자 정보를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.':{en:'Could not identify the author. Please try again shortly.'},'내 게시물은 차단할 수 없어요.':{en:'You cannot block your own post.'},'이미 차단한 사용자예요.':{en:'This user is already blocked.'},
    '이 작성자를 차단할까요?\n차단한 사용자의 FUNY PIN 게시물은 보이지 않아요.':{en:'Block this author?\nPosts from blocked users will no longer appear in FUNY PIN.'},'차단 처리에 실패했습니다.':{en:'Failed to block user.'},'작성자를 차단하고 운영팀에 신고를 접수했습니다.\n해당 사용자의 게시물은 즉시 숨겨집니다.':{en:'The author was blocked and reported to the moderation team.\nTheir posts are now hidden.'},'작성자를 차단했습니다.\n해당 사용자의 게시물은 즉시 숨겨집니다.':{en:'The author was blocked.\nTheir posts are now hidden.'},'차단하기':{en:'Block'}
  });


  /* WEB_I18N_V5_SUPPORT_POLICY */
  Object.assign(textMap,{
    'TCG 카드샵 지도, 포켓몬카드 자판기, PICK, TALK, 퍼니몬 등 FUNY PIN 주요 기능의 이용 방법을 확인하세요.':{en:'Learn how to use FUNY PIN features including the TCG map, Pokémon Card vending machines, PICK, TALK, and FUNY MON.'},
    'FUNY PIN 이용 경험과 개선 의견을 들려주세요.':{en:'Tell us about your FUNY PIN experience and suggestions.'},'저장 실패':{en:'Save failed'},
    'TCG 카드샵 광고·제휴 문의 | FUNY PIN':{en:'TCG Card Shop Advertising & Partnerships | FUNY PIN'},'TCG 카드샵, 행사, 브랜드의 지도 노출·콘텐츠·이벤트 협업 및 광고 제휴를 FUNY PIN에 문의하세요.':{en:'Contact FUNY PIN about map exposure, content, event collaborations, advertising, and partnerships for TCG shops, events, and brands.'},
    '온라인 문의 | FUNY PIN':{en:'Support | FUNY PIN'},
    'FUNY PIN 공지사항 | 서비스·이벤트 소식':{en:'FUNY PIN Notices | Service & Event Updates'},'FUNY PIN 서비스 업데이트, TCG 카드샵 지도, 이벤트와 운영 관련 최신 공지사항을 확인하세요.':{en:'Check the latest FUNY PIN service updates, TCG map news, events, and operations notices.'},
    '매장 등록 · 정보 수정 요청 | FUNY PIN':{en:'Add / Update Card Shop | FUNY PIN'},'FUNY PIN 카드샵 신규 등록 및 기존 매장 정보 수정 요청':{en:'Request a new FUNY PIN card shop listing or update an existing shop.'},
    '이미지 업로드 실패':{en:'Image upload failed'},'요청 저장 실패':{en:'Request save failed'},

    'FUNY PIN 개인정보처리방침':{en:'FUNY PIN Privacy Policy'},'시행일: 2026년 10월 2일':{en:'Effective: October 2, 2026'},
    'FUNY PIN은 이용자의 개인정보를 중요하게 생각하며 관련 법령 및 플랫폼 정책을 준수하기 위해 다음과 같이 개인정보처리방침을 안내합니다.':{en:'FUNY PIN values your privacy and provides this Privacy Policy in accordance with applicable laws and platform policies.'},
    '1. 수집·처리하는 정보':{en:'1. Information We Collect and Process'},'이용 목적':{en:'Purpose'},'회원':{en:'Account'},'프로필':{en:'Profile'},'서비스 활동':{en:'Service Activity'},'이용 기록':{en:'Usage Records'},
    '2. 위치정보 이용':{en:'2. Location Information'},'위치정보는 이용자가 직접 위치 권한을 허용한 경우에만 사용합니다. 현재 위치 주변 카드샵 표시 및 위치 기반 기능 제공을 위해 이용되며, 위치 권한을 허용하지 않아도 카드샵 검색 등 주요 기능은 이용할 수 있습니다.':{en:'Location information is used only when you grant permission. It is used to show nearby card shops and provide location-based features. Core features such as card shop search remain available without location permission.'},
    '3. 개인정보 보관 및 삭제':{en:'3. Data Retention and Deletion'},'4. 개인정보의 제3자 제공 및 외부 서비스':{en:'4. Third Parties and External Services'},'FUNY PIN은 이용자의 개인정보를 판매하지 않습니다. 서비스 제공을 위해 필요한 범위에서 아래 외부 서비스를 이용할 수 있습니다.':{en:'FUNY PIN does not sell personal information. We may use the following external services as necessary to provide the service.'},
    'Apple, Google, Kakao: 소셜 로그인':{en:'Apple, Google, Kakao: Social login'},'Supabase: 회원 인증, 데이터베이스 및 이미지 저장':{en:'Supabase: Authentication, database, and image storage'},'지도 서비스: 카드샵 위치 표시 및 지도 기능 제공':{en:'Map services: Card shop locations and map features'},
    '5. 이용자의 권리':{en:'5. Your Rights'},'6. 커뮤니티 안전':{en:'6. Community Safety'},'7. 문의처':{en:'7. Contact'},'운영: FUNY PIN':{en:'Operator: FUNY PIN'},'8. 개인정보처리방침 변경':{en:'8. Changes to This Privacy Policy'},

    'FUNY PIN 이용약관':{en:'FUNY PIN Terms of Service'},'시행일: 2026년 10월 5일':{en:'Effective: October 5, 2026'},'제1조 목적':{en:'Article 1. Purpose'},'제2조 서비스 이용':{en:'Article 2. Use of Service'},'제3조 회원':{en:'Article 3. Members'},'제4조 이용자의 의무':{en:'Article 4. User Responsibilities'},'제5조 사용자 생성 콘텐츠':{en:'Article 5. User-Generated Content'},'제6조 계정 삭제':{en:'Article 6. Account Deletion'},'제7조 약관의 변경':{en:'Article 7. Changes to the Terms'},'제8조 문의':{en:'Article 8. Contact'},
    '본 약관은 FUNY PIN(이하 “서비스”)이 제공하는 TCG 카드샵 지도, 콘텐츠, LIVE PIN, 퍼니몬, 커뮤니티 및 관련 기능의 이용 조건과 절차를 정하는 것을 목적으로 합니다.':{en:'These Terms govern the conditions and procedures for using the TCG card shop map, content, LIVE PIN, FUNY MON, community, and related features provided by FUNY PIN.'},
    '서비스는 카드샵 정보와 콘텐츠를 제공하며, 일부 기능은 회원가입 및 로그인이 필요할 수 있습니다. 서비스는 운영상 필요한 경우 기능을 변경하거나 일시 중단할 수 있습니다.':{en:'The service provides card shop information and content. Some features may require registration or sign-in. Features may be changed or temporarily suspended when operationally necessary.'},
    '회원은 본인의 계정을 선량하게 관리해야 하며 타인의 계정을 이용하거나 허위 정보를 등록해서는 안 됩니다. 닉네임은 서비스가 정한 정책을 따라야 합니다.':{en:'Members are responsible for managing their accounts and must not use another person’s account or submit false information. Nicknames must follow service policies.'},
    '타인의 개인정보를 무단으로 게시하지 않습니다.':{en:'Do not post another person’s personal information without permission.'},'사기, 광고 도배, 욕설, 혐오, 명예훼손 등 서비스 운영을 방해하는 행위를 하지 않습니다.':{en:'Do not engage in fraud, spam advertising, abuse, hate, defamation, or other conduct that disrupts the service.'},'저작권 등 타인의 권리를 침해하는 콘텐츠를 게시하지 않습니다.':{en:'Do not post content that infringes copyright or other rights.'},

    'FUNY PIN 커뮤니티 운영정책':{en:'FUNY PIN Community Guidelines'},'1. 기본 원칙':{en:'1. Basic Principles'},'2. 제한되는 콘텐츠':{en:'2. Prohibited Content'},'3. 게시물 필터링':{en:'3. Content Filtering'},'4. 신고 및 운영 조치':{en:'4. Reports and Moderation'},'5. 이용자 차단':{en:'5. Blocking Users'},'6. 반복 위반':{en:'6. Repeated Violations'},'7. 문의':{en:'7. Contact'},
    '욕설, 혐오, 차별, 괴롭힘, 협박 또는 타인을 공격하는 콘텐츠':{en:'Abusive, hateful, discriminatory, harassing, threatening, or attacking content'},'음란물·성적 착취 등 부적절하거나 유해한 콘텐츠':{en:'Pornographic, sexually exploitative, inappropriate, or harmful content'},'사기, 허위 매물, 도배성 광고 및 스팸':{en:'Fraud, false listings, repetitive advertising, and spam'},'타인의 개인정보를 동의 없이 공개하는 행위':{en:'Sharing another person’s personal information without consent'},'저작권·상표권 등 타인의 권리를 침해하는 콘텐츠':{en:'Content that infringes copyright, trademark, or other rights'},'불법 거래나 법령을 위반하는 내용을 조장하는 콘텐츠':{en:'Content promoting illegal transactions or violations of law'},

    'FUNY PIN 계정 삭제 요청':{en:'FUNY PIN Account Deletion Request'},'계정 삭제':{en:'Account Deletion'},'FUNY PIN 계정 및 연결 데이터 삭제 안내':{en:'FUNY PIN Account and Connected Data Deletion'},'FUNY PIN 계정은 앱에서 직접 삭제하거나, 앱을 이용하기 어려운 경우 웹에서 삭제를 요청할 수 있습니다.':{en:'You can delete your FUNY PIN account directly in the app, or request deletion on the web if you cannot use the app.'},
    '삭제 방법':{en:'How to Delete Your Account'},'앱에서 직접 삭제':{en:'Delete in the App'},'로그인이 가능한 경우 가장 빠르게 계정을 삭제할 수 있습니다.':{en:'If you can sign in, deleting your account in the app is the fastest option.'},'FUNY PIN 앱에서 로그인합니다.':{en:'Sign in to the FUNY PIN app.'},'화면으로 이동합니다.':{en:'Go to the MY screen.'},'화면 하단의':{en:'At the bottom of the screen, select'},'를 선택합니다.':{en:'.'},'안내 내용을 확인한 뒤 삭제를 완료합니다.':{en:'Review the notice and complete deletion.'},
    '웹에서 삭제 요청':{en:'Request Deletion on the Web'},'앱에 로그인할 수 없거나 앱을 사용할 수 없는 경우 아래 양식으로 요청해주세요.':{en:'If you cannot sign in or use the app, submit the form below.'},'가입 이메일':{en:'Account Email'},'가입에 사용한 이메일을 입력해주세요':{en:'Enter the email used for your account'},'로그인 방법':{en:'Sign-in Method'},'잘 모르겠어요':{en:'Not sure'},'FUNY PIN 닉네임 (선택)':{en:'FUNY PIN Nickname (Optional)'},'사용 중인 닉네임이 있다면 입력해주세요':{en:'Enter your nickname if you have one'},'추가 확인사항 (선택)':{en:'Additional Information (Optional)'},'계정 확인에 도움이 되는 내용이 있다면 입력해주세요':{en:'Enter any details that may help verify your account'},'계정 삭제 시 복구가 어려울 수 있으며, 아래 삭제 정보 안내를 확인했습니다.':{en:'I understand that account deletion may be irreversible and have reviewed the information below.'},
    '계정 삭제 요청 접수':{en:'Submit Account Deletion Request'},'계정 삭제 요청이 접수되었습니다.':{en:'Your account deletion request has been received.'},'입력한 정보를 확인한 뒤 필요한 경우 이메일로 본인 확인을 안내합니다.':{en:'We will review the information and contact you by email if identity verification is required.'},'삭제 시 처리되는 정보':{en:'Data Processed Upon Deletion'},'계정 및 프로필':{en:'Account & Profile'},'회원 활동 정보':{en:'Member Activity'},'FUNY TALK 콘텐츠':{en:'FUNY TALK Content'},'기타 식별 가능한 회원 데이터':{en:'Other Identifiable Member Data'},'계정 삭제 요청':{en:'Request Account Deletion'}
  });


  /* WEB_I18N_V6_POLICY_FULL */
  Object.assign(textMap,{
    'Supabase Auth 계정 식별정보, Apple·Google·Kakao 등 로그인 제공자가 전달하는 이메일·이름 등':{en:'Supabase Auth account identifiers and information such as email and name provided by sign-in providers including Apple, Google, and Kakao'},
    '회원 식별, 로그인 상태 유지':{en:'Identify members and maintain sign-in status'},
    '닉네임, 사용자가 선택한 프로필 이미지':{en:'Nickname and user-selected profile image'},
    'MY 및 커뮤니티 프로필 제공':{en:'Provide MY and community profiles'},
    '기기 위치 권한을 허용한 경우 현재 위치':{en:'Current location when device location permission is granted'},
    '내 위치 표시, 가까운 카드샵 탐색, 위치 기반 FUNY MON 기능':{en:'Show your location, find nearby card shops, and provide location-based FUNY MON features'},
    '관심 매장, FUNY MON 포획, 이벤트 응모·쿠폰 기록':{en:'Favorite shops, FUNY MON catches, event entries, and coupon records'},
    '회원 기능 제공 및 이용 내역 표시':{en:'Provide member features and display usage history'},
    '게시물 제목·내용, 첨부 이미지, 작성 시각, 신고 및 사용자 차단 기록':{en:'Post titles and content, attached images, timestamps, reports, and user-block records'},
    '커뮤니티 제공, 안전 관리, 스팸·악용 방지':{en:'Provide community features, maintain safety, and prevent spam and abuse'},
    '서비스 이용 과정에서 생성되는 기본 접속 및 이용 기록':{en:'Basic access and usage records generated while using the service'},
    '서비스 운영, 오류 확인 및 품질 개선':{en:'Operate the service, diagnose errors, and improve quality'},
    '이용자가 문의 과정에서 직접 제공한 정보':{en:'Information provided directly by the user during an inquiry'},
    '개인정보는 서비스 제공에 필요한 기간 동안 보관합니다. 앱의 MY에서 계정 삭제를 완료하면 법령상 보존 의무가 있는 정보를 제외하고 계정과 연결된 프로필, 관심 매장, 커뮤니티 게시물 및 사용자가 업로드한 프로필·게시물 이미지를 삭제합니다. FUNY MON 운영 통계 등 서비스 운영 기록은 계정 식별정보를 제거한 형태로 보관될 수 있습니다.':{en:'Personal information is retained for as long as needed to provide the service. When account deletion is completed in MY, account-linked profile data, favorite shops, community posts, and user-uploaded profile and post images are deleted except where retention is required by law. Operational records such as FUNY MON statistics may be retained after account identifiers are removed.'},
    '이용자는 자신의 개인정보에 대해 열람, 수정, 삭제를 요청할 수 있습니다. 앱의 프로필 편집 및 계정 삭제 기능을 직접 이용할 수 있으며, 앱을 이용할 수 없는 경우':{en:'You may request access to, correction of, or deletion of your personal information. You can use the profile editing and account deletion features in the app, or if you cannot use the app,'},
    '웹 계정 삭제 요청 페이지':{en:'web account deletion request page'},
    '를 통해 삭제를 요청할 수 있습니다. FUNY TALK에서는 특정 작성자를 차단하고 MY에서 차단을 해제할 수 있습니다.':{en:'to request deletion. In FUNY TALK, you can block specific authors and unblock them from MY.'},
    'FUNY TALK의 안전한 운영을 위해 신고, 사용자 차단, 도배 방지 및 부적절한 콘텐츠 필터링 기능을 운영할 수 있습니다. 신고 기록은 안전 관리와 분쟁 대응을 위해 필요한 범위에서 처리될 수 있습니다.':{en:'To operate FUNY TALK safely, FUNY PIN may use reporting, user blocking, anti-spam controls, and inappropriate-content filtering. Report records may be processed as necessary for safety management and dispute handling.'},
    '개인정보 및 서비스 관련 문의는':{en:'For privacy and service inquiries, contact'},
    '으로 요청할 수 있습니다.':{en:'.'},
    '본 개인정보처리방침은 서비스 변경 또는 관련 법령 및 정책 변경에 따라 수정될 수 있으며, 변경 시 서비스 내 또는 웹사이트를 통해 안내합니다.':{en:'This Privacy Policy may be revised due to service changes or changes in applicable laws and policies. Updates will be announced within the service or on the website.'},

    'TALK 등 이용자가 작성한 콘텐츠의 책임은 작성자에게 있습니다. FUNY PIN은 부적절하거나 불쾌감을 주는 콘텐츠, 욕설·혐오·괴롭힘·협박 등 다른 이용자를 학대하는 행위 및 악성 이용자에 대해 무관용 원칙을 적용합니다.':{en:'Users are responsible for content they create, including content posted in TALK. FUNY PIN applies a zero-tolerance policy to inappropriate or offensive content, abuse of other users including abusive language, hate, harassment, or threats, and malicious users.'},
    '운영자는 신고 또는 운영정책 위반이 확인된 콘텐츠를 즉시 숨김·삭제할 수 있으며, 위반 이용자의 서비스 이용을 제한하거나 계정을 차단할 수 있습니다. 이용자는 게시물 신고 및 작성자 차단 기능을 통해 부적절한 콘텐츠와 이용자를 운영자에게 알릴 수 있습니다.':{en:'FUNY PIN may immediately hide or remove content that is reported or found to violate operating policies, and may restrict service access or block accounts of violating users. Users can report inappropriate content and users through post reporting and author blocking features.'},
    '회원은 앱의 MY 화면에서 계정 삭제를 요청할 수 있으며, 앱을 이용할 수 없는 경우':{en:'Members can request account deletion from the MY screen in the app. If the app cannot be used,'},
    '를 이용할 수 있습니다. 삭제 시 법령상 보존이 필요한 정보를 제외하고 계정과 연결된 개인정보 및 사용자 소유 저장 파일을 삭제합니다.':{en:'may be used instead. Upon deletion, account-linked personal information and user-owned stored files are deleted except where retention is required by law.'},
    '서비스는 법령 및 서비스 운영상 필요한 경우 약관을 변경할 수 있으며, 변경 사항은 서비스 내에서 안내합니다.':{en:'The Terms may be changed when required by law or service operation. Changes will be announced within the service.'},
    '서비스 이용 관련 문의는 FUNY PIN 운영 이메일':{en:'For service-related inquiries, contact the FUNY PIN operating email'},
    '을 통해 접수할 수 있습니다.':{en:'.'},

    'FUNY TALK는 TCG 수집가들이 정보를 공유하고 대화하는 공간입니다. FUNY PIN은 부적절한 콘텐츠와 악성 이용 행위를 허용하지 않으며, 다른 이용자를 존중하고 카드 수집 문화에 맞는 건전한 대화를 지향합니다.':{en:'FUNY TALK is a space for TCG collectors to share information and communicate. FUNY PIN does not allow inappropriate content or malicious behavior and promotes respectful, healthy discussion within card-collecting culture.'},
    'FUNY PIN은 부적절한 표현과 유해 콘텐츠가 게시되지 않도록 등록 단계에서 자동 필터링과 도배 방지 정책을 적용할 수 있습니다. 필터를 우회하거나 반복적으로 정책을 위반하는 경우 게시물 삭제 또는 이용 제한 조치가 적용될 수 있습니다.':{en:'FUNY PIN may apply automated filtering and anti-spam controls when content is submitted to help prevent inappropriate expressions and harmful content. Attempts to bypass filters or repeated policy violations may result in content removal or service restrictions.'},
    '문제가 있는 게시물은 게시물 상세의 신고 기능을 통해 접수할 수 있습니다. 운영자는 접수된 신고를 확인하고 커뮤니티 안전을 위해 게시물 숨김·삭제, 작성자 이용 제한 등 필요한 조치를 가능한 한 신속하게 진행합니다.':{en:'Problematic posts can be reported from the post detail page. FUNY PIN reviews submitted reports and takes necessary actions such as hiding or removing posts or restricting authors as promptly as reasonably possible to protect community safety.'},
    '게시물 상세에서 특정 작성자를 차단할 수 있습니다. 차단한 작성자의 FUNY PIN 게시물은 내 TALK 피드에서 숨겨지며, MY &gt; 차단한 사용자에서 차단 상태를 확인하거나 해제할 수 있습니다.':{en:'You can block a specific author from a post detail page. Posts from blocked authors are hidden from your TALK feed, and you can review or remove blocks in MY > Blocked Users.'},
    '스팸, 괴롭힘, 혐오·음란 콘텐츠 등 중대한 위반이나 반복적인 정책 위반이 확인되는 계정은 서비스 이용이 제한될 수 있습니다.':{en:'Accounts involved in serious or repeated violations, including spam, harassment, hateful content, or sexually explicit content, may have their access to the service restricted.'},
    '운영정책 또는 커뮤니티 안전 관련 문의는 FUNY PIN 운영 이메일':{en:'For questions about community policy or safety, contact the FUNY PIN operating email'}
  });


  /* WEB_I18N_V7_COIN_SKIN */
  Object.assign(textMap,{
    '코인 설정':{en:'Coin Settings'},
    '회전 시간 변경':{en:'Change Flip Duration'},
    '스킨':{en:'Skin'},
    '코인 스킨 설정':{en:'Coin Skin Settings'},
    '앞면과 뒷면 이미지를 각각 선택해 위치와 크기를 조정할 수 있어요. 설정한 스킨은 다음 접속에도 유지됩니다.':{en:'Choose separate images for the front and back, then adjust their position and size. Your skins will be kept for future visits.'},
    '앞면 스킨 미리보기':{en:'Front skin preview'},
    '앞면 스킨':{en:'Front Skin'},
    '뒷면 스킨 미리보기':{en:'Back skin preview'},
    '뒷면 스킨':{en:'Back Skin'},
    '사진 선택 후 확대·축소와 위치를 조정해요.':{en:'Choose a photo, then adjust zoom and position.'},
    '스킨 이미지 조정':{en:'Adjust Skin Image'},
    '드래그로 위치 이동 · 슬라이더 또는 두 손가락으로 확대/축소':{en:'Drag to reposition · Use the slider or pinch to zoom'},
    '이미지 확대 축소':{en:'Image zoom'},
    '앞면과 뒷면 이미지를 각각 설정할 수 있어요. 로그인 계정과 현재 기기에 저장됩니다.':{en:'Set separate images for the front and back. They are saved to your account and this device.'},
    '앞면과 뒷면 이미지를 각각 설정할 수 있어요. 현재 기기에 저장되며 다음 접속에도 유지됩니다.':{en:'Set separate images for the front and back. They are saved on this device and kept for future visits.'},
    '원형 영역에 맞게 이미지 위치와 크기를 조정해주세요.':{en:'Adjust the image position and size to fit the circular area.'},
    '이미지를 저장하지 못했어요.':{en:'Could not save the image.'},
    '스킨 저장에 실패했어요. 다시 시도해주세요.':{en:'Failed to save the skin. Please try again.'},
    '스킨 초기화에 실패했어요. 다시 시도해주세요.':{en:'Failed to reset the skin. Please try again.'}
  });


  /* WEB_I18N_V8_COIN_FACE */
  Object.assign(textMap,{
    '앞뒷면 전환':{en:'Switch Coin Side'},
    '앞/뒤 전환':{en:'Switch Side'},
    '앞면 보기':{en:'Show Heads'},
    '뒷면 보기':{en:'Show Tails'},
    '앞면으로 전환했어요.':{en:'Showing heads.'},
    '뒷면으로 전환했어요.':{en:'Showing tails.'}
  });


  /* WEB_I18N_V9_SHOP_DETAIL */
  Object.assign(textMap,{
    '공지':{en:'Notice'},
    '운영 중':{en:'Open'},
    '영업중':{en:'Open'},
    '영업마감':{en:'Closed'},
    '오늘 휴무':{en:'Closed Today'},
    '한눈에 보는 매장 분석':{en:'Shop Analysis at a Glance'},
    '상품구성':{en:'Products'},
    '가격':{en:'Price'},
    '매장규모':{en:'Store Size'},
    '매장분위기':{en:'Atmosphere'},
    '접근성':{en:'Accessibility'},
    '상품 구성 상세':{en:'Product Mix'},
    '취급 TCG':{en:'TCG Titles'},
    '포켓몬':{en:'Pokémon'},
    '원피스':{en:'One Piece'},
    '드래곤볼':{en:'Dragon Ball'},
    '기본 정보':{en:'Basic Info'},
    '정기휴무':{en:'Regular Closing'},
    '주차':{en:'Parking'},
    '네이버지도':{en:'Naver Map'},
    '공식 홈페이지':{en:'Official Website'},
    '전화하기':{en:'Call'},
    '카드샵에서 직접 전하는 최신 소식이에요.':{en:'Latest updates shared directly by the card shop.'},
    '전체보기':{en:'View All'},
    '싱글카드':{en:'Singles'},
    '등급카드':{en:'Graded Cards'},
    '박스제품':{en:'Boxes'}
  });

  Object.assign(textMap,{
    '거래':{en:'Trade'},
    'TCG 거래':{en:'TCG Trade'},
    '제보 · 매물 등록':{en:'Report · Add Listing'},
    '제보·매물 등록':{en:'Report · Add Listing'},
    '카드샵 · 자판기 · 거래 매물 검색':{en:'Search card shops, vending machines, and listings'},
    '조건에 맞는 TCG 거래 매물이 없습니다.':{en:'No TCG listings match these filters.'},
    '매물 등록':{en:'Add Listing'},
    '거래 희망 위치':{en:'Preferred Trade Location'},
    '휴대폰 인증':{en:'Phone Verification'},
    '현재 위치로 이동':{en:'Go to Current Location'},
    '개인 판매자 · 승인 계정 전용':{en:'Individual sellers · approved accounts only'},
    '카드샵':{en:'Card Shops'},
    '일정':{en:'Events'},
    '자판기':{en:'Vending'},
    '등록 중...':{en:'Submitting...'},
    '인증번호 받기':{en:'Send Code'},
    '인증 확인':{en:'Verify'},
    '위치를 선택해주세요.':{en:'Please select a location.'},
    '위치 확인하기':{en:'View Location'},
    '안내사항':{en:'Important Information'}
  });

  const attrNames=['placeholder','aria-label','title','alt'];const originalText=new WeakMap();const originalAttr=new WeakMap();
  function tr(value){
    if(lang==='ko')return value;
    const raw=String(value??''),trimmed=raw.trim(),direct=textMap[raw]||textMap[trimmed];
    const translated=direct?.[lang]||translateDynamic(trimmed);
    if(translated===trimmed)return value;
    if(raw===trimmed)return translated;
    const lead=raw.slice(0,raw.indexOf(trimmed)),tail=raw.slice(raw.indexOf(trimmed)+trimmed.length);
    return lead+translated+tail;
  }
  function translateTextNode(node){
    if(node.parentElement?.closest('[data-funy-i18n="off"]'))return;
    const current=node.nodeValue;
    if(!originalText.has(node))originalText.set(node,current);
    else{
      const base=originalText.get(node),expected=lang==='ko'?base:tr(base);
      if(current!==expected)originalText.set(node,current);
    }
    const base=originalText.get(node),desired=lang==='ko'?base:tr(base);
    if(node.nodeValue!==desired)node.nodeValue=desired;
  }
  function translateElement(el){
    if(!(el instanceof Element))return;if(el.closest?.('[data-funy-i18n="off"]'))return;if(el.closest&&el.closest('.funy-lang-switch'))return;
    attrNames.forEach(name=>{
      if(!el.hasAttribute(name))return;
      let store=originalAttr.get(el);if(!store){store={};originalAttr.set(el,store)}
      const current=el.getAttribute(name);
      if(!(name in store))store[name]=current;
      else{const expected=lang==='ko'?store[name]:tr(store[name]);if(current!==expected)store[name]=current}
      const base=store[name],desired=lang==='ko'?base:tr(base);
      if(current!==desired)el.setAttribute(name,desired);
    })
  }
  function walk(root){if(!root)return;if(root.nodeType===Node.TEXT_NODE){translateTextNode(root);return}if(root.nodeType!==Node.ELEMENT_NODE&&root.nodeType!==Node.DOCUMENT_NODE)return;if(root.nodeType===Node.ELEMENT_NODE)translateElement(root);const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT);let n;while((n=walker.nextNode())){if(n.nodeType===Node.TEXT_NODE)translateTextNode(n);else translateElement(n)}}
  function ensureTalkNav(){const nav=document.querySelector('.portal-bottom-nav');if(!nav||nav.querySelector('a[href="talk.html"]'))return;const css=document.createElement('link');css.rel='stylesheet';css.href='nav-v4.css?v=20260917-0548';document.head.appendChild(css);const a=document.createElement('a');a.href='talk.html';a.innerHTML='<svg viewBox="0 0 24 24"><path d="M4 5.5h16v11H9l-5 3v-14Z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></svg><span>TALK</span>';nav.appendChild(a)}
  function replaceReviewBanners(){if(!/(^|\/)reviews\.html$/.test(path))return;const imgs=document.querySelectorAll('.review-banner-slide img');const srcs=['assets/banners/banner_review_01.jpg','assets/banners/banner_review_02.jpg','assets/banners/banner_review_03.jpg'];imgs.forEach((img,i)=>{if(srcs[i])img.src=srcs[i]})}
  function ensureReviewScheduleUI(){if(!/(^|\/)reviews\.html$/.test(path)||document.querySelector('.review-schedule'))return;const banner=document.querySelector('.review-banner');if(!banner)return;const style=document.createElement('style');style.id='review-schedule-style';style.textContent='.review-schedule{margin:0 -14px;padding:22px 14px 26px;background:#fff}.review-schedule-head{display:flex;align-items:center;justify-content:space-between;margin:0 3px 13px}.review-schedule-title{margin:0;color:#1d1b24;font-size:17px;font-weight:850;letter-spacing:-.04em}.review-schedule-badge{display:inline-flex;align-items:center;height:21px;padding:0 8px;border-radius:999px;background:#f4f0ff;color:#7659cf;font-size:8.5px;font-weight:850;letter-spacing:.09em}.review-schedule-list{display:grid;gap:9px}.review-schedule-card{display:flex;align-items:center;gap:14px;min-height:72px;padding:10px 13px 10px 10px;border:1px solid #eeeaf4;border-radius:16px;background:#fff;box-shadow:0 5px 18px rgba(67,50,98,.05)}.review-schedule-date{display:flex;flex:0 0 54px;height:54px;flex-direction:column;align-items:center;justify-content:center;border-radius:13px;background:linear-gradient(145deg,#f5f1ff,#eee7ff);color:#7053ca}.review-schedule-month{font-size:8.5px;line-height:1;font-weight:850;letter-spacing:.08em}.review-schedule-day{margin-top:4px;font-size:21px;line-height:.9;font-weight:900;letter-spacing:-.03em}.review-schedule-info{min-width:0;flex:1}.review-schedule-name{overflow:hidden;margin:0;color:#24212a;font-size:14px;font-weight:850;line-height:1.35;letter-spacing:-.03em;text-overflow:ellipsis;white-space:nowrap}.review-schedule-meta{overflow:hidden;margin:6px 0 0;color:#96909d;font-size:11px;line-height:1.35;text-overflow:ellipsis;white-space:nowrap}.review-schedule-arrow{display:flex;align-items:center;justify-content:center;flex:0 0 24px;width:24px;height:24px;border-radius:50%;background:#f7f4fb;color:#9e94ae;font-size:18px;line-height:1}@media(max-width:430px){.review-schedule{padding-top:19px;padding-bottom:23px}.review-schedule-title{font-size:16px}.review-schedule-card{gap:12px;min-height:68px;padding:9px 11px 9px 9px}.review-schedule-date{flex-basis:52px;height:52px}.review-schedule-day{font-size:20px}}';document.head.appendChild(style);const section=document.createElement('section');section.className='review-schedule';section.setAttribute('aria-label','다가오는 TCG 일정');section.innerHTML='<div class="review-schedule-head"><h2 class="review-schedule-title">다가오는 TCG 일정</h2><span class="review-schedule-badge">CALENDAR</span></div><div class="review-schedule-list"><article class="review-schedule-card"><div class="review-schedule-date"><span class="review-schedule-month">SEP</span><strong class="review-schedule-day">19</strong></div><div class="review-schedule-info"><h3 class="review-schedule-name">FUNY PIN 테스트 일정</h3><p class="review-schedule-meta">서울 · 캘린더 연동 전 UI 미리보기</p></div><span class="review-schedule-arrow" aria-hidden="true">›</span></article></div></section>';banner.insertAdjacentElement('beforebegin',section)}
  function renderSwitch(){if(new URLSearchParams(location.search).get('app')==='1')return;if(!isHome)return;if(document.querySelector('.funy-lang-switch'))return;const header=document.querySelector('.portal-header');if(!header)return;const wrap=document.createElement('div');wrap.className='funy-lang-switch';wrap.setAttribute('role','group');wrap.setAttribute('aria-label',lang==='ko'?'언어 선택':'Language');wrap.innerHTML='<button type="button" class="funy-lang-toggle" aria-label="'+(lang==='ko'?'Switch to English':'한국어로 변경')+'"><svg class="funy-lang-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M3.8 12h16.4M12 3.5c2.25 2.35 3.45 5.2 3.45 8.5S14.25 18.15 12 20.5M12 3.5C9.75 5.85 8.55 8.7 8.55 12s1.2 6.15 3.45 8.5"/></svg><span>'+(lang==='ko'?'KO':'EN')+'</span></button>';header.appendChild(wrap);wrap.addEventListener('click',e=>{const btn=e.target.closest('.funy-lang-toggle');if(!btn)return;const next=lang==='ko'?'en':'ko';localStorage.setItem(KEY,next);location.reload()})}
  function syncSwitch(){const btn=document.querySelector('.funy-lang-toggle');if(!btn)return;btn.querySelector('span:last-child').textContent=lang==='ko'?'KO':'EN';btn.setAttribute('aria-label',lang==='ko'?'Switch to English':'한국어로 변경')}
  function translateStructuredData(){
    document.querySelectorAll('script[type="application/ld+json"]').forEach(el=>{
      if(!el.dataset.funyOriginalJson)el.dataset.funyOriginalJson=el.textContent||'';
      const base=el.dataset.funyOriginalJson;
      if(lang==='ko'){if(el.textContent!==base)el.textContent=base;return}
      try{
        const data=JSON.parse(base);
        const walkJson=v=>{
          if(Array.isArray(v))return v.map(walkJson);
          if(v&&typeof v==='object'){
            const out={};
            Object.entries(v).forEach(([k,val])=>{
              if(k==='inLanguage')out[k]='en';
              else if(typeof val==='string'&&['name','headline','description','alternateName'].includes(k))out[k]=tr(val);
              else out[k]=walkJson(val);
            });
            return out;
          }
          return v;
        };
        el.textContent=JSON.stringify(walkJson(data));
      }catch(_){}
    });
  }
  function translateHead(){
    const title=document.querySelector('title');if(title)title.textContent=tr(title.textContent||'');
    document.querySelectorAll('meta[name="description"],meta[property="og:title"],meta[property="og:description"],meta[name="twitter:title"],meta[name="twitter:description"],meta[property="og:image:alt"],meta[name="twitter:image:alt"]').forEach(el=>{const v=el.getAttribute('content');if(v)el.setAttribute('content',tr(v))});
    document.querySelectorAll('meta[property="og:locale"]').forEach(el=>el.setAttribute('content',lang==='en'?'en_US':'ko_KR'));
    translateStructuredData();
  }
  function apply(){ensureTalkNav();applyPngNavIcons();replaceReviewBanners();ensureReviewScheduleUI();translateHead();document.documentElement.lang=lang;document.body.classList.toggle('funy-lang-home',isHome);walk(document.body);renderSwitch();syncSwitch();window.dispatchEvent(new CustomEvent('funy:languagechange',{detail:{lang}}))}
  const observer=new MutationObserver(mutations=>{mutations.forEach(m=>{if(m.type==='attributes'){translateElement(m.target);return}if(m.type==='characterData'){translateTextNode(m.target);return}m.addedNodes.forEach(node=>{if(node.nodeType===1&&node.closest&&node.closest('.funy-lang-switch'))return;walk(node)})})});
  function start(){apply();observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:attrNames,characterData:true})}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();window.FUNY_I18N={getLang:()=>lang,setLang(next){if(!supported.includes(next))return;localStorage.setItem(KEY,next);location.reload()},t:tr};
})();
