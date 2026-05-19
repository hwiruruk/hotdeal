import re
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from .base import fetch, make_id

SOURCE = "fmkorea"
MOBILE = "https://m.fmkorea.com"
DESKTOP = "https://www.fmkorea.com"


BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) "
        "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
}


def _parse(html, base):
    soup = BeautifulSoup(html, "lxml")
    items = []
    seen = set()

    # mobile and desktop list rows usually have anchors to /<doc_id> or /index.php?mid=hotdeal&document_srl=<id>
    candidates = soup.select(
        "div.bd_lst_wrp a, table.bd_lst a, ul.bd_lst a, "
        "div.fm_list a, li.li_best2_pop0 a, a.hotdeal_var8, "
        "a.pjax, a[href]"
    )
    for a in candidates:
        href = a.get("href") or ""
        title = re.sub(r"\s+", " ", (a.get_text() or "").strip())
        if not title or len(title) < 4:
            continue
        # match real post links only
        if re.match(r"^/\d+$", href) or "document_srl=" in href:
            pass
        elif re.match(r"^/index\.php\?mid=hotdeal&document_srl=\d+", href):
            pass
        else:
            continue
        if any(k in href.lower() for k in ["comment", "act=dispmember", "memberlogin"]):
            continue
        url = urljoin(base, href.split("#")[0])
        # normalize mobile -> desktop link
        url = url.replace("https://m.fmkorea.com/", "https://www.fmkorea.com/")
        if url in seen:
            continue
        seen.add(url)
        # skip obvious navigation labels
        if title in {"이전", "다음", "처음", "마지막", "로그인", "회원가입"}:
            continue
        items.append({
            "id": make_id(SOURCE, url),
            "source": SOURCE,
            "title": title,
            "url": url,
        })
        if len(items) >= 50:
            break
    return items


def _try(url, referer):
    headers = dict(BROWSER_HEADERS)
    headers["Referer"] = referer
    html = fetch(url, headers=headers)
    # Cloudflare challenge pages tend to be small and lack list markup
    if len(html) < 1500 or "Just a moment" in html or "cf-browser-verification" in html:
        return []
    return _parse(html, url)


def scrape():
    for url, ref in [
        (f"{MOBILE}/hotdeal", MOBILE + "/"),
        (f"{MOBILE}/index.php?mid=hotdeal", MOBILE + "/"),
        (f"{DESKTOP}/hotdeal", DESKTOP + "/"),
        (f"{DESKTOP}/index.php?mid=hotdeal", DESKTOP + "/"),
    ]:
        try:
            items = _try(url, ref)
            if items:
                return items
        except Exception:
            continue
    return []
