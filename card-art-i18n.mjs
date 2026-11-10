// Use the same persisted language as the FUNY PIN web and app shells.
export let artEnglish=(()=>{
 try{return globalThis.localStorage?.getItem('funy-pin-lang')==='en';}catch{return false;}
})();

export function setArtLanguage(language){
 artEnglish=language==='en';
 try{globalThis.localStorage?.setItem('funy-pin-lang',language);}catch{}
}

const english={
 "화면 언어": "Display language",
 "일러스트 확장 | FUNY PIN TCG TOOL": "Extended Art | FUNY PIN TCG TOOL",
 "이전 단계": "Previous step",
 "일러스트 확장": "Extended Art",
 "완료 화면 닫기": "Close completion screen",
 "카드 속 풍경을": "See more of the world",
 "더 넓게 만나보세요.": "inside your card.",
 "포켓몬 카드 30주년 기념팩 전용": "For the Pokémon Card Game 30th Celebration set",
 "카드를 고르고, 확장 아트를 만들어 출력하세요.": "Choose a card, extend its artwork, and print your design.",
 "진행 단계": "Progress",
 "카드 선택": "Choose a card",
 "확장 아트 만들기": "Create extended art",
 "확장 아트 완성": "Your extended art",
 "어떤 카드를 확장할까요?": "Which card would you like to extend?",
 "카드명 또는 번호로 검색한 뒤 원하는 카드를 선택하세요.": "Search by card name or number, then choose a card.",
 "테스트 계정으로 이용해 주세요": "Sign-in required",
 "로그인 후 카드 목록을 불러올 수 있어요.": "Sign in to browse cards.",
 "로그인하기": "Sign in",
 "카드명 또는 번호 검색": "Search by card name or number",
 "검색어 지우기": "Clear search",
 "검색": "Search",
 "검색결과 카드 언어": "Card language filter",
 "전체": "All",
 "한국어": "Korean",
 "日本語": "Japanese",
 "카드 목록을 준비하고 있어요.": "Loading cards…",
 "다시 불러오기": "Try again",
 "카드 목록 페이지": "Card results pages",
 "이전 카드 목록": "Previous page of cards",
 "다음 카드 목록": "Next page of cards",
 "확장 아트를 만들 준비가 됐어요": "Ready to extend the artwork",
 "점선 안쪽은 실제 카드의 그림이 보일 절단 위치로": "The dotted line marks the cutout for the original artwork.",
 "점선 바깥쪽으로 일러스트가 확장됩니다.": "The extended artwork fills the area outside it.",
 "일러스트 창 절단 위치 미리보기": "Artwork cutout preview",
 "일러스트 창 설정하기": "Adjust the artwork cutout",
 "기본 설정 그대로 진행하는 것을 권장해요.": "We recommend starting with the default settings.",
 "그림과 점선 위치가 맞지 않을 때만 조절해 주세요.": "Adjust the cutout if the dotted line does not match the artwork.",
 "AI 생성 결과와 출력 안내를 이해했습니다.": "I understand the AI generation and printing notes.",
 "나만의 확장 아트가 완성됐어요": "Your extended art is ready",
 "원본 카드와 비교할 수 있어요.": "Compare the result with the original card.",
 "실제 출력 전에 배경 연결과 심볼 위치를 확인해 주세요.": "Check the artwork seam and badge placement before printing.",
 "이미지를 준비하고 있어요…": "Preparing the image…",
 "원본 카드와 확장 도안을 겹친 미리보기": "Preview of the original card with the extended artwork",
 "일러스트 연결 맞추기": "Align the artwork",
 "원본 보기": "Show original",
 "텍스트·기호: ON": "Text & icons: ON",
 "텍스트·기호": "Text & icons",
 "30주년 심볼: OFF": "30th anniversary badge: OFF",
 "30주년 심볼": "30th anniversary badge",
 "테두리: OFF": "Border: OFF",
 "테두리": "Border",
 "모서리: 라운드": "Corners: Rounded",
 "모서리": "Corners",
 "라운드": "Rounded",
 "사각": "Square",
 "완성 64 × 89mm · 바깥 재단 여백 1.5mm는 잘라 주세요.": "Finished size: 64 × 89 mm. Trim the 1.5 mm outer bleed.",
 "A4 · 실제 크기 100%로 인쇄하세요.": "Print on A4 at actual size (100%).",
 "‘페이지에 맞추기’를 해제하고 10mm 기준선을 확인해 주세요.": "Turn off “Fit to page” and check the 10 mm scale bar.",
 "확장 아트가 완성됐어요!": "Your extended art is ready!",
 "사용 후기를 남겨주세요": "Tell us how it turned out",
 "후기에 함께 게시할 생성 이미지": "Generated artwork to include with your review",
 "작성한 후기와 생성 이미지가 TALK 자유게시판에 공개됩니다.": "Your review and generated artwork will be posted publicly in TALK.",
 "사용 후기": "Review",
 "확장 아트를 사용해 본 소감을 들려주세요": "Share your experience with Extended Art",
 "후기 등록하기": "Post review",
 "등록한 후기 보기": "View your review",
 "PDF 다시 받기": "Download PDF again",
 "다른 카드로 만들기": "Create with another card",
 "HOME으로 가기": "Go to HOME",
 "Pokémon 공식 서비스가 아닙니다.": "This is an unofficial Pokémon fan tool.",
 "원본 카드 이미지·캐릭터·로고 등의 권리는 각 권리자에게 있습니다.": "Original card images, characters, and logos belong to their respective rights holders.",
 "확장할 카드를 선택해 주세요": "Choose a card to extend",
 "카드를 선택해 주세요": "Choose a card",
 "카드 속 풍경을 더 넓게 즐겨보세요": "Discover more of the world inside your card",
 "확인하고 시작하기": "Continue",
 "창 조절 닫기": "Close cutout controls",
 "확대한 일러스트 창 미세 조절": "Zoomed artwork cutout preview",
 "위치": "Position",
 "크기": "Size",
 "창 왼쪽으로 0.1mm": "Move cutout left by 0.1 mm",
 "창 오른쪽으로 0.1mm": "Move cutout right by 0.1 mm",
 "창 위로 0.1mm": "Move cutout up by 0.1 mm",
 "창 아래로 0.1mm": "Move cutout down by 0.1 mm",
 "기본값 복원": "Reset to default",
 "이 위치로 적용": "Apply",
 "카드 밖으로 풍경을 넓히고 있어요": "Extending the artwork beyond the frame",
 "나만의 확장 아트를 준비하고 있어요.": "We’re preparing your extended art.",
 "잠시만 기다려 주세요.": "This may take a moment.",
 "🎁 7일간 무료로 즐겨보세요": "🎁 Enjoy seven days of free access",
 "11월 8일부터 14일까지 계정당 하루 카드 3장까지 이용할 수 있어요. 한국시간 매일 00시에 초기화돼요. 생성 시작 시 카드 1장으로 계산하며, 같은 날 같은 카드·언어의 재시도는 추가 차감하지 않아요. 11월 15일부터 퍼니코인 이용을 준비할 예정이에요.": "From November 8 to 14, each account can use up to three cards per day. The limit resets at midnight KST. A card counts when generation starts. Retries for the same card and language on the same day do not count again. We plan to begin preparing FUNY COIN access on November 15.",
 "🎴 이용 가능한 카드를 확인해 주세요": "🎴 Check which cards are supported",
 "포켓몬 카드 30주년 기념팩의 한국어·일본어·영어 카드 중, 일반 일러스트 창이 있는 일부 카드를 지원해요. 지원 여부는 카드 검색 결과에서 확인할 수 있어요.": "Some Korean, Japanese, and English cards from the Pokémon Card Game 30th Celebration set are supported if they have a standard artwork window. Check availability in the search results.",
 "✨ AI가 상상한 풍경을 더해요": "✨ Extend the scene with AI",
 "선택한 카드 이미지는 확장 아트를 만들기 위해 외부 AI 서비스로 전송돼요. 결과는 원화와 다를 수 있고, 글자·기호나 그림의 연결이 정확하지 않을 수 있어요. 생성이 제한되는 경우도 있어요.": "The selected card image is sent to an external AI service to generate the extended art. Results may differ from the original, and text, icons, or artwork seams may be imperfect. Some requests may be blocked.",
 "🖨️ 출력 전에 꼭 확인해 주세요": "🖨️ Check your design before printing",
 "완성된 그림의 연결과 글자·기호를 확인해 주세요. 도안은": "Check the artwork seam, text, and icons. Print the template at",
 "실제 크기 100%": "actual size (100%)",
 "로 출력하고,": "and",
 "‘페이지에 맞추기’는 해제": "turn off “Fit to page.”",
 "해 주세요. 10mm 기준선으로 크기를 확인하면 더 정확해요.": "Use the 10 mm scale bar to verify the print size.",
 "✂️ 원본 카드는 자르지 마세요": "✂️ Cut only the printed template",
 "완성 크기는": "The finished size is",
 "예요. 출력한 도안의 바깥선과 안쪽 일러스트 창을 잘라, 원본 카드가 들어 있는 보호 슬리브 앞에 겹쳐 즐겨주세요. 칼이나 가위를 사용할 때는 손을 다치지 않도록 주의해 주세요.": ". Trim the outer edge and inner artwork window of the printout, then place it over the front of the sleeved original card. Use care when handling scissors or a craft knife.",
 "💜 개인 감상·전시용으로 즐겨주세요 · 권리 안내": "💜 Personal display only · Rights notice",
 "퍼니핀은 Pokémon 공식 서비스가 아니에요. 원본 카드 이미지·캐릭터·로고 등의 권리는 각 권리자에게 있으며, AI 확장 결과는 공식 일러스트가 아니에요. 이 서비스는 관련 권리의 이용허락을 제공하지 않아요. 결과물의 판매·상업적 이용·무단 재배포는 삼가 주세요.": "FUNY PIN is an unofficial Pokémon fan tool. Original card images, characters, and logos belong to their respective rights holders. AI-extended images are unofficial artwork. No license to the underlying rights is granted. Please refrain from selling, using commercially, or redistributing the results without permission.",
 "TALK 후기 등록 시 작성한 내용과 생성 이미지가 공개돼요. 후기 공유 기능도 관련 권리의 이용허락을 의미하지 않으며, 공유할 내용은 등록 전에 확인해 주세요.": "Posting a review in TALK makes your text and generated artwork public. Sharing does not grant a license to any underlying rights. Review your content before posting.",
 "연결 조절 닫기": "Close alignment controls",
 "반투명 비교": "Blend preview",
 "원본 영역을 고정한 일러스트 연결 미리보기": "Artwork alignment preview with the original cutout fixed",
 "원본과 확장 아트를 반투명으로 겹쳐 보고 있어요. 경계의 그림을 맞춰 주세요.": "The original and extended artwork are blended. Align the artwork along the seam.",
 "어두운 영역은 실제 카드가 보이는 부분입니다. 경계의 그림을 맞춰 주세요.": "The shaded area shows where the original card will appear. Align the artwork along the seam.",
 "빈 공간이 없도록 이미지를 키우거나 이동해 주세요.": "Scale or move the image until it covers the entire card.",
 "축소 −": "Scale down −",
 "확대 +": "Scale up +",
 "왼쪽": "Left",
 "오른쪽": "Right",
 "중앙": "Center",
 "위쪽": "Up",
 "아래쪽": "Down",
 "홀로": "Holo",
 "실버": "Silver",
 "실버 글리터": "Silver glitter",
 "골드 글리터": "Gold glitter",
 "관리자 계정 · 생성 횟수 제한 없음": "Admin account · Unlimited generations",
 "11.8–11.14 무료 · 오늘 ": "Nov 8–14 free access · ",
 "/3장 이용 · 매일 00시 초기화": "/3 cards used today · Resets at midnight KST",
 "샘플": "Sample",
 "PDF를 준비하고 있어요": "Preparing your PDF…",
 "선택한 카드로 계속": "Continue with this card",
 "완성 아트 보기": "View extended art",
 "출력 도안 PDF 받기": "Download printable PDF",
 "카드 원본을 불러오고 있어요": "Loading the original card…",
 "검색 결과 ": "Results: ",
 "검색 결과가 없어요. 카드명이나 번호를 다시 확인해 주세요.": "No matches. Check the card name or number and try again.",
 " 확장 미지원": " · Unsupported",
 "확장 미지원": "Unsupported",
 "이미지 준비 중": "Loading image…",
 "이미지 연결 실패": "Image unavailable",
 "일반형": "Standard",
 "진화형": "Evolution",
 "클래식형": "Classic",
 "이 카드는 일반 일러스트 창이 없는 타입으로 현재 확장을 지원하지 않아요.": "This card does not have a standard artwork window and is currently unsupported.",
 "정면 카드 비율이 맞지 않아 사용할 수 없어요.": "This image does not match the required card proportions.",
 " 카드를 선택했어요.": " selected.",
 "카드를 불러오지 못했어요. 다시 선택해 주세요.": "Could not load the card. Please select it again.",
 "관리자 · 일러스트 창 기본값 설정": "Admin · Artwork cutout presets",
 "현재 계정은 이 기능을 이용할 수 없습니다.": "This feature is unavailable for your account.",
 "로그인 후 이용해 주세요.": "Please sign in to continue.",
 "카드 목록 연결에 실패했어요.": "Could not load the card list.",
 "로그인 세션이 만료됐어요. 다시 로그인해 주세요.": "Your session has expired. Please sign in again.",
 "확장 아트 보기": "Show extended art",
 "현재 계정은 AI 생성 준비가 되지 않았어요.": "AI generation is currently unavailable for your account.",
 "원본과 연결 위치를 비교하고 있어요": "Aligning the new artwork with the original",
 "생성 이미지는 유지됩니다. 연결 맞추기를 이어서 완료해 주세요.": "Your generated image is saved for this session. Continue aligning the artwork to finish.",
 "로그인 후 다시 이용해 주세요.": "Please sign in and try again.",
 "생성 요청을 완료하지 못했어요.": "Could not finish generating the artwork.",
 " · 문의용 ID: ": " · Support ID: ",
 "다시 로그인하기": "Sign in again",
 "카드 다시 선택하기": "Choose another card",
 "출력 도안을 만들지 못했어요.": "Could not create the printable template.",
 "일러스트 확장 출력 도안": "Extended Art print template",
 "PDF 저장에 실패했어요.": "Could not save the PDF.",
 "왼쪽 ": "Left ",
 " · 위 ": " · Top ",
 " · 너비 ": " · Width ",
 " · 높이 ": " · Height ",
 "창 위로": "Move cutout up by",
 "창 아래로": "Move cutout down by",
 "창 왼쪽으로": "Move cutout left by",
 "창 오른쪽으로": "Move cutout right by",
 "높이 늘리기": "Increase height by",
 "높이 줄이기": "Decrease height by",
 "너비 줄이기": "Decrease width by",
 "너비 늘리기": "Increase width by",
 "높이 +": "Height +",
 "높이 -": "Height −",
 "너비 +": "Width +",
 "너비 -": "Width −",
 "저장하지 못했어요. 기본값을 다시 확인해 주세요.": "Could not save the preset. Check the current default and try again.",
 "기본값을 저장하지 못했어요. 다시 시도해 주세요.": "Could not save the default. Please try again.",
 "후기를 등록하고 있어요.": "Posting your review…",
 " 확장 아트 사용 후기": " Extended Art review",
 "TALK 자유게시판에 후기를 등록했어요.": "Your review was posted in TALK.",
 "후기 등록에 실패했어요.": "Could not post your review.",
 "로그인 후 후기를 등록해 주세요.": "Sign in to post a review.",
 "후기를 입력해 주세요.": "Enter a review.",
 "첨부 이미지를 준비하지 못했어요.": "Could not prepare the attached image.",
 "이미지 업로드에 실패했어요. 다시 시도해 주세요.": "Could not upload the image. Please try again.",
 "게시물은 1분 간격으로 등록할 수 있어요.": "Wait one minute between posts.",
 "시간당 최대 5개의 게시물을 등록할 수 있어요.": "You can post up to five times per hour.",
 "후기 등록에 실패했어요. 다시 시도해 주세요.": "Could not post your review. Please try again.",
 "이미지를 불러오지 못했어요. 다시 시도해 주세요.": "Could not load the image. Please try again.",
 "확장 이미지 크기가 맞지 않아요.": "The generated image has unexpected dimensions.",
 "일러스트 창 정보가 준비되지 않았어요.": "The artwork cutout is unavailable for this card.",
 "일러스트 창 크기를 확인해 주세요.": "Check the artwork cutout size.",
 "무료 이용 기간이 종료됐어요. 퍼니코인 이용은 준비 중입니다.": "The free access period has ended. FUNY COIN access is in preparation.",
 "이미지 생성 서비스를 준비하고 있어요. 잠시 후 다시 이용해 주세요.": "Image generation is temporarily unavailable. Please try again shortly.",
 "계정당 하루 카드 3장까지 무료로 이용할 수 있어요.": "Each account can use up to three cards per day for free.",
 "오늘은 카드 3장을 모두 이용했어요. 내일 다시 이용해 주세요.": "You’ve used all three cards for today. Please try again tomorrow.",
 "카드를 다시 선택한 뒤 확장 아트 만들기를 눌러 주세요.": "Select the card again, then choose Create extended art.",
 "이 카드의 오늘 재시도 한도에 도달했어요. 다른 카드를 선택해 주세요.": "You’ve reached today’s retry limit for this card. Please choose another card.",
 "로그인 세션이 만료됐거나 유효하지 않습니다. 다시 로그인해 주세요.": "Your session has expired or is invalid. Please sign in again."
};

