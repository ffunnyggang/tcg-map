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
const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const clean = (v: unknown) => String(v ?? "").trim();

function accountVerifiedAt(user:any){
  if(user?.email_confirmed_at)return user.email_confirmed_at;
  const provider=clean(user?.app_metadata?.provider||user?.app_metadata?.providers?.[0]);
  if(["google","apple","kakao"].includes(provider))return user?.created_at||new Date().toISOString();
  return null;
}

async function currentUser(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("로그인이 필요합니다.");
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) throw new Error("로그인 정보를 확인할 수 없습니다.");
  return data.user;
}

function maskedPhone(phone: unknown) {
  const p = clean(phone);
  if (!p) return null;
  const digits = p.replace(/\D/g, "");
  if (digits.length < 4) return "••••";
  return "•••• " + digits.slice(-4);
}

async function syncVerification(user: any) {
  const now = new Date().toISOString();
  const emailVerifiedAt = user?.email_confirmed_at || null;
  const phoneVerifiedAt = user?.phone_confirmed_at || null;
  const phoneVerified = !!(user?.phone && phoneVerifiedAt);

  const { data:verification, error:verificationError } = await admin
    .from("user_verifications")
    .upsert({
      user_id:user.id,
      account_verified_at:accountVerifiedAt(user),
      account_verified_at: verification?.account_verified_at || accountVerifiedAt(user),
    email_verified_at: emailVerifiedAt,
      phone_verified_at: phoneVerifiedAt,
      updated_at: now,
    }, { onConflict: "user_id" })
    .select("account_verified_at,email_verified_at,phone_verified_at,identity_verified_at,verification_level")
    .single();
  if (verificationError) throw verificationError;

  if (phoneVerified) {
    const { error } = await admin
      .from("market_seller_verifications")
      .upsert({
        user_id: user.id,
        verification_provider: "supabase_auth",
        verification_status: "verified",
        phone_verified: true,
        verified_at: phoneVerifiedAt,
        revoked_at: null,
        verification_method: "SMS_OTP",
        identity_channel: "supabase_phone",
        updated_at: now,
      }, { onConflict: "user_id" });
    if (error) throw error;
  } else {
    const { data:existing, error:existingError } = await admin
      .from("market_seller_verifications")
      .select("verification_method,verification_provider")
      .eq("user_id", user.id)
      .maybeSingle();
    if (existingError) throw existingError;

    if (!existing || ["SMS_OTP", "PASS/SMS"].includes(clean(existing.verification_method)) || clean(existing.verification_provider) === "supabase_auth") {
      const { error } = await admin
        .from("market_seller_verifications")
        .upsert({
          user_id: user.id,
          verification_provider: "supabase_auth",
          verification_status: "pending",
          phone_verified: false,
          verified_at: null,
          revoked_at: null,
          verification_method: "SMS_OTP",
          identity_channel: "supabase_phone",
          updated_at: now,
        }, { onConflict: "user_id" });
      if (error) throw error;
    }
  }

  return {
    verified: phoneVerified,
    phone_verified: phoneVerified,
    phone_verified_at: phoneVerifiedAt,
    email_verified_at: emailVerifiedAt,
    identity_verified_at: verification?.identity_verified_at || null,
    verification_level: Number(verification?.verification_level || 0),
    phone_masked: phoneVerified ? maskedPhone(user.phone) : null,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "POST만 지원합니다." }), { status: 405, headers: cors });
  }

  try {
    const user = await currentUser(req);
    const body = await req.json().catch(() => ({}));
    const action = clean(body?.action || "status");

    if (action === "status" || action === "sync") {
      const state = await syncVerification(user);
      return new Response(JSON.stringify({
        ok: true,
        ...state,
        verification_method: state.phone_verified ? "SMS_OTP" : null,
        phone_sms_required: true,
        pass_required: false,
        pass_available: false,
      }), { headers: cors });
    }

    if (action === "prepare" || action === "complete") {
      return new Response(JSON.stringify({
        ok: false,
        error: "PASS/KCP 본인인증은 추후 도입 예정입니다. 현재 거래 기능은 휴대폰 SMS 인증으로 이용할 수 있습니다.",
        phone_sms_required: true,
        pass_required: false,
      }), { status: 409, headers: cors });
    }

    throw new Error("지원하지 않는 인증 작업입니다.");
  } catch (e) {
    return new Response(JSON.stringify({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    }), { status: 400, headers: cors });
  }
});