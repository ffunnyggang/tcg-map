# Mobile web top safe area (2026-10-23)

- Shared CSS/runtime are included by 50 public service pages. Admin, test, embedded tools and gateway redirects are excluded.
- Mobile browsers use viewport-fit=cover. Top headers add the device safe inset to their existing height/padding; buttons and titles retain their usable height.
- Map and shop/listing hero media begin at viewport y=0. Only the search/filter and navigation controls receive top insets. Existing listing-detail safe-area CSS is reused to avoid double padding.
- Full-screen masks remain fixed at inset:0. The runtime composites the actual paints at the viewport top into the browser theme color, including modal dialog backdrops, and restores it after dismissal.
- Native app=1, app-shell and embedded iframe contexts do not activate this runtime. Desktop header dimensions remain unchanged.
- Browser chrome is controlled by the browser/OS. Theme color is a hint, not permission to paint images behind every browser's status/address bar. Newer Safari can derive its tint from page backgrounds; the root/body top color is synchronized as well. No native build is required.

## Verification

Syntax: node --check web-safe-area.js; node tests/efficiency-syntax.cjs.
Existing efficiency-runtime.cjs and efficiency-upload.cjs passed.

Browser test: tests/web-safe-area.cjs, Node 24 and an isolated headless Chromium/Edge CDP endpoint.
Serve this checkout on localhost:8086; launch a separate temporary browser profile with --headless=new --remote-debugging-port=9235.
Run node tests/web-safe-area.cjs. SAFE_QA_URL and SAFE_QA_CDP can override endpoints.

The test blocks external services, and replaces only safe-area-inset-top env() with 47px in intercepted CSS/HTML responses; repository assets remain unchanged. The installed Edge does not expose Emulation.setSafeAreaInsets, so this is simulated layout QA, not an iOS status-bar test.
Passed: 13 public header pages (54+47px, binder/event 58+47px), no horizontal overflow, full-screen dim tint and restoration, dialog backdrop tint and restoration, map y=0/search y=57, shop hero y=0/controls padded 61px, listing y=0/header 101px/buttons y=56, native exclusion and desktop height.
Shop/listing content is a DOM fixture using the actual page styles, without signed-in access or production writes.
Final device acceptance: iPhone Safari and Galaxy Chrome, normal/expanded browser chrome, portrait/landscape, map -> shop detail -> back, listing scroll, dim open/close, native app parity.

## Existing CI limitation

PR validation: MY missions passed. The hidden garapon event suite reports 8 passes / 1 failure: its administrator-session test rejects any localStorage reference in admin-garapon-auth.js. The same test was rerun on the pre-change entry-limit checkout and fails identically. Both the auth source and test are unchanged by this PR. This pre-existing failure is separate from the safe-area work; it has not been suppressed or weakened.
