// The administrator's archived EN plates use a registered 2mm plate raster.
import { withProductionCardBleed } from './card-overlay-print.mjs?v=20261120-archive-plate1';

export const ARCHIVE_BLEED_MM = 2;
export const ARCHIVE_NATIVE_MATRIX = Object.freeze([1,0,0,1,-40,-40]);
const ARCHIVE_WIDTH = 1088, ARCHIVE_HEIGHT = 1488;
const NATIVE_WIDTH = 1008, NATIVE_HEIGHT = 1408;
const EN_ARCHIVE_REFERENCE = /^30th-en-0(?:2[3-9]|[34][0-9]|5[0-4])$/;
const invalidArchive = () => new Error('저장된 2mm 출력판의 규격을 확인해 주세요.');

export function isArchivePlateId(id, referenceId) {
  return typeof referenceId === 'string' && EN_ARCHIVE_REFERENCE.test(referenceId) &&
    id === 'print-plate-2mm:' + referenceId;
}

export async function decodeArchivePlate(payload, referenceId, optionId, decode, canvas) {
  const p = payload?.plate;
  if (!isArchivePlateId(optionId, referenceId) || p?.id !== optionId || p.referenceId !== referenceId ||
      p.width !== ARCHIVE_WIDTH || p.height !== ARCHIVE_HEIGHT || p.trimWidthMm !== 64 ||
      p.trimHeightMm !== 89 || p.bleedMm !== ARCHIVE_BLEED_MM || typeof p.windowKnockout !== 'boolean' ||
      !Array.isArray(p.cropXYWH) || p.cropXYWH.length !== 4 ||
      !Array.isArray(p.nativeOffsetXY) || p.nativeOffsetXY.length !== 2 || p.nativeOffsetXY.some(px => px !== 40) ||
      typeof p.nativeJpeg !== 'string' || !p.nativeJpeg.startsWith('data:image/jpeg;base64,') ||
      typeof p.bleedRingWebp !== 'string' || !p.bleedRingWebp.startsWith('data:image/webp;base64,')) {
    throw invalidArchive();
  }
  const [x,y,w,h] = p.cropXYWH;
  const originalSize = x === 0 && y === 0;
  if ((!originalSize && (x !== 320 || y !== 80)) || w !== NATIVE_WIDTH || h !== NATIVE_HEIGHT) throw invalidArchive();

  const [source, ring] = await Promise.all([decode(p.nativeJpeg), decode(p.bleedRingWebp)]);
  const [sw,sh] = originalSize ? [NATIVE_WIDTH,NATIVE_HEIGHT] : [1648,2048];
  if (source.width !== sw || source.height !== sh || ring.width !== ARCHIVE_WIDTH || ring.height !== ARCHIVE_HEIGHT) throw invalidArchive();

  // Reassemble at stored size; overwrite the transparent center with the exact
  // original JPEG crop without stretching either rectangle or adding bleed.
  const native = canvas(w,h);
  native.getContext('2d').drawImage(source,x,y,w,h,0,0,w,h);
  const artwork = canvas(ARCHIVE_WIDTH,ARCHIVE_HEIGHT);
  const g = artwork.getContext('2d');
  g.drawImage(ring,0,0);
  g.drawImage(native,40,40);
  return {artwork, native, windowKnockout:p.windowKnockout, cutRect:p.cutRect};
}

// Keep the full 64×89 trim covered by the adjusted image. Only the
// expendable 2 mm outside it may use the deterministic bleed fallback.
export function coversArchiveTrim(matrix,width,height) {
  if (!Array.isArray(matrix) || matrix.length !== 6 || !matrix.every(Number.isFinite)) return false;
  const [a,b,c,d,e,f] = matrix, det = a*d-b*c;
  if (!Number.isFinite(det) || Math.abs(det) < 1e-9) return false;
  return [[-8,-8],[1016,-8],[-8,1416],[1016,1416]].every(([x,y]) => {
    const sx=(d*(x-e)-c*(y-f))/det, sy=(-b*(x-e)+a*(y-f))/det;
    return sx>=0 && sy>=0 && sx<=width && sy<=height;
  });
}

const sameArchivePlacement = matrix => ARCHIVE_NATIVE_MATRIX.every((px,i) => matrix[i] === px);
const managedKnockouts = new WeakMap();

