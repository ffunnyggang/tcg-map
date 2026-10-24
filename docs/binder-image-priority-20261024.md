# Binder image loading priority — 2026-10-24

Keep the iOS data URL/decode path that restored photo display. Change the flipbook's eager all-page loading into a priority queue: current page, next page, then previous page (maximum two active jobs). Distant pages are processed one at a time after a short 120ms yield, leaving capacity for a page-turn request. Reorder pending work on flip. Cancel queued work on teardown/rebuild; already-started private downloads remain in the existing per-page cache.

Exclude flipbook images from the general IntersectionObserver so it cannot bypass queue priority. Overview/editor lazy loading, shared mat-color calculation, image permissions and image quality remain unchanged. Mat color still derives from all pages when background sampling completes. The optimization targets first useful paint and peak concurrent conversion, not faster completion of every offscreen image.

Validation: Chromium and WebKit tests with 21 photos start exactly two jobs instead of 21, maintain a maximum of two during navigation, load background sequentially and stop queued work after teardown. Existing owner/non-owner JPEG tests cover single, overview and full-page display using the iOS-safe source. Physical iPhone timing remains to be confirmed; no network speed multiplier is claimed.
