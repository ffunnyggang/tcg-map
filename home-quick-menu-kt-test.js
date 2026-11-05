(()=>{'use strict';
const KEY='funypin.home.quick-menu.test.kt.v1',OLD='funypin.home.quick-menu.test.blocks.v2',DEFAULT=['shops','favorite','box','pick'];
const icons={
home:'<path d="M3 10 12 3l9 7v10H3z"/><path d="M9 20v-7h6v7"/>',
shops:'<path d="M3 10 12 3l9 7v10H3z"/><path d="M9 20v-7h6v7"/><path d="M2 10h20"/>',
favorite:'<path d="M20.8 4.6a5.4 5.4 0 0 0-7.7 0L12 5.7l-1.1-1.1a5.4 5.4 0 0 0-7.7 7.7L12 21l8.8-8.7a5.4 5.4 0 0 0 0-7.7Z"/>',
box:'<path d="m3 7 9-4 9 4v10l-9 4-9-4z"/><path d="m3 7 9 4 9-4M12 11v10"/>',
pick:'<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 8h10M7 12h10M7 16h6"/>',
graded:'<circle cx="12" cy="8" r="5"/><path d="m9 13-2 8 5-3 5 3-2-8"/>',
talk:'<path d="M20 11a7 7 0 0 1-7 7H7l-4 3V10a7 7 0 0 1 7-7h3a7 7 0 0 1 7 8Z"/><path d="M8 10h8M8 13h5"/>',
my:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
events:'<rect x="3" y="9" width="18" height="12" rx="2"/><path d="M12 9v12M2 9h20M12 9C7 9 6 7 6 5c0-3 6-1 6 4Zm0 0c5 0 6-2 6-4 0-3-6-1-6 4Z"/>',
coupons:'<path d="M4 5h16v5a2 2 0 0 0 0 4v5H4v-5a2 2 0 0 0 0-4z"/><path d="M12 6v2m0 3v2m0 3v2"/>',
mon:'<rect x="5" y="4" width="14" height="17" rx="3"/><circle cx="12" cy="11" r="4"/><path d="M10 17h4"/>',
ranking:'<path d="M7 20h10M12 16v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v2c0 2 1 3 4 4M17 6h3v2c0 2-1 3-4 4"/>',
badges:'<path d="m12 2 3 2 4-1 1 4 3 3-3 3 1-4-3-3 3-3 1-4 4 1z"/><path d="m9 10 2 2 4-4"/>',
market:'<path d="M3 8h18l-2-5H5zM5 8v13h14V8M9 21v-8h6v8"/>',
raffle:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 11h10M12 8v6M8 18l4 3 4-3"/>'
};
const data=[
['shops','카드샵 찾기','/shops.html'],
['favorite','관심 목록','/my-favorites.html'],
['box','BOX 시세','/products.html?kind=box'],
['pick','PICK 콘텐츠','/pick.html'],
['graded','등급카드','/products.html?kind=graded'],
['talk','TALK','/talk.html'],
['events','이벤트','/my-events.html'],
['coupons','쿠폰함','/my-coupons.html'],
['mon','퍼니몬','/my-funymon.html'],
['ranking','랭킹','/ranking.html'],
['market','TCG 거래','/market.html'],
['raffle','추첨기','/event-raffle.html'],
['badges','배지','/my-badges.html'],
['my','MY','/my.html']
].map(([id,label,href])=>({id,label,href}));
const find=id=>data.find(x=>x.id===id),$=s=>document.querySelector(s);
const svg=id=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+(icons[id]||icons.box)+'</svg>';
function valid(x){return x&&Array.isArray(x.selected)&&x.selected.length<=10&&new Set(x.selected).size===x.selected.length&&x.selected.every(id=>find(id))}
function load(){
  try{const x=JSON.parse(localStorage.getItem(KEY));if(valid(x))return{selected:x.selected,visible:x.visible!==false,position:x.position==='after'?'after':'before'}}catch(_){}
  try{const x=JSON.parse(localStorage.getItem(OLD));if(x&&Array.isArray(x.active)&&x.active.every(id=>find(id)))return{selected:x.active,visible:x.visible!==false,position:x.placement==='bottom'?'after':'before'}}catch(_){}
  return{selected:[...DEFAULT],visible:true,position:'before'};
}
const copy=x=>({selected:[...x.selected],visible:x.visible,position:x.position});
let saved=load(),draft=copy(saved),beforeOpen=null,drag=null;
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),1700)}
function renderHome(){
 const section=$('#quickSection'),list=$('#quickItems');list.replaceChildren();
 if(saved.position==='after')$('#recommendSection').after(section);else $('#homeNotice').after(section);
 section.hidden=!saved.visible;
 for(const id of saved.selected){const item=find(id),a=document.createElement('a');a.href=item.href;a.className='quick-tile';a.dataset.funyLinkMode='inapp';a.dataset.funyInappPresentation='page';a.innerHTML='<span class="quick-glyph">'+svg(id)+'</span><strong>'+item.label+'</strong>';list.append(a)}
 const add=document.createElement('button');add.className='quick-tile add';add.type='button';add.setAttribute('aria-label','퀵메뉴 추가');add.textContent='+';add.addEventListener('click',openEditor);list.append(add);
}
function reorder(id,target){
 const from=draft.selected.indexOf(id),to=draft.selected.indexOf(target);
 if(from===-1||to===-1||from===to)return;
 draft.selected.splice(from,1);draft.selected.splice(to,0,id);renderEditor();
}
function renderEditor(){
 const grid=$('#menuGrid');grid.replaceChildren();
 for(const item of data){
  const isOn=draft.selected.includes(item.id),btn=document.createElement('button');btn.type='button';btn.className='menu-choice'+(isOn?' selected':'');btn.dataset.menuId=item.id;btn.setAttribute('aria-pressed',String(isOn));btn.setAttribute('aria-label',item.label+(isOn?' 선택됨':' 선택하기'));btn.innerHTML='<span>'+item.label+'</span><i class="indicator" aria-hidden="true">'+(isOn?'✓':'+')+'</i>';
  grid.append(btn);
 }
 const order=$('#selectedOrder');order.replaceChildren();
 for(const [i,id] of draft.selected.entries()){
  const item=find(id),chip=document.createElement('div');chip.className='order-chip';chip.dataset.chipId=id;
  const handle=document.createElement('button');handle.className='grip';handle.type='button';handle.dataset.drag=id;handle.textContent='⠿';handle.setAttribute('aria-label',item.label+' 드래그 정렬');chip.append(handle);
  const text=document.createElement('span');text.className='chip-label';text.textContent=item.label;chip.append(text);
  for(const step of [-1,1]){const btn=document.createElement('button');btn.className='move';btn.type='button';btn.dataset.move=id;btn.dataset.step=String(step);btn.disabled=i+step<0||i+step>=draft.selected.length;btn.textContent=step<0?'◀':'▶';btn.setAttribute('aria-label',item.label+(step<0?' 앞으로':' 뒤로')+' 이동');chip.append(btn)}
  order.append(chip);
 }
 if(!draft.selected.length)order.textContent='선택된 메뉴가 없습니다.';
 $('#selectionCount').textContent=draft.selected.length+' / 10개 선택';
 $('#clearAll').disabled=draft.selected.length===0;
 $('#sectionToggle').setAttribute('aria-checked',String(draft.visible));$('#sectionToggle').textContent=draft.visible?'ON':'OFF';
 $('#positionBefore').classList.toggle('active',draft.position==='before');$('#positionAfter').classList.toggle('active',draft.position==='after');
}
function openEditor(){beforeOpen=document.activeElement;draft=copy(saved);$('#scrim').classList.add('open');$('#scrim').setAttribute('aria-hidden','false');document.body.style.overflow='hidden';renderEditor();$('#closeEditor').focus()}
function closeEditor(){drag=null;$('#scrim').classList.remove('open');$('#scrim').setAttribute('aria-hidden','true');document.body.style.overflow='';beforeOpen?.focus()}
$('#openEditor').addEventListener('click',openEditor);$('#openHomeSettings').addEventListener('click',openEditor);$('#closeEditor').addEventListener('click',closeEditor);
$('#scrim').addEventListener('click',e=>{if(e.target===$('#scrim'))closeEditor()});
$('#menuGrid').addEventListener('click',e=>{
 const btn=e.target.closest('[data-menu-id]');if(!btn)return;const id=btn.dataset.menuId;
 if(draft.selected.includes(id))draft.selected=draft.selected.filter(x=>x!==id);
 else if(draft.selected.length<10)draft.selected.push(id);
 else {toast('최대 10개까지 등록할 수 있어요');return}
 renderEditor();
});
$('#clearAll').addEventListener('click',()=>{draft.selected=[];renderEditor()});
$('#sectionToggle').addEventListener('click',()=>{draft.visible=!draft.visible;renderEditor()});
$('#positionBefore').addEventListener('click',()=>{draft.position='before';renderEditor()});
$('#positionAfter').addEventListener('click',()=>{draft.position='after';renderEditor()});
$('#selectedOrder').addEventListener('click',e=>{
 const btn=e.target.closest('[data-move]');if(!btn)return;
 const a=draft.selected.indexOf(btn.dataset.move),b=draft.selected[a+Number(btn.dataset.step)];if(b)reorder(btn.dataset.move,b);
});
$('#selectedOrder').addEventListener('pointerdown',e=>{
 const handle=e.target.closest('[data-drag]');if(!handle||e.button!==0)return;
 drag={id:handle.dataset.drag,target:null};handle.setPointerCapture?.(e.pointerId);handle.closest('.order-chip')?.classList.add('dragging');
});
$('#selectedOrder').addEventListener('pointermove',e=>{
 if(!drag)return;
 $('#selectedOrder').querySelectorAll('.drag-target').forEach(el=>el.classList.remove('drag-target'));
 const el=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-chip-id]');
 if(el&&el.dataset.chipId!==drag.id&&$('#selectedOrder').contains(el)){drag.target=el.dataset.chipId;el.classList.add('drag-target')}else drag.target=null;
});
function finishDrag(){if(!drag)return;const{id,target}=drag;drag=null;$('#selectedOrder').querySelectorAll('.dragging,.drag-target').forEach(el=>el.classList.remove('dragging','drag-target'));if(target)reorder(id,target)}
$('#selectedOrder').addEventListener('pointerup',finishDrag);$('#selectedOrder').addEventListener('pointercancel',finishDrag);
$('#saveEditor').addEventListener('click',()=>{
 if(!valid(draft))return;
 try{localStorage.setItem(KEY,JSON.stringify(draft))}catch(_){toast('설정을 저장하지 못했어요');return}
 saved=copy(draft);renderHome();closeEditor();toast('퀵메뉴가 저장되었습니다');
});
document.addEventListener('keydown',e=>{
 if(!$('#scrim').classList.contains('open'))return;
 if(e.key==='Escape'){closeEditor();return}
 if(e.key==='Tab'){const els=[...$('#scrim').querySelectorAll('button:not(:disabled),summary')].filter(x=>x.getClientRects().length);if(!els.length)return;const first=els[0],last=els[els.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}
});
for(const item of document.querySelectorAll('[data-icon]'))item.innerHTML=svg(item.dataset.icon);
renderHome();
})();