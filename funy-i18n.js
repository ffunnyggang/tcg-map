/* FUNY PIN global i18n: ko/en */
(function(){
  const KEY='funy-pin-lang';
  const supported=['ko','en'];
  const stored=localStorage.getItem(KEY);
  let lang=supported.includes(stored)?stored:'ko';
  document.documentElement.lang=lang;

  const textMap={
    'by 깽퐌커플':{en:'by FFUNNYGGANG'},
    '홈':{en:'Home'},
    '리뷰•정보':{en:'Reviews · Info'},
    '카드샵 · FUNY PIN by 깽퐌커플':{en:'Card Shops · FUNY PIN by FFUNNYGGANG'},
    '리뷰 · FUNY PIN by 깽퐌커플':{en:'Reviews · FUNY PIN by FFUNNYGGANG'},
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
    '홈페이지':{en:'Website'},
    '네이버지도':{en:'Naver Map'},
    '구글지도':{en:'Google Maps'},
    '방문 평점':{en:'Visit rating'},
    '리뷰':{en:'Reviews'},
    '정보':{en:'Info'}
  };

  const attrNames=['placeholder','aria-label','title'];
  const originalText=new WeakMap();
  const originalAttr=new WeakMap();

  function tr(value){
    if(lang==='ko')return value;
    const direct=textMap[value];
    if(direct&&direct[lang])return direct[lang];
    return value;
  }

  function translateTextNode(node){
    if(!originalText.has(node))originalText.set(node,node.nodeValue);
    const base=originalText.get(node);
    const exact=tr(base);
    if(exact!==base){node.nodeValue=exact;return;}
    if(lang==='ko'){node.nodeValue=base;return;}
    let out=base;
    Object.keys(textMap).forEach(k=>{
      const en=textMap[k]&&textMap[k][lang];
      if(en&&out.includes(k))out=out.split(k).join(en);
    });
    node.nodeValue=out;
  }

  function translateElement(el){
    if(!(el instanceof Element))return;
    attrNames.forEach(name=>{
      if(!el.hasAttribute(name))return;
      let store=originalAttr.get(el);
      if(!store){store={};originalAttr.set(el,store);}
      if(!(name in store))store[name]=el.getAttribute(name);
      const base=store[name];
      el.setAttribute(name,tr(base));
    });
    if(el.tagName==='TITLE'){
      if(!originalText.has(el))originalText.set(el,el.textContent);
      const base=originalText.get(el);
      el.textContent=tr(base);
    }
  }

  function walk(root){
    if(!root)return;
    if(root.nodeType===Node.TEXT_NODE){translateTextNode(root);return;}
    if(root.nodeType!==Node.ELEMENT_NODE&&root.nodeType!==Node.DOCUMENT_NODE)return;
    if(root.nodeType===Node.ELEMENT_NODE){
      if(root.closest&&root.closest('.funy-lang-switch'))return;
      translateElement(root);
    }
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT);
    let n;
    while((n=walker.nextNode())){
      if(n.nodeType===Node.TEXT_NODE)translateTextNode(n);else translateElement(n);
    }
  }

  function renderSwitch(){
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
    walk(document.body);
    if(document.title)document.title=tr(document.title);
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
