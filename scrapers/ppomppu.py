import re
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from .base import fetch, make_id

SOURCE = "ppomppu"
BASE = "https://www.ppomppu.co.kr"
LIST_URL = f"{BASE}/hotdeal/"


def scrape():
    html = fetch(LIST_URL)
    soup = BeautifulSoup(html, "lxml")
    items = []
    seen = set()

    for a in soup.select("a"):
        href = a.get("href") or ""
        if "zboard/view.php" not in href or "id=ppomppu" not in href:
            continue
        title = (a.get_text() or "").strip()
        title = re.sub(r"\s+", " ", title)
        if not title or len(title) < 3:
            continue
        url = urljoin(BASE + "/hotdeal/", href)
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
