export function prepareMobileLayerSource(image,canvas){const card=canvas(756,1056);card.getContext('2d').drawImage(image,0,0,756,1056);const source=canvas(1008,1408);source.getContext('2d').drawImage(card,0,0,1008,1408);return source;}
import {padCard} from './card-overlay-wide.mjs?v=20261107-wide3';
import {windowMask} from './card-overlay-layers.mjs?v=20261108-cardfit1';
// Keep completed requests across an explicit retry; never automatically retry AI.
export function createLayerFlow({invoke,canvas,decodeText,imageFrom,loadAssets}){
 let textDraft=null,pending=null;
 return {reset(){textDraft=null;pending=null;},hasPending(){return !!pending;},async generate(source,referenceId,cut,progress=()=>{},generationRect=cut){
  const key=referenceId+':'+source.toDataURL('image/png'),windowKey=JSON.stringify({cut,generationRect});
  if(pending?.key===key&&pending.windowKey===windowKey)return pending;
  const assets=await loadAssets();
  if(textDraft?.key!==key){progress('1/2 · 텍스트·기호를 준비하고 있어요');const data=await invoke({action:'generate_mobile_text',image:source.toDataURL('image/png'),sourceReferenceId:referenceId});const text=await decodeText(data.image,canvas);textDraft={key,text,data};}
  progress('2/2 · 일러스트를 넓게 확장하고 있어요');
  const mask=windowMask(cut,canvas),generationMask=windowMask(generationRect,canvas),data=await invoke({action:'generate_mobile_layers',image:padCard(source,canvas).toDataURL('image/png'),mask:padCard(generationMask,canvas,true).toDataURL('image/png'),sourceReferenceId:referenceId,printRect:generationRect,wideLayout:'bottom-v1',wideLayers:true,wideHeader:'fulltext-v1'});
  const image=await imageFrom('data:image/png;base64,'+data.image);if(image.width!==1648||image.height!==2048)throw Error('확장 이미지 크기가 맞지 않아요.');
  pending={key,windowKey,source,image,mask,artRect:{...cut},data,textData:textDraft.data,layers:{kind:'ai-text',text:textDraft.text,border:assets.borders[0].image,borderId:assets.borders[0].id,symbol:assets.right.image,placement:assets.right.placement,showText:true,showSymbol:true,showBorder:false},assets};return pending;
 }};
}
