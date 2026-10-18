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
const ANON=Deno.env.get("SUPABASE_ANON_KEY")!;
const admin=createClient(URL,SERVICE,{auth:{persistSession:false,autoRefreshToken:false}});
const clean=(v:unknown)=>String(v??"").trim();

async function userFrom(req:Request){
  const auth=req.headers.get("authorization")||"";
  const token=auth.replace(/^Bearer\s+/i,"");
  if(!token)throw new Error("로그인이 필요합니다.");
  const {data,error}=await admin.auth.getUser(token);
  if(error||!data.user)throw new Error("로그인 정보를 확인할 수 없습니다.");
  return {user:data.user,auth};
}
async function preview(auth:string,url:string){
  const res=await fetch(URL+"/functions/v1/market-listing-preview-test",{method:"POST",headers:{
    "Content-Type":"application/json","Authorization":auth,"apikey":ANON
  },body:JSON.stringify({url})});
  const data=await res.json().catch(()=>({}));
  if(!res.ok||!data?.ok)throw new Error(data?.error||"원본 매물 정보를 확인하지 못했습니다.");
  return data;
}
function numberOrNull(v:unknown){
  const s=clean(v).replace(/,/g,"");
  if(!s)return null;
  const n=Number(s);return Number.isFinite(n)?Math.round(n):null;
}
async function log(listingId:string,userId:string,eventType:string,eventData:Record<string,unknown>={}){
  await admin.from("market_listing_audit_logs").insert({listing_id:listingId,actor_user_id:userId,event_type:eventType,event_data:eventData});
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return new Response(JSON.stringify({ok:false,error:"POST만 지원합니다."}),{status:405,headers:cors});
  try{
    const {user,auth}=await userFrom(req);
    const body=await req.json().catch(()=>({}));
    const action=clean(body?.action);
    const listingId=clean(body?.listing_id);
    if(!listingId)throw new Error("매물 정보가 없습니다.");

    const {data:listing,error}=await admin.from("market_listings").select("*").eq("id",listingId).eq("seller_user_id",user.id).single();
    if(error||!listing)throw new Error("본인 매물을 찾을 수 없습니다.");

    if(action==="hide"){
      const now=new Date().toISOString();
      const {data,error:updateError}=await admin.from("market_listings").update({
        listing_status:"hidden",hidden_reason:"seller_hidden",hidden_at:now,updated_at:now
      }).eq("id",listing.id).select("*").single();
      if(updateError)throw updateError;
      await log(listing.id,user.id,"seller_hidden",{reason:clean(body?.reason)||"seller_request"});
      return new Response(JSON.stringify({ok:true,listing:data}),{headers:cors});
    }

    if(action==="refresh"){
      const p=await preview(auth,listing.external_url);
      if(clean(p.provider)!==listing.provider)throw new Error("원본 플랫폼 정보가 일치하지 않습니다.");
      if(clean(p.external_listing_id)!==clean(listing.external_listing_id))throw new Error("원본 매물 ID가 일치하지 않습니다.");

      const now=new Date().toISOString();
      const imgs=[...(Array.isArray(p.images)?p.images:[]),p.image].filter(Boolean).filter((x:string,i:number,a:string[])=>a.indexOf(x)===i);
      const sourceStatus=clean(p.source_status)||"unknown";
      let listingStatus=listing.listing_status;
      let hiddenReason=listing.hidden_reason;
      let hiddenAt=listing.hidden_at;
      const expired=!!listing.expires_at&&Date.parse(listing.expires_at)<=Date.now();
      const breakNotInstant=listing.provider==="break"&&clean(p.break_transaction_mode)!=="instant";

      if(expired){
        listingStatus="expired";hiddenReason="listing_expired";hiddenAt=hiddenAt||now;
      }else if(sourceStatus==="sold"){
        listingStatus="sold";hiddenReason="source_sold";hiddenAt=now;
      }else if(sourceStatus==="deleted"||sourceStatus==="unavailable"){
        listingStatus="hidden";hiddenReason="source_unavailable";hiddenAt=now;
      }else if(breakNotInstant){
        listingStatus="hidden";hiddenReason="break_not_instant";hiddenAt=now;
      }else if(sourceStatus==="active"&&listing.hidden_reason!=="seller_hidden"){
        listingStatus="active";hiddenReason=null;hiddenAt=null;
      }

      const patch:any={
        title:clean(p.title)||listing.title,
        description:clean(p.description)||null,
        price:numberOrNull(p.price_raw),
        currency:clean(p.currency)||listing.currency||"KRW",
        thumbnail_url:imgs[0]||null,
        image_urls:imgs,
        external_status:clean(p.availability)||null,
        source_status:sourceStatus,
        source_last_checked_at:clean(p.fetched_at)||now,
        source_refresh_count:Number(listing.source_refresh_count||0)+1,
        listing_status:listingStatus,
        hidden_reason:hiddenReason,
        hidden_at:hiddenAt,
        updated_at:now
      };
      if(typeof p.direct_buy_available==="boolean")patch.direct_buy_available=p.direct_buy_available;

      const {data,error:updateError}=await admin.from("market_listings").update(patch).eq("id",listing.id).select("*").single();
      if(updateError)throw updateError;
      await log(listing.id,user.id,"source_refreshed",{provider:listing.provider,external_listing_id:listing.external_listing_id,source_status:sourceStatus});
      return new Response(JSON.stringify({ok:true,listing:data}),{headers:cors});
    }

    throw new Error("지원하지 않는 작업입니다.");
  }catch(e){
    return new Response(JSON.stringify({ok:false,error:e instanceof Error?e.message:String(e)}),{status:400,headers:cors});
  }
});