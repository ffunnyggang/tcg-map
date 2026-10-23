// Local pixel analysis only. No camera frames are uploaded for detection.
import {validRect,validateCorners} from './card-overlay-core.mjs';
export function cameraGuide(width,height){const h=Math.min(height*.78,width*.82*88/63),w=h*63/88;return{x:(width-w)/2,y:(height-h)/2,w,h};}
const median=a=>{a.sort((x,y)=>x-y);return a[Math.floor(a.length/2)]||0;};
function fit(points){let slope=0,offset=0,residual=999;for(let pass=0;pass<2;pass++){const n=points.length;if(n<8)return null;let x=0,y=0,xx=0,xy=0;for(const [a,b]of points){x+=a;y+=b;xx+=a*a;xy+=a*b;}const den=n*xx-x*x;if(Math.abs(den)<1)return null;slope=(n*xy-x*y)/den;offset=(y-slope*x)/n;residual=Math.sqrt(points.reduce((s,[a,b])=>s+(b-slope*a-offset)**2,0)/n);points=points.filter(([a,b])=>Math.abs(b-slope*a-offset)<Math.max(2,residual*1.5));}return{slope,offset,residual};}
export function detectCard({data,width:w,height:h}){
 const edge=[[],[],[]];for(let y=0;y<h;y+=5)for(const x of [1,w-2])for(let c=0;c<3;c++)edge[c].push(data[(y*w+x)*4+c]);for(let x=0;x<w;x+=5)for(const y of [1,h-2])for(let c=0;c<3;c++)edge[c].push(data[(y*w+x)*4+c]);const bg=edge.map(median),mask=new Uint8Array(w*h),labels=new Int32Array(w*h),queue=new Int32Array(w*h);for(let i=0;i<mask.length;i++){let d=0;for(let c=0;c<3;c++)d+=(data[i*4+c]-bg[c])**2;mask[i]=d>40**2?1:0;}
 let label=0,best=null;for(let i=0;i<mask.length;i++){if(!mask[i]||labels[i])continue;label++;let start=0,end=1,minX=w,minY=h,maxX=0,maxY=0;queue[0]=i;labels[i]=label;while(start<end){const p=queue[start++],x=p%w,y=Math.floor(p/w);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);for(const n of [x>0?p-1:-1,x<w-1?p+1:-1,y>0?p-w:-1,y<h-1?p+w:-1])if(n>=0&&mask[n]&&!labels[n]){labels[n]=label;queue[end++]=n;}}
 const bw=maxX-minX,bh=maxY-minY,ratio=bw/bh,fill=end/Math.max(1,bw*bh);if(end>w*h*.12&&ratio>.5&&ratio<.95&&fill>.62&&minX>1&&minY>1&&maxX<w-2&&maxY<h-2&&(!best||end>best.area))best={label,area:end,minX,minY,maxX,maxY,fill};}
 if(!best)return null;const b=best,bw=b.maxX-b.minX,bh=b.maxY-b.minY,left=[],right=[],top=[],bottom=[];
 for(let y=Math.ceil(b.minY+bh*.18);y<b.maxY-bh*.18;y++){let x=b.minX;while(x<=b.maxX&&labels[y*w+x]!==b.label)x++;let z=b.maxX;while(z>=b.minX&&labels[y*w+z]!==b.label)z--;if(x<z){left.push([y,x]);right.push([y,z]);}}
 for(let x=Math.ceil(b.minX+bw*.18);x<b.maxX-bw*.18;x++){let y=b.minY;while(y<=b.maxY&&labels[y*w+x]!==b.label)y++;let z=b.maxY;while(z>=b.minY&&labels[z*w+x]!==b.label)z--;if(y<z){top.push([x,y]);bottom.push([x,z]);}}
 const l=fit(left),r=fit(right),t=fit(top),bt=fit(bottom);if(!l||!r||!t||!bt)return null;
 function cross(v,k){const den=1-v.slope*k.slope;if(Math.abs(den)<.1)return{x:-1,y:-1};const x=(v.offset+v.slope*k.offset)/den;return{x:x/w,y:(k.slope*x+k.offset)/h};}
 const points=[cross(l,t),cross(r,t),cross(r,bt),cross(l,bt)];try{validateCorners(points);}catch{return null;}if(points.some(p=>p.x<=0||p.y<=0||p.x>=1||p.y>=1))return null;
 const distance=(a,b)=>Math.hypot((a.x-b.x)*w,(a.y-b.y)*h),ratio=(distance(points[0],points[1])+distance(points[2],points[3]))/(distance(points[0],points[3])+distance(points[1],points[2]));if(Math.abs(ratio-63/88)>.13)return null;
 const residual=Math.max(l.residual,r.residual,t.residual,bt.residual);if(residual>4)return null;return{points,residual,fill:b.fill};
}
export function captureQuality(frame,previous,points){const {data,width:w,height:h}=frame;const guide=cameraGuide(w,h),expected=[[guide.x,guide.y],[guide.x+guide.w,guide.y],[guide.x+guide.w,guide.y+guide.h],[guide.x,guide.y+guide.h]],alignment=points?Math.max(...points.map((p,i)=>Math.hypot(p.x*w-expected[i][0],p.y*h-expected[i][1])/guide.w)):1;let lap=0,lap2=0,motion=0,glare=0,n=0;
 const gray=(x,y)=>{const i=(y*w+x)*4;return(data[i]+data[i+1]+data[i+2])/3;};for(let y=Math.floor(guide.y+guide.h*.2);y<guide.y+guide.h*.52;y+=2)for(let x=Math.floor(guide.x+guide.w*.12);x<guide.x+guide.w*.88;x+=2){const i=(y*w+x)*4,v=gray(x+1,y)+gray(x-1,y)+gray(x,y+1)+gray(x,y-1)-4*gray(x,y);lap+=v;lap2+=v*v;motion+=previous?Math.abs(data[i]-previous[i])+Math.abs(data[i+1]-previous[i+1])+Math.abs(data[i+2]-previous[i+2]):999;glare+=data[i]>250&&data[i+1]>250&&data[i+2]>250?1:0;n++;}
 return{alignment,sharpness:lap2/n-(lap/n)**2,motion:motion/(n*3),glare:glare/n};}
