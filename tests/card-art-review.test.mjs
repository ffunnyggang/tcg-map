import {test} from 'node:test';import assert from 'node:assert/strict';import {createReviewPublisher} from '../card-art-review.mjs';
test('review uploads only on explicit publish and retries the same post id after an ambiguous response',async()=>{
 let uploads=0,calls=[];const auth={getSession:async()=>({user:{id:'user'}}),client:{storage:{from:()=>({upload:async()=>{uploads++;return {};}})},rpc:async(name,args)=>{calls.push({name,args});return calls.length===1?{error:{message:'network'}}:{data:args.p_id};}}};
 const publisher=createReviewPublisher(auth),image={toBlob:cb=>cb(new Blob(['image']))};assert.equal(uploads,0);
 await assert.rejects(publisher.publish({image,title:'후기',body:'좋아요'}));await publisher.publish({image,title:'후기',body:'좋아요'});
 assert.equal(uploads,1);assert.equal(calls[0].args.p_id,calls[1].args.p_id);assert.equal(calls[0].name,'publish_overlay_art_review');assert.match(calls[0].args.p_path,/^user\/.*\/overlay-review.jpg$/);
});
test('review refuses logged-out and empty submissions before uploading',async()=>{
 const publisher=createReviewPublisher({getSession:async()=>null});await assert.rejects(publisher.publish({body:'후기'}),/로그인/);
 const logged=createReviewPublisher({getSession:async()=>({user:{id:'user'}})});await assert.rejects(logged.publish({body:' '}),/후기를 입력/);
});
