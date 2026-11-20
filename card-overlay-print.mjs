import {fittedBorder,BORDER_EDGE_PX} from './card-overlay-shape.mjs?v=20261120-border-footer';
export const PRINT={scale:12,bleed:2,width:64,height:89,sheetWidth:83,sheetHeight:118,cornerRadius:3,innerBleed:.5};
export const PRINT_SIDE_MARGIN = (PRINT.width - 63) / 2;
export const PRINT_TOP_MARGIN = (PRINT.height - 88) / 2;
// Native card raster coordinate: center of the visible band inside the trim.
export const PRINT_FOOTER_CENTER_Y = 1408 + PRINT_TOP_MARGIN*16 - BORDER_EDGE_PX/2;
const CARD_ORIGIN = 10;
export const ADMIN_PRINT_TRIM_MARGIN = 0;
export const ADMIN_PRINT_BLEED = 2 + ADMIN_PRINT_TRIM_MARGIN;
const PRODUCTION_INNER_BLEED = 2;

// Physical position on the print sheet, measured from its top-left in mm.
export function printWindowRect(r, tolerance = 0) {
 return {x:CARD_ORIGIN+r.x-tolerance,y:CARD_ORIGIN+r.y-tolerance,w:r.w+2*tolerance,h:r.h+2*tolerance};
}

export function drawProductionWindow(g, {x,y,w,h}, scale) {
 const bleed = PRODUCTION_INNER_BLEED * scale;
 if (w <= 2 * bleed || h <= 2 * bleed) throw Error('인쇄용 일러스트 창은 가로와 세로가 4mm보다 커야 합니다.');
 g.save();
 g.fillStyle = 'white';
 g.fillRect(x+bleed,y+bleed,w-2*bleed,h-2*bleed);
 g.fillStyle = '#777';
 g.textAlign = 'center';
 g.textBaseline = 'middle';
 g.font = `${1.7*scale}px sans-serif`;
 g.fillText('CUT OUT INSIDE',x+w/2,y+h/2,w-2*bleed);
 g.restore();
}
// Extend edge pixels into the 2mm sacrificial bleed; never scale the card artwork.
export function withCardBleed(image,createCanvas=document.createElement.bind(document,'canvas')){
 const c=createCanvas();c.width=1072;c.height=1472;const g=c.getContext('2d'),b=32,w=1008,h=1408;
 g.drawImage(image,0,0,image.width,image.height,b,b,w,h);
 g.drawImage(image,0,0,image.width,1,b,0,w,b);g.drawImage(image,0,image.height-1,image.width,1,b,b+h,w,b);
 g.drawImage(image,0,0,1,image.height,0,b,b,h);g.drawImage(image,image.width-1,0,1,image.height,b+w,b,b,h);
 for(const [sx,sy,dx,dy]of[[0,0,0,0],[image.width-1,0,b+w,0],[0,image.height-1,0,b+h],[image.width-1,image.height-1,b+w,b+h]])g.drawImage(image,sx,sy,1,1,dx,dy,b,b);
 return c;
}

const foilIds = ['holographic-border-v1', 'silver-satin-border-v1', 'silver-glitter-border-v1', 'gold-star-border-v1'];
let atlasPromise;
export async function printFoil(id) {
 const index = foilIds.indexOf(id);
 if (index < 0) return null;
 if (!atlasPromise) {
  const atlas = new Image();
  atlas.src = new URL('./assets/print-foil-atlas-v1.svg', import.meta.url).href;
  atlasPromise = atlas.decode().then(() => atlas).catch(error => { atlasPromise = null; throw error; });
 }
 return {atlas: await atlasPromise, index};
}

