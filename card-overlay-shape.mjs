// Native card coordinates: 16px/mm, 63 × 88mm. Bleed is added only for printing.
export function cardOutline(image,shape,canvas){
 const out=canvas(1008,1408),g=out.getContext('2d');
 if(shape==='round'){g.beginPath();g.roundRect(0,0,1008,1408,48);g.clip();}
 g.drawImage(image,0,0,1008,1408);return out;
}
const borders=new WeakMap();
export function fittedBorder(image,shape,canvas){
 let cached=borders.get(image);if(!cached){cached={};borders.set(image,cached);}if(cached[shape])return cached[shape];
 const source=canvas(1008,1408),s=source.getContext('2d');s.drawImage(image,0,0,1008,1408);
 const out=canvas(1008,1408),g=out.getContext('2d'),radius=shape==='round'?48:0,edge=40;
 // Define the perimeter geometrically, independent of transparent padding in the asset.
 g.beginPath();g.roundRect(0,0,1008,1408,radius);g.roundRect(edge,edge,1008-2*edge,1408-2*edge,Math.max(0,radius-edge));g.clip('evenodd');
 const grad=g.createLinearGradient(0,0,1008,1408);
 for(const [stop,x,y]of[[0,100,20],[.33,900,20],[.66,988,900],[1,100,1388]]){const p=s.getImageData(x,y,1,1).data;grad.addColorStop(stop,`rgb(${p[0]},${p[1]},${p[2]})`);}
 g.fillStyle=grad;g.fillRect(0,0,1008,1408);g.drawImage(source,0,0);
 if(shape!=='round'){
  // Replace rounded corner artwork with straight edge texture; no rounded line remains.
  for(const x of[0,960]){g.drawImage(source,x===0?48:912,8,48,24,x,0,48,48);g.drawImage(source,x===0?48:912,1376,48,24,x,1360,48,48);}
 }
 cached[shape]=out;return out;
}
