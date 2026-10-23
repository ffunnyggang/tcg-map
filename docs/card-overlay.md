# Pokémon card overlay QA

Unlisted route: `/card-overlay.html`. Existing service navigation and native app code are unchanged. Public launch remains a separate decision after final QA.

## Supported workflow

The UI is scoped to standard, portrait Pokémon cards with a rectangular illustration window at the top. Full-art, jumbo and landscape layouts are unsupported. The user confirms the supported card type before generation; this is not an automated Pokémon authenticity or species classifier.

Direct camera capture uses a 63:88 guide and local image analysis. A foreground component is fitted with four edges to estimate the card quadrilateral. Guide alignment, internal Laplacian detail, inter-frame motion and white glare are checked for a stable 1.1-second interval before auto capture. It does not require exact 100% guide overlap. Manual capture, photo import and manual corner fallback remain available. Camera requests occur only on an explicit button click; all tracks stop on close, hidden tab or page exit, including late-resolving requests. HTTPS and camera permission are required; some WebViews may need native permission support.

Imported photos attempt automatic card-edge detection first. Successful detection triggers perspective correction; failed detection asks for four corners. A corrected card can return to manual corner editing. Dark, plain backgrounds work best; hands, low contrast, foil reflection and complex backgrounds may prevent automatic recognition.

The illustration window is estimated from image edge contrast within expected top-window bands. General and classic layout presets are estimates, not universal Pokémon specifications. Low-confidence results are explicitly marked and open fine controls. All results require user confirmation. Fine controls offer 1x/1.5x/2x preview, 0.1 mm movement and numeric position/size adjustments. Changing the window invalidates existing generated art.

## Generation and print geometry

The original illustration's physical size and position stay fixed. New generation maps the known illustration into a 67 x 92 mm canvas: a 63 x 88 mm trim area plus 2 mm on each side. New API inputs, masks and requested output are 1072 x 1472 pixels (67 x 92 at 16 px/mm), avoiding aspect-ratio distortion. Legacy 1024 x 1536 requests remain accepted for older clients. Image/mask dimensions must match. Normalized coordinates are mapped using the extended canvas dimensions; preview crops back to the trim area. It does not enlarge the artwork within the card. Original artwork is composited over the generated image in the assembled preview.

Print sheets include outer bleed, external crop marks, an inner cut-window dashed line placed inside the discarded side, and a 10 mm calibration ruler. The cut-window interior retains 0.5 mm of sacrificial artwork to reduce white seams from small cutting errors. Final trim stays 63 x 88 mm. Users choose square corners or a rounded R3 mm guide; R3 is a QA value requiring comparison with real cards, not a certified manufacturing radius. Corner changes require no new API generation.

PNG output is 996 x 1416 pixels at 12 px/mm. A4 PDF embeds that 83 x 118 mm print sheet at fixed physical size. Print at 100% with page fitting disabled and verify the ruler. Imported prior 63 x 88 mm art remains supported with no outer bleed; 67 x 92 mm imports must explicitly select the extended range. The no-AI print sample includes outer bleed and a distinct sample label.

## Server and access

Deploy `supabase/functions/card-overlay-generate/index.ts` with JWT verification enabled. Auth `/user` verifies current server-controlled `app_metadata.card_overlay_test === true`; an optional `OVERLAY_TEST_USER_IDS` UUID list is also accepted. Never authorize from user metadata. Configure server-only `OPENAI_API_KEY` and `OVERLAY_ENABLED=true`; optional `OVERLAY_IMAGE_MODEL` overrides the existing model. Never store credentials in frontend code, chat or Git. Status distinguishes permission, missing key and disabled generation.

Authorized QA accounts have no per-account daily cap; a private atomic slot bucket retains the global 20-attempt cap per Korean day. Provider rejections and uncertain timeouts count as attempts and are not automatically retried. Server errors distinguish insufficient API quota, transient 429, invalid key, model access and generic failures. Logs include sanitized error codes, never API keys or uploaded images. Uploaded images and camera frames are processed locally except for the explicitly requested masked generation sent to the image API. No photos are persisted to Supabase.

## Validation

Run `node --test tests/card-overlay.test.mjs tests/card-overlay-server.test.mjs tests/card-overlay-vision.test.mjs`. Validate live sample PNG/PDF, physical scale, both trim shapes and illustration mapping. Synthetic-frame tests verify guide ratio, corner detection/fallback and quality gates; they do not replace real camera QA. Physical devices, representative Pokémon card eras, foil glare, printer alignment, corner radius and native WebView permissions still require user QA before launch.

## Anchor continuity validation

The background-continuity-v2 prompt names only the fixed input rectangle and surrounding scene. It forbids recomposition and subject duplication for layout quality; it does not change model safety settings, promise copyright clearance or attempt to make blocked requests pass. Moderation rejection remains terminal with no automatic retry.

New generation sends an optional validated numeric anchor rectangle. The browser compares a downsampled original anchor against the same location in the returned image using color MAE and correlation. Changed anchors trigger an explicit review warning. The generated image remains visible in raw mode, and users may compare it against the original overlay. Download stays disabled until the user explicitly confirms the result is usable. A preserved anchor is not proof that the entire outer seam is perfect; users still inspect horizons, colors and duplicated subjects. Check thresholds need real-output QA and may reject some useful results. No extra image API calls are made for this local check. Earlier results are not retroactively repaired; actual raw generated images plus source crops are needed to assess them quantitatively.

## Local review and diagnostics

A local anchor mismatch is a quality warning, not an API generation failure. Keep the returned image available for inspection; default to raw preview when a mismatch is detected. The user can compare raw AI output, assembled view and cut-window preview, then explicitly approve download. `report_quality` records only bounded client-reported correlation, MAE, decision and provider request ID; it requires test permission, sends no images and performs no provider calls or quota reservations. These reports diagnose browser validation separately from provider rejection. Existing prior browser failures cannot be reconstructed from a server success log alone.
