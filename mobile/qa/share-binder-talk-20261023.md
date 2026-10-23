# AOS 공유·바인더·TALK QA — 2026-10-23

구현 완료, 실제 단말 조작 QA 대기. 운영 배포 및 APK/AAB 생성은 하지 않음.

## 변경

- 매물 상세·바인더 상세·보관함 공유: SHARE_URL 브리지로 OS 공유창 호출. 공유 취소 시 클립보드 복사하지 않음.
- 바인더 상세 네이티브 헤더 더보기: 본인 공유하기/자랑 멈추기, 타인 공유하기/신고하기/차단하기. 기존 웹 신고·차단·공개 중단 처리 연결.
- 헤더 메뉴를 지원하는 앱이 응답한 경우에만 프로필 우측 중복 메뉴 숨김. 기존 iOS 앱에서는 기존 웹 메뉴 유지.
- 보관함 메뉴: 자랑하기 → 공유하기 → 삭제하기.
- TALK 재선택: 열린 게시물·모달과 URL의 게시물 해시 초기화, 전체 탭·기본 정렬·목록 최상단으로 복귀 후 데이터 조회.

## 로컬 실행

네이티브 작업 경로: C:/Users/ALIC/Desktop/tcg-map-aos-parity-20261023/mobile
웹 작업 경로: C:/Users/ALIC/Desktop/tcg-map-share-binder-qa (work/aos-share-binder-qa-20261023)

웹: node scripts/serve-web-qa.cjs C:/Users/ALIC/Desktop/tcg-map-share-binder-qa 8084
Metro 시작 시 APP_VARIANT=development, EXPO_PUBLIC_QA_WEB_ORIGIN=http://127.0.0.1:8084 설정. 포트 8083/8084 ADB reverse 필요.
QA 원점 재지정은 __DEV__에서만 활성화되며 배포용 앱에서는 적용하지 않음. 웹과 네이티브 변경은 함께 반영해야 함.

## 검증

- PASS tests/native-share-binder.cjs: 네이티브/웹 공유, 취소 시 미복사, 본인/타인 메뉴, 보관함 순서, 상세에서 TALK 전체/최상단 초기화.
- PASS mobile/scripts/check-aos-parity.cjs: 기존 알림 권한/등록 및 TALK 이벤트, 지도 새로고침 회귀.
- PASS Android Metro 번들 생성 및 수정 TSX 구문 검사.
- [ ] 세 화면에서 실제 Android OS 공유창 노출·취소 확인.
- [ ] 본인/타인 바인더 헤더 메뉴 노출과 권한 확인. 신고·차단·자랑 중단은 사용자 확인 후 실행.
- [ ] 보관함 시스템 메뉴 순서 확인.
- [ ] TALK 다른 탭에서 하단 TALK 재선택 → 전체 탭/목록 최상단 확인.
- [ ] 메뉴 닫힘·뒤로가기·로그인 상태 유지 확인.

다음 배포 시 웹 브랜치 반영과 네이티브 빌드 대상 반영을 각각 확인할 것.
