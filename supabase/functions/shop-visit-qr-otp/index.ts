import { createClient } from "npm:@supabase/supabase-js@2.57.0";
const URL=Deno.env.get("SUPABASE_URL")||"";
const SR=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const PUB=Deno.env.get("SUPABASE_ANON_KEY")||"";
const allow=new Set(["https://funypin.kr","https://www.funypin.kr"]);
const admin=createClient(URL,SR,{auth:{persistSession:false,autoRefreshToken:false}});
const encode=(u:Uint8Array)=>Array.from(u).map(b=>b.toString(16).padStart(2,"0")).join("");
const random=(bytes:number)=>{const a=new Uint8Array(bytes);crypto.getRandomValues(a);return encode(a)};
const hash=async(s:string)=>encode(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s))));
const digits=()=>{const a=new Uint32Array(1);let n=0;do{crypto.getRandomValues(a);n=a[0]}while(n>=4294000000);return String(n%1000000).padStart(6,"0")};
Deno.serve(async(req)=>{
 const origin=req.headers.get("origin")||"";
 const headers:Record<string,string>={"Content-Type":"application/json","Cache-Control":"no-store","Vary":"Origin"};
 if(allow.has(origin))headers["Access-Control-Allow-Origin"]=origin;
 headers["Access-Control-Allow-Headers"]="authorization,apikey,content-type,x-client-info";
 headers["Access-Control-Allow-Methods"]="POST,OPTIONS";
 const send=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(req.method!=="POST")return send({ok:false,error:"method_not_allowed"},405);
 if(origin&&!allow.has(origin))return send({ok:false,error:"origin_denied"},403);
 const bearer=req.headers.get("authorization")||"";
 const jwt=bearer.match(/^Bearer\s+(.+)$/i)?.[1];
 if(!jwt)return send({ok:false,error:"login_required"},401);
 const {data:usr,error:authError}=await admin.auth.getUser(jwt);
 if(authError||!usr?.user?.id)return send({ok:false,error:"login_required"},401);
 const user=usr.user.id;
 let input:Record<string,unknown>;
 try{input=await req.json();if(!input||typeof input!=="object")throw Error("bad")}catch{return send({ok:false,error:"invalid_json"},400)}
 const action=String(input.action||"");
 const privileged=async()=>{
  const scoped=createClient(URL,PUB,{global:{headers:{Authorization:bearer}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await scoped.rpc("is_funypin_admin");
  return !error&&data===true;
 };
 try{
  if(action==="issue"){
   const token=String(input.token||"");
   if(!/^[a-f0-9]{64}$/.test(token))return send({ok:false,error:"invalid_tag"},400);
   const code=digits(),salt=random(16);
   const {data,error}=await admin.rpc("qr_visit_issue_atomic",{
    p_user:user,p_token_hash:await hash(token),p_salt:salt,p_code_hash:await hash(salt+code)
   });
   if(error)throw error;
   if(!data?.ok)return send(data,400);
   return send({...data,code});
  }
  if(action==="verify"){
   const shop=String(input.shop_id||""),code=String(input.code||"");
   const lat=Number(input.lat),lng=Number(input.lng),accuracy=Number(input.accuracy);
   const fixTime=Number(input.fix_time||0);
   if(!/^KR-[A-Za-z0-9-]{3,48}$/.test(shop)||!/^[0-9]{6}$/.test(code)||
     !Number.isFinite(lat)||!Number.isFinite(lng)||!Number.isFinite(accuracy)||
     !Number.isFinite(fixTime)||Math.abs(Date.now()-fixTime)>30000)
    return send({ok:false,error:"invalid_request"},400);
   const {data,error}=await admin.rpc("qr_visit_confirm_atomic",{
    p_user:user,p_shop_id:shop,p_code:code,p_lat:lat,p_lng:lng,p_accuracy:accuracy
   });
   if(error)throw error;
   return send(data,data?.ok?200:400);
  }
  if(action==="admin_list"||action==="admin_create"||action==="admin_disable"){
   if(!await privileged())return send({ok:false,error:"forbidden"},403);
   if(action==="admin_list"){
    const {data,error}=await admin.from("shop_visit_qr_tags").select("id,shop_id,status,created_at,revoked_at").order("created_at",{ascending:false}).limit(100);
    if(error)throw error;
    return send({ok:true,tags:data});
   }
   if(action==="admin_create"){
    const shop=String(input.shop_id||"");
    if(!/^KR-[A-Za-z0-9-]{3,48}$/.test(shop))return send({ok:false,error:"invalid_shop"},400);
    const {data:shopRow,error:shopError}=await admin.from("shops").select("id,is_active,name,country_code").eq("id",shop).maybeSingle();
    if(shopError)throw shopError;
    if(!shopRow?.is_active||shopRow.country_code!=="KR")return send({ok:false,error:"invalid_shop"},400);
    const token=random(32);
    const {data,error}=await admin.from("shop_visit_qr_tags").insert({shop_id:shop,token_hash:await hash(token),status:"active",created_by:user}).select("id").single();
    if(error)throw error;
    return send({ok:true,tag_id:data.id,shop_id:shop,shop_name:shopRow.name,url:"https://funypin.kr/shop-visit-qr.html?t="+token});
   }
   const tagId=String(input.tag_id||"");
   if(!/^[0-9a-f-]{36}$/.test(tagId))return send({ok:false,error:"invalid_tag"},400);
   const {data,error}=await admin.from("shop_visit_qr_tags").update({status:"revoked",revoked_at:new Date().toISOString()}).eq("id",tagId).select("id").maybeSingle();
   if(error)throw error;
   return send({ok:!!data});
  }
  return send({ok:false,error:"unknown_action"},400);
 }catch(e){
  console.error("visit-qr-otp",action,e instanceof Error?e.message:String(e));
  return send({ok:false,error:"server_error"},500);
 }
});
