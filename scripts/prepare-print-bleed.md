# Missing print artwork only: operator prep

Offline helper; no credentials, public endpoint, upload, or automatic AI billing.
Requires Python and Pillow. At 16 px/mm, keep the verified original centered on
(824,784) within the existing provider canvas (1648×2048). Input is artwork
without text, trim guides, borders or logos. If an asset includes reflected,
copied, blank or stretched margins, crop those away first; never infer
authentic coverage from dimensions.

1. `python scripts/prepare-print-bleed.py prepare original.png request-dir`
2. Use an authorized image-edit provider with the generated source and mask.
   Opaque alpha is protected; transparent alpha is editable. Use exact
   1648×2048 output, no template switch or reframe. Prompt: “Continue only
   the existing background naturally into the masked area. Continue edge
   shapes, lines, perspective, lighting and texture. Do not repeat or mirror,
   redraw the original, or add text, border, character or panel.”
3. `python scripts/prepare-print-bleed.py assemble original.png print-bleed.png --generated provider.png`
4. Review all seams visually before publication. The compositor restores every
   pixel in the source rectangle and rejects wrong dimensions or transparent
   bleed; it cannot validate visual continuity or AI provenance by itself.

The output is **1088×1488**, representing 68×93 mm. The 64×89 mm trim starts
32 px from each edge; the unscaled 63×88 mm content starts 40 px from each edge.
This is a print-only background; do not use it to overwrite shared originals
or masquerade as a 1648×2048 artwork. For a legacy 67×92 mm composite the helper
uses precisely the 8px outer ring from generation, retaining the complete
existing 1072×1472 raster. An aligned 64×88 source needs real bleed on its sides,
not merely the visible increase in trim height.
