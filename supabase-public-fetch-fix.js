/* FUNY PIN public Supabase REST compatibility for sb_publishable__ keys. */
(function(){
  const nativeFetch=window.fetch.bind(window);
  const host='wdttzpbmqavaqfcbaywj.supabase.co';
  window.fetch=function(input,init){
    try{
      const url=new URL(typeof input==='string'?input:input.url,location.href);
      if(url.hostname===host&&url.pathname.startsWith('/rest/v1/')){
        const next={...(init||{})};
        const headers=new Headers(next.headers||(input instanceof Request?input.headers:undefined));
        const auth=headers.get('authorization')||'';
        if(/^Bearer\s+sb_publishable__/i.test(auth)) headers.delete('authorization');
        next.headers=headers;
        if(input instanceof Request){
          const req=new Request(input,next);
          return nativeFetch(req);
        }
        return nativeFetch(input,next);
      }
    }catch(_){ }
    return nativeFetch(input,init);
  };
})();
