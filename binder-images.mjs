// Keep authenticated downloads private; only their in-memory display source changes.
export function usesIOSImageSource(){
 return /iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
}
function asDataURL(blob){
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=()=>resolve(reader.result);
  reader.onerror=()=>reject(reader.error||Error('IMAGE_READ_FAILED'));
  reader.onabort=()=>reject(Error('IMAGE_READ_ABORTED'));
  reader.readAsDataURL(blob);
 });
}
function decodeSource(src){
 return new Promise((resolve,reject)=>{
  const image=new Image();
  const timer=setTimeout(()=>done(Error('IMAGE_DECODE_TIMEOUT')),15000);
  function done(error){clearTimeout(timer);image.onload=image.onerror=null;error?reject(error):resolve(src);}
  image.onload=()=>image.naturalWidth?done():done(Error('IMAGE_EMPTY'));
  image.onerror=()=>done(Error('IMAGE_DECODE_FAILED'));
  image.src=src;
 });
}
export async function imageSource(blob){
 if(!(blob instanceof Blob)||!blob.size)throw Error('IMAGE_EMPTY');
 // WKWebView blob URLs can fail to decode despite a successful authenticated GET.
 // Use a document-owned data URL on iOS, without exposing a public or signed URL.
 if(usesIOSImageSource())return decodeSource(await asDataURL(blob));
 let url;
 try{
  url=URL.createObjectURL(blob);
  return await decodeSource(url);
 }catch(error){
  if(url)URL.revokeObjectURL(url);
  return decodeSource(await asDataURL(blob));
 }
}
