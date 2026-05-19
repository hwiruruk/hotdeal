import re
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from .base import fetch, make_id

SOURCE = "theqoo"
BASE = "https://theqoo.net"
LIST_URL = f"{BASE}/theqdeal"

NOTICE_KEYWORDS = (
    "공지", "이용 규칙", "안내", "비밀번호", "이미지 안보임",
    "게시판관리팀", "운영진", "카테고리 이용",
)


def scrape():
    html = fetch(LIST_URL)
    soup = BeautifulSoup(html, "lxml")
    items = []
    seen = set()

    for a in soup.select("a[href*='/theqdeal/']"):
        href = a.get("href") or ""
        m = re.search(r"/theqdeal/(\d{6,})(?:[?#]|$)", href)
        if not m:
            continue
        title = re.sub(r"\s+", " ", (a.get_text() or "").strip())
        if not title or len(title) < 2:
            continue
        if any(k in title for k in NOTICE_KEYWORDS):
            continue
        url = urljoin(BASE, "/theqdeal/" + m.group(1))
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
