import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!;
const SECRET_KEYS_RAW=Deno.env.get("SUPABASE_SECRET_KEYS")!;
const ANON_KEY=Deno.env.get("SUPABASE_ANON_KEY")!;
const CLEANUP_SECRET=Deno.env.get("LIVE_PIN_CLEANUP_SECRET")!;
const clean=(v:unknown)=>String(v??"").trim();

function priceNumber(raw:unknown){
  const s=clean(raw).replace(/,/g,"");
  const m=s.match(/[0-9]+(?:\.[0-9]+)?/);
  if(!m)return null;
  const n=Number(m[0]);
  return Number.isFinite(n)?Math.round(n):null;
}
function images(preview:any){
  return [...new Set([...(Array.isArray(preview?.images)?preview.images:[]),preview?.image].map(clean).filter(Boolean))].slice(0,20);
}
async function fetchPreview(url:string){
  const res=await fetch(SUPABASE_URL+"/functions/v1/market-listing-preview-test",{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Authorization":"Bearer "+ANON_KEY,
      "apikey":ANON_KEY
    },
    body:JSON.stringify({url})
  });
  const data=await res.json().catch(()=>({}));
  return {ok:res.ok&&data?.ok===true,status:res.status,data};
}
function clearlyUnavailable(message:string){
  return /\((404|410)\)/.test(message)||/상품 정보가 없습니다|상품을 찾을 수 없습니다|매물을 찾을 수 없습니다/.test(message);
}

Deno.serve(async(req:Request)=>{
  if(req.method!=="POST")return Response.json({ok:false,error:"METHOD_NOT_ALLOWED"},{status:405});
  const provided=req.headers.get("x-cleanup-secret")||"";
  if(!CLEANUP_SECRET||provided!==CLEANUP_SECRET)return Response.json({ok:false,error:"Unauthorized"},{status:401});

  try{
    const secretKeys=JSON.parse(SECRET_KEYS_RAW||"{}");
    const secretKey=secretKeys["default"];
    if(!SUPABASE_URL||!secretKey||!ANON_KEY)throw new Error("SERVER_CONFIGURATION_ERROR");
    const admin=createClient(SUPABASE_URL,secretKey,{auth:{persistSession:false,autoRefreshToken:false}});

    const {data:expired,error:expireError}=await admin.rpc("expire_due_market_listings");
    if(expireError)throw expireError;

    const cutoff=Date.now()-6*60*60*1000;
    const {data:rows,error:listError}=await admin.from("market_listings")
      .select("id,provider,external_url,listing_status,expires_at,source_last_checked_at,source_refresh_count,title,description,currency")
      .in("listing_status",["active","reserved"])
      .order("source_last_checked_at",{ascending:true,nullsFirst:true})
      .limit(50);
    if(listError)throw listError;

    const candidates=(rows||[]).filter((row:any)=>{
      const expiry=Date.parse(row.expires_at||"");
      if(Number.isFinite(expiry)&&expiry<=Date.now())return false;
      const checked=Date.parse(row.source_last_checked_at||"");
      return !Number.isFinite(checked)||checked<=cutoff;
    });

    let checked=0,hidden=0,sold=0,failed=0,updated=0;
    let cursor=0;
    const worker=async()=>{
      while(cursor<candidates.length){
        const row:any=candidates[cursor++];
        const now=new Date().toISOString();
        try{
          const result=await fetchPreview(row.external_url);
          checked++;
          if(!result.ok){
            const message=clean(result.data?.error||result.data?.message);
            if(clearlyUnavailable(message)){
              const {error}=await admin.from("market_listings").update({
                listing_status:"hidden",
                source_status:"unavailable",
                hidden_reason:"source_unavailable",
                hidden_at:now,
                source_last_checked_at:now,
                source_refresh_count:Number(row.source_refresh_count||0)+1,
                updated_at:now
              }).eq("id",row.id).in("listing_status",["active","reserved"]);
              if(error)throw error;
              hidden++;
            }else{
              await admin.from("market_listings").update({
                source_last_checked_at:now,
                updated_at:now
              }).eq("id",row.id).in("listing_status",["active","reserved"]);
              failed++;
            }
            continue;
          }

          const p=result.data;
          const sourceStatus=clean(p.source_status)||"unknown";
          const breakNotInstant=row.provider==="break"&&clean(p.break_transaction_mode)!=="instant";
          const nonTcg=p.tcg_allowed===false;
          const imgs=images(p);
          const patch:any={
            title:clean(p.title)||row.title,
            description:clean(p.description)||null,
            price:priceNumber(p.price_raw),
            currency:clean(p.currency)||row.currency||"KRW",
            thumbnail_url:imgs[0]||null,
            image_urls:imgs,
            external_status:clean(p.availability)||null,
            source_status:sourceStatus,
            source_last_checked_at:clean(p.fetched_at)||now,
            source_refresh_count:Number(row.source_refresh_count||0)+1,
            updated_at:now
          };
          if(typeof p.direct_buy_available==="boolean")patch.direct_buy_available=p.direct_buy_available;

          if(sourceStatus==="sold"){
            patch.listing_status="sold";
            patch.hidden_reason="source_sold";
            patch.hidden_at=now;
            sold++;
          }else if(sourceStatus==="deleted"||sourceStatus==="unavailable"){
            patch.listing_status="hidden";
            patch.hidden_reason="source_unavailable";
            patch.hidden_at=now;
            hidden++;
          }else if(breakNotInstant){
            patch.listing_status="hidden";
            patch.hidden_reason="break_not_instant";
            patch.hidden_at=now;
            hidden++;
          }else if(nonTcg){
            patch.listing_status="hidden";
            patch.hidden_reason="non_tcg_source";
            patch.hidden_at=now;
            hidden++;
          }

          const {error}=await admin.from("market_listings").update(patch)
            .eq("id",row.id)
            .in("listing_status",["active","reserved"]);
          if(error)throw error;
          updated++;
        }catch(error){
          failed++;
          console.error("market-listing-maintenance item failed",row.id,error);
        }
      }
    };

    await Promise.all([worker(),worker(),worker(),worker()]);

    return Response.json({
      ok:true,
      expired:Number(expired||0),
      candidates:candidates.length,
      checked,updated,hidden,sold,failed
    });
  }catch(error){
    console.error("market-listing-maintenance failed",error);
    return Response.json({ok:false,error:error instanceof Error?error.message:String(error)},{status:500});
  }
});