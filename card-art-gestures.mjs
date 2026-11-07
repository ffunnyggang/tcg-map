// View-only gestures: never change physical cut-window coordinates.
export function attachArtGestures(view,canvas,select){
 let zoom=1,previous=null;const points=new Map();
 const snapshot=()=>{const p=[...points.values()];return p.length>1?{x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2,d:Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y)}:p.length?{...p[0],d:0}:null;};
 const label=()=>{const value=String(Number(zoom.toFixed(2)));let custom=select.querySelector('[data-gesture-zoom]');if(![...select.options].some(o=>!o.dataset.gestureZoom&&o.value===value)){if(!custom){custom=select.ownerDocument.createElement('option');custom.dataset.gestureZoom='true';select.append(custom);}custom.value=value;custom.textContent=value+'배';select.value=value;}else{custom?.remove();select.value=value;}};
 function change(next,x=view.clientWidth/2,y=view.clientHeight/2,dx=0,dy=0){const old=zoom;zoom=Math.max(1,Math.min(3,next));const left=(view.scrollLeft+x)*zoom/old-x-dx,top=(view.scrollTop+y)*zoom/old-y-dy;canvas.style.width=zoom*100+'%';view.scrollLeft=left;view.scrollTop=top;label();}
 function clear(){points.clear();previous=null;view.classList.remove('dragging');}
 view.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;if(points.size>=2)return;e.preventDefault();points.set(e.pointerId,{x:e.clientX,y:e.clientY});view.setPointerCapture(e.pointerId);previous=snapshot();view.classList.add('dragging');});
 view.addEventListener('pointermove',e=>{if(!points.has(e.pointerId))return;e.preventDefault();points.set(e.pointerId,{x:e.clientX,y:e.clientY});const current=snapshot(),box=view.getBoundingClientRect();if(previous){const ratio=current.d&&previous.d?current.d/previous.d:1;change(zoom*ratio,previous.x-box.left-view.clientLeft,previous.y-box.top-view.clientTop,current.x-previous.x,current.y-previous.y);}previous=current;});
 const release=e=>{points.delete(e.pointerId);previous=snapshot();if(!points.size)view.classList.remove('dragging');};
 for(const type of ['pointerup','pointercancel','lostpointercapture'])view.addEventListener(type,release);
 view.addEventListener('wheel',e=>{e.preventDefault();const box=view.getBoundingClientRect();if(e.ctrlKey||e.metaKey)change(zoom*Math.exp(-e.deltaY*.01),e.clientX-box.left-view.clientLeft,e.clientY-box.top-view.clientTop);else{view.scrollLeft+=e.deltaX;view.scrollTop+=e.deltaY;}},{passive:false});
 select.addEventListener('change',()=>{clear();change(Number(select.value));});
 return {reset(){clear();zoom=1;canvas.style.width='100%';view.scrollLeft=0;view.scrollTop=0;label();},clear};
}
