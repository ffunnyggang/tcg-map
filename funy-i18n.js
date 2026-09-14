/* FUNY PIN global i18n: ko/en */
(function(){
  const KEY='funy-pin-lang';
  const supported=['ko','en'];
  const stored=localStorage.getItem(KEY);
  let lang=supported.includes(stored)?stored:'ko';
  const path=location.pathname||'/';
  const isHome=/(^|\/)(index\.html)?$/.test(path);
  document.documentElement.lang=lang;
  document.body&&document.body.classList.toggle('funy-lang-home',isHome);

  const textMap={
    'by 깽퐌커플':{en:'by FFUNNYGGANG'},
    '홈':{en:'Home'},
    '리뷰':{en:'Reviews'},
    '리뷰•정보':{en:'Reviews · Info'},
    '카드샵 · FUNY PIN by 깽퐌커플':{en:'Card Shops · FUNY PIN by FFUNNYGGANG'},
    '리뷰 · FUNY PIN by 깽퐌커플':{en:'Reviews · FUNY PIN by FFUNNYGGANG'},

    '카드가 모이는 곳,':{en:'Where cards come together,'},
    '더 특별한 이야기가':{en:'where more special stories'},
    '시작되는 곳':{en:'begin.'},
    'FUNY PIN과 함께':{en:'With FUNY PIN,'},
    '내 취향의 카드샵을 찾아보세요!':{en:'find the card shop that fits your style!'},
    '카드샵 찾아보기':{en:'Find card shops'},
    '방문기 보기':{en:'View reviews'},
    'TCG MAP에서 카드샵 찾아보기':{en:'Find card shops on TCG MAP'},
    '더 보기':{en:'View more'},
    '카드샵 추천':{en:'Recommended card shops'},
    '깽퐌커플 카드샵 방문기':{en:'FFUNNYGGANG card shop visits'},
    '링크 모음':{en:'Links'},
    '깽퐌커플 링크 모음':{en:'FFUNNYGGANG links'},

    '직접 다녀온 카드샵':{en:'Card shops we visited'},
    '방문기와 정보를 한 곳에':{en:'Reviews and info in one place'},
    '직접 다녀온 카드샵\n방문기와 정보를 한 곳에':{en:'Card shops we visited\nReviews and info in one place'},
    '깽퐌커플이 직접 경험한 카드샵 후기와':{en:'Explore card shop reviews based on our visits'},
    'TCG 관련 콘텐츠를 확인해보세요.':{en:'and other TCG content.'},

    '한국':{en:'Korea'},
    '일본':{en:'Japan'},
    '전체':{en:'All'},
    '포켓몬':{en:'Pokémon'},
    '원피스':{en:'One Piece'},
    '드래곤볼':{en:'Dragon Ball'},
    '싱글카드':{en:'Singles'},
    '등급카드':{en:'Graded cards'},
    '박스제품':{en:'Sealed boxes'},
    '오리파':{en:'Mystery packs'},
    '카드샵 이름 또는 지역으로 검색':{en:'Search by shop name or area'},
    '매장 위치를 불러오는 중...':{en:'Loading shop locations...'},
    '카드를 눌러 상세정보 보기':{en:'Tap a card to view details'},
    '조건에 맞는 카드샵이 없습니다.':{en:'No card shops match your filters.'},
    '일본 · 도쿄 · 아키하바라':{en:'Japan · Tokyo · Akihabara'},
    '서비스 준비 중입니다':{en:'Coming soon'},
    '내 위치':{en:'My location'},
    '추천 순':{en:'Recommended'},
    '가나다 순':{en:'A–Z'},
    '가까운 순':{en:'Nearest'},
    '카드샵 정렬':{en:'Sort card shops'},
    '국가 선택':{en:'Select country'},
    '검색어 지우기':{en:'Clear search'},
    '하단 메뉴':{en:'Bottom navigation'},

    '뒤로가기':{en:'Back'},
    '공유':{en:'Share'},
    '다른 카드샵 더 찾아보기':{en:'Find more card shops'},
    '기본 정보':{en:'Basic info'},
    '매장 정보':{en:'Shop info'},
    '영업시간':{en:'Hours'},
    '주소':{en:'Address'},
    '전화':{en:'Phone'},
    '전화하기':{en:'Call'},
    '홈페이지':{en:'Website'},
    '네이버지도':{en:'Naver Map'},
    '구글지도':{en:'Google Maps'},
    '방문 평점':{en:'Visit rating'},
    '매장 방문일':{en:'Visited'},
    '상품 구성 상세':{en:'Product mix'},
    '취급 TCG':{en:'TCG titles'},
    '깽퐌커플 리뷰':{en:'FFUNNYGGANG Reviews'},
    '매장 이미지 준비 중':{en:'Shop image coming soon'},
    '한눈에 보는 매장 분석':{en:'Shop analysis at a glance'},
    '※ 깽퐌커플 방문 평점 바탕으로 주관적인 분석으로 단순 참고용으로 활용해주세요.':{en:'※ This analysis is based on FFUNNYGGANG’s visit ratings and is for reference only.'},
    '도보':{en:'Walk'},
    '분':{en:'min'},
    '정보':{en:'Info'}
  };

  const attrNames=['placeholder','aria-label','title','alt'];
  const originalText=new WeakMap();
  const originalAttr=new WeakMap();

  function tr(value){
    if(lang==='ko')return value;
    const direct=textMap[value];
    if(direct&&direct[lang])return direct[lang];
    let out=value;
    Object.keys(textMap).sort((a,b)=>b.length-a.length).forEach(k=>{
      const translated=textMap[k]&&textMap[k][lang];
      if(translated&&out.includes(k))out=out.split(k).join(translated);
    });
    return out;
  }

  function translateTextNode(node){
    if(!originalText.has(node))originalText.set(node,node.nodeValue);
    const base=originalText.get(node);
    node.nodeValue=lang==='ko'?base:tr(base);
  }

  function translateElement(el){
    if(!(el instanceof Element))return;
    if(el.closest&&el.closest('.funy-lang-switch'))return;
    attrNames.forEach(name=>{
      if(!el.hasAttribute(name))return;
      let store=originalAttr.get(el);
      if(!store){store={};originalAttr.set(el,store);}
      if(!(name in store))store[name]=el.getAttribute(name);
      const base=store[name];
      el.setAttribute(name,lang==='ko'?base:tr(base));
    });
  }

  function walk(root){
    if(!root)return;
    if(root.nodeType===Node.TEXT_NODE){translateTextNode(root);return;}
    if(root.nodeType!==Node.ELEMENT_NODE&&root.nodeType!==Node.DOCUMENT_NODE)return;
    if(root.nodeType===Node.ELEMENT_NODE)translateElement(root);
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT);
    let n;
    while((n=walker.nextNode())){
      if(n.nodeType===Node.TEXT_NODE)translateTextNode(n);else translateElement(n);
    }
  }

  function renderSwitch(){
    if(!isHome)return;
    if(document.querySelector('.funy-lang-switch'))return;
    const wrap=document.createElement('div');
    wrap.className='funy-lang-switch';
    wrap.setAttribute('role','group');
    wrap.setAttribute('aria-label',lang==='ko'?'언어 선택':'Language');
    wrap.innerHTML='<button type="button" data-funy-lang="ko">KO</button><button type="button" data-funy-lang="en">EN</button>';
    document.body.appendChild(wrap);
    syncSwitch();
    wrap.addEventListener('click',e=>{
      const btn=e.target.closest('[data-funy-lang]');
      if(!btn)return;
      const next=btn.dataset.funyLang;
      if(!supported.includes(next)||next===lang)return;
      localStorage.setItem(KEY,next);
      location.reload();
    });
  }

  function syncSwitch(){
    document.querySelectorAll('[data-funy-lang]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.funyLang===lang)));
  }

  function apply(){
    document.documentElement.lang=lang;
    document.body.classList.toggle('funy-lang-home',isHome);
    walk(document.body);
    document.title=lang==='ko'?(originalText.get(document.querySelector('title'))||document.title):tr(document.title);
    renderSwitch();
    syncSwitch();
    window.dispatchEvent(new CustomEvent('funy:languagechange',{detail:{lang}}));
  }

  const observer=new MutationObserver(mutations=>{
    mutations.forEach(m=>m.addedNodes.forEach(node=>{
      if(node.nodeType===1&&node.closest&&node.closest('.funy-lang-switch'))return;
      walk(node);
    }));
  });

  function start(){
    apply();
    observer.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();

  window.FUNY_I18N={getLang:()=>lang,setLang(next){if(!supported.includes(next))return;localStorage.setItem(KEY,next);location.reload();},t:tr};
})();
