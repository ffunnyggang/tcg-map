'use strict';
(()=>{
 for(const section of document.querySelectorAll('[data-tool-share]')){
  const button=section.querySelector('button'),status=section.querySelector('[role="status"]'),manual=section.querySelector('input');
  const url=section.dataset.shareUrl,title=section.dataset.shareTitle,text=section.dataset.shareText;
  manual.value=url;
  button.addEventListener('click',async()=>{
   if(button.disabled)return;button.disabled=true;status.textContent='';manual.hidden=true;
   try{
    if(typeof navigator.share==='function'){
     try{await navigator.share({title,text,url});status.textContent='공유창 처리를 마쳤어요.';return;}
     catch(error){if(error?.name==='AbortError'){status.textContent='공유를 취소했어요.';return;}}
    }
    try{await navigator.clipboard.writeText(url);status.textContent='링크를 복사했어요. 원하는 앱에 붙여넣어주세요.';}
    catch{manual.hidden=false;manual.focus();manual.select();status.textContent='아래 링크를 길게 눌러 복사해주세요.';}
   }finally{button.disabled=false;}
  });
 }
})();
