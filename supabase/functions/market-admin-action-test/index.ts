import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors={
 "Access-Control-Allow-Origin":"*",
 "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
 "Access-Control-Allow-Methods":"POST,OPTIONS",
 "Content-Type":"application/json; charset=utf-8",
 "Cache-Control":"no-store"
};
const URL=Deno.env.get("SUPABASE_URL")!;
const SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin=createClient(URL,SERVICE,{auth:{persistSession:false,autoRefreshToken:false}});
const clean=(v:unknown)=>String(v??"").trim();

function jwtSubject(token:string){
 try{
  const part=token.split(".")[1]||"";
  const base64=part.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(part.length/4)*4,"=");
  const payload=JSON.parse(atob(base64));
  return clean(payload?.sub);
 }catch{return "";}
}
async function adminUser(req:Request){
 const auth=req.headers.get("authorization")||"";
 const token=auth.replace(/^Bearer\s+/i,"");
 if(!token)throw new Error("관리자 로그인이 필요합니다.");

 // This function is deployed with verify_jwt=true, so the gateway has already
 // verified signature/expiry. Use the verified JWT subject to resolve the
 // canonical Auth user and then check the separate admin_accounts registry.
 const userId=jwtSubject(token);
 if(!userId)throw new Error("관리자 로그인 정보를 확인할 수 없습니다.");

 const {data:userData,error:userError}=await admin.auth.admin.getUserById(userId);
 const user=userData?.user;
 if(userError||!user)throw new Error("관리자 로그인 정보를 확인할 수 없습니다.");

 const email=clean(user.email).toLowerCase();
 if(!email)throw new Error("관리자 이메일을 확인할 수 없습니다.");
 const {data:row,error:adminError}=await admin.from("admin_accounts")
  .select("email")
  .eq("email",email)
  .eq("is_active",true)
  .maybeSingle();
 if(adminError||!row)throw new Error("관리자 권한이 없습니다.");
 return user;
}
async function audit(listingId:string|null,userId:string,eventType:string,eventData:Record<string,unknown>={}){
 await admin.from("market_listing_audit_logs").insert({listing_id:listingId,actor_user_id:userId,event_type:eventType,event_data:eventData});
}

Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return new Response(JSON.stringify({ok:false,error:"POST만 지원합니다."}),{status:405,headers:cors});
 try{
  const user=await adminUser(req);
  const body=await req.json().catch(()=>({}));
  const action=clean(body?.action);
  const now=new Date().toISOString();

  if(action==="hide_listing"){
   const listingId=clean(body?.listing_id);if(!listingId)throw new Error("매물 ID가 없습니다.");
   const reason=clean(body?.reason)||"admin_action";
   const {data,error}=await admin.from("market_listings").update({
    listing_status:"hidden",hidden_reason:reason,hidden_at:now,updated_at:now
   }).eq("id",listingId).select("*").single();
   if(error)throw error;
   await audit(listingId,user.id,"admin_hidden",{reason});
   return new Response(JSON.stringify({ok:true,listing:data}),{headers:cors});
  }

  if(action==="show_listing"){
   const listingId=clean(body?.listing_id);if(!listingId)throw new Error("매물 ID가 없습니다.");
   const {data:before,error:beforeError}=await admin.from("market_listings").select("source_status,listing_status,expires_at,hidden_reason").eq("id",listingId).single();
   if(beforeError)throw beforeError;
   if(["sold","deleted","unavailable"].includes(clean(before?.source_status)))throw new Error("원본 매물 상태가 판매완료/접근불가입니다. 원본 상태 확인 후 다시 시도해주세요.");
   if(clean(before?.listing_status)==="deleted"||clean(before?.hidden_reason)==="seller_deleted")throw new Error("판매자가 삭제한 매물은 관리자가 재노출할 수 없습니다.");
   if(before?.expires_at&&Date.parse(before.expires_at)<=Date.now())throw new Error("14일 노출 기간이 만료된 매물입니다. 판매자가 다시 등록해야 합니다.");
   const {data,error}=await admin.from("market_listings").update({
    listing_status:"active",hidden_reason:null,hidden_at:null,updated_at:now
   }).eq("id",listingId).select("*").single();
   if(error)throw error;
   await audit(listingId,user.id,"admin_reactivated",{});
   return new Response(JSON.stringify({ok:true,listing:data}),{headers:cors});
  }

  if(action==="report_status"){
   const reportId=clean(body?.report_id),status=clean(body?.status),note=clean(body?.admin_note)||null;
   if(!reportId)throw new Error("신고 ID가 없습니다.");
   if(!["reviewing","hidden","resolved","dismissed"].includes(status))throw new Error("지원하지 않는 신고 상태입니다.");
   const {data:report,error:reportError}=await admin.from("market_listing_reports").select("id,listing_id,status").eq("id",reportId).single();
   if(reportError||!report)throw new Error("신고 내역을 찾을 수 없습니다.");
   if(status==="hidden"){
    const {error:hideError}=await admin.from("market_listings").update({
      listing_status:"hidden",hidden_reason:"report_action",hidden_at:now,updated_at:now
    }).eq("id",report.listing_id);
    if(hideError)throw hideError;
    await audit(report.listing_id,user.id,"admin_hidden_from_report",{report_id:reportId,note});
   }
   const {data,error}=await admin.from("market_listing_reports").update({
    status,admin_note:note,processed_at:now,processed_by:user.id
   }).eq("id",reportId).select("*").single();
   if(error)throw error;
   await audit(report.listing_id,user.id,"report_status_changed",{report_id:reportId,from:report.status,to:status});
   return new Response(JSON.stringify({ok:true,report:data}),{headers:cors});
  }

  if(action==="list_seller_access"){
   const {data:allowRows,error:allowError}=await admin.from("market_seller_allowlist")
    .select("user_id,is_active,note,created_at,updated_at")
    .order("updated_at",{ascending:false});
   if(allowError)throw allowError;

   const ids=(allowRows||[]).map((x:any)=>x.user_id);
   let nicknameById=new Map<string,string>();
   if(ids.length){
    const {data:profiles,error:profileError}=await admin.from("profiles")
      .select("user_id,nickname")
      .in("user_id",ids);
    if(profileError)throw profileError;
    nicknameById=new Map((profiles||[]).map((x:any)=>[x.user_id,clean(x.nickname)]));
   }

   const emailById=new Map<string,string>();
   let page=1;
   for(;;){
    const {data:usersData,error:usersError}=await admin.auth.admin.listUsers({page,perPage:1000});
    if(usersError)throw usersError;
    const users=usersData?.users||[];
    users.forEach((x:any)=>emailById.set(x.id,clean(x.email)));
    if(users.length<1000||page>=10)break;
    page++;
   }

   const rows=(allowRows||[]).map((x:any)=>({
    ...x,
    email:emailById.get(x.user_id)||null,
    nickname:nicknameById.get(x.user_id)||null
   }));
   return new Response(JSON.stringify({ok:true,rows}),{headers:cors});
  }

  if(action==="set_seller_access"){
   const requestedUserId=clean(body?.user_id);
   const email=clean(body?.email).toLowerCase();
   const isActive=body?.is_active!==false;
   const note=clean(body?.note)||null;
   let targetUserId=requestedUserId;

   if(!targetUserId&&email){
    let page=1,found:any=null;
    for(;;){
     const {data:usersData,error:usersError}=await admin.auth.admin.listUsers({page,perPage:1000});
     if(usersError)throw usersError;
     const users=usersData?.users||[];
     found=users.find((x:any)=>clean(x.email).toLowerCase()===email)||null;
     if(found||users.length<1000||page>=10)break;
     page++;
    }
    targetUserId=clean(found?.id);
   }
   if(!targetUserId)throw new Error("허용할 FUNY PIN 회원 계정을 찾을 수 없습니다.");

   const {data:target,error:targetError}=await admin.auth.admin.getUserById(targetUserId);
   if(targetError||!target?.user)throw new Error("FUNY PIN 회원 계정을 찾을 수 없습니다.");

   const {data:row,error}=await admin.from("market_seller_allowlist").upsert({
    user_id:targetUserId,
    is_active:isActive,
    note,
    created_by:user.id,
    updated_at:now
   },{onConflict:"user_id"}).select("*").single();
   if(error)throw error;
   await audit(null,user.id,"seller_access_changed",{target_user_id:targetUserId,is_active:isActive,note});
   return new Response(JSON.stringify({
    ok:true,
    row:{...row,email:clean(target.user.email)||null}
   }),{headers:cors});
  }

  throw new Error("지원하지 않는 관리자 작업입니다.");
 }catch(e){
  const message=e instanceof Error?e.message:String(e);
  console.error("[MARKET ADMIN]",message,e);
  return new Response(JSON.stringify({ok:false,error:message}),{status:400,headers:cors});
 }
});