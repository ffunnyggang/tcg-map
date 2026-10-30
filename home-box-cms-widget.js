(()=>{'use strict';
const BASE='https://wdttzpbmqavaqfcbaywj.supabase.co',KEY='sb_publishable__wrSzngSE-JbGnyE7PZX9w_2QaW8bpq';
let config=null,request=null,loaded=false;
async function fetchConfig(){if(request)return request;request=fetch(BASE+'/rest/v1/cms_blocks?select=id,status,is_active,sort_order&placement=eq.home&block_type=eq.box_price_comparison&limit=1',{headers:{apikey:KEY},cache:'no-store'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(rows=>{config=rows[0]||null;loaded=true;return config}).catch(()=>null).finally(()=>{request=null});return request}
function sync(){const box=document.getElementById('homeBoxMarket'),flow=document.querySelector('.home-content-flow');if(!box||!flow)return;const slot=document.querySelector('[data-cms-placement="home"] .fp-cms-box-slot');if(slot&&config?.status==='published'&&config.is_active!==false){if(box.parentElement!==slot)slot.appendChild(box);box.hidden=false;box.style.removeProperty('display');return}
if(box.parentElement?.classList.contains('fp-cms-box-slot'))flow.insertBefore(box,flow.firstChild);
if(loaded){const visible=!!config&&config.status==='published'&&config.is_active!==false;if(!visible){box.hidden=true;box.style.setProperty('display','none','important')}else{box.hidden=false;box.style.removeProperty('display')}}}
function refresh(){return fetchConfig().then(sync)}
window.FUNY_BOX_CMS={sync,refresh};
window.addEventListener('funy:cms-invalidated',()=>{config=null;loaded=false;refresh()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){config=null;loaded=false;refresh()}});
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',refresh):refresh();
})();
