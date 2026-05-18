(() => {
  const DATA_URL = "./data/deals.json?ts=" + Date.now();
  const REFRESH_MS = 5 * 60 * 1000;
  const LS_KEYWORDS = "hd_keywords_v1";
  const LS_NOTIFIED = "hd_notified_v1";
  const LS_SITES = "hd_sites_v1";
  const LS_MATCH_ONLY = "hd_match_only_v1";

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const state = {
    data: null,
    keywords: loadJSON(LS_KEYWORDS, []),
    notified: new Set(loadJSON(LS_NOTIFIED, [])),
    enabledSites: new Set(loadJSON(LS_SITES, null) || []),
    matchOnly: loadJSON(LS_MATCH_ONLY, false),
    sitesInitialized: false,
  };

  function loadJSON(k, fallback) {
    try { const v = localStorage.getItem(k); return v === null ? fallback : JSON.parse(v); }
    catch { return fallback; }
  }
  function saveJSON(k, v) { localStorage.setItem(k, JSON.stringify(v)); }

  function fmtTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return "방금";
    if (diff < 3600) return Math.floor(diff / 60) + "분 전";
    if (diff < 86400) return Math.floor(diff / 3600) + "시간 전";
    return Math.floor(diff / 86400) + "일 전";
  }

  function renderScopeOptions() {
    const sel = $("#kw-scope");
    const cur = sel.value;
    sel.innerHTML = '<option value="all">전체 사이트</option>';
    if (!state.data) return;
    for (const [key, meta] of Object.entries(state.data.sources || {})) {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = meta.label + " 만";
      sel.appendChild(opt);
    }
    if (cur) sel.value = cur;
  }

  function renderSiteToggles() {
    const box = $("#site-toggles");
    box.innerHTML = "";
    if (!state.data) return;
    const sources = state.data.sources || {};
    if (!state.sitesInitialized) {
      const stored = loadJSON(LS_SITES, null);
      if (!stored) {
        state.enabledSites = new Set(Object.keys(sources));
      } else {
        state.enabledSites = new Set(stored);
      }
      state.sitesInitialized = true;
    }
    for (const [key, meta] of Object.entries(sources)) {
      const id = "site-" + key;
      const label = document.createElement("label");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.id = id;
      cb.checked = state.enabledSites.has(key);
      cb.addEventListener("change", () => {
        if (cb.checked) state.enabledSites.add(key);
        else state.enabledSites.delete(key);
        saveJSON(LS_SITES, Array.from(state.enabledSites));
        renderDeals();
      });
      label.appendChild(cb);
      const span = document.createElement("span");
      span.textContent = meta.label + (meta.ok ? "" : " ⚠");
      label.appendChild(span);
      box.appendChild(label);
    }
  }

  function renderKeywords() {
    const ul = $("#kw-list");
    ul.innerHTML = "";
    if (state.keywords.length === 0) {
      const li = document.createElement("li");
      li.style.background = "transparent";
      li.style.border = "none";
      li.className = "muted";
      li.textContent = "등록된 키워드가 없습니다.";
      ul.appendChild(li);
      return;
    }
    const sources = (state.data && state.data.sources) || {};
    state.keywords.forEach((kw, idx) => {
      const li = document.createElement("li");
      const text = document.createElement("span");
      text.textContent = kw.word;
      const scope = document.createElement("span");
      scope.className = "scope";
      const scopeLabel = kw.scope === "all"
        ? "[전체]"
        : "[" + ((sources[kw.scope] && sources[kw.scope].label) || kw.scope) + "]";
      scope.textContent = scopeLabel;
      const del = document.createElement("button");
      del.type = "button";
      del.textContent = "×";
      del.title = "삭제";
      del.addEventListener("click", () => {
        state.keywords.splice(idx, 1);
        saveJSON(LS_KEYWORDS, state.keywords);
        renderKeywords();
        renderDeals();
      });
      li.appendChild(text);
      li.appendChild(scope);
      li.appendChild(del);
      ul.appendChild(li);
    });
  }

  function matchKeyword(deal) {
    const t = deal.title.toLowerCase();
    for (const kw of state.keywords) {
      if (kw.scope !== "all" && kw.scope !== deal.source) continue;
      if (t.includes(kw.word.toLowerCase())) return kw;
    }
    return null;
  }

  function renderDeals() {
    const root = $("#deals");
    root.innerHTML = "";
    if (!state.data) { root.textContent = ""; return; }

    const search = ($("#search").value || "").trim().toLowerCase();
    const sources = state.data.sources || {};
    const deals = state.data.deals || [];

    let shown = 0;
    for (const d of deals) {
      if (!state.enabledSites.has(d.source)) continue;
      if (search && !d.title.toLowerCase().includes(search)) continue;
      const hit = matchKeyword(d);
      if (state.matchOnly && !hit) continue;

      const el = document.createElement("a");
      el.className = "deal" + (hit ? " match" : "");
      el.href = d.url;
      el.target = "_blank";
      el.rel = "noopener noreferrer";

      const src = document.createElement("div");
      src.className = "src";
      src.textContent = (sources[d.source] && sources[d.source].label) || d.source;

      const title = document.createElement("div");
      title.className = "title";
      title.textContent = d.title;
      if (hit) {
        const b = document.createElement("span");
        b.className = "badge";
        b.textContent = hit.word;
        title.appendChild(b);
      }

      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = fmtTime(d.first_seen);

      el.appendChild(src);
      el.appendChild(title);
      el.appendChild(meta);
      root.appendChild(el);
      shown++;
      if (shown >= 400) break;
    }

    const status = $("#status");
    const okCount = Object.values(sources).filter(s => s.ok).length;
    const total = Object.keys(sources).length;
    status.textContent = `${shown}건 표시 · 소스 ${okCount}/${total} 정상 · 갱신 ${fmtTime(state.data.updated_at)}`;
  }

  function maybeNotify(newDeals) {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    let notifyCount = 0;
    for (const d of newDeals) {
      const hit = matchKeyword(d);
      if (!hit) continue;
      if (state.notified.has(d.id)) continue;
      state.notified.add(d.id);
      try {
        const n = new Notification("핫딜 키워드 매칭: " + hit.word, {
          body: d.title,
          tag: d.id,
        });
        n.onclick = () => { window.open(d.url, "_blank", "noopener"); n.close(); };
      } catch {}
      notifyCount++;
      if (notifyCount >= 5) break;
    }
    const arr = Array.from(state.notified);
    saveJSON(LS_NOTIFIED, arr.slice(-2000));
  }

  async function loadData(initial) {
    try {
      const res = await fetch("./data/deals.json?ts=" + Date.now(), { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const prevIds = new Set((state.data && state.data.deals || []).map(d => d.id));
      const newOnes = (data.deals || []).filter(d => !prevIds.has(d.id));
      state.data = data;
      $("#updated").textContent = "· 갱신 " + fmtTime(data.updated_at);
      renderScopeOptions();
      renderSiteToggles();
      renderKeywords();
      renderDeals();
      if (!initial) maybeNotify(newOnes);
    } catch (e) {
      $("#status").textContent = "데이터를 불러올 수 없습니다: " + e.message;
    }
  }

  function init() {
    $("#match-only").checked = !!state.matchOnly;
    $("#match-only").addEventListener("change", (e) => {
      state.matchOnly = e.target.checked;
      saveJSON(LS_MATCH_ONLY, state.matchOnly);
      renderDeals();
    });

    $("#search").addEventListener("input", renderDeals);

    $("#refresh").addEventListener("click", () => loadData(false));

    $("#enable-notify").addEventListener("click", async () => {
      if (typeof Notification === "undefined") {
        alert("이 브라우저는 알림을 지원하지 않습니다.");
        return;
      }
      const p = await Notification.requestPermission();
      if (p === "granted") {
        $("#enable-notify").textContent = "알림 켜짐 ✓";
      } else {
        alert("알림 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.");
      }
    });
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      $("#enable-notify").textContent = "알림 켜짐 ✓";
    }

    $("#kw-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const word = $("#kw-input").value.trim();
      const scope = $("#kw-scope").value;
      if (!word) return;
      if (state.keywords.some(k => k.word === word && k.scope === scope)) {
        $("#kw-input").value = "";
        return;
      }
      state.keywords.push({ word, scope });
      saveJSON(LS_KEYWORDS, state.keywords);
      $("#kw-input").value = "";
      renderKeywords();
      renderDeals();
    });

    loadData(true);
    setInterval(() => loadData(false), REFRESH_MS);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
