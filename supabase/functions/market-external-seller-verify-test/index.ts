import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.57.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const clean = (v: unknown) => String(v ?? "").trim();

function accountVerifiedAt(user:any){
  if(user?.email_confirmed_at)return user.email_confirmed_at;
  const provider=clean(user?.app_metadata?.provider||user?.app_metadata?.providers?.[0]);
  if(["google","apple","kakao"].includes(provider))return user?.created_at||new Date().toISOString();
  return null;
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function normalizeSellerHandle(value: unknown) {
  return clean(value).normalize("NFKC").toLowerCase().replace(/\s+/g, " ");
}

async function sellerAccountIdentity(preview: any, userId = "") {
  const stableSellerId = clean(preview?.external_seller_id);
  if (stableSellerId) {
    return { key: stableSellerId, source: "seller_id", reusable: true };
  }
  const provider = clean(preview?.provider);
  const handle = normalizeSellerHandle(preview?.external_seller_handle);
  if (provider === "break" && handle) {
    return {
      key: "handle:" + await sha256(provider + ":" + clean(userId) + ":" + handle),
      source: "seller_handle_fingerprint",
      reusable: true,
    };
  }
  return { key: null, source: "listing", reusable: false };
}

function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const a = new Uint32Array(6);
  crypto.getRandomValues(a);
  return "FUNY-" + Array.from(a).map(n => alphabet[n % alphabet.length]).join("");
}

async function currentUser(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("로그인이 필요합니다.");
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) throw new Error("로그인 정보를 확인할 수 없습니다.");
  return { user: data.user, auth };
}

async function sellerAllowed(_userId:string){
  return true;
}

async function syncPhoneVerification(user: any) {
  const verifiedAt = clean(user?.phone_confirmed_at);
  const verified = !!(clean(user?.phone) && verifiedAt);
  const now = new Date().toISOString();

  const { error: verificationError } = await admin
    .from("user_verifications")
    .upsert({
      user_id:user.id,
      account_verified_at:accountVerifiedAt(user),
      email_verified_at: user?.email_confirmed_at || null,
      phone_verified_at: verified ? verifiedAt : null,
      updated_at: now,
    }, { onConflict: "user_id" });
  if (verificationError) throw verificationError;

  if (verified) {
    const { error } = await admin
      .from("market_seller_verifications")
      .upsert({
        user_id: user.id,
        verification_provider: "supabase_auth",
        verification_status: "verified",
        phone_verified: true,
        verified_at: verifiedAt,
        revoked_at: null,
        verification_method: "SMS_OTP",
        identity_channel: "supabase_phone",
        updated_at: now,
      }, { onConflict: "user_id" });
    if (error) throw error;
  }

  return { verified, verified_at: verified ? verifiedAt : null };
}

async function previewListing(auth: string, url: string) {
  const res = await fetch(SUPABASE_URL + "/functions/v1/market-listing-preview-test", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": auth,
      "apikey": ANON_KEY,
    },
    body: JSON.stringify({ url }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) throw new Error(data?.error || "외부 매물 정보를 확인하지 못했습니다.");
  return data;
}

