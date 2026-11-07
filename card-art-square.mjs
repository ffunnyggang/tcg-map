// Fill clipped corners and their rounded edge stroke, feathered into adjacent artwork.
export function fillSquareCorners(source,createCanvas){
 const out=createCanvas(source.width,source.height),g=out.getContext('2d');g.drawImage(source,0,0);
 const w=out.width,h=out.height,r=Math.ceil(w*3/63),pixels=g.getImageData(0,0,w,h),original=new Uint8ClampedArray(pixels.data);
 for(let cy=0;cy<2;cy++)for(let cx=0;cx<2;cx++)for(let y=0;y<r;y++)for(let x=0;x<r;x++){
  const dx=r-x-.5,dy=r-y-.5,dist=Math.hypot(dx,dy),inner=r-w*.9/63,feather=w*.35/63;if(dist<=inner)continue;
  const factor=Math.max(0,2*inner-dist-1)/dist,sx=Math.max(0,Math.min(w-1,Math.round(r-dx*factor))),sy=Math.max(0,Math.min(h-1,Math.round(r-dy*factor)));
  const tx=cx?w-1-x:x,ty=cy?h-1-y:y,rx=cx?w-1-sx:sx,ry=cy?h-1-sy:sy;
  const a=(ty*w+tx)*4,b=(ry*w+rx)*4;const mix=Math.min(1,(dist-inner)/feather);for(let c=0;c<3;c++)pixels.data[a+c]=Math.round(original[a+c]*(1-mix)+original[b+c]*mix);pixels.data[a+3]=Math.round(original[a+3]*(1-mix)+255*mix);
 }
 g.putImageData(pixels,0,0);return out;
}
