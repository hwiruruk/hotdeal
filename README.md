# 핫딜 모음 + 키워드 알림

여러 한국 핫딜 사이트의 게시물을 모아 한 페이지에서 보여주고, 키워드를 등록하면 브라우저 알림을 띄워주는 정적 사이트입니다.

## 수집 대상

- [더쿠 핫딜](https://theqoo.net/theqdeal)
- [아카라이브 핫딜](https://arca.live/b/hotdeal)
- [에펨코리아 핫딜](https://www.fmkorea.com/hotdeal)
- [루리웹 마켓](https://m.ruliweb.com/market/board/1020)
- [뽐뿌](https://www.ppomppu.co.kr/hotdeal/)
- [어미새](https://eomisae.co.kr/fs)

## 동작 방식

1. GitHub Actions(`.github/workflows/scrape.yml`)가 15분마다 `scrape.py`를 실행해 각 사이트를 긁어 `docs/data/deals.json`을 갱신합니다.
2. GitHub Pages가 `docs/`를 호스팅합니다(`.github/workflows/pages.yml`).
3. 프론트엔드(`docs/index.html` + `app.js`)는 `deals.json`을 주기적으로 다시 받아 새 글을 감지하고, 등록된 키워드에 매칭되는 글이 있으면 브라우저 Notification API로 알림을 띄웁니다.

## 키워드 알림

- 키워드와 적용 범위(전체 / 특정 사이트)를 입력해 추가합니다.
- 키워드 목록은 브라우저 `localStorage`에 저장되므로 서버 계정/로그인 없이 동작합니다.
- "브라우저 알림 켜기" 버튼을 눌러 권한을 허용하면 새 글이 들어올 때마다 알림이 뜹니다(탭이 열려 있을 때).

## 직접 실행

```bash
pip install -r requirements.txt
python scrape.py
# docs/ 를 정적 서버로 열기
python -m http.server -d docs 8000
```

## 배포

1. GitHub에 푸시하고 저장소 Settings → Pages → Source 를 **GitHub Actions** 로 설정합니다.
2. `main`에 머지되면 `pages.yml`이 자동 배포합니다.
3. `scrape.yml`이 15분마다 실행되어 데이터를 커밋합니다(스케줄 실행은 활성 브랜치 기준이므로 `main` 브랜치에 머지된 상태여야 합니다).

## 한계

- 일부 사이트(특히 Cloudflare를 쓰는 곳)는 정적 GET으로 접근이 막힐 수 있습니다. 그 경우 해당 사이트는 빈 결과가 되고 상태 표시줄에 표시됩니다.
- 스크래퍼는 best-effort이며 사이트 마크업이 바뀌면 갱신이 필요합니다.
- 알림은 페이지가 열려 있는 동안만 트리거됩니다(웹 푸시 서버가 없는 정적 사이트의 한계).
