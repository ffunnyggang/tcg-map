import {headerTransparency} from './card-overlay-header.mjs?v=20261108-header1';
export function splitLayerAtlas(image,canvas){
 if(image.width!==3296||image.height!==2048)throw Error('1회 생성 결과의 배치 규격이 다릅니다. 원본 묶음을 확인해 주세요. 자동 재요청하지 않습니다.');
 const background=canvas(1648,2048),bg=background.getContext('2d');bg.drawImage(image,0,0,1648,2048,0,0,1648,2048);
 const pixels=bg.getImageData(0,0,1648,2048).data;let missing=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]<240)missing++;
 if(missing/(1648*2048)>.005)throw Error('일러스트 영역에 투명한 빈 공간이 생겼습니다. 자동 재요청하지 않습니다.');
 const text=canvas(1008,1408),tg=text.getContext('2d');tg.drawImage(image,1968,80,1008,1408,0,0,1008,1408);
 const p=tg.getImageData(0,0,1008,1408).data;
 if(!headerTransparency(p,1008,1408).valid)throw Error('상단 레이어의 투명 배경 또는 배치가 올바르지 않습니다. 자동 재요청하지 않습니다.');
 // Detect a solid header panel across the blank gap between left and right clusters.
 let gapClear=0,gapTotal=0;for(let y=0;y<Math.floor(1408*.15);y++)for(let x=Math.floor(1008*.43);x<Math.floor(1008*.7);x++){gapTotal++;if(p[(y*1008+x)*4+3]<16)gapClear++;}
 if(gapClear/gapTotal<.8)throw Error('상단 텍스트 사이에 원본 배경 패널이 남아 있습니다. 원본 묶음을 확인해 주세요.');
 tg.clearRect(0,Math.ceil(1408*.24),1008,1408);return {background,text};
}
