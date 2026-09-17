#!/usr/bin/env python3
"""Generate FUNY PIN's read-only Pokamo public feed.

Only publicly accessible cafe pages are requested. Posts are collected from each
public board page so categories that are not present on the cafe home listing are
still represented in FUNY TALK.
"""
from __future__ import annotations
import html, json, re, urllib.request
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote, urljoin, urlsplit, urlunsplit

CAFE_URL = "https://cafe.daangn.com/pokamo-pokesm-1"
OUT = Path("data/pokamo-feed.json")
MAX_ITEMS = 40
MAX_PER_BOARD = 12
UA = "Mozilla/5.0 (compatible; FUNY-PIN-Pokamo-Feed/1.0; +https://funypin.kr/)"


def clean(s):
    s = re.sub(r"<script\b[^>]*>.*?</script>|<style\b[^>]*>.*?</style>", " ", s or "", flags=re.I|re.S)
    s = re.sub(r"<[^>]+>", " ", s)
    return re.sub(r"\s+", " ", html.unescape(s)).strip()


def encoded_url(url):
    p = urlsplit(url)
    return urlunsplit((p.scheme, p.netloc, quote(p.path, safe="/%:@!$&'()*+,;=-._~%"), quote(p.query, safe="=&?/:;+,%@-._~"), ""))


def fetch(url):
    req = urllib.request.Request(encoded_url(url), headers={"User-Agent":UA,"Accept-Language":"ko-KR,ko;q=0.9,en;q=0.8"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read().decode("utf-8", errors="replace")


def meta(raw, key):
    for pat in (
        rf'<meta[^>]+(?:property|name)=["\']{re.escape(key)}["\'][^>]+content=["\']([^"\']*)["\']',
        rf'<meta[^>]+content=["\']([^"\']*)["\'][^>]+(?:property|name)=["\']{re.escape(key)}["\']'):
        m = re.search(pat, raw, re.I|re.S)
        if m: return html.unescape(m.group(1)).strip() or None
    return None


def jsonlds(raw):
    for body in re.findall(r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', raw, re.I|re.S):
        try: data=json.loads(html.unescape(body))
        except Exception: continue
        if isinstance(data,dict): yield data
        elif isinstance(data,list):
            for x in data:
                if isinstance(x,dict): yield x


def parse_category(label):
    text=clean(label)
    if "카드깡/카드샵 후기" in text: return "카드깡/카드샵 후기"
    if "카드 자랑" in text: return "카드 자랑"
    if "자유 게시판" in text: return "자유 게시판"
    if "정보 공유" in text: return "정보 공유"
    if "중고거래" in text or "카드 트레이딩" in text: return "카드거래"
    return None


def parse_engagement(label, title):
    text=clean(label)
    if title and title in text:
        text=text.split(title,1)[1]
    nums=[int(x.replace(",","")) for x in re.findall(r"\d[\d,]*",text)]
    views=nums[0] if nums else 0
    likes=nums[1] if len(nums)>1 else 0
    comments=nums[2] if len(nums)>2 else 0
    if "좋아요" in text and len(nums)==2:
        likes=nums[1]
    return views,likes,comments


def detail(url, label, category):
    raw=fetch(url)
    title=meta(raw,"og:title") or meta(raw,"twitter:title")
    excerpt=meta(raw,"og:description") or meta(raw,"description")
    image=meta(raw,"og:image") or meta(raw,"twitter:image")
    author=published=None
    for o in jsonlds(raw):
        a=o.get("author")
        if isinstance(a,dict): author=author or a.get("name")
        elif isinstance(a,str): author=author or a
        published=published or o.get("datePublished") or o.get("dateCreated")
        title=title or o.get("headline") or o.get("name")
        excerpt=excerpt or o.get("description")
    title=clean(title)
    title=re.sub(r"\s*\|\s*포카모.*$", "", title).strip()
    views,likes,comments=parse_engagement(label,title)
    return {"category":category,"title":title or None,"author":clean(author) or None,"publishedAt":published,"excerpt":clean(excerpt)[:240] or None,"image":image,"url":url,"views":views,"likes":likes,"comments":comments,"popularityScore":likes*3+comments*2+min(views,500)/100}


def post_anchors(raw):
    return re.findall(r'<a\b[^>]*href=["\']([^"\']*/pokamo-pokesm-1/posts/[^"\']+)["\'][^>]*>(.*?)</a>', raw, re.I|re.S)


def main():
    home=fetch(CAFE_URL)
    board_anchors=re.findall(r'<a\b[^>]*href=["\']([^"\']*/pokamo-pokesm-1/boards/[^"\']+)["\'][^>]*>(.*?)</a>', home, re.I|re.S)
    boards=[]; seen_boards=set()
    for href,body in board_anchors:
        category=parse_category(body)
        url=urljoin(CAFE_URL,html.unescape(href))
        if category and url not in seen_boards:
            seen_boards.add(url); boards.append((url,category))

    candidates=[]; seen=set()
    # Primary path: read each board directly. This avoids the cafe home page's
    # limited mixed feed hiding categories such as reviews and trading.
    for board_url,category in boards:
        try: raw=fetch(board_url)
        except Exception as e:
            print(f"skip board: {board_url}: {type(e).__name__}: {e}"); continue
        added=0
        for href,body in post_anchors(raw):
            url=urljoin(CAFE_URL,html.unescape(href))
            if url in seen: continue
            seen.add(url); candidates.append((url,clean(body),category)); added+=1
            if added>=MAX_PER_BOARD: break

    # Fallback for unexpected cafe markup changes.
    if not candidates:
        for href,body in post_anchors(home):
            label=clean(body); category=parse_category(label)
            url=urljoin(CAFE_URL,html.unescape(href))
            if not category or url in seen: continue
            seen.add(url); candidates.append((url,label,category))

    items=[]
    for url,label,category in candidates:
        try: items.append(detail(url,label,category))
        except Exception as e: print(f"skip detail: {url}: {type(e).__name__}: {e}")
    if not items: raise SystemExit("No valid public Pokamo detail posts collected; preserving previous feed.")

    def sort_key(x):
        try: return datetime.fromisoformat((x.get("publishedAt") or "").replace("Z","+00:00"))
        except Exception: return datetime.min.replace(tzinfo=timezone.utc)
    items.sort(key=sort_key, reverse=True)
    items=items[:MAX_ITEMS]
    payload={"source":"Pokamo public cafe","updatedAt":datetime.now(timezone.utc).isoformat(),"count":len(items),"items":items}
    OUT.parent.mkdir(parents=True,exist_ok=True)
    tmp=OUT.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    tmp.replace(OUT)
    print(f"generated {OUT}: {len(items)} posts across {len(boards)} boards")

if __name__=="__main__": main()
