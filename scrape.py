"""Aggregate hot deals from configured sources and write docs/data/deals.json."""
import json
import os
import sys
import time
import traceback
from datetime import datetime, timezone

from scrapers import SOURCES

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "docs", "data", "deals.json")
MAX_HISTORY_PER_SOURCE = 200


def load_existing():
    if not os.path.exists(OUTPUT_PATH):
        return {"updated_at": None, "sources": {}, "deals": []}
    try:
        with open(OUTPUT_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"updated_at": None, "sources": {}, "deals": []}


def main():
    now_iso = datetime.now(timezone.utc).isoformat()
    existing = load_existing()
    existing_by_id = {d["id"]: d for d in existing.get("deals", [])}

    sources_meta = {}
    all_deals_by_source = {}

    for key, (label, list_url, scrape_fn) in SOURCES.items():
        sources_meta[key] = {"label": label, "url": list_url, "ok": True, "error": None, "count": 0}
        try:
            print(f"[{key}] scraping {list_url}", flush=True)
            items = scrape_fn() or []
            print(f"[{key}] got {len(items)} items", flush=True)
            sources_meta[key]["count"] = len(items)
            all_deals_by_source[key] = items
        except Exception as e:
            print(f"[{key}] failed: {e}", flush=True)
            traceback.print_exc()
            sources_meta[key]["ok"] = False
            sources_meta[key]["error"] = str(e)
            all_deals_by_source[key] = []
        time.sleep(0.5)

    merged = []
    for key, items in all_deals_by_source.items():
        prev_for_source = [d for d in existing.get("deals", []) if d.get("source") == key]
        prev_ids = {d["id"]: d for d in prev_for_source}

        new_items = []
        for it in items:
            it = dict(it)
            if it["id"] in existing_by_id:
                it["first_seen"] = existing_by_id[it["id"]].get("first_seen", now_iso)
            else:
                it["first_seen"] = now_iso
            it["last_seen"] = now_iso
            new_items.append(it)

        new_ids = {it["id"] for it in new_items}
        kept_prev = [d for d in prev_for_source if d["id"] not in new_ids]
        combined = new_items + kept_prev
        combined = combined[:MAX_HISTORY_PER_SOURCE]
        merged.extend(combined)

    merged.sort(key=lambda d: d.get("first_seen", ""), reverse=True)

    out = {
        "updated_at": now_iso,
        "sources": sources_meta,
        "deals": merged,
    }
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"Wrote {len(merged)} deals to {OUTPUT_PATH}")

    ok_count = sum(1 for m in sources_meta.values() if m["ok"])
    if ok_count == 0:
        print("All scrapers failed", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
