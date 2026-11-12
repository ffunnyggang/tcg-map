// Face-only masking on the browser. The image sent to AI excludes the chosen face ellipse.
// All other illustration pixels remain visible, so this is not automatic character removal.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function coverFace(plate,face){
 const {width,height}=plate,g=plate.getContext('2d',{willReadFrequently:true});
 const cx=clamp(face.x,.01,.99)*width,cy=clamp(face.y,.01,.99)*height;
 const rx=clamp(face.width,.08,.8)*width/2,ry=clamp(face.height,.08,.8)*height/2;
 // Sample only outside the ellipse to fill its interior with a uniform neutralized color.
 const src=g.getImageData(0,0,width,height).data;
 const samples=[],n=32;
 for(let i=0;i<n;i++){const theta=i*Math.PI*2/n;
  const x=Math.round(clamp(cx+Math.cos(theta)*rx*1.25,0,width-1));
  const y=Math.round(clamp(cy+Math.sin(theta)*ry*1.25,0,height-1));
  const p=(y*width+x)*4;samples.push([src[p],src[p+1],src[p+2]]);
 }
 const mid=c=>samples.map(p=>p[c]).sort((a,b)=>a-b)[Math.floor(samples.length/2)];
 g.save();g.beginPath();g.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);g.clip();
 g.fillStyle='rgb('+mid(0)+','+mid(1)+','+mid(2)+')';g.fillRect(0,0,width,height);g.restore();
 return Math.PI*rx*ry/(width*height);
}
export function faceMaskedFullCard(source,rect,faces,canvas){
 const scaleX=source.width/63,scaleY=source.height/88;
 const x=Math.round(rect.x*scaleX),y=Math.round(rect.y*scaleY);
 const width=Math.round((rect.x+rect.w)*scaleX)-x,height=Math.round((rect.y+rect.h)*scaleY)-y;
 const plate=canvas(width,height);
 plate.getContext('2d',{willReadFrequently:true}).drawImage(source,x,y,width,height,0,0,width,height);
 for(const face of faces)coverFace(plate,face);
 const masked=canvas(source.width,source.height),g=masked.getContext('2d');
 g.drawImage(source,0,0);
 g.drawImage(plate,x,y);
 return {masked,plate};
}
export function extractBackgroundPlate(card,rect,placement,face={x:.5,y:.35,width:.28,height:.30}){
 const width=Math.max(1,Math.round(rect.w*12)),height=Math.max(1,Math.round(rect.h*12));
 const plate=document.createElement('canvas');plate.width=width;plate.height=height;
 const g=plate.getContext('2d',{willReadFrequently:true});
 g.drawImage(card,rect.x*12,rect.y*12,rect.w*12,rect.h*12,0,0,width,height);
 const area=coverFace(plate,face);
 const full=document.createElement('canvas');full.width=1072;full.height=1472;
 const fg=full.getContext('2d');fg.fillStyle='#fff';fg.fillRect(0,0,1072,1472);
 fg.drawImage(plate,placement.x,placement.y,placement.w,placement.h);
 const mask=document.createElement('canvas');mask.width=1072;mask.height=1472;
 const mg=mask.getContext('2d');mg.fillStyle='#000';mg.fillRect(placement.x,placement.y,placement.w,placement.h);
 return {canvas:full,mask,plate,backgroundRatio:Math.max(0,1-area),confidence:0.5};
}
