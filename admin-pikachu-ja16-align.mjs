// JA16 source coordinates in the supplied 1536 × 2136 raster.
// Anchor the exact white aperture and the single baked funyframe mark.
// Artwork moves normally farther away; displacement eases to zero around
// each anchor, so the source raster is sampled once and neither feature ghosts.
const WIDTH=1536, HEIGHT=2136, NATIVE_X=264, NATIVE_Y=364;
const INSET=40, APRON=65, MAX=32, SPAN=[1088,1488];
const PINS=[[358,519,1178,1019],[1113,1740,1224,1775]];
const cached=new WeakMap();
const nominal=[1,0,0,1,-NATIVE_X,-NATIVE_Y];
const same=(a,b)=>Array.isArray(a)&&b.every((x,i)=>a[i]===x);
const nativeCoordinate=([a,b,c,d,e,f],x,y)=>{
  const det=a*d-b*c;
  return [(d*(x-e)-c*(y-f))/det,(-b*(x-e)+a*(y-f))/det];
};
export function canAdjustJA16(matrix) {
  if(!Array.isArray(matrix)||matrix.length!==6||!matrix.every(Number.isFinite))return false;
  const [a,b,c,d]=matrix, det=a*d-b*c;
  // The supported UI only offers proportional scale and two-axis offsets.
  if(a<=0||d!==a||b!==0||c!==0||det<1e-8)return false;
  return [[-INSET,-INSET],[1008+INSET,-INSET],[-INSET,1408+INSET],[1008+INSET,1408+INSET]].every(([x,y])=>{
    const [sx,sy]=nativeCoordinate(matrix,x,y);
    return sx>=1&&sx<=WIDTH-2&&sy>=1&&sy<=HEIGHT-2&&Math.abs(sx-x-NATIVE_X)<=MAX&&Math.abs(sy-y-NATIVE_Y)<=MAX;
  });
}
function sourceRGBA(plate,canvas){
  if(!cached.has(plate)){
    const surface=canvas(WIDTH,HEIGHT),g=surface.getContext('2d');
    g.drawImage(plate.artwork,0,0);
    cached.set(plate,g.getImageData(0,0,WIDTH,HEIGHT).data);
  }
  return cached.get(plate);
}
export function renderJA16PinnedPlate(plate,matrix,canvas){
  if(!canAdjustJA16(matrix))throw new Error('흰 창과 워터마크를 고정한 상태에서 조절 범위를 벗어났어요.');
  const out=canvas(...SPAN),g=out.getContext('2d');
  if(same(matrix,nominal)){g.drawImage(plate.artwork,224,324,...SPAN,0,0,...SPAN);return out;}
  const [a,b,c,d,e,f]=matrix;
  g.setTransform(a,b,c,d,e+INSET,f+INSET);
  g.drawImage(plate.artwork,0,0);
  g.resetTransform();
  const pixels=sourceRGBA(plate,canvas);
  // A wide apron and bounded offsets make source displacement strictly
  // smaller than distance to the pinned rectangle; samples cannot re-enter
  // its masked region. The rectangles are written once at original coordinates.
  for(const [x0,y0,x1,y1] of PINS){
    const l=Math.max(224,x0-APRON),t=Math.max(324,y0-APRON);
    const r=Math.min(1312,x1+APRON),bot=Math.min(1812,y1+APRON);
    const w=r-l,h=bot-t, patch=g.createImageData(w,h);
    for(let y=t;y<bot;y++){
      const ty=(y-NATIVE_Y-f)/a, pinnedRow=y>=y0&&y<y1;
      if(pinnedRow){
        const from=(y*WIDTH+x0)*4, to=((y-t)*w+x0-l)*4;
        patch.data.set(pixels.subarray(from,from+(x1-x0)*4),to);
      }
      for(let x=l;x<r;x++){
        if(pinnedRow&&x===x0){x=x1-1;continue;}
        const to=((y-t)*w+x-l)*4;
        const dist=Math.max(0,x0-x,x-x1+1,y0-y,y-y1+1);
        const u=Math.min(dist/APRON,1), ease=u*u*(3-2*u);
        let sx=x+ease*((x-NATIVE_X-e)/a-x),sy=y+ease*(ty-y);
        if(x<x0)sx=Math.min(sx,x0-1);else if(x>=x1)sx=Math.max(sx,x1);
        if(y<y0)sy=Math.min(sy,y0-1);else if(y>=y1)sy=Math.max(sy,y1);
        const ix=Math.floor(sx),iy=Math.floor(sy), fx=sx-ix,fy=sy-iy;
        const from=(iy*WIDTH+ix)*4;
        for(let k=0;k<3;k++){
          const v0=pixels[from+k]*(1-fx)+pixels[from+k+4]*fx;
          const v1=pixels[from+k+WIDTH*4]*(1-fx)+pixels[from+k+WIDTH*4+4]*fx;
          patch.data[to+k]=v0*(1-fy)+v1*fy;
        }
        patch.data[to+3]=255;
      }
    }
    g.putImageData(patch,l-224,t-324);
  }
  return out;
}
export function renderJA16PinnedAlignment(plate,matrix,canvas){
  if(!canAdjustJA16(matrix))return null;
  const preview=canvas(1008,1408);
  preview.getContext('2d').drawImage(renderJA16PinnedPlate(plate,matrix,canvas),40,40,1008,1408,0,0,1008,1408);
  return preview;
}
