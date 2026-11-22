const W=1536,H=2136, matrix=Object.freeze([1,0,0,1,-264,-364]);
const submittedMarks=Object.freeze({
  'm6a-ja-017':'funyframe', 'm6a-ja-019':'funypin.kr', 'm6a-ja-021':'funyframe',
  'm6a-ja-022':'funypin.kr', 'm6a-ja-025':'funypin.kr', 'm6a-ja-028':'funyframe',
});
const SOURCE_W=506,SOURCE_H=704;
const scale=Math.max(1024/SOURCE_W,1424/SOURCE_H)*(1+1e-9);
const submittedMatrix=Object.freeze([scale,0,0,scale,(1008-SOURCE_W*scale)/2,(1408-SOURCE_H*scale)/2]);
// All supplied watermarks fit this pixel rectangle. Keep it within
// the trim during zoom / translation; the 2mm bleed may extend edge pixels.
const FOOTER_XYXY=[425,686,476,700];
// Nearest source edge continuation, used only where the attachment did
// not provide physical bleed. Padding before the scaled draw avoids the
// partially transparent antialias strip at fractional source boundaries.
const EDGE_PAD=18;
export function submittedBleedMatrix([a,b,c,d,x,y]){
  return [a,b,c,d,x-EDGE_PAD*(a+c),y-EDGE_PAD*(b+d)];
}
function edgePad(source,canvas){
  const w=SOURCE_W,h=SOURCE_H,p=EDGE_PAD;
  const out=canvas(w+2*p,h+2*p),g=out.getContext('2d');
  g.imageSmoothingEnabled=false;
  g.drawImage(source,p,p);
  g.drawImage(source,0,0,w,1,p,0,w,p);
  g.drawImage(source,0,h-1,w,1,p,p+h,w,p);
  g.drawImage(source,0,0,1,h,0,p,p,h);
  g.drawImage(source,w-1,0,1,h,p+w,p,p,h);
  for(const [x,y,i,j] of [[0,0,0,0],[w-1,0,p+w,0],[0,h-1,0,p+h],[w-1,h-1,p+w,p+h]])g.drawImage(source,x,y,1,1,i,j,p,p);
  return out;
}
function validCut(r){
  return r&&[r.x,r.y,r.w,r.h].every(Number.isFinite)&&r.x>=0&&r.y>=0&&r.w>4&&r.h>4&&r.x+r.w<=63&&r.y+r.h<=88;
}
export function isJAPrintAlternative(id, ref) {
  return (ref==='m6a-ja-032'||ref==='m6a-ja-033'||Object.hasOwn(submittedMarks,ref)) && id==='ja-wide-print:'+ref;
}
export function canAdjustSubmittedJA(m){
  if(!Array.isArray(m)||m.length!==6||!m.every(Number.isFinite))return false;
  const [a,b,c,d,x,y]=m;
  if(a<scale*(1-1e-8)||a>scale*1.25||b||c||d!==a)return false;
  const [l,t,r,bot]=FOOTER_XYXY;
  return x<=-8&&y<=-8&&x+SOURCE_W*a>=1016&&y+SOURCE_H*a>=1416&&
    x+l*a>=-8&&y+t*a>=-8&&x+r*a<=1016&&y+bot*a<=1416;
}
export async function decodeJAPrintAlternative(body,ref,id,decode,canvas) {
  const plate=body?.plate, is16=ref==='m6a-ja-032', isSubmitted=Object.hasOwn(submittedMarks,ref);
  const oldCut={x:5.9,y:9.7,w:51.2,h:31.2};
  const cutRect=oldCut;
  const [width,height]=isSubmitted?[SOURCE_W,SOURCE_H]:[W,H];
  const origin=isSubmitted?submittedMatrix:matrix;
  if (!isJAPrintAlternative(id,ref) || plate?.id!==id || plate.referenceId!==ref || plate.width!==width || plate.height!==height ||
      plate.trimWidthMm!==64 || plate.trimHeightMm!==89 || plate.bleedMm!==2 ||
      plate.embeddedWatermark!==(is16||isSubmitted) || plate.windowKnockout!==is16 ||
      (isSubmitted && (plate.sourceKind!=='submitted-trim'||plate.embeddedWatermarkText!==submittedMarks[ref]||!validCut(cutRect))) ||
      !Object.keys(cutRect).every(key=>plate.cutRect?.[key]===cutRect[key]) ||
      typeof plate.wideWebp!=='string' || !plate.wideWebp.startsWith('data:image/webp;base64,')) throw new Error('확장 일러스트 인쇄 파일 규격을 확인해 주세요.');
  const artwork=await decode(plate.wideWebp);
  if(artwork.width!==width||artwork.height!==height)throw new Error('확장 일러스트 인쇄 파일 해상도를 확인해 주세요.');
  const native=canvas(1008,1408), g=native.getContext('2d');
  g.setTransform(...origin);
  g.drawImage(artwork,0,0);
  g.resetTransform();
  return {artwork,native,nativeMatrix:origin,cutRect,windowKnockout:false,jaAlternative:true,
    ja16Pinned:is16,submittedTrim:isSubmitted,bleedArtwork:isSubmitted?edgePad(artwork,canvas):null,embeddedWatermark:is16||isSubmitted,
    embeddedWatermarkText:isSubmitted?submittedMarks[ref]:is16?'funyframe':null};
}
