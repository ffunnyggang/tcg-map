// Pure local comparison of the supplied anchor and the corresponding model output.
// This evaluates layout preservation, not copyright or moderation suitability.
export function anchorQuality(source,generated){if(source.length!==generated.length||source.length<48)return{accepted:false,reason:'INVALID_ANCHOR',correlation:0,mae:255};let a=0,b=0,aa=0,bb=0,ab=0,error=0,n=0;for(let i=0;i<source.length;i+=4)for(let c=0;c<3;c++){const x=source[i+c],y=generated[i+c];a+=x;b+=y;aa+=x*x;bb+=y*y;ab+=x*y;error+=Math.abs(x-y);n++;}const va=aa-a*a/n,vb=bb-b*b/n,cov=ab-a*b/n,correlation=va>1&&vb>1?cov/Math.sqrt(va*vb):0,mae=error/n;const accepted=mae<=12||(correlation>=.9&&mae<=32);return{accepted,correlation,mae,reason:accepted?'ANCHOR_PRESERVED':'ANCHOR_CHANGED'};}
export function checkGeneratedAnchor(sourceCanvas,generated,placement){const make=()=>{const c=document.createElement('canvas');c.width=64;c.height=48;return c;},a=make(),b=make(),inset=2;const x=placement.x+inset,y=placement.y+inset,w=placement.w-inset*2,h=placement.h-inset*2;if(w<5||h<5)return{accepted:false,reason:'INVALID_ANCHOR'};a.getContext('2d').drawImage(sourceCanvas,x,y,w,h,0,0,64,48);b.getContext('2d').drawImage(generated,x/sourceCanvas.width*generated.width,y/sourceCanvas.height*generated.height,w/sourceCanvas.width*generated.width,h/sourceCanvas.height*generated.height,0,0,64,48);return anchorQuality(a.getContext('2d').getImageData(0,0,64,48).data,b.getContext('2d').getImageData(0,0,64,48).data);}

// Search only small uniform scale/translation errors; never repair a redrawn subject.
// All coordinates refer to the same downsampled full canvas.
export function findAlignment(source,generated,r){
 const {width:W,height:H}=source;
 if(W!==generated.width||H!==generated.height||W<16||H<16)return null;
 const points=[];
 for(let y=r.y+r.h*.12;y<r.y+r.h*.88;y+=Math.max(1,r.h/22))for(let x=r.x+r.w*.12;x<r.x+r.w*.88;x+=Math.max(1,r.w/28))points.push([Math.round(x),Math.round(y)]);
 const cx=r.x+r.w/2,cy=r.y+r.h/2;
 function score(scale,dx,dy){let a=0,b=0,aa=0,bb=0,ab=0,error=0,n=0;
  for(const [x,y]of points){const xx=Math.round(cx+(x-cx)*scale+dx),yy=Math.round(cy+(y-cy)*scale+dy);if(xx<0||yy<0||xx>=W||yy>=H)return{correlation:0,mae:255};
   for(let c=0;c<3;c++){const v=source.data[(y*W+x)*4+c],u=generated.data[(yy*W+xx)*4+c];a+=v;b+=u;aa+=v*v;bb+=u*u;ab+=v*u;error+=Math.abs(v-u);n++;}}
  const va=aa-a*a/n,vb=bb-b*b/n;return{correlation:va>n*25&&vb>n*25?(ab-a*b/n)/Math.sqrt(va*vb):0,mae:error/n};}
 const baseline=score(1,0,0);let best={scale:1,dx:0,dy:0,...baseline};
 const better=q=>q.correlation-best.correlation>.0001;
 for(let si=-3;si<=3;si++)for(let dy=-8;dy<=8;dy+=2)for(let dx=-8;dx<=8;dx+=2){const scale=1+si*.02,q=score(scale,dx,dy);if(better(q))best={scale,dx,dy,...q};}
 const coarse={...best};
 for(let si=-2;si<=2;si++)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const scale=coarse.scale+si*.005,q=score(scale,coarse.dx+dx,coarse.dy+dy);if(better(q))best={scale,dx:coarse.dx+dx,dy:coarse.dy+dy,...q};}
 // Keep at least .5mm beyond the physical trim. Any remaining outer bleed is
 // extended from the nearest edge pixel, never from another generated scene.
 const mx=W*1.5/67,my=H*1.5/92;
 const left=cx+(mx-cx)*best.scale+best.dx,right=cx+(W-mx-cx)*best.scale+best.dx;
 const top=cy+(my-cy)*best.scale+best.dy,bottom=cy+(H-my-cy)*best.scale+best.dy;
 if(best.correlation<.94||best.mae>24||best.correlation-baseline.correlation<.06||baseline.mae-best.mae<5||left<0||right>=W||top<0||bottom>=H)return null;
 return{...best,cx,cy,width:W,height:H};
}
export function alignGenerated(sourceCanvas,generated,placement){
 const tiny=(img)=>{const c=document.createElement('canvas');c.width=160;c.height=220;c.getContext('2d').drawImage(img,0,0,160,220);return c.getContext('2d').getImageData(0,0,160,220);};
 const r={x:placement.x/sourceCanvas.width*160,y:placement.y/sourceCanvas.height*220,w:placement.w/sourceCanvas.width*160,h:placement.h/sourceCanvas.height*220};
 const match=findAlignment(tiny(sourceCanvas),tiny(generated),r);if(!match)return null;
 const input=document.createElement('canvas');input.width=sourceCanvas.width;input.height=sourceCanvas.height;const g=input.getContext('2d'),W=input.width,H=input.height;
 const tx=(match.cx*(1-match.scale)+match.dx)*W/160,ty=(match.cy*(1-match.scale)+match.dy)*H/220;
 const left=-tx/match.scale,top=-ty/match.scale,right=left+W/match.scale,bottom=top+H/match.scale;
 g.drawImage(generated,left,top,W/match.scale,H/match.scale);
 // Clamp only uncovered outer bleed; the physical card and .5mm margin were
 // required to remain inside the generated image before accepting this match.
 const x0=Math.max(0,Math.ceil(left)),x1=Math.min(W,Math.floor(right)),y0=Math.max(0,Math.ceil(top)),y1=Math.min(H,Math.floor(bottom));
 if(x0>0)g.drawImage(input,x0,y0,1,y1-y0,0,y0,x0,y1-y0);
 if(x1<W)g.drawImage(input,x1-1,y0,1,y1-y0,x1,y0,W-x1,y1-y0);
 if(y0>0)g.drawImage(input,0,y0,W,1,0,0,W,y0);
 if(y1<H)g.drawImage(input,0,y1-1,W,1,0,y1,W,H-y1);
 return{image:input,match};
}
