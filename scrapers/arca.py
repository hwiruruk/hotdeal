import re
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from .base import fetch, make_id

SOURCE = "arca"
BASE = "https://arca.live"
LIST_URL = f"{BASE}/b/hotdeal"


def scrape():
    html = fetch(LIST_URL)
    soup = BeautifulSoup(html, "lxml")
    items = []
    seen = set()

    for a in soup.select("a.vrow, a.title, a"):
        href = a.get("href") or ""
        if not re.search(r"^/b/hotdeal/\d+", href):
            continue
        title_el = a.select_one(".title") or a
        title = (title_el.get_text() or "").strip()
        title = re.sub(r"\s+", " ", title)
        if not title:
            continue
        url = urljoin(BASE, href.split("?")[0])
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
