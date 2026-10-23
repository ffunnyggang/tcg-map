import{test}from'node:test';import assert from'node:assert/strict';import{anchorQuality}from'../card-overlay-quality.mjs';
function pixels(shift=0,offset=0){const a=new Uint8ClampedArray(64*48*4);for(let y=0;y<48;y++)for(let x=0;x<64;x++){const sx=(x+shift)%64,v=(sx*23+y*41+sx*y*7)%256,i=(y*64+x)*4;a.set([v+offset,(v*3)%256+offset,(v*7)%256+offset,255],i);}return a;}
test('preserved source artwork passes',()=>assert.equal(anchorQuality(pixels(),pixels()).accepted,true));
test('small compression and color changes pass',()=>assert.equal(anchorQuality(pixels(),pixels(0,5)).accepted,true));
test('relocated artwork is rejected rather than covered up',()=>assert.equal(anchorQuality(pixels(),pixels(12)).accepted,false));
test('flat backgrounds cannot pass unrelated output on correlation alone',()=>assert.equal(anchorQuality(new Uint8ClampedArray(256).fill(50),new Uint8ClampedArray(256).fill(200)).accepted,false));
