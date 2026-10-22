import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.57.4";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST,OPTIONS",
  "Content-Type":"application/json; charset=utf-8",
  "Cache-Control":"no-store",
};

const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY=Deno.env.get("SUPABASE_ANON_KEY")!;
const admin=createClient(SUPABASE_URL,SERVICE_ROLE,{auth:{persistSession:false,autoRefreshToken:false}});
const clean=(v:unknown)=>String(v??"").trim();

async function sha256(value:string){
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
function normalizeSellerHandle(value:unknown){
  return clean(value).normalize("NFKC").toLowerCase().replace(/\s+/g," ");
}
async function sellerAccountIdentity(preview:any,userId=""){
  const stableSellerId=clean(preview?.external_seller_id);
  if(stableSellerId)return {key:stableSellerId,source:"seller_id",reusable:true};
  const provider=clean(preview?.provider),handle=normalizeSellerHandle(preview?.external_seller_handle);
  if(provider==="break"&&handle){
    return {key:"handle:"+await sha256(provider+":"+clean(userId)+":"+handle),source:"seller_handle_fingerprint",reusable:true};
  }
  return {key:null,source:"listing",reusable:false};
}

function accountVerifiedAt(user:any){
  if(user?.email_confirmed_at)return user.email_confirmed_at;
  const provider=clean(user?.app_metadata?.provider||user?.app_metadata?.providers?.[0]);
  if(["google","apple","kakao"].includes(provider))return user?.created_at||new Date().toISOString();
  return null;
}

async function currentUser(req:Request){
  const auth=req.headers.get("authorization")||"";
  const token=auth.replace(/^Bearer\s+/i,"");
  if(!token)throw new Error("로그인이 필요합니다.");
  const {data,error}=await admin.auth.getUser(token);
  if(error||!data?.user)throw new Error("로그인 정보를 확인할 수 없습니다.");
  return {user:data.user,auth};
}

async function sellerAllowed(_userId:string){
  return true;
}

async function requireVerifiedPhone(user:any){
  const verifiedAt=clean(user?.phone_confirmed_at);
  if(!clean(user?.phone)||!verifiedAt){
    throw new Error("매물 등록 전 휴대폰 SMS 인증을 완료해주세요.");
  }
  const now=new Date().toISOString();
  const {error:vError}=await admin.from("user_verifications").upsert({
    user_id:user.id,
    account_verified_at:accountVerifiedAt(user),
    email_verified_at:user?.email_confirmed_at||null,
    phone_verified_at:verifiedAt,
    updated_at:now
  },{onConflict:"user_id"});
  if(vError)throw vError;

  const {error:sellerError}=await admin.from("market_seller_verifications").upsert({
    user_id:user.id,
    verification_provider:"supabase_auth",
    verification_status:"verified",
    phone_verified:true,
    verified_at:verifiedAt,
    revoked_at:null,
    verification_method:"SMS_OTP",
    identity_channel:"supabase_phone",
    updated_at:now
  },{onConflict:"user_id"});
  if(sellerError)throw sellerError;
  return verifiedAt;
}

async function previewListing(auth:string,url:string){
  const res=await fetch(SUPABASE_URL+"/functions/v1/market-listing-preview-test",{
    method:"POST",
    headers:{"Content-Type":"application/json","Authorization":auth,"apikey":ANON_KEY},
    body:JSON.stringify({url}),
  });
  const data=await res.json().catch(()=>({}));
  if(!res.ok||!data?.ok)throw new Error(data?.error||"외부 매물 정보를 확인하지 못했습니다.");
  return data;
}

function priceNumber(raw:unknown){
  const s=clean(raw).replace(/,/g,"");
  const m=s.match(/[0-9]+(?:\.[0-9]+)?/);
  if(!m)return null;
  const n=Number(m[0]);
  return Number.isFinite(n)?Math.round(n):null;
}

function uniqueImages(preview:any){
  const arr=[...(Array.isArray(preview?.images)?preview.images:[]),preview?.image]
    .map(clean).filter(Boolean);
  return [...new Set(arr)].slice(0,20);
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return new Response(JSON.stringify({ok:false,error:"POST만 지원합니다."}),{status:405,headers:cors});

  let quotaEventId:string|null=null;
  try{
    const {user,auth}=await currentUser(req);
    const body=await req.json().catch(()=>({}));
    const allowed=await sellerAllowed(user.id);

    if(clean(body?.action)==="access"){
      return new Response(JSON.stringify({ok:true,allowed,policy:"all_authenticated"}),{headers:cors});
    }

    if(!allowed){
      return new Response(JSON.stringify({
        ok:false,
        error:"현재 매물 등록은 허용된 계정만 이용할 수 있어요.",
        error_en:"Listing registration is currently available only to approved accounts.",
        error_code:"MARKET_SELLER_NOT_ALLOWED"
      }),{status:403,headers:cors});
    }

    const phoneVerifiedAt=await requireVerifiedPhone(user);
    const input=body?.listing||{};
    const externalUrl=clean(input?.external_url);
    const externalAccountId=clean(body?.external_account_id)||null;
    const challengeId=clean(body?.challenge_id)||null;
    if(!externalUrl)throw new Error("외부 매물 URL이 없습니다.");

    const preview=await previewListing(auth,externalUrl);
    if(preview?.tcg_allowed===false){
      return new Response(JSON.stringify({
        ok:false,
        error:"TCG 관련 매물만 등록할 수 있어요. 입력한 매물이 트레이딩 카드 또는 TCG 관련 상품인지 확인해주세요.",
        error_en:"Only TCG-related listings can be registered. Please check that this listing is for trading cards or a TCG-related product.",
        error_code:"TCG_LISTING_REQUIRED"
      }),{status:422,headers:cors});
    }
    if(clean(preview?.provider)==="break"&&clean(preview?.break_transaction_mode)!=="instant"){
      const auction=clean(preview?.break_transaction_mode)==="auction";
      return new Response(JSON.stringify({
        ok:false,
        error:auction
          ?"BREAK는 '즉시 거래' 상품만 등록할 수 있어요. 경매 상품은 등록할 수 없습니다."
          :"BREAK 거래 방식을 확인할 수 없습니다. '즉시 거래' 상품 링크인지 확인해주세요.",
        error_en:auction
          ?"Only BREAK instant-sale listings can be registered. Auction listings are not supported."
          :"We couldn't confirm the BREAK transaction type. Please use an instant-sale listing.",
        error_code:auction?"BREAK_AUCTION_NOT_ALLOWED":"BREAK_INSTANT_ONLY"
      }),{status:422,headers:cors});
    }
    const provider=clean(preview?.provider);
    const sourceStatus=clean(preview?.source_status)||"unknown";
    if(["sold","deleted","unavailable"].includes(sourceStatus)){
      return new Response(JSON.stringify({
        ok:false,
        error:"판매가 종료되었거나 원본에서 확인할 수 없는 매물은 등록할 수 없어요.",
        error_en:"Listings that are sold or no longer available on the original platform cannot be registered.",
        error_code:"SOURCE_LISTING_UNAVAILABLE"
      }),{status:422,headers:cors});
    }
    const externalListingId=clean(preview?.external_listing_id);
    const sellerIdentity=await sellerAccountIdentity(preview, user.id);
    const externalSellerId=sellerIdentity.key;
    if(!provider||!externalListingId)throw new Error("외부 매물 식별정보를 확인하지 못했습니다.");

    let resolvedExternalAccountId=externalAccountId;
    if(!resolvedExternalAccountId&&externalSellerId){
      const {data:autoAccount,error:autoAccountError}=await admin.from("market_external_seller_accounts")
        .select("id")
        .eq("user_id",user.id)
        .eq("provider",provider)
        .eq("external_seller_id",externalSellerId)
        .eq("verification_status","verified")
        .is("revoked_at",null)
        .maybeSingle();
      if(autoAccountError)throw autoAccountError;
      if(autoAccount?.id)resolvedExternalAccountId=autoAccount.id;
    }

    let verificationScope:"account"|"listing";
    let verifiedAccountId:string|null=null;
    let verifiedChallengeId:string|null=null;
    let verifiedAt=new Date().toISOString();

    if(resolvedExternalAccountId){
      const {data:account,error}=await admin.from("market_external_seller_accounts")
        .select("id,user_id,provider,external_seller_id,verification_status,verified_at,revoked_at")
        .eq("id",resolvedExternalAccountId)
        .eq("user_id",user.id)
        .eq("verification_status","verified")
        .is("revoked_at",null)
        .maybeSingle();
      if(error)throw error;
      if(!account)throw new Error("유효한 외부 판매자 계정 인증을 확인할 수 없습니다.");
      if(account.provider!==provider)throw new Error("인증된 플랫폼과 등록하려는 매물 플랫폼이 다릅니다.");
      if(!externalSellerId||clean(account.external_seller_id)!==externalSellerId){
        throw new Error("인증된 외부 판매자 계정과 현재 매물의 판매자 정보가 일치하지 않습니다.");
      }
      verificationScope="account";
      verifiedAccountId=account.id;
      verifiedAt=account.verified_at||verifiedAt;
    }else{
      if(!challengeId)throw new Error("판매자 인증을 완료해주세요.");
      const {data:challenge,error}=await admin.from("market_external_verification_challenges")
        .select("id,user_id,provider,external_listing_id,external_seller_id,status,verified_at")
        .eq("id",challengeId)
        .eq("user_id",user.id)
        .eq("status","verified")
        .maybeSingle();
      if(error)throw error;
      if(!challenge)throw new Error("완료된 판매자 인증을 확인할 수 없습니다.");
      if(challenge.provider!==provider||clean(challenge.external_listing_id)!==externalListingId){
        throw new Error("인증을 완료한 매물과 등록하려는 매물이 다릅니다.");
      }
      if(challenge.external_seller_id&&clean(challenge.external_seller_id)!==clean(externalSellerId)){
        throw new Error("인증 당시 판매자 정보와 현재 판매자 정보가 다릅니다.");
      }
      verificationScope="listing";
      verifiedChallengeId=challenge.id;
      verifiedAt=challenge.verified_at||verifiedAt;
    }

    const category=clean(input?.tcg_category);
    const itemType=clean(input?.item_type);
    if(!["pokemon","onepiece","dragonball","other"].includes(category))throw new Error("카테고리를 확인해주세요.");
    if(!["single","vintage","graded","box","other"].includes(itemType))throw new Error("상품 구분을 확인해주세요.");

    const lat=Number(input?.latitude),lng=Number(input?.longitude);
    if(!Number.isFinite(lat)||!Number.isFinite(lng))throw new Error("거래 희망 위치를 확인해주세요.");
    const locationName=clean(input?.location_name);
    if(!locationName)throw new Error("거래 희망 주소를 확인해주세요.");

    const now=new Date().toISOString();
    const urls=uniqueImages(preview);
    const sellerNickname=clean(input?.seller_nickname)||
      clean(user.user_metadata?.nickname)||clean(user.user_metadata?.name)||
      ("FUNY회원"+user.id.replace(/-/g,"").slice(-4).toUpperCase());

    const row={
      seller_user_id:user.id,
      seller_nickname:sellerNickname,
      seller_type:"individual",
      individual_seller_confirmed_at:phoneVerifiedAt,
      rights_republish_agreed_at:now,
      external_trade_only_agreed_at:now,
      provider,
      external_url:clean(preview?.final_url)||externalUrl,
      external_listing_id:externalListingId,
      title:clean(preview?.title)||"외부 매물",
      description:clean(preview?.description)||null,
      price:priceNumber(preview?.price_raw),
      currency:clean(preview?.currency)||"KRW",
      thumbnail_url:urls[0]||null,
      image_urls:urls,
      external_status:clean(preview?.availability)||null,
      direct_buy_available:preview?.direct_buy_available===true,
      listing_status:"active",
      hidden_reason:null,
      hidden_at:null,
      listing_side:"sell",
      tcg_category:category,
      item_type:itemType,
      country_code:"KR",
      latitude:lat,
      longitude:lng,
      road_address:clean(input?.road_address)||null,
      location_name:locationName,
      place_name:clean(input?.place_name).slice(0,30)||null,
      external_account_id:verifiedAccountId,
      seller_verified_at:verifiedAt,
      seller_verification_scope:verificationScope,
      seller_verification_challenge_id:verifiedChallengeId,
      fetched_at:preview?.fetched_at||now,
      source_last_checked_at:preview?.fetched_at||now,
      source_status:sourceStatus,
      updated_at:now,
    };

    const {data:existing,error:existingError}=await admin.from("market_listings")
      .select("id,source_refresh_count,listing_status,published_at,expires_at")
      .eq("seller_user_id",user.id)
      .eq("provider",provider)
      .eq("external_listing_id",externalListingId)
      .maybeSingle();
    if(existingError)throw existingError;

    const nowMs=Date.now();
    const existingExpiresAt=existing?.expires_at?Date.parse(existing.expires_at):NaN;
    const existingStillVisible=!!existing?.id
      && ["active","reserved"].includes(clean(existing.listing_status))
      && Number.isFinite(existingExpiresAt)
      && existingExpiresAt>nowMs;
    const startsNewPublication=!existingStillVisible;

    if(startsNewPublication){
      const {data:eventId,error:quotaError}=await admin.rpc("claim_market_listing_publication_quota",{
        p_user_id:user.id,
        p_provider:provider,
        p_external_listing_id:externalListingId,
        p_publication_kind:existing?.id?"republish":"new"
      });
      if(quotaError)throw quotaError;
      quotaEventId=clean(eventId)||null;
    }

    const publishedAt=startsNewPublication?now:(clean(existing?.published_at)||now);
    const expiresAt=startsNewPublication
      ?new Date(Date.now()+14*24*60*60*1000).toISOString()
      :(clean(existing?.expires_at)||new Date(Date.now()+14*24*60*60*1000).toISOString());
    const publicationRow={...row,published_at:publishedAt,expires_at:expiresAt};

    let saved:any=null;
    if(existing?.id){
      const {data,error}=await admin.from("market_listings")
        .update({...publicationRow,source_refresh_count:(Number(existing.source_refresh_count)||0)+1})
        .eq("id",existing.id)
        .eq("seller_user_id",user.id)
        .select("*").single();
      if(error)throw error;
      saved=data;
    }else{
      const {data,error}=await admin.from("market_listings")
        .insert({...publicationRow,source_refresh_count:1})
        .select("*").single();
      if(error)throw error;
      saved=data;
    }

    if(quotaEventId&&saved?.id){
      await admin.from("market_listing_publication_events")
        .update({listing_id:saved.id})
        .eq("id",quotaEventId)
        .eq("user_id",user.id);
    }

    return new Response(JSON.stringify({
      ok:true,
      listing:saved,
      verification_scope:verificationScope,
      external_account_id:verifiedAccountId,
      challenge_id:verifiedChallengeId
    }),{headers:cors});
  }catch(e){
    if(quotaEventId){
      try{await admin.from("market_listing_publication_events").delete().eq("id",quotaEventId)}catch(_){}
    }
    const raw=e instanceof Error?e.message:String(e);
    let error=raw||"매물 등록을 처리하지 못했습니다.";
    let errorEn="We couldn't register this listing. Please try again.";
    let errorCode="MARKET_REGISTER_FAILED";
    let status=400;
    if(raw.includes("MARKET_DAILY_LIMIT_REACHED")){
      error="하루에 새로 등록할 수 있는 매물은 최대 10개예요. 내일 다시 등록해주세요.";
      errorEn="You can publish up to 10 new listings per day. Please try again tomorrow.";
      errorCode="MARKET_DAILY_LIMIT_REACHED";status=429;
    }else if(raw.includes("MARKET_MONTHLY_LIMIT_REACHED")){
      error="한 달에 새로 등록할 수 있는 매물은 최대 30개예요. 다음 달에 다시 등록해주세요.";
      errorEn="You can publish up to 30 new listings per month. Please try again next month.";
      errorCode="MARKET_MONTHLY_LIMIT_REACHED";status=429;
    }
    return new Response(JSON.stringify({ok:false,error,error_en:errorEn,error_code:errorCode}),{status,headers:cors});
  }
});