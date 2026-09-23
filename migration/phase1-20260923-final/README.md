# FUNY PIN Phase 1 final import dataset

Source app.js SHA: 53e39b36112ccb439ece6ba04949d35839872626
Source shop-images-extra-v1.js SHA: b39e97bc1bc199615739523f771e0204c799fa61

Counts:
- shops: 68
- shop_tcg: 204
- shop_features: 1156
- shop_images: 98
- active actual image files: 176

Integrity:
- duplicate shop IDs: 0
- missing coordinates: 0
- broken image references: 0
- unmapped active image files: 78
- orphan image folder IDs: KR-SEO-035

Import order:
1. shops.json
2. shop_tcg.json (resolve tcg_code -> tcg_types.id)
3. shop_features.json (resolve feature_code -> features.id)
4. shop_images.json

This dataset does not modify Supabase by itself.
