// FUNY PIN shop activity collector v1.  Anonymous aggregate analytics, never raw IP storage.
const API=Deno.env.get('SUPABASE_URL')||'';
const SERVICE=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const allowed=new Set(['https://funypin.kr','https://www.funypin.kr']);
const types=new Set(['detail_view','share_click','directions_click']);
const encoder=new TextEncoder();
function cors(origin:string|null){return {'Access-Control-Allow-Origin':origin&&allowed.has(origin)?origin:'https://funypin.kr','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, apikey, Authorization','Vary':'Origin','Content-Type':'application/json','Cache-Control':'no-store'};}
function reply(code:number,payload:unknown,origin:string|null){return new Response(JSON.stringify(payload),{status:code,headers:cors(origin)});}
async function hash(value:string,secret:string){
 const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signed=new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(value)));
 return Array.from(signed,b=>b.toString(16).padStart(2,'0')).join('');
}
Deno.serve(async(req)=>{
 const origin=req.headers.get('origin');
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors(origin)});
 if(req.method!=='POST')return reply(405,{ok:false,reason:'method'},origin);
 if(origin&&!allowed.has(origin))return reply(403,{ok:false,reason:'origin'},origin);
 if(Number(req.headers.get('content-length')||0)>2048)return reply(413,{ok:false,reason:'size'},origin);
 let body:Record<string,unknown>;
 try{body=await req.json();if(!body||typeof body!=='object'||Array.isArray(body))throw Error('body');}
 catch{return reply(400,{ok:false,reason:'json'},origin);}
 const shop=String(body.shop_id||''),kind=String(body.event_type||'');
 if(!/^(KR|JP)-[A-Z]{3}-\d{3}$/.test(shop)||!types.has(kind))return reply(400,{ok:false,reason:'event'},origin);
 if(!API||!SERVICE)return reply(503,{ok:false,reason:'unconfigured'},origin);
 // The server derives this key; clients cannot choose the deduplication identity.
 const ip=req.headers.get('cf-connecting-ip')||req.headers.get('x-real-ip')||req.headers.get('x-forwarded-for')?.split(',')[0].trim()||'';
 const ua=(req.headers.get('user-agent')||'').slice(0,150);
 // Never retain or transmit raw IP/UA.  Short-lived (daily) pseudonym.
 const identity=ip?ip+'|'+ua:'fallback|'+ua+'|'+String(body.visitor_id||'').slice(0,40);
 const day=new Date().toISOString().slice(0,10);
 const actor=await hash('shop-activity-v1|'+day+'|'+identity,SERVICE);
 const surface=body.client_surface==='app_webview'?'app_webview':'web';
 const platform=['ios','android','web'].includes(String(body.app_platform))?String(body.app_platform):'unknown';
 try{
  const response=await fetch(API+'/rest/v1/rpc/ingest_shop_activity',{
    method:'POST',
    headers:{'apikey':SERVICE,'Authorization':'Bearer '+SERVICE,'Content-Type':'application/json'},
    body:JSON.stringify({p_shop_id:shop,p_event_type:kind,p_actor_key:actor,p_client_surface:surface,p_app_platform:platform}),
    signal:AbortSignal.timeout(6000)
  });
  if(!response.ok){console.error('activity ingest failed',response.status);return reply(503,{ok:false,reason:'storage'},origin);}
  const recorded=await response.json();
  return reply(202,{ok:true,recorded:recorded===true},origin);
 }catch(e){console.error('activity ingest unavailable',String(e).slice(0,90));return reply(503,{ok:false,reason:'unavailable'},origin);}
});
