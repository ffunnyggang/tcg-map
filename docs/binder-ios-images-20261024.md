# iOS binder image display — 2026-10-24

Reported: another member's public binder shows dark pages on iOS, in both single and overview modes.

Read-only production investigation:
- All 59 public publication image references have matching storage objects (JPEG, max 711423 bytes).
- An authenticated non-owner role could read all images referenced by visible public publications in a rollback-only SQL test. No policies changed.
- Last-24h edge logs showed iPhone binder image GETs succeeding (462 HTTP 200), no denied image responses in the queried set. This aggregate does not prove the individual failing request or its decoded contents.
- WebKit with isolated valid image fixtures displayed images; the reported physical device failure was not reproduced. Do not describe blob decoding as a proven root cause.

Mitigation: retain authenticated Storage downloads and private in-memory caching, but use FileReader data URLs for iOS/iPadOS instead of blob URLs. Decode before caching a usable source. Other browsers retain blob URLs with a data URL fallback on decode failure. Empty/invalid data rejects and evicts the per-page promise cache. Failed page loads now show a readable message over the mat instead of unexplained dark content. No public bucket, signed URL, database, permissions, or native changes.

Tests: Chromium and WebKit, owner and non-owner cold JPEG fixtures, single/overview/full-page natural dimensions, shared download cache, invalid blob fallback, corrupted image rejection/message. These are browser tests, not physical iPhone QA. Physical-device confirmation remains necessary.