// Keep every covered pixel untouched. Only out-of-source pixels inherit the
// closest source edge pixel; this is not reflected or synthesized AI overscan.
function fillUncoveredArtworkPixels(pixels,width,height,source,sw,sh,matrix) {
 const [a,c,d,f,e,k]=matrix,det=a*f-c*d;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const sx=(f*(x+.5-e)-d*(y+.5-k))/det,sy=(-c*(x+.5-e)+a*(y+.5-k))/det;
  if(sx>=0&&sy>=0&&sx<sw&&sy<sh)continue;
  const ix=Math.max(0,Math.min(sw-1,Math.floor(sx))),iy=Math.max(0,Math.min(sh-1,Math.floor(sy)));
  const src=4*(iy*sw+ix),dest=4*(y*width+x);
  for(let ch=0;ch<4;ch++)pixels[dest+ch]=source[src+ch];
 }
}
export function withProductionCardBleed(image, canvas, {artwork, matrix, fallbackArtwork=image, foil=null, border=null, shape='square', bleed = ADMIN_PRINT_BLEED} = {}) {
 const ppm=16,b=bleed*ppm,w=PRINT.width*ppm,h=PRINT.height*ppm;
 const mx=PRINT_SIDE_MARGIN*ppm,my=PRINT_TOP_MARGIN*ppm;
 // Callers pass only provenance-verified overscan. Otherwise use native rendered
 // artwork, never the artificial padding of an imported wide image.
 if(!artwork){
  artwork=fallbackArtwork;
  if(!artwork||artwork.width!==1008||artwork.height!==1408)throw Error('원본 63 × 88 mm 일러스트가 필요해요.');
  matrix=[1,0,0,1,0,0];
 }
 if(!Array.isArray(matrix)||matrix.length!==6||!matrix.every(Number.isFinite))throw Error('일러스트 정렬값을 확인해 주세요.');
 const [a,c,d,f,e,k]=matrix,det=a*f-c*d;
 if(!Number.isFinite(det)||Math.abs(det)<1e-10)throw Error('일러스트 정렬값을 확인해 주세요.');
 const surface=canvas(w+2*b,h+2*b),g=surface.getContext('2d');
 const positioned=[a,c,d,f,e+b+mx,k+b+my];
 g.setTransform(...positioned);g.drawImage(artwork,0,0);g.resetTransform();
 const covered=[[-b-mx,-b-my],[63*ppm+b+mx,-b-my],[-b-mx,88*ppm+b+my],[63*ppm+b+mx,88*ppm+b+my]].every(([x,y])=>{
  const sx=(f*(x-e)-d*(y-k))/det,sy=(-c*(x-e)+a*(y-k))/det;
  return sx>=0&&sy>=0&&sx<=artwork.width&&sy<=artwork.height;
 });
 if(!covered){
  const sourceCanvas=canvas(artwork.width,artwork.height),sg=sourceCanvas.getContext('2d');
  sg.drawImage(artwork,0,0);
  const source=sg.getImageData(0,0,artwork.width,artwork.height);
  const target=g.getImageData(0,0,surface.width,surface.height);
  fillUncoveredArtworkPixels(target.data,surface.width,surface.height,source.data,artwork.width,artwork.height,positioned);
  g.putImageData(target,0,0);
 }
 // Preserve the window, text and symbols at their original coordinates.
 if(foil){
  const half=foil.atlas.naturalWidth/2, edge=BORDER_EDGE_PX;
  g.save();
  g.beginPath();
  g.rect(0,0,surface.width,surface.height);
  g.roundRect(b+edge,b+edge,w-2*edge,h-2*edge,shape==='round'?8:0);
  g.clip('evenodd');
  const nativeWidth=63*ppm+2*b, side=PRINT_SIDE_MARGIN*ppm;
  const fx=(foil.index%2)*half, fy=Math.floor(foil.index/2)*half;
  g.drawImage(foil.atlas,fx,fy,half,half,side,0,nativeWidth,surface.height);
  const band=side/nativeWidth*half;
  g.drawImage(foil.atlas,fx+half-band,fy,band,half,0,0,side,surface.height);
  g.drawImage(foil.atlas,fx,fy,band,half,side+nativeWidth,0,side,surface.height);
  g.restore();
 }
 if(border && !foil){
  const trim=ADMIN_PRINT_TRIM_MARGIN*ppm;
  g.drawImage(fittedBorder(border,shape,canvas,w+2*trim,h+2*trim),b-trim,b-trim);
 }
 g.drawImage(image,b+mx,b+my,63*ppm,88*ppm);
 return surface;
}

