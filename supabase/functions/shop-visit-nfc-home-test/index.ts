import { createClient } from "npm:@supabase/supabase-js@2.57.0";
const BASE=Deno.env.get("SUPABASE_URL")||"";
const SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const ANON=Deno.env.get("SUPABASE_ANON_KEY")||"";
const db=createClient(BASE,SERVICE,{auth:{persistSession:false,autoRefreshToken:false}});
const origins=new Set(["https://funypin.kr","https://www.funypin.kr"]);
const hex=(bytes:Uint8Array)=>Array.from(bytes).map(x=>x.toString(16).padStart(2,"0")).join("");
const hash=async(input:string)=>hex(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(input))));
const random=()=>{const a=new Uint8Array(10);crypto.getRandomValues(a);return hex(a)};
const validToken=/^(?:[a-f0-9]{20}|[a-f0-9]{48})$/;
const coordinate=(value:unknown)=>typeof value==="number"&&Number.isFinite(value)?value:NaN;
const haversine=(a:number,b:number,c:number,d:number)=>{
 const r=Math.PI/180,dl=(d-b)*r,dp=(c-a)*r,ca=a*r,cc=c*r;
 return 6371000*2*Math.asin(Math.sqrt(Math.min(1,Math.sin(dp/2)**2+Math.cos(ca)*Math.cos(cc)*Math.sin(dl/2)**2)));
};
Deno.serve(async(req)=>{
 const origin=req.headers.get("origin")||"";
 const h:Record<string,string>={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Vary":"Origin","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS"};
 if(origins.has(origin))h["Access-Control-Allow-Origin"]=origin;
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:h});
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:h});
 if(req.method!=="POST")return reply({ok:false,error:"method_not_allowed"},405);
 if(origin&&!origins.has(origin))return reply({ok:false,error:"origin_denied"},403);
 const bearer=(req.headers.get("authorization")||"").match(/^Bearer\s+(.+)$/i)?.[1];
 if(!bearer)return reply({ok:false,error:"login_required"},401);
 const {data:auth,error:authError}=await db.auth.getUser(bearer);
 if(authError||!auth?.user?.id)return reply({ok:false,error:"login_required"},401);
 const uid=auth.user.id;
 let data:Record<string,unknown>;
 try{data=await req.json();if(!data||typeof data!=="object"||Array.isArray(data))throw Error("bad")}catch{return reply({ok:false,error:"invalid_request"},400)}
 const action=String(data.action||"");
 const raw=String(data.token||"").toLowerCase();
 const lat=coordinate(data.lat),lng=coordinate(data.lng),accuracy=coordinate(data.accuracy),fixTime=coordinate(data.fix_time);
 const validPoint=()=>Number.isFinite(lat)&&Number.isFinite(lng)&&Number.isFinite(accuracy)&&Number.isFinite(fixTime)&&lat>=-90&&lat<=90&&lng>=-180&&lng<=180&&accuracy>=0&&accuracy<=50&&Math.abs(Date.now()-fixTime)<30000;
 try{
  if(action==="create"){
   if(!validPoint())return reply({ok:false,error:"low_accuracy"},400);
   const client=createClient(BASE,ANON,{global:{headers:{Authorization:"Bearer "+bearer}},auth:{persistSession:false,autoRefreshToken:false}});
   const {data:isAdmin,error:adminError}=await client.rpc("is_funypin_admin");
   if(adminError||isAdmin!==true)return reply({ok:false,error:"forbidden"},403);
   const {count,error:countError}=await db.from("shop_visit_nfc_home_tests").select("id",{count:"exact",head:true}).eq("owner_id",uid).is("revoked_at",null).gt("expires_at",new Date().toISOString());
   if(countError)throw countError;
   if(Number(count||0)>=3)return reply({ok:false,error:"limit_reached"},429);
   const secret=random();
   const expires=new Date(Date.now()+7*24*3600*1000).toISOString();
   const {error}=await db.from("shop_visit_nfc_home_tests").insert({owner_id:uid,token_hash:await hash(secret),latitude:lat,longitude:lng,accuracy_m:Math.round(accuracy),expires_at:expires});
   if(error)throw error;
   return reply({ok:true,url:"https://funypin.kr/h.html#"+secret,expires_at:expires,range_m:50});
  }
  if(!validToken.test(raw))return reply({ok:false,error:"invalid_token"},400);
  const digest=await hash(raw);
  const {data:test,error:lookupError}=await db.from("shop_visit_nfc_home_tests").select("id,owner_id,latitude,longitude,created_at,expires_at,revoked_at").or("token_hash.eq."+digest+",short_token_hash.eq."+digest).maybeSingle();
  if(lookupError)throw lookupError;
  if(!test||test.owner_id!==uid)return reply({ok:false,error:"invalid_token"},404);
  if(test.revoked_at||Date.parse(test.expires_at)<Date.now())return reply({ok:false,error:"expired"},410);
  if(action==="info")return reply({ok:true,range_m:50,expires_at:test.expires_at});
  if(action==="shorten"){
   // Owner-only short alias for an already issued (long) URL; original URL remains valid.
   const short=random();
   const {error}=await db.from("shop_visit_nfc_home_tests").update({short_token_hash:await hash(short)}).eq("id",test.id).eq("owner_id",uid);
   if(error)throw error;
   return reply({ok:true,url:"https://funypin.kr/h.html#"+short,expires_at:test.expires_at});
  }
  if(action==="revoke"){
   const {error}=await db.from("shop_visit_nfc_home_tests").update({revoked_at:new Date().toISOString()}).eq("id",test.id).eq("owner_id",uid);
   if(error)throw error;
   return reply({ok:true});
  }
  if(action==="verify"){
   if(!validPoint())return reply({ok:false,error:"low_accuracy"},400);
   const {count,error:limitError}=await db.from("shop_visit_nfc_home_attempts").select("id",{head:true,count:"exact"}).eq("test_id",test.id).gt("created_at",new Date(Date.now()-10*60*1000).toISOString());
   if(limitError)throw limitError;
   if(Number(count||0)>=20)return reply({ok:false,error:"rate_limited"},429);
   const dist=haversine(lat,lng,test.latitude,test.longitude);
   const result=dist<=50?"success":"too_far";
   const {error:writeError}=await db.from("shop_visit_nfc_home_attempts").insert({test_id:test.id,user_id:uid,result,distance_m:Math.round(dist),accuracy_m:Math.round(accuracy)});
   if(writeError)throw writeError;
   return reply({ok:result==="success",result,distance_m:Math.round(dist),accuracy_m:Math.round(accuracy),range_m:50},result==="success"?200:400);
  }
  return reply({ok:false,error:"unknown_action"},400);
 }catch(e){console.error("nfc-home-test",action,e instanceof Error?e.message:"unexpected");return reply({ok:false,error:"server_error"},500)}
});