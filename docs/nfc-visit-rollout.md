# FUNY PIN NFC 방문인증 2단계 운영 가이드

## 운영 기준

- NTAG213 고정 URL: 실제 NFC 터치만으로 방문을 확정하지 않는다.
- NFC URL로 매장 인증 화면을 연 뒤 사용자 로그인 + GPS 오차 반경 50m 이내 + 카드샵 좌표에서 50m 이내를 모두 서버에서 확인한다.
- NFC 정식 인증 ON 시 `shop_visit_checkins`에 `method = 'nfc_ntag213_gps'`로 기록한다. 기존 DB의 `UNIQUE(user_id,shop_id,visit_date_kst)`로 GPS·QR·NFC 중복 인증을 통합 차단한다.
- 기존 `trg_mission_shop_visit_checkin` 트리거로 MY 미션·랭킹의 기존 데이터 기반 집계에 연결한다. 중복 시 신규 지급하지 않는다.
- NFC 태그의 `reward_enabled`는 기본 OFF. NFC 현장 파일럿 성공 이력이 없는 매장은 서버에서 정식 전환을 거부한다.
- 정식 전환 이전의 파일럿 기록은 기존 MY 실적이나 보상에 소급 반영하지 않는다.
- 집 NFC 테스트와 QR/OTP 및 기존 GPS 인증 함수와 테이블은 변경하지 않는다.

## 매장별 활성화 순서

1. 관리 어드민 `리워드 > 매장 NFC 인증 관리`에서 카드샵과 태그를 등록하고 URL을 실물 NTAG213에 기록한다.
2. 매장 안에서 실제 휴대폰으로 NFC 터치 → 로그인 → GPS 인증을 테스트한다. 이 시점은 파일럿 기록만 생성된다.
3. 어드민의 NFC 최근 이력에서 성공·거리·GPS 정확도를 확인한다.
4. 매장 GPS 좌표, 실제 설치 장소, URL 공유 위험을 점검한 뒤 태그별 **정식 인증 ON**을 수동으로 선택한다. 기본 OFF.
5. 정식 활성화 이후 사용자의 최초 성공 인증만 MY에 반영된다. 같은 날 GPS/QR 인증이 이미 있으면 추가 기록·코인 없음.
6. 문제가 발생하면 즉시 **정식 인증 OFF** 또는 **사용 정지**한다. 기존 보상 내역은 자동 취소하지 않는다.

## QA 기준

- 정상: AOS/iOS 로그인, NFC 스캔, 50m 이내, GPS ±50m 이내, 기존 방문 기록 생성, 트리거 실행
- 거절: 무효 태그, 폐기 태그, GPS 권한 거절, GPS ±50m 초과, 매장 거리 50m 초과
- 중복: 같은 날 같은 매장 GPS → NFC, QR → NFC, NFC → QR 시 방문실적/코인 추가 0
- 오류: 브라우저↔앱 로그인 세션, GPS 실내 지연, 태그 URL 공유, UTC/KST 일자 경계
- 재현 가능한 GPS 미측정 상황은 무작정 50m 범위를 확대하지 않고 좌표 점검 및 재측정을 우선한다.

## 보안과 제한

NTAG213은 URL을 복사/공유할 수 있고 클라이언트가 제공한 GPS는 조작 가능하다. 보상이 큰 이벤트·경품에는 이 방식만으로 물리적 방문을 강하게 보증할 수 없으며, 필요 시 NTAG424 DNA 또는 직원 검증을 적용해야 한다.

## 변경된 범위

- `shop_visit_nfc_tags.reward_enabled` (기본 OFF), 전환 시각·관리자
- `shop_visit_nfc_attempts` 거리·정확도·보상 적용 여부·매장 ID
- `nfc_visit_verify_v2` (service_role 전용 원자적 방문/보상 판단)
- `shop-visit-nfc-pilot` Edge Function: NFC 모드/이력/전환 API
- `admin-shop-visit-nfc-integrated.js`: 파일럿·정식 스위치, 최근 인증 이력
- `nfc.html`: GPS 재측정, 성공·중복·파일럿 UX

## 롤백

개별 매장 `reward_enabled=false`로 즉시 보상 연동 중지. 태그를 `revoked`로 변경하면 해당 URL도 무효화. 서버 배포가 문제가 되면 직전 Edge Function 버전과 웹 코드를 복원한다. 이미 지급된 미션·코인은 임의 삭제하지 않고 수동 검증한다.
