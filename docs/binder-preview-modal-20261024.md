# Binder editor preview gallery

- Shelf guidance begins with ※ and stays on one line immediately below the intro.
- Preview follows market image full-screen viewing: opaque #09090b canvas, upper-left close, upper-right current/total count and horizontal swipe navigation.
- Reuses the binder full-image gallery with private loading, adjacent-image preloading, pinch/double-click zoom and keyboard arrows. Cover is the first slide; blank mates in photo-bearing spreads retain their position. Entirely empty spreads are excluded.
- Generated color covers render as a cover card; uploaded covers and pages use contain-fit images. No profile, title/description block, social controls, all-mode toggle or page-turn animation.
- Editor DOM stays mounted. Close/Escape/back restore scroll and editing state. Preview never changes publication state.
- Listed saved status, sticky web header, nonsticky status row and translucent delete X from earlier changes are retained.
- Native header/status-bar coverage remains the separately tracked next-build task; this web-only change does not add native overlay support.

Validation: Chromium/Edge and WebKit gallery, swipe, zoom, close/back/Escape, editor scroll and short mobile viewport; existing public gallery regressions. No physical-device build.
