# FUNY PIN WEB / APP UI Guide

이 문서는 WEB과 APP의 공통 UI 수치를 관리하는 기준이다.

## Source of truth
- 현재 승인 기준: WEB `funy-ui-guide.css`
- APP: `mobile/lib/theme.ts`는 다음 네이티브 배포 시 WEB 승인 기준에 동기화한다.
- WEB에서 공통 UI가 확정되면 문서와 CSS를 먼저 갱신하고, APP 후속 배포에서 동일 수치를 반영한다.

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
- 동일 픽셀에는 DIM을 한 번만 적용한다.
- WEB 모달/바텀시트의 `::backdrop`은 WebView 콘텐츠 영역을 담당한다.
- APP 상태바 + 네이티브 헤더는 `mobile/components/FunyNativeDimLayer.tsx`만 사용한다.
- Native Header 내부에 별도 DIM을 겹쳐 올리지 않는다.
- SafeAreaView 배경을 어둡게 만든 뒤 DIM 레이어를 추가하는 방식은 금지한다.
- 표준 DIM 색상은 WEB `--funy-dim-color`, APP `OVERLAY.dim`에서만 관리한다.
- 전체화면 이미지/미디어 viewer는 DIM이 아니라 `#09090B` edge-to-edge surface를 사용한다.
- overlay 닫기 시 native dim state와 status bar style을 반드시 원복한다.

## Safe Area rules
- 일반 APP 화면은 Native SafeArea가 상태바 영역을 담당한다.
- 전체화면 viewer는 상태바 뒤까지 edge-to-edge로 확장한다.
- 모바일 브라우저는 `web-safe-area.css` + `web-safe-area.js`가 safe-area 및 theme-color를 담당한다.
- APP 안에서 웹 CSS로 native status bar 영역을 흉내내지 않는다.

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
페이지별 임의 폰트/색상/헤더 높이 추가를 피한다. 공통 UI를 바꿀 때는 먼저 APP `theme.ts`와 WEB `funy-ui-guide.css`를 동기화한 뒤 페이지는 공통 클래스를 사용한다.


## Native parity backlog
WEB에서 먼저 적용했으며 다음 APP 배포 시 함께 맞출 항목:
- MY 내 활동 메뉴 아이콘: WEB과 동일한 이모지 기준
- MY 퍼니몬 도감 No.11~15: 롱냥, 셔플링, 네온콩, 파오링, 조커비
- MY 언어 변경 시 현재 스크롤 위치 유지 + 변경 완료 토스트
- APP 하단 내비게이션에 MY 탭을 추가하는 시점에는 MY 헤더를 WEB 채널 헤더(심볼 + MY)와 동일하게 전환

이 목록을 처리할 때도 APP `mobile/lib/theme.ts`와 WEB `funy-ui-guide.css`의 공통 수치를 유지한다.
