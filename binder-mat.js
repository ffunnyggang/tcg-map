// Shared photo mat: average each photo's darkest quartile with equal photo weight.
window.FUNY_BINDER_MAT={
 sample(img){
  try{
   const canvas=document.createElement('canvas');canvas.width=canvas.height=48;
   const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)return null;
   ctx.drawImage(img,0,0,48,48);
   const data=ctx.getImageData(0,0,48,48).data,pixels=[];
   for(let i=0;i<data.length;i+=4)if(data[i+3]>=128)pixels.push([data[i],data[i+1],data[i+2],.2126*data[i]+.7152*data[i+1]+.0722*data[i+2]]);
   pixels.sort((a,b)=>a[3]-b[3]);const dark=pixels.slice(0,Math.max(1,Math.ceil(pixels.length*.25)));
   return dark.length?[0,1,2].map(c=>dark.reduce((sum,p)=>sum+p[c],0)/dark.length):null;
  }catch(_){return null;}
 },
 average(colors){
  colors=colors.filter(Boolean);if(!colors.length)return null;
  return 'rgb('+[0,1,2].map(c=>Math.round(colors.reduce((sum,p)=>sum+p[c],0)/colors.length)).join(',')+')';
 }
};
