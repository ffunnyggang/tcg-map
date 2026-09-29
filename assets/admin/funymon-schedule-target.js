(()=>{
'use strict';
const CALENDAR_ID='32475a73be5a7c48db3c46d180e659e870c8ca823b7d62071f3586387c91b4ca@group.calendar.google.com';
const CALENDAR_KEY='AIzaSyBFdEvEvlFJNfiV1shZnHyi_h_I47EKYao';
let currentEditorId=null,schedules=null,eventCache=new Map(),injectBusy=false;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize=v=>String(v||'').replace(/\s+/g,'').replace(/[,()]/g,'').toLowerCase();
const localValue=v=>{if(!v)return'';const d=new Date(v),p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes())};
function eventStart(e){return new Date(e.start?.dateTime||((e.start?.date||'')+'T00:00:00+09:00'))}
function eventEnd(e){if(e.end?.date){const d=new Date(e.end.date+'T00:00:00+09:00');d.setDate(d.getDate()-1);d.setHours(23,59,59,999);return d}return new Date(e.end?.dateTime||e.start?.dateTime||Date.now())}
function geocode(address){return new Promise((resolve,reject)=>{if(!window.naver?.maps?.Service)return reject(new Error('지도 좌표 서비스를 불러오지 못했습니다.'));naver.maps.Service.geocode({query:address},(status,res)=>{if(status!==naver.maps.Service.Status.OK||!res?.v2?.addresses?.length)return reject(new Error('일정 장소의 좌표를 찾지 못했습니다.'));const a=res.v2.addresses[0];resolve({lat:+a.y,lng:+a.x})})})}
async function loadSchedules(){
 if(schedules)return schedules;
 const now=new Date(),end=new Date(now);end.setMonth(end.getMonth()+13);
 const [shops,res]=await Promise.all([
   window.api('/rest/v1/shops?select=id,address&is_active=eq.true'),
   fetch('https://www.googleapis.com/calendar/v3/calendars/'+encodeURIComponent(CALENDAR_ID)+'/events?'+new URLSearchParams({key:CALENDAR_KEY,singleEvents:'true',orderBy:'startTime',timeMin:now.toISOString(),timeMax:end.toISOString(),maxResults:'100'}))
 ]);
 if(!res.ok)throw new Error('일정 목록을 불러오지 못했습니다.');
 const known=new Set((shops||[]).map(x=>normalize(x.address)).filter(Boolean)),data=await res.json();
 schedules=(data.items||[]).filter(e=>e.location&&eventEnd(e)>=now&&!known.has(normalize(e.location)));
 return schedules;
}
async function getEvent(id){if(!id||id==='new')return null;if(eventCache.has(id))return eventCache.get(id);const rows=await window.api('/rest/v1/funy_mon_events?select=*&id=eq.'+encodeURIComponent(id));const ev=rows?.[0]||null;if(ev)eventCache.set(id,ev);return ev}
function selectedSchedule(){const sel=document.getElementById('monScheduleTarget');if(!sel)return null;return (schedules||[]).find(e=>e.id===sel.value)||null}
async function resolveScheduleTarget(e){if(!e)return null;const pos=await geocode(e.location);return{schedule_event_id:e.id,target_latitude:pos.lat,target_longitude:pos.lng,target_name_snapshot:e.summary||'TCG 일정',target_location_snapshot:e.location||null}}
function syncTargetUi(prefill=true){
 const type=document.getElementById('monTargetType')?.value||'shop',country=document.getElementById('monEventCountry')?.closest('.mon-event-field'),shop=document.getElementById('monEventShop')?.closest('.mon-event-field'),schedule=document.getElementById('monScheduleTarget')?.closest('.mon-event-field');
 if(country)country.style.display=type==='schedule'?'none':'';if(shop)shop.style.display=type==='schedule'?'none':'';if(schedule)schedule.style.display=type==='schedule'?'':'none';
 if(type==='schedule'&&prefill){const e=selectedSchedule();if(e){const s=document.getElementById('monEventStart'),en=document.getElementById('monEventEnd');if(s)s.value=localValue(eventStart(e));if(en)en.value=localValue(eventEnd(e))}}
}
async function inject(){
 if(injectBusy||document.getElementById('monTargetType')||!document.getElementById('monEventShop'))return;
 injectBusy=true;
 try{
  const grid=document.getElementById('monEventShop').closest('.mon-basic-grid');if(!grid)return;
  const ev=await getEvent(currentEditorId),list=await loadSchedules();
  const type=ev?.target_type||'shop';
  const targetField=document.createElement('div');targetField.className='mon-event-field';targetField.innerHTML='<label>출몰 장소 유형</label><select id="monTargetType"><option value="shop"'+(type==='shop'?' selected':'')+'>카드샵</option><option value="schedule"'+(type==='schedule'?' selected':'')+'>일정마커</option></select>';
  const scheduleField=document.createElement('div');scheduleField.className='mon-event-field';scheduleField.innerHTML='<label>기존 일정마커</label><select id="monScheduleTarget"><option value="">일정 선택</option>'+list.map(e=>'<option value="'+esc(e.id)+'"'+(ev?.schedule_event_id===e.id?' selected':'')+'>'+esc(e.summary||'TCG 일정')+' · '+esc(e.location||'')+'</option>').join('')+'</select><small id="monScheduleTargetInfo" style="color:#918996;font-size:9px;line-height:1.4"></small>';
  grid.insertBefore(targetField,grid.firstChild);grid.insertBefore(scheduleField,targetField.nextSibling);
  document.getElementById('monTargetType').onchange=()=>syncTargetUi(false);
  document.getElementById('monScheduleTarget').onchange=()=>{syncTargetUi(true);const e=selectedSchedule(),info=document.getElementById('monScheduleTargetInfo');if(info)info.textContent=e?(e.location||''):''};
  const info=document.getElementById('monScheduleTargetInfo');if(info&&ev?.target_type==='schedule')info.textContent=ev.target_location_snapshot||'';
  syncTargetUi(false);
 }catch(e){console.warn('FUNY MON 일정 선택 UI',e)}finally{injectBusy=false}
}
async function saveScheduleEvent(){
 const btn=document.getElementById('monEventSave'),schedule=selectedSchedule(),start=document.getElementById('monEventStart')?.value,end=document.getElementById('monEventEnd')?.value,selected=[...document.querySelectorAll('[data-monster]:checked')].map(x=>x.dataset.monster),spawn=Math.max(1,Math.min(10,Number(document.getElementById('monSpawnCount')?.value)||1)),distanceEnabled=document.getElementById('monDistanceEnabled')?.value==='true',distanceLimit=Math.max(10,Math.min(5000,Number(String(document.getElementById('monDistanceLimit')?.value||'100').replaceAll(',',''))||100)),dailyLimit=Math.max(0,Math.min(100,Number(document.getElementById('monDailyLimit')?.value)||0)),captureSuccessBp=Math.max(0,Math.min(10000,Math.round((Number(document.getElementById('monCaptureSuccess')?.value)||0)*100)));
 if(!schedule){alert('출몰 기준으로 사용할 일정마커를 선택해주세요.');return}if(!start||!end){alert('이벤트 시작/종료 일시를 설정해주세요.');return}if(new Date(end)<=new Date(start)){alert('종료 일시는 시작 일시보다 뒤여야 합니다.');return}if(!selected.length){alert('노출할 퍼니몬을 1종 이상 선택해주세요.');return}if(spawn>selected.length){alert('지도 노출 개수는 선택한 퍼니몬 수보다 많을 수 없습니다.');return}
 const old=btn?.textContent;if(btn){btn.disabled=true;btn.textContent='전체 저장 중...'}
 try{
  const target=await resolveScheduleTarget(schedule),body={shop_id:null,target_type:'schedule',...target,starts_at:new Date(start).toISOString(),ends_at:new Date(end).toISOString(),selected_monsters:selected,spawn_count:spawn,distance_limit_enabled:distanceEnabled,distance_limit_m:distanceLimit,daily_catch_limit:dailyLimit,capture_success_bp:captureSuccessBp,title:'FUNY MON 이벤트'};
  let eventId=currentEditorId;
  if(!eventId||eventId==='new'){const rows=await window.api('/rest/v1/funy_mon_events',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(body)});eventId=rows?.[0]?.id||null}else await window.api('/rest/v1/funy_mon_events?id=eq.'+encodeURIComponent(eventId),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify(body)});
  const rewardIds=[...document.querySelectorAll('.mon-card[data-mon-id]')].map(x=>x.dataset.monId);if(typeof window.saveFunyMonReward==='function')for(const id of rewardIds)await window.saveFunyMonReward(id,{deferReload:true,throwError:true});
  eventCache.clear();currentEditorId=eventId;await window.loadFunyMonRewards?.();alert('일정마커 기준 FUNY MON 이벤트 저장이 완료되었습니다.');
 }catch(e){alert('전체 저장 실패: '+(e.message||e))}finally{const b=document.getElementById('monEventSave');if(b){b.disabled=false;b.textContent=old||'저장'}}
}
function enhanceList(){document.querySelectorAll('.mon-admin-list [data-mon-event]').forEach(async row=>{const id=row.dataset.monEvent;if(!id||row.dataset.scheduleEnhanced)return;const ev=await getEvent(id);if(ev?.target_type!=='schedule')return;row.dataset.scheduleEnhanced='1';const idCell=row.querySelector('.shop-admin-id'),name=row.querySelector('.shop-admin-name');if(idCell)idCell.textContent='일정';if(name){const b=name.querySelector('b'),s=name.querySelector('span');if(b)b.textContent=ev.target_name_snapshot||'TCG 일정';if(s)s.textContent=ev.target_location_snapshot||''}})}
document.addEventListener('click',e=>{const t=e.target.closest?.('[data-mon-event-edit],[data-mon-event],#monCreateEvent');if(t){currentEditorId=t.id==='monCreateEvent'?'new':(t.dataset.monEventEdit||t.dataset.monEvent||currentEditorId);setTimeout(inject,0)}const save=e.target.closest?.('#monEventSave');if(save&&document.getElementById('monTargetType')?.value==='schedule'){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();saveScheduleEvent()}},true);
const mo=new MutationObserver(()=>{if(document.getElementById('monEventShop')&&!document.getElementById('monTargetType'))inject();enhanceList()});mo.observe(document.documentElement,{childList:true,subtree:true});
})();