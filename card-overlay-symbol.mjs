// Shared symbol is composited locally after generation, never included in the AI prompt.
export function compositeSharedSymbol(result,image,placement){
 const p=placement;if(!p||['x','y','w','h'].some(k=>!Number.isFinite(p[k]))||p.x<0||p.y<0||p.w<=0||p.h<=0||p.x+p.w>1||p.y+p.h>1)throw Error('심볼 위치 정보가 올바르지 않습니다.');
 result.getContext('2d').drawImage(image,Math.round(p.x*result.width),Math.round(p.y*result.height),Math.round(p.w*result.width),Math.round(p.h*result.height));return result;
}
