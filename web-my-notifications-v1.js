/* FUNY PIN Web MY notification center, shares app notifications table. */
(async()=>{'use strict';
const A=window.FUNY_WEB_AUTH;const root=document.getElementById('notificationRoot');if(!A||!root)return;
await A.init();if(!A.session?.user){A.goLogin('/my-notifications.html');return}
const uid=A.session.user.id;const en=localStorage.getItem('funy-pin-lang')==='en';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=x=>({community:'💬',market:'🛍️',rewards:'🎁',missions:'🏆',coupons:'🎟️',service:'📢',shop:'📍'})[x]||'🔔';
const date=s=>{try{return new Date(s).toLocaleString(en?'en-US':'ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}catch{return''}};
let rows=[];
async function load(){root.innerHTML='<p class="fn-empty">알림을 불러오는 중...</p>';const {data,error}=await A.client.from('notifications').select('*').eq('user_id',uid).order('created_at',{ascending:false}).limit(100);if(error){root.innerHTML='<p class="fn-empty">'+esc(error.message)+'</p>';return}rows=data||[];render()}
function render(){let previous='';const parts=[];for(const x of rows){const d=new Date(x.created_at);const day=Number.isNaN(d.getTime())?'':[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');if(day!==previous){previous=day;parts.push('<div class="fn-day">'+esc(day.replace(/-/g,'. '))+'</div>')}parts.push('<button class="fn-item '+(!x.read_at?'unread':'')+'" type="button" data-notification-id="'+esc(x.id)+'"><span class="fn-emoji">'+icon(x.category)+'</span><span class="fn-copy"><strong>'+esc(x.title)+'</strong><span>'+esc(x.body)+'</span><small>'+date(x.created_at)+'</small></span>'+(!x.read_at?'<span class="fn-dot"></span>':'')+'</button>')}
root.innerHTML=parts.length?parts.join(''):'<div class="fn-empty">아직 도착한 알림이 없습니다.</div>';}
root.addEventListener('click',async e=>{const b=e.target.closest('[data-notification-id]');if(!b)return;const item=rows.find(x=>x.id===b.dataset.notificationId);if(!item)return;if(!item.read_at){const {error}=await A.client.from('notifications').update({read_at:new Date().toISOString()}).eq('id',item.id).eq('user_id',uid);if(!error){item.read_at=new Date().toISOString();render()}}const dest=String(item.url||item.route||'');if(!dest)return;try{const url=new URL(dest,location.origin);if(url.origin===location.origin&&/^https?:$/.test(url.protocol))location.href=url.href;else if(/^https:$/.test(url.protocol)&&url.hostname==='funypin.kr')location.href=url.href}catch{}});
await load();
})();