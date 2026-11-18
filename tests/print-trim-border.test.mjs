import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {withProductionCardBleed} from '../card-overlay-print.mjs';
const require=createRequire(import.meta.url);
let createCanvas;
try {({createCanvas}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas'));}catch{}
test('real pixels continue across bleed; border is exactly 2.5mm on 64x89 trim', {skip:!createCanvas},()=>{
 const art=createCanvas(1648,2048),a=art.getContext('2d');
 const gr=a.createLinearGradient(0,0,1648,0);gr.addColorStop(0,'red');gr.addColorStop(1,'blue');a.fillStyle=gr;a.fillRect(0,0,1648,2048);
 const clean=createCanvas(1008,1408);clean.getContext('2d').drawImage(art,320,80,1008,1408,0,0,1008,1408);
 const border=createCanvas(1008,1408);border.getContext('2d').fillStyle='lime';border.getContext('2d').fillRect(0,0,1008,1408);
 const px=(c,x,y)=>[...c.getContext('2d').getImageData(x,y,1,1).data];
 for(const shape of ['square','round']){
 const out=withProductionCardBleed(clean,createCanvas,{artwork:art,matrix:[1,0,0,1,-320,-80],bleed:2.5,border,shape});
 assert.deepEqual([out.width,out.height],[1088,1488]);
 assert.deepEqual(px(out,4,400),px(art,284,440));
 assert.deepEqual(px(out,1083,400),px(art,1363,440));
 assert.deepEqual(px(out,32,700),[0,255,0,255]);
 assert.deepEqual(px(out,71,700),[0,255,0,255]);
 assert.notDeepEqual(px(out,73,700),[0,255,0,255]);
 assert.deepEqual(px(out,500,700),px(clean,460,660));
 }
});
