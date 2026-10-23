# Runtime efficiency — 2026-10-23

- New CMS uploads keep the source and optionally generate a smaller display image and thumbnail. Existing assets are untouched. New TALK uploads keep the source for detail and use a separate thumbnail in lists. Unsupported formats, animated assets, conversion failures and missing variants fall back to the source.
- Binder covers download when near the viewport. Downloads are deduplicated per account in memory for 30 seconds; logout, native auth updates and page exit clear the shared cache. No private blobs are written to browser storage. Existing binder photo capture and full-detail originals stay in use.
- Public CMS reads share in-flight requests and a 30-second in-memory cache. Cache results are copied before rendering. Successful CMS admin mutations invalidate caches through a cross-tab signal. Foreground return fetches fresh data. Authentication, balances, check-in and private data endpoints never use this cache.
- LIVE PIN checks revision every 60 seconds while realtime is subscribed, every 5 seconds otherwise. Full safety refresh remains every 5 minutes/30 seconds respectively. Foreground and online events force a refresh; duplicate realtime events are coalesced.
- Old banner timers stop when content is replaced. No storage objects or database rows are deleted; there are no schema, billing or native app changes.

Run `node tests/efficiency-runtime.cjs`, `node tests/efficiency-upload.cjs`, `node tests/efficiency-live.cjs`. The dedicated validation workflow runs on subsequent changes.

The optimization is forward-looking: old CMS/TALK originals are not migrated. Actual bandwidth savings require a post-release usage comparison. Native device UI verification remains necessary for Safari/WebView image encoding and app background/foreground transitions.

Rollback: revert this release's runtime/script/HTML changes together. Uploaded originals remain available; separately uploaded derived images remain harmless additional storage. Do not bulk-delete source files because shared publications may reference them.
