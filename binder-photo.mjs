import {layouts,cropGeometry} from './binder-core.mjs';
// Every output is a new JPEG: EXIF/location metadata and original file names are discarded.
export async function editPhoto(blob,pockets,dialog){
 const img=new Image(),url=URL.createObjectURL(blob);try{img.src=url;await img.decode();if(img.naturalWidth*img.naturalHeight>80000000)throw Error('사진 크기가 너무 커요. 작은 사진으로 다시 시도해주세요.');
 return await new Promise((resolve,reject)=>{
 dialog.innerHTML='<div class="modal-head"><h2>사진 맞추기</h2><button class="icon" id="cancelCrop" aria-label="닫기">×</button></div><p class="hint">사진을 움직여 위치를 맞추고, 두 손가락으로 확대해보세요.</p><div class="crop-stage"><canvas width="900" id="cropCanvas"></canvas></div><div class="range-row"><label for="cropZoom">확대</label><input id="cropZoom" type="range" min="1" max="3" step=".01" value="1"></div><div class="modal-actions"><button class="btn" id="rotateCrop">↻ 회전</button><button class="btn primary" id="doneCrop">사진 적용</button></div>';
 if(!dialog.open)dialog.showModal();const canvas=dialog.querySelector('canvas'),ctx=canvas.getContext('2d');canvas.height=Math.round(900/layouts[pockets].ratio);
 let rotation=0,zoom=1,x=0,y=0,rotated=document.createElement('canvas'),pointerMap=new Map(),pinch=null,finished=false;
 const renderSource=()=>{rotated.width=rotation%180?img.naturalHeight:img.naturalWidth;rotated.height=rotation%180?img.naturalWidth:img.naturalHeight;const c=rotated.getContext('2d');c.translate(rotated.width/2,rotated.height/2);c.rotate(rotation*Math.PI/180);c.drawImage(img,-img.naturalWidth/2,-img.naturalHeight/2);};
 const draw=()=>{const g=cropGeometry(rotated.width,rotated.height,canvas.width,canvas.height,zoom,x,y);ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(rotated,g.dx,g.dy,g.dw,g.dh);};
 const finish=value=>{if(finished)return;finished=true;dialog.removeEventListener('cancel',cancel);dialog.removeEventListener('close',cancel);dialog.close();resolve(value);};
 const cancel=e=>{e?.preventDefault?.();finish(null)};dialog.addEventListener('cancel',cancel);dialog.addEventListener('close',cancel);
 canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);pointerMap.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointerMap.size===2){const [a,b]=[...pointerMap.values()];pinch={dist:Math.hypot(a.x-b.x,a.y-b.y),zoom};}};
 canvas.onpointermove=e=>{const old=pointerMap.get(e.pointerId);if(!old)return;pointerMap.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointerMap.size===2&&pinch){const [a,b]=[...pointerMap.values()];zoom=Math.max(1,Math.min(3,pinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/pinch.dist));dialog.querySelector('#cropZoom').value=zoom;}else{x+=(e.clientX-old.x)*canvas.width/canvas.clientWidth;y+=(e.clientY-old.y)*canvas.width/canvas.clientWidth;}draw();};
 canvas.onpointerup=canvas.onpointercancel=e=>{pointerMap.delete(e.pointerId);pinch=null};
 dialog.querySelector('#cropZoom').oninput=e=>{zoom=Number(e.target.value);draw()};
 dialog.querySelector('#rotateCrop').onclick=()=>{rotation=(rotation+90)%360;x=y=0;renderSource();draw()};dialog.querySelector('#cancelCrop').onclick=cancel;
 dialog.querySelector('#doneCrop').onclick=e=>{e.target.disabled=true;canvas.toBlob(b=>{if(b)finish(b);else{e.target.disabled=false;reject(Error('사진 변환에 실패했어요.'));finish(null)}},'image/jpeg',.88)};
 renderSource();draw();
 });}finally{URL.revokeObjectURL(url)}
}
export async function capturePhoto(pockets,dialog){
 let stream=null,closed=false,stop=()=>{closed=true;stream?.getTracks().forEach(t=>t.stop());stream=null};
 return new Promise((resolve,reject)=>{
  let settled=false;
  const finish=value=>{if(settled)return;settled=true;stop();document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',cancel);dialog.removeEventListener('cancel',cancel);dialog.removeEventListener('close',cancel);dialog.close();resolve(value)};
  const cancel=e=>{e?.preventDefault?.();finish(null)},hidden=()=>{if(document.hidden)cancel()};
  dialog.innerHTML=`<div class="modal-head"><h2>바인더 한 면 촬영</h2><button class="icon" id="cameraClose" aria-label="닫기">×</button></div><div class="camera-stage" style="--ratio:${layouts[pockets].ratio};--cols:${layouts[pockets].cols}"><video playsinline autoplay muted></video><div class="camera-frame">${'<i></i>'.repeat(pockets)}</div></div><p class="camera-guide">바인더 한 면의 테두리를 가이드 안에 맞춰주세요.<br>빛 반사가 생기면 조명이나 촬영 각도를 살짝 바꿔주세요.</p><p id="cameraState" class="hint">카메라 권한을 확인하고 있어요…</p><button class="btn primary wide" id="shutter" disabled>촬영하기</button>`;
  if(!dialog.open)dialog.showModal();dialog.querySelector('#cameraClose').onclick=cancel;dialog.addEventListener('cancel',cancel);dialog.addEventListener('close',cancel);document.addEventListener('visibilitychange',hidden);window.addEventListener('pagehide',cancel);
  (async()=>{try{if(!navigator.mediaDevices?.getUserMedia)throw Error('CAMERA_UNAVAILABLE');stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:2560}},audio:false});if(closed){stop();return}const video=dialog.querySelector('video');video.srcObject=stream;await video.play();if(closed)return;dialog.querySelector('#cameraState').textContent='촬영 후 사진의 위치와 크기를 조절할 수 있어요.';dialog.querySelector('#shutter').disabled=false;dialog.querySelector('#shutter').onclick=()=>{if(!video.videoWidth)return;const c=document.createElement('canvas');c.width=video.videoWidth;c.height=video.videoHeight;c.getContext('2d').drawImage(video,0,0);c.toBlob(b=>finish(b),'image/jpeg',.95)};}catch(e){if(closed)return;stop();dialog.querySelector('#cameraState').textContent='카메라를 열 수 없어요. 기기 설정에서 카메라 권한을 허용하거나 사진 보관함을 이용해주세요.';}})();
 });
}
