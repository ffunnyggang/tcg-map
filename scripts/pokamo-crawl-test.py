#!/usr/bin/env python3
"""Read-only smoke test for Pokamo's public Daangn Cafe page.

This does not change FUNY PIN pages. It fetches the public cafe page once,
extracts visible post links, excludes trading boards, and writes a test JSON.
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


def clean(text: str) -> str:
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def main() -> None:
    req = urllib.request.Request(
        CAFE_URL,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; FUNY-PIN-Pokamo-Test/1.0; +https://funypin.kr/)"
        },
    )
    with urllib.request.urlopen(req, timeout=20) as res:
        raw = res.read().decode("utf-8", errors="replace")

    # Public post URLs currently contain /pokamo-pokesm-1/posts/.
    anchor_re = re.compile(
        r'<a\b[^>]*href=["\']([^"\']*/pokamo-pokesm-1/posts/[^"\']+)["\'][^>]*>(.*?)</a>',
        re.I | re.S,
    )
    seen = set()
    items = []
    for href, body in anchor_re.findall(raw):
        title = clean(body)
        url = urljoin(CAFE_URL, html.unescape(href))
        if not title or url in seen:
            continue
        if any(label in title for label in EXCLUDED):
            continue
        seen.add(url)
        items.append({"title": title, "url": url})
        if len(items) >= MAX_ITEMS:
            break

    payload = {
        "source": CAFE_URL,
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
        "count": len(items),
        "items": items,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    if not items:
        raise SystemExit("No public Pokamo post links were extracted; page structure may differ in Actions.")


if __name__ == "__main__":
    main()
