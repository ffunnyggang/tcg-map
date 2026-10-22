# Binder collection v1

Entrypoints: `/binder.html?view=mine` (MY), `?view=feed` (TALK), `?view=edit&id=UUID`, `?view=detail&id=UUID`.

- Uses existing FUNY_WEB_AUTH, including native injected access token. All binder reads require membership; anonymous visitors get a login action.
- Three binders per member, cover plus 20 initial body pages, 4/6/9/12 pockets, 60 body pages maximum. One photo per binder face, not one photo per pocket.
- Guided rear-camera capture or image picker; manual crop/pan/zoom/rotation. JPEG conversion strips original EXIF. No automated perspective/reflection detection.
- Owner-only draft autosave, optimistic revision checking, session recovery after failed saves. Explicit publication snapshots prevent intermediate editing from leaking to readers. Empty draft pages omitted in published reader.
- Gallery and single-page modes; touch/keyboard/buttons, zoom, reduced-motion support. Private storage uses authenticated downloads, not public URLs.
- Likes, daily unique member views, paginated comments, edit/delete own comments, report and shared community blocking. Moderators can hide publications/comments via service role. Reports are in binder_reports; a dedicated admin report screen is not included in v1.
- MY web and TALK links are included. Native MY link is a separate one-row change in mobile/app/account.tsx on app-mvp, requiring a future app build. Existing apps can enter from TALK and switch to My binders.

Database source: `db/binders-v1.sql`, applied as `binder_collection_v1`. No existing tables/policies changed. Draft/publication image references use immutable names; deletion of images referenced by a publication is forbidden. Unreferenced older photo revisions may remain until binder deletion; scheduled storage cleanup is not included.

Verification:
- `node tests/binder-core.mjs`
- `npm ci --prefix tests --ignore-scripts`
- `node tests/binder-ui.cjs`
- `node tests/binder-camera.cjs`
- `tests/binder-rls.sql` runs in a rollback-only database transaction. It expects two existing members and no binder fixtures for the selected owner. Never remove rollback.
- Additional rollback-only storage test verified private photos are invisible to another member, become visible after publication, and are revoked when unpublished.

Physical iOS/Android camera, pinch gestures and visual/browser QA still require device testing. Cloud browser preview was blocked by its URL policy; DOM tests do not replace device QA.
