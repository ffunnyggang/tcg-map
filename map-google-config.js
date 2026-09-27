/* FUNY PIN Google Maps config
 * Google Cloud Console에서 발급한 브라우저 API 키를 아래 문자열에 입력하세요.
 */
window.FUNY_GOOGLE_MAPS_API_KEY='AIzaSyDBSPRs1jnfePKN9ZvZuyUWvlreMeAXYmw';

/*
 * Supabase publishable-key compatibility.
 * New sb_publishable__ keys belong in the apikey header; they are not JWTs
 * and must not be sent as Authorization: Bearer credentials.
 * Keep this narrowly scoped to FUNY PIN's public Supabase REST requests.
 */
(function(){
  const nativeFetch=window.fetch.bind(window);
  const supabaseHost='wdttzpbmqavaqfcbaywj.supabase.co';
  window.fetch=function(input,init){
    try{
      const rawUrl=typeof input==='string'?input:input?.url;
      const url=new URL(rawUrl,location.href);
      if(url.hostname===supabaseHost&&url.pathname.startsWith('/rest/v1/')){
        const nextInit={...(init||{})};
        const headers=new Headers(nextInit.headers||(typeof input!=='string'&&input?.headers)||undefined);
        const auth=headers.get('Authorization')||'';
        if(/^Bearer\s+sb_publishable__/i.test(auth)){
          headers.delete('Authorization');
          nextInit.headers=headers;
          return nativeFetch(input,nextInit);
        }
      }
    }catch(_){}
    return nativeFetch(input,init);
  };
})();

/* Admin-only modular extensions. Keep public map behavior unchanged. */
if (/\/admin(?:\.html)?$/.test(location.pathname)) {
  const historyStyle=document.createElement('link');
  historyStyle.rel='stylesheet';
  historyStyle.href='assets/admin/funymon-history.css?v=20260927-2';
  document.head.appendChild(historyStyle);
  const historyScript=document.createElement('script');
  historyScript.src='assets/admin/funymon-history.js?v=20260927-2';
  historyScript.defer=true;
  document.head.appendChild(historyScript);
  const attemptScript=document.createElement('script');
  attemptScript.src='assets/admin/funymon-attempt-history.js?v=20260927-3';
  attemptScript.defer=true;
  document.head.appendChild(attemptScript);
}
