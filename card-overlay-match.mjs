// Compare only the illustration crop; names, language and card text are unused.
export function artDescriptor(image,r){
 const c=document.createElement('canvas');c.width=8;c.height=8;const g=c.getContext('2d');
 // Exclude a small frame margin from the descriptor.
 const margin=.025;g.drawImage(image,(r.x+r.w*margin)/63*image.width,(r.y+r.h*margin)/88*image.height,r.w*(1-2*margin)/63*image.width,r.h*(1-2*margin)/88*image.height,0,0,8,8);
 const p=g.getImageData(0,0,8,8).data;return Array.from({length:192},(_,i)=>p[Math.floor(i/3)*4+i%3]);
}
export function rankArtwork(descriptor,references){
 const normalize=a=>{const mean=a.reduce((s,v)=>s+v,0)/a.length,centered=a.map(v=>v-mean),norm=Math.hypot(...centered);return norm>1?centered.map(v=>v/norm):null;};
 const a=normalize(descriptor);if(!a)return [];
 return references.map(ref=>{const b=Array.isArray(ref.descriptor)&&ref.descriptor.length===192?normalize(ref.descriptor):null;return{...ref,score:b?a.reduce((s,v,i)=>s+v*b[i],0):-1};}).sort((a,b)=>b.score-a.score).slice(0,5);
}
