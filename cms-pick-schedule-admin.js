(()=>{
  const KEY='pick_schedule';
  const LABEL='PICK · 스케줄';
  function patchPlacements(){
    try{
      if(window.CMS_PLACEMENTS && !window.CMS_PLACEMENTS[KEY]) window.CMS_PLACEMENTS[KEY]=LABEL;
    }catch(_){}
    document.querySelectorAll('select').forEach(sel=>{
      const options=[...sel.options];
      const hasCms=options.some(o=>['home','pick_information','pick_creator','pick_review'].includes(o.value));
      if(!hasCms || options.some(o=>o.value===KEY)) return;
      const opt=document.createElement('option');
      opt.value=KEY;
      opt.textContent=LABEL;
      const creator=options.find(o=>o.value==='pick_creator');
      if(creator) sel.insertBefore(opt,creator); else sel.appendChild(opt);
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',patchPlacements,{once:true});
  else patchPlacements();
})();