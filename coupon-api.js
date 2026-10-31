/* Coupon transport: reuse the existing admin/web session and server-side authorization. */
(function(){'use strict';
 const imageBase='https://wdttzpbmqavaqfcbaywj.supabase.co/storage/v1/object/public/coupon-benefits/';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function imageURL(value){try{const u=new URL(value);return u.href.startsWith(imageBase)&&/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(u.href.slice(imageBase.length))?u.href:''}catch{return ''}}
 function state(x,now=Date.now()){
  if(x.status==='used')return '사용 완료';if(x.status==='cancelled')return '발급 취소';if(x.status!=='issued')return '사용 불가';
  if(x.expires_at&&new Date(x.expires_at).getTime()<=now)return '기간 만료';
  const start=x.starts_at||x.metadata?.starts_at;if(start&&new Date(start).getTime()>now)return '사용 예정';return '사용 가능';
 }
 const date=v=>v?new Date(v).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}):'-';
 function create(){
  const auth=window.FunyMainBannerAdminAuth.create();
  async function request(path,options={}){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),20000);try{const r=await auth.request(path,{...options,signal:controller.signal});const data=await r.json().catch(()=>null);if(!r.ok){const error=Error(data?.message||data?.error||'요청을 처리하지 못했습니다.');error.status=r.status;error.code=data?.code;throw error}if(data===null)throw Error('응답 내용을 확인하지 못했습니다. 처리 결과를 조회한 뒤 재시도해주세요.');return data}catch(e){if(e.name==='AbortError')throw Error('응답 시간이 초과됐습니다. 처리 결과를 조회한 뒤 다시 시도해주세요.');throw e}finally{clearTimeout(timer)}}
  return{init:()=>auth.init(),rpc:(name,args={})=>request('/rest/v1/rpc/'+name,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(args)}),
   async upload(file){const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];if(!ext||!file.size||file.size>5242880)throw Error('JPG·PNG·WEBP 이미지, 최대 5MB까지 등록할 수 있습니다.');try{const bitmap=await createImageBitmap(file);const tooLarge=bitmap.width*bitmap.height>40000000;bitmap.close();if(tooLarge)throw Error('too large')}catch{throw Error('이미지를 읽을 수 없거나 해상도가 너무 큽니다. 다른 이미지를 선택해주세요.')}const path=crypto.randomUUID()+'.'+ext;await request('/storage/v1/object/coupon-benefits/'+path,{method:'POST',headers:{'Content-Type':file.type,'x-upsert':'false'},body:file});return path}
  };
 }
 window.FunyCoupons={create,esc,state,date,imageURL,imageBase};
})();
