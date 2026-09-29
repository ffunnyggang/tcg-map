(()=>{
  const KEY='pick_schedule', LABEL='PICK · 스케줄';
  const VALUES=['home','pick_information','pick_schedule','pick_creator','pick_review'];
  function patchSelect(sel){
    if(!sel||sel.dataset.pickSchedulePatched==='1')return false;
    const options=[...sel.options];
    const hasCms=options.some(o=>['home','pick_information','pick_creator','pick_review'].includes(o.value));
    if(!hasCms)return false;
    if(!options.some(o=>o.value===KEY)){
      const opt=document.createElement('option');opt.value=KEY;opt.textContent=LABEL;
      const creator=[...sel.options].find(o=>o.value==='pick_creator');
      if(creator)sel.insertBefore(opt,creator);else sel.appendChild(opt);
    }
    const schedule=[...sel.options].find(o=>o.value===KEY);if(schedule)schedule.textContent=LABEL;
    sel.dataset.pickSchedulePatched='1';return true;
  }
  function patch(root=document){
    try{if(window.CMS_PLACEMENTS&&!window.CMS_PLACEMENTS[KEY])window.CMS_PLACEMENTS[KEY]=LABEL}catch(_){}
    root.querySelectorAll?.('select').forEach(patchSelect);
  }
  function boot(){
    patch();
    const adminRoot=document.querySelector('#cmsAdmin,#cmsPanel,.cms-admin,[data-admin-panel="cms"]')||document.body;
    const observer=new MutationObserver(muts=>{
      for(const m of muts)for(const n of m.addedNodes){
        if(n.nodeType!==1)continue;
        if(n.matches?.('select'))patchSelect(n);
        patch(n);
      }
    });
    observer.observe(adminRoot,{childList:true,subtree:true});
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();