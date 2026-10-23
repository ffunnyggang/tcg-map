const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
class Element extends EventTarget{
 constructor(){super();this.style={};this.dataset={};this.clientWidth=334;this.tokens=new Set();this.classList={toggle:(k,v)=>v?this.tokens.add(k):this.tokens.delete(k)};}
 set innerHTML(value){this.html=value;if(value.includes('binder-book-case')){this.case=new Element();this.root=new Element();this.root.parentElement=this.case;}}
 querySelector(){return this.root;}querySelectorAll(){return [];}getBoundingClientRect(){return {left:0,top:0,width:320,height:421,right:320,bottom:421};}
 setPointerCapture(){}hasPointerCapture(){return false;}
}
let instances=[],reduced=false,destroyed=0,lastIndex=0;
class Engine{
 constructor(root,settings){this.settings=settings;this.state='read';this.events={};this.index=settings.startPage;instances.push(this);}
 on(type,fn){this.events[type]=fn;}loadFromHTML(){}getState(){return this.state;}getUI(){return {getDistElement:()=>new Element()};}destroy(){destroyed++;}
 startUserTouch(){this.state='user_fold';}userMove(p){this.last=p;}userStop(){this.state='read';}turnToPage(i){this.index=i;this.events.flip({data:i});}flipNext(){this.turnToPage(this.index+1);}flipPrev(){this.turnToPage(this.index-1);}
}
const window=new EventTarget();window.matchMedia=()=>({matches:reduced});const document={createElement:()=>new Element()};
vm.runInNewContext(fs.readFileSync('binder-flipbook.js','utf8'),{window,document,St:{PageFlip:Engine},setTimeout,clearTimeout});
const host=new Element(),viewer=new Element();const control=window.FUNY_BINDER_FLIPBOOK.mount({host,viewer,pages:['cover','page1','page2'],index:0,ratio:.76,onFlip:i=>lastIndex=i,onState:()=>{},loadImage:async()=>''});
function pointer(type,id,x,y){const e=new Event(type,{cancelable:true});Object.assign(e,{pointerId:id,clientX:x,clientY:y,button:0});viewer.dispatchEvent(e);}
control.turn(-1);assert.equal(lastIndex,0);control.turn(1);assert.equal(lastIndex,1);
pointer('pointerdown',1,310,250);pointer('pointermove',1,250,248);assert.equal(instances.at(-1).state,'user_fold');pointer('pointerdown',2,150,250);assert.equal(lastIndex,1);assert.equal(instances.at(-1).state,'read');assert.equal(destroyed,1);
pointer('pointerup',1,250,248);pointer('pointerup',2,150,250);control.setEnabled(false);control.setZoom(1.5);control.turn(1);assert.equal(lastIndex,1);assert.equal(host.root.style.transform,'scale(1.5)');
control.setZoom(1);control.setEnabled(true);control.turn(1);assert.equal(lastIndex,2);control.turn(1);assert.equal(lastIndex,2);
reduced=true;control.turn(-1);assert.equal(lastIndex,1);
control.destroy();const count=instances.length;pointer('pointerdown',1,310,250);pointer('pointermove',1,220,248);assert.equal(instances.length,count);assert.equal(destroyed,2);
console.log('PASS boundaries, multitouch cancellation without page advance, zoom navigation lock, scale, reduced motion, listener teardown');
