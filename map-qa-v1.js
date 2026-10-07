
/* FUNY PIN MAP v2 QA controller — production shops.html is untouched */
(function(){
  'use strict';
  if(window.__FUNY_MAP_QA_V2)return;
  window.__FUNY_MAP_QA_V2=true;
  document.documentElement.classList.add('funy-map-qa');
  document.body.classList.add('funy-map-qa');

  const VENDING=[{"id":"PKVM-0001","name":"롯데마트 광교점","address":"경기도 수원시 영통구 센트럴타운로22번길 85","operator":"롯데마트","status":"active","is_active":true},{"id":"PKVM-0002","name":"롯데마트 김포공항점","address":"서울 강서구 하늘길 38","operator":"롯데마트","status":"active","is_active":true},{"id":"PKVM-0003","name":"롯데마트 김포한강점","address":"경기도 김포시 장기동 김포한강2로 41","operator":"롯데마트","status":"active","is_active":true},{"id":"PKVM-0004","name":"롯데마트 대구율하점","address":"대구광역시 동구 율하동 1117","operator":"롯데마트","status":"active","is_active":true},{"id":"PKVM-0005","name":"롯데마트 덕소점","address":"경기도 남양주시 와부읍 월문천로 33","operator":"롯데마트","status":"active","is_active":true},{"id":"PKVM-0006","name":"롯데마트 롯데아울렛 파주점","address":"경기도 파주시 문발로 302","operator":"롯데마트","status":"active","is_active":true},{"id":"PKVM-0007","name":"롯데마트 삼산점","address":"인천광역시 부평구 길주로 623","operator":"롯데마트","status":"active","is_active":true},{"id":"PKVM-0008","name":"롯데마트 서산점","address":"충청남도 서산시 충의로 27","operator":"롯데마트","status":"active","is_active":true},{"id":"PKVM-0009","name":"롯데마트 송도점","address":"인천광역시 연수구 컨벤시아대로 177","operator":"롯데마트","status":"active","is_active":true},{"id":"PKVM-0010","name":"롯데마트 수완점","address":"광주광역시 광산구 장신로 98","operator":"롯데마트","status":"active","is_active":true},{"id":"PKVM-0011","name":"롯데마트 수원몰점","address":"경기도 수원시 권선구 세화로 134","operator":"롯데마트","status":"active","is_active":true},{"id":"PKVM-0012","name":"롯데마트 수지몰점","address":"경기도 용인시 수지구 성복2로 38","operator":"롯데마트","status":"active","is_active":true},{"id":"PKVM-0013","name":"롯데마트 신갈점","address":"경기 용인시 기흥구 중부대로 375 기흥역롯데캐슬스카이","operator":"롯데마트","status":"active","is_active":true},{"id":"PKVM-0014","name":"롯데마트 아산터미널점","address":"충청남도 아산시 모종동 번영로 225","operator":"롯데마트","status":"active","is_active":true},{"id":"PKVM-0015","name":"롯데마트 안산점","address":"경기도 안산시 상록구 항가울로 422","operator":"롯데마트","status":"active","is_active":true},{"id":"PKVM-0016","name":"롯데마트 양평점","address":"경기도 양평군 양평읍 남북로 76","operator":"롯데마트","status":"active","is_active":true},{"id":"PKVM-0017","name":"롯데마트 월드타워점","address":"서울 송파구 올림픽로 300","operator":"롯데마트","status":"active","is_active":true},{"id":"PKVM-0018","name":"롯데마트 은평점","address":"서울 은평구 통일로 1050","operator":"롯데마트","status":"active","is_active":true},{"id":"PKVM-0019","name":"롯데마트 제타플렉스점","address":"서울 송파구 올림픽로 240","operator":"롯데마트","status":"active","is_active":true},{"id":"PKVM-0020","name":"롯데마트 중계점","address":"서울 노원구 노원로 330","operator":"롯데마트","status":"active","is_active":true},{"id":"PKVM-0021","name":"롯데마트 청라국제도시점","address":"인천광역시 서구 청라커낼로 252","operator":"롯데마트","status":"active","is_active":true},{"id":"PKVM-0022","name":"롯데마트 청량리점","address":"서울 동대문구 왕산로 214","operator":"롯데마트","status":"active","is_active":true},{"id":"PKVM-0023","name":"롯데마트 춘천점","address":"강원특별자치도 춘천시 방송길 84","operator":"롯데마트","status":"active","is_active":true},{"id":"PKVM-0024","name":"롯데마트 판교점","address":"경기도 성남시 분당구 대왕판교로606번길 58","operator":"롯데마트","status":"active","is_active":true},{"id":"PKVM-0025","name":"롯데마트 의왕점","address":"경기도 의왕시 계원대학로 7","operator":"롯데마트","status":"active","is_active":true},{"id":"PKVM-0026","name":"롯데시네마 건대입구점","address":"서울 광진구 아차산로 262","operator":"롯데시네마","status":"active","is_active":true},{"id":"PKVM-0027","name":"롯데시네마 광명아울렛점","address":"경기도 광명시 일직로 17","operator":"롯데시네마","status":"active","is_active":true},{"id":"PKVM-0028","name":"롯데시네마 광복점","address":"부산 중구 중앙대로 2 롯데백화점 아쿠아몰 9F","operator":"롯데시네마","status":"active","is_active":true},{"id":"PKVM-0029","name":"롯데시네마 광주수완점","address":"광주광역시 광산구 장신로 98","operator":"롯데시네마","status":"active","is_active":true},{"id":"PKVM-0030","name":"롯데시네마 구리아울렛점","address":"경기도 구리시 동구릉로136번길 47","operator":"롯데시네마","status":"active","is_active":true},{"id":"PKVM-0031","name":"롯데시네마 군산몰점","address":"전북특별자치도 군산시 조촌로 130 롯데몰 군산점 4F","operator":"롯데시네마","status":"active","is_active":true},{"id":"PKVM-0032","name":"롯데시네마 김포공항점","address":"서울 강서구 하늘길 77","operator":"롯데시네마","status":"active","is_active":true},{"id":"PKVM-0033","name":"롯데시네마 노원점","address":"서울 노원구 동일로 1414 롯데백화점10층","operator":"롯데시네마","status":"active","is_active":true},{"id":"PKVM-0034","name":"롯데시네마 대구상인점","address":"대구광역시 달서구 월곡로 247","operator":"롯데시네마","status":"active","is_active":true},{"id":"PKVM-0035","name":"롯데시네마 대구율하점","address":"대구광역시 동구 안심로 80","operator":"롯데시네마","status":"active","is_active":true},{"id":"PKVM-0036","name":"롯데시네마 대전관저점","address":"대전광역시 서구 봉우로8번길 23","operator":"롯데시네마","status":"active","is_active":true},{"id":"PKVM-0037","name":"롯데시네마 동래점","address":"부산 동래구 중앙대로 1393","operator":"롯데시네마","status":"active","is_active":true},{"id":"PKVM-0038","name":"롯데시네마 동부산점","address":"부산 기장군 기장해안로 147 롯데몰 3층","operator":"롯데시네마","status":"active","is_active":true},{"id":"PKVM-0039","name":"롯데시네마 동탄점","address":"경기도 화성시 동탄역로 160","operator":"롯데시네마","status":"active","is_active":true},{"id":"PKVM-0040","name":"롯데시네마 별내점","address":"경기도 남양주시 별내중앙로 10","operator":"롯데시네마","status":"active","is_active":true},{"id":"PKVM-0041","name":"롯데시네마 부산본점","address":"부산 부산진구 가야대로 772 롯데백화점부산본점 10F","operator":"롯데시네마","status":"active","is_active":true},{"id":"PKVM-0042","name":"롯데시네마 부평점","address":"인천광역시 부평구 대정로 66","operator":"롯데시네마","status":"active","is_active":true},{"id":"PKVM-0043","name":"롯데시네마 산본피트인점","address":"경기도 군포시 번영로 485","operator":"롯데시네마","status":"active","is_active":true},{"id":"PKVM-0044","name":"롯데시네마 서청주점","address":"충청북도 청주시 흥덕구 비하동 순환로 1004","operator":"롯데시네마","status":"active","is_active":true},{"id":"PKVM-0045","name":"롯데시네마 성남중앙점","address":"경기도 성남시 수정구 산성대로 267","operator":"롯데시네마","status":"active","is_active":true},{"id":"PKVM-0046","name":"롯데시네마 수원점","address":"경기도 수원시 권선구 세화로 134","operator":"롯데시네마","status":"active","is_active":true},{"id":"PKVM-0047","name":"롯데시네마 수지점","address":"경기도 용인시 수지구 성복2로 38","operator":"롯데시네마","status":"active","is_active":true},{"id":"PKVM-0048","name":"롯데시네마 신대방점","address":"서울 동작구 시흥대로 606","operator":"롯데시네마","status":"active","is_active":true},{"id":"PKVM-0049","name":"롯데시네마 신림점","address":"서울 관악구 신림로 330","operator":"롯데시네마","status":"active","is_active":true},{"id":"PKVM-0050","name":"롯데시네마 아산터미널점","address":"충청남도 아산시 번영로 225","operator":"롯데시네마","status":"active","is_active":true},{"id":"PKVM-0051","name":"롯데시네마 안산점","address":"경기도 안산시 상록구 항가울로 422 롯데마트 4층","operator":"롯데시네마","status":"active","is_active":true},{"id":"PKVM-0052","name":"롯데시네마 용인기흥점","address":"경기도 용인시 기흥구 기흥역로 63","operator":"롯데시네마","status":"active","is_active":true},{"id":"PKVM-0053","name":"롯데시네마 울산점","address":"울산광역시 남구 삼산로 282 롯데백화점 영플라자 3층","operator":"롯데시네마","status":"active","is_active":true},{"id":"PKVM-0054","name":"롯데시네마 원주무실점","address":"강원특별자치도 원주시 능라동길 51","operator":"롯데시네마","status":"active","is_active":true},{"id":"PKVM-0055","name":"롯데시네마 월드타워점","address":"서울 송파구 올림픽로 300","operator":"롯데시네마","status":"active","is_active":true},{"id":"PKVM-0056","name":"롯데시네마 은평점","address":"서울 은평구 통일로 1050","operator":"롯데시네마","status":"active","is_active":true},{"id":"PKVM-0057","name":"롯데시네마 의정부민락점","address":"경기도 의정부시 천보로 44","operator":"롯데시네마","status":"active","is_active":true},{"id":"PKVM-0058","name":"롯데시네마 인천아시아드점","address":"인천광역시 서구 봉수대로 806","operator":"롯데시네마","status":"active","is_active":true},{"id":"PKVM-0059","name":"롯데시네마 전주점","address":"전북특별자치도 전주시 완산구 온고을로 2","operator":"롯데시네마","status":"active","is_active":true},{"id":"PKVM-0060","name":"롯데시네마 제주연동점","address":"제주특별자치도 제주시 과원로 128 B1F","operator":"롯데시네마","status":"active","is_active":true},{"id":"PKVM-0061","name":"롯데시네마 진주혁신점","address":"경상남도 진주시 동진로 440","operator":"롯데시네마","status":"active","is_active":true},{"id":"PKVM-0062","name":"롯데시네마 청량리점","address":"서울 동대문구 왕산로 214","operator":"롯데시네마","status":"active","is_active":true},{"id":"PKVM-0063","name":"롯데시네마 파주운정점","address":"경기도 파주시 목동동 청암로17번길 17","operator":"롯데시네마","status":"active","is_active":true},{"id":"PKVM-0064","name":"롯데시네마 평촌점","address":"경기도 안양시 동안구 시민대로 180","operator":"롯데시네마","status":"active","is_active":true},{"id":"PKVM-0065","name":"롯데월드 2층 어드벤처","address":"서울 송파구 올림픽로 240 2층","operator":"롯데월드","status":"active","is_active":true},{"id":"PKVM-0066","name":"롯데월드 4층 어드벤처","address":"서울 송파구 올림픽로 240 4층","operator":"롯데월드","status":"active","is_active":true},{"id":"PKVM-0067","name":"롯데월드 부스럭롯데월드몰","address":"서울 송파구 올림픽로 240","operator":"롯데월드","status":"active","is_active":true},{"id":"PKVM-0068","name":"메가박스 강남점","address":"서울 서초구 서초대로77길 3 아라타워","operator":"메가박스","status":"active","is_active":true},{"id":"PKVM-0069","name":"메가박스 고양스타필드점","address":"경기도 고양시 덕양구 고양대로 1955","operator":"메가박스","status":"active","is_active":true},{"id":"PKVM-0070","name":"메가박스 김포한강신도시점","address":"경기도 김포시 구래동 한강9로75번길 180","operator":"메가박스","status":"active","is_active":true},{"id":"PKVM-0071","name":"메가박스 남양주현대아울렛스페이스원점","address":"경기도 남양주시 다산순환로 50","operator":"메가박스","status":"active","is_active":true},{"id":"PKVM-0072","name":"메가박스 대전중앙로점","address":"대전광역시 중구 중앙로 126","operator":"메가박스","status":"active","is_active":true},{"id":"PKVM-0073","name":"메가박스 대전현대아울렛점","address":"대전광역시 유성구 테크노중앙로 123","operator":"메가박스","status":"active","is_active":true},{"id":"PKVM-0074","name":"메가박스 마곡점","address":"서울 강서구 공항대로 247","operator":"메가박스","status":"active","is_active":true},{"id":"PKVM-0075","name":"메가박스 부천스타필드시티점","address":"경기도 부천시 소사구 옥길로 1","operator":"메가박스","status":"active","is_active":true},{"id":"PKVM-0076","name":"메가박스 상암월드컵경기장점","address":"서울 마포구 월드컵로 240","operator":"메가박스","status":"active","is_active":true},{"id":"PKVM-0077","name":"메가박스 세종나성점","address":"세종특별자치시 나성로 38","operator":"메가박스","status":"active","is_active":true},{"id":"PKVM-0078","name":"메가박스 센트럴점","address":"서울 서초구 신반포로 176","operator":"메가박스","status":"active","is_active":true},{"id":"PKVM-0079","name":"메가박스 송도점","address":"인천광역시 연수구 송도과학로16번길 33-4","operator":"메가박스","status":"active","is_active":true},{"id":"PKVM-0080","name":"메가박스 수원AK플라자점","address":"경기도 수원시 팔달구 덕영대로 924","operator":"메가박스","status":"active","is_active":true},{"id":"PKVM-0081","name":"메가박스 안성스타필드점","address":"경기도 안성시 공도읍 서동대로 3930-39","operator":"메가박스","status":"active","is_active":true},{"id":"PKVM-0082","name":"메가박스 이수점","address":"서울 동작구 동작대로 89","operator":"메가박스","status":"active","is_active":true},{"id":"PKVM-0083","name":"메가박스 코엑스점","address":"서울 강남구 봉은사로 524","operator":"메가박스","status":"active","is_active":true},{"id":"PKVM-0084","name":"메가박스 킨텍스점","address":"경기도 고양시 일산서구 호수로 817","operator":"메가박스","status":"active","is_active":true},{"id":"PKVM-0085","name":"메가박스 하남스타필드점","address":"경기도 하남시 미사대로 750","operator":"메가박스","status":"active","is_active":true},{"id":"PKVM-0086","name":"메가박스 화곡점","address":"서울 강서구 화곡로 142","operator":"메가박스","status":"active","is_active":true},{"id":"PKVM-0087","name":"스타필드마켓 동탄점","address":"경기도 화성시 동탄중앙로 376","operator":"기타","status":"active","is_active":true},{"id":"PKVM-0088","name":"이마트 검단점","address":"인천광역시 서구 당하동 서곶로 754","operator":"이마트","status":"active","is_active":true},{"id":"PKVM-0089","name":"이마트 광명소하점","address":"경기도 광명시 소하로 97","operator":"이마트","status":"active","is_active":true},{"id":"PKVM-0090","name":"이마트 구로점","address":"서울 구로구 디지털로32길 43","operator":"이마트","status":"active","is_active":true},{"id":"PKVM-0091","name":"이마트 김포한강점","address":"경기도 김포시 김포한강7로 71","operator":"이마트","status":"active","is_active":true},{"id":"PKVM-0092","name":"이마트 김해점","address":"경상남도 김해시 김해대로 2232","operator":"이마트","status":"active","is_active":true},{"id":"PKVM-0093","name":"이마트 대전터미널점","address":"대전광역시 동구 동서대로 1689 3층, 4층","operator":"이마트","status":"active","is_active":true},{"id":"PKVM-0094","name":"이마트 마포점","address":"서울 마포구 백범로 212","operator":"이마트","status":"active","is_active":true},{"id":"PKVM-0095","name":"이마트 명일점","address":"서울 강동구 고덕로 276","operator":"이마트","status":"active","is_active":true},{"id":"PKVM-0096","name":"이마트 목동점","address":"서울 양천구 오목로 299","operator":"이마트","status":"active","is_active":true},{"id":"PKVM-0097","name":"이마트 부천중동점","address":"경기도 부천시 원미구 석천로 188","operator":"이마트","status":"active","is_active":true},{"id":"PKVM-0098","name":"이마트 분당점","address":"경기도 성남시 분당구 불정로 134","operator":"이마트","status":"active","is_active":true},{"id":"PKVM-0099","name":"이마트 산본점","address":"경기도 군포시 산본로 347","operator":"이마트","status":"active","is_active":true},{"id":"PKVM-0100","name":"이마트 세종점","address":"세종특별자치시 금송로 687","operator":"이마트","status":"active","is_active":true},{"id":"PKVM-0101","name":"이마트 수원점","address":"경기도 수원시 권선구 경수대로 270","operator":"이마트","status":"active","is_active":true},{"id":"PKVM-0102","name":"이마트 수지점","address":"경기도 용인시 수지구 수지로 203","operator":"이마트","status":"active","is_active":true},{"id":"PKVM-0103","name":"이마트 신도림점","address":"서울 구로구 새말로 97","operator":"이마트","status":"active","is_active":true},{"id":"PKVM-0104","name":"이마트 양산점","address":"경상남도 양산시 양산역6길 12","operator":"이마트","status":"active","is_active":true},{"id":"PKVM-0105","name":"이마트 여주점","address":"경기도 여주시 세종로 151","operator":"이마트","status":"active","is_active":true},{"id":"PKVM-0106","name":"이마트 영등포점","address":"서울 영등포구 영중로 15 타임스퀘어","operator":"이마트","status":"active","is_active":true},{"id":"PKVM-0107","name":"이마트 왕십리점","address":"서울 성동구 왕십리광장로 17","operator":"이마트","status":"active","is_active":true},{"id":"PKVM-0108","name":"이마트 용산점","address":"서울 용산구 한강대로23길 55","operator":"이마트","status":"active","is_active":true},{"id":"PKVM-0109","name":"이마트 월계점","address":"서울 노원구 마들로3길 15","operator":"이마트","status":"active","is_active":true},{"id":"PKVM-0110","name":"이마트 월배점","address":"대구광역시 달서구 진천로 92","operator":"이마트","status":"active","is_active":true},{"id":"PKVM-0111","name":"이마트 은평점","address":"서울 은평구 은평로 111","operator":"이마트","status":"active","is_active":true},{"id":"PKVM-0112","name":"이마트 의정부점","address":"경기도 의정부시 민락로 210","operator":"이마트","status":"active","is_active":true},{"id":"PKVM-0113","name":"이마트 이천점","address":"경기도 이천시 이섭대천로 1440-50","operator":"이마트","status":"active","is_active":true},{"id":"PKVM-0114","name":"이마트 자양점","address":"서울 광진구 아차산로 272","operator":"이마트","status":"active","is_active":true},{"id":"PKVM-0115","name":"이마트 죽전점","address":"경기도 용인시 수지구 포은대로 552","operator":"이마트","status":"active","is_active":true},{"id":"PKVM-0116","name":"이마트 천안서북점","address":"충청남도 천안시 서북구 삼성대로 20","operator":"이마트","status":"active","is_active":true},{"id":"PKVM-0117","name":"이마트 천호점","address":"서울 강동구 천호대로 1017","operator":"이마트","status":"active","is_active":true},{"id":"PKVM-0118","name":"이마트 파주운정점","address":"경기도 파주시 한울로 123","operator":"이마트","status":"active","is_active":true},{"id":"PKVM-0119","name":"이마트 풍산점","address":"경기도 고양시 일산동구 하늘마을1로 25","operator":"이마트","status":"active","is_active":true},{"id":"PKVM-0120","name":"이마트 하남점","address":"경기도 하남시 덕풍서로 70","operator":"이마트","status":"active","is_active":true},{"id":"PKVM-0121","name":"이마트 하월곡점","address":"서울 성북구 종암로 167","operator":"이마트","status":"active","is_active":true},{"id":"PKVM-0122","name":"이마트 화정점","address":"경기도 고양시 덕양구 백양로 79","operator":"이마트","status":"active","is_active":true},{"id":"PKVM-0123","name":"이마트 TK고양점","address":"경기도 고양시 덕양구 고양대로 1955","operator":"이마트","status":"active","is_active":true},{"id":"PKVM-0124","name":"이마트 TK스타필드수원점","address":"경기도 수원시 장안구 수성로 175","operator":"이마트","status":"active","is_active":true},{"id":"PKVM-0125","name":"이마트 TK안성점","address":"경기도 안성시 공도읍 서동대로 3930-39","operator":"이마트","status":"active","is_active":true},{"id":"PKVM-0126","name":"이마트 TK하남점","address":"경기도 하남시 미사대로 750","operator":"이마트","status":"active","is_active":true},{"id":"PKVM-0127","name":"CGV 강릉점","address":"강원특별자치도 강릉시 경강로 2120","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0128","name":"CGV 거제점","address":"경상남도 거제시 장평로 12","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0129","name":"CGV 계양점","address":"인천광역시 계양구 장제로 738 메트로몰 8층","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0130","name":"CGV 고양백석점","address":"경기도 고양시 일산동구 중앙로 1036 고양종합터미널","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0131","name":"CGV 광주상무점","address":"광주광역시 서구 치평동 시청로 67","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0132","name":"CGV 광주첨단점","address":"광주광역시 광산구 임방울대로826번길 29-31","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0133","name":"CGV 광주하남점","address":"광주광역시 광산구 용아로400번길 30","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0134","name":"CGV 구로점","address":"서울 구로구 구로중앙로 152","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0135","name":"CGV 김포운양점","address":"경기도 김포시 운양동 김포한강11로 288-31","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0136","name":"CGV 김포점","address":"경기도 김포시 풍무동 풍무로 128","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0137","name":"CGV 김해점","address":"경상남도 김해시 내외중앙로 137","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0138","name":"CGV 대구스타디움점","address":"대구광역시 수성구 유니버시아드로 140","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0139","name":"CGV 대구월성점","address":"대구광역시 달서구 조암로 29","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0140","name":"CGV 대전가오점","address":"대전광역시 동구 은어송로 72","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0141","name":"CGV 대전점","address":"대전광역시 중구 계백로 1700 백화점세이","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0142","name":"CGV 대전터미널점","address":"대전광역시 동구 동서대로1695번길 30","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0143","name":"CGV 동래점","address":"부산 동래구 중앙대로 1523","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0144","name":"CGV 동탄역점","address":"경기도 화성시 동탄구 동탄대로 537","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0145","name":"CGV 동탄호수공원점","address":"경기도 화성시 동탄대로 181","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0146","name":"CGV 등촌점","address":"서울 강서구 공항대로45길 63","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0147","name":"CGV 방학점","address":"서울 도봉구 도봉로 684 8층","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0148","name":"CGV 배곧점","address":"경기도 시흥시 서울대학로278번길 61 7층","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0149","name":"CGV 서전주점","address":"전북특별자치도 전주시 완산구 홍산로 260","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0150","name":"CGV 세종점","address":"세종특별자치시 도움1로 108","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0151","name":"CGV 센텀시티점","address":"부산 해운대구 센텀남대로 35","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0152","name":"CGV 소풍점","address":"경기도 부천시 송내대로 239","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0153","name":"CGV 순천신대점","address":"전라남도 순천시 해광로 199","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0154","name":"CGV 스타필드시티위례점","address":"경기도 하남시 위례대로 200","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0155","name":"CGV 아시아드점","address":"부산 연제구 종합운동장로 7","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0156","name":"CGV 야탑점","address":"경기도 성남시 분당구 성남대로925번길 16","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0157","name":"CGV 양주옥정점","address":"경기도 양주시 옥정로 200","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0158","name":"CGV 오리점","address":"경기도 성남시 분당구 탄천상로151번길 20","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0159","name":"CGV 의정부점","address":"경기도 의정부시 평화로 525","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0160","name":"CGV 인천연수점","address":"인천광역시 연수구 동춘동 청능대로 210","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0161","name":"CGV 인천점","address":"인천광역시 남동구 예술로 198","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0162","name":"CGV 인천학익점","address":"인천광역시 미추홀구 매소홀로 255","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0163","name":"CGV 일산점","address":"경기도 고양시 일산동구 정발산로 24","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0164","name":"CGV 전주고사점","address":"전북특별자치도 전주시 완산구 전주객사3길 72","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0165","name":"CGV 전주효자점","address":"전북특별자치도 전주시 완산구 용머리로 45","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0166","name":"CGV 천안터미널점","address":"충청남도 천안시 동남구 만남로 43 B관 5층","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0167","name":"CGV 천안펜타포트점","address":"충청남도 천안시 서북구 공원로 196","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0168","name":"CGV 천호점","address":"서울 강동구 양재대로 1571","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0169","name":"CGV 청주(서문)점","address":"충청북도 청주시 상당구 상당로81번길 63","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0170","name":"CGV 청주지웰시티점","address":"충청북도 청주시 흥덕구 복대동 3381","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0171","name":"CGV 춘천점","address":"강원특별자치도 춘천시 지석로 80","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0172","name":"CGV 파주문산점","address":"경기도 파주시 문산읍 방촌로 1719-10","operator":"CGV","status":"active","is_active":true},{"id":"PKVM-0173","name":"KTX 부산역","address":"부산 동구 중앙대로 206","operator":"KTX","status":"active","is_active":true},{"id":"PKVM-0174","name":"KTX 서대전역","address":"대전광역시 중구 오류로 23","operator":"KTX","status":"active","is_active":true},{"id":"PKVM-0175","name":"KTX 영등포역","address":"서울 영등포구 경인로 846","operator":"KTX","status":"active","is_active":true},{"id":"PKVM-0176","name":"KTX 천안아산역","address":"충남 아산시 배방읍 희망로 100","operator":"KTX","status":"active","is_active":true},{"id":"PKVM-0177","name":"KTX 행신역","address":"경기도 고양시 덕양구 소원로 102","operator":"KTX","status":"active","is_active":true}];
  const layerPrefsKey='funypin_qa_kr_map_layers_v1';
    let savedLayers={};
    try{const parsed=JSON.parse(localStorage.getItem(layerPrefsKey)||'{}');if(parsed&&typeof parsed==='object')savedLayers=parsed}catch(_){}
    const layerValue=(key)=>typeof savedLayers[key]==='boolean'?savedLayers[key]:true;
    const state={tab:'shops',layers:{shops:layerValue('shops'),events:layerValue('events'),vending:layerValue('vending')},operator:'all',vendingSort:'alpha',selectedVending:null};
    function saveLayerPrefs(){try{localStorage.setItem(layerPrefsKey,JSON.stringify({shops:!!state.layers.shops,events:!!state.layers.events,vending:!!state.layers.vending}))}catch(_){}}
  const vendingMarkers=new Map();
  const coordCacheKey='funypin_qa_vending_coords_v1';
  let coordCache={};try{coordCache=JSON.parse(localStorage.getItem(coordCacheKey)||'{}')||{}}catch(_){coordCache={}}
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const normalize=v=>String(v??'').toLowerCase().replace(/\s+/g,'').trim();
  const currentSearch=()=>normalize($('#map-shop-search')?.value||'');
  const category=v=>['롯데마트','이마트','롯데시네마','메가박스','CGV'].includes(v)?v:'기타';
  const operatorLabel=v=>v==='롯데시네마'?'LOTTE\nCINEMA':v==='롯데마트'?'LOTTE\nMART':v==='롯데월드'?'LOTTE\nWORLD':v==='스타필드마켓'?'STARFIELD\nMARKET':v;
  const operatorLogoUrl=v=>({
    '롯데마트':'/assets/vending/operator-logos/lotte-mart.png',
    '이마트':'/assets/vending/operator-logos/emart.png',
    '롯데시네마':'/assets/vending/operator-logos/lotte-cinema-v2.png?v=20261007-18',
    '메가박스':'/assets/vending/operator-logos/megabox.png',
    'CGV':'/assets/vending/operator-logos/cgv.png',
    'KTX':'/assets/vending/operator-logos/ktx.png',
    '롯데월드':'/assets/vending/operator-logos/lotte-world.png'
  }[v]||'');
  const vendingLogoUrl=v=>String(v?.name||'').includes('스타필드마켓')?'/assets/vending/operator-logos/emart.png':operatorLogoUrl(v?.operator);
  const addressIcon='<svg class="qa-address-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2.5"/></svg>';

  const badge=document.createElement('div');badge.className='qa-dev-badge';badge.textContent='MAP V2 · QA';document.body.appendChild(badge);
  $('#map-shop-search')?.setAttribute('placeholder','매장명 또는 지역으로 검색');
  $('#map-shop-search')?.setAttribute('aria-label','카드샵 또는 자판기 매장명·지역 검색');

  function mapReady(){return !!(window.naver?.maps?.Service&&typeof naverMap!=='undefined'&&naverMap)}
  function markerMetrics(){
    let z=11;try{z=naverMap.getZoom()}catch(_){}
    if(z<=9)return{pinW:14,pinH:20,markerW:18,markerH:25};
    if(z===10)return{pinW:17,pinH:24,markerW:21,markerH:29};
    if(z===11)return{pinW:20,pinH:28,markerW:24,markerH:34};
    if(z===12)return{pinW:23,pinH:32,markerW:27,markerH:38};
    if(z===13)return{pinW:26,pinH:36,markerW:30,markerH:42};
    if(z===14)return{pinW:29,pinH:40,markerW:33,markerH:46};
    return{pinW:32,pinH:44,markerW:36,markerH:50};
  }
  function vendingIcon(selected=false){
    const m=markerMetrics(),vars='--pin-w:'+m.pinW+'px;--pin-h:'+m.pinH+'px;--marker-w:'+m.markerW+'px;--marker-h:'+m.markerH+'px';
    return {content:'<div class="funy-vending-marker'+(selected?' is-selected':'')+'" style="'+vars+'" aria-hidden="true"><svg viewBox="0 0 98 134" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="vendingPinGrad'+(selected?'S':'N')+'" x1="15" y1="8" x2="84" y2="112" gradientUnits="userSpaceOnUse"><stop stop-color="#FFE46A"/><stop offset=".48" stop-color="#F6C928"/><stop offset="1" stop-color="#D9A900"/></linearGradient></defs><path d="M49 5C23 5 2 26 2 52c0 35 47 77 47 77s47-42 47-77C96 26 75 5 49 5Z" fill="url(#vendingPinGrad'+(selected?'S':'N')+')"/><path d="M6 52h28M64 52h28" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/><circle cx="49" cy="52" r="14.5" fill="#FFFFFF"/></svg></div>',anchor:new naver.maps.Point(Math.round(m.markerW/2),m.markerH)};
  }
  function naverUrl(v){
    return 'https://map.naver.com/p/search/'+encodeURIComponent(v.name||'');
  }
  function logoHtml(v){const url=vendingLogoUrl(v),fallback=esc(operatorLabel(v.operator)).replace(/\n/g,'<br>');return '<span class="qa-operator-logo" data-operator="'+esc(v.operator)+'">'+(url?'<img src="'+url+'" alt="'+esc(v.operator)+' 로고" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'block\'"><span class="qa-operator-logo-fallback" style="display:none">'+fallback+'</span>':'<span class="qa-operator-logo-fallback">'+fallback+'</span>')+'</span>'}
  function popupHtml(v){
    return '<div class="map-popup-bubble qa-vending-popup"><div class="map-shop-popup"><span class="qa-popup-copy"><strong class="qa-popup-name">'+esc(v.name)+'</strong><span class="qa-popup-address-row">'+addressIcon+'<span class="qa-popup-address">'+esc(v.address)+'</span></span></span><a class="qa-naver-route" href="'+naverUrl(v)+'" target="_blank" rel="noopener noreferrer">길찾기</a></div></div>';
  }
  function selectVending(v,marker){
    try{if(activeInfoWindow)activeInfoWindow.close()}catch(_){}
    if(state.selectedVending===v.id){state.selectedVending=null;marker.setIcon(vendingIcon(false));try{activeInfoWindow=null}catch(_){};return}
    if(state.selectedVending&&vendingMarkers.get(state.selectedVending))vendingMarkers.get(state.selectedVending).setIcon(vendingIcon(false));
    state.selectedVending=v.id;marker.setIcon(vendingIcon(true));
    const iw=new naver.maps.InfoWindow({content:popupHtml(v),borderWidth:0,backgroundColor:'transparent',anchorSize:new naver.maps.Size(0,0),pixelOffset:new naver.maps.Point(0,-12)});
    iw.open(naverMap,marker);try{activeInfoWindow=iw}catch(_){}
  }
  function makeVendingMarker(v,pos){
    if(!mapReady()||vendingMarkers.has(v.id))return;
    v._coord={lat:+pos.lat,lng:+pos.lng};
    const marker=new naver.maps.Marker({map:state.layers.vending?naverMap:null,position:new naver.maps.LatLng(+pos.lat,+pos.lng),title:v.name,icon:vendingIcon(false),zIndex:110});
    naver.maps.Event.addListener(marker,'click',()=>selectVending(v,marker));
    vendingMarkers.set(v.id,marker);
    applyVendingVisibility();
  }
  function geocodeOne(v){
    return new Promise(resolve=>{
      if(coordCache[v.id]&&Number.isFinite(+coordCache[v.id].lat)&&Number.isFinite(+coordCache[v.id].lng)){makeVendingMarker(v,coordCache[v.id]);return resolve(true)}
      naver.maps.Service.geocode({query:v.address},(status,res)=>{
        if(status===naver.maps.Service.Status.OK&&res?.v2?.addresses?.length){
          const a=res.v2.addresses[0],p={lat:+a.y,lng:+a.x};coordCache[v.id]=p;makeVendingMarker(v,p);resolve(true)
        }else resolve(false)
      })
    })
  }
  async function buildVendingMarkers(){
    if(!mapReady())return;
    const status=document.createElement('div');status.className='qa-geocode-status';status.textContent='자판기 위치 준비 중…';$('.map-wrap-hero')?.appendChild(status);
    let done=0,idx=0,ok=0;
    async function worker(){
      while(idx<VENDING.length){
        const i=idx++,v=VENDING[i];try{if(await geocodeOne(v))ok++}catch(_){}
        done++;if(done%5===0||done===VENDING.length)status.textContent='자판기 위치 '+done+'/'+VENDING.length;
        if(done%10===0)try{localStorage.setItem(coordCacheKey,JSON.stringify(coordCache))}catch(_){}
        await new Promise(r=>setTimeout(r,55));
      }
    }
    await Promise.all([worker(),worker(),worker()]);
    try{localStorage.setItem(coordCacheKey,JSON.stringify(coordCache))}catch(_){}
    status.textContent=ok+'개 위치 준비 완료';setTimeout(()=>status.remove(),1600);
    renderVendingList();
  }

  function vendingMatchesSearch(v){const q=currentSearch();return !q||normalize([v.name,v.address,v.operator].join(' ')).includes(q)}
  function vendingListRows(){
    let rows=VENDING.filter(v=>state.operator==='all'||category(v.operator)===state.operator).filter(vendingMatchesSearch).slice();
    if(state.vendingSort==='near'&&window.FUNY_CURRENT_LOCATION){
      const h=window.FUNY_CURRENT_LOCATION,rad=x=>x*Math.PI/180,dist=(a,b)=>{const dLat=rad(a.lat-b.lat),dLng=rad(a.lng-b.lng),x=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;return 12742*Math.asin(Math.sqrt(x))};
      rows.sort((a,b)=>{const ac=a._coord?dist(a._coord,h):Infinity,bc=b._coord?dist(b._coord,h):Infinity;return ac-bc||a.name.localeCompare(b.name,'ko')});
    }else rows.sort((a,b)=>a.name.localeCompare(b.name,'ko'));
    return rows;
  }
  function applyVendingVisibility(){
    const q=currentSearch();
    for(const v of VENDING){
      const m=vendingMarkers.get(v.id);if(!m)continue;
      const show=!document.body.classList.contains('country-japan')&&state.layers.vending&&(!q||vendingMatchesSearch(v));
      try{m.setMap(show?naverMap:null)}catch(_){}
    }
  }
  function applyLayers(){
    try{
      const visibleRows=Array.isArray(window.FUNY_VISIBLE_SHOPS)?window.FUNY_VISIBLE_SHOPS:[];
      const visibleIds=new Set(visibleRows.filter(s=>!String(s?.id||'').startsWith('JP-')).map(s=>String(s.id)));
      markerById.forEach((m,id)=>{
        const show=state.layers.shops&&visibleIds.has(String(id));
        m.setMap(show?naverMap:null);
      });
    }catch(_){}
    document.documentElement.classList.toggle('qa-hide-events',!state.layers.events);
    document.body.classList.toggle('qa-hide-events',!state.layers.events);
    applyVendingVisibility();
    document.querySelectorAll('.qa-layer-chip').forEach(b=>b.classList.toggle('active',!!state.layers[b.dataset.layer]));
  }
  function updateEventCount(){
    const n=document.querySelectorAll('.funy-event-pin').length;
    const el=document.querySelector('.qa-layer-chip[data-layer="events"] .qa-layer-count');if(el)el.textContent=String(n);
  }

  let layerControlObserver=null,layerControlTimer=0;
  function buildLayerControls(){
    const track=$('#filters');if(!track)return;
    if(document.body.classList.contains('country-japan')){track.querySelectorAll('.qa-layer-chip').forEach(x=>x.remove());return;}
    const existing=[...track.querySelectorAll('.qa-layer-chip')];
    if(existing.length===3){
      existing.forEach(b=>b.classList.toggle('active',!!state.layers[b.dataset.layer]));
      return;
    }
    existing.forEach(x=>x.remove());
    const shopCount=(()=>{try{return SHOPS.filter(x=>!String(x.id).startsWith('JP-')).length}catch(_){return 0}})();
    const defs=[['shops','카드샵',shopCount],['events','일정',0],['vending','자판기',VENDING.length]];
    const anchor=track.querySelector('.country-filter-sep')||track.querySelector('.country-filter-wrap');
    let ref=anchor?.nextSibling||null;
    defs.forEach(([key,label,count])=>{
      const b=document.createElement('button');b.type='button';b.className='qa-layer-chip'+(state.layers[key]?' active':'');b.dataset.layer=key;
      b.innerHTML='<span class="qa-layer-dot"></span><span>'+label+'</span><span class="qa-layer-count">'+count+'</span>';
      b.onclick=e=>{e.preventDefault();e.stopPropagation();state.layers[key]=!state.layers[key];saveLayerPrefs();applyLayers()};
      track.insertBefore(b,ref);
    });
  }
  function keepLayerControls(){
    const track=$('#filters');if(!track)return;
    if(layerControlObserver)layerControlObserver.disconnect();
    layerControlObserver=new MutationObserver(()=>{clearTimeout(layerControlTimer);layerControlTimer=setTimeout(()=>{buildLayerControls();applyLayers()},20)});
    layerControlObserver.observe(track,{childList:true,subtree:false});
    buildLayerControls();
    setInterval(()=>{buildLayerControls();updateEventCount()},900);
  }
  function shopFilterDefs(){try{return [{id:'all',label:'전체'},...FILTERS]}catch(_){return[{id:'all',label:'전체'}]}}
  function syncShopFilterUI(){
    document.querySelectorAll('.qa-shop-filter-chip[data-filter]').forEach(b=>{
      const src=document.querySelector('#filters .filter-chip[data-filter="'+b.dataset.filter+'"]');
      b.classList.toggle('active',!!src?.classList.contains('active'))
    });
    const any=[...document.querySelectorAll('.qa-shop-filter-chip')].some(b=>b.classList.contains('active'));
    $('.qa-filter-toggle')?.classList.toggle('active',any);
  }
  function ensureQaSortPortal(menu,type){
    if(!menu)return null;
    const id=type==='vending'?'qaVendingSortPortal':'qaShopSortPortal';
    let host=document.getElementById(id);
    if(!host){
      host=document.createElement('div');
      host.id=id;
      host.className='qa-sort-portal-host list-sort'+(type==='vending'?' qa-vending-list-sort':'');
      document.body.appendChild(host);
    }
    if(menu.parentNode!==host)host.appendChild(menu);
    menu.classList.add('qa-sort-floating-menu');
    return host;
  }
  function placeQaSortMenu(btn,menu,type){
    if(!btn||!menu)return;
    const host=ensureQaSortPortal(menu,type);if(!host)return;
    const r=btn.getBoundingClientRect(),w=118,gap=6;
    const left=Math.max(8,Math.min(r.left,window.innerWidth-w-8));
    host.style.setProperty('position','fixed','important');
    host.style.setProperty('left',left+'px','important');
    host.style.setProperty('top',(r.bottom+gap)+'px','important');
    host.style.setProperty('width',w+'px','important');
    host.style.setProperty('z-index','2147482500','important');
  }
  function syncShopSortMenu(){const btn=$('#list-sort-button'),menu=$('#list-sort-menu');if(menu?.classList.contains('open'))placeQaSortMenu(btn,menu,'shop')}
  function syncVendingSortMenu(){const btn=$('#qaVendingSortButton'),menu=$('#qaVendingSortMenu');if(menu?.classList.contains('open'))placeQaSortMenu(btn,menu,'vending')}
  function vendingSortLabel(){return state.vendingSort==='near'?'가까운 순':'가나다 순'}
  function closeVendingSort(){const menu=$('#qaVendingSortMenu'),btn=$('#qaVendingSortButton');menu?.classList.remove('open');btn?.setAttribute('aria-expanded','false')}
  function setVendingSort(value){state.vendingSort=value==='near'?'near':'alpha';const label=$('#qaVendingSortLabel');if(label)label.textContent=vendingSortLabel();document.querySelectorAll('#qaVendingSortMenu [data-vending-sort]').forEach(b=>b.classList.toggle('active',b.dataset.vendingSort===state.vendingSort));closeVendingSort();if(state.vendingSort==='near'&&!window.FUNY_CURRENT_LOCATION)document.getElementById('map-location-btn')?.click();renderVendingList()}
  function buildSheet(){
    const sheet=$('.list-wrap');if(!sheet||sheet.querySelector('.qa-list-tabs'))return;
    const handle=sheet.querySelector('.map-sheet-handle');
    const tabs=document.createElement('div');tabs.className='qa-list-tabs';tabs.innerHTML='<button class="qa-list-tab active" data-tab="shops">TCG 카드샵 <span class="qa-tab-count" id="qaShopCount">0</span></button><button class="qa-list-tab" data-tab="vending">포켓몬 자판기 <span class="qa-tab-count" id="qaVendingCount">'+VENDING.length+'</span></button>';
    handle?.after(tabs);
    if(handle&&!sheet.querySelector('.qa-sheet-sticky-head')){
      const sticky=document.createElement('div');sticky.className='qa-sheet-sticky-head';
      handle.before(sticky);sticky.appendChild(handle);sticky.appendChild(tabs);
    }

    const heading=sheet.querySelector('.list-heading');
    const tools=document.createElement('div');tools.className='qa-shop-tools';
    if(heading){
      heading.before(tools);
      const sort=heading.querySelector('.list-sort');if(sort)tools.appendChild(sort);
    }
    const divider=document.createElement('span');divider.className='qa-tools-divider';divider.setAttribute('aria-hidden','true');tools.appendChild(divider);
    const strip=document.createElement('div');strip.className='qa-shop-filter-strip';
    strip.innerHTML=shopFilterDefs().map(f=>'<button type="button" class="qa-shop-filter-chip" data-filter="'+esc(f.id)+'">'+esc(f.label)+'</button>').join('');
    tools.appendChild(strip);
    strip.onclick=e=>{const b=e.target.closest('[data-filter]');if(!b)return;document.querySelector('#filters .filter-chip[data-filter="'+b.dataset.filter+'"]')?.click();setTimeout(()=>{syncShopFilterUI();applyLayers()},40)};

    [heading,sheet.querySelector('.shop-request-list-banner'),sheet.querySelector('#shop-list'),sheet.querySelector('#empty')].filter(Boolean).forEach(el=>el.classList.add('qa-shop-only'));

    const vp=document.createElement('section');vp.className='qa-vending-panel';vp.hidden=true;
    vp.innerHTML='<div class="qa-vending-tools"><div class="list-sort qa-vending-list-sort"><button id="qaVendingSortButton" class="list-sort-button" type="button" aria-haspopup="menu" aria-expanded="false"><span id="qaVendingSortLabel">가나다 순</span><svg class="list-sort-chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6.25 8 10l4-3.75"/></svg></button><div id="qaVendingSortMenu" class="list-sort-menu" role="menu"><button type="button" class="active" data-vending-sort="alpha">가나다 순</button><button type="button" data-vending-sort="near">가까운 순</button></div></div><span class="qa-tools-divider" aria-hidden="true"></span><div class="qa-operator-strip" id="qaOperatorStrip"></div></div><span class="qa-vending-summary" id="qaVendingSummary"></span><div class="qa-vending-list" id="qaVendingList"></div>';
    sheet.appendChild(vp);
    const ops=['all','롯데마트','이마트','롯데시네마','메가박스','CGV','기타'];
    $('#qaOperatorStrip').innerHTML=ops.map(x=>'<button type="button" class="qa-operator-chip'+(x==='all'?' active':'')+'" data-operator="'+x+'">'+(x==='all'?'전체':x)+'</button>').join('');
    $('#qaOperatorStrip').onclick=e=>{const b=e.target.closest('[data-operator]');if(!b)return;state.operator=b.dataset.operator;document.querySelectorAll('.qa-operator-chip').forEach(x=>x.classList.toggle('active',x===b));renderVendingList()};
    $('#qaVendingSortButton').onclick=e=>{e.preventDefault();e.stopPropagation();const menu=$('#qaVendingSortMenu'),btn=$('#qaVendingSortButton'),open=menu?.classList.toggle('open');btn?.setAttribute('aria-expanded',open?'true':'false');if(open)requestAnimationFrame(syncVendingSortMenu)};
    $('#qaVendingSortMenu').onclick=e=>{const b=e.target.closest('[data-vending-sort]');if(!b)return;e.preventDefault();e.stopPropagation();setVendingSort(b.dataset.vendingSort)};
    document.addEventListener('click',e=>{if(!e.target.closest('.qa-vending-list-sort')&&!e.target.closest('#qaVendingSortPortal'))closeVendingSort()},true);
    tabs.onclick=e=>{const b=e.target.closest('[data-tab]');if(!b)return;setTab(b.dataset.tab)};
    ensureQaSortPortal($('#list-sort-menu'),'shop');
    ensureQaSortPortal($('#qaVendingSortMenu'),'vending');
    $('#list-sort-button')?.addEventListener('click',()=>requestAnimationFrame(syncShopSortMenu));
    tools.addEventListener('scroll',()=>{document.getElementById('list-sort-menu')?.classList.remove('open');document.getElementById('list-sort-button')?.setAttribute('aria-expanded','false')},{passive:true});
    vp.querySelector('.qa-vending-tools')?.addEventListener('scroll',()=>closeVendingSort(),{passive:true});
    setInterval(()=>{const n=document.querySelectorAll('#shop-list .shop-card').length;const el=$('#qaShopCount');if(el)el.textContent=String(n);syncShopFilterUI()},400);
  }
  function syncCountrySpecificQaUI(){
    const jp=document.body.classList.contains('country-japan')||window.FUNY_MAP_COUNTRY?.get?.()==='JP';
    const heading=$('.list-heading');
    const shopTools=$('.qa-shop-tools');
    const sort=document.querySelector('.list-sort:not(.qa-vending-list-sort)');
    const sheet=$('.list-wrap'),handle=sheet?.querySelector('.map-sheet-handle'),tabs=sheet?.querySelector('.qa-list-tabs'),sticky=sheet?.querySelector('.qa-sheet-sticky-head');
    const listTitle=heading?.querySelector('.list-title-label');
    if(listTitle)listTitle.textContent='TCG 카드샵';
    if(jp){
      if(sticky&&handle&&tabs){sticky.before(handle);handle.after(tabs);sticky.remove()}
      if(heading&&sort&&!heading.contains(sort))heading.appendChild(sort);
      document.querySelectorAll('.qa-shop-only').forEach(el=>el.style.display='');
      const vp=$('.qa-vending-panel');if(vp)vp.hidden=true;
      state.tab='shops';document.body.classList.remove('qa-vending-tab-active');
    }else{
      if(sheet&&handle&&tabs&&!sheet.querySelector('.qa-sheet-sticky-head')){const w=document.createElement('div');w.className='qa-sheet-sticky-head';handle.before(w);w.appendChild(handle);w.appendChild(tabs)}
      if(shopTools&&sort&&!shopTools.contains(sort))shopTools.insertBefore(sort,shopTools.firstChild);
      setTab(state.tab);
      buildLayerControls();
    }
  }
  function setTab(tab){
    state.tab=tab==='vending'?'vending':'shops';
    const vendingMode=state.tab==='vending';
    document.body.classList.toggle('qa-vending-tab-active',vendingMode);
    document.querySelectorAll('.qa-list-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===state.tab));
    const vp=$('.qa-vending-panel');if(vp)vp.hidden=!vendingMode;
    if(vendingMode)renderVendingList();
  }
  function renderVendingList(){
    const list=$('#qaVendingList');if(!list)return;const rows=vendingListRows();
    $('#qaVendingSummary').textContent='검색 결과 '+rows.length+'개';const tabCount=$('#qaVendingCount');if(tabCount)tabCount.textContent=String(rows.length);
    list.innerHTML=rows.length?rows.map(v=>'<article class="qa-vending-card" data-vending-id="'+esc(v.id)+'">'+logoHtml(v)+'<div class="qa-vending-copy"><strong class="qa-vending-name">'+esc(v.name)+'</strong><span class="qa-vending-address-row">'+addressIcon+'<span class="qa-vending-address">'+esc(v.address)+'</span></span></div><a class="qa-naver-route" href="'+naverUrl(v)+'" target="_blank" rel="noopener noreferrer">길찾기</a></article>').join(''):'<div class="qa-vending-empty">조건에 맞는 자판기가 없습니다.</div>';
    list.querySelectorAll('.qa-vending-card').forEach(card=>card.onclick=e=>{
      if(e.target.closest('.qa-naver-route'))return;
      const v=VENDING.find(x=>x.id===card.dataset.vendingId),m=v&&vendingMarkers.get(v.id);if(!v)return;
      if(m){naverMap.panTo(m.getPosition());if(naverMap.getZoom()<14)naverMap.setZoom(14);selectVending(v,m)}
      else if(mapReady())geocodeOne(v).then(()=>{const mm=vendingMarkers.get(v.id);if(mm){naverMap.panTo(mm.getPosition());naverMap.setZoom(14);selectVending(v,mm)}})
    });
  }

  let lastSearch='';
  setInterval(()=>{
    const q=$('#map-shop-search')?.value||'';
    if(q===lastSearch)return;lastSearch=q;applyVendingVisibility();renderVendingList()
  },250);

  try{
    const originalSync=syncMapMarkers;
    syncMapMarkers=function(refit=true){originalSync(refit);setTimeout(applyLayers,0)}
  }catch(_){}
  window.addEventListener('funy:mapdatachange',()=>setTimeout(()=>{syncCountrySpecificQaUI();applyLayers()},120));
  window.addEventListener('funy:locationchange',()=>{if(state.vendingSort==='near')renderVendingList()});
  window.addEventListener('funy:list-refresh',()=>setTimeout(applyLayers,20));
  window.addEventListener('funy:shops-source',()=>setTimeout(applyLayers,30));

  keepLayerControls();buildSheet();renderVendingList();
  window.addEventListener('resize',()=>{syncShopSortMenu();syncVendingSortMenu()},{passive:true});
  syncCountrySpecificQaUI();
  new MutationObserver(()=>{syncCountrySpecificQaUI();applyLayers()}).observe(document.body,{attributes:true,attributeFilter:['class']});
  let tries=0,t=setInterval(()=>{tries++;if(mapReady()){clearInterval(t);try{naver.maps.Event.addListener(naverMap,'zoom_changed',()=>vendingMarkers.forEach((m,id)=>m.setIcon(vendingIcon(id===state.selectedVending))))}catch(_){}buildVendingMarkers()}else if(tries>80)clearInterval(t)},200);
})();
