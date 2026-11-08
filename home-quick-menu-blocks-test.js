
/* HOME quick-menu blocks prototype: client-only sandbox, no member DB. */
(()=>{'use strict';
const DEFAULT=['shops','favorite','box','pick'],KEY='funypin.home.quick-menu.test.blocks.v2',LEGACY='funypin.home.quick-menu.test.v1';
const ICON={
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
const GROUPS=[
{title:'카드샵·상품',items:[
{id:'shops',label:'카드샵 찾기',href:'/shops.html',guest:true},
{id:'favorite',label:'관심 목록',href:'/my-favorites.html',guest:false},
{id:'box',label:'BOX 시세',href:'/store.html?kind=box',guest:true},
{id:'graded',label:'등급카드',href:'/store.html?kind=graded',guest:true},
{id:'market',label:'TCG 거래',href:'/market.html',guest:true}]},
{title:'콘텐츠·커뮤니티',items:[
{id:'pick',label:'PICK 콘텐츠',href:'/pick.html',guest:true},
{id:'talk',label:'TALK',href:'/talk.html',guest:true},
{id:'events',label:'이벤트',href:'/my-events.html',guest:false},
{id:'raffle',label:'추첨기',href:'/event-raffle.html',guest:true}]},
{title:'MY·수집 활동',items:[
{id:'my',label:'MY',href:'/my.html',guest:false},
{id:'coupons',label:'쿠폰함',href:'/my-coupons.html',guest:false},
{id:'mon',label:'퍼니몬 도감',href:'/my-funymon.html',guest:false},
{id:'ranking',label:'랭킹',href:'/ranking.html',guest:true},
{id:'badges',label:'배지',href:'/my-badges.html',guest:false}]}];
const ALL=GROUPS.flatMap(g=>g.items),byId=id=>ALL.find(x=>x.id===id);
const $=s=>document.querySelector(s);
const svg=id=>'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(ICON[id]||ICON.pick)+'</svg>';
const clone=x=>({active:[...x.active],visible:x.visible,placement:x.placement});
function load(){
 try{const x=JSON.parse(localStorage.getItem(KEY));if(x&&Array.isArray(x.active)&&x.active.length<=4&&new Set(x.active).size===x.active.length&&x.active.every(id=>byId(id)))return{active:x.active,visible:x.visible!==false,placement:x.placement==='bottom'?'bottom':'top'}}catch(_){}
 try{const x=JSON.parse(localStorage.getItem(LEGACY));if(Array.isArray(x)&&x.length<=4&&new Set(x).size===x.length&&x.every(id=>byId(id)))return{active:x,visible:true,placement:'top'}}catch(_){}
 return {active:[...DEFAULT],visible:true,placement:'top'};
}
let saved=load(),draft=clone(saved),lastFocus=null,drag=null;
function toast(t){const x=$('#toast');x.textContent=t;x.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>x.classList.remove('show'),1900)}
function renderHome(){
 const quick=$('#quickSection'),root=$('#shortcuts');
 if(saved.placement==='bottom')$('#recommendSection').after(quick);else $('#homeNotice').after(quick);
 quick.hidden=!saved.visible;root.replaceChildren();
 if(!saved.active.length){const box=document.createElement('div');box.className='quick-empty';box.innerHTML='표시할 퀵메뉴가 없습니다.<button type="button" id="emptyQuickEditor">+ 메뉴 등록</button>';root.append(box);return}
 for(const id of saved.active){const item=byId(id),a=document.createElement('a');a.className='shortcut';a.href=item.href;a.dataset.funyLinkMode='inapp';a.dataset.funyInappPresentation='page';a.setAttribute('aria-label',item.label);a.innerHTML='<span class="shortcut-icon">'+svg(id)+'</span><span class="shortcut-label">'+item.label+'</span>';root.append(a)}
}
function toggle(id){
 if(draft.active.includes(id))draft.active=draft.active.filter(x=>x!==id);
 else if(draft.active.length<4)draft.active.push(id);
 else{toast('최대 4개까지 ON 할 수 있어요');return}
 render();
}
function move(id,target){const a=draft.active.indexOf(id),b=draft.active.indexOf(target);if(a<0||b<0||a===b)return;draft.active.splice(a,1);draft.active.splice(b,0,id);render()}
function block(item,on,index){
 const row=document.createElement('div');row.className='menu-block'+(on?' active':'');row.dataset.blockId=item.id;
 if(on){const handle=document.createElement('button');handle.type='button';handle.className='drag-handle';handle.dataset.dragId=item.id;handle.setAttribute('aria-label',item.label+' 블록 드래그');handle.textContent='⠿';row.append(handle)}
 const icon=document.createElement('span');icon.className='block-glyph';icon.innerHTML=svg(item.id);row.append(icon);
 const copy=document.createElement('div');copy.className='block-copy';
 const label=document.createElement('strong');label.textContent=item.label;const detail=document.createElement('small');detail.textContent=on?'HOME '+(index+1)+'번째 블록':(item.guest?'비로그인 이용 가능':'로그인 필요');copy.append(label,detail);row.append(copy);
 if(on){const arrows=document.createElement('div');arrows.className='block-arrows';for(const step of [-1,1]){const b=document.createElement('button');b.type='button';b.dataset.moveId=item.id;b.dataset.step=step;b.textContent=step<0?'▲':'▼';b.setAttribute('aria-label',item.label+(step<0?' 앞으로':' 뒤로')+' 이동');b.disabled=index+step<0||index+step>=draft.active.length;arrows.append(b)}row.append(arrows)}
 const switcher=document.createElement('button');switcher.type='button';switcher.className='toggle';switcher.dataset.toggleId=item.id;switcher.setAttribute('role','switch');switcher.setAttribute('aria-checked',String(on));switcher.setAttribute('aria-label',item.label+' '+(on?'OFF':'ON'));switcher.disabled=!on&&draft.active.length>=4;switcher.innerHTML='<span class="toggle-knob"></span><b>'+(on?'ON':'OFF')+'</b>';row.append(switcher);return row;
}
function render(){
 const list=$('#activeBlocks');list.replaceChildren();
 for(let i=0;i<draft.active.length;i++)list.append(block(byId(draft.active[i]),true,i));
 if(!draft.active.length){const empty=document.createElement('div');empty.className='no-selection';empty.textContent='현재 켜진 메뉴가 없습니다. 아래에서 사용할 메뉴를 ON으로 바꿔 주세요.';list.append(empty)}
 $('#counter').textContent=draft.active.length+' / 4';
 const q=$('#menuSearch').value.trim().toLowerCase(),catalog=$('#catalog');catalog.replaceChildren();let count=0;
 for(const group of GROUPS){const items=group.items.filter(item=>!draft.active.includes(item.id)&&(!q||item.label.toLowerCase().includes(q)||group.title.toLowerCase().includes(q)));if(!items.length)continue;count+=items.length;const section=document.createElement('section');section.className='group';const title=document.createElement('h3');title.textContent=group.title;section.append(title);const grid=document.createElement('div');grid.className='group-grid';for(const item of items)grid.append(block(item,false,0));section.append(grid);catalog.append(section)}
 if(!count){const e=document.createElement('div');e.className='no-results';e.textContent='OFF 메뉴가 없습니다.';catalog.append(e)}
 const sectionSwitch=$('#toggleSection');sectionSwitch.setAttribute('aria-checked',String(draft.visible));sectionSwitch.querySelector('b').textContent=draft.visible?'ON':'OFF';
 for(const key of ['top','bottom']){const b=$('#position'+key[0].toUpperCase()+key.slice(1));b.classList.toggle('is-current',draft.placement===key);b.setAttribute('aria-pressed',String(draft.placement===key))}
}
function openEditor(){lastFocus=document.activeElement;draft=clone(saved);$('#menuSearch').value='';$('#scrim').classList.add('open');$('#scrim').setAttribute('aria-hidden','false');document.body.style.overflow='hidden';render();$('#closeEditor').focus()}
function closeEditor(){document.body.style.overflow='';$('#scrim').classList.remove('open');$('#scrim').setAttribute('aria-hidden','true');lastFocus?.focus()}
for(const id of ['openEditor','homeLayoutBtn'])$(('#'+id)).addEventListener('click',openEditor);
$('#shortcuts').addEventListener('click',e=>{if(e.target.closest('#emptyQuickEditor')){e.preventDefault();openEditor()}});
$('#closeEditor').addEventListener('click',closeEditor);
$('#scrim').addEventListener('click',e=>{if(e.target===$('#scrim'))closeEditor()});
$('#toggleSection').addEventListener('click',()=>{draft.visible=!draft.visible;render()});
$('#positionTop').addEventListener('click',()=>{draft.placement='top';render()});
$('#positionBottom').addEventListener('click',()=>{draft.placement='bottom';render()});
$('#menuSearch').addEventListener('input',render);
$('#editorScroll').addEventListener('click',e=>{
 const toggleBtn=e.target.closest('[data-toggle-id]');if(toggleBtn){toggle(toggleBtn.dataset.toggleId);return}
 const arrow=e.target.closest('[data-move-id]');if(arrow){const i=draft.active.indexOf(arrow.dataset.moveId),to=draft.active[i+Number(arrow.dataset.step)];if(to)move(arrow.dataset.moveId,to)}
});
$('#activeBlocks').addEventListener('pointerdown',e=>{
 const handle=e.target.closest('[data-drag-id]');if(!handle||e.button!==0)return;
 drag={id:handle.dataset.dragId,target:null};handle.setPointerCapture?.(e.pointerId);handle.closest('.menu-block')?.classList.add('dragging');
});
$('#activeBlocks').addEventListener('pointermove',e=>{
 if(!drag)return;
 const blockEl=document.elementFromPoint(e.clientX,e.clientY)?.closest('.menu-block[data-block-id]');
 $('#activeBlocks').querySelectorAll('.drop-target').forEach(el=>el.classList.remove('drop-target'));
 if(blockEl&&$('#activeBlocks').contains(blockEl)&&blockEl.dataset.blockId!==drag.id){drag.target=blockEl.dataset.blockId;blockEl.classList.add('drop-target')}else drag.target=null;
});
function finishDrag(){
 if(!drag)return;const {id,target}=drag;drag=null;
 $('#activeBlocks').querySelectorAll('.dragging,.drop-target').forEach(el=>el.classList.remove('dragging','drop-target'));
 if(target)move(id,target);
}
$('#activeBlocks').addEventListener('pointerup',finishDrag);
$('#activeBlocks').addEventListener('pointercancel',finishDrag);
$('#resetEditor').addEventListener('click',()=>{draft={active:[...DEFAULT],visible:true,placement:'top'};render();toast('기본 설정으로 초기화했어요')});
$('#saveEditor').addEventListener('click',()=>{
 try{localStorage.setItem(KEY,JSON.stringify(draft))}catch(_){toast('브라우저 저장이 차단되어 있어요');return}
 saved=clone(draft);renderHome();closeEditor();toast('블록 설정이 저장됐어요');
});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&$('#scrim').classList.contains('open')){closeEditor();return}
 if(e.key==='Tab'&&$('#scrim').classList.contains('open')){
 const all=[...$('#scrim').querySelectorAll('button:not(:disabled),input')].filter(el=>el.getClientRects().length);
 if(!all.length)return;const first=all[0],last=all[all.length-1];
 if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
 }
});
for(const [key,id] of [['nav-home','shops'],['nav-map','shops'],['nav-pick','pick'],['nav-talk','talk'],['nav-my','my']])document.getElementById(key).innerHTML=svg(id);
renderHome();
})();
