/* FUNY PIN Google Maps config
 * Google Cloud Console에서 발급한 브라우저 API 키를 아래 문자열에 입력하세요.
 */
window.FUNY_GOOGLE_MAPS_API_KEY='AIzaSyDBSPRs1jnfePKN9ZvZuyUWvlreMeAXYmw';

/*
 * Supabase publishable-key compatibility + FUNY MON schedule-target bridge.
 * Schedule events are presented to the existing FUNY MON renderer as virtual
 * map targets, while capture requests are translated back to the event UUID.
 */
(function(){
  const nativeFetch=window.fetch.bind(window);
  const supabaseHost='wdttzpbmqavaqfcbaywj.supabase.co';
  const schedulePrefix='FUNY-SCHEDULE:';
  const isAdmin=/\/admin(?:\.html)?$/.test(location.pathname);
  window.fetch=async function(input,init){
    try{
      const rawUrl=typeof input==='string'?input:input?.url;
      const url=new URL(rawUrl,location.href);
      let nextInit={...(init||{})};
      const headers=new Headers(nextInit.headers||(typeof input!=='string'&&input?.headers)||undefined);
      const auth=headers.get('Authorization')||'';
      if(url.hostname===supabaseHost&&url.pathname.startsWith('/rest/v1/')&&/^Bearer\s+sb_publishable__/i.test(auth)){
        headers.delete('Authorization');nextInit.headers=headers;
      }

      if(!isAdmin&&url.hostname===supabaseHost&&url.pathname==='/rest/v1/funy_mon_events'&&String(nextInit.method||'GET').toUpperCase()==='GET'){
        const select=url.searchParams.get('select')||'';
        if(select.includes('spawn_count')){
          const extras=['target_type','schedule_event_id','target_latitude','target_longitude','target_name_snapshot','target_location_snapshot'];
          const fields=select.split(',').filter(Boolean);extras.forEach(x=>{if(!fields.includes(x))fields.push(x)});url.searchParams.set('select',fields.join(','));
          const res=await nativeFetch(url.href,nextInit);if(!res.ok)return res;
          const data=await res.json();
          if(Array.isArray(data))data.forEach(ev=>{
            if(ev.target_type!=='schedule'||ev.target_latitude==null||ev.target_longitude==null)return;
            const virtualId=schedulePrefix+ev.id;
            try{
              if(typeof SHOPS!=='undefined'&&!SHOPS.some(s=>s.id===virtualId))SHOPS.push({id:virtualId,name:ev.target_name_snapshot||'TCG 일정',name_en:'',address:ev.target_location_snapshot||'',is_active:true,_coord:{lat:Number(ev.target_latitude),lng:Number(ev.target_longitude)}});
            }catch(_){}
            ev.shop_id=virtualId;
          });
          const h=new Headers(res.headers);h.delete('content-length');h.set('content-type','application/json; charset=utf-8');return new Response(JSON.stringify(data),{status:res.status,statusText:res.statusText,headers:h});
        }
      }

      if(url.hostname===supabaseHost&&url.pathname==='/functions/v1/funy-mon-catch'&&String(nextInit.method||'GET').toUpperCase()==='POST'&&typeof nextInit.body==='string'){
        try{const body=JSON.parse(nextInit.body);if(typeof body.shop_id==='string'&&body.shop_id.startsWith(schedulePrefix)){body.event_id=body.shop_id.slice(schedulePrefix.length);body.shop_id='';nextInit.body=JSON.stringify(body)}}catch(_){}
      }
      return nativeFetch(input,nextInit);
    }catch(_){return nativeFetch(input,init)}
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
  const scheduleTargetScript=document.createElement('script');
  scheduleTargetScript.src='assets/admin/funymon-schedule-target.js?v=20260929-2';
  scheduleTargetScript.defer=true;
  document.head.appendChild(scheduleTargetScript);
}