export const artText=value=>artEnglish&&Object.hasOwn(english,value)?english[value]:value;

export function artError(error,fallback){
 if(error?.message==='LOGIN_REQUIRED')return artText('로그인 후 다시 이용해 주세요.');
 if(!artEnglish)return error?.message||fallback;
 if(error?.status===401)return artText('로그인 후 다시 이용해 주세요.');
 if(error?.data?.code==='moderation_blocked')return 'This image request was blocked by the safety check. Please choose another card.';
 const message=error?.message;
 return Object.hasOwn(english,message)?english[message]:artText(fallback);
}

export function translateArtMarkup(node){
 createArtMarkupRenderer(node)();
}

export function createArtMarkupRenderer(root){
 const bindings=[];
 function bind(value,read,write){
  const key=value?.trim();
  if(!key||!Object.hasOwn(english,key))return;
  let last=value;
  bindings.push(()=>{
   if(read()!==last)return;
   last=value.replace(key,()=>artText(key));
   if(read()!==last)write(last);
  });
 }
 function visit(node){
  if(node.nodeType===3){
   bind(node.nodeValue,()=>node.nodeValue,value=>node.nodeValue=value);
   return;
  }
  if(node.nodeType===1){
   if(['SCRIPT','STYLE'].includes(node.tagName)||node.getAttribute('translate')==='no')return;
   for(const attribute of ['aria-label','placeholder','alt','title']){
    bind(node.getAttribute(attribute),()=>node.getAttribute(attribute),value=>node.setAttribute(attribute,value));
   }
  }
  for(const child of node.childNodes)visit(child);
 }
 visit(root);
 return ()=>bindings.forEach(render=>render());
}
