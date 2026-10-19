# AOS 플로팅 버튼 로컬 QA

## 기준선

- 기준 커밋: `9859cb90`
- 로컬 브랜치: `work/aos-native-floating-toggle-from-9859cb90`
- 개발 패키지 기준: `kr.funypin.app.dev`
- APK/AAB 생성 없음
- Google Play 비공개 테스트 변경 없음
- 운영 Supabase `app_floating_actions` 적용 완료 (기본값: HOME/MAP/PICK/TALK 모두 native)

## 구현 단위

1. `cf805b5c` — 원격 설정, SecureStore 캐시, 공통 Safe Area/내비게이션 높이, SQL 마이그레이션 준비
2. `8a68a34d` — WebView의 `NATIVE / WEB / OFF` 표시 전환
3. `22d2f0af` — HOME·PICK·TALK 네이티브 플로팅 버튼 연결
4. `3589950b` — TCG MAP 네이티브 통합 메뉴 연결
5. `2fd15f95` — 어드민 플로팅 버튼 설정 화면
6. `9f0d5135` — 캐시 복원 및 60초 원격 재조회
7. `27fbfd46` — 캐시 준비 전 중복 노출 방지 및 WEB 모드 즉시 복귀
8. `ec9bf301` — 개발 모드 전용 로컬 표시 방식 오버라이드

## 표시 방식

| 모드 | 네이티브 버튼 | 웹 버튼 |
|---|---:|---:|
| `native` | 노출 | 숨김 |
| `web` | 숨김 | 노출 |
| `off` | 숨김 | 숨김 |

Android는 설정값을 사용하고 iOS는 기존 웹 버튼을 유지합니다. 설정은 앱 활성화 시와 최대 60초 간격으로 다시 조회하며, 네트워크 실패 시 마지막 정상 캐시를 사용합니다.

## 화면별 네이티브 동작

- HOME: LIVE PIN 이동
- TCG MAP: `LIVE PIN 제보 / TCG 거래 / 매물 등록` 메뉴
- PICK: LIVE PIN 이동
- TALK: 어드민에 등록한 외부 링크 이동

TCG MAP 메뉴는 기존 웹 거래 기능을 재개발하지 않고 WebView 명령으로 현재 웹 기능을 호출합니다.

## 자동 점검

PowerShell에서 다음을 실행합니다.

```powershell
cd C:\Users\ALIC\Desktop\tcg-map-aos-qa\mobile
node .\scripts\check-floating-actions.mjs
npx.cmd tsc --noEmit
npx.cmd expo-doctor
npx.cmd expo config --type public
```

## 로컬 화면 확인

### 빠른 실행 스크립트

아래 스크립트는 개발 모드 환경변수만 설정하고 로컬 Android 화면을 실행합니다. APK/AAB는 생성하지 않습니다.

```powershell
cd C:\Users\ALIC\Desktop\tcg-map-aos-qa\mobile
.\scripts\run-floating-mode.ps1 -Preset native
.\scripts\run-floating-mode.ps1 -Preset web
.\scripts\run-floating-mode.ps1 -Preset off
.\scripts\run-floating-mode.ps1 -Preset mixed
.\scripts\run-floating-mode.ps1 -Preset remote
```

화면별 조합도 지정할 수 있습니다.

```powershell
.\scripts\run-floating-mode.ps1 -Preset native -MapMode web -TalkMode off
```

실행 없이 적용될 모드만 확인하려면 `-DryRun`을 사용합니다.

```powershell
.\scripts\run-floating-mode.ps1 -Preset mixed -DryRun
```

### 전체 네이티브

```powershell
cd C:\Users\ALIC\Desktop\tcg-map-aos-qa\mobile
$env:EXPO_PUBLIC_FLOATING_MODE_HOME='native'
$env:EXPO_PUBLIC_FLOATING_MODE_MAP='native'
$env:EXPO_PUBLIC_FLOATING_MODE_PICK='native'
$env:EXPO_PUBLIC_FLOATING_MODE_TALK='native'
npx.cmd expo start --android --clear
```

### 전체 웹

```powershell
$env:EXPO_PUBLIC_FLOATING_MODE_HOME='web'
$env:EXPO_PUBLIC_FLOATING_MODE_MAP='web'
$env:EXPO_PUBLIC_FLOATING_MODE_PICK='web'
$env:EXPO_PUBLIC_FLOATING_MODE_TALK='web'
npx.cmd expo start --android --clear
```

### 화면별 미노출 예시

```powershell
$env:EXPO_PUBLIC_FLOATING_MODE_HOME='native'
$env:EXPO_PUBLIC_FLOATING_MODE_MAP='off'
$env:EXPO_PUBLIC_FLOATING_MODE_PICK='web'
$env:EXPO_PUBLIC_FLOATING_MODE_TALK='off'
npx.cmd expo start --android --clear
```

### 환경변수 초기화

```powershell
Remove-Item Env:EXPO_PUBLIC_FLOATING_MODE_HOME -ErrorAction SilentlyContinue
Remove-Item Env:EXPO_PUBLIC_FLOATING_MODE_MAP -ErrorAction SilentlyContinue
Remove-Item Env:EXPO_PUBLIC_FLOATING_MODE_PICK -ErrorAction SilentlyContinue
Remove-Item Env:EXPO_PUBLIC_FLOATING_MODE_TALK -ErrorAction SilentlyContinue
```

환경변수 오버라이드는 `__DEV__`에서만 적용되므로 preview/production 빌드에는 적용되지 않습니다. `-Preset remote`는 오버라이드 값으로 `remote`를 넣어 실제 Supabase 설정을 사용하게 합니다.

## 어드민/원격 설정 확인

운영 Supabase에는 `app_floating_actions`가 적용되어 있으며 기본값은 네 화면 모두 `native`입니다. 실서비스 어드민의 `앱 플로팅 버튼`에서 저장한 값은 AOS 로컬 `-Preset remote` 실행 시 그대로 조회됩니다.

로컬 소스의 참고 마이그레이션 파일:

```text
supabase/migrations/20261019_app_floating_actions_v1.sql
```


## 필수 회귀 확인

- 네이티브 모드에서 같은 화면의 웹 버튼이 동시에 보이지 않음
- WEB 모드 전환 후 앱·WebView 재시작 없이 웹 버튼이 다시 표시됨
- OFF 모드에서 양쪽 버튼 모두 미노출
- 네이티브 버튼이 Android 시스템 내비게이션과 겹치지 않음
- 카드샵 상세, TALK 상세, 거래 상세, 등록 오버레이에서 네이티브 버튼 자동 숨김
- MAP 메뉴를 닫을 때 하단 네이티브 내비게이션은 딤 처리되지 않음
- HOME·PICK LIVE PIN, TALK 외부 링크, MAP 세 가지 메뉴 동작 정상
