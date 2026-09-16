#!/usr/bin/env python3
"""Read-only Pokamo public feed/detail crawler smoke test.

This does not change FUNY PIN pages. It fetches the public cafe page, extracts
visible non-trading post links, then reads a few public post pages to verify
which detail fields are available to GitHub Actions.
"""
from __future__ import annotations

import html
import json
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin

CAFE_URL = "https://cafe.daangn.com/pokamo-pokesm-1"
OUT = Path("data/pokamo-feed-test.json")
EXCLUDED = ("중고거래", "카드 트레이딩")
MAX_ITEMS = 20
DETAIL_ITEMS = 5
UA = "Mozilla/5.0 (compatible; FUNY-PIN-Pokamo-Test/1.1; +https://funypin.kr/)"


def clean(text: str) -> str:
    text = re.sub(r"<script\b[^>]*>.*?</script>|<style\b[^>]*>.*?</style>", " ", text, flags=re.I | re.S)
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8"})
    with urllib.request.urlopen(req, timeout=20) as res:
        return res.read().decode("utf-8", errors="replace")


def meta(raw: str, prop: str) -> str | None:
    patterns = [
        rf'<meta[^>]+(?:property|name)=["\']{re.escape(prop)}["\'][^>]+content=["\']([^"\']*)["\']',
        rf'<meta[^>]+content=["\']([^"\']*)["\'][^>]+(?:property|name)=["\']{re.escape(prop)}["\']',
    ]
    for pattern in patterns:
        m = re.search(pattern, raw, re.I | re.S)
        if m:
            return html.unescape(m.group(1)).strip() or None
    return None


def jsonld_objects(raw: str):
    for body in re.findall(r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', raw, re.I | re.S):
        try:
            data = json.loads(html.unescape(body))
        except Exception:
            continue
        if isinstance(data, list):
            yield from (x for x in data if isinstance(x, dict))
        elif isinstance(data, dict):
            yield data


def detail(url: str) -> dict:
    raw = fetch(url)
    title = meta(raw, "og:title") or meta(raw, "twitter:title")
    description = meta(raw, "og:description") or meta(raw, "description")
    image = meta(raw, "og:image") or meta(raw, "twitter:image")
    author = None
    published = None
    for obj in jsonld_objects(raw):
        author_obj = obj.get("author")
        if isinstance(author_obj, dict):
            author = author or author_obj.get("name")
        elif isinstance(author_obj, str):
            author = author or author_obj
        published = published or obj.get("datePublished") or obj.get("dateCreated")
        title = title or obj.get("headline") or obj.get("name")
        description = description or obj.get("description")
        img = obj.get("image")
        if not image and isinstance(img, str):
            image = img
        elif not image and isinstance(img, list) and img:
            image = img[0] if isinstance(img[0], str) else None

    # Keep only a short public preview in the test artifact.
    if description:
        description = clean(description)[:240]
    return {
        "title": clean(title or "") or None,
        "author": clean(author or "") or None,
        "publishedAt": published,
        "excerpt": description,
        "image": image,
        "url": url,
    }


def main() -> None:
    raw = fetch(CAFE_URL)
    anchor_re = re.compile(
        r'<a\b[^>]*href=["\']([^"\']*/pokamo-pokesm-1/posts/[^"\']+)["\'][^>]*>(.*?)</a>',
        re.I | re.S,
    )
    seen = set()
    items = []
    for href, body in anchor_re.findall(raw):
        label = clean(body)
        url = urljoin(CAFE_URL, html.unescape(href))
        if not label or url in seen or any(x in label for x in EXCLUDED):
            continue
        seen.add(url)
        items.append({"listLabel": label, "url": url})
        if len(items) >= MAX_ITEMS:
            break

    for item in items[:DETAIL_ITEMS]:
        try:
            item["detail"] = detail(item["url"])
            item["detailStatus"] = "ok"
        except Exception as exc:
            item["detailStatus"] = "error"
            item["detailError"] = f"{type(exc).__name__}: {exc}"

    payload = {
        "source": CAFE_URL,
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
        "count": len(items),
        "detailTestCount": min(DETAIL_ITEMS, len(items)),
        "items": items,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    if not items:
        raise SystemExit("No public Pokamo post links were extracted; page structure may differ in Actions.")
    if items and not any(x.get("detailStatus") == "ok" for x in items[:DETAIL_ITEMS]):
        raise SystemExit("Public list worked, but all detail-page requests failed.")


if __name__ == "__main__":
    main()
