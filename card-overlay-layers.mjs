import {fittedBorder,BORDER_EDGE_PX} from './card-overlay-shape.mjs?v=20261120-border-footer';
// Experimental local contrast extraction. This is not OCR or guaranteed semantic segmentation.
export function cutBounds(r,w,h){return {x:Math.floor(r.x*w/63),y:Math.floor(r.y*h/88),right:Math.ceil((r.x+r.w)*w/63),bottom:Math.ceil((r.y+r.h)*h/88)};}
export function textAlpha(pixels,w,h,rect,threshold=32,borderMM=1.5){
 const alpha=new Uint8ClampedArray(w*h),lum=new Float32Array(w*h),sum=new Float64Array((w+1)*(h+1)),b=cutBounds(rect,w,h),edge=Math.ceil(w*borderMM/63),stride=w+1,radius=Math.max(3,Math.round(w/84));
 for(let y=0;y<h;y++){let row=0;for(let x=0;x<w;x++){const i=y*w+x,j=i*4;lum[i]=.2126*pixels[j]+.7152*pixels[j+1]+.0722*pixels[j+2];row+=lum[i];sum[(y+1)*stride+x+1]=sum[y*stride+x+1]+row;}}
 for(let y=edge;y<h-edge;y++)for(let x=edge;x<w-edge;x++){if(x>=b.x&&x<b.right&&y>=b.y&&y<b.bottom)continue;const x0=Math.max(0,x-radius),x1=Math.min(w,x+radius+1),y0=Math.max(0,y-radius),y1=Math.min(h,y+radius+1),mean=(sum[y1*stride+x1]-sum[y0*stride+x1]-sum[y1*stride+x0]+sum[y0*stride+x0])/((x1-x0)*(y1-y0));if(Math.abs(lum[y*w+x]-mean)>=threshold)alpha[y*w+x]=255;}
 return alpha;
}
export function sourceWithAlpha(source,alpha,canvas){const out=canvas(source.width,source.height),g=out.getContext('2d'),p=source.getContext('2d').getImageData(0,0,out.width,out.height);for(let i=0;i<alpha.length;i++)p.data[i*4+3]=alpha[i];g.putImageData(p,0,0);return out;}
export function extractLayers(source,r,canvas,threshold=32,borderMM=1.5){const w=source.width,h=source.height,p=source.getContext('2d').getImageData(0,0,w,h),a=new Uint8ClampedArray(w*h),edge=Math.ceil(w*borderMM/63),b=cutBounds(r,w,h);for(let y=0;y<h;y++)for(let x=0;x<w;x++)if((x<edge||x>=w-edge||y<edge||y>=h-edge)&&!(x>=b.x&&x<b.right&&y>=b.y&&y<b.bottom))a[y*w+x]=255;return {text:sourceWithAlpha(source,textAlpha(p.data,w,h,r,threshold,borderMM),canvas),border:sourceWithAlpha(source,a,canvas),showText:false,showBorder:false,threshold,borderMM};}
export function windowMask(r,canvas){const c=canvas(1008,1408),g=c.getContext('2d'),b=cutBounds(r,1008,1408);g.fillStyle='#000';g.fillRect(b.x,b.y,b.right-b.x,b.bottom-b.y);return c;}
// Locate the bottom legal line in a transparent text layer without assuming one
// card's exact crop. Short, left/right-aligned collector and artist labels are
// not eligible. Keep everything in place when the line cannot be isolated.
const isolatedFooter = new WeakMap();
function runs(values,maxGap){
 const spans=[];
 for(let i=0;i<values.length;i++){
  if(!values[i]) continue;
  const last=spans.at(-1);
  if(last&&i-last.end-1<=maxGap)last.end=i;
  else spans.push({start:i,end:i});
 }
 return spans;
}
export function copyrightBounds(text){
 if(isolatedFooter.has(text))return isolatedFooter.get(text);
 let bounds=null;
 const ctx=text.getContext?.('2d'),width=text.width;
 if(ctx&&width===1008&&text.height===1408){
  const startY=1336, height=text.height-startY;
  const data=ctx.getImageData(0,startY,width,height).data;
  // Ignore faint extraction noise when identifying the line, but retain the
  // antialiasing in the moved crop. Inspect a central strip for row boundaries
  // so offset labels cannot bridge two rows on opposite sides of the card.
  const alpha=(x,y)=>data[(y*width+x)*4+3];
  const centralRows=Array.from({length:height},(_,y)=>{
   let n=0;
   for(let x=width*.35|0;x<width*.65;x++)if(alpha(x,y)>=32)n++;
   return n>=3;
  });
  for(const band of runs(centralRows,2).reverse()){
   const lineHeight=band.end-band.start+1;
   if(startY+band.start<1352||lineHeight<4||lineHeight>28)continue;
   const cols=Array.from({length:width},(_,x)=>{
    for(let y=band.start;y<=band.end;y++)if(alpha(x,y)>=32)return true;
    return false;
   });
   const eligible=runs(cols,22).filter(({start,end})=>end-start+1>=140&&end-start+1<=635&&Math.abs((start+end)/2-width/2)<75&&start>70&&end<width-71);
   if(eligible.length!==1)continue;
   const span=eligible[0];
   // Extend by one pixel to capture translucent fringe, not a neighboring line.
   const x=Math.max(0,span.start-1), right=Math.min(width-1,span.end+1);
   const top=Math.max(0,band.start-1), bottom=Math.min(height-1,band.end+1);
   let joined=false, ink=0, first=height, last=-1;
   for(let y=top;y<=bottom;y++)for(let x0=x;x0<=right;x0++)if(alpha(x0,y)>=32){
     ink++;first=Math.min(first,y);last=Math.max(last,y);
   }
   for(let x0=x;x0<=right&&!joined;x0++)
    joined=(top>0&&alpha(x0,top-1)>=32)||(bottom<height-1&&alpha(x0,bottom+1)>=32);
   if(joined||last<first||ink/(lineHeight*(span.end-span.start+1))>.72)continue;
   bounds={x,y:startY+top,w:right-x+1,h:bottom-top+1,inkCenter:(first+last+1)/2-top};
   break;
  }
 }
 isolatedFooter.set(text,bounds);
 return bounds;
}
// The admin print renderer may supply a measured crop for a known text layer
// when surrounding extraction noise prevents generic isolation.
function hintedCopyrightBounds(text,hint){
 if(!hint || text.width!==1008 || text.height!==1408)return null;
 const {x,y,w,h}=hint;
 if(![x,y,w,h].every(Number.isInteger)||x<0||y<1352||w<140||h<4||x+w>1008||y+h>1408)return null;
 const ctx=text.getContext?.('2d');
 if(!ctx)return null;
 const data=ctx.getImageData(x,y,w,h).data;
 let left=w,right=-1,top=h,bottom=-1,ink=0;
 for(let row=0;row<h;row++){
  let n=0;
  for(let col=0;col<w;col++)if(data[4*(row*w+col)+3]>=32)n++;
  if(n<5)continue; // A few stray alpha pixels must not set the line height.
  top=Math.min(top,row);bottom=row;ink+=n;
  for(let col=0;col<w;col++)if(data[4*(row*w+col)+3]>=32){left=Math.min(left,col);right=Math.max(right,col);}
 }
 const glyphW=right-left+1,glyphH=bottom-top+1;
 // Reject other layouts and opaque or clipped content rather than move them.
 if(left<1||right>=w-1||top<1||bottom>=h-1||glyphW<.8*w||glyphH<5||glyphH>h-2||ink>.68*glyphW*glyphH)return null;
 return {x:x+left-1,y:y+top-1,w:glyphW+2,h:glyphH+2,inkCenter:glyphH/2+1};
}
function drawCardText(g,text,footerCenterY=null,deferCenteredFooter=false,footerBoundsHint=null){
 const b=hintedCopyrightBounds(text,footerBoundsHint) || copyrightBounds(text);
 if(!b){g.drawImage(text,0,0);return;}
 const {x,y,w,h,inkCenter}=b;
 g.save();
 g.beginPath();
 g.rect(0,0,1008,1408);
 g.rect(x,y,w,h);
 g.clip('evenodd');
 g.drawImage(text,0,0);
 g.restore();
 const top=Number.isFinite(footerCenterY)?Math.max(0,Math.min(1408-h,footerCenterY-inkCenter)):y+0.05*16;
 const drawFooter=()=>g.drawImage(text,x,y,w,h,x,top,w,h);
 if(deferCenteredFooter&&Number.isFinite(footerCenterY))return drawFooter;
 drawFooter();
}
export function composeLayers(source,background,r,layers,canvas){
 const out=canvas(1008,1408),g=out.getContext('2d');
 const aiText=layers.kind==='ai-header'||layers.kind==='ai-text';
 const centered=layers.symbolSide==='center';
 const footerCenterY=layers.footerCenterY ?? (layers.showBorder ? 1408-(layers.kind==='ai-text'?BORDER_EDGE_PX:Math.ceil(16*(layers.borderMM||1.5)))/2 : null);
 const drawSymbol=()=>{
  const p=layers.placement;
  g.drawImage(layers.symbol,Math.round(p.x*1008),Math.round(p.y*1408),Math.round(p.w*1008),Math.round(p.h*1408));
 };
 g.drawImage(background,0,0);
 const drawLocalFooter=!aiText&&layers.showText?drawCardText(g,layers.text,footerCenterY,layers.showBorder):null;
 if(layers.showBorder)g.drawImage(layers.kind==='ai-text'?fittedBorder(layers.border,layers.shape||'square',canvas):layers.border,0,0);
 const b=cutBounds(r,1008,1408);
 if(aiText&&centered&&layers.showSymbol&&!layers.printing)drawSymbol();
 g.drawImage(source,b.x,b.y,b.right-b.x,b.bottom-b.y,b.x,b.y,b.right-b.x,b.bottom-b.y);
 drawLocalFooter?.();
 if(aiText){
  if(layers.printing&&layers.showSymbol)drawSymbol();
  if(layers.showText)drawCardText(g,layers.text,footerCenterY,false,layers.footerBoundsHint);
  if(!layers.printing&&!centered&&layers.showSymbol)drawSymbol();
 }
 return out;
}
export function reviewLayers(source,r,canvas,previous=null){return new Promise(resolve=>{
 const d=document.createElement('dialog');d.style.cssText='width:min(96vw,620px);max-height:94dvh;overflow:auto;border:0;border-radius:16px;padding:18px';d.innerHTML='<h2>텍스트·테두리 레이어 확인</h2><p>텍스트·숫자·기호의 대비를 이용한 시험 추출입니다. 그림이나 패널 무늬가 섞일 수 있고 작은 글자가 빠질 수 있습니다. 원본 보기와 비교하고 지우개·복원 브러시로 보완하세요. 복원한 영역은 배경색도 함께 포함됩니다.</p><label>텍스트 추출 기준 <input data-threshold type="range" min="12" max="80" step="2" value="32"></label><label>테두리 폭 <select data-edge><option value="0.5">0.5mm</option><option value="1">1mm</option><option value="1.5" selected>1.5mm</option><option value="2">2mm</option><option value="3">3mm</option></select></label><p>기준·폭 변경 시 브러시 수정은 초기화됩니다.</p><button data-source type="button">원본 보기</button><button data-erase type="button">지우개: 켜짐</button><label>브러시 <input data-brush type="range" min="1" max="10" step=".5" value="3">mm</label><div data-stage style="background:repeating-conic-gradient(#ddd 0% 25%,#fff 0% 50%) 0/18px 18px;margin:12px 0"></div><p>상단 원본 그림 창은 추출 대상에서 제외합니다. 테두리는 선택한 폭의 외곽 띠이며 실물과 확인해 주세요.</p><label><input data-confirm type="checkbox">추출 품질과 제외할 영역을 확인했습니다.</label><div style="display:flex;gap:8px;margin-top:12px"><button data-cancel type="button">취소</button><button data-go type="button" disabled>이 레이어 사용</button></div>';
 document.body.append(d);const q=s=>d.querySelector(s),view=canvas(1008,1408),g=view.getContext('2d');view.style.cssText='display:block;width:100%;height:auto;max-height:none;touch-action:none';q('[data-stage]').append(view);
 let layers=previous?{...previous,text:canvas(1008,1408)}:extractLayers(source,r,canvas),erase=true,showSource=false,last=null;if(previous)layers.text.getContext('2d').drawImage(previous.text,0,0);q('[data-threshold]').value=layers.threshold||32;q('[data-edge]').value=layers.borderMM||1.5;
 function draw(){g.clearRect(0,0,1008,1408);if(showSource)g.drawImage(source,0,0);else{g.drawImage(layers.text,0,0);g.drawImage(layers.kind==='ai-text'?fittedBorder(layers.border,layers.shape||'square',canvas):layers.border,0,0);}g.strokeStyle='#8b43b4';g.lineWidth=2;g.setLineDash([8,5]);g.strokeRect(r.x*16,r.y*16,r.w*16,r.h*16);g.setLineDash([]);}
 function change(){q('[data-confirm]').checked=false;q('[data-go]').disabled=true;draw();}
 function regenerate(){layers=extractLayers(source,r,canvas,Number(q('[data-threshold]').value),Number(q('[data-edge]').value));change();}
 q('[data-threshold]').onchange=q('[data-edge]').onchange=regenerate;
 q('[data-source]').onclick=()=>{showSource=!showSource;q('[data-source]').textContent=showSource?'추출 레이어 보기':'원본 보기';draw();};q('[data-erase]').onclick=()=>{erase=!erase;q('[data-erase]').textContent=erase?'지우개: 켜짐':'원본 복원 브러시';};
 const brush=canvas(1008,1408),bg=brush.getContext('2d');function point(e){const b=view.getBoundingClientRect();return{x:(e.clientX-b.left)*1008/b.width,y:(e.clientY-b.top)*1408/b.height};}
 function paint(p){bg.clearRect(0,0,1008,1408);bg.globalCompositeOperation='source-over';bg.lineWidth=Number(q('[data-brush]').value)*16;bg.lineCap='round';bg.strokeStyle='#000';bg.beginPath();bg.moveTo(last.x,last.y);bg.lineTo(p.x,p.y);bg.stroke();bg.fillStyle='#000';bg.beginPath();bg.arc(p.x,p.y,bg.lineWidth/2,0,Math.PI*2);bg.fill();const b=cutBounds(r,1008,1408);bg.clearRect(b.x,b.y,b.right-b.x,b.bottom-b.y);const edge=Math.ceil(layers.borderMM*16);bg.clearRect(0,0,1008,edge);bg.clearRect(0,1408-edge,1008,edge);bg.clearRect(0,0,edge,1408);bg.clearRect(1008-edge,0,edge,1408);const tg=layers.text.getContext('2d');if(erase){tg.globalCompositeOperation='destination-out';tg.drawImage(brush,0,0);tg.globalCompositeOperation='source-over';}else{bg.globalCompositeOperation='source-in';bg.drawImage(source,0,0);bg.globalCompositeOperation='source-over';tg.drawImage(brush,0,0);}last=p;change();}
 view.onpointerdown=e=>{view.setPointerCapture(e.pointerId);last=point(e);paint(last);};view.onpointermove=e=>{if(last)paint(point(e));};view.onpointerup=view.onpointercancel=()=>last=null;q('[data-confirm]').onchange=()=>q('[data-go]').disabled=!q('[data-confirm]').checked;
 let done=false;function finish(v){if(done)return;done=true;d.close();d.remove();resolve(v);}q('[data-cancel]').onclick=()=>finish(null);d.oncancel=e=>{e.preventDefault();finish(null);};q('[data-go]').onclick=()=>{if(q('[data-confirm]').checked)finish(layers);};draw();d.showModal();
});}

