from .theqoo import scrape as scrape_theqoo
from .arca import scrape as scrape_arca
from .fmkorea import scrape as scrape_fmkorea
from .ruliweb import scrape as scrape_ruliweb
from .ppomppu import scrape as scrape_ppomppu
from .eomisae import scrape as scrape_eomisae

SOURCES = {
    "theqoo": ("더쿠", "https://theqoo.net/theqdeal", scrape_theqoo),
    "arca": ("아카라이브", "https://arca.live/b/hotdeal", scrape_arca),
    "fmkorea": ("에펨코리아", "https://www.fmkorea.com/hotdeal", scrape_fmkorea),
    "ruliweb": ("루리웹", "https://m.ruliweb.com/market/board/1020", scrape_ruliweb),
    "ppomppu": ("뽐뿌", "https://www.ppomppu.co.kr/hotdeal/", scrape_ppomppu),
    "eomisae": ("어미새", "https://eomisae.co.kr/fs", scrape_eomisae),
}
