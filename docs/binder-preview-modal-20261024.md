# Binder editor preview modal

- Shelf public-list guidance appears on one line immediately below the intro copy.
- Listed saved status reads 자랑 중인 바인더에 자동 저장됨. Pending/error/retry status is preserved; the status row is no longer sticky.
- Web editor header stays sticky; photo delete X opacity is 0.65.
- Preview keeps the editor DOM and opens a full-viewport dialog over one dim backdrop. Only the binder, page count, navigation and close control appear; no public profile, social controls or all-pages mode.
- Preview starts from the cover in single-page mode. Existing page-turn renderer and private image loading are reused. Close, Escape and browser back return to the editor at its previous scroll position. Pending page turns are invalidated on close.
- Dialog is sized for short/narrow mobile viewports. Background is inert while open.
- Web header is covered by the dialog backdrop. Native app header/status-bar dim extension remains the next-build task recorded in mobile/qa/app-next-build-dim-todo.md on the native work branch; this web patch does not claim to add native coverage.

Validation: Chromium/Edge and WebKit preview navigation, close/back/Escape, retained editor state/scroll, sticky header and 320px viewport checks. No physical device build.
