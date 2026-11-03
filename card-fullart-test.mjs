import {checkGeneratedAnchor} from './card-overlay-quality.mjs?v=20261023-align1';
import {artPlacement} from './card-overlay-print.mjs?v=20261023-ux3';
export const FULL_ART_SIZE={width:1008,height:1408};
export function prepareFullCard(card,createCanvas){
 const c=createCanvas(FULL_ART_SIZE.width,FULL_ART_SIZE.height);
 c.getContext('2d').drawImage(card,0,0,c.width,c.height);return c;
}
export function inspectFullArt(source,result,rect){
 if(result.width!==FULL_ART_SIZE.width||result.height!==FULL_ART_SIZE.height)throw Error('풀아트 결과의 규격이 요청한 1008×1408px와 다릅니다.');
 return checkGeneratedAnchor(source,result,artPlacement(rect,0,source.width,source.height));
}
