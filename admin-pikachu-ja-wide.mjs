const W=1536,H=2136, matrix=Object.freeze([1,0,0,1,-264,-364]);
const submittedMarks=Object.freeze({
  'm6a-ja-017':'funyframe', 'm6a-ja-019':'funypin.kr', 'm6a-ja-021':'funyframe',
  'm6a-ja-022':'funypin.kr', 'm6a-ja-025':'funypin.kr', 'm6a-ja-028':'funyframe', 'm6a-ja-029':null,
});
export const JA27_ORIGINAL_REF='m6a-ja-043';
export const JA27_ORIGINAL_ID='ja-wide-print:'+JA27_ORIGINAL_REF+':original-window-v1';
export const JA27_TROPICAL_ID='ja-wide-print:'+JA27_ORIGINAL_REF+':original-window-v2';
export const JA21_TROPICAL_ID='ja-wide-print:m6a-ja-037:original-window-tropical-v1';
export const JA27_TROPICAL_APERTURE=Object.freeze({x:118,y:113,w:305,h:238});
export const JA14_ORIGINAL_ID='ja-wide-print:m6a-ja-030:original-window-v1';
export const JA14_NEW_ID='ja-wide-print:m6a-ja-030:attached-window-v2';
const additionalFullBleedRefs=new Set(['m6a-ja-025','m6a-ja-037','m6a-ja-039']);
export const isAdditionalJAFullBleedRef=ref=>additionalFullBleedRefs.has(ref);
export const isJAFullBleed=(id,ref)=>ref==='m6a-ja-030'&&id===JA14_NEW_ID ||
  additionalFullBleedRefs.has(ref)&&id==='ja-wide-print:'+ref+':attached-full-bleed-v1';
