# Mobile extended-art free launch

Landing: `/card-art.html`. CMS banner uses existing in-app page navigation. No CMS records or TCG TOOL links changed by this release.

- Korea time Nov 8, 2026 00:00 inclusive through Nov 15 00:00 exclusive. Calendar-day launch chosen by operator.
- Signed-in, non-anonymous members. Admin test generation paths remain allowlisted.
- Three distinct card references per account per Korea day. A reference includes language. Charge once when the user starts generating, including cache hits and failures; retrying that same card on the same day is idempotent. Text and art do not each consume a card. Adjustment/export do not consume cards.
- Card reservations serialized in Postgres across tabs/devices. Three provider attempts per layer/reference/day, separate from the visible card count; no automatic retries. Existing global provider safety budget of 100 attempts/day retained; cache hits do not consume that provider budget.
- All new layer outputs retain private DB/Storage records. QA-owned outputs can publish shared assets; general members can recover/reuse their own layers but cannot poison another member's shared cache with modified client inputs.
- November 15: reject new free claims, cache retrieval and generation. Existing in-page results can still be exported. No coin debit or pricing is implemented; the page says coin access is being prepared.

Database setup: `overlay-public-launch.sql` (applied migration `overlay_public_launch_card_quota`). Table/RPC are service-role only, RLS enabled, RPC security invoker, user identity supplied only after project Auth verification. No client-supplied timestamps or user IDs.

QA: server/mobile/geometry/layer/PDF tests; transaction-rolled-back real DB quota probes for duplicate cards, paired layers, fourth-card rejection, role access; launch boundary checks. No paid AI calls during release QA. Existing admin full-art test harness repaired to provide its original/wide-mode dependencies; admin implementation unchanged.

Rollback: redeploy prior Edge function and prior card-art HTML/module together. Preserve usage records for audit. Never reopen the window or delete usage to reset quota without an operator decision.
