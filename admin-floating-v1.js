(()=>{
  if(window.__FUNY_ADMIN_FLOATING_V1)return;
  window.__FUNY_ADMIN_FLOATING_V1=true;

  const MODES={native:'네이티브',web:'웹',off:'미노출'};
  const DEFAULTS=[
    {surface:'home',name:'HOME',mode:'native',label_ko:'LIVE PIN',action_key:'live_pin',target_url:null,sort_order:10},
    {surface:'map',name:'TCG MAP',mode:'native',label_ko:'제보 · 매물 등록',action_key:'map_actions',target_url:null,sort_order:20},
    {surface:'pick',name:'PICK',mode:'native',label_ko:'LIVE PIN',action_key:'live_pin',target_url:null,sort_order:30},
    {surface:'talk',name:'TALK',mode:'off',label_ko:'게시물 등록',action_key:'external_link',target_url:null,sort_order:40}
  ];

  const ensureStyle=()=>{
    if(document.getElementById('floating-admin-style'))return;
    const style=document.createElement('style');
    style.id='floating-admin-style';
    style.textContent='.floating-admin-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:14px}.floating-admin-head h2{margin:0;font-size:18px}.floating-admin-head p{margin:4px 0 0;color:#918996;font-size:10px}.floating-admin-actions{display:flex;gap:7px}.floating-admin-actions button{height:38px;padding:0 13px;border-radius:10px;font-size:10px;font-weight:850;cursor:pointer}.floating-refresh{border:1px solid #e4dfe8;background:#fff;color:#514b56}.floating-save{border:0;background:#28232e;color:#fff}.floating-save:disabled{opacity:.45;cursor:not-allowed}.floating-admin-note{margin-bottom:12px;padding:11px 12px;border:1px solid #e5def0;border-radius:12px;background:#f8f5ff;color:#675878;font-size:10px;line-height:1.55}.floating-admin-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.floating-admin-card{padding:15px;border:1px solid #e9e5eb;border-radius:15px;background:#fff}.floating-admin-card-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}.floating-admin-card-head b{font-size:13px}.floating-admin-card-head span{padding:4px 7px;border-radius:999px;background:#f0e9ff;color:#7057c8;font-size:9px;font-weight:850}.floating-admin-form{display:grid;grid-template-columns:150px minmax(0,1fr);gap:9px}.floating-admin-form .field:last-child{grid-column:1/-1}.floating-admin-form small{display:block;margin-top:4px;color:#9a929e;font-size:9px;line-height:1.45}.floating-admin-state{margin-top:10px;color:#8d8591;font-size:9px}.floating-admin-state.native{color:#4d8c60}.floating-admin-state.web{color:#6d54b6}.floating-admin-state.off{color:#9a929e}@media(max-width:760px){.floating-admin-head{align-items:stretch;flex-direction:column}.floating-admin-actions{display:grid;grid-template-columns:1fr 1fr}.floating-admin-grid{grid-template-columns:1fr}.floating-admin-form{grid-template-columns:1fr}.floating-admin-form .field:last-child{grid-column:auto}}';
    document.head.appendChild(style);
  };

  const cardHtml=row=>{
    const mode=['native','web','off'].includes(row.mode)?row.mode:'native';
    const external=row.action_key==='external_link';
    return '<article class="floating-admin-card" data-floating-surface="'+esc(row.surface)+'"><div class="floating-admin-card-head"><b>'+esc(row.name)+'</b><span>'+esc(row.surface.toUpperCase())+'</span></div><div class="floating-admin-form"><div class="field"><label>노출 방식</label><select class="select" data-floating-mode><option value="native"'+(mode==='native'?' selected':'')+'>네이티브</option><option value="web"'+(mode==='web'?' selected':'')+'>웹</option><option value="off"'+(mode==='off'?' selected':'')+'>미노출</option></select></div><div class="field"><label>버튼명</label><input class="input" data-floating-label maxlength="40" value="'+esc(row.label_ko||'')+'"></div><div class="field"><label>이동 링크</label><input class="input" data-floating-url type="url" value="'+esc(row.target_url||'')+'" placeholder="https://..."'+(external?'':' disabled')+'><small>'+(external?'외부 링크 버튼에서 사용합니다.':'이 화면은 앱 내부 고정 기능을 실행합니다.')+'</small></div></div><div class="floating-admin-state '+mode+'" data-floating-state>'+esc(MODES[mode]||mode)+' 모드</div><input type="hidden" data-floating-action value="'+esc(row.action_key)+'"><input type="hidden" data-floating-sort value="'+Number(row.sort_order||0)+'"></article>';
  };

  window.loadAdminFloatingActions=async()=>{
    ensureStyle();
    const f=document.getElementById('feed');
    if(!f)return;
    f.innerHTML='<div class="empty">플로팅 버튼 설정을 불러오는 중...</div>';
    try{
      const rows=await api('/rest/v1/app_floating_actions?platform=eq.android&select=*&order=sort_order.asc');
      const merged=DEFAULTS.map(base=>({...base,...(rows.find(x=>x.surface===base.surface)||{}),platform:'android',name:base.name}));
      f.innerHTML='<div class="floating-admin-head"><div><h2>AOS 플로팅 버튼</h2><p>HOME · TCG MAP · PICK · TALK의 표시 방식을 앱 재배포 없이 전환합니다.</p></div><div class="floating-admin-actions"><button id="floatingRefresh" class="floating-refresh" type="button">새로고침</button><button id="floatingSave" class="floating-save" type="button">설정 저장</button></div></div><div class="floating-admin-note">기본 운영은 <b>네이티브</b>, 비상 대체는 <b>웹</b>, 완전 제거는 <b>미노출</b>을 사용하세요. 앱은 마지막 정상 설정을 단말에 캐시합니다.</div><div class="floating-admin-grid">'+merged.map(cardHtml).join('')+'</div>';
      document.getElementById('floatingRefresh').onclick=window.loadAdminFloatingActions;
      document.querySelectorAll('[data-floating-mode]').forEach(select=>{
        select.onchange=()=>{
          const state=select.closest('[data-floating-surface]')?.querySelector('[data-floating-state]');
          if(!state)return;
          state.className='floating-admin-state '+select.value;
          state.textContent=(MODES[select.value]||select.value)+' 모드';
        };
      });
      document.getElementById('floatingSave').onclick=async()=>{
        const button=document.getElementById('floatingSave');
        button.disabled=true;
        button.textContent='저장 중...';
        try{
          const payload=[...document.querySelectorAll('[data-floating-surface]')].map(card=>({
            platform:'android',
            surface:card.dataset.floatingSurface,
            mode:card.querySelector('[data-floating-mode]').value,
            label_ko:card.querySelector('[data-floating-label]').value.trim(),
            action_key:card.querySelector('[data-floating-action]').value,
            target_url:card.querySelector('[data-floating-url]').disabled?null:(card.querySelector('[data-floating-url]').value.trim()||null),
            is_active:true,
            sort_order:Number(card.querySelector('[data-floating-sort]').value||0)
          }));
          if(payload.some(x=>!x.label_ko))throw new Error('모든 버튼명을 입력해주세요.');
          await api('/rest/v1/app_floating_actions?on_conflict=platform,surface',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(payload)});
          await window.loadAdminFloatingActions();
          alert('플로팅 버튼 설정을 저장했습니다.');
        }catch(e){
          alert('설정 저장 실패: '+e.message);
          button.disabled=false;
          button.textContent='설정 저장';
        }
      };
    }catch(e){
      f.innerHTML='<div class="empty error">플로팅 버튼 설정 조회 실패: '+esc(e.message)+'</div>';
    }
  };
})();