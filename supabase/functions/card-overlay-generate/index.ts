
async function mobileWindowMask(width:number,height:number,r:{x:number,y:number,w:number,h:number}){
 const p={x:r.x*width/63,y:r.y*height/88,w:r.w*width/63,h:r.h*height/88};
 const raw=new Uint8Array((width*4+1)*height);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  // Pixel centres inside the selected window are opaque (preserved).
  if(x+.5>=p.x&&x+.5<p.x+p.w&&y+.5>=p.y&&y+.5<p.y+p.h)raw[y*(width*4+1)+1+x*4+3]=255;
 }
 const compressed=new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer());
 function chunk(type:string,data:Uint8Array){
  const bytes=new Uint8Array(data.length+12),v=new DataView(bytes.buffer);v.setUint32(0,data.length);
  for(let i=0;i<4;i++)bytes[4+i]=type.charCodeAt(i);bytes.set(data,8);
  let crc=0xffffffff;for(let i=4;i<bytes.length-4;i++){crc^=bytes[i];for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  v.setUint32(bytes.length-4,(crc^0xffffffff)>>>0);return bytes;
 }
 const header=new Uint8Array(13),hv=new DataView(header.buffer);hv.setUint32(0,width);hv.setUint32(4,height);header[8]=8;header[9]=6;
 const parts=[new Uint8Array([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',compressed),chunk('IEND',new Uint8Array())];
 return new Uint8Array(await new Blob(parts).arrayBuffer());
}
const MOBILE_CARD_IDS=new Set(["30th-en-001","30th-en-002","30th-en-003","30th-en-004","30th-en-005","30th-en-006","30th-en-007","30th-en-008","30th-en-009","30th-en-010","30th-en-011","30th-en-012","30th-en-013","30th-en-014","30th-en-016","30th-en-017","30th-en-018","30th-en-019","30th-en-020","30th-en-022","30th-en-023","30th-en-024","30th-en-025","30th-en-026","30th-en-027","30th-en-028","30th-en-029","30th-en-030","30th-en-031","30th-en-032","30th-en-033","30th-en-034","30th-en-035","30th-en-036","30th-en-037","30th-en-038","30th-en-039","30th-en-040","30th-en-041","30th-en-042","30th-en-043","30th-en-044","30th-en-045","30th-en-046","30th-en-047","30th-en-048","30th-en-049","30th-en-050","30th-en-051","30th-en-052","30th-en-055","30th-en-056","30th-en-057","30th-en-058","30th-en-059","30th-en-060","30th-en-061","30th-en-062","30th-en-063","30th-en-065","30th-en-067","30th-en-068","30th-en-069","30th-en-072","30th-en-073","30th-en-074","30th-en-075","30th-en-076","30th-en-077","30th-en-078","30th-en-079","30th-en-080","30th-en-081","30th-en-082","30th-en-083","30th-en-084","30th-en-085","30th-en-086","30th-en-087","30th-en-088","30th-en-089","30th-en-091","30th-en-093","30th-en-094","30th-en-095","30th-en-096","30th-en-097","30th-en-098","30th-en-099","30th-en-100","30th-en-101","30th-en-103","30th-en-104","30th-en-105","30th-en-106","30th-en-107","30th-en-108","30th-en-110","30th-en-111","30th-en-112","30th-en-113","30th-en-114","30th-en-115","30th-en-116","30th-en-117","30th-en-118","30th-en-119","30th-en-120","30th-en-121","30th-en-122","30th-en-123","30th-en-124","30th-en-125","m6a-ja-001","m6a-ja-002","m6a-ja-003","m6a-ja-004","m6a-ja-005","m6a-ja-006","m6a-ja-007","m6a-ja-008","m6a-ja-010","m6a-ja-011","m6a-ja-012","m6a-ja-013","m6a-ja-014","m6a-ja-016","m6a-ja-017","m6a-ja-018","m6a-ja-019","m6a-ja-020","m6a-ja-021","m6a-ja-022","m6a-ja-023","m6a-ja-024","m6a-ja-025","m6a-ja-026","m6a-ja-027","m6a-ja-028","m6a-ja-029","m6a-ja-030","m6a-ja-031","m6a-ja-032","m6a-ja-033","m6a-ja-034","m6a-ja-035","m6a-ja-036","m6a-ja-037","m6a-ja-038","m6a-ja-039","m6a-ja-040","m6a-ja-041","m6a-ja-042","m6a-ja-043","m6a-ja-044","m6a-ja-045","m6a-ja-046","m6a-ja-049","m6a-ja-050","m6a-ja-051","m6a-ja-052","m6a-ja-053","m6a-ja-054","m6a-ja-056","m6a-ja-058","m6a-ja-060","m6a-ja-061","m6a-ja-062","m6a-ja-063","m6a-ja-064","m6a-ja-065","m6a-ja-066","m6a-ja-067","m6a-ja-068","m6a-ja-069","m6a-ja-070","m6a-ja-071","m6a-ja-072","m6a-ja-073","m6a-ja-074","m6a-ja-075","m6a-ja-077","m6a-ja-078","m6a-ja-079","m6a-ja-080","m6a-ja-082","m6a-ja-083","m6a-ja-084","m6a-ja-085","m6a-ja-086","m6a-ja-087","m6a-ja-089","m6a-ja-090","m6a-ja-091","m6a-ja-092","m6a-ja-093","m6a-ja-094","m6a-ja-095","m6a-ja-096","m6a-ja-097","m6a-ja-098","m6a-ja-099","m6a-ja-100","m6a-ja-136","m6a-ja-137","m6a-ja-139","m6a-ja-140","m6a-ja-141","m6a-ja-142","m6a-ja-143","m6a-ja-144","m6a-ja-145","m6a-ja-146","m6a-ja-147","m6a-ja-148","m6a-ja-149","m6a-ja-150","m6a-ja-162","m6a-ko-01M1FTJCD6DHFNG4Q0B46DKXJN","m6a-ko-01M1FTJF1866F4BZPSYG4H9DTY","m6a-ko-01M1FTJHCVMMM9A9WW445SF9AS","m6a-ko-01M1FTJJAFV723W341Z6PXFFSR","m6a-ko-01M1FTJMQBFRRMPC36B0PCZE6R","m6a-ko-01M1FTJPJQYW197J1EDGFCJ26A","m6a-ko-01M1FTJQMAFYXD92KCQJ78Z1S8","m6a-ko-01M1FTJRYEJ4SFHD3QYXNKCRM3","m6a-ko-01M1FTJTA3DHNK23Q92WC11VBC","m6a-ko-01M1FTJWA1QN7PX4XGN7DF1Q3R","m6a-ko-01M1FTJX7S4CGPE21T177GP8MK","m6a-ko-01M1FTJYRYSRB9T4Q45FN10HZ4","m6a-ko-01M1FTJZJG2M8J5CZTFXX6T08G","m6a-ko-01M1FTK0JA3M8QMNRVK8GPMY6H","m6a-ko-01M1FTK1GHT66NBH2QA18FJJ8Z","m6a-ko-01M1FTK2EHXXWR64REFSNSSPQ1","m6a-ko-01M1FTK3DG7210M7MR4FS7T5TF","m6a-ko-01M1FTK4AA6Z5QJ7V44YAQ268X","m6a-ko-01M1FTK5D2F249G57SQCSAS8DC","m6a-ko-01M1FTK693GCWE9D4Z559JTMK4","m6a-ko-01M1FTK73JHJAYCCDKD86XEVF4","m6a-ko-01M1FTK7RY7QQDBTRW4BN1W7T4","m6a-ko-01M1FTK8KK56PZ761A8XZ27WEB","m6a-ko-01M1FTKC79T9PR0FEBZNHG7PMG","m6a-ko-01M1FTKEHC8GF0N671QJBV9CFF","m6a-ko-01M1FTKGYWKHJFVJTG3V8VVVD7","m6a-ko-01M1FTKJ1XZ2YMA9Q8CBDPKXQM","m6a-ko-01M1FTKJY63Q30T5ZRJY3ZN83N","m6a-ko-01M1FTKKV5WZ3YQDD3XG1HPFGX","m6a-ko-01M1FTKNAV24K9RGGTVMRPSCV9","m6a-ko-01M1FTKPCWNK0VFE6H224VE99E","m6a-ko-01M1FTKQYMWBBYPHCWC809144E","m6a-ko-01M1FTMBN04PN5DG1XZSBFWCZN","m6a-ko-01M2FH69JAZMKQTC3XYZCC4JY2","m6a-ko-01M2FH6BDSPPTNDF90VZ7CHNZT","m6a-ko-01M2FH6CADN3BWW0885JK8WW4J","m6a-ko-01M2FH6D0Y1QM3ECGDT937VSJE","m6a-ko-01M2FKPHRVHABKX7QV0YY7RJ13","m6a-ko-01M2FKPJ7F4A0FKPW101RMT8EX","m6a-ko-01M2FKPJMKE9DXYZXZ2PP1XFPP","m6a-ko-01M2FKPJZ4F86QJ7M8NE4WV9YJ","m6a-ko-01M2FKPKD4NQNN1PW1BNJ9985Z","m6a-ko-01M2FKPKYSP06271BMYDA5HR1B","m6a-ko-01M2FKPM9PG0G9K3HP1PWG471K","m6a-ko-01M2FKPMP6BPNMDBN5WYSZTZ4Y","m6a-ko-01M2FKPMZ2W83HAT1H5FA71SDV","m6a-ko-01M2FKPN7RMR93B8WMDCDR7WQP","m6a-ko-01M2FKPNMNA42WNTVEJ1Q758XN","m6a-ko-01M2FKPNVY47275WT9N6B5Q3VR","m6a-ko-01M2FKPP5HDMEKEEQ63C2549XQ","m6a-ko-01M2FKPPGAM3TC0YS9RB32DWKN","m6a-ko-01M2FKPPV76SMRA2MRRH3TARKR","m6a-ko-01M2FKPQ5YM3T9JW6WGD49W4FQ","m6a-ko-01M2FKPQMN6T2RYF46CJTT5240","m6a-ko-01M2FKPR365E672QCZRGXJWG0C","m6a-ko-01M2FKPRBP287EE3VRF7054H6Q","m6a-ko-01M2FKPRMBDV5CMQ3R8H1ZAYFR","m6a-ko-01M2FKPRTHE43FRQNT31JDPT23","m6a-ko-01M2FKPRZSHP1K9AA3MFSWCQKC","m6a-ko-01M2FKPS5HXV4QKRQF8WG66JNX","m6a-ko-01M2FKPSCAQXKHQD930T24KVED","m6a-ko-01M2FKPSM4T57YF137443C9TVR","m6a-ko-01M2FKPSSWNRVCPFGVYJ8VFHKZ","m6a-ko-01M2FKPSZEEMAD8NA2158SPZ04","m6a-ko-01M2FKPT67EY1YCTM16NPXMA80","m6a-ko-01M2FKPTCKPN60N42SQGXWX2QT","m6a-ko-01M2FKPTMZF5BG1R9CDWCWXGZ2","m6a-ko-01M2FKPTVABH84Z92PGKRAM66R","m6a-ko-01M2FKPV241F9DBZ145A21KJZ6","m6a-ko-01M2FKPVB16XSPJ0FWCQ4T4PHK","m6a-ko-01M2FKPVQDC5412TG2N6W4ZEHC","m6a-ko-01M2FKPW2E1YA7QZZ1VMPW3K89","m6a-ko-01M2FKPWBJWD49Q4NBH228JMMR","m6a-ko-01M2FKPWRKEJ08HWF7NVMBTT1D","m6a-ko-01M2FKPX3M81D249MBW2W8S94T","m6a-ko-01M2FKPXR8WZ8VS98GFD07ZFAX","m6a-ko-01M2FKPY0YWKBBFM932W410EY1","m6a-ko-01M2FKPY9E3FWTBANXRKDSDA1R","m6a-ko-01M2FKPYNH6MWE53T3XK6MJ9N1","m6a-ko-01M2FKPYX2NTD9M93VH85Z3B04","m6a-ko-01M2FKPZ64RWVA2DEN4WZ5ET75","m6a-ko-01M2FKPZVF988TSXE2JZYWVS26","m6a-ko-01M2FKQ04TJ9J0TS59HJW1EE5S","m6a-ko-01M2FKQ0GYQDPS7DH39JGBP543","m6a-ko-01M2FKQ0S55HECW9CSRKMFGDNE","m6a-ko-01M2FKQ11RP549D09ARMYB89WQ","m6a-ko-01M2FKQ1CQ9M5382T32YBTD905","m6a-ko-01M2FKQ1S3HRQQTDZMKYF8YDQY","m6a-ko-01M2FKQ23P49HQP66NVBVZSP1H","m6a-ko-01M2FKQ2K9TRZ62MC6J931BXEF","m6a-ko-01M2FKQ30KW1Z8YWH09A5K3BP9","m6a-ko-01M2FKQ85437R7FBSPF3FD3QQQ","m6a-ko-01M2FKQ8G3PGR39NDGPEJ2KC25","m6a-ko-01M2FKQ8PS7ZWBHF02RXB53RP5","m6a-ko-01M2FKQ8Y1D0V1MK1EG3EDMRCA","m6a-ko-01M2FKQ937YTQ589PB5G3EGE77","m6a-ko-01M2FKQ98QJF9JXXXFG7P0A359","m6a-ko-01M2FKQ9GE34J7EQ3SV6FY7HK1","m6a-ko-01M2FKQ9QV45T6HD5SSW4MXVVW","m6a-ko-01M2FKQA1MJV5YCTVCX1H2XGNA","m6a-ko-01M2FKQAB68QAB3337QB369BKW","m6a-ko-01M2FKQAJX8SWRMGPASMAQ2EMJ","m6a-ko-01M2FKQB0B7FB71R6K50AFYXSV","m6a-ko-01M2FKQB5WPDFZX9HAVCHEP3FB","m6a-ko-01M2FKQDR0D93JYR8MGEMZ49TC"]);
// Test-only endpoint. No generation is enabled without explicit server-side configuration.
// verify_jwt=false: validate every user token with this project Auth /user below.
// This accepts current signing keys without trusting decoded client JWT claims.
const FULL_ART_PROMPT="첨부한 카드 한 장을 원본으로 사용해 풀아트로 편집해줘. 이전 카드나 완성 예시의 캐릭터·글자·숫자·구도를 가져오지 마. 이번 원본에 보이는 내용만 기준으로 판단해줘.\n\n【작업 방식 — 가장 중요】\n원본 카드의 바깥 가장자리를 최종 화면의 기준으로 고정해줘. 원본 이미지 전체나 안쪽 일러스트를 확대·축소·이동하지 마.\n\n먼저 다음 요소를 원본에서 그대로 보존할 영역으로 분리해줘.\n1. 네 변과 둥근 모서리를 감싸는 바깥 홀로그램 띠\n2. 안쪽 일러스트에 있는 캐릭터와 기존 풍경 전체\n3. 카드의 모든 글자·숫자·기호·배지·기념 로고\n4. 하단 은색 구분선과 그 밖의 유지할 장식\n\n이 영역은 새로 그리거나 재해석하지 말고 원본 픽셀과 위치를 유지해줘. 특히 캐릭터의 얼굴, 몸, 귀, 팔, 발, 꼬리의 크기와 좌표를 바꾸지 마. 완성본의 캐릭터와 글자 위에 원본을 겹쳤을 때 정확히 포개져야 해.\n\n【편집할 영역만 지정】\n새로 생성하거나 교체할 부분은 아래 세 곳으로 한정해줘.\n- 안쪽 일러스트를 둘러싼 사각 프레임의 네 변\n- 일러스트 아래에 전국도감 정보 바가 있는 경우, 그 바와 바 안의 글자\n- 기존의 단색 카드 패널 배경\n\n전국도감 바가 없는 카드에는 없는 바를 만들지 마. 바를 제거한 자리에는 은색 선, 그림자, 글자 흔적이나 수평 경계가 남지 않게 해줘.\n\n【풍경 확장】\n원본 일러스트의 위·아래·왼쪽·오른쪽 끝에 있는 풍경을 바깥쪽으로 이어 그려줘. 원본의 화풍, 색, 빛, 원근감, 붓질·점묘 및 홀로그램 질감을 따라 이름과 HP 뒤, 기술과 설명 뒤, 하단 정보 뒤까지 하나의 연속된 장면을 만들어줘.\n\n특히 일러스트의 아래쪽 풍경은 제거한 도감 바 자리를 통과해 카드 하단까지 자연스럽게 이어져야 해. 프레임이 있던 네 변에도 사각형 윤곽, 색 차이, 붙여 넣은 자국이 보이면 안 돼. 새 풍경은 바깥 홀로그램 띠의 안쪽까지만 채워줘.\n\n【원본 요소 재배치 금지】\n이번 원본에 실제로 적힌 이름, HP, 속성·에너지 기호, 기술명과 설명, 데미지, 약점·저항력·후퇴 표시, 일러스트레이터, 카드 번호, 수록 번호, 하단 설명과 저작권 표기의 글자·숫자·줄바꿈·크기·위치를 그대로 유지해줘. 큰 기념 로고나 작은 배지가 있다면 각각 원래 위치와 크기로 보존하고 주변 배경만 바꿔줘. 원본에 없는 캐릭터, 정보, 장식은 추가하지 마.\n\n【최종 검사】\n원본과 결과물을 바깥 가장자리 기준으로 겹쳐 비교해줘. 캐릭터의 특징점, 모든 유지할 글자·기호·로고, 바깥 홀로그램 띠가 같은 좌표에 있는지 확인해줘. 하나라도 확대·이동·변형됐다면 그 부분은 생성 결과 대신 원본 요소를 복원해줘.\n\n최종 출력은 가로 63 × 세로 88mm 비율의 정면 카드 이미지 한 장. 카드 밖 여백, 손, 슬리브, 목업, 치수, 점선, 재단선은 넣지 마.";
const ILLUSTRATION_PROMPT="첨부한 카드 한 장을 원본으로 사용해 카드 정보와 테두리가 없는 순수 일러스트로 확장 편집해줘. 이전 카드나 완성 예시의 캐릭터·글자·숫자·구도를 가져오지 말고 이번 원본에 보이는 그림만 기준으로 판단해줘.\n\n【작업 방식 — 가장 중요】\n원본 카드의 바깥 가장자리를 최종 화면의 좌표 기준으로 고정해줘. 원본 이미지 전체나 안쪽 일러스트를 확대·축소·이동하지 마. 안쪽 일러스트에 있는 캐릭터와 기존 풍경 전체는 보존해줘. 특히 얼굴, 몸, 귀, 팔, 발, 꼬리의 크기와 좌표를 바꾸지 마. 완성본의 원래 일러스트 위에 원본을 겹쳤을 때 같은 위치와 크기로 포개져야 해.\n\n【제거하고 풍경으로 채울 영역】\n카드의 모든 글자·숫자·기호·카드 정보·로고·배지·장식을 제거해줘. 이름, HP, 속성·에너지 기호, 기술명과 설명, 데미지, 약점·저항력·후퇴 표시, 전국도감 바와 그 안의 글자, 일러스트레이터, 카드 번호, 수록 번호, 하단 설명과 저작권 표기, 큰 기념 로고와 작은 배지도 남기지 마.\n일러스트를 둘러싼 사각 프레임 네 변, 카드 바깥 가장자리의 테두리와 홀로그램 띠, 둥근 모서리 장식, 하단 은색 구분선, 단색 카드 패널도 제거해줘. 원래 풍경 속 물체와 캐릭터의 무늬는 카드 UI와 구분해 보존해줘.\n제거한 자리는 주변 풍경으로 채우고 글자 흔적, 은색 선, 그림자, 수평 경계, 사각 윤곽을 남기지 마. 원본에 없는 정보 바나 장식을 새로 만들지 마.\n\n【풍경 확장】\n원본 일러스트의 위·아래·왼쪽·오른쪽 끝에 있는 풍경을 바깥쪽으로 이어 그려줘. 원본의 화풍, 색, 빛, 원근감, 붓질·점묘와 풍경의 질감을 따라 카드 전체를 하나의 연속된 장면으로 만들어줘. 아래쪽 풍경은 제거한 도감 바와 기술 패널 자리를 통과해 카드 하단까지 자연스럽게 이어줘. 바깥 테두리가 있던 영역도 풍경으로 채워 이미지의 네 변 끝까지 빈틈없이 이어줘. 홀로그램 테두리를 새로 만들지 마.\n프레임이 있던 네 변에 색 차이, 붙여 넣은 자국이나 사각형 경계를 남기지 마. 원본 캐릭터를 다시 그리거나 반복·복제·미러링하지 마. 캐릭터의 몸을 연장하거나 새로운 신체 부위, 다른 캐릭터, 글자, 로고, 프레임을 추가하지 마. 새로 생성하는 내용은 주변 풍경으로 한정해줘.\n\n【최종 검사】\n원본과 결과물을 바깥 가장자리 기준으로 겹쳐 비교해줘. 원래 일러스트와 캐릭터의 특징점이 같은 좌표와 크기에 있는지 확인하고, 확대·이동·변형된 부분은 원본 그림으로 복원해줘. 카드의 글자·숫자·기호·로고·배지·구분선·내부 프레임·바깥 테두리가 남아 있지 않은지도 확인해줘.\n\n최종 출력은 가로 63 × 세로 88mm 비율의 정면 순수 일러스트 이미지 한 장. 직사각형 캔버스 네 모서리까지 풍경으로 채워줘. 카드 밖 여백, 손, 슬리브, 목업, 치수, 점선, 재단선은 넣지 마.";
const origins = new Set(['https://funypin.kr','https://www.funypin.kr']);
const env=(key:string)=>Deno.env.get(key)?.trim()||'';
function png(data:unknown,fullArt=false){
 if(typeof data!=='string'||!data.startsWith('data:image/png;base64,')||data.length>8_000_000)throw Error('PNG_REQUIRED');
 const raw=atob(data.slice(22)),b=Uint8Array.from(raw,c=>c.charCodeAt(0));
 if(b.length<24||[137,80,78,71,13,10,26,10].some((v,i)=>b[i]!==v))throw Error('PNG_REQUIRED');
 const d=new DataView(b.buffer),w=d.getUint32(16),h=d.getUint32(20);if(fullArt?!(w===1008&&h===1408):!((w===1024&&h===1536)||(w===1072&&h===1472)))throw Error('INVALID_SIZE');return b;
}
console.info('overlay_config '+JSON.stringify({apiKeyConfigured:!!env('OPENAI_API_KEY'),enabled:env('OVERLAY_ENABLED')==='true'}));
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'',headers:Record<string,string>={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
 if(origins.has(origin))headers['Access-Control-Allow-Origin']=origin;
 headers['Access-Control-Allow-Headers']='authorization,apikey,content-type,x-client-info';headers['Access-Control-Allow-Methods']='POST,OPTIONS';
 const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
 if(origin&&!origins.has(origin))return reply({error:'허용되지 않은 요청입니다.'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply({error:'POST 요청만 가능합니다.'},405);
 const url=env('SUPABASE_URL'),anon=env('SUPABASE_ANON_KEY'),service=env('SUPABASE_SERVICE_ROLE_KEY'),token=req.headers.get('Authorization')||'';
 const unauthorized=()=>reply({error:'로그인 세션이 만료됐거나 유효하지 않습니다. 다시 로그인해 주세요.',code:'AUTH_REQUIRED'},401);
 if(!/^Bearer [^\s]+$/i.test(token)||token.length>8192)return unauthorized();
 try{
  const auth=await fetch(url+'/auth/v1/user',{headers:{apikey:anon,Authorization:token},signal:AbortSignal.timeout(10000)});
  if(auth.status===429||auth.status>=500)return reply({error:'로그인 인증 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.',code:'AUTH_UNAVAILABLE'},503);
  const user=await auth.json().catch(()=>null);
  if(!auth.ok||!user||typeof user.id!=='string'||!user.id||user.is_anonymous)return unauthorized();
  if(Number(req.headers.get('content-length')||0)>17_000_000)return reply({error:'이미지 크기가 너무 큽니다.'},413);
  const body=await req.text();if(body.length>17_000_000)return reply({error:'이미지 크기가 너무 큽니다.'},413);
  let data;try{data=JSON.parse(body);}catch{return reply({error:'올바른 요청이 아닙니다.'},400);}
  // app_metadata is admin-controlled; never authorize from user_metadata.
  const allowed=user.app_metadata?.card_overlay_test===true||env('OVERLAY_TEST_USER_IDS').split(',').map(s=>s.trim()).filter(Boolean).includes(user.id);
  const key=env('OPENAI_API_KEY'),enabled=env('OVERLAY_ENABLED')==='true';
  const ready=allowed&&enabled&&!!key;
  if(data.action==='status')return reply({ready,allowed,apiConfigured:allowed?!!key:undefined,message:!allowed?'현재 지정된 테스트 계정만 AI 생성을 사용할 수 있습니다.':!key?'테스트 계정 등록 완료 · AI API 키 연결 준비 중입니다. 확장 아트 불러오기는 사용할 수 있습니다.':!enabled?'테스트 계정 등록 완료 · AI 생성 활성화 준비 중입니다.':'AI 연결 완료 · 테스트 계정별 횟수 제한 없음 · 전체 하루 50회 시도 한도'});
  const savedHeaders={apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'};
  const outputBucket='overlay-generated-images';
  const savedFetch=(path:string,options:RequestInit={})=>fetch(url+path,{...options,headers:{...savedHeaders,...options.headers},signal:AbortSignal.timeout(15000)});
  const ownedQuery=(id:string)=>'/rest/v1/overlay_generations?id=eq.'+id+'&user_id=eq.'+encodeURIComponent(user.id);
  const validId=(id:unknown)=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const readOwner=async(id:string)=>{const res=await savedFetch(ownedQuery(id)+'&select=*');if(!res.ok)throw Error('HISTORY_UNAVAILABLE');return (await res.json())[0];};
  if(data.action==='symbol_asset'){
   if(!allowed)return reply({error:'테스트 계정만 사용할 수 있습니다.'},403);
   const res=await savedFetch('/rest/v1/overlay_symbol_assets?id=eq.anniversary-yellow-v1&select=image_path,placement');
   if(!res.ok)return reply({error:'공통 심볼 정보를 불러오지 못했어요.'},503);
   const row=(await res.json())[0];if(!row||row.image_path!=='shared-assets/anniversary-yellow-v1.png')return reply({error:'공통 심볼이 준비되지 않았어요.'},503);
   const sign=await savedFetch('/storage/v1/object/sign/'+outputBucket+'/'+row.image_path,{method:'POST',body:JSON.stringify({expiresIn:600})});
   if(!sign.ok)return reply({error:'공통 심볼을 불러오지 못했어요.'},503);const signed=await sign.json();
   return reply({symbol:{imageUrl:url+'/storage/v1'+signed.signedURL,placement:row.placement}});
  }
  if(['generations','load_generation','save_result'].includes(data.action)){
   if(!allowed)return reply({error:'테스트 계정만 사용할 수 있습니다.'},403);
   if(data.action==='generations'){
    const res=await savedFetch('/rest/v1/overlay_generations?user_id=eq.'+encodeURIComponent(user.id)+'&select=id,mode,result_kind,width,height,window_rect,source_reference_id,source_card_label,created_at&order=created_at.desc&limit=20');
    if(!res.ok)return reply({error:'저장된 이미지 목록을 불러오지 못했어요.'},503);return reply({generations:await res.json()});
   }
   if(!validId(data.id))return reply({error:'올바른 저장 이미지가 아닙니다.'},400);
   const row=await readOwner(data.id);if(!row)return reply({error:'저장 이미지를 찾을 수 없습니다.'},404);
   const prefix=user.id+'/'+row.id+'/';if(!row.image_path.startsWith(prefix)||!row.raw_path.startsWith(prefix))throw Error('INVALID_IMAGE_PATH');
   if(data.action==='load_generation'){
    const sign=await savedFetch('/storage/v1/object/sign/'+outputBucket+'/'+row.image_path,{method:'POST',body:JSON.stringify({expiresIn:600})});
    if(!sign.ok)return reply({error:'저장 이미지를 불러오지 못했어요.'},503);const signed=await sign.json();
    return reply({generation:{id:row.id,mode:row.mode,result_kind:row.result_kind,width:row.width,height:row.height,window_rect:row.window_rect,source_card_label:row.source_card_label,created_at:row.created_at,imageUrl:url+'/storage/v1'+signed.signedURL}});
   }
   let prepared;try{prepared=png(data.image,['fullart','illustration'].includes(row.mode));}catch{return reply({error:'저장할 이미지의 형식이나 크기가 올바르지 않습니다.'},400);}
   const view=new DataView(prepared.buffer);if(view.getUint32(16)!==row.width||view.getUint32(20)!==row.height)return reply({error:'생성 결과와 저장할 이미지의 크기가 다릅니다.'},400);
   const imagePath=prefix+'prepared.png';
   const upload=await savedFetch('/storage/v1/object/'+outputBucket+'/'+imagePath,{method:'POST',headers:{'Content-Type':'image/png','x-upsert':'true'},body:prepared});if(!upload.ok)return reply({error:'이미지 저장에 실패했어요. 현재 결과를 다운로드해 주세요.'},503);
   const patch=await savedFetch(ownedQuery(data.id),{method:'PATCH',body:JSON.stringify({image_path:imagePath,result_kind:'prepared',updated_at:new Date().toISOString()})});
   if(!patch.ok)return reply({error:'보정 이미지의 저장 정보를 갱신하지 못했어요. AI 원본은 보관됩니다.'},503);
   return reply({stored:true,generationId:row.id});
  }
  if(data.action==='references'||data.action==='reference'||data.action==='mobile_catalog'){
   if(!allowed)return reply({error:'테스트 계정만 사용할 수 있습니다.'},403);
   const h={apikey:service,Authorization:'Bearer '+service};
   if(data.action==='references'||data.action==='mobile_catalog'){
    const references=[];
    // Stable unique-id order prevents equal card numbers across languages from shifting pages.
    for(let page=0;page<10;page++){
     const res=await fetch(url+'/rest/v1/overlay_art_references?select=id,card_number,display_name,source_language,art_rect,descriptor&order=id.asc&limit=500&offset='+page*500,{headers:h});
     if(!res.ok)throw Error('CATALOG_UNAVAILABLE');const rows=await res.json();if(!Array.isArray(rows))throw Error('CATALOG_UNAVAILABLE');references.push(...rows);
     if(rows.length<500)return reply({references:data.action==='mobile_catalog'?references.filter(r=>/^(30th-en-|m6a-(ko|ja)-)/.test(r.id)).map(r=>({id:r.id,card_number:r.card_number,display_name:r.display_name,source_language:r.source_language,art_rect:r.art_rect,supported:MOBILE_CARD_IDS.has(r.id)})):references});
    }
    throw Error('CATALOG_TOO_LARGE');
   }
   if(typeof data.id!=='string'||!/^(?:(?:30th|me55cc)-en-[0-9]{3}|m6a-ko-[0-9A-HJKMNP-TV-Z]{26}|m6a-ja-(?:[0-9]{3}|151152|gra|fir|wat|lig|psy|fig|dar|met))$/.test(data.id))return reply({error:'올바른 참조 카드가 아닙니다.'},400);
   const res=await fetch(url+'/rest/v1/overlay_art_references?select=id,display_name,card_number,image_path,art_rect&id=eq.'+data.id,{headers:h});if(!res.ok)throw Error('CATALOG_UNAVAILABLE');const row=(await res.json())[0];if(!row)return reply({error:'등록된 이미지가 없습니다.'},404);
   const sign=await fetch(url+'/storage/v1/object/sign/overlay-art-references/'+row.image_path,{method:'POST',headers:{...h,'Content-Type':'application/json'},body:JSON.stringify({expiresIn:3600})});if(!sign.ok)throw Error('IMAGE_UNAVAILABLE');const signed=await sign.json();return reply({reference:{...row,imageUrl:url+'/storage/v1'+signed.signedURL}});
  }
  if(data.action==='report_quality'){
   if(!allowed)return reply({error:'테스트 계정만 보고할 수 있습니다.'},403);
   const valid=typeof data.requestId==='string'&&/^req_[a-zA-Z0-9]{1,100}$/.test(data.requestId)&&typeof data.accepted==='boolean'&&Number.isFinite(data.correlation)&&data.correlation>=-1.001&&data.correlation<=1.001&&Number.isFinite(data.mae)&&data.mae>=0&&data.mae<=255;
   if(!valid)return reply({error:'올바른 품질 보고가 아닙니다.'},400);
   console.info('overlay client quality',{requestId:data.requestId,accepted:data.accepted,correlation:data.correlation,mae:data.mae});
   return reply({reported:true});
  }
  const mobileWindowEdit=data.action==='generate_mobile';
  if(mobileWindowEdit){
   if(!allowed)return reply({error:'현재 테스트 계정만 사용할 수 있습니다.'},403);
   if(!MOBILE_CARD_IDS.has(data.sourceReferenceId))return reply({error:'이 카드는 일반 일러스트 창이 없는 타입으로 현재 확장을 지원하지 않습니다.'},400);
   data.action='generate_fullart';
  }
  // Source labels are descriptive metadata, never trusted as cache identity or proof of image ownership.
  const sourceReferenceId=data.sourceReferenceId,sourceCardLabel=data.sourceCardLabel;
  delete data.sourceReferenceId;delete data.sourceCardLabel;
  if(sourceCardLabel!=null&&(typeof sourceCardLabel!=='string'||sourceCardLabel.length>160))return reply({error:'카드 정보는 160자 이내로 입력해 주세요.'},400);
  let sourceLabel=typeof sourceCardLabel==='string'?sourceCardLabel.trim():null,sourceId=null;
  if(sourceReferenceId!=null){
   if(typeof sourceReferenceId!=='string'||! /^[a-zA-Z0-9-]{1,80}$/.test(sourceReferenceId))return reply({error:'올바른 원본 카드가 아닙니다.'},400);
   if(!allowed)return reply({error:'테스트 계정만 사용할 수 있습니다.'},403);
   const ref=await savedFetch('/rest/v1/overlay_art_references?id=eq.'+encodeURIComponent(sourceReferenceId)+'&select=id,display_name,card_number,source_language');
   if(!ref.ok)return reply({error:'원본 카드 정보를 확인하지 못했어요.'},503);
   const row=(await ref.json())[0];if(!row)return reply({error:'등록된 원본 카드가 없습니다.'},400);
   sourceId=row.id;sourceLabel=[row.display_name,row.card_number,row.source_language].join(' · ');
  }
  const independent=data.action==='generate_background',illustration=data.action==='generate_illustration',fullArt=data.action==='generate_fullart'||illustration;
  const paletteMode=data.action==='generate_palette_background',extractMode=data.action==='generate_background_extract',noImage=independent||paletteMode;
  const themes:Record<string,string>={forest:'a sunlit woodland clearing with foliage, moss and grasses',meadow:'an open grassy meadow under a softly clouded sky',ocean:'a calm ocean shoreline with gentle waves',space:'a quiet starfield with soft distant nebulae'};
  if(independent&&(!Object.hasOwn(themes,data.theme)||Object.keys(data).some(k=>!['action','theme','printRect'].includes(k))))return reply({error:'배경 테마만 전송해 주세요. 원본 이미지는 사용할 수 없습니다.'},400);
  if(fullArt&&Object.keys(data).some(k=>!['action','image','printRect'].includes(k)))return reply({error:'풀아트 모드에는 카드 이미지 한 장만 전송해 주세요.'},400);
  if(paletteMode&&(!Object.hasOwn(themes,data.theme)||!Array.isArray(data.palette)||data.palette.length!==4||!data.palette.every((color:unknown)=>typeof color==='string'&&/^#[0-9a-fA-F]{6}$/.test(color))||Object.keys(data).some(k=>!['action','theme','palette','printRect'].includes(k))))return reply({error:'배경 테마와 색상값 4개만 전송할 수 있습니다.'},400);
  if(extractMode){const m=data.extractMeta;if(!m||!Number.isFinite(m.backgroundRatio)||m.backgroundRatio<0||m.backgroundRatio>1||!Number.isFinite(m.confidence)||m.confidence<0||m.confidence>1||!data.anchor||Object.keys(data).some(k=>!['action','image','mask','anchor','printRect','extractMeta'].includes(k)))return reply({error:'추출 배경 요청 데이터가 올바르지 않습니다.'},400);}
  if(data.action!=='generate'&&!noImage&&!fullArt&&!extractMode)return reply({error:'지원하지 않는 요청입니다.'},400);
  if(!allowed)return reply({error:'AI 생성 테스트 대상 계정이 아닙니다.'},403);
  if(!ready)return reply({error:'AI 생성 연결 준비 중입니다.'},503);
  const windowRect=data.printRect;
  if(mobileWindowEdit&&!windowRect)return reply({error:'일러스트 창 좌표가 필요합니다.'},400);
  if(windowRect!==undefined&&(!windowRect||['x','y','w','h'].some(k=>typeof windowRect[k]!=='number'||!Number.isFinite(windowRect[k]))||windowRect.x<0||windowRect.y<0||windowRect.w<5||windowRect.h<5||windowRect.x+windowRect.w>63||windowRect.y+windowRect.h>88))return reply({error:'출력 창 좌표가 올바르지 않습니다.'},400);

  let image=new Uint8Array(),mask=new Uint8Array();try{if(!noImage){image=png(data.image,fullArt);if(!fullArt)mask=png(data.mask);}}catch{return reply({error:'이미지 형식 또는 크기가 올바르지 않습니다.'},400);}
  const imageView=new DataView(image.buffer),maskView=new DataView(mask.buffer),imageWidth=noImage?1072:imageView.getUint32(16),imageHeight=noImage?1472:imageView.getUint32(20);
  if(!noImage&&!fullArt&&(imageWidth!==maskView.getUint32(16)||imageHeight!==maskView.getUint32(20)))return reply({error:'이미지와 마스크 크기가 다릅니다.'},400);
  if(mobileWindowEdit)mask=await mobileWindowMask(imageWidth,imageHeight,windowRect);
  // Durable atomic quota slots, shared by all edge isolates. Markers are private,
  // created using service credentials; clients receive no bucket access.
  const storageHeaders={apikey:service,Authorization:'Bearer '+service};
  const bucket='overlay-generation-limits';
  const bucketRes=await fetch(url+'/storage/v1/bucket/'+bucket,{headers:storageHeaders});
  if(bucketRes.status===404||bucketRes.status===400){
   const create=await fetch(url+'/storage/v1/bucket',{method:'POST',headers:{...storageHeaders,'Content-Type':'application/json'},body:JSON.stringify({id:bucket,name:bucket,public:false,file_size_limit:1024,allowed_mime_types:['application/json']})});
   if(!create.ok){const check=await fetch(url+'/storage/v1/bucket/'+bucket,{headers:storageHeaders});if(!check.ok)throw Error('QUOTA_UNAVAILABLE');}
  }else if(!bucketRes.ok)throw Error('QUOTA_UNAVAILABLE');
  const day=new Date(Date.now()+9*3600000).toISOString().slice(0,10);
  async function reserve(prefix:string,max:number){for(let i=0;i<max;i++){
   const res=await fetch(`${url}/storage/v1/object/${bucket}/${day}/${prefix}/${i}.json`,{method:'POST',headers:{...storageHeaders,'Content-Type':'application/json','x-upsert':'false'},body:JSON.stringify({at:new Date().toISOString()})});
   if(res.ok)return true;const error=await res.json().catch(()=>({}));if(res.status!==409&&error.error!=='Duplicate'&&error.code!=='Duplicate'&&error.message!=='The resource already exists')throw Error('QUOTA_UNAVAILABLE');
  }return false;}
  // Allowlisted QA accounts have no per-account daily attempt limit.
  if(!await reserve('global',50))return reply({error:'오늘 테스트 전체 생성 한도에 도달했어요.'},429);
  const digest=async(bytes:Uint8Array)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('');
  const model=env('OVERLAY_IMAGE_MODEL')||'gpt-image-2.5-sunburst';
  const diagnostic={model,promptVersion:'overlay-background-continuity-v2',imageHash:await digest(image),maskHash:await digest(mask)};
  const form=new FormData();form.set('model',model);form.set('size',imageWidth+'x'+imageHeight);form.set('quality','medium');form.set('n','1');form.set('output_format','png');
  if(!noImage){form.set('image[]',new Blob([image],{type:'image/png'}),'source.png');if(!fullArt||mobileWindowEdit)form.set('mask',new Blob([mask],{type:'image/png'}),'mask.png');}
  const anchor=data.anchor;
  const hasAnchor=anchor&&['x','y','w','h'].every(k=>typeof anchor[k]==='number'&&Number.isFinite(anchor[k]))&&anchor.x>=0&&anchor.y>=0&&anchor.w>0&&anchor.h>0&&anchor.x+anchor.w<=imageWidth&&anchor.y+anchor.h<=imageHeight;
  if(extractMode&&!hasAnchor)return reply({error:'배경 추출 창 좌표가 올바르지 않습니다.'},400);
  const placement=hasAnchor?' The fixed source rectangle in the '+imageWidth+' by '+imageHeight+' canvas is x='+anchor.x.toFixed(1)+', y='+anchor.y.toFixed(1)+', width='+anchor.w.toFixed(1)+', height='+anchor.h.toFixed(1)+'.':'';
  form.set('prompt','Perform a localized background outpainting edit of the supplied canvas. The opaque region of the mask contains the fixed source illustration; keep this region unchanged at its exact pixel position and scale.'+placement+' Fill only the transparent masked area with the continuation of the existing environment. Continue the sky, horizon, ground, water, shadows, lighting and surface texture directly from each source edge. Keep the same horizon height and perspective. Do not recompose, recenter, zoom, rescale or move the source illustration. Do not redraw, repeat, mirror or duplicate its subject anywhere else. Do not extend a character or invent new body parts; only continue the surrounding scenery. Do not add characters, text, logos, borders, card UI or frames. Match the existing colors and texture at the boundary, without placing an outline, panel, collage seam or second copy of the illustration.');
  if(fullArt){form.set('prompt',illustration?ILLUSTRATION_PROMPT:FULL_ART_PROMPT);Object.assign(diagnostic,{promptVersion:illustration?'card-illustration-only-v3':'card-fullart-preserve-v1',maskHash:undefined});}
  if(mobileWindowEdit){
   const p={x:windowRect.x*imageWidth/63,y:windowRect.y*imageHeight/88,w:windowRect.w*imageWidth/63,h:windowRect.h*imageHeight/88};
   form.set('prompt',FULL_ART_PROMPT+'\n\nSELECTED WINDOW — takes priority over automatic illustration-frame detection: The user has confirmed a custom source window in this '+imageWidth+' by '+imageHeight+' pixel canvas. Its coordinates are x='+p.x.toFixed(3)+', y='+p.y.toFixed(3)+', width='+p.w.toFixed(3)+', height='+p.h.toFixed(3)+'. The attached alpha mask is opaque inside this rectangle and transparent outside. Preserve every source pixel inside this window at its original coordinates. Generate the surrounding extension only outside this selected rectangle, joining the scenery at these exact four edges. Do not substitute the printed card frame or a default window as the extension boundary. Do not move, resize, recenter or redraw the preserved window. Retain the other original card text, symbols and outer border as specified above; extend only editable background areas outside the selected window.');
   Object.assign(diagnostic,{promptVersion:'card-fullart-mobile-window-v2',maskHash:await digest(mask)});
  }
  if(extractMode)form.set('prompt','Extend the environmental scenery beyond the supplied artwork rectangle. One selected oval face area in the supplied artwork has been replaced with a flat neutral color. Do not reconstruct, redraw or infer that hidden face. Preserve existing composition and extend only the surrounding environmental scenery, horizon, lighting and atmospheric perspective. Do not add any new characters, creatures, people, text, logos or card frames. The original artwork will be restored client-side.');
  const background={model,size:'1072x1472',quality:'medium',n:1,output_format:'png',prompt:'Create a completely original portrait landscape of '+themes[data.theme]+'. Hand-painted illustration with subtle paper texture and calm natural colors. Continuous scenery across the entire canvas. No characters, creatures, animals, people, text, logos, frames or borders. This is an independent landscape, not a continuation of an existing image.'};
  if(independent)Object.assign(diagnostic,{promptVersion:'independent-landscape-v1',imageHash:undefined,maskHash:undefined});
  if(paletteMode){background.prompt='Create an original hand-painted portrait landscape of '+themes[data.theme]+'. Use these sampled colors from top, right, bottom, and left edges as the environment palette: '+data.palette.join(', ')+'. Blend them into sky, terrain, lighting, and textures. Continuous natural scenery without foreground subjects. Do not add characters, creatures, animals, people, text, logos, borders or card frames. This is original scenery, not a recreation of existing artwork.';Object.assign(diagnostic,{promptVersion:'palette-landscape-v1',imageHash:undefined,maskHash:undefined});}
  const response=await fetch('https://api.openai.com/v1/images/'+(noImage?'generations':'edits'),{method:'POST',headers:{Authorization:'Bearer '+key,...(noImage?{'Content-Type':'application/json'}:{})},body:noImage?JSON.stringify(background):form,signal:AbortSignal.timeout(140000)});
  const result=await response.json();
  if(!response.ok){
   const safe=(v:unknown)=>typeof v==='string'?v.replace(/[^a-zA-Z0-9_.-]/g,'').slice(0,100):'';
   const code=safe(result.error?.code),type=safe(result.error?.type);
   const requestId=response.headers.get('x-request-id');
   // Provider text stays server-side; redact credentials/data URLs and bound log size.
   const providerMessage=(typeof result.error?.message==='string'?result.error.message:'')
    .split(key).join('[redacted-key]').replace(/sk-[a-zA-Z0-9_-]+/g,'[redacted-key]')
    .replace(/data:image\/[^\s]+/g,'[redacted-image]').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[redacted-email]').slice(0,700);
   console.error('overlay provider failure',{status:response.status,code,type,requestId,providerMessage,...diagnostic});
   let message='AI 생성 요청을 완료하지 못했어요. 운영자에게 문의해 주세요.';
   if(code==='moderation_blocked')message='OpenAI 이미지 생성 안전 검사에서 이 요청이 차단됐어요. 같은 요청을 반복하지 말고 운영자에게 문의해 주세요.';
   else if(code==='insufficient_quota'||type==='insufficient_quota'||code==='billing_hard_limit_reached')message='OpenAI API 잔액 또는 사용 한도가 부족합니다. OpenAI API 결제 설정에서 잔액과 한도를 확인해 주세요.';
   else if(response.status===429)message='OpenAI가 요청을 제한했습니다. API 결제 잔액·사용 한도를 확인하고, 문제가 없으면 잠시 후 다시 시도해 주세요.';
   else if(response.status===401)message='OpenAI API 키 인증에 실패했습니다. 서버에 등록한 키의 유효기간과 상태를 확인해 주세요.';
   else if(response.status===403)message='OpenAI 이미지 생성 권한이 없습니다. API 프로젝트의 모델 권한과 필요한 인증을 확인해 주세요.';
   else if(code==='model_not_found'||response.status===404)message='설정된 이미지 생성 모델을 사용할 수 없습니다. 운영자가 모델 설정과 접근 권한을 확인해야 합니다.';
   return reply({error:message+' 이번 요청은 생성 시도 횟수에 포함됩니다.',code:code||'PROVIDER_ERROR',requestId},code==='moderation_blocked'?400:response.status===429?429:502);
  }
  const output=result.data?.[0]?.b64_json;if(typeof output!=='string')throw Error('NO_IMAGE');
  console.info('overlay generation completed',{requestId:response.headers.get('x-request-id'),...diagnostic});
  let generationId=null,storageSaved=false;
  try{
   if(output.length>28_000_000)throw Error('OUTPUT_TOO_LARGE');
   const raw=Uint8Array.from(atob(output),c=>c.charCodeAt(0));
   if(raw.length<24||raw.length>20*1024*1024||[137,80,78,71,13,10,26,10].some((v,i)=>raw[i]!==v))throw Error('INVALID_OUTPUT');
   const view=new DataView(raw.buffer),width=view.getUint32(16),height=view.getUint32(20);
   if(width!==imageWidth||height!==imageHeight)throw Error('OUTPUT_SIZE_MISMATCH');
   const id=crypto.randomUUID(),rawPath=user.id+'/'+id+'/provider.png';
   const upload=await savedFetch('/storage/v1/object/'+outputBucket+'/'+rawPath,{method:'POST',headers:{'Content-Type':'image/png','x-upsert':'false'},body:raw});if(!upload.ok)throw Error('OUTPUT_UPLOAD_FAILED');
   const row={id,user_id:user.id,source_reference_id:sourceId,source_card_label:sourceLabel||null,mode:illustration?'illustration':fullArt?'fullart':independent?'independent':'original',raw_path:rawPath,image_path:rawPath,result_kind:'provider',width,height,window_rect:windowRect?Object.fromEntries(['x','y','w','h'].map(k=>[k,windowRect[k]])):null,model,prompt_version:diagnostic.promptVersion,request_id:response.headers.get('x-request-id')};
   const saved=await savedFetch('/rest/v1/overlay_generations',{method:'POST',body:JSON.stringify(row)});
   if(!saved.ok){await savedFetch('/storage/v1/object/'+outputBucket,{method:'DELETE',body:JSON.stringify({prefixes:[rawPath]})}).catch(()=>{});throw Error('OUTPUT_METADATA_FAILED');}
   generationId=id;storageSaved=true;
  }catch{console.error('overlay output persistence failed');}
  return reply({image:output,requestId:response.headers.get('x-request-id'),generationId,storageSaved,storageMessage:storageSaved?'AI 원본을 계정에 비공개로 저장했어요.':'생성은 완료됐지만 서버 저장에 실패했어요. 현재 결과를 다운로드해 주세요.'});
 }catch(error){console.error('overlay failure',error instanceof Error?error.name:'unknown');return reply({error:'요청을 완료하지 못했어요. 자동으로 다시 생성하지 않으며, 생성 시도가 한도에 포함될 수 있습니다.'},503);}
});



