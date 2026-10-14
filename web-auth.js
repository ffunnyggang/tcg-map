/* FUNY PIN web auth v1 */
(function(){
  if(window.FUNY_WEB_AUTH)return;
  const SUPABASE_URL='https://wdttzpbmqavaqfcbaywj.supabase.co';
  const SUPABASE_KEY='sb_publishable__wrSzngSE-JbGnyE7PZX9w_2QaW8bpq';
  const SDK='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/dist/umd/supabase.min.js';
  const RETURN_KEY='funy-web-auth-return';
  const listeners=new Set();
  let client=null,readyPromise=null,currentSession=null;

  const isAppShell=()=>{
    try{
      const q=new URLSearchParams(location.search);
      return q.get('app')==='1'||!!window.ReactNativeWebView||document.documentElement.classList.contains('app-shell')||document.documentElement.classList.contains('android-app-shell');
    }catch(_){return !!window.ReactNativeWebView}
  };
  const lang=()=>{try{return localStorage.getItem('funy-pin-lang')==='en'?'en':'ko'}catch(_){return'ko'}};
  const emit=()=>{listeners.forEach(fn=>{try{fn(currentSession)}catch(_){}});try{window.dispatchEvent(new CustomEvent('funy:web-auth-change',{detail:{loggedIn:!!currentSession,user:currentSession?.user||null}}))}catch(_){}};

  function clearStoredAuth(){
    clearStoredAuth();
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
      client=sdk.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,flowType:'pkce'}});
      try{
        const u=new URL(location.href),code=u.searchParams.get('code');
        if(code){
          const {error}=await client.auth.exchangeCodeForSession(code);
          if(error)throw error;
          u.searchParams.delete('code');history.replaceState(history.state,'',u.pathname+(u.search||'')+u.hash);
        }
      }catch(e){console.warn('[FUNY WEB AUTH] callback exchange failed',e)}
      const {data}=await client.auth.getSession();
      currentSession=data?.session||null;
      if(currentSession){
        try{
          const {data:userData,error:userError}=await client.auth.getUser();
          if(userError||!userData?.user){clearStoredAuth();currentSession=null}
        }catch(_){clearStoredAuth();currentSession=null}
      }
      client.auth.onAuthStateChange((_event,session)=>{currentSession=session||null;emit()});
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
    let error=null;
    try{
      const result=await client.auth.signOut({scope:'local'});
      error=result?.error||null;
    }catch(e){error=e}
    try{
      const prefix='sb-wdttzpbmqavaqfcbaywj-auth-token';
      for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k&&(k===prefix||k.startsWith(prefix+'.')||k.startsWith(prefix+'-')))localStorage.removeItem(k)}
    }catch(_){}
    currentSession=null;emit();
    if(error&&String(error?.code||error?.message||'').toLowerCase().includes('session_not_found')===false&&Number(error?.status||0)!==403){
      console.warn('[FUNY WEB AUTH] local sign-out warning',error);
    }
    return{ok:true}
  }
  async function getProfile(){
    await init();const user=currentSession?.user;if(!user)return null;
    const {data,error}=await client.from('profiles').select('nickname,avatar_url').eq('user_id',user.id).maybeSingle();
    if(error)return null;return data||null;
  }
  function goLogin(returnTo){rememberReturn(returnTo||location.href);location.href='/login.html';}
  async function requireLogin(returnTo){await init();if(currentSession)return currentSession;goLogin(returnTo||location.href);return null}

  window.FUNY_WEB_AUTH={
    init,get client(){return client},get session(){return currentSession},getSession:async()=>{await init();return currentSession},
    getUser:async()=>{await init();return currentSession?.user||null},getProfile,signInSocial,signOut,goLogin,requireLogin,
    consumeReturn,rememberReturn,isAppShell,onChange(fn){listeners.add(fn);return()=>listeners.delete(fn)}
  };
  init().catch(e=>console.warn('[FUNY WEB AUTH] init failed',e));
})();