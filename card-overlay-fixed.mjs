// Preservation coordinates are independent from the print cut window.
export function fixedBounds(r,width,height){
 const x=Math.max(0,Math.floor(r.x*width/63)),y=Math.max(0,Math.floor(r.y*height/88));
 return {x,y,w:Math.min(width,Math.ceil((r.x+r.w)*width/63))-x,h:Math.min(height,Math.ceil((r.y+r.h)*height/88))-y};
}
export function restorePixels(source,generated,mask){
 if(source.length!==generated.length||mask.length!==source.length)throw Error('이미지와 마스크 크기가 다릅니다.');
 const output=new Uint8ClampedArray(generated);
 for(let i=0;i<mask.length;i+=4)if(mask[i+3]===255)for(let c=0;c<4;c++)output[i+c]=source[i+c];
 return output;
}
export function restoreFixed(source,generated,mask,canvas){
 const out=canvas(source.width,source.height),g=out.getContext('2d');
 const a=source.getContext('2d').getImageData(0,0,out.width,out.height);
 const b=generated.getContext('2d').getImageData(0,0,out.width,out.height);
 const m=mask.getContext('2d').getImageData(0,0,out.width,out.height);
 b.data.set(restorePixels(a.data,b.data,m.data));g.putImageData(b,0,0);return out;
}
export function reviewFixedMask(source,artRect,canvas){
 return new Promise(resolve=>{
 const w=source.width,h=source.height,mask=canvas(w,h),view=canvas(w,h),g=mask.getContext('2d'),vg=view.getContext('2d'),b=fixedBounds(artRect,w,h);
 const d=document.createElement('dialog');d.style.cssText='width:min(94vw,560px);max-height:94dvh;overflow:auto;padding:16px;border:0;border-radius:16px';
 d.innerHTML='<h2>원본 보존 영역 확인</h2><p>보라색 영역은 생성 후 원본 픽셀로 복원합니다. 일러스트와 바깥 테두리는 고정됩니다. 보존할 글자·기호·로고를 손가락으로 칠해 주세요. 칠한 부분의 배경도 함께 유지됩니다.</p><p>이 설정은 출력 절단 창과 별개입니다. 자동 지정한 일러스트 범위가 잘못되었다면 취소해 주세요.</p><label>브러시 <input id="fixedBrush" type="range" min="1" max="8" step=".5" value="2"> mm</label><button type="button" id="fixedErase">지우개: 꺼짐</button><button type="button" id="fixedReset">추가 표시 초기화</button><div id="fixedStage"></div><label style="display:block;padding:12px 0"><input id="fixedConfirm" type="checkbox">일러스트와 보존할 글자·기호를 확인했습니다.</label><button type="button" id="fixedCancel">취소</button><button type="button" id="fixedGo" disabled>이 보존 영역으로 생성</button>';
 view.style.cssText='width:100%;height:auto;display:block;touch-action:none';d.querySelector('#fixedStage').append(view);document.body.append(d);
 let erase=false,last=null;
 function lock(){g.globalCompositeOperation='source-over';g.fillStyle='#000';g.fillRect(b.x,b.y,b.w,b.h);const e=Math.ceil(w*1.5/63);g.fillRect(0,0,w,e);g.fillRect(0,h-e,w,e);g.fillRect(0,0,e,h);g.fillRect(w-e,0,e,h);}
 function binary(){const p=g.getImageData(0,0,w,h);for(let i=3;i<p.data.length;i+=4)p.data[i]=p.data[i]>0?255:0;g.putImageData(p,0,0);}
 function draw(){lock();binary();vg.clearRect(0,0,w,h);vg.drawImage(source,0,0);const tint=canvas(w,h),t=tint.getContext('2d');t.drawImage(mask,0,0);t.globalCompositeOperation='source-in';t.fillStyle='rgba(145,45,210,.45)';t.fillRect(0,0,w,h);vg.drawImage(tint,0,0);}
 function change(){d.querySelector('#fixedConfirm').checked=false;d.querySelector('#fixedGo').disabled=true;draw();}
 function point(e){const r=view.getBoundingClientRect();return {x:(e.clientX-r.left)*w/r.width,y:(e.clientY-r.top)*h/r.height};}
 function paint(p){g.globalCompositeOperation=erase?'destination-out':'source-over';g.strokeStyle='#000';g.lineCap='round';g.lineWidth=Number(d.querySelector('#fixedBrush').value)*w/63;g.beginPath();g.moveTo(last.x,last.y);g.lineTo(p.x,p.y);g.stroke();g.beginPath();g.arc(p.x,p.y,g.lineWidth/2,0,Math.PI*2);g.fillStyle='#000';g.fill();last=p;change();}
 view.onpointerdown=e=>{view.setPointerCapture(e.pointerId);last=point(e);paint(last);};view.onpointermove=e=>{if(last)paint(point(e));};view.onpointerup=view.onpointercancel=()=>last=null;
 d.querySelector('#fixedErase').onclick=e=>{erase=!erase;e.target.textContent='지우개: '+(erase?'켜짐':'꺼짐');};
 d.querySelector('#fixedReset').onclick=()=>{g.clearRect(0,0,w,h);change();};
 d.querySelector('#fixedConfirm').onchange=e=>d.querySelector('#fixedGo').disabled=!e.target.checked;
 let done=false;function finish(value){if(done)return;done=true;d.close();d.remove();resolve(value);}
 d.querySelector('#fixedCancel').onclick=()=>finish(null);d.oncancel=e=>{e.preventDefault();finish(null);};d.querySelector('#fixedGo').onclick=()=>{lock();binary();finish(mask);};
 draw();d.showModal();
 });
}
