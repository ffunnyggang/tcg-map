# FUNY PIN WEB / APP UI Guide

이 문서는 WEB과 APP의 공통 UI 수치를 관리하는 기준이다.

## Source of truth
- APP: `mobile/lib/theme.ts`
- WEB: `funy-ui-guide.css`
- 공통 수치 변경 시 두 파일을 함께 갱신한다.

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
- `‹ + title`
- left aligned
- back touch target 36×36
- back-title gap 4
- title uses Header typography
- WEB class: `.funy-sub-header`

## Change rule
페이지별 임의 폰트/색상/헤더 높이 추가를 피한다. 공통 UI를 바꿀 때는 먼저 APP `theme.ts`와 WEB `funy-ui-guide.css`를 동기화한 뒤 페이지는 공통 클래스를 사용한다.


## Native parity backlog
WEB에서 먼저 적용했으며 다음 APP 배포 시 함께 맞출 항목:
- MY 퍼니몬 도감 No.11~15: 롱냥, 셔플링, 네온콩, 파오링, 조커비
- MY 언어 변경 시 현재 스크롤 위치 유지 + 변경 완료 토스트
- APP 하단 내비게이션에 MY 탭을 추가하는 시점에는 MY 헤더를 WEB 채널 헤더(심볼 + MY)와 동일하게 전환

이 목록을 처리할 때도 APP `mobile/lib/theme.ts`와 WEB `funy-ui-guide.css`의 공통 수치를 유지한다.
