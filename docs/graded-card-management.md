# 등급카드 등록·관리

판매처 정보 아래 등록/관리 탭을 제공한다. 각 판매처의 등록 권한 또는 전체 관리자 권한이 필요하다.

관리 목록은 50개씩 조회하며 가격, 판매 상태, 문의 방식을 수정한다. revision 비교로 동시 수정 덮어쓰기를 차단한다. 삭제는 deleted_at 기록 및 hidden 전환이며 목록에서 제외한다. 복구는 운영 DB 작업으로 가능하다. 기존 관심 내역과 통계를 보존한다.

문의 방식은 none, phone, email, instagram, visit이다. 연락처는 공개 상품 상세에 표시·연결되므로 등록 폼에 공개 안내를 표시한다. visit는 방문 안내와 지도 링크를 제공하며 예약이나 메시지를 접수하지 않는다. 전화/이메일은 기기의 기본 앱, 인스타그램은 외부 프로필을 연다. 미설정 카드는 버튼을 비활성화한다.

register_shop_graded_card_with_contact는 기존 등록 RPC를 호출하고 문의 설정을 같은 트랜잭션에 저장한다. 재요청 시 기존 상품 및 문의 설정을 유지한다. manage_shop_graded_card는 로그인, 현재 판매처 권한, 상품 소속, 삭제 여부, revision, 값 형식을 검증한다. 인증된 사용자만 실행 가능하며 anon 실행은 차단한다.

검증: check-graded-registration.cjs, check-online-shop-api.cjs, check-graded-contact.cjs 및 rollback SQL qa-graded-management.sql / qa-graded-registration-contact.sql. DB QA는 모든 변경을 롤백한다.

롤백: 프론트와 Edge Function을 이전 버전으로 복원한다. 추가 컬럼은 유지하면 기존 클라이언트와 호환된다. 삭제된 상품을 일괄 재노출하거나 연락처 데이터를 제거하지 않는다.
