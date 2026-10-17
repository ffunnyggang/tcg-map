import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

const SOLAPI_ENDPOINT = "https://api.solapi.com/messages/v4/send-many/detail";

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function env(name: string) {
  return clean(Deno.env.get(name));
}

function errorResponse(message: string, httpCode = 500, status = 500) {
  return new Response(
    JSON.stringify({ error: { http_code: httpCode, message } }),
    { status, headers: jsonHeaders },
  );
}

function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

async function solapiAuthorization(apiKey: string, apiSecret: string) {
  const date = new Date().toISOString();
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const salt = Array.from(saltBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const signature = await hmacSha256(apiSecret, date + salt);
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

function normalizedSender(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 ? digits : "";
}

function koreanRecipient(value: string) {
  const raw = value.replace(/[\s-]/g, "");
  if (/^\+8210\d{8}$/.test(raw)) return "0" + raw.slice(3);
  if (/^8210\d{8}$/.test(raw)) return "0" + raw.slice(2);
  if (/^010\d{8}$/.test(raw)) return raw;
  return "";
}

function hookSecrets() {
  return env("SEND_SMS_HOOK_SECRETS")
    .split("|")
    .map((v) => v.trim())
    .filter(Boolean);
}

function verifyWebhook(payload: string, headers: Record<string, string>) {
  const secrets = hookSecrets();
  if (!secrets.length) throw new Error("SEND_SMS_HOOK_SECRETS_NOT_CONFIGURED");

  let lastError: unknown = null;
  for (const raw of secrets) {
    const secret = raw.replace(/^v1,whsec_/, "");
    try {
      return new Webhook(secret).verify(payload, headers) as {
        user?: { id?: string; phone?: string };
        sms?: { otp?: string; phone?: string; sms_type?: string };
      };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("INVALID_WEBHOOK_SIGNATURE");
}

async function sendSolapiSms(phone: string, otp: string) {
  const apiKey = env("SOLAPI_API_KEY");
  const apiSecret = env("SOLAPI_API_SECRET");
  const sender = normalizedSender(env("SOLAPI_SENDER_NUMBER"));

  if (!apiKey || !apiSecret || !sender) {
    throw new Error("SOLAPI_CONFIGURATION_INCOMPLETE");
  }

  const to = koreanRecipient(phone);
  if (!to) throw new Error("UNSUPPORTED_SMS_DESTINATION");

  const authorization = await solapiAuthorization(apiKey, apiSecret);
  const text = `[FUNY PIN] 인증번호: ${otp}\n요청하지 않았다면 무시해주세요.`;

  const response = await fetch(SOLAPI_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      messages: [{
        to,
        from: sender,
        text,
        type: "SMS",
        country: "82",
        autoTypeDetect: false,
      }],
      strict: true,
      allowDuplicates: false,
      showMessageList: true,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      clean(data?.errorMessage || data?.message || data?.error?.message) ||
        `SOLAPI_HTTP_${response.status}`,
    );
  }

  const failed = Array.isArray(data?.failedMessageList) ? data.failedMessageList : [];
  const registeredSuccess = Number(data?.groupInfo?.count?.registeredSuccess ?? 0);
  const registeredFailed = Number(data?.groupInfo?.count?.registeredFailed ?? failed.length);

  if (failed.length || registeredFailed > 0 || registeredSuccess < 1) {
    const providerMessage = clean(failed?.[0]?.statusMessage);
    throw new Error(providerMessage || "SOLAPI_MESSAGE_NOT_REGISTERED");
  }

  return {
    groupId: clean(data?.groupInfo?.groupId),
    messageId: clean(data?.messageList?.[0]?.messageId),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return errorResponse("POST만 지원합니다.", 405, 405);

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers.entries());

  try {
    const event = verifyWebhook(payload, headers);
    const otp = clean(event?.sms?.otp);
    const phone = clean(event?.sms?.phone || event?.user?.phone);

    if (!/^\d{6}$/.test(otp)) return errorResponse("인증번호 형식이 올바르지 않습니다.", 400, 400);
    if (!phone) return errorResponse("SMS 수신번호를 확인할 수 없습니다.", 400, 400);

    const sent = await sendSolapiSms(phone, otp);

    console.log(JSON.stringify({
      event: "auth_sms_sent",
      provider: "solapi",
      user_id: clean(event?.user?.id) || null,
      group_id: sent.groupId || null,
      message_id: sent.messageId || null,
    }));

    return new Response(JSON.stringify({}), { status: 200, headers: jsonHeaders });
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    const configurationError =
      raw === "SEND_SMS_HOOK_SECRETS_NOT_CONFIGURED" ||
      raw === "SOLAPI_CONFIGURATION_INCOMPLETE";

    console.error(JSON.stringify({
      event: "auth_sms_send_failed",
      provider: "solapi",
      reason: raw.slice(0, 240),
    }));

    return errorResponse(
      configurationError
        ? "SMS 발송 설정이 아직 완료되지 않았습니다."
        : "인증번호 문자 발송에 실패했습니다. 잠시 후 다시 시도해주세요.",
      configurationError ? 503 : 502,
      configurationError ? 503 : 502,
    );
  }
});
