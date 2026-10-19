/* FUNY PIN private admin auth bridge */
(function(){
  'use strict';
  if(window.FUNY_WEB_AUTH?.__garaponAdminBridge)return;

  const BASE='https://wdttzpbmqavaqfcbaywj.supabase.co';
  const KEY='sb_publishable__wrSzngSE-JbGnyE7PZX9w_2QaW8bpq';
  const TOKEN_KEY='funypin_admin_token';
  const REFRESH_KEY='funypin_admin_refresh';
  const RETURN_KEY='funypin_admin_return';
  const HANDOFF_KEY='funypin_admin_handoff_v1';
  const HANDOFF_MAX_AGE=2*60*1000;

  let token='';
  let refreshToken='';
  let currentSession=null;
  let readyPromise=null;

  function safeReturn(value){
    try{
      const url=new URL(value||location.href,location.origin);
      if(url.origin!==location.origin)return '/admin.html';
      const allowed=/^\/(?:admin-garapon-(?:event|ops)-test|admin-missions)\.html$/i.test(url.pathname);
      return allowed?url.pathname+url.search+url.hash:'/admin.html';
    }catch(_){return '/admin.html'}
  }

  function decodeJwt(value){
    try{
      const part=String(value||'').split('.')[1]||'';
      if(!part)return{};
      const base64=part.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(part.length/4)*4,'=');
      const bytes=Uint8Array.from(atob(base64),ch=>ch.charCodeAt(0));
      return JSON.parse(new TextDecoder().decode(bytes));
    }catch(_){return{}}
  }

  function readHandoff(){
    let payload=null;
    try{
      const raw=localStorage.getItem(HANDOFF_KEY)||'';
      if(raw)payload=JSON.parse(raw);
      localStorage.removeItem(HANDOFF_KEY);
    }catch(_){}
    if(!payload){
      try{
        const prefix='FUNYPIN_ADMIN_HANDOFF:';
        if(String(window.name||'').startsWith(prefix))payload=JSON.parse(decodeURIComponent(String(window.name).slice(prefix.length)));
      }catch(_){}
    }
    try{if(String(window.name||'').startsWith('FUNYPIN_ADMIN_HANDOFF:'))window.name=''}catch(_){}
    if(!payload||!payload.access_token)return null;
    const age=Date.now()-Number(payload.created_at||0);
    if(!Number.isFinite(age)||age<0||age>HANDOFF_MAX_AGE)return null;
    return payload;
  }

  function adoptHandoff(){
    const payload=readHandoff();
    if(!payload)return false;
    token=String(payload.access_token||'').trim();
    refreshToken=String(payload.refresh_token||'').trim();
    if(!token)return false;
    try{
      sessionStorage.setItem(TOKEN_KEY,token);
      if(refreshToken)sessionStorage.setItem(REFRESH_KEY,refreshToken);
      else sessionStorage.removeItem(REFRESH_KEY);
    }catch(_){}
    return true;
  }

  function loadStoredSession(){
    try{
      token=sessionStorage.getItem(TOKEN_KEY)||'';
      refreshToken=sessionStorage.getItem(REFRESH_KEY)||'';
    }catch(_){}
  }

  function clearSession(){
    token='';
    refreshToken='';
    currentSession=null;
    try{
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem(HANDOFF_KEY);
    }catch(_){}
    try{if(String(window.name||'').startsWith('FUNYPIN_ADMIN_HANDOFF:'))window.name=''}catch(_){}
  }

  function rememberReturn(value){
    try{sessionStorage.setItem(RETURN_KEY,safeReturn(value))}catch(_){}
  }

  function goLogin(returnTo){
    const target=safeReturn(returnTo||location.href);
    rememberReturn(target);
    location.replace('/admin-garapon-login.html?return='+encodeURIComponent(target));
  }

  async function refreshSession(){
    if(!refreshToken)throw new Error('ADMIN_SESSION_EXPIRED');
    const response=await fetch(BASE+'/auth/v1/token?grant_type=refresh_token',{
      method:'POST',
      headers:{apikey:KEY,'Content-Type':'application/json'},
      body:JSON.stringify({refresh_token:refreshToken})
    });
    let data={};
    try{data=await response.json()}catch(_){}
    if(!response.ok||!data.access_token)throw new Error(data.message||'ADMIN_SESSION_REFRESH_FAILED');
    token=data.access_token;
    refreshToken=data.refresh_token||refreshToken;
    sessionStorage.setItem(TOKEN_KEY,token);
    sessionStorage.setItem(REFRESH_KEY,refreshToken);
    return token;
  }

  async function request(path,options={},retried=false){
    if(!token)throw new Error('ADMIN_LOGIN_REQUIRED');
    const headers={apikey:KEY,Authorization:'Bearer '+token,'Content-Type':'application/json',...(options.headers||{})};
    const response=await fetch(BASE+path,{...options,headers});
    if(!response.ok){
      let body={};
      try{body=await response.clone().json()}catch(_){}
      const message=body.message||body.error_description||body.error||'';
      if(!retried&&(response.status===401||/jwt|expired|invalid token/i.test(message))&&refreshToken){
        await refreshSession();
        return request(path,options,true);
      }
      const error=new Error(message||('HTTP '+response.status));
      error.status=response.status;
      error.code=body.code||body.error||'';
      throw error;
    }
    if(response.status===204)return null;
    const raw=await response.text();
    return raw?JSON.parse(raw):null;
  }

  const client={
    async rpc(name,body={}){
      try{
        const data=await request('/rest/v1/rpc/'+encodeURIComponent(name),{
          method:'POST',
          body:JSON.stringify(body||{})
        });
        return{data,error:null};
      }catch(error){return{data:null,error}}
    }
  };

  async function init(){
    if(readyPromise)return readyPromise;
    readyPromise=(async()=>{
      // Prefer the newest one-time token handed over by the integrated admin.
      // This also works when a previous private-admin token remains in sessionStorage.
      if(!adoptHandoff())loadStoredSession();
      if(!token)return null;
      try{
        // The integrated admin deliberately clears the customer Supabase session after
        // adopting it. Because of that, /auth/v1/user may reject an otherwise valid JWT.
        // Authorisation is therefore verified directly through the admin RPC, which is
        // the same server-side check used by admin.html.
        const allowed=await request('/rest/v1/rpc/is_funypin_admin',{method:'POST',body:'{}'});
        if(allowed!==true)throw new Error('ADMIN_REQUIRED');
        const claims=decodeJwt(token);
        const user={
          id:claims.sub||'',
          email:claims.email||claims.user_metadata?.email||'',
          role:claims.role||'',
          aud:claims.aud||'',
          user_metadata:claims.user_metadata||{},
          app_metadata:claims.app_metadata||{}
        };
        currentSession={access_token:token,refresh_token:refreshToken,user};
        return currentSession;
      }catch(error){
        console.warn('[PRIVATE ADMIN AUTH]',error);
        clearSession();
        return null;
      }
    })();
    return readyPromise;
  }

  async function signOut(){clearSession();return{ok:true}}

  window.FUNY_WEB_AUTH={
    __garaponAdminBridge:true,
    init,
    get client(){return client},
    get session(){return currentSession},
    getSession:async()=>{await init();return currentSession},
    getUser:async()=>{await init();return currentSession?.user||null},
    signOut,
    goLogin,
    requireLogin:async returnTo=>{const session=await init();if(session)return session;goLogin(returnTo||location.href);return null},
    rememberReturn,
    consumeReturn(){
      let value='/admin.html';
      try{value=sessionStorage.getItem(RETURN_KEY)||value;sessionStorage.removeItem(RETURN_KEY)}catch(_){}
      return safeReturn(value);
    },
    isAppShell:()=>false,
    onChange:()=>()=>{}
  };
})();
