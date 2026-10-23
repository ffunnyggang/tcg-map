// Local-only edge blending. No image data leaves the browser.
export function blendBackground(source,background,rect,band=32){
 const out=document.createElement('canvas');out.width=source.width;out.height=source.height;
 const g=out.getContext('2d');g.drawImage(background,0,0,out.width,out.height);
 const base=g.getImageData(0,0,out.width,out.height),src=source.getContext('2d').getImageData(0,0,out.width,out.height);
 const x0=Math.ceil(rect.x),y0=Math.ceil(rect.y),x1=Math.floor(rect.x+rect.w)-1,y1=Math.floor(rect.y+rect.h)-1;
 for(let y=Math.max(0,y0-band);y<=Math.min(out.height-1,y1+band);y++)for(let x=Math.max(0,x0-band);x<=Math.min(out.width-1,x1+band);x++){
  const sx=Math.max(x0,Math.min(x1,x)),sy=Math.max(y0,Math.min(y1,y)),distance=Math.hypot(x-sx,y-sy);
  if(distance>band)continue;const t=distance/band,weight=1-t*t*(3-2*t),i=(y*out.width+x)*4,j=(sy*out.width+sx)*4;
  for(let c=0;c<3;c++)base.data[i+c]=base.data[i+c]*(1-weight)+src.data[j+c]*weight;
  base.data[i+3]=255;
 }g.putImageData(base,0,0);return out;
}
