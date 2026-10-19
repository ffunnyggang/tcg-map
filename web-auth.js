/* FUNY PIN web auth v1 */
(function(){
  if(window.FUNY_WEB_AUTH)return;
  const SUPABASE_URL='https://wdttzpbmqavaqfcbaywj.supabase.co';
  const SUPABASE_KEY='sb_publishable__wrSzngSE-JbGnyE7PZX9w_2QaW8bpq';
  const SDK='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/dist/umd/supabase.min.js';
  const RETURN_KEY='funy-web-auth-return';
  const listeners=new Set();
  let client=null,readyPromise=null,currentSession=null,nativeAccessToken='';

  const isAppShell=()=>{
    try{
      const q=new URLSearchParams(location.search);
      return q.get('app')==='1'||!!window.ReactNativeWebView||document.documentElement.classList.contains('app-shell')||document.documentElement.classList.contains('android-app-shell');
    }catch(_){return !!window.ReactNativeWebView}
  };
  const lang=()=>{try{return localStorage.getItem('funy-pin-lang')==='en'?'en':'ko'}catch(_){return'ko'}};
  const injectedAccessToken=()=>{try{return String(window.__FUNY_ACCESS_TOKEN||'').trim()}catch(_){return''}};
  const emit=()=>{listeners.forEach(fn=>{try{fn(currentSession)}catch(_){}});try{window.dispatchEvent(new CustomEvent('funy:web-auth-change',{detail:{loggedIn:!!currentSession,user:currentSession?.user||null}}))}catch(_){}};

  function clearStoredAuth(){
    try{
      const prefix='sb-wdttzpbmqavaqfcbaywj-auth-token';
      for(let i=localStorage.length-1;i>=0;i--){
        const k=localStorage.key(i);
        if(k&&(k===prefix||k.startsWith(prefix+'.')||k.startsWith(prefix+'-')))localStorage.removeItem(k);
      }
    }catch(_){}
  }

  function shouldDetachForIntegratedAdmin(){
    try{
      if(!/\/admin\.html$/i.test(location.pathname))return false;
      const copied=String(sessionStorage.getItem('funypin_admin_token')||'').trim();
      const current=String(currentSession?.access_token||'').trim();
      return !!copied&&!!current&&copied===current;
    }catch(_){return false}
  }

  function loadSdk(){
    if(window.supabase?.createClient)return Promise.resolve(window.supabase);
    return new Promise((resolve,reject)=>{
      const old=document.querySelector('script[data-funy-supabase-web]');
      if(old){old.addEventListener('load',()=>resolve(window.supabase),{once:true});old.addEventListener('error',()=>reject(new Error('AUTH_SDK_LOAD_FAILED')),{once:true});return}
      const s=document.createElement('script');s.src=SDK;s.async=true;s.dataset.funySupabaseWeb='1';
      s.onload=()=>resolve(window.supabase);s.onerror=()=>reject(new Error('AUTH_SDK_LOAD_FAILED'));document.head.appendChild(s);
    });
  }

  async function init(){
    if(readyPromise)return readyPromise;
    readyPromise=(async()=>{
      const sdk=await loadSdk();
      nativeAccessToken=isAppShell()?injectedAccessToken():'';
      const clientOptions={auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,flowType:'pkce'}};
      if(nativeAccessToken)clientOptions.global={headers:{Authorization:'Bearer '+nativeAccessToken}};
      client=sdk.createClient(SUPABASE_URL,SUPABASE_KEY,clientOptions);
      try{
        const u=new URL(location.href),code=u.searchParams.get('code');
        if(code){
          const {error}=await client.auth.exchangeCodeForSession(code);
          if(error)throw error;
          u.searchParams.delete('code');history.replaceState(history.state,'',u.pathname+(u.search||'')+u.hash);
        }
      }catch(e){console.warn('[FUNY WEB AUTH] callback exchange failed',e)}
      if(nativeAccessToken){
        try{
          const {data:userData,error:userError}=await client.auth.getUser(nativeAccessToken);
          currentSession=(!userError&&userData?.user)?{access_token:nativeAccessToken,token_type:'bearer',user:userData.user}:null;
        }catch(_){currentSession=null}
      }else{
        const {data}=await client.auth.getSession();
        currentSession=data?.session||null;
        if(currentSession){
          try{
            const {data:userData,error:userError}=await client.auth.getUser();
            if(userError||!userData?.user){clearStoredAuth();currentSession=null}
          }catch(_){clearStoredAuth();currentSession=null}
        }
      }
      client.auth.onAuthStateChange((_event,session)=>{
        if(nativeAccessToken&&!session)return;
        currentSession=session||null;emit()
      });
      emit();
      return currentSession;
    })();
    return readyPromise;
  }

  function safeReturn(value){
    try{
      const u=new URL(value,location.origin);
      if(u.origin!==location.origin)return '/';
      if(/\/login\.html$/i.test(u.pathname))return '/';
      return u.pathname+u.search+u.hash;
    }catch(_){return'/'}
  }
  function rememberReturn(value){
    try{localStorage.setItem(RETURN_KEY,safeReturn(value||location.href))}catch(_){}
  }
  function consumeReturn(){
    let v='/';try{v=localStorage.getItem(RETURN_KEY)||'/';localStorage.removeItem(RETURN_KEY)}catch(_){}
    return safeReturn(v);
  }
  async function signInSocial(provider,returnTo){
    if(isAppShell())throw new Error('APP_NATIVE_AUTH_ONLY');
    await init();let savedReturn='';try{savedReturn=localStorage.getItem(RETURN_KEY)||''}catch(_){}if(returnTo)rememberReturn(returnTo);else if(!savedReturn)rememberReturn(document.referrer||'/');
    const redirectTo=location.origin+'/login.html';
    const options={redirectTo};
    if(provider==='kakao')options.queryParams={scope:'profile_nickname profile_image'};
    const {data,error}=await client.auth.signInWithOAuth({provider,options});
    if(error)throw error;
    return data;
  }
  async function signOut(){
    await init();

    // admin.html temporarily adopts the normal web login only to verify the single
    // FUNY PIN administrator and then keeps its JWT/refresh token in sessionStorage.
    // A normal Supabase signOut would revoke that refresh token, so detach the public
    // web session locally while preserving the already-copied administrator session.
    if(shouldDetachForIntegratedAdmin()){
      try{client?.auth?.stopAutoRefresh?.()}catch(_){}
      clearStoredAuth();
      currentSession=null;emit();
      return{ok:true,detached:true}
    }

    let error=null;
    try{
      const result=await client.auth.signOut({scope:'local'});
      error=result?.error||null;
    }catch(e){error=e}
    clearStoredAuth();
    currentSession=null;emit();
    if(error&&String(error?.code||error?.message||'').toLowerCase().includes('session_not_found')===false&&Number(error?.status||0)!==403){
      console.warn('[FUNY WEB AUTH] local sign-out warning',error);
    }
    return{ok:true}
  }
  async function getUser(){
    await init();
    try{
      const token=nativeAccessToken||currentSession?.access_token||'';
      const result=token?await client.auth.getUser(token):await client.auth.getUser();
      const user=result?.data?.user||null;
      if(user&&currentSession)currentSession={...currentSession,user};
      return user||currentSession?.user||null;
    }catch(_){return currentSession?.user||null}
  }
  async function invokeFunction(name,body){
    await init();
    const token=nativeAccessToken||currentSession?.access_token||'';
    if(!token)throw new Error('LOGIN_REQUIRED');
    const res=await fetch(SUPABASE_URL+'/functions/v1/'+encodeURIComponent(String(name||'')),{
      method:'POST',
      headers:{
        'Authorization':'Bearer '+token,
        'apikey':SUPABASE_KEY,
        'Content-Type':'application/json'
      },
      body:JSON.stringify(body||{})
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok){
      const pickMessage=value=>{
        if(value==null)return '';
        if(typeof value==='string')return value;
        if(typeof value==='object'){
          const nested=value.message||value.error_description||value.error||value.msg;
          if(nested&&nested!==value)return pickMessage(nested);
          try{return JSON.stringify(value)}catch(_){return ''}
        }
        return String(value);
      };
      const message=pickMessage(data?.error)||pickMessage(data?.message)||pickMessage(data)||'요청을 처리하지 못했습니다.';
      const error=new Error(message);
      error.status=res.status;error.data=data;throw error;
    }
    return data;
  }
  async function getProfile(){
    await init();const user=await getUser();if(!user)return null;
    const {data,error}=await client.from('profiles').select('nickname,avatar_url').eq('user_id',user.id).maybeSingle();
    if(error)return null;return data||null;
  }
  function goLogin(returnTo){rememberReturn(returnTo||location.href);if(isAppShell()){location.href='funypin://account';return}location.href='/login.html';}
  async function requireLogin(returnTo){await init();if(currentSession)return currentSession;goLogin(returnTo||location.href);return null}

  window.FUNY_WEB_AUTH={
    init,get client(){return client},get session(){return currentSession},getSession:async()=>{await init();return currentSession},
    getUser,getProfile,invokeFunction,signInSocial,signOut,goLogin,requireLogin,
    consumeReturn,rememberReturn,isAppShell,onChange(fn){listeners.add(fn);return()=>listeners.delete(fn)}
  };
  init().catch(e=>console.warn('[FUNY WEB AUTH] init failed',e));
})();
