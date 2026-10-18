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

const findVerificationCodes = (html: string) => {
  const decoded = decodeHtml(String(html || "")).replace(/\\u002d/gi, "-");
  return [...new Set((decoded.match(/FUNY-[A-Z0-9]{6}/gi) || []).map(x => x.toUpperCase()))].slice(0, 20);
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
      cache: "no-store",
      headers: {
        "cache-control": "no-cache, no-store, max-age=0",
        "pragma": "no-cache",
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

function koreaCoord(lat: unknown, lng: unknown) {
  const a = Number(lat), b = Number(lng);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (a < 30 || a > 40 || b < 120 || b > 132) return null;
  return { lat: a, lng: b };
}

function coordFrom(value: any, depth = 0): {lat:number,lng:number}|null {
  if (!value || depth > 2) return null;
  if (Array.isArray(value) && value.length >= 2) {
    return koreaCoord(value[1], value[0]) || koreaCoord(value[0], value[1]);
  }
  if (typeof value !== "object") return null;
  const direct =
    koreaCoord(value.latitude, value.longitude) ||
    koreaCoord(value.lat, value.lng) ||
    koreaCoord(value.lat, value.lon) ||
    koreaCoord(value.y, value.x);
  if (direct) return direct;
  for (const key of ["geo","location","center","point","coordinate","coordinates","position"]) {
    const nested = coordFrom(value?.[key], depth + 1);
    if (nested) return nested;
  }
  return null;
}

function firstCoord(...values: any[]) {
  for (const value of values) {
    const point = coordFrom(value);
    if (point) return point;
  }
  return null;
}

function sanitizeBreakDescription(raw: unknown, title: string) {
  let text = clean(decodeHtml(String(raw ?? ""))).replace(/\s+/g, " ").trim();
  const hasGeneratedPrefix = /^\s*\[#?\d+\]/i.test(text);
  text = text.replace(/\bFUNY-[A-Z0-9]{6}\b/gi, " ");
  text = text.replace(/\s*BREAK\s*마켓플레이스에서\s*안전하게\s*거래하세요\.?\s*$/i, "");
  if (hasGeneratedPrefix) {
    text = text.replace(/^\s*\[#?\d+\]\s*/i, "");
    text = text.replace(/^.*?가격\s*[0-9][0-9,]*\s*원\.\s*/i, "");
    text = text.replace(/^배송비\s*[0-9][0-9,]*\s*원\.\s*/i, "");
    text = text.replace(/^판매자\s+[^.]+?\.\s*/i, "");
  }
  if (title && text.startsWith(title)) {
    text = text.slice(title.length).replace(/^\s*[-–—:·]\s*/, "");
  }
  return text.replace(/\s{2,}/g, " ").trim();
}

function tcgRelevance(data: any) {
  const norm = (v: unknown) => clean(v).normalize("NFKC").toLowerCase();
  const title = norm(data?.title);
  const description = norm(data?.description);
  const sourceCategory = norm(data?.source_extra?.category_name);
  const provider = norm(data?.provider);
  const text = [title, description, sourceCategory].filter(Boolean).join(" ");

  let score = 0;
  const signals: string[] = [];
  const add = (points: number, signal: string) => { score += points; signals.push(signal); };

  if (provider === "break") add(5, "tcg_marketplace");
  if (/(tcg|트레이딩\s*카드|trading\s*cards?|카드\s*게임|card\s*game)/i.test(sourceCategory)) add(5, "tcg_category");

  if (/(포켓몬\s*카드|포켓몬카드|pokemon\s*(?:tcg|cards?)|원피스\s*카드|원피스카드|one\s*piece\s*(?:tcg|cards?)|드래곤볼\s*카드|dragon\s*ball\s*(?:tcg|cards?)|유희왕|yu-?gi-?oh|디지몬\s*카드|digimon\s*(?:tcg|cards?)|magic\s*[: ]?the\s*gathering|\bmtg\b|weiss\s*schwarz|바이스\s*슈바르츠|union\s*arena|유니온\s*아레나|lorcana|로카나|flesh\s*and\s*blood|카드파이트\s*뱅가드|cardfight\s*vanguard|battle\s*spirits|배틀\s*스피리츠|듀얼\s*마스터즈|duel\s*masters)/i.test(text)) {
    add(6, "tcg_title_or_description");
  }

  if (/(카드\s*슬리브|슬리브\s*프로텍터|deck\s*box|덱\s*케이스|플레이\s*매트|playmat|카드\s*바인더|card\s*binder|탑로더|toploader|카드\s*로더|카드\s*프로텍터|card\s*sleeves?)/i.test(text)) {
    add(6, "tcg_accessory");
  }

  if (/(포켓몬|pokemon|원피스|one\s*piece|드래곤볼|dragon\s*ball|유희왕|yu-?gi-?oh|디지몬|digimon|weiss|바이스|union\s*arena|유니온\s*아레나|lorcana|로카나|뱅가드|vanguard)/i.test(text)) add(2, "tcg_brand");
  if (/(\bcard\b|\bcards\b|카드|deck|덱|booster|부스터|팩|\bpack\b|\bbox\b|박스)/i.test(text)) add(2, "card_product");
  if (/(\bpsa\s*(?:10|9|8)\b|\bbgs\s*(?:10|9\.5|9)\b|\bcgc\s*(?:10|9\.5|9)\b|그레이딩|graded)/i.test(text)) add(2, "grading");
  if (/\b(?:op|eb|st|prb|sv|sm|xy|bw|swsh|dp|cp|bt|fb|fs|ua)[- ]?[a-z0-9]{1,4}[-\/][a-z0-9]{1,4}\b/i.test(text) || /\b(?:xy|sm|sv|s|swsh)[- ]?p\b/i.test(text)) add(3, "set_code");
  if (/\b\d{1,4}\s*\/\s*\d{1,4}\b/.test(text)) add(3, "card_number");
  if (/(\bsar\b|\bsr\b|\bur\b|\bar\b|\brrr\b|\brr\b|\bcsr\b|\bchr\b|\bsec\b|\bsp\b|alt\s*art|alternate\s*art|holo|홀로|프로모|promo)/i.test(text)) add(2, "card_rarity");
  if (/(미개봉|sealed|booster\s*box|스타터\s*덱|starter\s*deck|구축덱)/i.test(text)) add(1, "sealed_or_deck");

  if (/(포토\s*카드|포토카드|photocard|photo\s*card|신용\s*카드|credit\s*card)/i.test(text)) add(-8, "non_tcg_card");
  if (/(피규어|figure|인형|plush|봉제|키링|keyring|keychain|아크릴|acrylic|스티커|sticker|포스터|poster|티셔츠|t-?shirt|의류|신발|shoes?|가방|\bbag\b|머그|mug|텀블러|완구|\btoy\b|프라모델|model\s*kit|닌텐도|nintendo|switch\s*(?:게임|console)|게임기|앨범|\balbum\b)/i.test(text)) add(-6, "merchandise");
  if (/(야구|baseball|농구|basketball|축구|soccer|\btopps\b|\bpanini\b)/i.test(text)) add(-6, "sports_card");

  return {
    allowed: score >= 5,
    score,
    confidence: score >= 8 ? "high" : score >= 5 ? "medium" : "low",
    signals: signals.slice(0, 10),
  };
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
  const sellerLocation = firstCoord(
    offer?.availableAtOrFrom,
    offer?.seller?.location,
    product?.availableAtOrFrom,
    product?.contentLocation,
    product?.location,
    product?.seller?.location
  );
  return {
    provider: "daangn", external_listing_id: articleId, external_seller_id: sellerId || null,
    external_seller_handle: sellerHandle || null, final_url: finalUrl, title, description,
    price_raw: clean(offer?.price), currency: clean(offer?.priceCurrency) || "KRW",
    images, availability, source_status: /InStock/i.test(availability) ? "active" : "unknown",
    seller_location_latitude: sellerLocation?.lat ?? null,
    seller_location_longitude: sellerLocation?.lng ?? null,
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
  const sellerLocation = firstCoord(d.location, d.common?.location, d.transaction?.location);
  return {
    provider: "bunjang", external_listing_id: String(pid), external_seller_id: d.uid != null ? String(d.uid) : null,
    external_seller_handle: null, final_url: "https://m.bunjang.co.kr/products/" + pid,
    title: clean(d.common?.name), description: clean(d.common?.description),
    price_raw: clean(d.transaction?.price), currency: "KRW", images,
    availability: sale, source_status: sourceStatus,
    seller_location_latitude: sellerLocation?.lat ?? null,
    seller_location_longitude: sellerLocation?.lng ?? null,
    direct_buy_available: null,
    seller_verification_scope: d.uid != null ? "account" : "listing",
    verification_codes: [...new Set(((JSON.stringify(payload)||"").match(/FUNY-[A-Z0-9]{6}/gi)||[]).map((x:string)=>x.toUpperCase()))].slice(0,20),
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
  const rawDescription = clean(product.description) || meta(html, "og:description") || meta(html, "description");
  let images = productImages(product);
  const ogImage = meta(html, "og:image");
  if (!images.length && ogImage) images = [ogImage];
  const availability = clean(offer?.availability);
  const direct = /즉시\s*구매/.test(meta(html, "og:title") + " " + rawDescription + " " + clean((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]));
  const sellerHandle = clean(offer?.seller?.name) || null;
  const description = sanitizeBreakDescription(rawDescription, title);
  const sellerLocation = firstCoord(
    offer?.availableAtOrFrom,
    offer?.seller?.location,
    product?.availableAtOrFrom,
    product?.contentLocation,
    product?.location,
    product?.seller?.location
  );
  return {
    provider: "break", external_listing_id: String(pid), external_seller_id: null,
    external_seller_handle: sellerHandle, final_url: finalUrl,
    title, description, price_raw: clean(offer?.price) || (meta(html, "og:title").match(/([0-9][0-9,]*)원/) || [])[1] || "",
    currency: clean(offer?.priceCurrency) || "KRW", images,
    availability, source_status: /InStock/i.test(availability) ? "active" : availability ? "sold" : "unknown",
    seller_location_latitude: sellerLocation?.lat ?? null,
    seller_location_longitude: sellerLocation?.lng ?? null,
    direct_buy_available: direct,
    seller_verification_scope: sellerHandle ? "account" : "listing",
    seller_identity_source: sellerHandle ? "seller_display_name" : "listing",
    verification_codes: typeof findVerificationCodes === "function" ? findVerificationCodes(html) : []
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
    const tcg = tcgRelevance(data);
    return new Response(JSON.stringify({
      ok: true,
      ...data,
      tcg_allowed: tcg.allowed,
      tcg_score: tcg.score,
      tcg_confidence: tcg.confidence,
      tcg_signals: tcg.signals,
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
