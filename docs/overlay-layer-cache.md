# Mobile paired-layer reuse

`card-art.html` looks up raw layers before invoking AI. The provider prompts, dimensions and generation masks are unchanged. Window adjustment and optional symbols/borders remain local.

- Illustration key: prompt version + artwork group.
- Text key: prompt version + artwork group + ko/ja/en.
- Each successful mobile provider response saves its raw PNG and generation row, then publishes the layer independently. A failed later request does not remove earlier output.
- Publication uses the primary key with `resolution=ignore-duplicates`: the first saved layer remains the shared asset. Concurrent cold requests can still generate more than once, but do not overwrite the shared layer.
- If publication failed after raw persistence, lookup recovers the current user's most recent matching generation. This also allows existing matching paired raw outputs to be reused. It never uses the flattened `prepared.png` as a layer.
- Shared lookup returns short-lived signed raw URLs, not another user's mutable generation ID. Prepared saves remain owner-scoped. On a fully reused result the existing final-save endpoint is skipped; the PDF is composed locally and the shared raw layers stay unchanged.
- Lookup/storage failures fail closed rather than triggering paid fallback generation. Successful responses whose raw storage fails still return their image, preserving existing behavior; such an outage cannot guarantee persistence across refresh.
- A shared artwork group has at most one reference per language in the initial data. Text is never reused between languages.

## Mapping coverage

501 references are seeded with independent keys. 169 non-Japanese references (112 ko, 57 en) are linked to Japanese keys using stored artwork descriptor cosine >=0.90 and runner-up margin >=0.20; Korean matches additionally require identical card numbers. No duplicate language exists within a linked group. Other references remain independent to avoid sharing the wrong artwork. This is conservative automated matching, not a claim of complete manually verified cross-language coverage. Future mappings must account for artwork variants, not just Pokemon names or English card numbers. When changing groups after cache population, migrate relevant keys explicitly.

`overlay-layer-cache-setup.sql` records the applied idempotent schema/seed. Both tables have RLS enabled with no browser grants/policies: service-role access only through the authenticated, allowlisted Edge Function. The no-policy security advisory is intentional for these private server-managed tables.

Validation: server authorization, per-language keys, shared artwork keys, raw URL selection, failed-cache behavior, generation publication, partial-success recovery; flow tests cover cache hits with zero AI calls, new session after illustration failure, missing-language-only generation. No live AI request used for this change.
