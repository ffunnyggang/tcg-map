import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

const clean = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim();
const decodeHtml = (v: string) => v
  .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#x2F;/g, "/");

const meta = (html: string, key: string) => {
  const k = key.replace(/[.*+?^$(){}|[\]\\]/g, "\\$&");
  for (const re of [
    new RegExp('<meta[^>]+(?:property|name)=["\\\']' + k + '["\\\'][^>]+content=["\\\']([^"\\\']*)["\\\']', "i"),
    new RegExp('<meta[^>]+content=["\\\']([^"\\\']*)["\\\'][^>]+(?:property|name)=["\\\']' + k + '["\\\']', "i"),
  ]) {
    const m = html.match(re);
    if (m?.[1]) return clean(decodeHtml(m[1]));
  }
  return "";
};

const formatPrice = (raw: unknown) => {
  const s = clean(raw);
  if (!s) return "";
  const m = s.replace(/,/g, "").match(/[0-9]+(?:\.[0-9]+)?/);
  if (!m) return s;
  const n = Number(m[0]);
  return Number.isFinite(n) ? Math.round(n).toLocaleString("ko-KR") + "원" : s;
};

const allowedHost = (h: string) => {
  const x = h.toLowerCase();
  return x === "daangn.com" || x.endsWith(".daangn.com") ||
    x === "karrotmarket.com" || x.endsWith(".karrotmarket.com") ||
    x === "go.bgzt.link" || x === "bgzt.link" || x.endsWith(".bgzt.link") ||
    x === "bunjang.co.kr" || x.endsWith(".bunjang.co.kr") ||
    x === "break.market" || x.endsWith(".break.market");
};

async function fetchHtml(start: URL, max = 6) {
  let current = new URL(start.toString());
  for (let i = 0; i < max; i++) {
    if (!allowedHost(current.hostname)) throw new Error("지원하지 않는 외부 도메인입니다.");
    const res = await fetch(current.toString(), {
      redirect: "manual",
      headers: {
        "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
        "accept": "text/html,application/xhtml+xml,application/json",
        "accept-language": "ko-KR,ko;q=0.9,en;q=0.7",
      },
    });
    const loc = res.headers.get("location");
    if (loc) {
      const next = new URL(loc, current);
      if (!allowedHost(next.hostname)) throw new Error("허용되지 않은 리다이렉트입니다.");
      current = next;
      continue;
    }
    if (!res.ok) throw new Error("외부 매물 페이지를 불러올 수 없습니다. (" + res.status + ")");
    return { html: (await res.text()).slice(0, 3_000_000), finalUrl: current.toString() };
  }
  throw new Error("리다이렉트가 너무 많습니다.");
}

function findProductLd(html: string) {
  const scripts = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  const visit = (v: any): any => {
    if (!v) return null;
    if (Array.isArray(v)) {
      for (const x of v) { const found = visit(x); if (found) return found; }
      return null;
    }
    if (typeof v !== "object") return null;
    const t = v["@type"];
    if (t === "Product" || (Array.isArray(t) && t.includes("Product"))) return v;
    for (const x of Object.values(v)) { const found = visit(x); if (found) return found; }
    return null;
  };
  while ((m = scripts.exec(html))) {
    try {
      const found = visit(JSON.parse(m[1]));
      if (found) return found;
    } catch (_) {}
  }
  return null;
}

function productImages(product: any) {
  const raw = product?.image;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return [...new Set(list.map((x: any) => typeof x === "string" ? clean(x) : clean(x?.url)).filter(Boolean))];
}

function daangnImages(html: string, primary: string) {
  const urls: string[] = [];
  const re = /https:\/\/img\.kr\.gcp-karroter\.net\/origin\/article\/[^"'<>\\\s]+/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const raw = clean(decodeHtml(m[0]).replace(/\\u0026/g, "&"));
    if (raw) urls.push(raw);
  }
  const normalize = (raw: string) => { try { const u = new URL(raw); u.search = ""; return u.toString(); } catch (_) { return raw.split("?")[0]; } };
  let primaryPath = normalize(primary), stamp = NaN;
  try {
    const f = new URL(primaryPath).pathname.split("/").pop() || "";
    const sm = f.match(/^(\d{13})/); stamp = sm ? Number(sm[1]) : NaN;
  } catch (_) {}
  const unique = [...new Set([primaryPath, ...urls.map(normalize)].filter(Boolean))];
  const chosen = unique.filter(raw => {
    if (!Number.isFinite(stamp)) return raw === primaryPath;
    try {
      const f = new URL(raw).pathname.split("/").pop() || "";
      const sm = f.match(/^(\d{13})/);
      return !!sm && Math.abs(Number(sm[1]) - stamp) <= 120000;
    } catch (_) { return raw === primaryPath; }
  });
  return (chosen.length ? chosen : [primaryPath]).filter(Boolean).slice(0, 20).map(raw => {
    try {
      const u = new URL(raw);
      u.searchParams.set("f", "webp"); u.searchParams.set("q", "95");
      u.searchParams.set("s", "1440x1440"); u.searchParams.set("service", "webapp"); u.searchParams.set("t", "inside");
      return u.toString();
    } catch (_) { return raw; }
  });
}

