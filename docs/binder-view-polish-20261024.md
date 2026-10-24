# Binder showcase UI polish — 2026-10-24

- Single showcase root, page, face and mat keep the cover's 4px/12px board radius. Overview and editor radius selectors are unchanged.
- Remove the disabled '바인더 메뉴' select option from shelf, detail and TALK binder cards. Initialize selects at selectedIndex=-1 so the first action is selectable; existing handlers reset to the empty selection after use. Accessible select labels remain.
- Share darkest-quartile sampling/average in binder-mat.js. Single mode remembers its final mat color for overview; overview samples only normally loaded images and applies the same aggregate when all page samples are available. No additional all-photo downloads. Detail overview spread/photo backgrounds use that shared mat color; padding remains unchanged.
- Detail overview right-page numbering is aligned to the right outer margin. Editor numbering is unchanged to avoid its existing page-menu control.
- Full-page photo display uses the market-detail gallery's black #09090b canvas, top-left close and top-right n / total count, with horizontal scroll snapping. Opens at the selected page, lazily loads current/adjacent photos, retains pinch/double-click zoom and history-back dismissal. Removed the previous visible title and +/-/percentage toolbar. The dialog remains a top-layer element and restores overview scroll on close.

Validation: Chromium/WebKit owner/non-owner image checks, new UI checks for radius scope, shared mat, numbering, select items/initial state, gallery selection/navigation/zoom/back; screenshot inspection. Existing full-page tests updated for gallery count and gesture zoom. Native menus and builds are unchanged; physical app QA remains necessary.
