import { createPDFWriter, CUT_CONTOUR_SPOT } from './card-overlay-core.mjs?v=20261116-pikachu-a2';
import { PRINT, PRINT_SIDE_MARGIN, ADMIN_PRINT_BLEED, ADMIN_PRINT_TRIM_MARGIN } from './card-overlay-print.mjs?v=20261118-print64w';

export const PIKACHU_SHEET_IDS = Object.freeze(Array.from({length:30}, (_, index) =>
 `m6a-ja-${String(index+17).padStart(3,'0')}`));
const PAGE = {width:420,height:594};
const TILE = {width:PRINT.width+2*ADMIN_PRINT_BLEED,height:PRINT.height+2*ADMIN_PRINT_BLEED};
const COLUMNS = 5;
const ROWS = 6;
const GAP = {x:6,y:4};
const POINTS_PER_MM = 72/25.4;
const pt = mm => Number((mm*POINTS_PER_MM).toFixed(6));

function tilePosition(index) {
 const x = (PAGE.width-COLUMNS*TILE.width-(COLUMNS-1)*GAP.x)/2 + index%COLUMNS*(TILE.width+GAP.x);
 const top = (PAGE.height-ROWS*TILE.height-(ROWS-1)*GAP.y)/2 + Math.floor(index/COLUMNS)*(TILE.height+GAP.y);
 return {x, y:PAGE.height-top-TILE.height};
}

function outerPath({x,y}, shape) {
 const offset = ADMIN_PRINT_BLEED-ADMIN_PRINT_TRIM_MARGIN;
 const l=pt(x+offset), b=pt(y+offset), w=pt(PRINT.width+2*ADMIN_PRINT_TRIM_MARGIN), h=pt(PRINT.height+2*ADMIN_PRINT_TRIM_MARGIN);
 if (shape !== 'round') return `${l} ${b} ${w} ${h} re S`;
 const r=l+w, t=b+h, radius=pt(PRINT.cornerRadius), c=radius*(1-.5522847498);
 return [
  `${l+radius} ${b} m ${r-radius} ${b} l`,
  `${r-c} ${b} ${r} ${b+c} ${r} ${b+radius} c ${r} ${t-radius} l`,
  `${r} ${t-c} ${r-c} ${t} ${r-radius} ${t} c ${l+radius} ${t} l`,
  `${l+c} ${t} ${l} ${t-c} ${l} ${t-radius} c ${l} ${b+radius} l`,
  `${l} ${b+c} ${l+c} ${b} ${l+radius} ${b} c h S`,
 ].join('\n');
}

export function makePikachuSheetPDF(tiles) {
 if (tiles.length !== PIKACHU_SHEET_IDS.length) throw Error('피카츄 도안 30종이 필요합니다.');
 const {obj,stream,finish} = createPDFWriter('1.5');
 obj(1, '<< /Type /Catalog /Pages 2 0 R /OCProperties << /OCGs [5 0 R 6 0 R] /D << /Name (Artwork) /Order [5 0 R 6 0 R] /OFF [5 0 R 6 0 R] >> >> >>');
 obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
 const images = tiles.map((_, i) => `/Card${i+1} ${i+8} 0 R`).join(' ');
 obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pt(PAGE.width)} ${pt(PAGE.height)}] /Resources << /XObject << ${images} >> /Properties << /WindowCut 5 0 R /OuterCut 6 0 R >> /ColorSpace << /CutContour 7 0 R >> >> /Contents 4 0 R >>`);
 const artwork = [], windows = [], borders = [];
 for (const [index,{cut,shape}] of tiles.entries()) {
  const {x,y} = tilePosition(index);
  artwork.push(`q ${pt(TILE.width)} 0 0 ${pt(TILE.height)} ${pt(x)} ${pt(y)} cm /Card${index+1} Do Q`);
  windows.push(`${pt(x+ADMIN_PRINT_BLEED+PRINT_SIDE_MARGIN+cut.x)} ${pt(y+ADMIN_PRINT_BLEED+PRINT.height-cut.y-cut.h)} ${pt(cut.w)} ${pt(cut.h)} re S`);
  borders.push(outerPath({x,y}, shape));
 }
 const layer = (name, paths) => `/OC /${name} BDC\nq /CutContour CS 1 SCN 0.25 w\n${paths.join('\n')}\nQ\nEMC`;
 stream(4,'',[...artwork,layer('WindowCut',windows),layer('OuterCut',borders),''].join('\n'));
 obj(5, '<< /Type /OCG /Name (CutContour) >>');
 obj(6, '<< /Type /OCG /Name (OuterCut) >>');
 obj(7, CUT_CONTOUR_SPOT);
 for (const [i,{jpeg}] of tiles.entries()) {
  stream(i+8, `/Type /XObject /Subtype /Image /Width ${TILE.width*PRINT.scale} /Height ${TILE.height*PRINT.scale} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`, jpeg);
 }
 return finish();
}