async function parseDaangn(input: URL) {
  const { html, finalUrl } = await fetchHtml(input);
  const product = findProductLd(html) || {};
  const title = clean(product.name) || meta(html, "og:title") || clean((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]);
  const description = clean(product.description) || meta(html, "og:description") || meta(html, "description");
  const offer = Array.isArray(product.offers) ? product.offers[0] : (product.offers || {});
  const image0 = typeof product.image === "string" ? product.image : productImages(product)[0] || meta(html, "og:image");
  const images = daangnImages(html, clean(image0));
  const sellerPath = (html.match(/href=["']\/kr\/users\/([^"'\/]+)\//i) || [])[1] || "";
  let sellerId = "";
  let sellerHandle = clean(offer?.seller?.name);
  if (sellerPath) {
    const decoded = decodeURIComponent(sellerPath);
    const bits = decoded.split("-");
    const suffix = bits[bits.length - 1] || "";
    sellerId = /^[a-z0-9]{8,}$/i.test(suffix) ? suffix : decoded;
    if (!sellerHandle && bits.length > 1) sellerHandle = bits.slice(0, -1).join("-");
  }
  const articleId = (input.pathname.match(/\/articles\/(\d+)/i) || [])[1] ||
    (new URL(finalUrl).pathname.match(/\/kr\/buy-sell\/([a-z0-9-]+)/i) || [])[1] || "";
  const availability = clean(offer?.availability);
  return {
    provider: "daangn", external_listing_id: articleId, external_seller_id: sellerId || null,
    external_seller_handle: sellerHandle || null, final_url: finalUrl, title, description,
    price_raw: clean(offer?.price), currency: clean(offer?.priceCurrency) || "KRW",
    images, availability, source_status: /InStock/i.test(availability) ? "active" : "unknown",
    direct_buy_available: null, seller_verification_scope: sellerId ? "account" : "listing"
  };
}

async function resolveBunjang(input: URL) {
  if (!/bgzt\.link$/i.test(input.hostname) && !input.hostname.endsWith(".bgzt.link")) return input.toString();
  const res = await fetch(input.toString(), { redirect: "manual", headers: { "user-agent": "Mozilla/5.0" } });
  const loc = res.headers.get("location");
  if (!loc) throw new Error("번개장터 단축 URL의 상품 주소를 확인할 수 없습니다.");
  const next = new URL(loc, input);
  if (!/bunjang\.co\.kr$/i.test(next.hostname) && !next.hostname.endsWith(".bunjang.co.kr")) throw new Error("잘못된 번개장터 리다이렉트입니다.");
  return next.toString();
}

async function parseBunjang(input: URL) {
  const resolved = await resolveBunjang(input);
  const u = new URL(resolved);
  const pid = (u.pathname.match(/\/products\/(\d+)/i) || [])[1];
  if (!pid) throw new Error("번개장터 상품 ID를 확인할 수 없습니다.");
  const api = "https://api.bunjang.co.kr/api/pms/v2/products/" + pid + "?include=brand,common,location,image,transaction,export,option,media";
  const res = await fetch(api, { headers: { "user-agent": "Mozilla/5.0", "accept": "application/json" } });
  if (!res.ok) throw new Error("번개장터 상품 정보를 불러올 수 없습니다. (" + res.status + ")");
  const payload = await res.json();
  const d = payload?.data;
  if (!d) throw new Error("번개장터 상품 정보가 없습니다.");
  const count = Math.max(0, Number(d.imageCount) || 0);
  const template = clean(d.imageUrlTemplate);
  const images: string[] = [];
  if (template && count) for (let i = 1; i <= count; i++) images.push(template.replace("{cnt}", String(i)).replace("{res}", "1200"));
  const sale = clean(d.saleStatus);
  const sourceStatus = sale === "SELLING" || sale === "RESERVED" ? "active" : sale === "SOLD_OUT" ? "sold" : sale === "DELETED" ? "deleted" : "unknown";
  return {
    provider: "bunjang", external_listing_id: String(pid), external_seller_id: d.uid != null ? String(d.uid) : null,
    external_seller_handle: null, final_url: "https://m.bunjang.co.kr/products/" + pid,
    title: clean(d.common?.name), description: clean(d.common?.description),
    price_raw: clean(d.transaction?.price), currency: "KRW", images,
    availability: sale, source_status: sourceStatus, direct_buy_available: null,
    seller_verification_scope: d.uid != null ? "account" : "listing",
    source_extra: { category_name: clean(d.categoryName), image_count: count }
  };
}

async function parseBreak(input: URL) {
  const pid = (input.pathname.match(/\/products\/(\d+)/i) || [])[1];
  if (!pid) throw new Error("BREAK 상품 ID를 확인할 수 없습니다.");
  let { html, finalUrl } = await fetchHtml(input);
  if (!/\/products\/\d+\/.+/i.test(new URL(finalUrl).pathname)) {
    const metaRedirect = (html.match(/id=["']__next-page-redirect["'][^>]+content=["'][^"']*url=([^"']+)["']/i) || [])[1];
    const nextRedirect = (html.match(/NEXT_REDIRECT;replace;([^;]+);307;/i) || [])[1];
    const path = metaRedirect || nextRedirect;
    if (path) {
      const next = new URL(decodeHtml(path), finalUrl);
      const fetched = await fetchHtml(next); html = fetched.html; finalUrl = fetched.finalUrl;
    }
  }
  const product = findProductLd(html) || {};
  const offer = Array.isArray(product.offers) ? product.offers[0] : (product.offers || {});
  const title = clean(product.name) || meta(html, "og:title").replace(/\s+[0-9,]+원.*$/,"") ||
    clean((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]).replace(/\s+[0-9,]+원.*$/,"");
  const description = clean(product.description) || meta(html, "og:description") || meta(html, "description");
  let images = productImages(product);
  const ogImage = meta(html, "og:image");
  if (!images.length && ogImage) images = [ogImage];
  const availability = clean(offer?.availability);
  const direct = /즉시\s*구매/.test(meta(html, "og:title") + " " + description + " " + clean((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]));
  return {
    provider: "break", external_listing_id: String(pid), external_seller_id: null,
    external_seller_handle: clean(offer?.seller?.name) || null, final_url: finalUrl,
    title, description, price_raw: clean(offer?.price) || (meta(html, "og:title").match(/([0-9][0-9,]*)원/) || [])[1] || "",
    currency: clean(offer?.priceCurrency) || "KRW", images,
    availability, source_status: /InStock/i.test(availability) ? "active" : availability ? "sold" : "unknown",
    direct_buy_available: direct, seller_verification_scope: "listing"
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ ok: false, error: "POST만 지원합니다." }), { status: 405, headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const rawUrl = clean(body?.url);
    const input = new URL(rawUrl);
    if (input.protocol !== "https:" || !allowedHost(input.hostname)) throw new Error("지원하는 외부 매물 URL을 입력해주세요.");

    let data: any;
    const host = input.hostname.toLowerCase();
    if (host === "daangn.com" || host.endsWith(".daangn.com") || host === "karrotmarket.com" || host.endsWith(".karrotmarket.com")) {
      data = await parseDaangn(input);
    } else if (host === "go.bgzt.link" || host === "bgzt.link" || host.endsWith(".bgzt.link") || host === "bunjang.co.kr" || host.endsWith(".bunjang.co.kr")) {
      data = await parseBunjang(input);
    } else if (host === "break.market" || host.endsWith(".break.market")) {
      data = await parseBreak(input);
    } else {
      throw new Error("지원하지 않는 플랫폼입니다.");
    }

    const images = [...new Set((data.images || []).filter(Boolean))];
    return new Response(JSON.stringify({
      ok: true,
      ...data,
      source_url: input.toString(),
      image: images[0] || "",
      images,
      price: formatPrice(data.price_raw),
      fetched_at: new Date().toISOString(),
    }), { headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }), { status: 400, headers: cors });
  }
});
