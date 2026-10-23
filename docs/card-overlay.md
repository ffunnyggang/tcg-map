# Card overlay test

Independent route: /card-overlay.html. Existing navigation and shared scripts are unchanged.

Implemented: image upload; explicit four-corner perspective correction; manual art-window calibration in millimetres; masked outpainting via a server-only API; local generated-art import; assembled preview with original art composited over generated output; cut-window PNG; A4 PDF with a 63 x 88 mm overlay, outer crop marks and a 10 mm calibration ruler. Guides are rasterized at 12 px/mm. PDF image occupies 83 x 118 mm on an A4 page. PNG pixel dimensions are 996 x 1416; use PDF for physical scale.

Deploy `supabase/functions/card-overlay-generate/index.ts` with JWT verification enabled. Auth is also checked with Auth /user. Before enabling generation, configure Supabase Edge Function secrets:

- OPENAI_API_KEY: a funded image API project key (never put in HTML, chat or Git).
- Test access: set the admin-controlled Auth app_metadata.card_overlay_test boolean to true for specifically authorized accounts. Do not use user_metadata. OVERLAY_TEST_USER_IDS remains an optional additional list of Auth user UUIDs.
- OVERLAY_ENABLED: true; missing defaults to disabled.
- OVERLAY_IMAGE_MODEL: optional; default gpt-image-2.5-sunburst.

Generation is off until an allowed account, API key and explicit enable flag are all present. Auth /user is read on each call so permission changes do not depend on a stale JWT claim. Status messages distinguish test permission, missing key and disabled generation. Status is authenticated; a new private bucket `overlay-generation-limits` is created on the first authorized generation. Private quota markers atomically reserve at most 3 attempts per account and 20 across all accounts per Korean day, across isolates. Failures and uncertain timeouts count as attempts; no automatic retries. No user-uploaded images are stored in Supabase; image and mask are sent to the image API only when requested. The client processes uploaded/imported images locally otherwise.

Quality acceptance still requires several real card photographs and a physical print at 100%. The editor uses a rectangular art window and a default 63 x 88 mm outer size; it does not recognize card IDs or auto-detect the art window. Manual corners/window placement is intentional in this first test. Printouts are for a protective sleeve overlay; do not cut the original card. Smartphone file handling varies by WebView; verify download/share before adding the route to app menus. No app release is claimed.

Tests: node --test tests/card-overlay.test.mjs. Browser QA: real photograph correction, geometry boundaries, art import, output dimensions, 100% print calibration. API end-to-end generation requires funded key + allowlisted signed-in user; mocked tests are not quality validation. Scope does not include public launch or IP licensing clearance.
