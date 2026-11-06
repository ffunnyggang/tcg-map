// Local pixel compositing only. Points use normalized whole-card coordinates.
export function validSymbolPolygon(points){return Array.isArray(points)&&points.length>=3&&points.length<=80&&points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1)&&Math.abs(points.reduce((a,p,i)=>{const q=points[(i+1)%points.length];return a+p.x*q.y-q.x*p.y;},0))>0.000001;}
export function symbolCutout(source,points,makeCanvas){
 if(!validSymbolPolygon(points))throw Error('심볼 외곽을 3점 이상으로 지정해 주세요.');
 const out=makeCanvas(source.width,source.height),g=out.getContext('2d');g.save();g.beginPath();points.forEach((p,i)=>i?g.lineTo(p.x*out.width,p.y*out.height):g.moveTo(p.x*out.width,p.y*out.height));g.closePath();g.clip();g.drawImage(source,0,0,out.width,out.height);g.restore();return out;
}
export function compositeSymbol(result,cutout){if(result.width!==cutout.width||result.height!==cutout.height)throw Error('심볼과 생성 이미지 크기가 다릅니다.');result.getContext('2d').drawImage(cutout,0,0);return result;}
