import hashlib
import time
import requests

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


def fetch(url, headers=None, timeout=15, retries=2):
    h = dict(DEFAULT_HEADERS)
    if headers:
        h.update(headers)
    last_exc = None
    for attempt in range(retries + 1):
        try:
            r = requests.get(url, headers=h, timeout=timeout)
            r.raise_for_status()
            if not r.encoding or r.encoding.lower() == "iso-8859-1":
                r.encoding = r.apparent_encoding or "utf-8"
            return r.text
        except Exception as e:
            last_exc = e
            if attempt < retries:
                time.sleep(1 + attempt)
    raise last_exc


def make_id(source, url):
    return hashlib.sha1(f"{source}|{url}".encode("utf-8")).hexdigest()[:16]
