import{test}from'node:test';import assert from'node:assert/strict';import{anchorQuality}from'../card-overlay-quality.mjs';
function pixels(shift=0,offset=0){const a=new Uint8ClampedArray(64*48*4);for(let y=0;y<48;y++)for(let x=0;x<64;x++){const sx=(x+shift)%64,v=(sx*23+y*41+sx*y*7)%256,i=(y*64+x)*4;a.set([v+offset,(v*3)%256+offset,(v*7)%256+offset,255],i);}return a;}
test('preserved source artwork passes',()=>assert.equal(anchorQuality(pixels(),pixels()).accepted,true));
test('small compression and color changes pass',()=>assert.equal(anchorQuality(pixels(),pixels(0,5)).accepted,true));
test('relocated artwork is rejected rather than covered up',()=>assert.equal(anchorQuality(pixels(),pixels(12)).accepted,false));
test('flat backgrounds cannot pass unrelated output on correlation alone',()=>assert.equal(anchorQuality(new Uint8ClampedArray(256).fill(50),new Uint8ClampedArray(256).fill(200)).accepted,false));

import{findAlignment}from'../card-overlay-quality.mjs';
function fixture(scale=1,dx=0,dy=0){const width=160,height=220,r={x:18,y:35,w:124,h:78},cx=r.x+r.w/2,cy=r.y+r.h/2,data=new Uint8ClampedArray(width*height*4);function color(x,y){return[125+60*Math.sin(x*.25)+45*Math.cos(y*.27),120+55*Math.sin(y*.3)+40*Math.cos(x*.21),110+50*Math.sin((x+y)*.18)];}for(let y=0;y<height;y++)for(let x=0;x<width;x++){const v=color(cx+(x-cx-dx)/scale,cy+(y-cy-dy)/scale);data.set([...v,255],(y*width+x)*4);}return{width,height,data,r};}
test('small translation is recovered conservatively',()=>{const a=fixture(),b=fixture(1,2,-2),m=findAlignment(a,b,a.r);assert.ok(m);assert.equal(m.dx,2);assert.equal(m.dy,-2);assert.ok(m.correlation>.99);});
test('uniform scaling and translation are recovered',()=>{const a=fixture(),b=fixture(.96,2,1),m=findAlignment(a,b,a.r);assert.ok(m);assert.ok(Math.abs(m.scale-.96)<.01);assert.equal(m.dx,2);assert.equal(m.dy,1);});
test('unchanged output needs no alignment',()=>{const a=fixture();assert.equal(findAlignment(a,a,a.r),null);});
test('flat anchor cannot trigger alignment',()=>{const a=fixture();a.data.fill(130);assert.equal(findAlignment(a,fixture(1,2,2),a.r),null);});
test('large movement and mismatched dimensions are not repaired',()=>{const a=fixture();assert.equal(findAlignment(a,fixture(1,24,18),a.r),null);assert.equal(findAlignment(a,{...a,width:80},a.r),null);});
