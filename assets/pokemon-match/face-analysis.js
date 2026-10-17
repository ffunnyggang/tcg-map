'use strict';
let faceModelPromise=null,faceModelsReady=false;
const faceModelListeners=new Set();
function faceModelStatus(text){for(const fn of faceModelListeners)try{fn(text);}catch{}}
function faceModelDeadline(promise,ms,message,abort){let timer;const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{try{abort?.();}catch{}reject(Error(message));},ms);});return Promise.race([promise,deadline]).finally(()=>clearTimeout(timer));}
async function fetchFaceModelAsset(url,asJson){
 const controller=new AbortController();
 const request=(async()=>{const response=await fetch(url,{signal:controller.signal,cache:'no-cache',credentials:'same-origin'});if(!response.ok)throw Error('얼굴 분석 파일을 불러오지 못했어요. 네트워크를 확인하고 다시 눌러주세요.');return asJson?await response.json():await response.arrayBuffer();})();
 try{return await faceModelDeadline(request,20000,'분석 파일 다운로드가 지연되고 있어요. 네트워크를 확인하고 다시 눌러주세요.',()=>controller.abort());}
 catch(error){if(error.name==='SyntaxError')throw Error('분석 파일을 읽지 못했어요. 새로고침 후 다시 눌러주세요.');if(error.name==='TypeError')throw Error('분석 파일에 연결하지 못했어요. 네트워크를 확인하고 다시 눌러주세요.');if(error.name==='AbortError')throw Error('분석 파일 다운로드가 지연되고 있어요. 다시 눌러주세요.');throw error;}
}
async function initializeFaceModels(){
 const api=window.faceapi;if(!api)throw Error('얼굴 분석 도구를 불러오지 못했어요. 새로고침 후 다시 시도해주세요.');
 faceModelStatus('얼굴 측정 엔진을 시작하고 있어요…');
 // Verify the selected CPU backend with a real tensor instead of relying on
 // the legacy global readiness promise in the bundled TFJS 1.7 runtime.
 const selected=await faceModelDeadline(Promise.resolve(api.tf.setBackend('cpu')),8000,'측정 엔진을 시작하지 못했어요. 새로고침 후 다시 눌러주세요.');
 if(selected===false||api.tf.getBackend()!=='cpu')throw Error('측정 엔진을 시작하지 못했어요. 새로고침 후 다시 눌러주세요.');
 const probe=api.tf.zeros([1]);try{probe.dataSync();}finally{probe.dispose();}
 const base=new URL('/assets/pokemon-match/models/',document.baseURI),descriptors=[['tiny_face_detector_model',api.nets.tinyFaceDetector],['face_landmark_68_model',api.nets.faceLandmark68Net]];let downloaded=0;
 const assetUrl=name=>{const url=new URL(name,base);url.searchParams.set('v','loader-2');return url.href;};
 const read=async(name,json)=>{const value=await fetchFaceModelAsset(assetUrl(name),json);downloaded++;faceModelStatus('얼굴 분석 모델을 불러오고 있어요… ('+downloaded+'/4)');return value;};
 faceModelStatus('얼굴 분석 모델을 불러오고 있어요… (0/4)');
 const models=await Promise.all(descriptors.map(async([name,net])=>{
  const manifest=await read(name+'-weights_manifest.json',true);
  if(!Array.isArray(manifest)||!manifest.length||manifest.some(group=>!Array.isArray(group.paths)||!Array.isArray(group.weights)||group.paths.some(path=>!/^[\w.-]+$/.test(path))))throw Error('분석 파일 형식을 확인하지 못했어요. 새로고침 후 다시 시도해주세요.');
  const buffers=await Promise.all(manifest.flatMap(group=>group.paths).map(path=>read(path,false)));
  const size=buffers.reduce((n,b)=>n+b.byteLength,0);if(!size)throw Error('분석 파일이 비어 있어요. 다시 눌러주세요.');
  const joined=new Uint8Array(size);let offset=0;for(const buffer of buffers){joined.set(new Uint8Array(buffer),offset);offset+=buffer.byteLength;}
  return {net,buffer:joined.buffer,weights:manifest.flatMap(group=>group.weights)};
 }));
 faceModelStatus('얼굴 특징 모델을 적용하고 있어요…');
 const loaded=[];try{for(const model of models){const weights=api.tf.io.decodeWeights(model.buffer,model.weights);try{model.net.loadFromWeightMap(weights);loaded.push(model.net);}catch(error){api.tf.dispose(weights);throw error;}}}catch(error){for(const net of loaded)net.dispose();throw Error('얼굴 분석 모델을 준비하지 못했어요. 새로고침 후 다시 눌러주세요.');}
 faceModelStatus('측정 준비를 마쳤어요. 정면을 봐주세요.');
}
async function ensureFaceModels(onProgress){
 if(typeof onProgress==='function')faceModelListeners.add(onProgress);
 try{
  if(faceModelsReady)return;
  if(!faceModelPromise)faceModelPromise=initializeFaceModels().then(()=>{faceModelsReady=true;}).catch(error=>{faceModelPromise=null;throw error;});
  await faceModelPromise;
 }finally{faceModelListeners.delete(onProgress);}
}
async function analyzeSelfie(image,onDiagnostic){
 const report=(stage,detail)=>{try{onDiagnostic?.({stage,detail});}catch{}};
 await ensureFaceModels();
 const iw=image.naturalWidth||image.videoWidth||image.width,ih=image.naturalHeight||image.videoHeight||image.height;if(!iw||!ih)throw Error('카메라 화면을 준비하고 있어요.');const canvas=document.createElement('canvas'),scale=Math.min(1,800/iw,800/ih);canvas.width=Math.round(iw*scale);canvas.height=Math.round(ih*scale);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
 // Feed the same explicit RGB tensor path used in model verification. This
 // avoids legacy browser/canvas environment detection inside TFJS fromPixels.
 const pixelsForInput=canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,canvas.width,canvas.height).data;
 const rgbInput=new Uint8Array(canvas.width*canvas.height*3);let minimum=255,maximum=0;
 for(let i=0,j=0;i<pixelsForInput.length;i+=4,j+=3){for(let k=0;k<3;k++){const value=pixelsForInput[i+k];rgbInput[j+k]=value;minimum=Math.min(minimum,value);maximum=Math.max(maximum,value);}}
 report('PIXELS_READY',canvas.width+'×'+canvas.height);
 if(maximum-minimum<3){const error=Error('카메라 화면에서 얼굴을 읽을 수 없어요. 렌즈와 조명을 확인해주세요.');error.code='EMPTY_FRAME';throw error;}
 const input=faceapi.tf.tensor3d(rgbInput,[canvas.height,canvas.width,3],'int32');let detected;
 report('DETECTING');try{detected=await faceapi.detectAllFaces(input,new faceapi.TinyFaceDetectorOptions({inputSize:416,scoreThreshold:.3})).withFaceLandmarks(false);}finally{input.dispose();}
 report('DETECTION_FINISHED',String(detected.length));
 const detections=detected.filter(face=>face.detection.score>=.35);
 if(!detections.length){const error=Error('얼굴을 찾지 못했어요. 밝은 곳에서 정면을 봐주세요.');error.code='NO_FACE';throw error;}
 if(detections.length>1){const error=Error('얼굴이 여러 개 보여요. 한 명만 가이드에 들어와 주세요.');error.code='MULTIPLE_FACES';throw error;}
 const result=detections[0],box=result.detection.box;
 const quality=document.createElement('canvas');quality.width=quality.height=48;const qctx=quality.getContext('2d',{willReadFrequently:true});qctx.drawImage(canvas,box.x,box.y,box.width,box.height,0,0,48,48);const qp=qctx.getImageData(0,0,48,48).data;let luminance=0,extreme=0;for(let i=0;i<qp.length;i+=4){const l=.2126*qp[i]+.7152*qp[i+1]+.0722*qp[i+2];luminance+=l;if(l<12||l>248)extreme++;}luminance/=2304;
 if(luminance<38||luminance>235||extreme/2304>.65)throw Error('얼굴이 너무 어둡거나 밝게 보여요. 조명을 조절해주세요.');
 if(box.width/canvas.width<.14||box.height/canvas.height<.14||result.detection.score<.35)throw Error('얼굴이 작거나 흐릿해요. 조금 더 가까이 와주세요.');
 report('LANDMARKS_READY',String(result.landmarks.positions.length));
 const features=extractFaceFeatures(result.landmarks.positions);
 if(features.roll>25)throw Error('고개를 조금 더 반듯하게 하고 정면을 봐주세요.');
 const points=result.landmarks.positions;const left=Math.hypot(points[30].x-points[0].x,points[30].y-points[0].y),right=Math.hypot(points[30].x-points[16].x,points[30].y-points[16].y);
 if(Math.min(left,right)/Math.max(left,right)<.48)throw Error('얼굴 정면을 카메라에 맞춰주세요.');
 // Use a central face crop to reduce background and clothing influence on color.
 const x=box.x+box.width*.2,y=box.y+box.height*.2,w=box.width*.6,h=box.height*.6;
 const crop=document.createElement('canvas');crop.width=crop.height=32;const ctx=crop.getContext('2d',{willReadFrequently:true});ctx.drawImage(canvas,x,y,w,h,0,0,32,32);const pixels=ctx.getImageData(0,0,32,32).data;const rgb=[0,0,0];for(let i=0;i<pixels.length;i+=4)for(let j=0;j<3;j++)rgb[j]+=pixels[i+j];
 const xs=points.map(p=>p.x/canvas.width),ys=points.map(p=>p.y/canvas.height);
 return {landmarkBounds:{x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)},features,rgb:rgb.map(v=>Math.round(v/1024)),box:{x:box.x/canvas.width,y:box.y/canvas.height,width:box.width/canvas.width,height:box.height/canvas.height},frontal:Math.min(left,right)/Math.max(left,right)};
}
