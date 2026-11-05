# Overlay reference image catalog

Updated 2026-11-05 (KST). Private, test-only images for illustration matching.

| Set | Source | Stored primary images |
| --- | --- | ---: |
| 30th Celebration (English) | https://communitybinder.com/sets/me/30th?region=en | 158 |
| Classic Collection (English) | https://communitybinder.com/sets/me/me55cc?region=en | 30 |
| 30th CELEBRATION M6a (Korean) | https://www.dogam.app/sets/01KYMTS097F86Y45P4R6YVY9N8 | 176 |
| 30th CELEBRATION M6a (Japanese official) | https://www.30th.pokemon-card.com/product/m6a | 167 files |

Total: 531 reference image records. Japanese combined LEGEND is one file, rather than two individual card images. English originals are 733×1024. Korean originals are 868×1212, 641×896 or 573×800; files retain the source resolution. Downloaded PNG/WebP signatures, dimensions and SHA-256 are checked, and private Storage readback is hashed again. English content hashes also match their content-addressed CDN filenames. Korean and English versions are distinct image records; language and printed number are not recognition filters.

The English 30th page lists three extra Mew B/G/R entries whose image URLs return 404. Those unavailable English files are not imported. Korean Mew R/RGB, G/RGB and B/RGB images are available and included, along with the eight basic Energy images. All 176 Korean source entries have distinct image URLs and no provisional-image flags.

Existing English IDs are retained (30th-en-001…158 and me55cc-en-001…030). Korean IDs use m6a-ko- followed by the exact 26-character source item ID, so different printed numbering cannot collide. public.overlay_art_references records source URL, language, card number/name, dimensions, hash, illustration rectangle and the existing 8×8 RGB descriptor.

Images reside in the private overlay-art-references bucket under immutable catalog-20261104 paths. The bucket remains private, PNG and WebP, with a 5 MiB file limit. Previous 366×512 stored objects are retained; active metadata points to the larger originals. Test-account authorization, expiring signed reads, generation prompts, models and quotas are unchanged. The reference list is paginated in 500-record requests with a stable unique-ID order so all 531 records are returned.

Normal modern-frame crops are calibrated against actual illustration windows (128 English and 103 Korean cards), using conservative local edge detection and a checked modern fallback. Classic normal-frame windows are mapped per layout. Full-art, landscape, Trainer and Energy images are stored for reference but do not broaden the supported normal-frame overlay scope. Users still visually confirm the illustration before selecting a replacement. Names, languages and card numbers are not OCR matching inputs.

Validation: 61 server tests pass for existing functionality, both English sets, Korean source IDs, malformed-ID rejection and no AI/quota side effects. Rescaled image matching checks both English sets. Cross-language samples match Korean 001 to English 001, Korean 002 to English 002, and Korean 136 to Classic Collection English 001 by illustration alone. Scores are similarity values, not accuracy probabilities.

The temporary import endpoint is limited to a fixed metadata manifest, matching PNG hashes and an expiring random token; it is disabled after the batch. No live AI generation is performed during import or reference lookup.

## Japanese official source — 2026-11-05

Source: https://www.30th.pokemon-card.com/product/m6a (tracking query omitted).
The official page's card-list data publishes **167 WebP files**. Store the exact files under `catalog-20261105`, with `source_language=ja` and `m6a-ja-` IDs. Preserve source dimensions: 800×1117 for most cards, 800×573 for a landscape card, and 800×1146 for the combined LEGEND image. Do not split, rotate, upscale or substitute images from another site.

The official list omits numeric entries 119, 121, 128, 129 and 131 and does not publish the three RGB Mew entries in its card-list data. Entries 151 and 152 are provided together as one `151152` file, recorded with `card_number=151/152`. Eight basic Energy images are included. Therefore 167 source files do not mean a complete 176-card individual-image set.

The resulting catalog has **531 reference image records**: English 188, Korean 176, Japanese official 167. The existing 500-row request limit is handled through paginated 500-row fetches ordered by unique ID. All pages must succeed; failure cannot return a silently truncated reference catalog. The bounded fetch fails rather than silently truncating at the 5,000-record safety boundary. Test-account authorization and generation settings are unchanged.

The private reference bucket accepts PNG and WebP (5 MiB maximum), retaining the earlier PNG entries. Downloads are decoded locally, hashed, checked for duplicate files and compared with private Storage readback hashes. Japanese classic cards use local illustration-window detection when reliable instead of assuming English frame geometry. Only metadata crop coordinates are adjusted; source images are untouched.

Validation: 61 server tests pass, including Japanese numeric/Energy/LEGEND IDs, malformed-ID rejection, 531-row pagination and next-page failure. Native canvas decodes the stored WebP format and rescaled Japanese samples match their own source descriptors. Normal-frame Japanese 001/002 also match the English artwork anchors. Strong foil/colour differences can reduce cross-language similarity (Classic Pikachu sample); scores are not accuracy probabilities and users must visually confirm candidates. Adding Japanese source images supplies same-language references without introducing a language filter.

The source-data import is separate from AI image generation. The temporary import function is restricted to this fixed metadata/hash manifest with an expiring random token and disabled after verification. Public launch/menu exposure is unchanged.
