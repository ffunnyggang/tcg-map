(()=>{
  const KEY='pick_schedule', LABEL='PICK · 스케줄';
  const ORDER=['home','pick_information','pick_schedule','pick_creator','pick_review'];
  const LABELS={home:'HOME',pick_information:'PICK · 일정',pick_schedule:'PICK · 스케줄',pick_creator:'PICK · CREATOR',pick_review:'PICK · 깽퐌커플 리뷰'};
  let patching=false;
  function patchPlacements(){
    if(patching)return;
    patching=true;
    try{
      try{
        if(window.CMS_PLACEMENTS){
          ORDER.forEach(k=>{if(k===KEY||window.CMS_PLACEMENTS[k])window.CMS_PLACEMENTS[k]=LABELS[k]});
        }
      }catch(_){}
      document.querySelectorAll('select').forEach(sel=>{
        const options=[...sel.options];
        if(!options.some(o=>ORDER.includes(o.value)))return;
        const selected=sel.value;
        const byValue=new Map(options.map(o=>[o.value,o]));
        let changed=false;
        if(!byValue.has(KEY)){
          const o=document.createElement('option');o.value=KEY;o.textContent=LABEL;byValue.set(KEY,o);changed=true;
        }
        ORDER.forEach(k=>{
          const o=byValue.get(k);
          if(o&&o.textContent!==LABELS[k]){o.textContent=LABELS[k];changed=true;}
        });
        const current=[...sel.options].filter(o=>ORDER.includes(o.value)).map(o=>o.value);
        if(current.join('|')!==ORDER.filter(k=>byValue.has(k)).join('|'))changed=true;
        if(changed){
          ORDER.forEach(k=>{const o=byValue.get(k);if(o)sel.appendChild(o)});
          if(ORDER.includes(selected))sel.value=selected;
        }
      });
    }finally{patching=false;}
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',patchPlacements):patchPlacements();
  let queued=false;
  new MutationObserver(()=>{
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;patchPlacements()});
  }).observe(document.documentElement,{childList:true,subtree:true});
})();