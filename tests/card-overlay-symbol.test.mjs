import{test}from'node:test';import assert from'node:assert/strict';import{compositeSharedSymbol,findAnniversarySymbolCenter,anniversarySymbolPlacement,usesCenteredAnniversarySymbol}from'../card-overlay-symbol.mjs';
test('shared symbol preserves saved position and size on full-card results',()=>{let args;const result={width:1008,height:1408,getContext:()=>({drawImage:(...v)=>args=v})},image={};assert.equal(compositeSharedSymbol(result,image,{x:750/1008,y:524/1408,w:248/1008,h:190/1408}),result);assert.deepEqual(args,[image,750,524,248,190]);});
test('invalid shared symbol placement cannot be composited',()=>{for(const p of[null,{}, {x:0,y:0,w:-1,h:1},{x:1,y:0,w:1,h:1}])assert.throws(()=>compositeSharedSymbol({}, {},p));});

test('automatic height follows standard side and large central stamps, with safe fallback',()=>{
 const template=new Uint8ClampedArray(32*25*4);
 const fill=(x,y,w,h,rgb)=>{
  for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)template.set([...rgb,255],(j*32+i)*4);
 };
 fill(7,6,18,18,[245,204,5]);
 fill(2,1,5,5,[18,18,18]);fill(25,1,5,5,[18,18,18]);
 fill(9,14,3,4,[232,28,18]);fill(20,14,3,4,[232,28,18]);
 const canvas=()=>({getContext(){
  let data;
  return {drawImage(image){data=image;},getImageData(){return {data};}};
 }});
 const asset={image:template,placement:{x:.74,y:.37,w:61/252,h:48/352}};
 const left={...asset,placement:{...asset.placement,x:.02,y:.4}};
 const source=new Uint8ClampedArray(252*352*4);
 function paint(x,y,w,h){
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){
   const start=(Math.floor(j*25/h)*32+Math.floor(i*32/w))*4;
   const pixel=template.subarray(start,start+4);
   if(pixel[3])source.set(pixel,((y+j)*252+x+i)*4);
  }
 }
 assert.equal(findAnniversarySymbolCenter(source,asset,canvas),null);
 assert.equal(anniversarySymbolPlacement(asset,null),asset.placement);
 for(const [x,y,w,h] of [[4,142,61,48],[187,119,61,48],[56,183,140,110]]){
  source.fill(0);paint(x,y,w,h);
  const detected=findAnniversarySymbolCenter(source,asset,canvas);
  assert.ok(detected&&Math.abs(detected.y-(y+h/2)/352)<.012);
  assert.equal(anniversarySymbolPlacement(asset,detected).y,anniversarySymbolPlacement(left,detected).y);
  assert.equal(anniversarySymbolPlacement(left,detected).x,left.placement.x);
 }
 source.fill(0);paint(56,183,140,110);
 const placement=findAnniversarySymbolCenter(source,asset,canvas,{centerOnly:true});
 assert.ok(placement&&Math.abs(placement.x+placement.w/2-.5)<.02);
 assert.ok(Math.abs(placement.y-183/352)<.025&&placement.w>.5&&placement.h>.25);
 source.fill(0);paint(4,127,61,48);paint(187,158,61,48);
 assert.equal(findAnniversarySymbolCenter(source,asset,canvas,{centerOnly:true}),null);
 assert.equal(findAnniversarySymbolCenter(source,asset,canvas),null);
});


test('center placement is limited to the thirty anniversary Pikachu cards in each language',()=>{
 const catalogs=[
  {source_language:'ko',id:'m6a-ko-reference',display_name:'피카츄',first:17,last:46},
  {source_language:'ja',id:'m6a-ja-017',display_name:'ピカチュウ',first:17,last:46},
  {source_language:'en',id:'30th-en-023',display_name:'Pikachu',first:23,last:52}
 ];
 for(const card of catalogs){
  const number=n=>({...card,card_number:String(n).padStart(3,'0')});
  for(let n=card.first;n<=card.last;n++)assert.equal(usesCenteredAnniversarySymbol(number(n)),true);
  for(const n of [card.first-1,card.last+1,136])assert.equal(usesCenteredAnniversarySymbol(number(n)),false);
  assert.equal(usesCenteredAnniversarySymbol({...number(card.first),display_name:'Other'}),false);
  assert.equal(usesCenteredAnniversarySymbol({...number(card.first),id:'me55cc-en-001'}),false);
 }
});
