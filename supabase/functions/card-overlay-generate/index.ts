// TCG instruction: pearsonkyle/tcg-frame-removal-klein4b (Apache-2.0), Pokémon example.
// Runware: https://runware.ai/docs/learn/image-outpainting, basic request positivePrompt.
const ORIGINAL_REFERENCE_PROMPTS={"tcg": "Remove the card name, HP, energy type icons, attack names and damage, weakness, resistance, retreat cost, set number, and illustrator credit. Paint over those areas with a natural continuation of the existing artwork.", "runware": "open sky and distant hills"};
const WIDE_REFERENCE_PROMPTS={"tcg":"TCG frame-removal instruction adapted for this editor: replace editable card-interface graphics with artwork extending the depicted environment. Erase unprotected title, HP, energy icons, attack labels, damage values and footer information. Reconstruct scenery in their former locations. Do not erase opaque protected regions. This is an expansion of the supplied illustration, not a redesigned card.","openai":"EDIT SCOPE: change only editable background regions. PRESERVE: the source composition, object geometry, perspective, illumination direction, exposure, saturation and color temperature. Continue the same visible materials and brushwork into the extra space. Keep all protected details and existing subject proportions fixed. Do not introduce new objects or decorative elements, relight the scene, or change its time of day.","runware":"Continue the existing background naturally into the editable surroundings. At each original illustration edge, extend the visible contours, folds, patterns and shadows in their existing directions, spacing and perspective. Match local colors and brushstroke size on both sides of the join. Keep the scene simple; add only what is necessary to continue the surroundings. Avoid new focal objects and blurred seams.","adobe":"Context-driven background fill: infer the missing scenery from the neighboring visible image. Fill only editable areas with a restrained continuation of their immediate surroundings. Preserve the existing look, lighting and visual texture. Do not invent a new scene, alter protected content or add decorative objects. Let the nearby image determine the continuation rather than adding a new theme."};
const MOBILE_CARD_IDS=new Set(["30th-en-001","30th-en-002","30th-en-003","30th-en-004","30th-en-005","30th-en-006","30th-en-007","30th-en-008","30th-en-009","30th-en-010","30th-en-011","30th-en-012","30th-en-013","30th-en-014","30th-en-016","30th-en-017","30th-en-018","30th-en-019","30th-en-020","30th-en-022","30th-en-023","30th-en-024","30th-en-025","30th-en-026","30th-en-027","30th-en-028","30th-en-029","30th-en-030","30th-en-031","30th-en-032","30th-en-033","30th-en-034","30th-en-035","30th-en-036","30th-en-037","30th-en-038","30th-en-039","30th-en-040","30th-en-041","30th-en-042","30th-en-043","30th-en-044","30th-en-045","30th-en-046","30th-en-047","30th-en-048","30th-en-049","30th-en-050","30th-en-051","30th-en-052","30th-en-055","30th-en-056","30th-en-057","30th-en-058","30th-en-059","30th-en-060","30th-en-061","30th-en-062","30th-en-063","30th-en-065","30th-en-067","30th-en-068","30th-en-069","30th-en-072","30th-en-073","30th-en-074","30th-en-075","30th-en-076","30th-en-077","30th-en-078","30th-en-079","30th-en-080","30th-en-081","30th-en-082","30th-en-083","30th-en-084","30th-en-085","30th-en-086","30th-en-087","30th-en-088","30th-en-089","30th-en-091","30th-en-093","30th-en-094","30th-en-095","30th-en-096","30th-en-097","30th-en-098","30th-en-099","30th-en-100","30th-en-101","30th-en-103","30th-en-104","30th-en-105","30th-en-106","30th-en-107","30th-en-108","30th-en-110","30th-en-111","30th-en-112","30th-en-113","30th-en-114","30th-en-115","30th-en-116","30th-en-117","30th-en-118","30th-en-119","30th-en-120","30th-en-121","30th-en-122","30th-en-123","30th-en-124","30th-en-125","m6a-ja-001","m6a-ja-002","m6a-ja-003","m6a-ja-004","m6a-ja-005","m6a-ja-006","m6a-ja-007","m6a-ja-008","m6a-ja-010","m6a-ja-011","m6a-ja-012","m6a-ja-013","m6a-ja-014","m6a-ja-016","m6a-ja-017","m6a-ja-018","m6a-ja-019","m6a-ja-020","m6a-ja-021","m6a-ja-022","m6a-ja-023","m6a-ja-024","m6a-ja-025","m6a-ja-026","m6a-ja-027","m6a-ja-028","m6a-ja-029","m6a-ja-030","m6a-ja-031","m6a-ja-032","m6a-ja-033","m6a-ja-034","m6a-ja-035","m6a-ja-036","m6a-ja-037","m6a-ja-038","m6a-ja-039","m6a-ja-040","m6a-ja-041","m6a-ja-042","m6a-ja-043","m6a-ja-044","m6a-ja-045","m6a-ja-046","m6a-ja-049","m6a-ja-050","m6a-ja-051","m6a-ja-052","m6a-ja-053","m6a-ja-054","m6a-ja-056","m6a-ja-058","m6a-ja-060","m6a-ja-061","m6a-ja-062","m6a-ja-063","m6a-ja-064","m6a-ja-065","m6a-ja-066","m6a-ja-067","m6a-ja-068","m6a-ja-069","m6a-ja-070","m6a-ja-071","m6a-ja-072","m6a-ja-073","m6a-ja-074","m6a-ja-075","m6a-ja-077","m6a-ja-078","m6a-ja-079","m6a-ja-080","m6a-ja-082","m6a-ja-083","m6a-ja-084","m6a-ja-085","m6a-ja-086","m6a-ja-087","m6a-ja-089","m6a-ja-090","m6a-ja-091","m6a-ja-092","m6a-ja-093","m6a-ja-094","m6a-ja-095","m6a-ja-096","m6a-ja-097","m6a-ja-098","m6a-ja-099","m6a-ja-100","m6a-ja-136","m6a-ja-137","m6a-ja-139","m6a-ja-140","m6a-ja-141","m6a-ja-142","m6a-ja-143","m6a-ja-144","m6a-ja-145","m6a-ja-146","m6a-ja-147","m6a-ja-148","m6a-ja-149","m6a-ja-150","m6a-ja-162","m6a-ko-01M1FTJCD6DHFNG4Q0B46DKXJN","m6a-ko-01M1FTJF1866F4BZPSYG4H9DTY","m6a-ko-01M1FTJHCVMMM9A9WW445SF9AS","m6a-ko-01M1FTJJAFV723W341Z6PXFFSR","m6a-ko-01M1FTJMQBFRRMPC36B0PCZE6R","m6a-ko-01M1FTJPJQYW197J1EDGFCJ26A","m6a-ko-01M1FTJQMAFYXD92KCQJ78Z1S8","m6a-ko-01M1FTJRYEJ4SFHD3QYXNKCRM3","m6a-ko-01M1FTJTA3DHNK23Q92WC11VBC","m6a-ko-01M1FTJWA1QN7PX4XGN7DF1Q3R","m6a-ko-01M1FTJX7S4CGPE21T177GP8MK","m6a-ko-01M1FTJYRYSRB9T4Q45FN10HZ4","m6a-ko-01M1FTJZJG2M8J5CZTFXX6T08G","m6a-ko-01M1FTK0JA3M8QMNRVK8GPMY6H","m6a-ko-01M1FTK1GHT66NBH2QA18FJJ8Z","m6a-ko-01M1FTK2EHXXWR64REFSNSSPQ1","m6a-ko-01M1FTK3DG7210M7MR4FS7T5TF","m6a-ko-01M1FTK4AA6Z5QJ7V44YAQ268X","m6a-ko-01M1FTK5D2F249G57SQCSAS8DC","m6a-ko-01M1FTK693GCWE9D4Z559JTMK4","m6a-ko-01M1FTK73JHJAYCCDKD86XEVF4","m6a-ko-01M1FTK7RY7QQDBTRW4BN1W7T4","m6a-ko-01M1FTK8KK56PZ761A8XZ27WEB","m6a-ko-01M1FTKC79T9PR0FEBZNHG7PMG","m6a-ko-01M1FTKEHC8GF0N671QJBV9CFF","m6a-ko-01M1FTKGYWKHJFVJTG3V8VVVD7","m6a-ko-01M1FTKJ1XZ2YMA9Q8CBDPKXQM","m6a-ko-01M1FTKJY63Q30T5ZRJY3ZN83N","m6a-ko-01M1FTKKV5WZ3YQDD3XG1HPFGX","m6a-ko-01M1FTKNAV24K9RGGTVMRPSCV9","m6a-ko-01M1FTKPCWNK0VFE6H224VE99E","m6a-ko-01M1FTKQYMWBBYPHCWC809144E","m6a-ko-01M1FTMBN04PN5DG1XZSBFWCZN","m6a-ko-01M2FH69JAZMKQTC3XYZCC4JY2","m6a-ko-01M2FH6BDSPPTNDF90VZ7CHNZT","m6a-ko-01M2FH6CADN3BWW0885JK8WW4J","m6a-ko-01M2FH6D0Y1QM3ECGDT937VSJE","m6a-ko-01M2FKPHRVHABKX7QV0YY7RJ13","m6a-ko-01M2FKPJ7F4A0FKPW101RMT8EX","m6a-ko-01M2FKPJMKE9DXYZXZ2PP1XFPP","m6a-ko-01M2FKPJZ4F86QJ7M8NE4WV9YJ","m6a-ko-01M2FKPKD4NQNN1PW1BNJ9985Z","m6a-ko-01M2FKPKYSP06271BMYDA5HR1B","m6a-ko-01M2FKPM9PG0G9K3HP1PWG471K","m6a-ko-01M2FKPMP6BPNMDBN5WYSZTZ4Y","m6a-ko-01M2FKPMZ2W83HAT1H5FA71SDV","m6a-ko-01M2FKPN7RMR93B8WMDCDR7WQP","m6a-ko-01M2FKPNMNA42WNTVEJ1Q758XN","m6a-ko-01M2FKPNVY47275WT9N6B5Q3VR","m6a-ko-01M2FKPP5HDMEKEEQ63C2549XQ","m6a-ko-01M2FKPPGAM3TC0YS9RB32DWKN","m6a-ko-01M2FKPPV76SMRA2MRRH3TARKR","m6a-ko-01M2FKPQ5YM3T9JW6WGD49W4FQ","m6a-ko-01M2FKPQMN6T2RYF46CJTT5240","m6a-ko-01M2FKPR365E672QCZRGXJWG0C","m6a-ko-01M2FKPRBP287EE3VRF7054H6Q","m6a-ko-01M2FKPRMBDV5CMQ3R8H1ZAYFR","m6a-ko-01M2FKPRTHE43FRQNT31JDPT23","m6a-ko-01M2FKPRZSHP1K9AA3MFSWCQKC","m6a-ko-01M2FKPS5HXV4QKRQF8WG66JNX","m6a-ko-01M2FKPSCAQXKHQD930T24KVED","m6a-ko-01M2FKPSM4T57YF137443C9TVR","m6a-ko-01M2FKPSSWNRVCPFGVYJ8VFHKZ","m6a-ko-01M2FKPSZEEMAD8NA2158SPZ04","m6a-ko-01M2FKPT67EY1YCTM16NPXMA80","m6a-ko-01M2FKPTCKPN60N42SQGXWX2QT","m6a-ko-01M2FKPTMZF5BG1R9CDWCWXGZ2","m6a-ko-01M2FKPTVABH84Z92PGKRAM66R","m6a-ko-01M2FKPV241F9DBZ145A21KJZ6","m6a-ko-01M2FKPVB16XSPJ0FWCQ4T4PHK","m6a-ko-01M2FKPVQDC5412TG2N6W4ZEHC","m6a-ko-01M2FKPW2E1YA7QZZ1VMPW3K89","m6a-ko-01M2FKPWBJWD49Q4NBH228JMMR","m6a-ko-01M2FKPWRKEJ08HWF7NVMBTT1D","m6a-ko-01M2FKPX3M81D249MBW2W8S94T","m6a-ko-01M2FKPXR8WZ8VS98GFD07ZFAX","m6a-ko-01M2FKPY0YWKBBFM932W410EY1","m6a-ko-01M2FKPY9E3FWTBANXRKDSDA1R","m6a-ko-01M2FKPYNH6MWE53T3XK6MJ9N1","m6a-ko-01M2FKPYX2NTD9M93VH85Z3B04","m6a-ko-01M2FKPZ64RWVA2DEN4WZ5ET75","m6a-ko-01M2FKPZVF988TSXE2JZYWVS26","m6a-ko-01M2FKQ04TJ9J0TS59HJW1EE5S","m6a-ko-01M2FKQ0GYQDPS7DH39JGBP543","m6a-ko-01M2FKQ0S55HECW9CSRKMFGDNE","m6a-ko-01M2FKQ11RP549D09ARMYB89WQ","m6a-ko-01M2FKQ1CQ9M5382T32YBTD905","m6a-ko-01M2FKQ1S3HRQQTDZMKYF8YDQY","m6a-ko-01M2FKQ23P49HQP66NVBVZSP1H","m6a-ko-01M2FKQ2K9TRZ62MC6J931BXEF","m6a-ko-01M2FKQ30KW1Z8YWH09A5K3BP9","m6a-ko-01M2FKQ85437R7FBSPF3FD3QQQ","m6a-ko-01M2FKQ8G3PGR39NDGPEJ2KC25","m6a-ko-01M2FKQ8PS7ZWBHF02RXB53RP5","m6a-ko-01M2FKQ8Y1D0V1MK1EG3EDMRCA","m6a-ko-01M2FKQ937YTQ589PB5G3EGE77","m6a-ko-01M2FKQ98QJF9JXXXFG7P0A359","m6a-ko-01M2FKQ9GE34J7EQ3SV6FY7HK1","m6a-ko-01M2FKQ9QV45T6HD5SSW4MXVVW","m6a-ko-01M2FKQA1MJV5YCTVCX1H2XGNA","m6a-ko-01M2FKQAB68QAB3337QB369BKW","m6a-ko-01M2FKQAJX8SWRMGPASMAQ2EMJ","m6a-ko-01M2FKQB0B7FB71R6K50AFYXSV","m6a-ko-01M2FKQB5WPDFZX9HAVCHEP3FB","m6a-ko-01M2FKQDR0D93JYR8MGEMZ49TC"]);
// Test-only endpoint. No generation is enabled without explicit server-side configuration.
// verify_jwt=false: validate every user token with this project Auth /user below.
// This accepts current signing keys without trusting decoded client JWT claims.
const FULL_ART_PROMPT="첨부한 카드 한 장을 원본으로 사용해 풀아트로 편집해줘. 이전 카드나 완성 예시의 캐릭터·글자·숫자·구도를 가져오지 마. 이번 원본에 보이는 내용만 기준으로 판단해줘.\n\n【작업 방식 — 가장 중요】\n원본 카드의 바깥 가장자리를 최종 화면의 기준으로 고정해줘. 원본 이미지 전체나 안쪽 일러스트를 확대·축소·이동하지 마.\n\n먼저 다음 요소를 원본에서 그대로 보존할 영역으로 분리해줘.\n1. 네 변과 둥근 모서리를 감싸는 바깥 홀로그램 띠\n2. 안쪽 일러스트에 있는 캐릭터와 기존 풍경 전체\n3. 카드의 모든 글자·숫자·기호·배지·기념 로고\n4. 하단 은색 구분선과 그 밖의 유지할 장식\n\n이 영역은 새로 그리거나 재해석하지 말고 원본 픽셀과 위치를 유지해줘. 특히 캐릭터의 얼굴, 몸, 귀, 팔, 발, 꼬리의 크기와 좌표를 바꾸지 마. 완성본의 캐릭터와 글자 위에 원본을 겹쳤을 때 정확히 포개져야 해.\n\n【편집할 영역만 지정】\n새로 생성하거나 교체할 부분은 아래 세 곳으로 한정해줘.\n- 안쪽 일러스트를 둘러싼 사각 프레임의 네 변\n- 일러스트 아래에 전국도감 정보 바가 있는 경우, 그 바와 바 안의 글자\n- 기존의 단색 카드 패널 배경\n\n전국도감 바가 없는 카드에는 없는 바를 만들지 마. 바를 제거한 자리에는 은색 선, 그림자, 글자 흔적이나 수평 경계가 남지 않게 해줘.\n\n【풍경 확장】\n원본 일러스트의 위·아래·왼쪽·오른쪽 끝에 있는 풍경을 바깥쪽으로 이어 그려줘. 원본의 화풍, 색, 빛, 원근감, 붓질·점묘 및 홀로그램 질감을 따라 이름과 HP 뒤, 기술과 설명 뒤, 하단 정보 뒤까지 하나의 연속된 장면을 만들어줘.\n\n특히 일러스트의 아래쪽 풍경은 제거한 도감 바 자리를 통과해 카드 하단까지 자연스럽게 이어져야 해. 프레임이 있던 네 변에도 사각형 윤곽, 색 차이, 붙여 넣은 자국이 보이면 안 돼. 새 풍경은 바깥 홀로그램 띠의 안쪽까지만 채워줘.\n\n【원본 요소 재배치 금지】\n이번 원본에 실제로 적힌 이름, HP, 속성·에너지 기호, 기술명과 설명, 데미지, 약점·저항력·후퇴 표시, 일러스트레이터, 카드 번호, 수록 번호, 하단 설명과 저작권 표기의 글자·숫자·줄바꿈·크기·위치를 그대로 유지해줘. 큰 기념 로고나 작은 배지가 있다면 각각 원래 위치와 크기로 보존하고 주변 배경만 바꿔줘. 원본에 없는 캐릭터, 정보, 장식은 추가하지 마.\n\n【최종 검사】\n원본과 결과물을 바깥 가장자리 기준으로 겹쳐 비교해줘. 캐릭터의 특징점, 모든 유지할 글자·기호·로고, 바깥 홀로그램 띠가 같은 좌표에 있는지 확인해줘. 하나라도 확대·이동·변형됐다면 그 부분은 생성 결과 대신 원본 요소를 복원해줘.\n\n최종 출력은 가로 63 × 세로 88mm 비율의 정면 카드 이미지 한 장. 카드 밖 여백, 손, 슬리브, 목업, 치수, 점선, 재단선은 넣지 마.";
const ILLUSTRATION_PROMPT="첨부한 카드 한 장을 원본으로 사용해 카드 정보와 테두리가 없는 순수 일러스트로 확장 편집해줘. 이전 카드나 완성 예시의 캐릭터·글자·숫자·구도를 가져오지 말고 이번 원본에 보이는 그림만 기준으로 판단해줘.\n\n【작업 방식 — 가장 중요】\n원본 카드의 바깥 가장자리를 최종 화면의 좌표 기준으로 고정해줘. 원본 이미지 전체나 안쪽 일러스트를 확대·축소·이동하지 마. 안쪽 일러스트에 있는 캐릭터와 기존 풍경 전체는 보존해줘. 특히 얼굴, 몸, 귀, 팔, 발, 꼬리의 크기와 좌표를 바꾸지 마. 완성본의 원래 일러스트 위에 원본을 겹쳤을 때 같은 위치와 크기로 포개져야 해.\n\n【제거하고 풍경으로 채울 영역】\n카드의 모든 글자·숫자·기호·카드 정보·로고·배지·장식을 제거해줘. 이름, HP, 속성·에너지 기호, 기술명과 설명, 데미지, 약점·저항력·후퇴 표시, 전국도감 바와 그 안의 글자, 일러스트레이터, 카드 번호, 수록 번호, 하단 설명과 저작권 표기, 큰 기념 로고와 작은 배지도 남기지 마.\n일러스트를 둘러싼 사각 프레임 네 변, 카드 바깥 가장자리의 테두리와 홀로그램 띠, 둥근 모서리 장식, 하단 은색 구분선, 단색 카드 패널도 제거해줘. 원래 풍경 속 물체와 캐릭터의 무늬는 카드 UI와 구분해 보존해줘.\n제거한 자리는 주변 풍경으로 채우고 글자 흔적, 은색 선, 그림자, 수평 경계, 사각 윤곽을 남기지 마. 원본에 없는 정보 바나 장식을 새로 만들지 마.\n\n【풍경 확장】\n원본 일러스트의 위·아래·왼쪽·오른쪽 끝에 있는 풍경을 바깥쪽으로 이어 그려줘. 원본의 화풍, 색, 빛, 원근감, 붓질·점묘와 풍경의 질감을 따라 카드 전체를 하나의 연속된 장면으로 만들어줘. 아래쪽 풍경은 제거한 도감 바와 기술 패널 자리를 통과해 카드 하단까지 자연스럽게 이어줘. 바깥 테두리가 있던 영역도 풍경으로 채워 이미지의 네 변 끝까지 빈틈없이 이어줘. 홀로그램 테두리를 새로 만들지 마.\n프레임이 있던 네 변에 색 차이, 붙여 넣은 자국이나 사각형 경계를 남기지 마. 원본 캐릭터를 다시 그리거나 반복·복제·미러링하지 마. 캐릭터의 몸을 연장하거나 새로운 신체 부위, 다른 캐릭터, 글자, 로고, 프레임을 추가하지 마. 새로 생성하는 내용은 주변 풍경으로 한정해줘.\n\n【최종 검사】\n원본과 결과물을 바깥 가장자리 기준으로 겹쳐 비교해줘. 원래 일러스트와 캐릭터의 특징점이 같은 좌표와 크기에 있는지 확인하고, 확대·이동·변형된 부분은 원본 그림으로 복원해줘. 카드의 글자·숫자·기호·로고·배지·구분선·내부 프레임·바깥 테두리가 남아 있지 않은지도 확인해줘.\n\n최종 출력은 가로 63 × 세로 88mm 비율의 정면 순수 일러스트 이미지 한 장. 직사각형 캔버스 네 모서리까지 풍경으로 채워줘. 카드 밖 여백, 손, 슬리브, 목업, 치수, 점선, 재단선은 넣지 마.";
const origins = new Set(['https://funypin.kr','https://www.funypin.kr']);
const env=(key:string)=>Deno.env.get(key)?.trim()||'';
function png(data:unknown,fullArt=false,wide=false){
 if(typeof data!=='string'||!data.startsWith('data:image/png;base64,')||data.length>(wide?16_000_000:8_000_000))throw Error('PNG_REQUIRED');
 const raw=atob(data.slice(22)),b=Uint8Array.from(raw,c=>c.charCodeAt(0));
 if(b.length<24||[137,80,78,71,13,10,26,10].some((v,i)=>b[i]!==v))throw Error('PNG_REQUIRED');
 const d=new DataView(b.buffer),w=d.getUint32(16),h=d.getUint32(20);if(wide?!(w===1648&&h===2048):fullArt?!(w===1008&&h===1408):!((w===1024&&h===1536)||(w===1072&&h===1472)))throw Error('INVALID_SIZE');return b;
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
  if(data.action==='status')return reply({ready,allowed,apiConfigured:allowed?!!key:undefined,message:!allowed?'현재 지정된 테스트 계정만 AI 생성을 사용할 수 있습니다.':!key?'테스트 계정 등록 완료 · AI API 키 연결 준비 중입니다. 확장 아트 불러오기는 사용할 수 있습니다.':!enabled?'테스트 계정 등록 완료 · AI 생성 활성화 준비 중입니다.':'AI 연결 완료 · 테스트 계정별 횟수 제한 없음 · 전체 하루 100회 시도 한도'});
  const savedHeaders={apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'};
  const outputBucket='overlay-generated-images';
  const savedFetch=(path:string,options:RequestInit={})=>fetch(url+path,{...options,headers:{...savedHeaders,...options.headers},signal:AbortSignal.timeout(15000)});
  const ownedQuery=(id:string)=>'/rest/v1/overlay_generations?id=eq.'+id+'&user_id=eq.'+encodeURIComponent(user.id);
  const validId=(id:unknown)=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const readOwner=async(id:string)=>{const res=await savedFetch(ownedQuery(id)+'&select=*');if(!res.ok)throw Error('HISTORY_UNAVAILABLE');return (await res.json())[0];};
  if(data.action==='symbol_asset'){
   if(!allowed)return reply({error:'테스트 계정만 사용할 수 있습니다.'},403);
   if(data.assetId!==undefined){
    const assets:Record<string,string>={'anniversary-yellow-umbreon-v1':'assets/overlay/anniversary-yellow-umbreon-v1.png','holographic-border-v1':'assets/overlay/holographic-border-v2.png','silver-glitter-border-v1':'assets/overlay/silver-glitter-border-v1.png','gold-star-border-v1':'assets/overlay/gold-star-border-v1.png','silver-satin-border-v1':'assets/overlay/silver-satin-border-v1.png'};
    if(typeof data.assetId!=='string'||!Object.hasOwn(assets,data.assetId))return reply({error:'올바른 공통 심볼이 아닙니다.'},400);
    const r=await savedFetch('/rest/v1/overlay_symbol_assets?id=eq.'+encodeURIComponent(data.assetId)+'&select=image_path,placement');
    if(!r.ok)return reply({error:'공통 심볼을 불러오지 못했어요.'},503);const asset=(await r.json())[0];
    if(asset?.image_path!==assets[data.assetId])return reply({error:'공통 심볼이 준비되지 않았어요.'},503);
    return reply({symbol:{imageUrl:'https://funypin.kr/'+asset.image_path,placement:asset.placement}});
   }
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
    const res=await savedFetch('/rest/v1/overlay_generations?user_id=eq.'+encodeURIComponent(user.id)+'&select=id,mode,result_kind,width,height,window_rect,source_reference_id,source_card_label,prompt_version,created_at&order=created_at.desc&limit=20');
    if(!res.ok)return reply({error:'저장된 이미지 목록을 불러오지 못했어요.'},503);return reply({generations:await res.json()});
   }
   if(!validId(data.id))return reply({error:'올바른 저장 이미지가 아닙니다.'},400);
   const row=await readOwner(data.id);if(!row)return reply({error:'저장 이미지를 찾을 수 없습니다.'},404);
   const prefix=user.id+'/'+row.id+'/';if(!row.image_path.startsWith(prefix)||!row.raw_path.startsWith(prefix))throw Error('INVALID_IMAGE_PATH');
   if(data.action==='load_generation'){
    const sign=await savedFetch('/storage/v1/object/sign/'+outputBucket+'/'+row.image_path,{method:'POST',body:JSON.stringify({expiresIn:600})});
    if(!sign.ok)return reply({error:'저장 이미지를 불러오지 못했어요.'},503);const signed=await sign.json();
    return reply({generation:{id:row.id,mode:row.mode,prompt_version:row.prompt_version,result_kind:row.result_kind,width:row.width,height:row.height,window_rect:row.window_rect,source_card_label:row.source_card_label,created_at:row.created_at,imageUrl:url+'/storage/v1'+signed.signedURL}});
   }
   let prepared;try{prepared=png(data.image,['fullart','illustration'].includes(row.mode));}catch{return reply({error:'저장할 이미지의 형식이나 크기가 올바르지 않습니다.'},400);}
   const view=new DataView(prepared.buffer);const widePrepared=['card-fullart-text-layers-v1','card-layer-atlas-v1','card-fullart-header-layers-v1','card-fullart-layers-v1','card-fullart-wide-v1','card-fullart-wide-v2','card-fullart-wide-v3','card-fullart-wide-tcg-v1','card-fullart-wide-openai-v1','card-fullart-wide-runware-v1','card-fullart-wide-adobe-v1'].includes(row.prompt_version)&&view.getUint32(16)===1008&&view.getUint32(20)===1408;if(!widePrepared&&(view.getUint32(16)!==row.width||view.getUint32(20)!==row.height))return reply({error:'생성 결과와 저장할 이미지의 크기가 다릅니다.'},400);
   const savedWindow=data.printRect;
   if(savedWindow!==undefined&&(!widePrepared||!savedWindow||['x','y','w','h'].some(k=>typeof savedWindow[k]!=='number'||!Number.isFinite(savedWindow[k]))||savedWindow.x<0||savedWindow.y<0||savedWindow.w<5||savedWindow.h<5||savedWindow.x+savedWindow.w>63||savedWindow.y+savedWindow.h>88))return reply({error:'출력 창 좌표가 올바르지 않습니다.'},400);
   const imagePath=prefix+'prepared.png';
   const upload=await savedFetch('/storage/v1/object/'+outputBucket+'/'+imagePath,{method:'POST',headers:{'Content-Type':'image/png','x-upsert':'true'},body:prepared});if(!upload.ok)return reply({error:'이미지 저장에 실패했어요. 현재 결과를 다운로드해 주세요.'},503);
   const patch=await savedFetch(ownedQuery(data.id),{method:'PATCH',body:JSON.stringify({image_path:imagePath,result_kind:'prepared',...(savedWindow?{window_rect:Object.fromEntries(['x','y','w','h'].map(k=>[k,savedWindow[k]]))}:{}),...(widePrepared?{width:1008,height:1408}:{}),updated_at:new Date().toISOString()})});
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
  const originalPrompt=data.originalPrompt;
  if(originalPrompt!==undefined&&(data.action!=='generate_fullart'||typeof originalPrompt!=='string'||!Object.hasOwn(ORIGINAL_REFERENCE_PROMPTS,originalPrompt)))return reply({error:'올바른 공개 원문 옵션을 선택해 주세요.'},400);
  delete data.originalPrompt;
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
  const atlas=data.action==='generate_layer_atlas',headerOnly=data.action==='generate_header',textOnly=data.action==='generate_text_layer';
  const wide=data.action==='generate_fullart_wide',aligned=data.action==='generate_fullart_aligned',fixed=data.action==='generate_fullart_fixed'||wide;
  const independent=data.action==='generate_background',illustration=data.action==='generate_illustration',fullArt=atlas||headerOnly||textOnly||data.action==='generate_fullart'||aligned||fixed||illustration;
  const paletteMode=data.action==='generate_palette_background',extractMode=data.action==='generate_background_extract',noImage=independent||paletteMode;
  const themes:Record<string,string>={forest:'a sunlit woodland clearing with foliage, moss and grasses',meadow:'an open grassy meadow under a softly clouded sky',ocean:'a calm ocean shoreline with gentle waves',space:'a quiet starfield with soft distant nebulae'};
  if(independent&&(!Object.hasOwn(themes,data.theme)||Object.keys(data).some(k=>!['action','theme','printRect'].includes(k))))return reply({error:'배경 테마만 전송해 주세요. 원본 이미지는 사용할 수 없습니다.'},400);
  if(fullArt&&Object.keys(data).some(k=>!(wide?['action','image','mask','printRect','wideLayout','widePrompt','wideLayers','wideHeader']:fixed?['action','image','mask','printRect']:['action','image','printRect']).includes(k)))return reply({error:'풀아트 모드에는 카드 이미지 한 장만 전송해 주세요.'},400);
  if(data.wideHeader!==undefined&&(!wide||(data.wideHeader!==true&&data.wideHeader!=='fulltext-v1')||data.wideLayers!==true||data.widePrompt!==undefined))return reply({error:'상단 분리 생성 설정이 올바르지 않습니다.'},400);
  if(data.wideLayers!==undefined&&(!wide||data.wideLayers!==true||data.wideLayout!=='bottom-v1'||data.widePrompt!==undefined||!data.printRect))return reply({error:'레이어 분리 생성 설정이 올바르지 않습니다.'},400);
  if(data.widePrompt!==undefined&&(!wide||data.wideLayout!=='bottom-v1'||!Object.hasOwn(WIDE_REFERENCE_PROMPTS,data.widePrompt)))return reply({error:'올바른 비교 프롬프트를 선택해 주세요.'},400);
  if(paletteMode&&(!Object.hasOwn(themes,data.theme)||!Array.isArray(data.palette)||data.palette.length!==4||!data.palette.every((color:unknown)=>typeof color==='string'&&/^#[0-9a-fA-F]{6}$/.test(color))||Object.keys(data).some(k=>!['action','theme','palette','printRect'].includes(k))))return reply({error:'배경 테마와 색상값 4개만 전송할 수 있습니다.'},400);
  if(extractMode){const m=data.extractMeta;if(!m||!Number.isFinite(m.backgroundRatio)||m.backgroundRatio<0||m.backgroundRatio>1||!Number.isFinite(m.confidence)||m.confidence<0||m.confidence>1||!data.anchor||Object.keys(data).some(k=>!['action','image','mask','anchor','printRect','extractMeta'].includes(k)))return reply({error:'추출 배경 요청 데이터가 올바르지 않습니다.'},400);}
  if(data.action!=='generate'&&!noImage&&!fullArt&&!extractMode)return reply({error:'지원하지 않는 요청입니다.'},400);
  if(!allowed)return reply({error:'AI 생성 테스트 대상 계정이 아닙니다.'},403);
  if(!ready)return reply({error:'AI 생성 연결 준비 중입니다.'},503);
  const windowRect=data.printRect;
  if((mobileWindowEdit||aligned||atlas)&&!windowRect)return reply({error:'일러스트 창 좌표가 필요합니다.'},400);
  if(windowRect!==undefined&&(!windowRect||['x','y','w','h'].some(k=>typeof windowRect[k]!=='number'||!Number.isFinite(windowRect[k]))||windowRect.x<0||windowRect.y<0||windowRect.w<5||windowRect.h<5||windowRect.x+windowRect.w>63||windowRect.y+windowRect.h>88))return reply({error:'출력 창 좌표가 올바르지 않습니다.'},400);

  let image=new Uint8Array(),mask=new Uint8Array();try{if(!noImage){image=png(data.image,fullArt,wide);if(!fullArt||fixed)mask=png(data.mask,fullArt,wide);}}catch{return reply({error:'이미지 형식 또는 크기가 올바르지 않습니다.'},400);}
  const imageView=new DataView(image.buffer),maskView=new DataView(mask.buffer),imageWidth=atlas?3296:noImage?1072:imageView.getUint32(16),imageHeight=atlas?2048:noImage?1472:imageView.getUint32(20);
  if(!noImage&&(!fullArt||fixed)&&(imageWidth!==maskView.getUint32(16)||imageHeight!==maskView.getUint32(20)))return reply({error:'이미지와 마스크 크기가 다릅니다.'},400);
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
  if(!await reserve('global',100))return reply({error:'오늘 테스트 전체 생성 한도에 도달했어요.'},429);
  const digest=async(bytes:Uint8Array)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('');
  const model=env('OVERLAY_IMAGE_MODEL')||'gpt-image-2.5-sunburst';
  const diagnostic={model,promptVersion:'overlay-background-continuity-v2',imageHash:await digest(image),maskHash:await digest(mask)};
  const form=new FormData();form.set('model',model);form.set('size',imageWidth+'x'+imageHeight);form.set('quality','medium');form.set('n','1');form.set('output_format','png');
  if(!noImage){form.set('image[]',new Blob([image],{type:'image/png'}),'source.png');if(!fullArt||fixed)form.set('mask',new Blob([mask],{type:'image/png'}),'mask.png');}
  const anchor=data.anchor;
  const hasAnchor=anchor&&['x','y','w','h'].every(k=>typeof anchor[k]==='number'&&Number.isFinite(anchor[k]))&&anchor.x>=0&&anchor.y>=0&&anchor.w>0&&anchor.h>0&&anchor.x+anchor.w<=imageWidth&&anchor.y+anchor.h<=imageHeight;
  if(extractMode&&!hasAnchor)return reply({error:'배경 추출 창 좌표가 올바르지 않습니다.'},400);
  const placement=hasAnchor?' The fixed source rectangle in the '+imageWidth+' by '+imageHeight+' canvas is x='+anchor.x.toFixed(1)+', y='+anchor.y.toFixed(1)+', width='+anchor.w.toFixed(1)+', height='+anchor.h.toFixed(1)+'.':'';
  form.set('prompt','Perform a localized background outpainting edit of the supplied canvas. The opaque region of the mask contains the fixed source illustration; keep this region unchanged at its exact pixel position and scale.'+placement+' Fill only the transparent masked area with the continuation of the existing environment. Continue the sky, horizon, ground, water, shadows, lighting and surface texture directly from each source edge. Keep the same horizon height and perspective. Do not recompose, recenter, zoom, rescale or move the source illustration. Do not redraw, repeat, mirror or duplicate its subject anywhere else. Do not extend a character or invent new body parts; only continue the surrounding scenery. Do not add characters, text, logos, borders, card UI or frames. Match the existing colors and texture at the boundary, without placing an outline, panel, collage seam or second copy of the illustration.');
  if(fullArt){form.set('prompt',illustration?ILLUSTRATION_PROMPT:FULL_ART_PROMPT);Object.assign(diagnostic,{promptVersion:illustration?'card-illustration-only-v3':'card-fullart-preserve-v1',maskHash:undefined});}
  if(extractMode)form.set('prompt','Extend the environmental scenery beyond the supplied artwork rectangle. One selected oval face area in the supplied artwork has been replaced with a flat neutral color. Do not reconstruct, redraw or infer that hidden face. Preserve existing composition and extend only the surrounding environmental scenery, horizon, lighting and atmospheric perspective. Do not add any new characters, creatures, people, text, logos or card frames. The original artwork will be restored client-side.');
  const background={model,size:'1072x1472',quality:'medium',n:1,output_format:'png',prompt:'Create a completely original portrait landscape of '+themes[data.theme]+'. Hand-painted illustration with subtle paper texture and calm natural colors. Continuous scenery across the entire canvas. No characters, creatures, animals, people, text, logos, frames or borders. This is an independent landscape, not a continuation of an existing image.'};
  if(independent)Object.assign(diagnostic,{promptVersion:'independent-landscape-v1',imageHash:undefined,maskHash:undefined});
  if(paletteMode){background.prompt='Create an original hand-painted portrait landscape of '+themes[data.theme]+'. Use these sampled colors from top, right, bottom, and left edges as the environment palette: '+data.palette.join(', ')+'. Blend them into sky, terrain, lighting, and textures. Continuous natural scenery without foreground subjects. Do not add characters, creatures, animals, people, text, logos, borders or card frames. This is original scenery, not a recreation of existing artwork.';Object.assign(diagnostic,{promptVersion:'palette-landscape-v1',imageHash:undefined,maskHash:undefined});}
  if(fixed){form.set('prompt',FULL_ART_PROMPT+'\n\n원본 고정 합성 모드: 첨부한 마스크의 불투명 영역은 원본 그대로 보존할 일러스트·텍스트·기호·테두리이며, 투명 영역만 배경 편집 대상으로 사용한다. 원본 카드의 좌표계, 배율, 구도, 캐릭터 자세를 바꾸지 않는다. 보호 영역 가장자리의 선·색·원근을 같은 위치에서 이어 그린다. 보호된 캐릭터를 바깥에 중복 생성하지 않는다. 별도의 출력 절단 창 좌표는 편집 범위를 의미하지 않는다.');Object.assign(diagnostic,{promptVersion:'card-fullart-fixed-v1',maskHash:await digest(mask)});}
  if(wide){form.set('prompt','Create an extended background art layer from the attached padded source. The canvas is 1648x2048 pixels. The original card is exactly 1008x1408 pixels at x=320,y=320. The 320-pixel margin on every side is editable overscan, not a border to retain. Keep original illustration position, scale, pose and perspective within these absolute coordinates. Extend its scenery across the former card panels and all four margins; replace gray padding completely. Respect opaque alpha-mask regions. Preserve the original illustration and continue lines and colors from its actual edges. Do not recenter, zoom, duplicate characters or add extra objects. Remove unprotected card text and frame graphics, replacing them with scenery; protected source text and symbols will be restored locally. Edge-to-edge continuous scenery, no cut guides or new lettering. Only the canvas and surrounding scenery are being expanded. Do not enlarge, shrink, stretch, move, rotate, recenter or recompose the original card or its interior illustration to fill the expanded canvas. Keep every existing character at its input pixel coordinates and pixel dimensions, including the face, ears, body, limbs and tail. A source point at (x,y) within the original 1008x1408 card must remain at (x+320,y+320) on the output canvas. The original card footprint stays x=320..1327 and y=320..1727; it must not be fitted to the full 1648x2048 output. Treat the source illustration as a locked layer at 100 percent scale. Fill additional space by extending scenery outward from the existing edges, never by zooming the existing scene. Before returning, compare original landmarks at these coordinates and correct any scale or position drift.');diagnostic.promptVersion='card-fullart-wide-v2';}
  if(wide&&data.wideLayout==='bottom-v1'){form.set('prompt',String(form.get('prompt')).replaceAll('x=320,y=320','x=320,y=80').replace('The 320-pixel margin on every side is editable overscan, not a border to retain.','Editable overscan margins are left/right 320 pixels, top 80 pixels and bottom 560 pixels. The larger bottom margin must be filled with continuous scenery. These margins are not borders to retain.').replace('(x+320,y+320)','(x+320,y+80)').replace('y=320..1727','y=80..1487'));diagnostic.promptVersion='card-fullart-wide-v3';}
  if(wide&&data.widePrompt){form.set('prompt',String(form.get('prompt'))+'\n\n'+WIDE_REFERENCE_PROMPTS[data.widePrompt]);diagnostic.promptVersion='card-fullart-wide-'+data.widePrompt+'-v1';}
  if(aligned){
   const r=windowRect;
   form.set('prompt',FULL_ART_PROMPT+'\n\n'+"【실물 오버레이용 좌표 보존 — 추가 우선 지침】\n이 결과는 실제 카드 위에 얹고 지정한 창을 잘라 사용하는 출력 도안이다. 보기 좋은 새 구도를 만드는 작업이 아니다. 카드 외곽을 동일한 좌표계로 사용하고 기존 일러스트 전체를 원래 위치와 배율에 고정한다. 화면을 넓게 보이게 하기 위한 줌아웃, 캐릭터 재배치, 자세 변경, 카메라 이동, 원근 재구성을 하지 않는다.\n원본 캐릭터의 눈·귀 끝·발끝·꼬리와 배경의 선·사물·명암 경계를 각각 같은 위치에 유지한다. 원본에 잘려 보이는 신체를 완성하기 위해 캐릭터 전체를 이동하거나 축소하지 않는다. 추가 공간이 필요하면 원본 밖의 배경만 확장한다.\n지정된 창의 네 변과 맞닿는 풍경의 색상, 선의 교차 위치, 방향, 굵기, 원근을 그대로 이어 그린다. 창 안쪽과 바깥쪽에 서로 다른 위치의 캐릭터가 중복되거나 이중 윤곽이 생기면 안 된다. 단순히 창 안쪽만 원본으로 덮는 것으로 연결 오류를 숨기지 않는다.\n기존 지침의 글자·숫자·기호·로고·바깥 띠 보존을 유지한다. 전국도감 바와 그 안의 글자만 기존 지침대로 제거한다. 최종 카드 크기와 원본 요소의 좌표는 변경하지 않는다."+'\n출력 캔버스: '+imageWidth+' × '+imageHeight+'px. 선택한 절단 창의 좌상단 x='+(r.x*imageWidth/63).toFixed(3)+', y='+(r.y*imageHeight/88).toFixed(3)+', 너비='+(r.w*imageWidth/63).toFixed(3)+', 높이='+(r.h*imageHeight/88).toFixed(3)+'px. 이 좌표는 원본 전체 카드 기준이며 창에 맞추어 원본을 재배치하지 않는다.');
   diagnostic.promptVersion='card-fullart-aligned-v1';
  }
  if(wide&&data.wideLayers===true){
   const r=windowRect;
   form.set('prompt','Create only a continuous full-bleed background illustration from this padded source card. Output canvas: 1648x2048 pixels. The original 1008x1408 card occupies x=320,y=80. Extend the scenery through all editable card panels and into the extra margins (320 pixels left/right, 80 top, 560 bottom). Replace the gray padding completely. The opaque mask is the user-selected original illustration window: x='+(320+r.x*16)+', y='+(80+r.y*16)+', width='+(r.w*16)+', height='+(r.h*16)+' pixels. Keep this original window at its exact input coordinates and scale; do not enlarge, shrink, shift, rotate, recompose or duplicate its subject. Continue scenery naturally across each window edge, matching contours, colors, perspective, lighting and brushwork. Remove all editable text, numbers, energy symbols, badges, logos, card interface panels, inner frame and outer card border, replacing their locations with connected scenery. Do not preserve or regenerate any text, lettering, border, badge or logo outside the protected window. Original text and border will be supplied as separate local layers after generation; do not include them in this background plate. No cut guides, mockup, extra subjects or new decoration.');
   diagnostic.promptVersion='card-fullart-layers-v1';
  }
  if(originalPrompt!==undefined){form.set('prompt',ORIGINAL_REFERENCE_PROMPTS[originalPrompt]);diagnostic.promptVersion='card-fullart-original-'+originalPrompt+'-v1';}
  if(wide&&data.wideHeader)diagnostic.promptVersion=data.wideHeader==='fulltext-v1'?'card-fullart-text-layers-v1':'card-fullart-header-layers-v1';
  if(textOnly){
   form.set('background','transparent');form.set('quality','high');
   form.set('prompt','Extract ALL text, numbers and functional symbols from this original card into a single transparent PNG layer, exactly 1008x1408. Preserve original coordinates, scale, spelling, line breaks, font appearance, colors and glyph outlines. Include the entire card: name, evolution stage badge and portrait, evolves-from line, HP and type icon, Pokedex information, ability and attack names, energy icons, rules and descriptions, damage numbers, weakness, resistance, retreat cost, illustrator credit, set identifiers, regulation marks, card numbers, rarity symbols, flavor text and copyright. Do not omit lower-card information. Exclude the outer edge border and holographic rim entirely. Exclude the yellow 30th anniversary character-shaped badge entirely; it is supplied separately. Exclude all artwork, panel backgrounds, inner illustration frames, divider bars and decorative lines. Remove ALL original background pixels around AND BETWEEN letters and icons. Background must be real alpha transparency, not black, white, checkerboard or a colored matte. Keep only the requested glyphs, functional symbols and evolution badge; no original background rectangles, textures, shadows from panels or scene fragments. Do not invent missing information, reposition content or enlarge anything. Return only the full-card transparent overlay, no mockup. PRIORITY: this is registered foreground extraction, not typography recreation or layout redesign. Treat the supplied 1008x1408 image as an immutable coordinate grid: origin (0,0) at the upper left; each retained source point (x,y) must remain at output (x,y), with scale exactly 1.000, zero translation and zero rotation. Preserve the FULL canvas and all empty transparent margins. Never crop to visible content, trim transparent padding, auto-fit, center, straighten, expand, shrink, warp or rearrange any element or group. For every word, digit, punctuation mark, badge and icon, match the original bounding box, baseline, stroke width, kerning, line spacing, horizontal and vertical alignment, internal proportions and distances to neighboring elements. Retain the source glyph shapes and original language; do not typeset again using a substitute font, translate, correct spelling, reflow a paragraph or improve legibility by enlarging small text. Preserve existing thin outlines and intrinsic icon fills, but do not add outlines, shadows or glow. Resolve background removal by changing only background alpha, never by changing foreground geometry. Copy the visible foreground appearance as faithfully as possible; do not guess or rewrite illegible characters. The text layer will be overlaid at (0,0) on the same-size original card without scaling or alignment correction. Before returning, compare that overlay against the source at identical canvas bounds: check name and HP anchors, every attack row and damage value, energy icon centers, description line endings, bottom identifiers and copyright baseline. Correct any size, position or spacing drift using the source before output. Geometry and source fidelity take priority over beautification. This check is an instruction for your output, not a request to print a report, grid or alignment marks.');
   diagnostic.promptVersion='card-text-only-v2';
  }
  if(headerOnly){
   form.set('background','transparent');form.set('quality','high');
   form.set('prompt','Extract ONLY a transparent upper-header overlay from this one source card. Output a full uncropped 1008x1408 PNG canvas registered to the exact original card bounds. Keep original positions, sizes, colors, letter shapes and thin original outlines. Top left: retain the evolution stage label (or BASIC label), evolution portrait badge if present, and card name. Exclude the evolves-from text line, such as 이브이에서 진화 or Evolves from Eevee, including its background strip. Top right: retain HP, the actual HP number, and the type/energy icon. Keep the source language verbatim. Do not invent an evolution portrait when absent. Everything else must be actual alpha transparency: no illustration, scenery, card panel, inner or outer border, anniversary badge, attacks, descriptions, lower numbers, separators or copyright. Preserve full-canvas empty space rather than cropping to the header. Clean antialiased contours with no detached speckles, background remnants or added thick outlines. Do not move, enlarge, redraw or change the retained content. This transparent layer will be composited over separately generated art locally.');
   diagnostic.promptVersion='card-header-only-v1';
  }
  if(atlas){
   const r=windowRect;form.set('background','transparent');form.set('quality','high');
   form.set('prompt','Create exactly ONE registered two-panel layer atlas PNG, 3296x2048 pixels, from the attached 1008x1408 original card. This is not a collage or a card mockup. There are two equal 1648x2048 panels with no gaps, outlines, labels or divider. LEFT PANEL x=0..1647: an entirely opaque continuous full-bleed illustration, no text, numbers, symbols, badges, logos, card panels, silver bars or inner/outer borders. Place the original card footprint at x=320,y=80, width=1008,height=1408. Preserve the original illustration subject and existing scenery at their exact source scale and position: a source pixel (x,y) maps to (320+x,80+y). The selected original illustration window maps to x='+(320+r.x*16)+',y='+(80+r.y*16)+',width='+(r.w*16)+',height='+(r.h*16)+'. Extend its scenery through all former card panels and into margins left/right 320, top 80, bottom 560 pixels. Do not zoom, enlarge, shrink, move or duplicate the subject. Match the source lighting, colors, perspective and brushwork at the illustration boundaries. Fill every pixel of this left panel with scenery. RIGHT PANEL x=1648..3295: a separate sparse transparent UPPER HEADER overlay. The corresponding original card footprint is x=1968,y=80,width=1008,height=1408. A retained source pixel (x,y) maps to (1968+x,80+y). Retain ONLY top-left evolution stage or BASIC label, evolution portrait badge if present, card name; and top-right HP, original HP number and type/energy icon. Preserve exact source language, spelling, colors, size, original thin outlines and positions. EXCLUDE the evolves-from description line such as 이브이에서 진화. Do not invent absent badges. Remove ALL original background pixels around AND BETWEEN letters and icons: no colored name panel, no background strip, no artwork, texture, lighting, shadow or rectangular backing copied from the original. Every non-header pixel of the right panel must be actual zero-alpha transparency, not white, black or a checkerboard pattern. Keep only the intrinsic fills of the retained badge/icon and the letter strokes. No detached speckles, halos or remaining background fragments. No lower descriptions, attacks, separators, anniversary symbol or outer border anywhere in this right panel. Do not repeat the left illustration on the right. Keep both panels in these exact coordinates so software can split them without AI processing. Return one PNG atlas, not separate alternatives or a flattened composite.');
   diagnostic.promptVersion='card-layer-atlas-v1';
  }
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