function prepareManagedKnockout(plate, canvas) {
  if (managedKnockouts.has(plate)) return managedKnockouts.get(plate);
  const window = plate.cutRect;
  const pad = 3;
  // Source/window storage is relative to the native 63×88 card, not the
  // outer 68×93 plate. Keep the old JPEG's small antialiased edge pinned too.
  const x0 = Math.max(1, 40 + Math.floor(window.x*16) - pad);
  const y0 = Math.max(1, 40 + Math.floor(window.y*16) - pad);
  const x1 = Math.min(ARCHIVE_WIDTH - 1, 40 + Math.ceil((window.x+window.w)*16) + pad);
  const y1 = Math.min(ARCHIVE_HEIGHT - 1, 40 + Math.ceil((window.y+window.h)*16) + pad);
  const artwork = canvas(ARCHIVE_WIDTH, ARCHIVE_HEIGHT);
  const g = artwork.getContext('2d');
  g.drawImage(plate.artwork,0,0);
  const raster = g.getImageData(0,0,ARCHIVE_WIDTH,ARCHIVE_HEIGHT);
  const pixels = raster.data;
  const patch = g.createImageData(x1-x0,y1-y0);
  // Only the part of this patch that shifts outside the stationary window
  // is visible. Reflect inward-reaching texture from the nearest clean side
  // instead of dragging the original blank rectangle into the print artwork.
  for(let y = y0; y < y1; y++) for(let x = x0; x < x1; x++) {
    const l = x-x0+1, r = x1-x, t = y-y0+1, b = y1-y;
    const d = Math.min(l,r,t,b);
    const tx = d === l ? Math.max(0,x0-l) : d === r ? Math.min(ARCHIVE_WIDTH-1,x1+r-1) : x;
    const ty = d === t && d !== l && d !== r ? Math.max(0,y0-t)
      : d === b && d !== l && d !== r ? Math.min(ARCHIVE_HEIGHT-1,y1+b-1) : y;
    const src = 4*(ty*ARCHIVE_WIDTH+tx), dst = 4*((y-y0)*(x1-x0)+x-x0);
    patch.data[dst] = pixels[src];
    patch.data[dst+1] = pixels[src+1];
    patch.data[dst+2] = pixels[src+2];
    patch.data[dst+3] = pixels[src+3];
  }
  g.putImageData(patch,x0,y0);
  const prepared = {artwork,x0,y0,w:x1-x0,h:y1-y0};
  managedKnockouts.set(plate,prepared);
  return prepared;
}

function drawStationaryKnockout(g, plate, knockout, offset) {
  const {x0,y0,w,h} = knockout;
  g.drawImage(plate.artwork,x0,y0,w,h,x0-offset,y0-offset,w,h);
}

export function renderArchiveAlignment(plate, matrix, canvas) {
  if (sameArchivePlacement(matrix)) {
    // The common editor draws its comparison guide onto the returned canvas.
    // Do not expose the cached native raster to mutation.
    const art = canvas(NATIVE_WIDTH,NATIVE_HEIGHT);
    art.getContext('2d').drawImage(plate.native,0,0);
    return art;
  }
  const knockout = plate.windowKnockout ? prepareManagedKnockout(plate,canvas) : null;
  const art = canvas(NATIVE_WIDTH,NATIVE_HEIGHT), g = art.getContext('2d');
  g.setTransform(...matrix);
  g.drawImage(knockout?.artwork || plate.artwork,0,0);
  g.resetTransform();
  if (knockout) drawStationaryKnockout(g,plate,knockout,40);
  return art;
}

export function composeArchiveProduction(plate, overlay, canvas, {matrix=ARCHIVE_NATIVE_MATRIX, foil, shape} = {}) {
  const options = {foil, shape, bleed:ARCHIVE_BLEED_MM};
  if (!plate.windowKnockout || sameArchivePlacement(matrix)) {
    return withProductionCardBleed(overlay, canvas, {...options, matrix, artwork:plate.artwork});
  }
  const knockout = prepareManagedKnockout(plate,canvas);
  const base = withProductionCardBleed(canvas(NATIVE_WIDTH,NATIVE_HEIGHT),canvas,{
    artwork:knockout.artwork, matrix, bleed:ARCHIVE_BLEED_MM,
  });
  drawStationaryKnockout(base.getContext('2d'),plate,knockout,0);
  return withProductionCardBleed(overlay, canvas, {...options, matrix:ARCHIVE_NATIVE_MATRIX, artwork:base});
}
