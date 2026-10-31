# HOME card shop discovery

CMS > HOME > 카드샵 추천 (4개 영역) > ⋮ opens the editor. The existing block publish toggle controls the whole block; editor switches independently control Today/Browse/Themes/My shops. All off removes the title and avoids shop/personal/stat queries. Move the block using the existing CMS ordering.

Today inherits the previously published CMS shop selections, deduplicated in CMS order. The editor supports ordered additions/removals. No daily randomization. Beginner, box and oripa reuse existing curated lists; rare singles starts empty because rarity cannot be inferred from single-card availability. Play falls back to verified play_space features; 24-hour shops require an explicit 24시간 hours field. Deleted/inactive/closed shops are excluded at runtime.

Browse uses the same normalized popularity formula as TCG MAP: ready .30 favorites + .25 detail opens + .15 shares + .30 directions; incomplete metrics renormalize favorites/detail opens to .30/.55 and .25/.55. Favorite counts are aggregate counts, never raw user favorite records. Directions remains pending until engagement_ready is true for every aggregate row. Region filter applies only to Browse. Map button opens TCG MAP; the current map does not implement HOME's full region/directions tab state transfer.

My shops uses the signed-in user's shop_favorites sorted newest first. Recent details are recorded only after app.js successfully renders a real shop detail, never a map bubble or list. 30 days, 10 distinct IDs, most recent first. Signed-in history uses owner-only RLS; anonymous history is device-local. Guest history is never silently merged into an account. If account history fails, only that account's device-local cache is used. A repeat detail render within 3 seconds is ignored. No pre-launch backfill.

The migration preserves legacy CMS collections/items and stores their former visibility in home_shop_config.legacy_blocks before hiding them. All other CMS placements, news/BOX/graded/Shorts content, hero banners and CMS image capture remain unchanged. To reverse the UI transition, restore each legacy block's stored status/is_active and hide the home_shop_discovery block. Do not delete private history or drop columns during a UI rollback.

Validation: node tests/home-shop-model.cjs; JavaScript/HTML inline syntax; actual public nested shop API; tests/home-shop-db-qa.sql executes role checks with transaction rollback. Mobile/desktop DOM and live interaction checks are reported at deployment time. Browser checks are not native iOS/Android device certification.

Additional DOM controller/editor tests: install pinned linkedom 0.18.12 in /tmp/fhs-testdeps, then run node tests/home-shop-controller.cjs and node tests/home-shop-admin.cjs. These exercise all-off network suppression, exact list limits, pending metrics, BFCache refresh, idempotent mount, selection edits and revision-checked save without production mutations.
