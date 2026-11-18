import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {withProductionCardBleed} from '../card-overlay-print.mjs';
const require=createRequire(import.meta.url);
let createCanvas;
try {({createCanvas}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas'));}catch{}
test('real pixels continue across bleed; border is exactly 2.5mm on 64x88 trim with 2mm outer bleed', {skip:!createCanvas},()=>{
 const art=createCanvas(1648,2048),a=art.getContext('2d');
 const gr=a.createLinearGradient(0,0,1648,0);gr.addColorStop(0,'red');gr.addColorStop(1,'blue');a.fillStyle=gr;a.fillRect(0,0,1648,2048);
 const clean=createCanvas(1008,1408);clean.getContext('2d').drawImage(art,320,80,1008,1408,0,0,1008,1408);
 const border=createCanvas(1008,1408);border.getContext('2d').fillStyle='lime';border.getContext('2d').fillRect(0,0,1008,1408);
 border.naturalWidth=border.width;
 const px=(c,x,y)=>[...c.getContext('2d').getImageData(x,y,1,1).data];
 for(const shape of ['square','round']){
 const out=withProductionCardBleed(createCanvas(1008,1408),createCanvas,{artwork:art,matrix:[1,0,0,1,-320,-80],foil:{atlas:border,index:0},shape});
 assert.deepEqual([out.width,out.height],[1088,1472]);
 assert.deepEqual(px(out,4,400),[0,255,0,255]);
 assert.deepEqual(px(out,1067,400),[0,255,0,255]);
 assert.deepEqual(px(out,32,700),[0,255,0,255]);
 assert.deepEqual(px(out,71,700),[0,255,0,255]);
 assert.notDeepEqual(px(out,73,700),[0,255,0,255]);
 assert.deepEqual(px(out,500,700),px(clean,460,668));
 }
});

test('legacy bleed synthesizes just the new 8 pixels on each side',()=>{
 let strips=0;
 const context={
  setTransform(){},resetTransform(){},drawImage(){},
  getImageData(x,y,width,height){
   const data=new Uint8ClampedArray(width*height*4);
   for(let row=0;row<height;row++)for(let col=0;col<width;col++){
    const i=4*(row*width+col), local=x?width-1-col:col;
    if(local>=8)data.set([local%4*60,100,70,255],i);
   }
   return {data,height,width};
  },
  putImageData({data,width},x){
   strips++;
   for(let col=0;col<width;col++){
    const local=x?width-1-col:col;
    assert.deepEqual([...data.slice(col*4,col*4+4)],[local%4*60,100,70,255]);
   }
  }
 };
 const canvas=(width,height)=>({width,height,getContext:()=>context});
 const out=withProductionCardBleed({},canvas,{artwork:{width:1072,height:1472},matrix:[1,0,0,1,-32,-32]});
 assert.equal(strips,2);assert.deepEqual([out.width,out.height],[1088,1472]);
});