export function artPlacement(rect,bleed=2,width=1024,height=1536){return{x:(rect.x+bleed)/(63+2*bleed)*width,y:(rect.y+bleed)/(88+2*bleed)*height,w:rect.w/(63+2*bleed)*width,h:rect.h/(88+2*bleed)*height};}
export function drawArt(g,art,x,y,s,bleed=2,crop=false){if(crop)g.drawImage(art,bleed/(63+2*bleed)*art.width,bleed/(88+2*bleed)*art.height,63/(63+2*bleed)*art.width,88/(88+2*bleed)*art.height,x,y,63*s,88*s);else g.drawImage(art,x-bleed*s,y-bleed*s,(63+bleed*2)*s,(88+bleed*2)*s);}
// Position on the original card footprint so preview and PDF share the same baseline.
export function drawArtWatermark(g,x,y,width,height,text='funypin.kr',footerCenterY=null){
 const scale=width/63;
 const right=x+width-3.5*scale;
 let baseline=y+height-1.25*height/88;
 g.save();
 g.font=`600 ${1.15*scale}px sans-serif`;
 g.textAlign='right';
 g.textBaseline='alphabetic';
 if(Number.isFinite(footerCenterY)){
  const metrics=g.measureText(text);
  if(Number.isFinite(metrics.actualBoundingBoxAscent)&&Number.isFinite(metrics.actualBoundingBoxDescent))baseline=y+footerCenterY*height/1408+(metrics.actualBoundingBoxAscent-metrics.actualBoundingBoxDescent)/2;
 }
 g.lineJoin='round';
 g.lineWidth=.12*scale;
 g.strokeStyle='#fff';
 g.fillStyle='#242424';
 g.strokeText(text,right,baseline);
 g.fillText(text,right,baseline);
 g.restore();
}
function drawCutoutCard(g, card, x, y, width, height, scale) {
 const fontUnit = Math.min(scale, height / 30);
 const maxWidth = width - 2 * Math.min(2 * scale, width / 10);
 const rows = [
  { position: .275, size: 3.2, color: '#1c2128', parts: [['카드샵과 수집의 즐거움을', 400]] },
  { position: .435, size: 3.2, color: '#1c2128', parts: [['연결하는 ', 400], ['퍼니핀', 700]] },
  { position: .68, size: 1.65, color: '#555', parts: [[`30th CELEBRATION · ${card.display_name} · ${card.card_number}`, 400]] },
  { position: .807, size: 1.95, color: '#555', parts: [['안쪽을 잘라주세요 · CUT OUT INSIDE', 400]] },
 ];
 g.save();
 g.textAlign = 'left';
 g.textBaseline = 'middle';
 const lines = rows.map(({position, size, color, parts}) => {
  const fontSize = size * fontUnit;
  const runs = parts.map(([text, weight]) => {
   const font = `${weight} ${fontSize}px sans-serif`;
   g.font = font;
   const metrics = g.measureText(text);
   return {
    text, font, width: metrics.width,
    ascent: metrics.actualBoundingBoxAscent ?? fontSize / 2,
    descent: metrics.actualBoundingBoxDescent ?? fontSize / 2,
   };
  });
  const lineWidth = runs.reduce((total, run) => total + run.width, 0);
  const fit = Math.min(1, maxWidth / lineWidth);
  const baseline = height * position;
  return {
   color, runs, lineWidth, fit, baseline,
   top: baseline - Math.max(...runs.map(run => run.ascent)) * fit,
   bottom: baseline + Math.max(...runs.map(run => run.descent)) * fit,
  };
 });
 const top = Math.min(...lines.map(line => line.top));
 const bottom = Math.max(...lines.map(line => line.bottom));
 const centerOffset = (height - top - bottom) / 2;
 for (const {color, runs, lineWidth, fit, baseline} of lines) {
  g.save();
  g.translate(x + width / 2, y + baseline + centerOffset);
  g.scale(fit, fit);
  g.fillStyle = color;
  let left = -lineWidth / 2;
  for (const run of runs) {
   g.font = run.font;
   g.fillText(run.text, left, 0);
   left += run.width;
  }
  g.restore();
 }
 g.restore();
}

