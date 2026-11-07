// Validate actual alpha rather than treating an opaque black/white plate as a layer.
export function headerTransparency(pixels,width,height){
 let clear=0,solid=0;for(let y=0;y<height;y++)for(let x=0;x<width;x++){const a=pixels[(y*width+x)*4+3];if(a<16)clear++;if(y<height*.24&&a>128)solid++;}
 return {valid:clear/(width*height)>.65&&solid>width*height*.001,clearRatio:clear/(width*height)};
}
export async function decodeHeaderLayer(base64,canvas){
 const image=new Image();image.src='data:image/png;base64,'+base64;await image.decode();
 if(image.width!==1008||image.height!==1408)throw Error('상단 레이어의 크기가 요청 규격과 다릅니다. 배경 생성은 시작하지 않았어요.');
 const out=canvas(1008,1408),g=out.getContext('2d');g.drawImage(image,0,0);
 if(!headerTransparency(g.getImageData(0,0,1008,1408).data,1008,1408).valid)throw Error('상단 레이어가 투명 이미지로 생성되지 않았거나 비어 있습니다. 배경 생성은 시작하지 않았어요.');
 // The scope of this option is the upper card header, never lower descriptions.
 g.clearRect(0,Math.ceil(1408*.24),1008,1408);return out;
}
