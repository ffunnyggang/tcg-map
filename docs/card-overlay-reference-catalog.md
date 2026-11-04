# Overlay reference image catalog

Updated 2026-11-04 (KST). Test-only, private reference images for illustration matching.

| Set | Source | Stored images |
| --- | --- | ---: |
| 30th Celebration | https://communitybinder.com/sets/me/30th?region=en | 158 |
| 30th Celebration: Classic Collection | https://communitybinder.com/sets/me/me55cc?region=en | 30 |

All 188 primary PNG images are 733×1024 pixels, fetched from the source page's imageLarge links. SHA-256 is checked against the content-addressed CDN filename before import and again on private Storage readback. Existing 30th-en-001 through 30th-en-158 IDs are retained and updated to larger images. Classic IDs are me55cc-en-001 through me55cc-en-030. IDs and image hashes are unique.

The 30th page reports 161 catalog entries. Its additional Mew entries B, G and R point to unavailable TCGdex image URLs (HTTP 404); no replacement images were invented or imported for those entries.

Images reside in the private overlay-art-references bucket under immutable catalog-20261104 paths; the bucket remains private with PNG-only uploads and a 5 MiB file limit. Metadata in public.overlay_art_references records source URL, card number/name, dimensions, hash, illustration rectangle and the existing 8×8 RGB descriptor. Original 366×512 stored objects are retained; active metadata points to the new images.

Recognition compares illustration pixels only, without card-name/number OCR or language restrictions. Classic normal-frame illustration rectangles are set per layout; other cards retain a comparison crop and require visual confirmation. Stored full-art, landscape and Trainer cards do not expand the supported normal-frame overlay scope. Users must confirm the matching illustration before replacing the scanned illustration. Existing generation prompts, models, quotas, test-account permissions and outputs are unchanged.

The temporary import endpoint accepts only the fixed metadata manifest and matching PNG hashes with an expiring random token, and is disabled again after import. No AI generation is performed during import or reference lookup.
