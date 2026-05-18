from bs4 import BeautifulSoup
from urllib.parse import urljoin
from .base import fetch, make_id

SOURCE = "theqoo"
BASE = "https://theqoo.net"
LIST_URL = f"{BASE}/theqdeal"


def scrape():
    html = fetch(LIST_URL)
    soup = BeautifulSoup(html, "lxml")
    items = []
    seen = set()

    for a in soup.select("a"):
        href = a.get("href") or ""
        title = (a.get_text() or "").strip()
        if not title or len(title) < 2:
            continue
        if "/theqdeal/" not in href and not href.startswith("/index.php?mid=theqdeal"):
            continue
        if "page=" in href or "#" in href:
            continue
        url = urljoin(BASE, href)
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
