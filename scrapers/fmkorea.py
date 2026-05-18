import re
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from .base import fetch, make_id

SOURCE = "fmkorea"
BASE = "https://www.fmkorea.com"
LIST_URL = f"{BASE}/hotdeal"


def scrape():
    try:
        html = fetch(LIST_URL, headers={"Referer": BASE})
    except Exception:
        return []
    soup = BeautifulSoup(html, "lxml")
    items = []
    seen = set()

    for a in soup.select("a.hotdeal_var8, a"):
        href = a.get("href") or ""
        title = (a.get_text() or "").strip()
        if not title or len(title) < 4:
            continue
        if not (re.match(r"^/\d+$", href) or "document_srl=" in href or "/hotdeal/" in href):
            continue
        if "comment" in href.lower():
            continue
        url = urljoin(BASE, href.split("#")[0])
        if url in seen:
            continue
        seen.add(url)
        items.append({
            "id": make_id(SOURCE, url),
            "source": SOURCE,
            "title": re.sub(r"\s+", " ", title),
            "url": url,
        })
        if len(items) >= 40:
            break
    return items
