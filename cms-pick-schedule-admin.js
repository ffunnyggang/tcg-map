(()=>{
  const KEY='pick_schedule', LABEL='PICK 스케줄';
  function patchPlacements(){
    try{if(window.CMS_PLACEMENTS&&!window.CMS_PLACEMENTS[KEY])window.CMS_PLACEMENTS[KEY]=LABEL}catch(_){}
    document.querySelectorAll('select').forEach(sel=>{
      const hasCms=[...sel.options].some(o=>['home','pick_information','pick_creator','pick_review'].includes(o.value));
      if(!hasCms||[...sel.options].some(o=>o.value===KEY))return;
      const opt=document.createElement('option');opt.value=KEY;opt.textContent=LABEL;
      const info=[...sel.options].find(o=>o.value==='pick_information');
      if(info)sel.insertBefore(opt,info);else sel.appendChild(opt);
    });
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',patchPlacements):patchPlacements();
  new MutationObserver(patchPlacements).observe(document.documentElement,{childList:true,subtree:true});
})();