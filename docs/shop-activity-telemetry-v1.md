# FUNY PIN 카드샵 활동 통계 v1 운영 기록 (2026-11-03)

## 목적 및 범위
- 기존 GA4 이벤트/카드샵 관심 등록/현재 HOME 순위는 변경하지 않음.
- 신규 활동 수집: 카드샵 상세가 실제로 열림 / 공유 버튼 클릭 / 길찾기 클릭.
- WEB 및 iOS/Android 웹뷰가 동일한 수집 경로를 사용.
- 회원 로그인 여부와 무관하게 집계하되 원본 IP와 UA는 DB에 저장하지 않음.

## 운영 반영 항목
- DB migration: `20261103052337_shop_activity_collection_staging_v1`
- Tables: `shop_activity_events` (35일 보관), `shop_activity_metrics_30d` (최근 30일), `shop_activity_pipeline_status`.
- DB functions: `ingest_shop_activity` (service_role 전용), `refresh_shop_activity_metrics` (집계 및 35일 초과 삭제).
- Cron job #8: `shop-activity-aggregate-15m`, 15분마다 집계.
- Edge: `shop-activity-track` (Origin allowlist, 서버 생성 HMAC 활동 키, 10분 버킷 중복 제거, 1일 180건 상한).
- Web: `shop-activity-track-v1.js` and script include in `shops.html`.
- Detail override: `detail-funy-v2.js` now sets `#detail.dataset.shopId` and emits `funy:shop-detail-opened`; fixes missing recent-view dispatch too.
- Edge source: `supabase/functions/shop-activity-track/index.ts`.

## 수집 기준
- `detail_view`: 실제 상세 렌더 완료 시 이벤트.
- `share_click`: 공유 버튼 클릭 (공유 완료를 의미하지 않음).
- `directions_click`: 네이버/Google 지도·길찾기 버튼 클릭 (실제 방문 아님).
- 동일 방문자 유사 요청은 매장 × 이벤트 × 10분 버킷 내 1회로 처리.
- 서버가 원본 IP+UA를 비밀키로 HMAC, 날짜별 가명 식별자를 생성. 장기 사용자 식별/개인 프로필 용도로 사용하지 않음.
- 클라이언트의 브라우저/앱 구분은 요청값이므로 신뢰성 검증이 필요.

## 검증 현황
- HTTPS GET/POST: Edge GET 405, invalid event 400, non-existent shop 202 recorded=false.
- valid activity QA: 202 recorded=true, DB row inserted 확인 후 해당 테스트행만 삭제.
- SQL 트랜잭션에서 동일 actor/shop/event 10분 버킷 중복 기록 방지 검증 후 ROLLBACK.
- GitHub script `node --check` 성공; 운영 사이트 script HTTP 200 확인.
- Cron job 8 active; 15분 집계 첫 실행 확인.
- 기존 집계 통계: 96개 매장 `engagement_ready=false`; 기존 432 상세 조회 수는 유지.
- GA4 실조회 (2026-10-27~2026-11-02): shop_detail_view 139, shop_directions_click 2, shop_share_click 0 (데이터 처리 및 웹뷰 차이 추가 확인).

## 전환 게이트 (아직 진행하지 않음)
1. 최소 7일 동안 이벤트 실수집, 중복, 샘플 매장, 웹/iOS/Android 경로 점검.
2. 수집 시작으로부터 30일 미만 기간은 '최근 30일' 완성 데이터가 아님. 이 기간에는 `shop_sort_stats`에 덮어쓰지 않음.
3. 사용자 표본을 통해 GA4와 동향 비교 (중복/지연 때문에 1:1 수치는 다를 수 있음).
4. 소식·탭 추천 알고리즘은 `shop_activity_metrics_30d`를 검증한 뒤 반영.
5. `engagement_ready` 임의 true 전환 금지. 승인된 전환 마이그레이션만 실행.

## 운영 모니터링 SQL
```sql
select event_type, client_surface, app_platform, count(*) events
from public.shop_activity_events
where created_at >= now()-interval '1 day'
group by 1,2,3 order by 1,2,3;
select count(*),max(refreshed_at) from public.shop_activity_metrics_30d;
select jobid, jobname, active from cron.job where jobname='shop-activity-aggregate-15m';
select count(*) filter(where engagement_ready) ready,count(*) total from public.shop_sort_stats;
```

## 주의
- 원본 IP는 저장하지 않지만 HMAC 가명 키도 개인정보 검토 대상일 수 있음. 개인정보처리방침·보유기간 및 이용자 안내 검토.
- 공개 Edge 함수의 봇/프록시를 통한 요청 조작을 완전히 막지는 못함. 순위 전환 전에 서버 측 남용 감지, 접근 통제 강화 검토.
- 기존 `shop_sort_stats.detail_views_30d` 수치의 최초 적재 경로는 미확인. 병행 집계에서 원본과 혼합 금지.
- 롤백: WEB에서 `shops.html`의 tracker script include 제거하면 신규 수집 중지. DB staging tables/Cron은 별도 유지 가능; 필요시 cron job 중지 및 Edge function 비활성화.
