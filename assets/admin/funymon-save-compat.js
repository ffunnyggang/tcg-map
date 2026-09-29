(()=>{
'use strict';
/*
 * FUNY MON event editor compatibility bridge.
 * The history module owns a legacy capture-phase validator for #monEventSave.
 * When the target-aware editor is present, let the newer target module own
 * the save flow so schedule targets are not rejected by the old shop-only path.
 */
window.addEventListener('click',e=>{
  const btn=e.target?.closest?.('#monEventSave');
  if(!btn||!document.getElementById('monTargetType'))return;
  btn.dataset.fmhBypass='1';
  setTimeout(()=>{try{delete btn.dataset.fmhBypass}catch(_){btn.removeAttribute('data-fmh-bypass')}},0);
},true);
})();