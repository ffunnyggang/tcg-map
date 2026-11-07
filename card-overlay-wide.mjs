export const WIDE={width:1648,height:2048,padX:320,padY:80,cardWidth:1008,cardHeight:1408};
export function padCard(source,canvas,transparent=false){const c=canvas(WIDE.width,WIDE.height),g=c.getContext('2d');if(!transparent){g.fillStyle='#d9d9d9';g.fillRect(0,0,c.width,c.height);}g.drawImage(source,WIDE.padX,WIDE.padY);return c;}
export function mappedPoint(x,y,m){const a=m.angle*Math.PI/180,c=Math.cos(a)*m.scale,s=Math.sin(a)*m.scale;return{x:m.cx+c*(x-m.cx)-s*(y-m.cy)+m.dx,y:m.cy+s*(x-m.cx)+c*(y-m.cy)+m.dy};}
export function covered(m,W,H,box){return [[box.x,box.y],[box.x+box.w,box.y],[box.x,box.y+box.h],[box.x+box.w,box.y+box.h]].every(([x,y])=>{const p=mappedPoint(x,y,m);return p.x>=1&&p.y>=1&&p.x<W-1&&p.y<H-1;});}
export function searchWide(source,generated,r){
 const W=source.width,H=source.height,pts=[];if(generated.width!==W||generated.height!==H)return null;
 for(let y=r.y+r.h*.1;y<r.y+r.h*.9;y+=r.h/15)for(let x=r.x+r.w*.1;x<r.x+r.w*.9;x+=r.w/18){const ix=Math.round(x),iy=Math.round(y);pts.push([ix,iy,(iy*W+ix)*4]);}
 const base={cx:r.x+r.w/2,cy:r.y+r.h/2,scale:1,angle:0,dx:0,dy:0};
 function score(m){let sa=0,sb=0,aa=0,bb=0,ab=0,err=0,n=0;
 for(const [x,y,i]of pts){const p=mappedPoint(x,y,m),xx=Math.round(p.x),yy=Math.round(p.y);if(xx<0||yy<0||xx>=W||yy>=H)return {...m,correlation:-1,mae:255};const fx=Math.floor(p.x),fy=Math.floor(p.y),wx=p.x-fx,wy=p.y-fy;if(fx<0||fy<0||fx+1>=W||fy+1>=H)return {...m,correlation:-1,mae:255};const j=(fy*W+fx)*4;for(let c=0;c<3;c++){const a=source.data[i+c],b=generated.data[j+c]*(1-wx)*(1-wy)+generated.data[j+4+c]*wx*(1-wy)+generated.data[j+W*4+c]*(1-wx)*wy+generated.data[j+W*4+4+c]*wx*wy;sa+=a;sb+=b;aa+=a*a;bb+=b*b;ab+=a*b;err+=Math.abs(a-b);n++;}}
 const va=aa-sa*sa/n,vb=bb-sb*sb/n;return {...m,correlation:va>n*25&&vb>n*25?(ab-sa*sb/n)/Math.sqrt(va*vb):-1,mae:err/n};}
 let best=score(base);const accept=m=>{const q=score(m);if(q.correlation>best.correlation)best=q;};
 for(let k=0;k<=16;k++)for(const angle of [-4,0,4])for(let dy=-32;dy<=32;dy+=2)for(let dx=-32;dx<=32;dx+=2)accept({...base,scale:.65+k*.05,angle,dx,dy});
 const coarse={...best};for(let k=-2;k<=2;k++)for(let a=-2;a<=2;a++)for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++)accept({...coarse,scale:coarse.scale+k*.01,angle:coarse.angle+a,dx:coarse.dx+dx,dy:coarse.dy+dy});
 const fine={...best};for(let k=-2;k<=2;k++)for(let a=-2;a<=2;a++)for(let y=-2;y<=2;y++)for(let x=-2;x<=2;x++)accept({...fine,scale:fine.scale+k*.002,angle:fine.angle+a*.2,dx:fine.dx+x*.2,dy:fine.dy+y*.2});
 return best;
}
export async function alignWide(source,generated,artRect,canvas){
 if(generated.width!==WIDE.width||generated.height!==WIDE.height)throw Error('확장 생성 결과 크기가 요청 규격과 다릅니다.');
 const padded=padCard(source,canvas),tw=160,th=Math.round(tw*WIDE.height/WIDE.width),sx=tw/WIDE.width,sy=th/WIDE.height;
 const tiny=im=>{const c=canvas(tw,th);c.getContext('2d').drawImage(im,0,0,tw,th);return c.getContext('2d').getImageData(0,0,tw,th);};
 await new Promise(r=>setTimeout(r,0));
 const art={x:(WIDE.padX+artRect.x*16)*sx,y:(WIDE.padY+artRect.y*16)*sy,w:artRect.w*16*sx,h:artRect.h*16*sy};
 const original=tiny(padded),target=tiny(generated);
 const match=typeof Worker==='undefined'?searchWide(original,target,art):await new Promise((resolve,reject)=>{const worker=new Worker(new URL('./card-overlay-wide-worker.mjs?v=20261107-bottom1',import.meta.url),{type:'module'});const timeout=setTimeout(()=>{worker.terminate();reject(Error('자동 정렬 시간이 초과됐어요. 다시 생성하지 않고 종료합니다.'));},45000);worker.onmessage=e=>{clearTimeout(timeout);worker.terminate();e.data.error?reject(Error(e.data.error)):resolve(e.data.match);};worker.onerror=()=>{clearTimeout(timeout);worker.terminate();reject(Error('이 브라우저에서 자동 정렬을 실행하지 못했어요.'));};worker.postMessage({source:original,generated:target,rect:art});});
 if(!match||match.correlation<.9||match.mae>35)throw Error('원본과 충분히 일치하는 위치를 찾지 못했어요. 자동 재생성은 하지 않습니다. AI 원본은 저장 내역에서 확인할 수 있어요.');
 const cardBox={x:WIDE.padX*sx,y:WIDE.padY*sy,w:WIDE.cardWidth*sx,h:WIDE.cardHeight*sy};
 if(!covered(match,tw,th,cardBox))throw Error('정렬 후 카드 영역에 빈 공간이 남아 출력하지 않았어요. AI 원본은 저장 내역에서 확인해 주세요.');
 // Invert the sampled source-to-generated transform, including thumbnail axis scaling.
 const angle=match.angle*Math.PI/180,a=Math.cos(angle)*match.scale,b=Math.sin(angle)*match.scale;
 const tx=match.cx-a*match.cx+b*match.cy+match.dx,ty=match.cy-b*match.cx-a*match.cy+match.dy,det=a*a+b*b;
 const A=a/det,B=-b/det* sx/sy,C=b/det*sy/sx,D=a/det,E=(-a*tx-b*ty)/det/sx-WIDE.padX,F=(b*tx-a*ty)/det/sy-WIDE.padY;
 const result=canvas(WIDE.cardWidth,WIDE.cardHeight),g=result.getContext('2d');g.setTransform(A,B,C,D,E,F);g.drawImage(generated,0,0);g.resetTransform();
 return {image:result,match};
}
