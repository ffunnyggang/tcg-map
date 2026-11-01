# 공통 입력 컨트롤 포커스

- `control-focus.css`에서 입력·선택 컨트롤과 버튼의 focus/focus-visible 아웃라인을 비노출한다. select 래퍼의 focus-within 테두리도 같은 기준을 적용한다.
- 입력·드롭다운의 추가 포커스 링 그림자는 제거하되, 체크박스/라디오/범위 컨트롤의 선택 상태와 버튼의 기존 입체 그림자는 유지한다. 지도 국가·정렬 선택의 원래 그림자는 CSS 변수로 유지한다.
- blur(), preventDefault(), tabindex 변경을 사용하지 않는다. 커서, 키보드 입력·탭 이동, 폼 검증 및 선택 동작을 유지한다. 오류 border/background, checked, aria-selected/aria-pressed 상태는 초기화하지 않는다.
- 공통/관리자 CSS 8개가 이 정책을 import하며, 독립 HTML 화면은 직접 연결한다. 루트 HTML 중 컨트롤이 있거나 공통 스타일을 사용하는 110개 파일의 스타일 캐시 버전만 변경했다. 리디렉션·컨트롤 없는 문서는 유지한다.
- 검증: Chromium에서 native input/select/textarea, 버튼/드롭다운, PICK·랭킹·바인더·키인 래퍼, 지도 중요도 높은 규칙, 모바일 크기 및 app-shell의 실제 computed style을 확인했다. 오류 빨간 테두리, 체크/선택 값, 입력·탭 동작, 원래 그림자 보존도 확인했다. 모든 HTML 변경이 스타일 링크/캐시 버전만 수정했는지 비교했다.
- 적용 범위는 소유한 웹 문서와 이를 표시하는 앱 WebView다. OS가 여는 기본 선택창 내부, 외부 사이트 iframe, 별도 네이티브 입력 컴포넌트에는 CSS가 적용되지 않는다. 앱 재빌드는 하지 않았다.
- 복구: 각 CSS의 import와 HTML 링크/버전 변경 및 공통 정책 파일을 해당 커밋 단위로 되돌린다. 데이터·인증·API 변경은 없다.