export const JA17_EN039_ID='ja-wide-print:m6a-ja-033:en039-original-window-v1';
export const JA06_EXTRA_ID='ja-wide-print:m6a-ja-022:v2';
const submittedSpec=(width,height,pad)=>{
  const scale=Math.max(1024/width,1424/height)*(1+1e-9);
  return Object.freeze({width,height,pad,scale,origin:Object.freeze([scale,0,0,scale,(1008-width*scale)/2,(1408-height*scale)/2])});
};
const standardSpec=submittedSpec(506,704,18);
const extraSpec=submittedSpec(800,1112,27);
export const ja14OriginalSpec=submittedSpec(512,712,18);
const ja27Spec=submittedSpec(800,1113,27);
const tropicalBase=submittedSpec(535,800,18);
const tropicalOrigin=[...tropicalBase.origin];
// A minute vertical bias leaves usable room on either side of the authored
// white area without stretching the illustration.
tropicalOrigin[5]=Math.max(tropicalOrigin[5],9.7*16+8-(JA27_TROPICAL_APERTURE.y-2)*tropicalBase.scale);
export const ja27TropicalSpec=Object.freeze({...tropicalBase,origin:Object.freeze(tropicalOrigin),aperture:JA27_TROPICAL_APERTURE});
// All supplied watermarks fit this pixel rectangle. Keep it within
// the trim during zoom / translation; the 2mm bleed may extend edge pixels.
const FOOTER_XYXY=[425,686,476,700];
// Nearest source edge continuation, used only where the attachment did
// not provide physical bleed. Padding before the scaled draw avoids the
// partially transparent antialias strip at fractional source boundaries.
export function submittedBleedMatrix([a,b,c,d,x,y], spec=standardSpec){
  return [a,b,c,d,x-spec.pad*(a+c),y-spec.pad*(b+d)];
}
function edgePad(source,canvas,{width:w,height:h,pad:p}){
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
  if (id===JA27_ORIGINAL_ID||id===JA27_TROPICAL_ID) return ref===JA27_ORIGINAL_REF;
  if (isJAFullBleed(id,ref)) return true;
  if (id===JA14_ORIGINAL_ID) return ref==='m6a-ja-030';
  if (id===JA21_TROPICAL_ID) return ref==='m6a-ja-037';
  if (id===JA17_EN039_ID) return ref==='m6a-ja-033';
  if (id===JA06_EXTRA_ID) return ref==='m6a-ja-022';
  return (ref==='m6a-ja-032'||ref==='m6a-ja-033'||Object.hasOwn(submittedMarks,ref)) && id==='ja-wide-print:'+ref;
}
export function canAdjustSubmittedJA(m,spec=standardSpec,hasBakedFooter=true){
  if(!Array.isArray(m)||m.length!==6||!m.every(Number.isFinite))return false;
  const [a,b,c,d,x,y]=m;
  const {width,height,scale}=spec;
  if(a<scale*(1-1e-8)||a>scale*1.25||b||c||d!==a)return false;
  if(spec.aperture){
    // Keep the complete authored white opening, including resampling gutter,
    // beneath the immovable original-card illustration window.
    const {x:left,y:top,w,h}=spec.aperture, gutter=2;
    if(x+(left-gutter)*a<5.9*16||x+(left+w+gutter)*a>(5.9+51.2)*16||
       y+(top-gutter)*a<9.7*16||y+(top+h+gutter)*a>(9.7+31.2)*16)return false;
  }
  const [l,t,r,bot]=FOOTER_XYXY;
  return x<=-8&&y<=-8&&x+width*a>=1016&&y+height*a>=1416&&
    (!hasBakedFooter || (x+l*a>=-8&&y+t*a>=-8&&x+r*a<=1016&&y+bot*a<=1416));
}
// Only coverage-preserving uniform zoom and pan. Check the complete 2 mm
// bleed, not just the trim, against the exact 1536 × 2136 source.
export const ja14FullBleedSpec=Object.freeze({width:1497,height:2048,fullBleed:true,scale:Math.max(1088/1497,1488/2048)*(1+1e-9)});
export function fitsFullBleed(m,width,height,minimum=Math.max(1088/width,1488/height),maximum=1.5){
  if(!Array.isArray(m)||m.length!==6||!m.every(Number.isFinite))return false;
  const [a,b,c,d,x,y]=m;
  return a>=minimum&&a<=maximum&&!b&&!c&&d===a&&x<=-40&&y<=-40&&x+width*a>=1048&&y+height*a>=1448;
}
export function canAdjustJA14New(m){
  const {width,height,scale}=ja14FullBleedSpec;
  return fitsFullBleed(m,width,height,scale,scale*1.25);
}
export function canAdjustJA17EN039(m){
  if(!Array.isArray(m)||m.length!==6||!m.every(Number.isFinite))return false;
  const [a,b,c,d,x,y]=m;
  return a>=Math.max(1088/W,1488/H)&&a<=1.5&&!b&&!c&&d===a&&x<=-40&&y<=-40&&x+W*a>=1048&&y+H*a>=1448;
}
// Project proposed pan/zoom into the range that preserves paper coverage and
// keeps the authored tropical opening under the fixed original-card window.
function limitsAt(scale,tropical,spec){
  if(spec?.fullBleed)return [1048-spec.width*scale,-40,1448-spec.height*scale,-40];
  if(spec)return [1016-spec.width*scale,-8,1416-spec.height*scale,-8];
  if(!tropical)return [1048-W*scale,-40,1448-H*scale,-40];
  const {x,y,w,h}=JA27_TROPICAL_APERTURE,pad=2,gap=1e-5;
  return [Math.max(1016-535*scale,5.9*16-(x-pad)*scale+gap),
    Math.min(-8,(5.9+51.2)*16-(x+w+pad)*scale-gap),
    Math.max(1416-800*scale,9.7*16-(y-pad)*scale+gap),
    Math.min(-8,(9.7+31.2)*16-(y+h+pad)*scale-gap)];
}
const clamp=(v,low,high)=>Math.max(low,Math.min(high,v));
export const PINNED_ZOOM_STEP=1.025;
const tropicalMax=(()=>{
  let low=ja27TropicalSpec.scale,high=low*1.25;
  for(let i=0;i<52;i++){
    const next=(low+high)/2,[left,right,top,bottom]=limitsAt(next,true);
    if(left<=right&&top<=bottom)low=next;else high=next;
  }
  return low;
})();
export function constrainPinnedWindow(matrix,tropical,spec=null){
  const min=spec?.scale??(tropical?ja27TropicalSpec.scale:Math.max(1088/W,1488/H));
  const max=spec?min*1.25:tropical?tropicalMax:1.5;
  const a=clamp(matrix[0],min,max),[left,right,top,bottom]=limitsAt(a,tropical,spec);
  return {matrix:[a,0,0,a,clamp(matrix[4],left,right),clamp(matrix[5],top,bottom)],
    min:a<=min+1e-8,max:a>=max-1e-8,percent:Math.round(a/(tropical||spec?min:1)*100)};
}
const movedTropicalInitial=(()=>{
  const [a,,,,x]=ja27TropicalSpec.origin,k=PINNED_ZOOM_STEP;
  return Object.freeze(constrainPinnedWindow([a*k,0,0,a*k,504+(x-504)*k,404.8-(JA27_TROPICAL_APERTURE.y+JA27_TROPICAL_APERTURE.h/2)*a*k],true).matrix);
})();
const ja14OriginalInitial=(()=>{
  const [a,,,,x,y]=ja14OriginalSpec.origin,k=PINNED_ZOOM_STEP;
  return Object.freeze(constrainPinnedWindow([a*k,0,0,a*k,504+(x-504)*k,704+(y-704)*k],false,ja14OriginalSpec).matrix);
})();
const ja14FullBleedInitial=(()=>{
  const {width,height,scale}=ja14FullBleedSpec;
  return Object.freeze([scale,0,0,scale,(1008-width*scale)/2,(1408-height*scale)/2]);
})();
export async function decodeJAPrintAlternative(body,ref,id,decode,canvas) {
  const plate=body?.plate, ja14New=isJAFullBleed(id,ref),ja14Original=id===JA14_ORIGINAL_ID,tropical=id===JA27_TROPICAL_ID||id===JA21_TROPICAL_ID,wideOriginalWindow=id===JA17_EN039_ID,originalWindow=tropical||ja14Original||id===JA27_ORIGINAL_ID;
  const is16=ref==='m6a-ja-032', isSubmitted=!ja14New&&(originalWindow||Object.hasOwn(submittedMarks,ref));
  const extra=id===JA06_EXTRA_ID;
  const spec=tropical?ja27TropicalSpec:ja14Original?ja14OriginalSpec:originalWindow?ja27Spec:extra?extraSpec:standardSpec;
  const cleanSubmitted=(originalWindow||extra||ref==='m6a-ja-028'||ref==='m6a-ja-029') && plate?.embeddedWatermark===false && plate?.embeddedWatermarkText==null;
  const baked=is16||(isSubmitted&&!cleanSubmitted);
  const oldCut={x:5.9,y:9.7,w:51.2,h:31.2};
  const cutRect=oldCut;
  const [width,height]=ja14New?[ja14FullBleedSpec.width,ja14FullBleedSpec.height]:isSubmitted?[spec.width,spec.height]:[W,H];
  const origin=ja14New?ja14FullBleedInitial:id===JA21_TROPICAL_ID?movedTropicalInitial:ja14Original?ja14OriginalInitial:isSubmitted?spec.origin:matrix;
  if (!isJAPrintAlternative(id,ref) || plate?.id!==id || plate.referenceId!==ref || plate.width!==width || plate.height!==height ||
      plate.trimWidthMm!==64 || plate.trimHeightMm!==89 || plate.bleedMm!==2 ||
      ((originalWindow || extra || ref==='m6a-ja-029') && !cleanSubmitted) || plate.embeddedWatermark!==baked || plate.windowKnockout!==is16 ||
      (isSubmitted && (plate.sourceKind!==(tropical?'submitted-original-window-tropical':originalWindow?'submitted-original-window':'submitted-trim')||(!cleanSubmitted&&plate.embeddedWatermarkText!==submittedMarks[ref])||!validCut(cutRect))) ||
      (ja14New&&plate.sourceKind!=='submitted-full-bleed') ||
      (wideOriginalWindow&&plate.sourceKind!=='en039-original-window') ||
      (tropical&&Object.keys(JA27_TROPICAL_APERTURE).some(key=>plate.aperturePx?.[key]!==JA27_TROPICAL_APERTURE[key])) ||
      !Object.keys(cutRect).every(key=>plate.cutRect?.[key]===cutRect[key]) ||
      typeof plate.wideWebp!=='string' || !plate.wideWebp.startsWith('data:image/webp;base64,')) throw new Error('확장 일러스트 인쇄 파일 규격을 확인해 주세요.');
  const artwork=await decode(plate.wideWebp);
  if(artwork.width!==width||artwork.height!==height)throw new Error('확장 일러스트 인쇄 파일 해상도를 확인해 주세요.');
  const native=canvas(1008,1408), g=native.getContext('2d');
  g.setTransform(...origin);
  g.drawImage(artwork,0,0);
  g.resetTransform();
  return {artwork,native,nativeMatrix:origin,cutRect,windowKnockout:false,jaAlternative:true,
    ja16Pinned:is16,submittedTrim:isSubmitted,bleedArtwork:isSubmitted?edgePad(artwork,canvas,spec):null,embeddedWatermark:baked,
    submittedSpec:isSubmitted?spec:null,originalWindow:originalWindow||wideOriginalWindow,wideOriginalWindow,ja14Original,ja14New,
    embeddedWatermarkText:!baked?null:isSubmitted?submittedMarks[ref]:'funyframe'};
}
