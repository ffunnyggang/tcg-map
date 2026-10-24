# Binder menus and editor

- Web detail/fallback and shelf dropdowns use native TALK header dimensions: 126px minimum width, 42px rows, 12px corners and shared visual colors. Existing native binder/TALK menus already use the same headerDropdown styles; no native change in this release.
- Remove profile-side more control from TALK binder cards. Detail and shelf retain their authorized actions.
- Choices are 4/9/12 pockets. Existing 6-pocket photo geometry remains valid; no data or ratio migration.
- Multi-select TCG types persist on drafts and are copied only on publication/share snapshot, preserving the existing publication workflow. Empty selection allowed; existing records default to empty.
- Ten editable default pages remain. Virtual, non-uploadable endpapers precede/follow overview/editor pages. They are never stored in page data, moved, counted, or included in single/gallery mode. Odd photo counts receive a blank left companion before the final right endpaper. Existing images are never removed.
- Editor mat color samples each loaded photo via the shared mat algorithm. No additional image download or per-image server writes.

Validation: Chromium/WebKit menus, endpapers, old 6-pocket data, multi-type save/restore and image mat tests; TALK listing/menu regression. DB transaction verified owner type update, public snapshot, image preservation and invalid-type rejection with rollback. Binder security advisories: none.
