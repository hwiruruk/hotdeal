import re
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from .base import fetch, make_id

SOURCE = "eomisae"
BASE = "https://eomisae.co.kr"
LIST_URL = f"{BASE}/fs"


def scrape():
    html = fetch(LIST_URL)
    soup = BeautifulSoup(html, "lxml")
    items = []
    seen = set()

    for a in soup.select("a"):
        href = a.get("href") or ""
        if not re.search(r"^/fs/\d+", href) and "document_srl=" not in href:
            continue
        title = (a.get_text() or "").strip()
        title = re.sub(r"\s+", " ", title)
        if not title or len(title) < 3:
            continue
        if any(x in title for x in ["댓글", "공지"]):
            continue
        url = urljoin(BASE, href.split("#")[0])
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
