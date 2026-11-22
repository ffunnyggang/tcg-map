// Billing is authorized and finalized by the generation backend, never by client balances.
export function createArtCoinUI({invoke,onStart,onNavigate,onError,text=s=>s}){
 const $=id=>document.getElementById(id);let quote=null,selected=null,loading=false;
 const dialog=$('coinUseDialog');
 function sync(q){quote=q;if(!q)return;if(q.admin)$('artCoinSummary').hidden=true;document.querySelectorAll('[data-coin-guide]').forEach(e=>e.hidden=!!q.admin);$('artCoinBalance').textContent=Number(q.available??q.balance??0).toLocaleString()+'코인 보유';}
 async function refresh(){const r=await invoke({action:'billing_status'});sync(r.billing);return quote;}
 function render(){
  const cost=quote.cost,available=quote.available??quote.balance,low=available<cost;
  $('coinUseTitle').textContent=text(quote.firstFree?'첫 확장아트를 무료로 만들어 보세요':'퍼니코인 사용');
  $('coinUseCard').textContent=selected?.label||'';
  $('coinUseBalance').textContent=available.toLocaleString()+'코인';
  $('coinUseAmount').textContent=cost?'−'+cost+'코인':text('0코인');
  $('coinUseAfter').textContent=(available-cost).toLocaleString()+'코인';
  $('coinUseAfterRow').hidden=low;
  $('coinUseMissing').hidden=!low;$('coinUseMissing').textContent=(cost-available)+text('코인이 더 필요해요.');
  $('coinUseNote').textContent=text(low?'미션에 참여하면 퍼니코인을 받을 수 있어요.':quote.firstFree?'첫 생성에 성공하면 무료 혜택이 사용돼요. 다음 생성부터 10코인이 사용돼요.':'이미지·PDF 다운로드는 추가 차감이 없어요. 시스템 오류로 생성에 실패하면 코인은 차감되지 않아요.');
  $('coinUseConfirm').textContent=text(low?'미션 확인하기':quote.firstFree?'무료로 생성하기':'10코인 사용하고 생성하기');
  $('coinUseConfirm').disabled=loading;
 }
 async function open(selection){
  if(loading||dialog.open)return;loading=true;selected=selection;
  try{await refresh();if(quote.admin){await onStart(null);return;}render();dialog.showModal();}
  catch(e){onError(e);}finally{loading=false;if(dialog.open)render();}
 }
 $('coinUseClose').onclick=()=>{if(!loading)dialog.close();};
 dialog.addEventListener('click',e=>{if(!loading&&e.target===dialog){const b=dialog.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)dialog.close();}});
 dialog.addEventListener('cancel',e=>{if(loading)e.preventDefault();});
 $('artCoinSummary').onclick=()=>onNavigate('/my-funy-coin.html?from=card-art');
 $('coinUseConfirm').onclick=async()=>{
  if(loading||!quote||!selected)return;
  if((quote.available??quote.balance)<quote.cost){dialog.close();onNavigate('/my.html');return;}
  loading=true;render();
  try{
   const id=crypto.randomUUID();
   const r=await invoke({action:'billing_start',billingId:id,sourceReferenceId:selected.id});
   dialog.close();await onStart(r.billing.admin?null:id);
  }catch(e){if(e.data?.billing){sync({...quote,...e.data.billing,available:e.data.billing.balance});render();}onError(e);}
  finally{loading=false;if(dialog.open)render();}
 };
 return {open,refresh,sync,isAdmin:()=>quote?.admin===true};
}
