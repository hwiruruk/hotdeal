import re
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from .base import fetch, make_id

SOURCE = "ruliweb"
BASE = "https://m.ruliweb.com"
LIST_URL = f"{BASE}/market/board/1020"


def scrape():
    html = fetch(LIST_URL)
    soup = BeautifulSoup(html, "lxml")
    items = []
    seen = set()

    for a in soup.select("a"):
        href = a.get("href") or ""
        if not re.search(r"/market/board/1020/read/\d+", href):
            continue
        title_el = a.select_one(".subject_inner_text, .subject, .title") or a
        title = (title_el.get_text() or "").strip()
        title = re.sub(r"\s+", " ", title)
        if not title or len(title) < 2:
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
