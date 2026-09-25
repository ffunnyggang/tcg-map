# FUNY PIN App MVP

Expo + React Native 기반 앱 전환 작업용 디렉터리입니다. 운영 웹과 분리하기 위해 `app-mvp` 브랜치에서 시작합니다.

## 현재 연결
- Supabase Auth 세션 저장: Expo SecureStore
- 공통 카드샵 Read Model: `public.v_app_shops`
- 첫 화면: 실제 동적 카드샵 목록 조회

## 실행
`cd mobile && npm install && npx expo start`

다음 단계: Expo Router 탭(HOME / TCG MAP / PICK / TALK), 로그인/프로필, 지도 SDK, 즐겨찾기.
