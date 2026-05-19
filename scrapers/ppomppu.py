import re
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from .base import fetch, make_id

SOURCE = "ppomppu"
BASE = "https://www.ppomppu.co.kr"
LIST_URLS = [
    f"{BASE}/zboard/zboard.php?id=ppomppu",
    f"{BASE}/hotdeal/",
]


def _parse(html, base_url):
    soup = BeautifulSoup(html, "lxml")
    items = []
    seen = set()
    for a in soup.select("a[href*='view.php']"):
        href = a.get("href") or ""
        if "id=ppomppu" not in href and "id=ppomppu4" not in href:
            continue
        title = re.sub(r"\s+", " ", (a.get_text() or "").strip())
        if not title or len(title) < 3:
            continue
        if any(t in title for t in ["이전", "다음", "처음", "마지막", "글쓰기"]):
            continue
        url = urljoin(base_url, href)
        url = re.sub(r"&page=\d+", "", url)
        if url in seen:
            continue
        seen.add(url)
        items.append({
            "id": make_id(SOURCE, url),
            "source": SOURCE,
            "title": title,
            "url": url,
        })
        if len(items) >= 40:
            break
    return items


def scrape():
    for url in LIST_URLS:
        try:
            html = fetch(url, headers={"Referer": BASE + "/"})
        except Exception:
            continue
        items = _parse(html, url)
        if items:
            return items
    return []
