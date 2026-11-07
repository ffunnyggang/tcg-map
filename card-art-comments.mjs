export function initArtComments(auth){
 const $=id=>document.getElementById(id);let offset=0,epoch=0,loading=false,posting=false,isDemo=false,user=null;
 const message=text=>$('commentStatus').textContent=text;
 async function load({demo=isDemo,more=false}={}){
  isDemo=demo;const ticket=++epoch;loading=true;$('commentsMore').disabled=true;
  if(!more){offset=0;$('commentList').replaceChildren();}
  try{
   user=demo?null:(await auth.getSession())?.user;
   $('commentForm').hidden=!user;$('commentsReload').hidden=demo;$('commentsMore').hidden=true;
   if(demo){message('화면 확인용 샘플에서는 댓글을 등록하지 않습니다.');return;}
   if(!user){message('댓글은 로그인 후 이용할 수 있습니다.');return;}
   message('댓글을 불러오고 있어요.');
   const {data,error}=await auth.client.from('overlay_art_comments').select('id,user_id,body,created_at,profiles(nickname)').order('created_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+19);
   if(ticket!==epoch)return;if(error)throw error;
   for(const row of data){const item=document.createElement('article'),head=document.createElement('header'),name=document.createElement('b'),date=document.createElement('time'),body=document.createElement('p');item.className='art-comment';name.textContent=row.profiles?.nickname||'수집가';date.dateTime=row.created_at;date.textContent=new Date(row.created_at).toLocaleDateString('ko-KR');body.textContent=row.body;head.append(name,date);item.append(head,body);
    if(row.user_id===user.id){const remove=document.createElement('button');remove.type='button';remove.textContent='삭제';remove.onclick=async()=>{if(!confirm('내 댓글을 삭제할까요?'))return;remove.disabled=true;try{const {error}=await auth.client.from('overlay_art_comments').delete().eq('id',row.id).eq('user_id',user.id);if(error)throw error;await load();}catch{message('댓글을 삭제하지 못했어요. 다시 시도해 주세요.');remove.disabled=false;}};item.append(remove);}
    $('commentList').append(item);
   }
   offset+=data.length;$('commentsMore').hidden=data.length<20;message(offset?'':'첫 후기를 남겨주세요.');
  }catch{if(ticket===epoch)message('댓글을 불러오지 못했어요. 새로고침해 주세요.');}finally{if(ticket===epoch){loading=false;$('commentsMore').disabled=false;}}
 }
 $('commentForm').onsubmit=async e=>{e.preventDefault();if(posting||isDemo)return;const body=$('commentBody').value.trim();if(!body)return;posting=true;$('commentSubmit').disabled=true;try{const session=await auth.getSession();if(!session?.user)throw Error('login');const {error}=await auth.client.from('overlay_art_comments').insert({user_id:session.user.id,body});if(error)throw error;$('commentBody').value='';await load();message('댓글을 등록했어요.');}catch{message('댓글 등록에 실패했어요. 로그인 상태를 확인한 뒤 다시 시도해 주세요.');}finally{posting=false;$('commentSubmit').disabled=false;}};
 $('commentsReload').onclick=()=>{if(!loading)load();};$('commentsMore').onclick=()=>{if(!loading)load({more:true});};
 return {load};
}
