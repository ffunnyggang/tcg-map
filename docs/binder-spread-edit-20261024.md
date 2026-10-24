# Binder editor spread controls

- Layout labels use one row; selected cover swatch keeps its check without the selected outline.
- Endpaper background inherits its neighboring loaded photo's mat. Filled photo buttons have no border.
- Add inserts two pages, preserving the final single-left-page/endpaper spread when the photo count is even. Adding is disabled if two pages would exceed 60.
- Per-page menus/reorder/delete actions removed. Each spread with editable pages has one top-right X. Confirmation identifies the number of attached photos; only that displayed pair's page IDs are removed. Boundary spreads contain one editable page, so only that page is removed and fixed blank endpapers are reconstructed. Other page IDs/photos remain intact.
- Explicit text colors prevent iOS button blue. The editor action bar is viewport-fixed, centered within 480px, with safe-area padding and content clearance.
- No database/native changes. Validation: Chromium/WebKit add/delete/cancel/preservation, fixed bar bounds, computed colors and mat equality; editor types and existing binder regressions.
