import {test} from 'node:test';
import assert from 'node:assert/strict';
import {attachArtGestures} from '../card-art-gestures.mjs';
function setup(){
 const listeners={},selectListeners={},canvas={style:{}},view={clientWidth:300,clientHeight:300,clientLeft:0,clientTop:0,scrollLeft:0,scrollTop:0,classList:{add(){},remove(){}},getBoundingClientRect:()=>({left:0,top:0}),setPointerCapture(){},addEventListener:(k,f)=>listeners[k]=f};
 const select={value:'1',options:[1,1.5,2,3].map(n=>({value:String(n),dataset:{}})),querySelector(){return this.options.find(o=>o.dataset.gestureZoom);},append(o){this.options.push(o);},ownerDocument:{createElement(){const o={dataset:{},remove(){select.options=select.options.filter(x=>x!==o);}};return o;}},addEventListener:(k,f)=>selectListeners[k]=f};
 const control=attachArtGestures(view,canvas,select),event=(type,id,x,y)=>listeners[type]({pointerId:id,clientX:x,clientY:y,pointerType:'touch',preventDefault(){}});
 return {view,canvas,select,control,event,selectListeners};
}
test('pinch preserves focal image point, pan continues after one finger releases, reset clears view',()=>{
 const {view,canvas,control,event}=setup();control.reset();event('pointerdown',1,100,100);event('pointerdown',2,200,100);event('pointermove',2,300,100);
 assert.equal(canvas.style.width,'200%');assert.equal(view.scrollLeft,100);assert.equal(view.scrollTop,100);
 event('pointerup',2,300,100);event('pointermove',1,80,70);assert.equal(view.scrollLeft,120);assert.equal(view.scrollTop,130);
 event('pointercancel',1,80,70);event('pointermove',1,0,0);assert.equal(view.scrollLeft,120);
 control.reset();assert.equal(canvas.style.width,'100%');assert.equal(view.scrollLeft,0);assert.equal(view.scrollTop,0);
});
test('pinch zoom clamps to 1–3x and preset zoom stays synchronized',()=>{
 const {canvas,select,control,event,selectListeners}=setup();control.reset();event('pointerdown',1,0,0);event('pointerdown',2,100,0);event('pointermove',2,1000,0);assert.equal(canvas.style.width,'300%');assert.equal(select.value,'3');event('pointermove',2,1,0);assert.equal(canvas.style.width,'100%');select.value='1.5';selectListeners.change();assert.equal(canvas.style.width,'150%');
});
