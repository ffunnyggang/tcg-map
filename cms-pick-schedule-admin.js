(()=>{
  const KEY='pick_schedule', LABEL='PICK · 스케줄';
  const ORDER=['home','pick_information','pick_schedule','pick_creator','pick_review'];
  const LABELS={home:'HOME',pick_information:'PICK · 일정',pick_schedule:'PICK · 스케줄',pick_creator:'PICK · CREATOR',pick_review:'PICK · 깽퐌커플 리뷰'};
  function patchPlacements(){
    try{
      if(window.CMS_PLACEMENTS){
        ORDER.forEach(k=>{if(k===KEY||window.CMS_PLACEMENTS[k])window.CMS_PLACEMENTS[k]=LABELS[k]});
      }
    }catch(_){}
    document.querySelectorAll('select').forEach(sel=>{
      const existing=[...sel.options];
      const hasCms=existing.some(o=>ORDER.includes(o.value));
      if(!hasCms)return;
      const selected=sel.value;
      const byValue=new Map(existing.map(o=>[o.value,o]));
      if(!byValue.has(KEY)){
        const o=document.createElement('option');o.value=KEY;byValue.set(KEY,o);
      }
      ORDER.forEach(k=>{
        const o=byValue.get(k);
        if(!o)return;
        o.textContent=LABELS[k];
        sel.appendChild(o);
      });
      if(ORDER.includes(selected))sel.value=selected;
    });
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',patchPlacements):patchPlacements();
  new MutationObserver(patchPlacements).observe(document.documentElement,{childList:true,subtree:true});
})();