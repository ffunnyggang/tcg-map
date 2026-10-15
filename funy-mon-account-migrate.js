/* FUNY MON anonymous -> account migration */
(function(){
  'use strict';
  if(window.FUNY_FUNYMON_ACCOUNT_MIGRATE)return;
  const ENDPOINT='https://wdttzpbmqavaqfcbaywj.supabase.co/functions/v1/funy-mon-migrate-account';
  const KEY='sb_publishable__wrSzngSE-JbGnyE7PZX9w_2QaW8bpq';
  const ANON_KEY='funypin_mon_anon_id';
  const DONE_PREFIX='funypin_mon_account_migrated_v2:';
  const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  let running=null;

  function jwtSub(token){
    try{
      const raw=String(token||'').split('.')[1];if(!raw)return'';
      const s=raw.replace(/-/g,'+').replace(/_/g,'/');
      return String(JSON.parse(decodeURIComponent(Array.from(atob(s.padEnd(Math.ceil(s.length/4)*4,'='))).map(c=>'%'+c.charCodeAt(0).toString(16).padStart(2,'0')).join(''))).sub||'');
    }catch(_){return''}
  }
  async function auth(){
    const nativeToken=String(window.__FUNY_ACCESS_TOKEN||'').trim();
    if(nativeToken)return{token:nativeToken,userId:jwtSub(nativeToken)};
    const A=window.FUNY_WEB_AUTH;
    if(A){
      try{await A.init()}catch(_){}
      const token=String(A.session?.access_token||'').trim();
      if(token)return{token,userId:String(A.session?.user?.id||jwtSub(token))};
    }
    return{token:'',userId:''};
  }
  function anonymousId(){try{return String(localStorage.getItem(ANON_KEY)||'').trim().toLowerCase()}catch(_){return''}}
  function doneKey(userId,anon){return DONE_PREFIX+userId+':'+anon}
  function alreadyDone(userId,anon){try{return !!localStorage.getItem(doneKey(userId,anon))}catch(_){return false}}
  function markDone(userId,anon,data){try{localStorage.setItem(doneKey(userId,anon),JSON.stringify({at:Date.now(),result:data||null}))}catch(_){}}

  async function run(options){
    if(running)return running;
    running=(async()=>{
      const anon=anonymousId();
      if(!UUID.test(anon))return{ok:true,skipped:'no_anonymous_identity'};
      const a=await auth();
      if(!a.token||!a.userId)return{ok:true,skipped:'not_authenticated'};
      if(!options?.force&&alreadyDone(a.userId,anon))return{ok:true,skipped:'already_migrated'};
      const res=await fetch(ENDPOINT,{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+a.token,'Content-Type':'application/json'},body:JSON.stringify({anonymous_id:anon}),cache:'no-store'});
      const data=await res.json().catch(()=>({error:'invalid_response'}));
      if(!res.ok||!data?.ok){
        const e=new Error(String(data?.error||'migration_failed'));e.status=res.status;e.data=data;throw e;
      }
      markDone(a.userId,anon,data);
      try{window.dispatchEvent(new CustomEvent('funy:funymon-account-migrated',{detail:data}))}catch(_){}
      return data;
    })();
    try{return await running}finally{running=null}
  }

  window.FUNY_FUNYMON_ACCOUNT_MIGRATE={run};
  setTimeout(()=>run().catch(e=>console.warn('[FUNY MON migrate]',e?.message||e)),0);
})();