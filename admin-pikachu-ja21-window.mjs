export const JA21_WINDOW_REF='m6a-ja-037';
export const JA21_WINDOW_ID='ja-wide-print:'+JA21_WINDOW_REF+':window-v1';
export const JA21_WINDOW_CUT=Object.freeze({x:11.98,y:13.0932932072227,w:38.72,h:25.429062768701634});
const RAW_W=850, RAW_H=1163, W=1088,H=1488, INSET=40, MAX=16, APRON=48;
const IDENTITY=Object.freeze([1,0,0,1,-INSET,-INSET]);
const [l,t,r,b]=[Math.floor(181*W/RAW_W)-1,Math.floor(195*H/RAW_H)-1,
 Math.ceil(665*W/RAW_W)+1,Math.ceil(513*H/RAW_H)+1];
const platePixels=new WeakMap();
export const isJA21Window=(id,ref)=>id===JA21_WINDOW_ID&&ref===JA21_WINDOW_REF;
export const canAdjustJA21=m=>{
 if(!Array.isArray(m)||m.length!==6||!m.every(Number.isFinite))return false;
 const [a,skewY,skewX,d,e,f]=m;
 if(a<=0||a!==d||skewY!==0||skewX!==0)return false;
 return [-INSET,1008+INSET].every(x=>Math.abs((x-e)/a-x-INSET)<=MAX)
  &&[-INSET,1408+INSET].every(y=>Math.abs((y-f)/a-y-INSET)<=MAX);
};
export async function decodeJA21Window(body,ref,id,decode,canvas){
 const p=body?.plate;
 if(!isJA21Window(id,ref)||p?.id!==id||p.referenceId!==ref||p.sourceKind!=='submitted-window-plate'||
    p.width!==RAW_W||p.height!==RAW_H||p.trimWidthMm!==64||p.trimHeightMm!==89||p.bleedMm!==2||
    p.embeddedWatermark!==false||p.windowKnockout!==true||Object.keys(JA21_WINDOW_CUT).some(k=>p.cutRect?.[k]!==JA21_WINDOW_CUT[k])||
    typeof p.wideWebp!=='string'||!p.wideWebp.startsWith('data:image/webp;base64,UklGR'))throw Error('21번 흰 창 도안의 규격을 확인해 주세요.');
 const raw=await decode(p.wideWebp);
 if(raw.width!==RAW_W||raw.height!==RAW_H)throw Error('21번 흰 창 도안 해상도가 맞지 않아요.');
 const artwork=canvas(W,H),g=artwork.getContext('2d');
 g.drawImage(raw,0,0,W,H);
 return {artwork,nativeMatrix:IDENTITY,cutRect:{...JA21_WINDOW_CUT},windowKnockout:true,
  jaAlternative:true,ja21Window:true,embeddedWatermark:false};
}
export function renderJA21WindowPlate(plate,matrix,canvas){
 if(!canAdjustJA21(matrix))throw Error('흰 창을 고정한 상태에서 조절 범위를 벗어났어요.');
 if(matrix.every((v,i)=>v===IDENTITY[i]))return plate.artwork;
 if(!platePixels.has(plate))platePixels.set(plate,plate.artwork.getContext('2d').getImageData(0,0,W,H).data);
 const src=platePixels.get(plate);
 const out=canvas(W,H),g=out.getContext('2d'),id=g.createImageData(W,H),dest=id.data;
 const [a,,,,e,f]=matrix;
 for(let y=0;y<H;y++){
  const dy=(y-INSET-f)/a-y;
  for(let x=0;x<W;x++){
   const index=4*(y*W+x);
   // The only white cut stays pinned in its exact original footprint.
   const dist=Math.max(0,l-x,x-r+1,t-y,y-b+1);
   if(!dist){dest[index]=src[index];dest[index+1]=src[index+1];dest[index+2]=src[index+2];dest[index+3]=255;continue;}
   const u=Math.min(dist/APRON,1), ease=u*u*(3-2*u);
   let sx=x+ease*((x-INSET-e)/a-x),sy=y+ease*dy;
   // Prevent pulling any portion of the original white window outside its vector.
   if(x<l)sx=Math.min(sx,l-1);else if(x>=r)sx=Math.max(sx,r);
   if(y<t)sy=Math.min(sy,t-1);else if(y>=b)sy=Math.max(sy,b);
   sx=Math.max(0,Math.min(W-1,sx));sy=Math.max(0,Math.min(H-1,sy));
   const ix=Math.floor(sx),iy=Math.floor(sy),fx=sx-ix,fy=sy-iy;
   const i=4*(iy*W+ix),j=4*(iy*W+Math.min(ix+1,W-1)),k=4*(Math.min(iy+1,H-1)*W+ix),m=4*(Math.min(iy+1,H-1)*W+Math.min(ix+1,W-1));
   for(let c=0;c<3;c++)dest[index+c]=(src[i+c]*(1-fx)+src[j+c]*fx)*(1-fy)+(src[k+c]*(1-fx)+src[m+c]*fx)*fy;
   dest[index+3]=255;
  }
 }
 g.putImageData(id,0,0);return out;
}
export function renderJA21WindowAlignment(plate,matrix,canvas){
 const preview=canvas(1008,1408);
 preview.getContext('2d').drawImage(renderJA21WindowPlate(plate,matrix,canvas),40,40,1008,1408,0,0,1008,1408);
 return preview;
}
