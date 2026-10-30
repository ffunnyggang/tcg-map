/* Authentication transport scoped to the main-banner administrator page. */
(()=>{'use strict';const BASE='https://wdttzpbmqavaqfcbaywj.supabase.co',KEY='sb_publishable__wrSzngSE-JbGnyE7PZX9w_2QaW8bpq';
function create(){let mode='',token='',refreshing=null;
 const expired=value=>{try{const part=value.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'),d=JSON.parse(atob(part));return typeof d.exp==='number'&&d.exp*1000<Date.now()+60000}catch{return false}};
 const loginError=()=>new Error('로그인 세션을 갱신하지 못했습니다. 입력 내용은 유지됩니다. 관리자 로그인 후 다시 시도해주세요.');
 async function init(){if(sessionStorage.getItem('funypin_admin_token')){mode='admin';token=sessionStorage.getItem('funypin_admin_token')}else{mode='web';await window.FUNY_WEB_AUTH?.init?.();token=window.FUNY_WEB_AUTH?.session?.access_token||''}if(!token)throw Error('로그인이 필요합니다.');return token}
 async function refresh(failedToken){if(refreshing)return refreshing;
  refreshing=(async()=>{if(mode==='admin'){const stored=sessionStorage.getItem('funypin_admin_token')||'';if(stored&&stored!==failedToken&&!expired(stored)){token=stored;return token}const refreshToken=sessionStorage.getItem('funypin_admin_refresh');if(!refreshToken)throw loginError();let r,d;try{r=await fetch(BASE+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:refreshToken})});d=await r.json()}catch{throw loginError()}if(!r.ok||!d.access_token)throw loginError();token=d.access_token;sessionStorage.setItem('funypin_admin_token',token);sessionStorage.setItem('funypin_admin_refresh',d.refresh_token||refreshToken);return token}
   const A=window.FUNY_WEB_AUTH,current=A?.session?.access_token;if(current&&current!==failedToken&&!expired(current)){token=current;return token}const result=await A?.client?.auth?.refreshSession();if(result?.error||!result?.data?.session?.access_token)throw loginError();token=result.data.session.access_token;return token;
  })();try{return await refreshing}finally{refreshing=null}}
 async function request(path,options={}){if(!mode)await init();const latest=mode==='admin'?sessionStorage.getItem('funypin_admin_token'):window.FUNY_WEB_AUTH?.session?.access_token;if(!latest)throw loginError();token=latest;if(expired(token))await refresh(token);const sent=token;
  const send=()=>fetch(BASE+path,{...options,headers:{...options.headers,apikey:KEY,Authorization:'Bearer '+token}});let r=await send();if(!r.ok){let d={};try{d=await r.clone().json()}catch{}if(r.status===401||/JWT expired/i.test(String(d.message||d.error_description||d.error||''))){await refresh(sent);r=await send();if(r.status===401)throw loginError()}}return r;
 }
 return {init,request};
}
window.FunyMainBannerAdminAuth={create};
})();
