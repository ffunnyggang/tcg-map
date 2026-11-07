export function createReviewPublisher(auth){
 let attempt=null;
 return {reset(){attempt=null;},async publish({image,title,body}){
  const session=await auth.getSession();if(!session?.user)throw Error('로그인 후 후기를 등록해 주세요.');
  if(!body.trim())throw Error('후기를 입력해 주세요.');
  if(!attempt||attempt.user!==session.user.id){const id=crypto.randomUUID();attempt={id,user:session.user.id,path:session.user.id+'/'+id+'/overlay-review.jpg',uploaded:false,title,body};}
  attempt.title=title;attempt.body=body;
  if(!attempt.uploaded){const blob=await new Promise(resolve=>image.toBlob(resolve,'image/jpeg',.94));if(!blob||blob.size>5*1024*1024)throw Error('첨부 이미지를 준비하지 못했어요.');const {error}=await auth.client.storage.from('community-posts').upload(attempt.path,blob,{contentType:'image/jpeg',upsert:true});if(error)throw Error('이미지 업로드에 실패했어요. 다시 시도해 주세요.');attempt.uploaded=true;}
  const {data,error}=await auth.client.rpc('publish_overlay_art_review',{p_id:attempt.id,p_title:attempt.title,p_body:attempt.body,p_path:attempt.path});
  if(error){if(error.message?.includes('POST_RATE_LIMIT_SHORT'))throw Error('게시물은 1분 간격으로 등록할 수 있어요.');if(error.message?.includes('POST_RATE_LIMIT_HOURLY'))throw Error('시간당 최대 5개의 게시물을 등록할 수 있어요.');throw Error(error.message||'후기 등록에 실패했어요. 다시 시도해 주세요.');}
  return data;
 }};
}
