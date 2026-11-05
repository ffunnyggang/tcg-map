/* Stable product images and keyed lists: keep decoded images during metadata updates. */
(()=>{'use strict';
function prepare(img,{priority=false}={}){
 img.decoding='async';img.loading=priority?'eager':'lazy';if(priority)img.fetchPriority='high';
 img.classList.add('product-image-pending');
 const reveal=()=>{if(!img.naturalWidth)return;img.classList.remove('product-image-pending');img.classList.add('product-image-ready')};
 const loaded=()=>{if(typeof img.decode==='function')img.decode().then(reveal,reveal);else reveal()};
 img.addEventListener('load',loaded,{once:true});img.addEventListener('error',()=>img.classList.remove('product-image-pending'),{once:true});
 if(img.complete&&img.naturalWidth)reveal();return img;
}
function reconcile(parent,nodes){
 const keep=new Set(nodes);for(const child of [...parent.children])if(!keep.has(child))child.remove();
 let cursor=parent.firstElementChild;for(const child of nodes){if(child===cursor)cursor=cursor.nextElementSibling;else parent.insertBefore(child,cursor)}
}
let sequence=0;const requests=new WeakMap();
function swap(container,img){
 const token=++sequence;requests.set(container,token);prepare(img,{priority:true});
 const commit=()=>{if(requests.get(container)!==token)return;container.replaceChildren(img)};
 const loaded=()=>{if(typeof img.decode==='function')img.decode().then(commit,commit);else commit()};
 img.addEventListener('load',loaded,{once:true});img.addEventListener('error',()=>{if(requests.get(container)===token&&!container.querySelector('img'))container.textContent='이미지를 불러올 수 없습니다.'},{once:true});
 if(img.complete&&img.naturalWidth)commit();else if(!container.querySelector('img'))container.replaceChildren(img);
}
window.FUNY_PRODUCT_IMAGES={prepare,reconcile,swap};
})();