export function makePrintSheet(art,r,{shape='square',tolerance=0,bleed=2,sample=false,windowGuideInset=.07,trimMargin=0,watermark=false,watermarkText='funypin.kr',footerCenterY=null,cutoutCard=null,production=false,showRoundTrimGuide=true}={}){
 const S=PRINT.scale,c=document.createElement('canvas');c.width=83*S;c.height=118*S;const g=c.getContext('2d'),x=CARD_ORIGIN*S,y=CARD_ORIGIN*S,t=Number(tolerance);if(!Number.isFinite(t)||t<0||t>.5)throw Error('창 여유는 0~0.5mm로 지정해 주세요.');if(r.x-t<0||r.y-t<0||r.x+r.w+t>63||r.y+r.h+t>88)throw Error('창 여유가 카드 외곽을 넘어요.');
 if(!Number.isFinite(trimMargin)||trimMargin<0||trimMargin>bleed)throw Error('재단선 확장 값이 올바르지 않습니다.');
 const left=x-(trimMargin+PRINT_SIDE_MARGIN)*S,top=y-(trimMargin+PRINT_TOP_MARGIN)*S;
 const trimWidth=PRINT.width+2*trimMargin,trimHeight=PRINT.height+2*trimMargin;
 const right=left+trimWidth*S,bottom=top+trimHeight*S;
 g.fillStyle='white';g.fillRect(0,0,c.width,c.height);g.drawImage(art,x-(bleed+PRINT_SIDE_MARGIN)*S,y-(bleed+PRINT_TOP_MARGIN)*S,(PRINT.width+2*bleed)*S,(PRINT.height+2*bleed)*S);
 // Preserve event geometry and its printed dotted guide.
 const wx=x+(r.x-t)*S,wy=y+(r.y-t)*S,ww=(r.w+2*t)*S,wh=(r.h+2*t)*S,ib=PRINT.innerBleed*S;
 g.fillStyle='#777';g.textAlign='center';g.font=`${1.7*S}px sans-serif`;
 if(production){
  const cut=printWindowRect(r,t);
  drawProductionWindow(g,{x:cut.x*S,y:cut.y*S,w:cut.w*S,h:cut.h*S},S);
 }else{
  g.fillStyle='white';g.fillRect(wx+ib,wy+ib,ww-2*ib,wh-2*ib);g.strokeStyle='#666';g.lineWidth=.1*S;g.setLineDash([.6*S,.5*S]);const gi=Number(windowGuideInset);if(!Number.isFinite(gi)||gi<0||gi>.1)throw Error('절단선 위치 값이 올바르지 않습니다.');g.strokeRect(wx+gi*S,wy+gi*S,ww-2*gi*S,wh-2*gi*S);g.setLineDash([]);
  g.fillStyle='#777';
  if(cutoutCard)drawCutoutCard(g,cutoutCard,wx+ib,wy+ib,ww-2*ib,wh-2*ib,S);
  else g.fillText('CUT OUT INSIDE',wx+ww/2,wy+wh/2);
 }
 if(shape==='round'&&showRoundTrimGuide){const guideOffset=trimMargin?0:.06*S;g.strokeStyle='#777';g.lineWidth=.1*S;g.setLineDash([.65*S,.5*S]);g.beginPath();g.roundRect(left-guideOffset,top-guideOffset,trimWidth*S+2*guideOffset,trimHeight*S+2*guideOffset,PRINT.cornerRadius*S);g.stroke();g.setLineDash([]);}
 // With an enlarged bleed, move the marks and captions off the art while keeping
 // the trim origin and page dimensions unchanged.
 const largeBleed=!showRoundTrimGuide&&bleed-trimMargin>2;
 const markNear=largeBleed?bleed-trimMargin+.35:2.4,markFar=largeBleed?bleed-trimMargin+1.9:4;
 const headerY=largeBleed?3:5, specY=largeBleed?106:103;
 g.strokeStyle='#555';g.lineWidth=.12*S;for(const [px,py]of[[left,top],[right,top],[left,bottom],[right,bottom]]){const dx=px===left?-1:1,dy=py===top?-1:1;g.beginPath();g.moveTo(px+dx*markNear*S,py);g.lineTo(px+dx*markFar*S,py);g.moveTo(px,py+dy*markNear*S);g.lineTo(px,py+dy*markFar*S);g.stroke();}
 if(watermark)drawArtWatermark(g,x,y,63*S,88*S,watermarkText,footerCenterY);
 g.fillStyle='#666';g.font=`${1.7*S}px sans-serif`;g.fillText(sample?'FUNY PIN · PRINT TEST SAMPLE':'FUNY PIN · AI EXTENDED ART',c.width/2,headerY*S);g.fillText(`${trimWidth} x ${trimHeight} mm · ${shape==='round'?'ROUND R3':'SQUARE'} · BLEED ${bleed-trimMargin} mm`,c.width/2,specY*S);g.beginPath();g.moveTo(36.5*S,108*S);g.lineTo(46.5*S,108*S);g.moveTo(36.5*S,107*S);g.lineTo(36.5*S,109*S);g.moveTo(46.5*S,107*S);g.lineTo(46.5*S,109*S);g.stroke();g.fillText('10 mm · PRINT AT 100%',c.width/2,113*S);return c;
}


export function trimmedPrintPreview(art,canvas,watermark=false,watermarkText='funypin.kr',bleedMm=ADMIN_PRINT_BLEED,footerCenterY=null){
 const ppm=16, bleed=bleedMm*ppm;
 const preview=canvas(PRINT.width*ppm,PRINT.height*ppm);
 const g=preview.getContext('2d');
 g.drawImage(art,bleed,bleed,preview.width,preview.height,0,0,preview.width,preview.height);
 if(watermark) drawArtWatermark(g,PRINT_SIDE_MARGIN*ppm,PRINT_TOP_MARGIN*ppm,63*ppm,88*ppm,watermarkText,footerCenterY);
 return preview;
}


