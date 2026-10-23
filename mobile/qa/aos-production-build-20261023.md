# AOS 배포용 빌드 — 2026-10-23

- 사용자 요청: 현재 수정사항 기준 Android 배포용 빌드. 스토어 제출은 요청하지 않음.
- 버전 이름: 1.0.1. 패키지 kr.funypin.app. EAS production 프로필 / 원격 버전 코드 자동 증가.
- Firebase 프로젝트 funy-pin. 제공된 google-services JSON에서 배포용 패키지 일치 확인.
- Firebase 파일: 로컬 google-services.prod.json(ignored), EAS production GOOGLE_SERVICES_JSON(secret FILE). 개발용 파일/환경은 유지.
- Expo FCM V1: 기존 동일 Firebase 프로젝트의 등록된 키를 배포용 Android 앱에도 연결. 비공개 키 내용 조회/출력 없이 기존 리소스를 재사용함.
- app.config.js에서 개발/배포 파일 분리 및 패키지 일치 검사 적용.
- PASS 구성 검사 및 Android 알림/TALK 회귀 검사. 배포용 실기기 푸시 수신은 빌드 설치 후 확인 필요.
- 로컬 QA 웹 원점 재지정은 __DEV__ 전용. production 빌드에는 로컬 웹 원점 환경변수를 전달하지 않음.

## 제출 전 남은 확인

- [ ] 웹 수정 브랜치 work/aos-share-binder-qa-20261023, 커밋 20c11529를 운영 웹에 반영. 이 문서 작성 시점에는 로컬 QA에만 연결되어 있음.
- [ ] 배포용 앱 + 운영 웹 조합에서 공유하기·바인더 헤더 더보기·TALK 재선택 최종 QA.
- [ ] 배포용 푸시 수신·알림함·읽음 처리 확인.
- [ ] 사용자 승인/요청 후 Play Console 업로드 및 제출.

## 빌드 결과

- FINISHED: 2026-10-23 19:37:56 KST.
- Build ID: f99d9320-728d-4f09-83f8-24d2d9735f87.
- 버전: 1.0.1 (10). Profile production / distribution STORE / Android AAB.
- 소스 커밋: b356c4f6d5976cf9e721c5386a74056d98c958a4.
- 빌드 화면: https://expo.dev/accounts/funy-pin/projects/funy-pin/builds/f99d9320-728d-4f09-83f8-24d2d9735f87
- AAB: https://expo.dev/artifacts/eas/Ha4oTzuwypaPYTNdLkKmZOBBEsjtZ2YDz2eL1NMwVH4.aab
- 로컬 보관: mobile/.expo/qa/funy-pin-1.0.1-10.aab (67,623,373 bytes).
- SHA-256: 355289791890702647281482f1594739c249902a900d9f9e7c6ca5450672212b.
- PASS AAB manifest의 배포용 패키지 확인, resources.pb의 배포용 Firebase App ID 및 프로젝트 확인.
- PASS Gradle BUILD SUCCESSFUL, processReleaseGoogleServices 및 bundleRelease 로그 확인.
- Play Console 업로드/제출 미실시. 위 제출 전 체크리스트는 미완료 상태 유지.
