# Showcase single-page flipbook

Scope: binder.html?view=detail, single-page view, with at least one photographed
inside page. Editor, editor preview, overview, publication/storage and native
headers are unchanged. Missing engine assets retain the previous viewer.

StPageFlip 2.0.7 is self-hosted with its MIT license. The cover is hard, inside
pages soft, with low-opacity folding shadows. A decorative page stack and
cover edge add depth without distorting the photos at rest.

Input: horizontal pointer dragging folds the page; release delegates completion
or return to StPageFlip. Vertical intent leaves page scrolling alone. A second
pointer or pointercancel discards the fold without advancing. Pinch zoom uses
the existing viewer handlers, locks page navigation and scales the fixed book;
returning to 1x restores turning. Buttons and keyboard use the same engine.
Reduced motion uses immediate page changes. Resize, mode switching and pagehide
clean up the engine (including a local upstream RAF/listener lifecycle fix).

Checks completed:
- node --check binder.js / binder-flipbook.js / vendor bundle
- node tests/binder-core.mjs
- node tests/binder-flipbook-state.cjs
- git diff --check

Browser checks are provided in tests/binder-flipbook.cjs. They use local fixture
data, never the production database. Run with Playwright + Chromium installed:
`node tests/binder-flipbook.cjs` (set NODE_PATH when supplied by the runtime).
Not executed successfully in the authoring environment: Chromium was absent and
browser download endpoints returned HTML rather than the browser archive.

Before production deployment, run the browser suite and verify on real iOS and
Android WebViews: short drag return; full forward/backward drag; pinch during a
fold; scrolling tall 6/12-pocket pages; first/last page; rapid arrows; overview
roundtrip; screen resize and background/foreground return. Check text/photo
clarity, page shadow clipping and neutral page position on a narrow phone.
