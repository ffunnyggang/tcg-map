const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
function runtime(){let now=100000,visible;const events={},docEvents={},revoked=[];const window={addEventListener:(n,fn)=>events[n]=fn,dispatchEvent:e=>events[e.type]?.(e),IntersectionObserver:true};const c={window,document:{addEventListener:(n,fn)=>docEvents[n]=fn,createElement:()=>({getContext:()=>({drawImage(){}}),toBlob:fn=>fn({type:'image/webp',size:100})})},Image:class{constructor(){this.naturalWidth=4000;this.naturalHeight=3000}async decode(){}},IntersectionObserver:class{constructor(fn){visible=fn}observe(){}unobserve(){}disconnect(){}},URL:{createObjectURL:()=> 'blob:1',revokeObjectURL:u=>revoked.push(u)},localStorage:{setItem(){}},Date:{now:()=>now},Event:class{constructor(type){this.type=type}},Map,Promise,Error,JSON,Math};vm.createContext(c);vm.runInContext(fs.readFileSync(ROOT+'/funy-efficiency-v1.js','utf8'),c);return {api:window.FUNY_EFFICIENCY,tick:n=>now+=n,events,docEvents,revoked,visible:entries=>visible(entries)};}
(async()=>{
 const {api,tick,events,docEvents,visible,revoked}=runtime();let calls=0;
 const loader=async()=>{calls++;return [{title:'original'}]};
 const [a,b]=await Promise.all([api.cmsGet('/rest/v1/cms_contents?select=*',loader),api.cmsGet('/rest/v1/cms_contents?select=*',loader)]);assert.equal(calls,1);a[0].title='mutated';assert.equal(b[0].title,'original');assert.equal((await api.cmsGet('/rest/v1/cms_contents?select=*',loader))[0].title,'original');
 tick(30001);await api.cmsGet('/rest/v1/cms_contents?select=*',loader);assert.equal(calls,2);api.invalidateCms();await api.cmsGet('/rest/v1/cms_contents?select=*',loader);assert.equal(calls,3);
 await api.cmsGet('/auth/v1/user',loader);await api.cmsGet('/auth/v1/user',loader);assert.equal(calls,5);
 let downloads=0,fail=false;const client={storage:{from:()=>({download:async()=>{downloads++;return fail?{error:Error('private denied')}:{data:{size:20}}}})}};
 await Promise.all([api.privateImage(client,'user-a','private/photo'),api.privateImage(client,'user-a','private/photo')]);assert.equal(downloads,1);
 await api.privateImage(client,'user-b','private/photo');assert.equal(downloads,2);events['funy:web-auth-change']();await api.privateImage(client,'user-b','private/photo');assert.equal(downloads,3);tick(30001);await api.privateImage(client,'user-b','private/photo');assert.equal(downloads,4);
 fail=true;await assert.rejects(api.privateImage(client,'user-b','missing'));fail=false;await api.privateImage(client,'user-b','missing');assert.equal(downloads,6);
 let loaded=0;const target={isConnected:true};api.lazy(target,()=>loaded++);assert.equal(loaded,0);visible([{target,isIntersecting:true}]);assert.equal(loaded,1);
 assert.equal(await api.imageVariant({type:'image/gif',size:10000}),null);assert.equal(await api.imageVariant({type:'image/webp',size:10000}),null);assert.equal(await api.imageVariant({type:'image/jpeg',size:50}),null);assert.equal((await api.imageVariant({type:'image/jpeg',size:10000})).type,'image/webp');assert.equal(revoked.length,2);
 const img={tagName:'IMG',dataset:{originalSrc:'original.jpg'},src:'missing-thumb.webp'};docEvents.error({target:img});assert.equal(img.src,'original.jpg');assert(!img.dataset.originalSrc);
 console.log('PASS public-only cache, in-flight dedup, immutable results, expiry/invalidation; private account isolation and retry; visible-only images; safe variants and original fallback');
})().catch(e=>{console.error(e);process.exit(1)});
