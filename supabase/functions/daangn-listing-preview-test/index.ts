import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

const decodeHtml = (value: string) => value
  .replace(/&amp;/g, "&")
  .replace(/&quot;/g, '"')
  .replace(/&#39;|&#x27;/g, "'")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/&#x2F;/g, "/");

const clean = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();

const allowedHost = (hostname: string) => {
  const h = hostname.toLowerCase();
  return h === "daangn.com" || h.endsWith(".daangn.com") ||
         h === "karrotmarket.com" || h.endsWith(".karrotmarket.com");
};

async function fetchDaangn(start: URL) {
  let current = new URL(start.toString());
  for (let i = 0; i < 5; i++) {
    if (!allowedHost(current.hostname)) throw new Error("당근 URL만 지원합니다.");
    const response = await fetch(current.toString(), {
      redirect: "manual",
      headers: {
        "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
        "accept": "text/html,application/xhtml+xml",
        "accept-language": "ko-KR,ko;q=0.9,en;q=0.7",
      },
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("리다이렉트 주소를 확인할 수 없습니다.");
      current = new URL(location, current);
      continue;
    }
    if (!response.ok) throw new Error("당근 페이지를 불러올 수 없습니다. (" + response.status + ")");
    return { response, finalUrl: current.toString() };
  }
  throw new Error("리다이렉트가 너무 많습니다.");
}

function meta(html: string, key: string) {
  const escaped = key.replace(/[.*+?^$(){}|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp('<meta[^>]+(?:property|name)=["\\\']' + escaped + '["\\\'][^>]+content=["\\\']([^"\\\']*)["\\\']', 'i'),
    new RegExp('<meta[^>]+content=["\\\']([^"\\\']*)["\\\'][^>]+(?:property|name)=["\\\']' + escaped + '["\\\']', 'i'),
  ];
  for (const re of patterns) {
    const match = html.match(re);
    if (match?.[1]) return clean(decodeHtml(match[1]));
  }
  return "";
}

function walkJson(value: unknown, out: Record<string, string>) {
  if (!value) return;
  if (Array.isArray(value)) {
    value.forEach((v) => walkJson(v, out));
    return;
  }
  if (typeof value !== "object") return;
  const obj = value as Record<string, unknown>;
  if (!out.title && typeof obj.name === "string") out.title = clean(obj.name);
  if (!out.image) {
    if (typeof obj.image === "string") out.image = clean(obj.image);
    else if (Array.isArray(obj.image) && typeof obj.image[0] === "string") out.image = clean(obj.image[0]);
  }
  if (!out.description && typeof obj.description === "string") out.description = clean(obj.description);
  const offers = obj.offers;
  if (offers && typeof offers === "object") {
    const offer = Array.isArray(offers) ? offers[0] as Record<string, unknown> : offers as Record<string, unknown>;
    if (!out.price && offer && offer.price != null) out.price = clean(offer.price);
    if (!out.currency && offer && offer.priceCurrency != null) out.currency = clean(offer.priceCurrency);
    if (!out.availability && offer && offer.availability != null) out.availability = clean(offer.availability);
  }
  if (!out.price && obj.price != null) out.price = clean(obj.price);
  if (!out.currency && obj.priceCurrency != null) out.currency = clean(obj.priceCurrency);
  Object.values(obj).forEach((v) => {
    if (typeof v === "object" && v !== null) walkJson(v, out);
  });
}

function jsonLdData(html: string) {
  const out: Record<string, string> = {};
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(html))) {
    try { walkJson(JSON.parse(match[1]), out); } catch (_) {}
  }
  return out;
}

function listingImages(html: string, primary: string) {
  const all: string[] = [];
  const re = /https:\/\/img\.kr\.gcp-karroter\.net\/origin\/article\/[^"'<>\\\s]+/gi;
  let match;
  while ((match = re.exec(html))) {
    const raw = clean(decodeHtml(match[0]).replace(/\\u0026/g, "&"));
    if (raw) all.push(raw);
  }

  const normalized = all.map((raw) => {
    try {
      const u = new URL(raw);
      u.search = "";
      return u.toString();
    } catch (_) { return raw.split("?")[0]; }
  });

  let primaryPath = "";
  let primaryStamp = NaN;
  try {
    const u = new URL(primary);
    primaryPath = u.origin + u.pathname;
    const filename = u.pathname.split("/").pop() || "";
    const stamp = filename.match(/^(\d{13})/);
    primaryStamp = stamp ? Number(stamp[1]) : NaN;
  } catch (_) {}

  const unique = [...new Set([primaryPath, ...normalized].filter(Boolean))];
  const batch = unique.filter((raw) => {
    if (!Number.isFinite(primaryStamp)) return raw === primaryPath;
    try {
      const filename = new URL(raw).pathname.split("/").pop() || "";
      const stamp = filename.match(/^(\d{13})/);
      return !!stamp && Math.abs(Number(stamp[1]) - primaryStamp) <= 120000;
    } catch (_) { return raw === primaryPath; }
  });

  const chosen = (batch.length ? batch : [primaryPath]).filter(Boolean).slice(0, 20);
  return chosen.map((raw) => {
    try {
      const u = new URL(raw);
      u.searchParams.set("f", "webp");
      u.searchParams.set("q", "95");
      u.searchParams.set("s", "1440x1440");
      u.searchParams.set("service", "webapp");
      u.searchParams.set("t", "inside");
      return u.toString();
    } catch (_) { return raw; }
  });
}

function normalizePrice(raw: string) {
  const value = clean(raw);
  if (!value) return "";
  const numeric = Number(value.replace(/,/g, "").replace(/원/g, "").trim());
  if (Number.isFinite(numeric)) return Math.round(numeric).toLocaleString("ko-KR") + "원";
  const matched = value.match(/([0-9][0-9,]*(?:\\.[0-9]+)?)/);
  if (!matched) return value;
  const number = Number(matched[1].replace(/,/g, ""));
  if (!Number.isFinite(number)) return value;
  return Math.round(number).toLocaleString("ko-KR") + "원";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    let rawUrl = "";
    if (req.method === "GET") {
      rawUrl = new URL(req.url).searchParams.get("url") || "";
    } else if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      rawUrl = clean(body?.url);
    } else {
      return new Response(JSON.stringify({ ok: false, error: "지원하지 않는 요청 방식입니다." }), { status: 405, headers: cors });
    }

    const input = new URL(rawUrl);
    if (input.protocol !== "https:" || !allowedHost(input.hostname)) throw new Error("https 당근 매물 URL만 지원합니다.");
    const isArticlePath = /\/articles\/\d+/i.test(input.pathname);
    const isBuySellPath = /\/kr\/buy-sell\/[a-z0-9-]+\/?$/i.test(input.pathname);
    if (!isArticlePath && !isBuySellPath) throw new Error("당근 중고거래 매물 URL 형식이 아닙니다.");

    const { response, finalUrl } = await fetchDaangn(input);
    const html = (await response.text()).slice(0, 2_000_000);
    const structured = jsonLdData(html);

    const ogTitle = meta(html, "og:title");
    const ogImage = meta(html, "og:image");
    const title = structured.title || ogTitle || meta(html, "twitter:title") || clean((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]);
    const description = structured.description || meta(html, "og:description") || meta(html, "description");
    const image = structured.image || ogImage || meta(html, "og:image:secure_url") || meta(html, "twitter:image");
    const images = listingImages(html, clean(image));
    const rawPrice = structured.price || meta(html, "product:price:amount") || meta(html, "og:price:amount") ||
      ((description.match(/(?:₩\s*)?([0-9][0-9,]{2,})\s*원/) || [])[1] || "");
    const currency = structured.currency || meta(html, "product:price:currency") || "KRW";
    const articleId = (input.pathname.match(/\/articles\/(\d+)/i) || [])[1] ||
      (input.pathname.match(/\/kr\/buy-sell\/([a-z0-9-]+)/i) || [])[1] || "";

    return new Response(JSON.stringify({
      ok: true,
      provider: "daangn",
      article_id: articleId,
      source_url: input.toString(),
      final_url: finalUrl,
      title: clean(title),
      price: normalizePrice(rawPrice),
      price_raw: clean(rawPrice),
      currency,
      image: clean(images[0] || image),
      images,
      description: clean(description),
      availability: structured.availability || "",
      fetched_at: new Date().toISOString(),
      debug: {
        has_og_title: !!ogTitle,
        has_og_image: !!ogImage,
        has_json_ld: Object.keys(structured).length > 0,
        html_length: html.length
      }
    }), { headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({
      ok: false,
      error: e instanceof Error ? e.message : String(e)
    }), { status: 400, headers: cors });
  }
});
