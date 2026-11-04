(()=>{'use strict';
const $=id=>document.getElementById(id),BASE='https://wdttzpbmqavaqfcbaywj.supabase.co',KEY='sb_publishable__wrSzngSE-JbGnyE7PZX9w_2QaW8bpq',token=sessionStorage.getItem('funypin_admin_token')||'';
const status=m=>$('gradedPermissionStatus').textContent=m;
const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n};
async function call(action,params={}){const r=await fetch(BASE+'/functions/v1/graded-shop-admin',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({action,...params})}),d=await r.json();if(!r.ok)throw Error(d.error||'권한 설정을 처리하지 못했습니다.');return d}
async function load(){
 const d=await call('permission_list'),root=$('gradedPermissionList');root.replaceChildren();
 for(const row of d.rows||[]){
  const item=node('div','entry'),copy=node('div','graded-access-copy'),button=node('button','',row.is_active?'권한 해제':'권한 부여');
  copy.append(node('strong','',row.shops?.name||row.shop_id),node('div','',row.email),node('small','',(row.kind==='online'?'온라인샵 · ':'')+(row.is_active?'등급카드 등록 가능':'권한 없음')));
  button.type='button';button.setAttribute('aria-label',(row.shops?.name||row.shop_id)+' '+row.email+' '+(row.is_active?'권한 해제':'권한 부여'));
  button.onclick=async()=>{button.disabled=true;try{await call('permission_set',{shop_id:row.shop_id,email:row.email,enabled:!row.is_active});await load();status('매장 등록 권한을 변경했습니다.')}catch(e){status(e.message)}finally{button.disabled=false}};
  item.append(copy,button);root.append(item);
 }
 if(!d.rows?.length)root.textContent='아직 부여한 매장 등록 권한이 없습니다.';
}
$('gradedPermissionForm').onsubmit=async e=>{
 e.preventDefault();const b=$('gradedGrantBtn');b.disabled=true;
 try{await call('permission_set',{shop_id:$('gradedPermissionShop').value,email:$('gradedPermissionEmail').value.trim(),enabled:true});$('gradedPermissionEmail').value='';await load();status('매장 등록 권한을 부여했습니다.')}catch(e){status(e.message)}finally{b.disabled=false}
};
async function boot(){
 if(!token){status('전체 관리자 로그인 후 매장 등록 권한을 설정할 수 있습니다.');return}
 const d=await call('bootstrap');if(d.is_admin!==true){status('전체 관리자만 매장 등록 권한을 관리할 수 있습니다.');return}
 for(const shop of d.shops||[])$('gradedPermissionShop').add(new Option(shop.name+(shop.kind==='online'?' · 온라인샵':''),shop.id));
 $('gradedPermissionForm').hidden=!d.shops?.length;await load();status(d.shops?.length?'카드샵과 가입 이메일을 지정해주세요.':'등록 가능한 카드샵이 없습니다.');
}
boot().catch(e=>status('매장 권한 조회 실패: '+e.message));
})();
