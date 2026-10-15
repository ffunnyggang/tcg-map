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

async function adminUser(req:Request){
 const auth=req.headers.get("authorization")||"";
 const token=auth.replace(/^Bearer\s+/i,"");
 if(!token)throw new Error("관리자 로그인이 필요합니다.");
 const {data,error}=await admin.auth.getUser(token);
 if(error||!data.user)throw new Error("관리자 로그인 정보를 확인할 수 없습니다.");
 const {data:row,error:adminError}=await admin.from("admin_users").select("user_id").eq("user_id",data.user.id).maybeSingle();
 if(adminError||!row)throw new Error("관리자 권한이 없습니다.");
 return data.user;
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
   const {data:before,error:beforeError}=await admin.from("market_listings").select("source_status").eq("id",listingId).single();
   if(beforeError)throw beforeError;
   if(["sold","deleted","unavailable"].includes(clean(before?.source_status)))throw new Error("원본 매물 상태가 판매완료/접근불가입니다. 원본 상태 확인 후 다시 시도해주세요.");
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

  throw new Error("지원하지 않는 관리자 작업입니다.");
 }catch(e){
  return new Response(JSON.stringify({ok:false,error:e instanceof Error?e.message:String(e)}),{status:400,headers:cors});
 }
});