async function accountConflict(provider: string, sellerId: string, userId: string) {
  const { data, error } = await admin
    .from("market_external_seller_accounts")
    .select("id,user_id,provider,external_seller_id,external_seller_handle,verification_status,verified_at,last_checked_at")
    .eq("provider", provider)
    .eq("external_seller_id", sellerId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (data.user_id !== userId && data.verification_status === "verified") {
    throw new Error("이미 다른 FUNY PIN 계정에 인증된 외부 판매자 계정입니다.");
  }
  return data;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ ok: false, error: "POST만 지원합니다." }), { status: 405, headers: cors });

  try {
    const { user, auth } = await currentUser(req);
    const body = await req.json().catch(() => ({}));
    const action = clean(body?.action || "status");
    const allowed = await sellerAllowed(user.id);

    if (!allowed) {
      return new Response(JSON.stringify({
        ok:false,
        error:"현재 매물 등록은 허용된 계정만 이용할 수 있어요.",
        error_en:"Listing registration is currently available only to approved accounts.",
        error_code:"MARKET_SELLER_NOT_ALLOWED"
      }), { status:403, headers:cors });
    }

    const phoneState = await syncPhoneVerification(user);

    if (action === "status") {
      const [sellerResult, accountResult] = await Promise.all([
        admin.from("market_seller_verifications")
          .select("verification_provider,verification_status,phone_verified,verified_at")
          .eq("user_id", user.id)
          .maybeSingle(),
        admin.from("market_external_seller_accounts")
          .select("id,provider,external_seller_id,external_seller_handle,verification_status,verified_at,last_checked_at")
          .eq("user_id", user.id)
          .eq("verification_status", "verified")
          .order("verified_at", { ascending: false }),
      ]);
      if (sellerResult.error) throw sellerResult.error;
      if (accountResult.error) throw accountResult.error;
      return new Response(JSON.stringify({
        ok: true,
        identity: sellerResult.data || { verification_status: "pending", phone_verified: false },
        external_accounts: accountResult.data || [],
        public_open_gate: { pass_required: false, phone_sms_required: true, phone_sms_verified: phoneState.verified, external_seller_verification_required: true }
      }), { headers: cors });
    }

    if ((action === "start" || action === "verify" || action === "resolve") && !phoneState.verified) {
      throw new Error("판매자 인증 전 휴대폰 SMS 인증을 완료해주세요.");
    }

    if (action === "resolve") {
      const url = clean(body?.url);
      if (!url) throw new Error("외부 매물 URL을 입력해주세요.");

      const preview = await previewListing(auth, url);
      const provider = clean(preview.provider);
      const listingId = clean(preview.external_listing_id);
      const identity = await sellerAccountIdentity(preview, user.id);
      if (!provider || !listingId) throw new Error("외부 매물 식별정보를 확인하지 못했습니다.");

      if (identity.key) {
        const existing = await accountConflict(provider, identity.key, user.id);
        if (existing?.user_id === user.id && existing.verification_status === "verified") {
          const now = new Date().toISOString();
          await admin.from("market_external_seller_accounts")
            .update({
              external_seller_handle: clean(preview.external_seller_handle) || existing.external_seller_handle || null,
              last_checked_at: now,
              updated_at: now,
            })
            .eq("id", existing.id);
          return new Response(JSON.stringify({
            ok: true,
            already_verified: true,
            verified: true,
            provider,
            external_listing_id: listingId,
            seller_verification_scope: "account",
            seller_identity_source: identity.source,
            external_account_id: existing.id,
          }), { headers: cors });
        }
      }

      return new Response(JSON.stringify({
        ok: true,
        already_verified: false,
        verified: false,
        provider,
        external_listing_id: listingId,
        seller_verification_scope: identity.reusable ? "account" : "listing",
        seller_identity_source: identity.source,
        account_reuse_supported: identity.reusable,
      }), { headers: cors });
    }

    if (action === "start") {
      const url = clean(body?.url);
      if (!url) throw new Error("외부 매물 URL을 입력해주세요.");

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count, error: countError } = await admin
        .from("market_external_verification_challenges")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", oneHourAgo);
      if (countError) throw countError;
      if ((count || 0) >= 10) throw new Error("인증 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.");

      const preview = await previewListing(auth, url);
      const provider = clean(preview.provider);
      const listingId = clean(preview.external_listing_id);
      const identity = await sellerAccountIdentity(preview, user.id);
      const sellerId = identity.key;
      if (!provider || !listingId) throw new Error("외부 매물 식별정보를 확인하지 못했습니다.");

      if (sellerId) {
        const existing = await accountConflict(provider, sellerId, user.id);
        if (existing?.user_id === user.id && existing.verification_status === "verified") {
          await admin.from("market_external_seller_accounts")
            .update({ last_checked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq("id", existing.id);
          return new Response(JSON.stringify({
            ok: true,
            already_verified: true,
            provider,
            external_listing_id: listingId,
            seller_verification_scope: "account",
            external_account_id: existing.id
          }), { headers: cors });
        }
      }

      await admin.from("market_external_verification_challenges")
        .update({ status: "cancelled" })
        .eq("user_id", user.id)
        .eq("provider", provider)
        .eq("external_listing_id", listingId)
        .eq("status", "pending");

      const code = makeCode();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const { data: challenge, error } = await admin
        .from("market_external_verification_challenges")
        .insert({
          user_id: user.id,
          provider,
          external_listing_id: listingId,
          external_seller_id: sellerId,
          challenge_code_hash: await sha256(code.toUpperCase()),
          challenge_hint: code.slice(-2),
          status: "pending",
          expires_at: expiresAt,
        })
        .select("id")
        .single();
      if (error) throw error;

      return new Response(JSON.stringify({
        ok: true,
        already_verified: false,
        challenge_id: challenge.id,
        verification_code: code,
        expires_at: expiresAt,
        provider,
        external_listing_id: listingId,
        seller_verification_scope: identity.reusable ? "account" : "listing",
        seller_identity_source: identity.source,
        instructions: "외부 매물 설명 마지막에 인증코드를 잠시 추가한 뒤 인증 확인을 눌러주세요."
      }), { headers: cors });
    }

    if (action === "verify") {
      const challengeId = clean(body?.challenge_id);
      const url = clean(body?.url);
      if (!challengeId || !url) throw new Error("인증 요청 정보가 없습니다.");

      const { data: challenge, error } = await admin
        .from("market_external_verification_challenges")
        .select("*")
        .eq("id", challengeId)
        .eq("user_id", user.id)
        .single();
      if (error || !challenge) throw new Error("인증 요청을 찾을 수 없습니다.");
      if (challenge.status === "verified") {
        return new Response(JSON.stringify({ ok: true, verified: true, already_verified: true }), { headers: cors });
      }
      if (challenge.status !== "pending") throw new Error("사용할 수 없는 인증 요청입니다.");
      if (Date.parse(challenge.expires_at) <= Date.now()) {
        await admin.from("market_external_verification_challenges").update({ status: "expired" }).eq("id", challenge.id);
        throw new Error("인증코드가 만료되었습니다. 새 인증코드를 발급해주세요.");
      }

      const preview = await previewListing(auth, url);
      if (clean(preview.provider) !== challenge.provider || clean(preview.external_listing_id) !== challenge.external_listing_id) {
        throw new Error("인증을 시작한 매물과 다른 매물입니다.");
      }
      const previewIdentity = await sellerAccountIdentity(preview, user.id);
      const previewSellerId = previewIdentity.key;
      if (challenge.external_seller_id && previewSellerId !== challenge.external_seller_id) {
        throw new Error("판매자 계정 정보가 변경되어 인증할 수 없습니다.");
      }

      const currentAttempts = Number(challenge.attempts || 0);
      const descriptionCodes = (clean(preview.description).match(/FUNY-[A-Z0-9]{6}/gi) || []).map((x: string) => x.toUpperCase());
      const rawCodes = Array.isArray(preview.verification_codes)
        ? preview.verification_codes.map((x: unknown) => clean(x).toUpperCase()).filter((x: string) => /^FUNY-[A-Z0-9]{6}$/.test(x))
        : [];
      const codes = [...new Set([...descriptionCodes, ...rawCodes])];
      let matched = false;
      for (const code of codes) {
        if (await sha256(code) === challenge.challenge_code_hash) { matched = true; break; }
      }

      if (!matched) {
        if (!codes.length) {
          throw new Error("원본 게시글의 최신 본문에서 인증코드를 아직 확인하지 못했습니다. 외부 플랫폼에 저장이 완료됐는지 확인한 뒤 잠시 후 다시 시도해주세요.");
        }
        const attempts = currentAttempts + 1;
        await admin.from("market_external_verification_challenges")
          .update({ attempts, status: attempts >= 5 ? "failed" : "pending" })
          .eq("id", challenge.id);
        throw new Error(attempts >= 5
          ? "다른 인증코드가 확인되었습니다. 새 인증코드를 발급해주세요."
          : "원본 게시글에서 다른 인증코드가 확인되었습니다. 현재 발급된 코드를 다시 확인해주세요.");
      }

      const now = new Date().toISOString();
      await admin.from("market_external_verification_challenges")
        .update({ status: "verified", attempts: currentAttempts, verified_at: now })
        .eq("id", challenge.id);

      let accountVerified = false;
      let externalAccountId: string | null = null;
      const sellerId = previewSellerId || challenge.external_seller_id;
      if (sellerId) {
        const existing = await accountConflict(challenge.provider, sellerId, user.id);
        if (existing?.id) {
          const { data: updatedAccount, error: updateError } = await admin.from("market_external_seller_accounts")
            .update({
              user_id: user.id,
              external_seller_handle: clean(preview.external_seller_handle) || null,
              verification_status: "verified",
              verification_method: "listing_challenge",
              verified_listing_external_id: challenge.external_listing_id,
              verified_at: now,
              last_checked_at: now,
              revoked_at: null,
              updated_at: now,
            })
            .eq("id", existing.id)
            .select("id")
            .single();
          if (updateError) throw updateError;
          externalAccountId = updatedAccount?.id || existing.id;
        } else {
          const { data: insertedAccount, error: insertError } = await admin.from("market_external_seller_accounts").insert({
            user_id: user.id,
            provider: challenge.provider,
            external_seller_id: sellerId,
            external_seller_handle: clean(preview.external_seller_handle) || null,
            verification_status: "verified",
            verification_method: "listing_challenge",
            verified_listing_external_id: challenge.external_listing_id,
            verified_at: now,
            last_checked_at: now,
          }).select("id").single();
          if (insertError) throw insertError;
          externalAccountId = insertedAccount?.id || null;
        }
        accountVerified = true;
      }

      return new Response(JSON.stringify({
        ok: true,
        verified: true,
        provider: challenge.provider,
        external_listing_id: challenge.external_listing_id,
        account_verified: accountVerified,
        seller_verification_scope: accountVerified ? "account" : "listing",
        external_account_id: externalAccountId,
        challenge_id: challenge.id,
        verified_at: now
      }), { headers: cors });
    }

    throw new Error("지원하지 않는 인증 작업입니다.");
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }), { status: 400, headers: cors });
  }
});
