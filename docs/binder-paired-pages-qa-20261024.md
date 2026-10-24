# Binder paired pages

- Editor normalizes odd editable page counts by appending one empty page; final spread has an editable left and fixed blank right.
- Photo-containing editor spreads share showcase shading and folds. Empty editor spreads keep their existing style.
- Cover/page modal controls have explicit ink colors and close buttons have no focus ring.
- Published snapshots retain every draft page in order. Rendering hides only spreads with no photos on either side; blank mates remain in place. Fullscreen gallery remains photo-only.
- Migration 20261024051444 preserves snapshot ownership/type logic and rejects all-empty publications. Applied and verified in a rolled-back authenticated transaction.
- Existing publications are not overwritten from private drafts. Previously compacted snapshots require republishing to restore original page positions.

Validation: paired-pages, editor-types, view-polish and spread-edit suites passed in Chromium/Edge and WebKit. Screenshot reviewed. No physical iOS device test or native build performed.
