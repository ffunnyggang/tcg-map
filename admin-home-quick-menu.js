/* FUNY PIN | Quick menu is a native-looking item in CMS > HOME block list.
   Settings apply to the isolated HOME test page until explicit production approval. */
(()=>{'use strict';
 const BLOCK_ID='__funy_home_quick_menu__', settingsPath='/rest/v1/home_quick_menu_settings?id=eq.1';
 let settings=null,orderMap=new Map(),loading=false,failed=false;
 const list=()=>document.querySelector('#cmsBlockList');
 const isHome=()=>document.querySelector('#cmsPage')?.value==='home';
 const report=e=>console.warn('[FUNY PIN HOME quick menu admin]',e);
 async function read(){
  if(loading||settings||failed)return;
  if(typeof api!=='function')return;
  loading=true;
  try{
   const [rows,home]=await Promise.all([
    api(settingsPath+'&select=id,is_enabled,position,sort_order'),
    api('/rest/v1/cms_blocks?placement=eq.home&select=id,sort_order')
   ]);
   if(!rows?.[0])throw new Error('퀵메뉴 설정을 불러오지 못했습니다.');
   settings={...rows[0]};
   orderMap=new Map((home||[]).map(x=>[x.id,Number(x.sort_order)]));
   mount();
  }catch(e){failed=true;report(e)}finally{loading=false}
 }
 function createBlock(){
  const card=document.createElement('div');
  card.className='cms-block-card cms-quick-menu-block';card.draggable=true;
  card.dataset.quickMenuBlock='1';card.dataset.quickMenuBlockId=BLOCK_ID;
  const handle=document.createElement('div');handle.className='cms-drag';handle.textContent='⠿';card.append(handle);
  const glyph=document.createElement('div');glyph.className='cms-block-icon';glyph.textContent='📱';card.append(glyph);
  const copy=document.createElement('div');copy.className='cms-block-copy';
  const title=document.createElement('b');title.textContent='나의 퀵메뉴';copy.append(title);
  const meta=document.createElement('span');meta.textContent='기능형 블록 · 사용자 선택형 · 테스트 HOME 적용';copy.append(meta);card.append(copy);
  const actions=document.createElement('div');actions.className='cms-block-actions';
  const toggle=document.createElement('button');toggle.type='button';toggle.className='cms-toggle'+(settings.is_enabled?' on':'');toggle.dataset.quickMenuToggle='1';toggle.setAttribute('aria-label','나의 퀵메뉴 노출 '+(settings.is_enabled?'ON':'OFF'));toggle.setAttribute('aria-pressed',String(settings.is_enabled));actions.append(toggle);
  const view=document.createElement('a');view.href='/home-quick-menu-test.html';view.target='_blank';view.rel='noopener noreferrer';view.className='cms-icon-btn cms-quick-preview';view.textContent='↗';view.title='퀵메뉴 테스트 페이지';view.setAttribute('aria-label','퀵메뉴 테스트 화면 열기');actions.append(view);
  card.append(actions);
  toggle.addEventListener('click',async()=>{
   toggle.disabled=true;
   try{
    const next=!settings.is_enabled;
    await api(settingsPath,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({is_enabled:next,updated_at:new Date().toISOString()})});
    const check=(await api(settingsPath+'&select=is_enabled'))?.[0];
    if(check?.is_enabled!==next)throw Error('저장값 검증에 실패했습니다.');
    settings.is_enabled=next;toggle.classList.toggle('on',next);
    toggle.setAttribute('aria-pressed',String(next));
    toggle.setAttribute('aria-label','나의 퀵메뉴 노출 '+(next?'ON':'OFF'));
   }catch(e){alert('퀵메뉴 ON/OFF 변경 실패: '+String(e.message||e))}
   finally{toggle.disabled=false}
  });
  return card;
 }
 function mount(){
  const target=list();
  if(!isHome()||!target)return;
  if(!settings){read();return}
  if(target.querySelector('[data-quick-menu-block]'))return;
  const card=createBlock(),native=[...target.querySelectorAll('[data-block-id]')];
  const next=native.find(n=>(orderMap.get(n.dataset.blockId)??Number.MAX_SAFE_INTEGER)>Number(settings.sort_order));
  if(next)target.insertBefore(card,next);else target.append(card);
 }
 function onOrderSaved(sortOrder,position,homeRows){
  if(!settings)return;
  settings.sort_order=sortOrder;settings.position=position;
  if(Array.isArray(homeRows))orderMap=new Map(homeRows);
 }
 const target=document.getElementById('feed')||document.body;
 const observer=new MutationObserver(()=>mount());
 observer.observe(target,{subtree:true,childList:true});
 mount();
 window.FUNY_ADMIN_QUICK_MENU={mount,onOrderSaved,blockId:BLOCK_ID};
})();