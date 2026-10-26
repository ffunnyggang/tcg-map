# FUNY PIN WEB / APP UI Guide

이 문서는 WEB과 APP의 공통 UI 수치를 관리하는 기준이다.

## Source of truth
- 현재 승인 기준: WEB `funy-ui-guide.css`
- APP token: `mobile/lib/theme.ts`
- APP overlay host: `mobile/components/FunyNativeOverlayHost.tsx` + `mobile/components/FunyNativeDimLayer.tsx`
- WebView bridge: `mobile/components/FunyWebView.tsx`
- WEB overlay runtime: `app-runtime-fixes-v2.js`는 상태 감지·배경 잠금·Native bridge만 담당하며 DIM을 직접 생성하지 않는다.
- WEB에서 공통 UI가 확정되면 문서·공통 CSS·Native token/host 계약을 함께 동기화한다.

## Core tokens
| Token | Value |
|---|---|
| Header height | 54 |
| Screen horizontal padding | 14 |
| Card radius | 13 |
| Button radius | 12 |
| Content max width | 420 |
| Text | #181720 |
| Text soft | #4D4852 |
| Muted | #8D8993 |
| Muted 2 | #AAA3AF |
| Line | #E9E5ED |
| Divider | #F4F4F5 |
| Purple | #8062D8 |
| Purple dark | #6749BD |
| Purple soft | #F0EBFB |
| Danger | #C62828 |
| Standard DIM | rgba(20,16,24,.38) |
| Fullscreen background | #09090B |

## Overlay / DIM rules
### 표준 결과
- 최상단 modal / bottom sheet / popup 바로 아래에 화면 전체가 하나의 연속된 DIM으로 보여야 한다.
- 상태바, Native header, WebView 콘텐츠 등 **동일한 물리 픽셀에는 DIM을 한 번만 적용**한다.
- 표준 DIM 색상은 WEB `--funy-dim-color`, APP `OVERLAY.dim`의 `rgba(20,16,24,.38)`만 사용한다.
- 기본 DIM에는 blur를 사용하지 않는다.

### 영역 소유권
- 일반 APP 화면: Web overlay의 backdrop은 WebView 콘텐츠 영역을 담당하고, `FunyNativeOverlayHost`가 WebView 밖의 상태바 / Native header만 담당한다.
- edge-to-edge WebView: WebView가 상태바 뒤까지 실제로 확장된 경우 Web backdrop이 해당 픽셀까지 담당한다. 같은 상태바에 Native DIM을 추가하지 않는다.
- `FunyHeader`는 DIM을 직접 그리지 않는다.
- `app-runtime-fixes-v2.js`는 overlay 상태 감지, background scroll lock, Native bridge만 담당하며 global `::before` pseudo-DIM을 생성하지 않는다.

### interaction
- DIM이 열린 동안 아래 화면의 scroll, touch, map gesture, Native header back/close, bottom navigation 등은 동작하지 않아야 한다.
- DIM 자체는 pointer event를 받아야 한다. `pointer-events:none`으로 아래 화면에 입력을 통과시키지 않는다.
- DIM 영역 tap은 현재 **최상단 dismissible overlay만 닫는다**.
- overlay 자체의 버튼, 입력, 내부 scroll은 정상 동작한다.
- 적용 범위에는 표준 modal/bottom sheet뿐 아니라 이벤트/CMS/사진선택/확인창 등 custom top-layer popup도 포함한다.
- overlay close 시 Web/Native overlay state, background scroll lock, status bar style을 즉시 원복한다.
- overlay가 중첩되어도 opacity를 누적하지 않는다. 현재 최상단 overlay 바로 아래에 시각적 backdrop 1겹만 유지한다.

### 금지
- Native Header 내부 DIM + Native Overlay Host DIM 중복
- SafeAreaView 배경을 어둡게 한 뒤 DIM 추가
- 페이지별 임의 rgba / opacity / blur hardcode
- common runtime의 global pseudo-DIM
- 같은 물리 영역에 Web backdrop + Native DIM 동시 적용

### 명시적 예외
- 전체화면 이미지/미디어 viewer는 DIM이 아니라 `#09090B` edge-to-edge surface를 사용한다.
- OS permission/share 등 system-owned modal은 시스템 동작을 따른다.
- toast 등 background interaction을 허용하는 non-modal UI에는 DIM을 적용하지 않는다.
- 이벤트 팝업, CMS 팝업, 사진 선택/페이지 편집 팝업 등 서비스가 직접 그리는 custom popup도 기본적으로 동일한 DIM / interaction contract를 적용한다.

## Safe Area rules
- 일반 APP 화면은 Native SafeArea가 상태바 영역을 담당한다.
- 전체화면 viewer는 상태바 뒤까지 edge-to-edge로 확장한다.
- 모바일 브라우저는 `web-safe-area.css` + `web-safe-area.js`가 safe-area 및 theme-color를 담당한다.
- APP 안에서 웹 CSS로 Native chrome을 흉내내지 않는다. 단, edge-to-edge WebView가 실제로 상태바 픽셀을 점유하는 경우 그 Web overlay backdrop이 해당 픽셀의 소유자다.

## Typography
APP React Native 기본 시스템 폰트와 WEB 시스템 폰트 스택을 맞춘다.
- Header: 19 / line-height 24 / weight 800 / letter-spacing -0.35
- Page title: 23 / line-height 30 / weight 900
- Section: 16 / line-height 20 / weight 800
- Body: 13 / line-height 20 / weight 500
- Caption: 11 / line-height 16 / weight 500
- Button: 13 / line-height 17 / weight 800
- Navigation: 9 / line-height 11 / weight 700

## Header rules
### Channel header
- HOME / PICK / TALK / MY
- height 54
- left padding 14
- symbol 30×34
- symbol-title gap 8
- title uses Header typography

### Sub-page header
- drawn chevron + title
- left aligned
- back touch target 36×36
- chevron 10×10 / 2px stroke / 135° rotation
- back-title gap 4
- title alignment box 36px high
- title uses Header typography
- WEB class: `.funy-sub-header`
- APP `FunyHeader` uses the same geometry

## Change rule
페이지별 임의 폰트/색상/헤더 높이/overlay DIM 로직 추가를 피한다. 공통 UI를 바꿀 때는 APP token/Overlay Host와 WEB `funy-ui-guide.css` 및 runtime 계약을 먼저 동기화한 뒤 페이지는 공통 상태·클래스를 사용한다.


## Native parity backlog
WEB에서 먼저 적용했으며 다음 APP 배포 시 함께 맞출 항목:
- MY 내 활동 메뉴 아이콘: WEB과 동일한 이모지 기준
- MY 퍼니몬 도감 No.11~15: 롱냥, 셔플링, 네온콩, 파오링, 조커비
- MY 언어 변경 시 현재 스크롤 위치 유지 + 변경 완료 토스트
- APP 하단 내비게이션에 MY 탭을 추가하는 시점에는 MY 헤더를 WEB 채널 헤더(심볼 + MY)와 동일하게 전환

이 목록을 처리할 때도 APP `mobile/lib/theme.ts`와 WEB `funy-ui-guide.css`의 공통 수치를 유지한다.
