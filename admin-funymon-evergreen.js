/* FUNY MON evergreen admin panel. Only mounted from the existing verified admin session. */
(function(){
 'use strict';
 const FIELDS=[
  ['search_radius_m','탐색 반경','m',100,10000,100,'사용자 위치를 기준으로 출몰 매장을 검색하는 거리'],
  ['max_shops','최대 출몰 매장','곳',1,5,1,'탐색 반경 내 동시에 선택되는 카드샵 수'],
  ['shop_rotation_minutes','매장 재선정','분',30,1440,30,'상시 출몰 대상 카드샵 변경 주기'],
  ['monster_rotation_minutes','퍼니몬 교체','분',5,360,5,'매장에 등장하는 퍼니몬이 변경되는 주기'],
  ['catch_radius_m','포획 가능 거리','m',10,500,10,'매장 GPS 좌표 기준 포획 가능한 최대 거리'],
  ['capture_success_bp','포획 성공률','%',0,100,1,'포획 시도 성공 확률'],
  ['daily_attempt_limit','하루 시도 제한','회',1,20,1,'회원당 한국시간 기준 하루 포획 시도 수'],
  ['repeat_delay_minutes','동일 퍼니몬 재시도','분',1,1440,1,'같은 매장·퍼니몬에 대한 포획 재시도 대기']
 ];
 const ENDPOINT='/rest/v1/funy_mon_evergreen_settings?select=*&id=eq.true&limit=1';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let serial=0;
 function panel(container,api){
  if(!container||typeof api!=='function')return;
  const turn=++serial;
  container.innerHTML='<div class="fme-panel"><div class="fme-loading" role="status">상시 운영 설정을 조회하고 있습니다.</div></div>';
  const wrap=container.querySelector('.fme-panel');
  api(ENDPOINT).then(rows=>{
   if(turn!==serial||!container.isConnected)return;
   const settings=rows?.[0];if(!settings)throw Error('상시 운영 설정을 찾지 못했습니다.');
   const fields=FIELDS.map(([key,label,unit,min,max,step,hint])=>{
      const val=key==='capture_success_bp'?Number(settings[key])/100:Number(settings[key]);
      return '<label class="fme-field"><span class="fme-label">'+label+'</span><span class="fme-inputwrap"><input class="fme-input" data-field="'+key+'" inputmode="numeric" type="number" min="'+min+'" max="'+max+'" step="'+step+'" required value="'+val+'"><span class="fme-unit">'+unit+'</span></span><small>'+hint+'</small></label>';
   }).join('');
   wrap.innerHTML='<div class="fme-intro"><div><h3>👾 퍼니몬 상시 운영</h3><p>이벤트형 퍼니몬 설정은 변경하지 않습니다. 저장한 값은 상시 출몰 및 포획에 적용됩니다.</p></div><span class="fme-status" data-status>'+(settings.is_enabled?'운영 중':'운영 중지')+'</span></div>'+
     '<form class="fme-form"><label class="fme-switch-row"><span><b>상시 출몰 운영</b><small>OFF 시 새로운 상시 출몰·포획을 중단합니다.</small></span><span class="fme-switch"><input type="checkbox" name="is_enabled" '+(settings.is_enabled?'checked':'')+'><i></i></span></label>'+
     '<div class="fme-fields">'+fields+'</div><p class="fme-notice">국내 카드샵에만 적용 · 진행 중인 이벤트 우선 · 경품 및 응모권 미지급</p>'+
     '<div class="fme-actions"><button class="fme-cancel" type="reset">변경 취소</button><button class="fme-save" type="submit">설정 저장</button></div><p class="fme-feedback" data-feedback role="status" aria-live="polite"></p></form>';
   const form=wrap.querySelector('form'),feedback=wrap.querySelector('[data-feedback]'),save=wrap.querySelector('.fme-save');
   const getValues=()=>{
     const next={is_enabled:form.elements.is_enabled.checked};
     for(const [key,label,unit,min,max] of FIELDS){
       const el=form.querySelector('[data-field="'+key+'"]'),v=Number(el.value);
       if(!el.value.trim()||!Number.isFinite(v)||!Number.isInteger(v)||v<min||v>max)throw Error(label+' 값을 확인해주세요. ('+min+'~'+max+' '+unit+')');
       next[key]=key==='capture_success_bp'?v*100:v;
     }
     return next;
   };
   form.addEventListener('reset',()=>{setTimeout(()=>{if(turn!==serial)return;form.elements.is_enabled.checked=!!settings.is_enabled;for(const [key] of FIELDS){const el=form.querySelector('[data-field="'+key+'"]');el.value=key==='capture_success_bp'?Number(settings[key])/100:Number(settings[key]);}feedback.textContent='기존 설정으로 되돌렸습니다.'},0)});
   form.addEventListener('submit',async e=>{
     e.preventDefault();if(save.disabled)return;
     let next;try{next=getValues()}catch(err){feedback.textContent=err.message;feedback.className='fme-feedback is-error';return}
     const changed=Object.keys(next).some(k=>next[k]!==settings[k]);
     if(!changed){feedback.textContent='변경된 설정이 없습니다.';feedback.className='fme-feedback';return}
     if(settings.is_enabled!==next.is_enabled&&!window.confirm(next.is_enabled?'퍼니몬 상시 출몰을 운영 시작할까요?':'퍼니몬 상시 출몰을 중단할까요?'))return;
     save.disabled=true;save.textContent='저장 중…';feedback.textContent='운영 설정을 저장하고 재조회합니다.';feedback.className='fme-feedback';
     try{
       await api('/rest/v1/funy_mon_evergreen_settings?id=eq.true',{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({...next,updated_at:new Date().toISOString()})});
       const rows=await api(ENDPOINT),check=rows?.[0];
       if(!check||Object.keys(next).some(k=>check[k]!==next[k]))throw Error('저장 후 설정 검증에 실패했습니다. 다시 확인해주세요.');
       Object.assign(settings,check);
       wrap.querySelector('[data-status]').textContent=check.is_enabled?'운영 중':'운영 중지';
       feedback.textContent='설정이 정상적으로 저장되었습니다.';feedback.className='fme-feedback is-success';
     }catch(err){feedback.textContent='저장 실패: '+String(err?.message||err);feedback.className='fme-feedback is-error'}
     finally{save.disabled=false;save.textContent='설정 저장'}
   });
  }).catch(err=>{if(turn===serial&&container.isConnected)wrap.innerHTML='<div class="fme-error">상시 운영 설정을 불러오지 못했습니다: '+esc(err?.message||err)+'</div>'});
 }
 window.FUNY_MON_EVERGREEN_ADMIN={mount:panel,unmount(){serial++}};
})();