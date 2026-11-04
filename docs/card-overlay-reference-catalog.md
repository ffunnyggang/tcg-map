# Overlay reference image catalog

Updated 2026-11-04 (KST). Private, test-only images for illustration matching.

| Set | Source | Stored primary images |
| --- | --- | ---: |
| 30th Celebration (English) | https://communitybinder.com/sets/me/30th?region=en | 158 |
| Classic Collection (English) | https://communitybinder.com/sets/me/me55cc?region=en | 30 |
| 30th CELEBRATION M6a (Korean) | https://www.dogam.app/sets/01KYMTS097F86Y45P4R6YVY9N8 | 176 |

Total: 364 images. English originals are 733×1024. Korean originals are 868×1212, 641×896 or 573×800; files retain the source resolution. Downloaded PNG signatures, dimensions and SHA-256 are checked, and private Storage readback is hashed again. English content hashes also match their content-addressed CDN filenames. Korean and English versions are distinct image records; language and printed number are not recognition filters.

The English 30th page lists three extra Mew B/G/R entries whose image URLs return 404. Those unavailable English files are not imported. Korean Mew R/RGB, G/RGB and B/RGB images are available and included, along with the eight basic Energy images. All 176 Korean source entries have distinct image URLs and no provisional-image flags.

Existing English IDs are retained (30th-en-001…158 and me55cc-en-001…030). Korean IDs use m6a-ko- followed by the exact 26-character source item ID, so different printed numbering cannot collide. public.overlay_art_references records source URL, language, card number/name, dimensions, hash, illustration rectangle and the existing 8×8 RGB descriptor.

Images reside in the private overlay-art-references bucket under immutable catalog-20261104 paths. The bucket remains private, PNG-only, with a 5 MiB file limit. Previous 366×512 stored objects are retained; active metadata points to the larger originals. Test-account authorization, expiring signed reads, generation prompts, models and quotas are unchanged. The reference list remains below the existing 500-record retrieval limit.

Normal modern-frame crops are calibrated against actual illustration windows (128 English and 103 Korean cards), using conservative local edge detection and a checked modern fallback. Classic normal-frame windows are mapped per layout. Full-art, landscape, Trainer and Energy images are stored for reference but do not broaden the supported normal-frame overlay scope. Users still visually confirm the illustration before selecting a replacement. Names, languages and card numbers are not OCR matching inputs.

Validation: 57 server tests pass for existing functionality, both English sets, Korean source IDs, malformed-ID rejection and no AI/quota side effects. Rescaled image matching checks both English sets. Cross-language samples match Korean 001 to English 001, Korean 002 to English 002, and Korean 136 to Classic Collection English 001 by illustration alone. Scores are similarity values, not accuracy probabilities.

The temporary import endpoint is limited to a fixed metadata manifest, matching PNG hashes and an expiring random token; it is disabled after the batch. No live AI generation is performed during import or reference lookup.