export function autoCaptureReady(q){return q.alignment<.045&&q.sharpness>65&&q.motion<3&&q.glare<.2;}
export const WINDOW_PRESETS={modern:{x:5,y:13,w:53,h:33},classic:{x:5.5,y:14,w:52,h:32}};
export function detectArtWindow(frame,preset='modern'){
 const base=WINDOW_PRESETS[preset]||WINDOW_PRESETS.modern,{data,width:w,height:h}=frame;
 const color=(x,y,c)=>data[(Math.max(0,Math.min(h-1,Math.round(y)))*w+Math.max(0,Math.min(w-1,Math.round(x))))*4+c];
 function scan(axis,lo,hi,from,to,target){const size=axis==='y'?h:w,cross=axis==='y'?w:h,rows=[];for(let p=Math.ceil(lo*size);p<=hi*size;p++){let sum=0,n=0;for(let q=Math.ceil(from*cross);q<to*cross;q+=2){for(let c=0;c<3;c++)sum+=Math.abs(axis==='y'?color(q,p-2,c)-color(q,p+2,c):color(p-2,q,c)-color(p+2,q,c));n+=3;}rows.push({p,contrast:sum/Math.max(n,1),score:sum/Math.max(n,1)/(1+Math.abs(p/size-target)*8)});}return rows.sort((a,b)=>b.score-a.score)[0];}
 const t=scan('y',.105,.235,.13,.87,base.y/88),b=scan('y',.43,.59,.13,.87,(base.y+base.h)/88),l=scan('x',.045,.14,.23,.45,base.x/63),r=scan('x',.86,.955,.23,.45,(base.x+base.w)/63);
 const found={x:l.p/w*63+.2,y:t.p/h*88+.2,w:(r.p-l.p)/w*63-.4,h:(b.p-t.p)/h*88-.4};const confident=[t,b,l,r].every(v=>v.contrast>16)&&found.w>46&&found.h>25&&found.h<40&&validRect(found);return{rect:confident?Object.fromEntries(Object.entries(found).map(([k,v])=>[k,Math.round(v*10)/10])):{...base},confident};
}
