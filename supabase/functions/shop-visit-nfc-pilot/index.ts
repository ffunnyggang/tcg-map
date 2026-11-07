import { createClient } from "npm:@supabase/supabase-js@2.57.0";
const BASE=Deno.env.get("SUPABASE_URL")||"";
const SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const ANON=Deno.env.get("SUPABASE_ANON_KEY")||"";
const admin=createClient(BASE,SERVICE,{auth:{autoRefreshToken:false,persistSession:false}});
const ORIGINS=new Set(["https://funypin.kr","https://www.funypin.kr"]);
const hex=(a:Uint8Array)=>Array.from(a).map(n=>n.toString(16).padStart(2,"0")).join("");
const sha=async(v:string)=>hex(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v))));
const token=()=>{const a=new Uint8Array(24);crypto.getRandomValues(a);return hex(a)};
const reToken=/^[0-9a-f]{48}$/;
const reShop=/^KR-[A-Za-z0-9-]{3,48}$/;
Deno.serve(async req=>{
 const origin=req.headers.get("origin")||"";
 const h:Record<string,string>={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Vary":"Origin","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS"};
 if(ORIGINS.has(origin))h["Access-Control-Allow-Origin"]=origin;
 const send=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:h});
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:h});
 if(req.method!=="POST")return send({ok:false,error:"method_not_allowed"},405);
 if(origin&&!ORIGINS.has(origin))return send({ok:false,error:"origin_denied"},403);
 let data:Record<string,unknown>;
 try{data=await req.json();if(!data||typeof data!=="object")throw Error("invalid")}catch{return send({ok:false,error:"invalid_request"},400)}
 const action=String(data.action||"");
 const tag=String(data.token||"").toLowerCase();
 try{
  // Public, read-only tag landing: no visit record and no account information.
  if(action==="info"){
   if(!reToken.test(tag))return send({ok:false,error:"invalid_tag"},400);
   const digest=await sha(tag);
   const {data:row,error}=await admin.from("shop_visit_nfc_tags").select("id,shop_id,status,shops!inner(name,is_active,country_code)").eq("token_hash",digest).eq("status","active").eq("shops.is_active",true).eq("shops.country_code","KR").maybeSingle();
   if(error)throw error;
   if(!row)return send({ok:false,error:"invalid_tag"},404);
   const shop=Array.isArray(row.shops)?row.shops[0]:row.shops;
   return send({ok:true,shop_id:row.shop_id,shop_name:shop?.name||"카드샵",pilot:true});
  }
  const bearer=req.headers.get("authorization")||"";
  const jwt=bearer.match(/^Bearer\s+(.+)$/i)?.[1];
  if(!jwt)return send({ok:false,error:"login_required"},401);
  const {data:auth,error:authError}=await admin.auth.getUser(jwt);
  if(authError||!auth.user?.id)return send({ok:false,error:"login_required"},401);
  const uid=auth.user.id;
  const authorizedAdmin=async()=>{
   const scoped=createClient(BASE,ANON,{global:{headers:{Authorization:bearer}},auth:{autoRefreshToken:false,persistSession:false}});
   const {data:yes,error}=await scoped.rpc("is_funypin_admin");
   return !error&&yes===true;
  };
  if(action==="admin_list"||action==="admin_create"||action==="admin_disable"){
   if(!await authorizedAdmin())return send({ok:false,error:"forbidden"},403);
   if(action==="admin_list"){
    const {data:tags,error}=await admin.from("shop_visit_nfc_tags").select("id,shop_id,tag_type,status,label,created_at,revoked_at").order("created_at",{ascending:false}).limit(100);
    if(error)throw error;
    return send({ok:true,tags:tags||[]});
   }
   if(action==="admin_create"){
    const shopId=String(data.shop_id||"");
    if(!reShop.test(shopId))return send({ok:false,error:"invalid_shop"},400);
    const {data:shop,error:shopError}=await admin.from("shops").select("id,name,is_active,country_code").eq("id",shopId).maybeSingle();
    if(shopError)throw shopError;
    if(!shop?.is_active||shop.country_code!=="KR")return send({ok:false,error:"invalid_shop"},400);
    const raw=token();
    const label=String(data.label||"").trim().slice(0,50);
    const {data:insert,error}=await admin.from("shop_visit_nfc_tags").insert({shop_id:shopId,token_hash:await sha(raw),tag_type:"ntag213",status:"active",label,created_by:uid}).select("id").single();
    if(error)throw error;
    return send({ok:true,tag_id:insert.id,shop_id:shopId,shop_name:shop.name,tag_type:"ntag213",url:"https://funypin.kr/nfc.html?t="+raw});
   }
   const id=String(data.tag_id||"");
   if(!/^[0-9a-f-]{36}$/.test(id))return send({ok:false,error:"invalid_tag"},400);
   const {data:updated,error}=await admin.from("shop_visit_nfc_tags").update({status:"revoked",revoked_at:new Date().toISOString()}).eq("id",id).eq("status","active").select("id").maybeSingle();
   if(error)throw error;
   return send({ok:!!updated});
  }
  if(action==="checkin"){
   if(!reToken.test(tag))return send({ok:false,error:"invalid_tag"},400);
   const lat=Number(data.lat),lng=Number(data.lng),accuracy=Number(data.accuracy),fixTime=Number(data.fix_time);
   if(!Number.isFinite(lat)||!Number.isFinite(lng)||!Number.isFinite(accuracy)||!Number.isFinite(fixTime)||Math.abs(Date.now()-fixTime)>30000)return send({ok:false,error:"invalid_request"},400);
   const digest=await sha(tag);
   const {data:result,error}=await admin.rpc("nfc_pilot_verify",{p_user:uid,p_token_hash:digest,p_lat:lat,p_lng:lng,p_accuracy:accuracy});
   if(error)throw error;
   const reason=result?.ok?(result.new?"success":"already_checked_in"):String(result?.error||"invalid_request");
   const allowed=new Set(["success","already_checked_in","invalid_tag","low_accuracy","too_far","invalid_request","rate_limited","server_error"]);
   // Failure/success audit is best effort; no token, raw location or credential is logged.
   await admin.from("shop_visit_nfc_attempts").insert({user_id:uid,result:allowed.has(reason)?reason:"invalid_request"}).then(()=>{});
   return send(result,result?.ok?200:400);
  }
  return send({ok:false,error:"unknown_action"},400);
 }catch(e){
  console.error("nfc-pilot",action,e instanceof Error?e.message:"unexpected");
  return send({ok:false,error:"server_error"},500);
 }
});
