/* Moderator controls for manually placed LIVE PIN markers. Uses existing admin api/RLS. */
(function(){
 'use strict';
 const h=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let filter='today',renderVersion=0;
 window.loadAdminLiveDirect=async function(){
  const root=document.getElementById('feed');if(!root)return;const version=++renderVersion;root.innerHTML='<div class="empty">불러오는 중...</div>';
  try{const q=new URLSearchParams({select:'id,shop_name,content,category,country_code,latitude,longitude,created_at,expires_at,is_hidden,hidden_at,hidden_reason',location_type:'eq.direct',order:'created_at.desc',limit:'200'});if(filter==='today')q.set('created_at','gte.'+new Date(window.FUNY_LIVE_TIME.bounds().start).toISOString());const rows=await api('/rest/v1/live_reports?'+q);if(version!==renderVersion||adminTab!=='livedirect')return;
   root.innerHTML='<div class="card"><div class="shop">직접 위치 지정 LIVE PIN</div><div class="body">숨김 처리하면 게시물과 지도 마커가 함께 비노출됩니다. 매일 00시(한국시간)에 노출이 종료되며 기록은 유지됩니다.</div><div class="actions"><button data-live-filter="today">오늘</button><button data-live-filter="all">전체 이력</button></div><div class="meta">'+(filter==='today'?'오늘':'최근 200개')+' · '+rows.length+'건</div></div>'+(rows.length?'':'<div class="empty">직접 지정한 LIVE PIN이 없습니다.</div>');
   root.querySelectorAll('[data-live-filter]').forEach(b=>{b.classList.toggle('on',b.dataset.liveFilter===filter);b.onclick=()=>{filter=b.dataset.liveFilter;window.loadAdminLiveDirect()}});
   for(const r of rows){const active=!r.is_hidden&&Date.parse(r.expires_at)>Date.now(),card=document.createElement('article');card.className='card';card.innerHTML='<div class="top"><span class="reason">⚡ '+h(r.country_code)+'</span><span class="time">'+h(new Date(r.created_at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}))+'</span><span class="status">'+(r.is_hidden?'숨김':active?'노출 중':'노출 종료')+'</span></div><div class="shop">'+h(r.shop_name)+'</div><div class="meta">'+h(r.latitude)+', '+h(r.longitude)+' · '+h(r.category)+'</div><div class="body">'+h(r.content||'')+'</div>'+(r.hidden_reason?'<div class="meta">숨김 사유: '+h(r.hidden_reason)+'</div>':'')+'<div class="actions">'+(active?'<button class="danger" data-live-hide="'+h(r.id)+'">지도·게시물 즉시 숨김</button>':'')+'</div>';root.appendChild(card)}
   root.querySelectorAll('[data-live-hide]').forEach(b=>b.onclick=async()=>{const reason=prompt('지도와 LIVE PIN 게시물을 숨깁니다. 사유를 입력해주세요.','관리자 비노출 처리');if(reason===null)return;if(!reason.trim()){alert('숨김 사유를 입력해주세요.');return}b.disabled=true;try{const result=await api('/rest/v1/live_reports?id=eq.'+encodeURIComponent(b.dataset.liveHide)+'&location_type=eq.direct',{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({is_hidden:true,hidden_at:new Date().toISOString(),hidden_reason:reason.trim().slice(0,300)})});if(!result?.length)throw new Error('숨김 권한 또는 게시물 상태를 확인해주세요.');await window.loadAdminLiveDirect()}catch(e){b.disabled=false;alert('숨김 처리 실패: '+e.message)}});
  }catch(e){if(version===renderVersion)root.innerHTML='<div class="empty error">조회 실패: '+h(e.message)+'</div>'}
 };
})();

/* Card-shop request import compatibility for DB-backed TCG types. */
(function(){
 'use strict';
 if(window.__FUNY_ADMIN_TCG_REQUEST_V2)return;
 const install=()=>{
  const base=window.requestItemMappings;
  if(typeof base!=='function')return false;
  window.__FUNY_ADMIN_TCG_REQUEST_V2=true;
  window.requestItemMappings=function(items){
   const result=base(items),set=new Set(items||[]);
   result.tcg=result.tcg||{};
   result.tcg.riftbound=set.has('리프트바운드')||set.has('Riftbound');
   result.tcg.other=set.has('기타')||set.has('기타 TCG')||set.has('Other TCG');
   result.otherTcg=result.tcg.other;
   return result;
  };
  return true;
 };
 let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>100)clearInterval(timer)},50);
})();
