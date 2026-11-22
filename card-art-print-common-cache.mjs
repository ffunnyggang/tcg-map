import {coversCard} from './card-overlay-manual.mjs?v=20261108-cardfit1';
import {validWindow} from './card-art-core.mjs?v=20261108-search1';

export const commonPrintReference=ref=>/^m6a-ja-0(?:1[7-9]|[234][0-9])$/.test(ref)&&+ref.slice(-3)<=46;
const submittedDimensions=Object.freeze({'m6a-ja-022':[800,1112,27,':v2'],'m6a-ja-028':[506,704,18,''],'m6a-ja-029':[506,704,18,'']});
const uuid=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const size=(img,w,h)=>img.width===w&&img.height===h;
function padded(image, canvas, x, y, right, bottom){
 const w=image.width,h=image.height;
 const out=canvas(w+x+right,h+y+bottom), g=out.getContext('2d');
 if(x===right&&x===y&&y===bottom)g.imageSmoothingEnabled=false;
 g.drawImage(image,0,0,w,1,x,0,w,y);
 g.drawImage(image,0,h-1,w,1,x,y+h,w,bottom);
 g.drawImage(image,0,0,1,h,0,y,x,h);
 g.drawImage(image,w-1,0,1,h,x+w,y,right,h);
 for(const [sx,sy,dx,dy,dw,dh] of [[0,0,0,0,x,y],[w-1,0,x+w,0,right,y],[0,h-1,0,y+h,x,bottom],[w-1,h-1,x+w,y+h,right,bottom]])
  g.drawImage(image,sx,sy,1,1,dx,dy,dw,dh);
 g.drawImage(image,x,y);
 return out;
}
function validMatrix(m){
 return Array.isArray(m)&&m.length===6&&m.every(n=>Number.isFinite(n)&&Math.abs(n)<=1000000);
}
export function coversCommonPrintArtwork(session,m){
 if(!validMatrix(m))return false;
 const p=session.printPlacement;
 if(!p?.submitted)return coversCard(m,session.image.width,session.image.height);
 const {width:w,height:h}=session.image;
 const fit=Math.max(1024/w,1424/h)*(1+1e-9);
 const [a,b,c,d,x,y]=m;
 return !b&&!c&&d===a&&a>=fit*(1-1e-8)&&a<=fit*1.25&&x<=-8&&y<=-8&&x+w*a>=1016&&y+h*a>=1416;
}
export async function readCommonPrintArtwork(cached,referenceId,canvas,imageFrom){
 const p=cached?.printPlacement,n=p?.nativeSource;
 if(!commonPrintReference(referenceId)||p?.referenceId!==referenceId||!n||!validMatrix(p.matrix)||!validWindow(p.cutMm)||
    !['page-confirmed','legacy-confirmed'].includes(p.provenance))return null;
 const [w,h,pad,suffix]=submittedDimensions[referenceId]||[];
 const submitted=n.layout==='submitted-trim';let artwork,bleedArtwork;
 if(submitted){
  if(p.illustrationId!=='ja-wide-print:'+referenceId+suffix||n.width!==w||n.height!==h||n.embeddedWatermark!==false||n.windowKnockout!==false)return null;
 }else{
  if(!uuid.test(p.illustrationId)||!['wide','native-card-padded-to-wide'].includes(n.layout)||n.matrixWidth!==1648||n.matrixHeight!==2048||
    (n.layout==='wide' ? n.width!==1648||n.height!==2048||n.padX!==0||n.padY!==0 : n.width!==1008||n.height!==1408||n.padX!==320||n.padY!==80))return null;
 }
 const location=typeof cached.imageUrl==='string'&&/^https:\/\//.test(cached.imageUrl)?cached.imageUrl
  : typeof cached.image==='string'&&/^data:image\/(png|webp);base64,/.test(cached.image)?cached.image:null;
 if(!location)return null;
 const raw=await imageFrom(location);
 if(!size(raw,n.width,n.height))return null;
 artwork=n.layout==='native-card-padded-to-wide'?padded(raw,canvas,320,80,320,560):raw;
 if(submitted)bleedArtwork=padded(raw,canvas,pad,pad,pad,pad);
 const printPlacement={matrix:[...p.matrix],cutMm:{x:p.cutMm.x,y:p.cutMm.y,w:p.cutMm.w,h:p.cutMm.h},submitted,bleedArtwork,pad,
   hasGeneratedOverscan:n.layout==='wide'&&n.hasGeneratedOverscan===true};
 if(!coversCommonPrintArtwork({image:artwork,printPlacement},printPlacement.matrix))return null;
 return {image:artwork,printPlacement};
}
export function commonPrintBleed(session){
 const p=session.printPlacement;
 if(!p)return null;
 if(p.submitted){
  const [a,b,c,d,x,y]=session.current;
  return {artwork:p.bleedArtwork,matrix:[a,b,c,d,x-p.pad*(a+c),y-p.pad*(b+d)]};
 }
 return p.hasGeneratedOverscan?{artwork:session.image,matrix:session.current}:null;
}
