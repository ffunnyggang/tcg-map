import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.57.4";

const baseCors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

function corsHeaders(req: Request) {
  const requested = clean(req.headers.get("access-control-request-headers"));
  return {
    ...baseCors,
    "Access-Control-Allow-Headers": requested || "authorization, x-client-info, apikey, content-type",
  };
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const clean = (v: unknown) => String(v ?? "").trim();

function accountVerifiedAt(user: any) {
  if (user?.email_confirmed_at) return user.email_confirmed_at;
  const provider = clean(user?.app_metadata?.provider || user?.app_metadata?.providers?.[0]);
  if (["google", "apple", "kakao"].includes(provider)) return user?.created_at || new Date().toISOString();
  return null;
}

function normalizeKrPhone(v: unknown) {
  const digits = clean(v).replace(/\D/g, "");
  if (/^010\d{8}$/.test(digits)) return "+82" + digits.slice(1);
  if (/^8210\d{8}$/.test(digits)) return "+" + digits;
  return "";
}

function phoneDigits(v: unknown) {
  return clean(v).replace(/\D/g, "");
}

function samePhone(a: unknown, b: unknown) {
  const left = phoneDigits(a);
  const right = phoneDigits(b);
  return !!left && left === right;
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function currentUser(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("로그인이 필요합니다.");
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) throw new Error("로그인 정보를 확인할 수 없습니다.");
  return { user: data.user, token, authHeader: "Bearer " + token };
}

function maskedPhone(phone: unknown) {
  const digits = clean(phone).replace(/\D/g, "");
  if (digits.length < 4) return null;
  return "•••• " + digits.slice(-4);
}

function friendlyError(raw: unknown) {
  const message = clean(raw);
  const item = (code: string, ko: string, en: string) => ({ code, ko, en });

  if (message.includes("PHONE_ALREADY_USED")) {
    return item("PHONE_ALREADY_USED", "이미 다른 FUNY PIN 계정에서 인증된 휴대폰 번호입니다.", "This phone number is already verified on another FUNY PIN account.");
  }
  if (message.includes("PHONE_VERIFICATION_IN_PROGRESS") || message.includes("PHONE_VERIFICATION_RESERVED")) {
    return item("PHONE_VERIFICATION_IN_PROGRESS", "다른 계정에서 인증이 진행 중인 휴대폰 번호입니다. 잠시 후 다시 시도해주세요.", "Verification for this phone number is already in progress on another account. Please try again shortly.");
  }
  if (message.includes("PHONE_OTP_COOLDOWN")) {
    return item("PHONE_OTP_COOLDOWN", "인증번호는 60초 후 다시 요청할 수 있습니다.", "You can request another verification code after 60 seconds.");
  }
  if (message.includes("PHONE_OTP_RATE_LIMIT") || /rate.?limit/i.test(message)) {
    return item("PHONE_OTP_RATE_LIMIT", "인증번호 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.", "Too many verification code requests. Please try again later.");
  }
  if (message.includes("INVALID_PHONE_VERIFICATION_REQUEST")) {
    return item("INVALID_PHONE", "휴대폰 번호를 다시 확인해주세요.", "Please check your phone number and try again.");
  }
  if (message.includes("PHONE_SMS_NOT_ENABLED")) {
    return item("PHONE_SMS_NOT_ENABLED", "휴대폰 SMS 인증을 준비 중입니다. 잠시 후 다시 시도해주세요.", "Phone SMS verification is being prepared. Please try again later.");
  }
  if (
    message.includes("Unexpected status code returned from hook") ||
    message.includes("SMS 발송 요청에 실패") ||
    message.includes("문자 발송사")
  ) {
    return item("SMS_SEND_FAILED", "인증번호 전송에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.", "We couldn't send the verification code. Please try again shortly.");
  }
  if (
    message.includes("Token has expired or is invalid") ||
    message.includes("otp_expired") ||
    message.includes("인증번호가 올바르지 않거나 만료") ||
    message.includes("인증번호 6자리를 확인")
  ) {
    return item("OTP_INVALID_OR_EXPIRED", "인증번호가 올바르지 않거나 만료되었습니다. 새 인증번호를 받아 다시 시도해주세요.", "The verification code is incorrect or has expired. Request a new code and try again.");
  }
  if (message.includes("로그인이 필요") || message.includes("로그인 정보를 확인할 수 없")) {
    return item("AUTH_REQUIRED", "로그인 정보가 만료되었습니다. 다시 로그인해주세요.", "Your sign-in session has expired. Please sign in again.");
  }
  if (message.includes("휴대폰 인증 완료 상태를 확인하지 못했습니다")) {
    return item("VERIFICATION_STATUS_FAILED", "인증 상태를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.", "We couldn't confirm your verification status. Please try again shortly.");
  }
  if (message.includes("지원하지 않는 계정 인증 작업")) {
    return item("UNSUPPORTED_ACTION", "요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.", "We couldn't process this request. Please try again shortly.");
  }
  return item("PHONE_VERIFICATION_FAILED", "휴대폰 인증을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.", "We couldn't complete phone verification. Please try again shortly.");
}

async function syncVerification(user: any) {
  const now = new Date().toISOString();
  const accountAt = accountVerifiedAt(user);
  const emailAt = user?.email_confirmed_at || null;
  const phoneAt = user?.phone_confirmed_at || null;

  const { data, error } = await admin
    .from("user_verifications")
    .upsert({
      user_id: user.id,
      account_verified_at: accountAt,
      email_verified_at: emailAt,
      phone_verified_at: phoneAt,
      updated_at: now,
    }, { onConflict: "user_id" })
    .select("account_verified_at,email_verified_at,phone_verified_at,identity_verified_at,verification_level")
    .single();
  if (error) throw error;

  return {
    verified: !!(user?.phone && phoneAt),
    account_verified_at: data?.account_verified_at || accountAt,
    email_verified_at: data?.email_verified_at || emailAt,
    phone_verified: !!(user?.phone && phoneAt),
    phone_verified_at: data?.phone_verified_at || phoneAt,
    identity_verified_at: data?.identity_verified_at || null,
    verification_level: Number(data?.verification_level || 0),
    phone_masked: phoneAt ? maskedPhone(user?.phone) : null,
  };
}

async function verificationSettings() {
  const { data, error } = await admin
    .from("account_verification_settings")
    .select("phone_sms_enabled,sms_provider")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  return {
    phone_sms_enabled: data?.phone_sms_enabled === true,
    sms_provider: clean(data?.sms_provider) || "solapi",
  };
}

async function releaseReservation(userId: string, phoneHash: string) {
  try {
    await admin.rpc("release_phone_verification_reservation", {
      p_user_id: userId,
      p_phone_hash: phoneHash,
    });
  } catch (_) {}
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "POST만 지원합니다." }), { status: 405, headers: corsHeaders(req) });
  }

  try {
    const { user, token, authHeader } = await currentUser(req);
    const body = await req.json().catch(() => ({}));
    const action = clean(body?.action || "status");

    if (action === "status" || action === "sync") {
      const fresh = (await admin.auth.getUser(token)).data?.user || user;
      const [state, settings] = await Promise.all([
        syncVerification(fresh),
        verificationSettings(),
      ]);
      return new Response(JSON.stringify({ ok: true, ...state, ...settings }), { headers: corsHeaders(req) });
    }

    if (action === "send_phone_otp") {
      const settings = await verificationSettings();
      if (!settings.phone_sms_enabled) {
        throw new Error("PHONE_SMS_NOT_ENABLED");
      }
      const phone = normalizeKrPhone(body?.phone);
      if (!phone) throw new Error("INVALID_PHONE_VERIFICATION_REQUEST");

      if (samePhone(user.phone, phone) && user.phone_confirmed_at) {
        const state = await syncVerification(user);
        return new Response(JSON.stringify({ ok: true, already_verified: true, ...state }), { headers: corsHeaders(req) });
      }

      const phoneHash = await sha256(phone);
      const { error: prepareError } = await admin.rpc("prepare_phone_verification", {
        p_user_id: user.id,
        p_phone: phone,
        p_phone_hash: phoneHash,
      });
      if (prepareError) throw new Error(prepareError.message || "PHONE_VERIFICATION_PREPARE_FAILED");

      const res = await fetch(SUPABASE_URL + "/auth/v1/user", {
        method: "PUT",
        headers: {
          "Authorization": authHeader,
          "apikey": ANON_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        await releaseReservation(user.id, phoneHash);
        throw new Error(clean(payload?.msg || payload?.message || payload?.error_description || payload?.error) || "SMS 발송 요청에 실패했습니다.");
      }

      return new Response(JSON.stringify({
        ok: true,
        sent: true,
        resend_after_seconds: 60,
      }), { headers: corsHeaders(req) });
    }

    if (action === "verify_phone_otp") {
      const phone = normalizeKrPhone(body?.phone);
      const otp = clean(body?.token).replace(/\D/g, "");
      if (!phone) throw new Error("INVALID_PHONE_VERIFICATION_REQUEST");
      if (!/^\d{6}$/.test(otp)) throw new Error("인증번호 6자리를 확인해주세요.");

      const current = (await admin.auth.getUser(token)).data?.user || user;
      if (samePhone(current.phone, phone) && current.phone_confirmed_at) {
        const state = await syncVerification(current);
        return new Response(JSON.stringify({ ok: true, already_verified: true, ...state }), { headers: corsHeaders(req) });
      }

      const phoneHash = await sha256(phone);
      const res = await fetch(SUPABASE_URL + "/auth/v1/verify", {
        method: "POST",
        headers: {
          "Authorization": authHeader,
          "apikey": ANON_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "phone_change",
          phone,
          token: otp,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        const afterFailure = (await admin.auth.getUser(token)).data?.user || null;
        if (afterFailure && samePhone(afterFailure.phone, phone) && afterFailure.phone_confirmed_at) {
          const state = await syncVerification(afterFailure);
          await releaseReservation(user.id, phoneHash);
          return new Response(JSON.stringify({ ok: true, already_verified: true, ...state }), { headers: corsHeaders(req) });
        }
        throw new Error(clean(payload?.msg || payload?.message || payload?.error_description || payload?.error) || "인증번호가 올바르지 않거나 만료되었습니다.");
      }

      const { data: freshData, error: freshError } = await admin.auth.getUser(token);
      if (freshError || !freshData?.user) throw new Error("휴대폰 인증 완료 상태를 확인하지 못했습니다.");
      const fresh = freshData.user;
      if (!samePhone(fresh.phone, phone) || !fresh.phone_confirmed_at) throw new Error("휴대폰 인증 완료 상태를 확인하지 못했습니다.");

      const state = await syncVerification(fresh);
      await releaseReservation(user.id, phoneHash);
      return new Response(JSON.stringify({ ok: true, ...state }), { headers: corsHeaders(req) });
    }

    throw new Error("지원하지 않는 계정 인증 작업입니다.");
  } catch (e) {
    const friendly = friendlyError(e instanceof Error ? e.message : String(e));
    return new Response(JSON.stringify({
      ok: false,
      error: friendly.ko,
      error_en: friendly.en,
      error_code: friendly.code,
    }), { status: 400, headers: corsHeaders(req) });
  }
});