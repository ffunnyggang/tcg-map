import {test} from 'node:test';import assert from 'node:assert/strict';import {textAlpha,cutBounds,windowMask,composeLayers} from '../card-overlay-layers.mjs';
test('uniform panels do not become text and selected illustration is excluded',()=>{const w=126,h=176,p=new Uint8ClampedArray(w*h*4).fill(128),r={x:5,y:10,w:53,h:35};for(let y=20;y<90;y++)for(let x=10;x<116;x++)p[(y*w+x)*4]=0;const a=textAlpha(p,w,h,r);const b=cutBounds(r,w,h);for(let y=b.y;y<b.bottom;y++)for(let x=b.x;x<b.right;x++)assert.equal(a[y*w+x],0);assert.equal(a[150*w+60],0);assert.equal(a[0],0);});
test('local contrast finds a dark stroke without selecting flat panel',()=>{const w=126,h=176,p=new Uint8ClampedArray(w*h*4).fill(255);for(let y=110;y<120;y++)for(let x=60;x<62;x++)for(let c=0;c<3;c++)p[(y*w+x)*4+c]=0;const a=textAlpha(p,w,h,{x:5,y:10,w:53,h:35});assert.equal(a[115*w+60],255);assert.equal(a[150*w+80],0);});
test('generation mask locks only the user-selected window, not border or text',()=>{const calls=[],g={fillRect:(...args)=>calls.push(args)};windowMask({x:6,y:11,w:51,h:33},()=>({getContext:()=>g}));assert.deepEqual(calls,[[96,176,816,528]]);});
test('layer compositing keeps overlays fixed and each toggle is independent',()=>{const source={},background={},text={},border={};for(const showText of [false,true])for(const showBorder of [false,true]){const calls=[],canvas=()=>({getContext:()=>({drawImage:(...a)=>calls.push(a)})});composeLayers(source,background,{x:6,y:11,w:51,h:33},{text,border,showText,showBorder},canvas);assert.equal(calls[0][0],background);assert.equal(calls.some(a=>a[0]===text),showText);assert.equal(calls.some(a=>a[0]===border),showBorder);for(const a of calls.filter(a=>a[0]===text||a[0]===border))assert.deepEqual(a.slice(1),[0,0]);assert.deepEqual(calls.at(-1),[source,96,176,816,528,96,176,816,528]);}});

test('the centered stamp sits behind the original art and text, and side stamps retain their draw order',()=>{
 const source={},background={},text={},symbol={};
 const render=(symbolSide,showSymbol)=>{
  const drawn=[];
  const canvas=()=>({getContext:()=>({drawImage(image){drawn.push(image);}})});
  composeLayers(source,background,{x:5,y:10,w:50,h:30},{
   kind:'ai-text',text,symbol,symbolSide,showSymbol,showText:true,
   placement:{x:.2,y:.53,w:.6,h:.3}
  },canvas);
  return drawn;
 };
 assert.deepEqual(render('center',true),[background,symbol,source,text]);
 assert.deepEqual(render('center',false),[background,source,text]);
 assert.deepEqual(render('right',true),[background,source,text,symbol]);
});
