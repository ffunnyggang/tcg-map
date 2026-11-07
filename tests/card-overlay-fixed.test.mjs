import {test} from 'node:test';
import assert from 'node:assert/strict';
import {restorePixels,fixedBounds} from '../card-overlay-fixed.mjs';
test('protected pixels exactly match source while editable pixels keep generated output',()=>{const source=new Uint8ClampedArray([10,20,30,255,40,50,60,255]);const generated=new Uint8ClampedArray([90,80,70,255,60,50,40,255]);const mask=new Uint8ClampedArray([0,0,0,255,0,0,0,0]);assert.deepEqual([...restorePixels(source,generated,mask)],[10,20,30,255,60,50,40,255]);assert.equal(generated[0],90);});
test('fixed art bounds use full card scale and cover fractional edges',()=>assert.deepEqual(fixedBounds({x:5.1,y:9.2,w:52.8,h:32},1008,1408),{x:81,y:147,w:846,h:513}));
test('mismatched image arrays cannot silently produce corrupted output',()=>assert.throws(()=>restorePixels(new Uint8ClampedArray(4),new Uint8ClampedArray(8),new Uint8ClampedArray(4))));
