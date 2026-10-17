'use strict';
let faceModelPromise=null;
async function ensureFaceModels(){
 if(!window.faceapi)throw Error('얼굴 분석 도구를 불러오지 못했어요. 새로고침 후 다시 시도해주세요.');
 if(!faceModelPromise)faceModelPromise=(async()=>{
  await faceapi.tf.setBackend('cpu');await faceapi.tf.ready();
  await Promise.all([faceapi.nets.tinyFaceDetector.loadFromUri('assets/pokemon-match/models'),faceapi.nets.faceLandmark68Net.loadFromUri('assets/pokemon-match/models')]);
 })().catch(e=>{faceModelPromise=null;throw e;});
 return faceModelPromise;
}
async function analyzeSelfie(image){
 await ensureFaceModels();
 const canvas=document.createElement('canvas'),scale=Math.min(1,800/image.naturalWidth,800/image.naturalHeight);canvas.width=Math.round(image.naturalWidth*scale);canvas.height=Math.round(image.naturalHeight*scale);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
 const detections=await faceapi.detectAllFaces(canvas,new faceapi.TinyFaceDetectorOptions({inputSize:512,scoreThreshold:.45})).withFaceLandmarks(false);
 if(!detections.length)throw Error('얼굴을 찾지 못했어요. 밝은 곳에서 얼굴 정면이 보이게 찍어주세요.');
 if(detections.length>1)throw Error('얼굴이 여러 개 보여요. 한 명만 나온 사진을 선택해주세요.');
 const result=detections[0],box=result.detection.box;
 const quality=document.createElement('canvas');quality.width=quality.height=48;const qctx=quality.getContext('2d',{willReadFrequently:true});qctx.drawImage(canvas,box.x,box.y,box.width,box.height,0,0,48,48);const qp=qctx.getImageData(0,0,48,48).data;let luminance=0,extreme=0;for(let i=0;i<qp.length;i+=4){const l=.2126*qp[i]+.7152*qp[i+1]+.0722*qp[i+2];luminance+=l;if(l<12||l>248)extreme++;}luminance/=2304;
 if(luminance<38||luminance>235||extreme/2304>.65)throw Error('얼굴이 너무 어둡거나 밝게 보여요. 조명을 바꾸고 다시 찍어주세요.');
 if(box.width/canvas.width<.14||box.height/canvas.height<.14||result.detection.score<.55)throw Error('얼굴이 작거나 흐릿해요. 조금 더 가까이에서 찍어주세요.');
 const features=extractFaceFeatures(result.landmarks.positions);
 if(features.roll>25)throw Error('고개를 조금 더 반듯하게 하고 정면으로 찍어주세요.');
 const points=result.landmarks.positions;const left=Math.hypot(points[30].x-points[0].x,points[30].y-points[0].y),right=Math.hypot(points[30].x-points[16].x,points[30].y-points[16].y);
 if(Math.min(left,right)/Math.max(left,right)<.48)throw Error('얼굴 정면이 잘 보이는 사진으로 다시 찍어주세요.');
 // Use a central face crop to reduce background and clothing influence on color.
 const x=box.x+box.width*.2,y=box.y+box.height*.2,w=box.width*.6,h=box.height*.6;
 const crop=document.createElement('canvas');crop.width=crop.height=32;const ctx=crop.getContext('2d',{willReadFrequently:true});ctx.drawImage(canvas,x,y,w,h,0,0,32,32);const pixels=ctx.getImageData(0,0,32,32).data;const rgb=[0,0,0];for(let i=0;i<pixels.length;i+=4)for(let j=0;j<3;j++)rgb[j]+=pixels[i+j];
 return {features,rgb:rgb.map(v=>Math.round(v/1024))};
}
