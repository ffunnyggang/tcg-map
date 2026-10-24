# Binder TALK moderation and live updates

- Binder post/comment reports use community_post_reports with an exclusive binder target, the same five TALK reasons/statuses and one report per reporter/target. Existing binder_reports writes forward to TALK for cached clients.
- Both admin TALK report entry points load binder metadata. Shared moderation supports hiding/restoring binders; admin-only hidden changes cannot overwrite content.
- Blocking uses community_user_blocks and existing binder/TALK RLS.
- An AFTER UPDATE draft trigger refreshes only already-public, listed binders atomically with autosave. Stopped/shared-only binders remain snapshots. Hidden moderation, publication identity/date, likes/comments/views remain intact. Empty edits can save; first/manual publication still requires a page photo.
- No retrospective publication refresh: the next successful edit saves the current content. Autosave failures retain the previous public version.
- Shelf menus: listed = stop/share/delete, unlisted = showcase/share/delete. Editor action reads 보관함 이동 with a listed-binder live-update notice.
- Migration applied as 20261024054920. Authenticated transaction QA rolls back every fixture mutation; verifies live/stopped/empty updates, report uniqueness/identity checks, shared blocks, admin hiding and preservation on later edits.
- Browser QA uses Chromium/Edge and WebKit, no physical-device test. No native changes required.
