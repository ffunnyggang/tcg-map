import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
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
    .select("id,user_id,verification_status")
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

    if (action === "status") {
      const [sellerResult, accountResult] = await Promise.all([
        admin.from("market_seller_verifications")
          .select("verification_provider,verification_status,phone_verified,verified_at")
          .eq("user_id", user.id)
          .maybeSingle(),
        admin.from("market_external_seller_accounts")
          .select("provider,verification_status,verified_at,last_checked_at")
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
        public_open_gate: { pass_required: true }
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
      const sellerId = clean(preview.external_seller_id) || null;
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
            seller_verification_scope: "account"
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
        seller_verification_scope: sellerId ? "account" : "listing",
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
      const previewSellerId = clean(preview.external_seller_id) || null;
      if (challenge.external_seller_id && previewSellerId !== challenge.external_seller_id) {
        throw new Error("판매자 계정 정보가 변경되어 인증할 수 없습니다.");
      }

      const attempts = Number(challenge.attempts || 0) + 1;
      const codes = (clean(preview.description).match(/FUNY-[A-Z0-9]{6}/gi) || []).map((x: string) => x.toUpperCase());
      let matched = false;
      for (const code of codes) {
        if (await sha256(code) === challenge.challenge_code_hash) { matched = true; break; }
      }

      if (!matched) {
        await admin.from("market_external_verification_challenges")
          .update({ attempts, status: attempts >= 5 ? "failed" : "pending" })
          .eq("id", challenge.id);
        throw new Error(attempts >= 5
          ? "인증코드를 확인하지 못했습니다. 새 인증코드를 발급해주세요."
          : "외부 매물 설명에서 인증코드를 찾지 못했습니다. 설명을 저장한 뒤 다시 확인해주세요.");
      }

      const now = new Date().toISOString();
      await admin.from("market_external_verification_challenges")
        .update({ status: "verified", attempts, verified_at: now })
        .eq("id", challenge.id);

      let accountVerified = false;
      const sellerId = previewSellerId || challenge.external_seller_id;
      if (sellerId) {
        const existing = await accountConflict(challenge.provider, sellerId, user.id);
        if (existing?.id) {
          const { error: updateError } = await admin.from("market_external_seller_accounts")
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
            .eq("id", existing.id);
          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await admin.from("market_external_seller_accounts").insert({
            user_id: user.id,
            provider: challenge.provider,
            external_seller_id: sellerId,
            external_seller_handle: clean(preview.external_seller_handle) || null,
            verification_status: "verified",
            verification_method: "listing_challenge",
            verified_listing_external_id: challenge.external_listing_id,
            verified_at: now,
            last_checked_at: now,
          });
          if (insertError) throw insertError;
        }
        accountVerified = true;
      }

      return new Response(JSON.stringify({
        ok: true,
        verified: true,
        provider: challenge.provider,
        external_listing_id: challenge.external_listing_id,
        account_verified: accountVerified,
        seller_verification_scope: accountVerified ? "account" : "listing"
      }), { headers: cors });
    }

    throw new Error("지원하지 않는 인증 작업입니다.");
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }), { status: 400, headers: cors });
  }
});
