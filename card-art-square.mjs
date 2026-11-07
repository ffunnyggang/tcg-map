// Extend only the four clipped R3 corner regions, using nearby reflected pixels.
export function fillSquareCorners(source,createCanvas){
 const out=createCanvas(source.width,source.height),g=out.getContext('2d');g.drawImage(source,0,0);
 const w=out.width,h=out.height,r=Math.ceil(w*3/63),pixels=g.getImageData(0,0,w,h),original=new Uint8ClampedArray(pixels.data);
 for(let cy=0;cy<2;cy++)for(let cx=0;cx<2;cx++)for(let y=0;y<r;y++)for(let x=0;x<r;x++){
  const dx=r-x-.5,dy=r-y-.5,dist=Math.hypot(dx,dy);if(dist<=r)continue;
  const factor=(2*r-dist-1)/dist,sx=Math.max(0,Math.min(w-1,Math.round(r-dx*factor))),sy=Math.max(0,Math.min(h-1,Math.round(r-dy*factor)));
  const tx=cx?w-1-x:x,ty=cy?h-1-y:y,rx=cx?w-1-sx:sx,ry=cy?h-1-sy:sy;
  const a=(ty*w+tx)*4,b=(ry*w+rx)*4;for(let c=0;c<3;c++)pixels.data[a+c]=original[b+c];pixels.data[a+3]=255;
 }
 g.putImageData(pixels,0,0);return out;
}
