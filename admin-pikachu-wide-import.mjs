export const WIDE_IMPORT_WIDTH = 1536;
export const WIDE_IMPORT_HEIGHT = 2136;
// Stored matrices use the old 1648 × 2048 canvas, with the 63 × 88 card
// originating at (320,80). The wide file registers that same point at (264,364).
export function wideImportMatrix([a,b,c,d,e,f]) {
  return [a,b,c,d,e+a*56-c*284,f+b*56-d*284];
}
