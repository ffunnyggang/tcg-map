// Only the administrator's archived EN plates use this fixed raster path.
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

export function composeArchiveProduction(plate, overlay, canvas, {foil, shape} = {}) {
  return withProductionCardBleed(overlay, canvas, {
    artwork:plate.artwork, matrix:ARCHIVE_NATIVE_MATRIX, foil, shape, bleed:ARCHIVE_BLEED_MM,
  });
}
