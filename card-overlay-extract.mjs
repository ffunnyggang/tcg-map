// Conservative browser-only background extraction for card-overlay. No original full card is sent.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function extractBackgroundPlate(card,rect,placement){
 const width=Math.max(1,Math.round(rect.w*12)),height=Math.max(1,Math.round(rect.h*12));
 const input=document.createElement('canvas');input.width=width;input.height=height;
 const ig=input.getContext('2d',{willReadFrequently:true});
 ig.drawImage(card,rect.x*12,rect.y*12,rect.w*12,rect.h*12,0,0,width,height);
 const src=ig.getImageData(0,0,width,height),a=src.data;
 // Only retain confidently edge-connected scenery; the center is always reconstructed.
 const count=width*height,seen=new Uint8Array(count),keep=new Uint8Array(count);
 const q=new Int32Array(count),depth=Math.max(7,Math.round(Math.min(width,height)*.14));
 const dist=(i,j)=>{const p=i*4,k=j*4;return Math.hypot(a[p]-a[k],a[p+1]-a[k+1],a[p+2]-a[k+2]);};
 let n=0;
 const seed=(x,y)=>{const k=y*width+x;if(seen[k])return;seen[k]=1;keep[k]=1;q[n++]=k;};
 // The outermost pixels seed the classification; a subject touching an edge can leak.
 for(let x=0;x<width;x+=3){seed(x,0);seed(x,height-1);}
 for(let y=0;y<height;y+=3){seed(0,y);seed(width-1,y);}
 let at=0;
 while(at<n){
  const i=q[at++],x=i%width,y=(i/width)|0;
  const neighbors=[x>0?i-1:-1,x<width-1?i+1:-1,y>0?i-width:-1,y<height-1?i+width:-1];
  for(const j of neighbors){if(j<0||seen[j])continue;seen[j]=1;
   const px=j%width,py=(j/width)|0,edge=Math.min(px,py,width-1-px,height-1-py);
   if(edge>=depth||dist(i,j)>25)continue;
   keep[j]=1;q[n++]=j;
  }
 }
 // Keep only color information in conservative outer strips; never include center pixels.
 const out=ig.createImageData(width,height),b=out.data;
 const sample=(x,y)=>{const p=(clamp(y,0,height-1)*width+clamp(x,0,width-1))*4;return [a[p],a[p+1],a[p+2]];};
 let preserved=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=y*width+x,p=i*4,u=x/Math.max(1,width-1),v=y/Math.max(1,height-1);
  // Fill uncertain region with synthetic color interpolation from four outer edges.
  const top=sample(x,0),bottom=sample(x,height-1),left=sample(0,y),right=sample(width-1,y);
  for(let c=0;c<3;c++){
   const vertical=top[c]*(1-v)+bottom[c]*v,horizontal=left[c]*(1-u)+right[c]*u;
   b[p+c]=(vertical+horizontal)/2;
  }
  const border=Math.min(x,y,width-1-x,height-1-y);
  if(keep[i]&&border<depth){for(let c=0;c<3;c++)b[p+c]=a[p+c];preserved++;}
  b[p+3]=255;
 }
 const plate=document.createElement('canvas');plate.width=width;plate.height=height;
 plate.getContext('2d').putImageData(out,0,0);
 const full=document.createElement('canvas');full.width=1072;full.height=1472;
 const fg=full.getContext('2d');fg.fillStyle='#fff';fg.fillRect(0,0,1072,1472);
 fg.drawImage(plate,placement.x,placement.y,placement.w,placement.h);
 const mask=document.createElement('canvas');mask.width=1072;mask.height=1472;
 const mg=mask.getContext('2d');mg.fillStyle='#000';mg.fillRect(placement.x,placement.y,placement.w,placement.h);
 const ratio=preserved/count;
 return {canvas:full,mask,plate,backgroundRatio:ratio,confidence:Math.min(.85,ratio*2)};
}
