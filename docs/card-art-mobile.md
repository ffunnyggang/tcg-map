# Mobile card illustration expansion (test-only)

Separate `card-art.html` page for future TCG TOOL release. Existing `card-overlay.html` and its controls are unchanged. No public menu entry or access expansion is included.

Four stages: language/name/number catalog selection; auto cut window inset 2mm on all sides with staged 0.1mm position/size controls; one final confirmation and fixed whole-card full-art editing; source/overlay toggle and fixed round A4 PDF export. A versioned notice template is used in both initial dialog and page footer. The local demo uses only synthetic landscape pixels and makes no generation/storage calls.

The server mobile catalog excludes separate Classic Collection data. An explicit allowlist of 323 stored half-illustration Pokemon records (113 English, 105 Korean, 105 Japanese) gates mobile generation before quota reservation. It includes modern non-ex standard cards and reviewed normal-frame classic reprints; trainer, energy, full-art and landscape entries remain visible as unsupported. New catalog entries fail closed until reviewed. Existing generic admin generation actions remain unchanged.

Canonical source images use the existing private signed-reference API. Generation mode is fixed to the exact FULL_ART_PROMPT used by the admin '카드 전체 풀아트 편집 · 새 옵션' mode. Card text, symbols, logos and outer border are requested to remain in place. No separate shared-symbol fetch/compositing or prepared-output overwrite occurs; the successful provider result is automatically stored with mode=fullart through the existing private persistence flow. Shared output reuse is not implemented by this change.

Print settings: 63x88mm, round R3mm (test value), 2mm outer bleed, cut-window guide, local edge-pixel bleed, A4 100% scale and card-information filename. Native shells use file sharing when available, otherwise browser PDF download. Actual iOS/Android devices, physical printing and authenticated live AI generation remain final QA gates.

Validation: 74 server/core tests pass including mobile source restrictions before spending, catalog scope, fixed prompt routing, 2mm inset, bounded adjustment and search pagination. Browser demo and PDF checks are recorded separately after deployment.
