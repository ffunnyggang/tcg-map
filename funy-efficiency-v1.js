/* Small, optional optimizations. No auth, reward or account data is persisted. */
(function(){
 'use strict';if(window.FUNY_EFFICIENCY)return;
 async function imageVariant(file,maxEdge=1920,quality=.88){
  if(!file||!/^image\/(jpeg|png)$/.test(file.type))return null;
  const url=URL.createObjectURL(file),image=new Image();
  try{
   image.src=url;await image.decode();const w=image.naturalWidth,h=image.naturalHeight;
   if(!w||!h||w*h>40000000)return null;
   const ratio=Math.min(1,maxEdge/Math.max(w,h)),canvas=document.createElement('canvas');
   canvas.width=Math.max(1,Math.round(w*ratio));canvas.height=Math.max(1,Math.round(h*ratio));
   canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',quality));
   return blob?.type==='image/webp'&&blob.size<file.size?blob:null;
  }catch(_){return null;}finally{URL.revokeObjectURL(url);}
 }
 const privateImages=new Map();let account='',generation=0;
 function clearPrivate(){generation++;privateImages.clear();account='';}
 function privateImage(client,user,path){
  if(!user)return Promise.reject(Error('LOGIN_REQUIRED'));
  if(account!==user){clearPrivate();account=user;}
  const now=Date.now(),old=privateImages.get(path);
  if(old&&now-old.at<30000)return old.promise;
  const epoch=generation,entry={at:now,promise:null,size:0};
  entry.promise=client.storage.from('binders').download(path).then(result=>{
   if(result.error)throw result.error;
   if(epoch!==generation)throw Error('ACCOUNT_CHANGED');entry.size=result.data.size;
   let total=[...privateImages.values()].reduce((sum,x)=>sum+x.size,0);
   for(const [key,item] of privateImages){if(privateImages.size<=24&&total<=20*1024*1024)break;if(key!==path){privateImages.delete(key);total-=item.size;}}
   return result.data;
  }).catch(error=>{if(privateImages.get(path)===entry)privateImages.delete(path);throw error;});
  privateImages.set(path,entry);return entry.promise;
 }
 const pending=new Map(),publicData=new Map(),CMS_KEY='funy-cms-revision-v1';let cacheGeneration=0;
 function clearPublic(){cacheGeneration++;publicData.clear();}
 function invalidateCms(){clearPublic();try{localStorage.setItem(CMS_KEY,Date.now()+':'+Math.random());}catch(_){}window.dispatchEvent(new Event('funy:cms-invalidated'));}
 function cmsGet(path,loader){
  // Only public CMS/configuration queries; never cache user-specific endpoints.
  if(!/^\/rest\/v1\/(cms_blocks|cms_block_items|cms_contents|shops|shop_images)\?/.test(path))return loader();
  const old=publicData.get(path);const copy=value=>JSON.parse(JSON.stringify(value));if(old&&Date.now()-old.at<30000)return Promise.resolve(copy(old.data));
  const key=cacheGeneration+':'+path;if(pending.has(key))return pending.get(key).then(copy);
  const epoch=cacheGeneration,promise=Promise.resolve().then(loader).then(data=>{if(epoch===cacheGeneration){publicData.set(path,{at:Date.now(),data});if(publicData.size>40)publicData.delete(publicData.keys().next().value);}return data;}).finally(()=>pending.delete(key));
  pending.set(key,promise);return promise.then(copy);
 }
 const visibleJobs=new Map();let visibleObserver=null;
 function lazy(target,load){
  if(!window.IntersectionObserver){load();return;}
  if(!visibleObserver)visibleObserver=new IntersectionObserver(entries=>{for(const entry of entries){if(!entry.isIntersecting)continue;const job=visibleJobs.get(entry.target);visibleJobs.delete(entry.target);visibleObserver.unobserve(entry.target);job?.();}},{rootMargin:'250px'});
  for(const element of visibleJobs.keys())if(!element.isConnected){visibleObserver.unobserve(element);visibleJobs.delete(element);}
  visibleJobs.set(target,load);visibleObserver.observe(target);
 }
 window.addEventListener('pagehide',()=>{visibleObserver?.disconnect();visibleJobs.clear();});
 document.addEventListener('error',event=>{const img=event.target;if(img?.tagName==='IMG'&&img.dataset.originalSrc){const original=img.dataset.originalSrc;delete img.dataset.originalSrc;img.src=original;}},true);
 window.addEventListener('pagehide',()=>{clearPrivate();clearPublic();});
 window.addEventListener('funy:web-auth-change',clearPrivate);
 window.addEventListener('funy:auth-ready',clearPrivate);
 window.addEventListener('storage',event=>{if(event.key===CMS_KEY){clearPublic();window.dispatchEvent(new Event('funy:cms-invalidated'));}});
 window.FUNY_EFFICIENCY={imageVariant,privateImage,clearPrivate,cmsGet,invalidateCms,clearPublic,lazy};
})();
