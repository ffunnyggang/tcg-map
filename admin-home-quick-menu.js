/* FUNY PIN | CMS HOME quick-menu block settings (test-only render until production approval). */
(()=>{'use strict';
 const id='adminHomeQuickMenuSettings';
 const mount=()=>{
  const main=document.querySelector('.cms-builder-main'),page=document.getElementById('cmsPage');
  if(!main||!page||document.getElementById(id))return;
  const card=document.createElement('section');card.id=id;card.className='admin-home-quick-card';
  card.innerHTML='<div class="ahq-top"><div><strong>나의 퀵메뉴 · HOME</strong><p>노출 여부와 위치를 관리합니다. 현재는 별도 테스트 HOME에서만 적용됩니다.</p></div><a href="/home-quick-menu-test.html" target="_blank" rel="noopener noreferrer">테스트 보기</a></div>'+
    '<div class="ahq-form"><label>퀵메뉴 노출<select id="ahqEnabled"><option value="true">ON</option><option value="false">OFF</option></select></label>'+
    '<label>HOME 내 위치<select id="ahqPosition"><option value="before_recommend">오늘의 추천 카드샵 위</option><option value="after_recommend">오늘의 추천 카드샵 아래</option></select></label>'+
    '<button type="button" id="ahqSave">설정 저장</button></div>'+
    '<p class="ahq-message" id="ahqMessage" role="status">설정을 불러오는 중입니다.</p>';
  const before=main.querySelector('#cmsBlockList');if(before)main.insertBefore(card,before);else main.append(card);
  const enabled=card.querySelector('#ahqEnabled'),position=card.querySelector('#ahqPosition'),save=card.querySelector('#ahqSave'),message=card.querySelector('#ahqMessage');
  let loaded=false;
  const show=()=>{card.hidden=page.value!=='home';if(!card.hidden&&!loaded)load()};
  const load=async()=>{
    if(loaded)return;
    enabled.disabled=true;position.disabled=true;save.disabled=true;
    try{
      if(typeof api!=='function')throw new Error('운영 어드민 인증 모듈을 찾지 못했습니다.');
      const rows=await api('/rest/v1/home_quick_menu_settings?id=eq.1&select=id,is_enabled,position');
      const cfg=rows?.[0];if(!cfg)throw new Error('퀵메뉴 설정이 등록되어 있지 않습니다.');
      enabled.value=cfg.is_enabled?'true':'false';
      position.value=cfg.position==='after_recommend'?'after_recommend':'before_recommend';
      loaded=true;enabled.disabled=false;position.disabled=false;save.disabled=false;
      message.textContent='현재 설정을 불러왔습니다. 저장 시 테스트 HOME에 반영됩니다.';
    }catch(err){message.textContent='설정 조회 실패: '+String(err?.message||err)}
  };
  save.addEventListener('click',async()=>{
    if(!loaded)return;
    save.disabled=true;message.textContent='설정 저장 중...';
    try{
      const patch={is_enabled:enabled.value==='true',position:position.value,updated_at:new Date().toISOString()};
      await api('/rest/v1/home_quick_menu_settings?id=eq.1',{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify(patch)});
      const rows=await api('/rest/v1/home_quick_menu_settings?id=eq.1&select=is_enabled,position');
      if(rows?.[0]?.is_enabled!==patch.is_enabled||rows?.[0]?.position!==patch.position)throw new Error('저장된 설정을 확인하지 못했습니다.');
      message.textContent='저장 완료 · 테스트 HOME에서 확인할 수 있습니다.';
    }catch(err){message.textContent='저장 실패: '+String(err?.message||err)}
    finally{save.disabled=false}
  });
  page.addEventListener('change',show);show();
 };
 const feed=document.getElementById('feed')||document.body;
 const observer=new MutationObserver(()=>mount());observer.observe(feed,{childList:true,subtree:true});
 mount();
 window.FUNY_ADMIN_QUICK_MENU={mount};
})();