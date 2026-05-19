import re
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from .base import fetch, make_id

SOURCE = "arca"
BASE = "https://arca.live"
RSS_URL = f"{BASE}/b/hotdeal.rss"
HTML_URL = f"{BASE}/b/hotdeal"


def _from_rss():
    xml = fetch(RSS_URL, headers={
        "Accept": "application/rss+xml,application/xml;q=0.9,*/*;q=0.8",
        "Referer": BASE,
    })
    soup = BeautifulSoup(xml, "lxml-xml")
    items = []
    seen = set()
    for it in soup.find_all("item"):
        link_el = it.find("link")
        title_el = it.find("title")
        if not link_el or not title_el:
            continue
        url = (link_el.get_text() or "").strip()
        title = (title_el.get_text() or "").strip()
        if not url or not title:
            continue
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


def _from_html():
    html = fetch(HTML_URL, headers={"Referer": BASE})
    soup = BeautifulSoup(html, "lxml")
    items = []
    seen = set()
    for a in soup.select("a.vrow, a.title, a"):
        href = a.get("href") or ""
        if not re.search(r"^/b/hotdeal/\d+", href):
            continue
        title_el = a.select_one(".title") or a
        title = re.sub(r"\s+", " ", (title_el.get_text() or "").strip())
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


def scrape():
    try:
        items = _from_rss()
        if items:
            return items
    except Exception:
        pass
    return _from_html()
