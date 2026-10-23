# Showcase single-page flipbook

Scope: binder.html?view=detail, single-page view, with at least one photographed
inside page. Editor, editor preview, overview, publication/storage and native
headers are unchanged. Missing engine assets retain the previous viewer.

StPageFlip 2.0.7 is self-hosted with its MIT license. The cover is hard, inside
pages soft, with low-opacity folding shadows. A single subtle paper edge and restrained shadow add depth. The showcase viewer
has 18px side gutters; fine chevrons sit next to the page at vertical center.
Photographed inside pages have a 1% inset. A small local canvas samples each
photo’s darkest quartile and shares the average color across all page mats; the original image stays sharp,
uncropped and unchanged. Canvas failure falls back to a neutral mat. No photos
are uploaded to another service for color extraction.

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

The cover restores rounded right corners and the spine seam. In the app shell,
showcase single-page mode temporarily disables document viewport zoom, blocks
outer multi-touch/gesture zoom, and clips horizontal document overflow. Custom
pinch starts only when both touches are inside the visible image viewer; mode
exit restores the original viewport. Internal zoom/pan remains available.
