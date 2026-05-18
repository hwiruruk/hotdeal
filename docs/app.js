(() => {
  const REFRESH_MS = 5 * 60 * 1000;
  const LS_KEYWORDS = "hd_keywords_v1";
  const LS_NOTIFIED = "hd_notified_v1";
  const LS_SITES = "hd_sites_v1";
  const LS_MATCH_ONLY = "hd_match_only_v1";
  const LS_VIEW = "hd_view_v1";

  const SITE_COLORS = {
    theqoo: "var(--c-theqoo)",
    arca: "var(--c-arca)",
    fmkorea: "var(--c-fmkorea)",
    ruliweb: "var(--c-ruliweb)",
    ppomppu: "var(--c-ppomppu)",
    eomisae: "var(--c-eomisae)",
  };

  const $ = (sel) => document.querySelector(sel);

  const state = {
    data: null,
    keywords: loadJSON(LS_KEYWORDS, []),
    notified: new Set(loadJSON(LS_NOTIFIED, [])),
    enabledSites: new Set(loadJSON(LS_SITES, null) || []),
    matchOnly: loadJSON(LS_MATCH_ONLY, false),
    view: loadJSON(LS_VIEW, "columns"),
    sitesInitialized: false,
    search: "",
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

  function escapeHTML(s) {
    return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function highlight(title, search) {
    const safe = escapeHTML(title);
    if (!search) return safe;
    const re = new RegExp(escapeRegExp(search), "gi");
    return safe.replace(re, m => `<mark>${m}</mark>`);
  }
  function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

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
      if (!stored) state.enabledSites = new Set(Object.keys(sources));
      else state.enabledSites = new Set(stored);
      state.sitesInitialized = true;
    }
    for (const [key, meta] of Object.entries(sources)) {
      const label = document.createElement("label");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = state.enabledSites.has(key);
      cb.addEventListener("change", () => {
        if (cb.checked) state.enabledSites.add(key);
        else state.enabledSites.delete(key);
        saveJSON(LS_SITES, Array.from(state.enabledSites));
        render();
      });
      label.appendChild(cb);
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.style.background = SITE_COLORS[key] || "#888";
      label.appendChild(dot);
      const span = document.createElement("span");
      span.textContent = meta.label + (meta.ok ? "" : " ⚠");
      label.appendChild(span);
      box.appendChild(label);
    }
  }

  function renderKeywords() {
    const ul = $("#kw-list");
    ul.innerHTML = "";
    $("#kw-count").textContent = state.keywords.length ? `(${state.keywords.length})` : "";
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
      scope.textContent = kw.scope === "all"
        ? "[전체]"
        : "[" + ((sources[kw.scope] && sources[kw.scope].label) || kw.scope) + "]";
      const del = document.createElement("button");
      del.type = "button";
      del.textContent = "×";
      del.title = "삭제";
      del.addEventListener("click", () => {
        state.keywords.splice(idx, 1);
        saveJSON(LS_KEYWORDS, state.keywords);
        renderKeywords();
        render();
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

  function dealPassesFilters(d) {
    if (!state.enabledSites.has(d.source)) return false;
    if (state.search && !d.title.toLowerCase().includes(state.search)) return false;
    if (state.matchOnly && !matchKeyword(d)) return false;
    return true;
  }

  function render() {
    if (!state.data) return;
    if (state.view === "columns") {
      $("#view-columns").classList.remove("hidden");
      $("#view-list").classList.add("hidden");
      renderColumns();
    } else {
      $("#view-columns").classList.add("hidden");
      $("#view-list").classList.remove("hidden");
      renderList();
    }
    renderStatus();
  }

  function renderColumns() {
    const root = $("#view-columns");
    root.innerHTML = "";
    const sources = state.data.sources || {};
    const dealsBySource = {};
    for (const key of Object.keys(sources)) dealsBySource[key] = [];
    for (const d of state.data.deals || []) {
      if (dealsBySource[d.source]) dealsBySource[d.source].push(d);
    }

    let totalShown = 0;
    for (const [key, meta] of Object.entries(sources)) {
      if (!state.enabledSites.has(key)) continue;

      const col = document.createElement("div");
      col.className = "col";

      const head = document.createElement("div");
      head.className = "col-head";
      const name = document.createElement("div");
      name.className = "name";
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.style.background = SITE_COLORS[key] || "#888";
      name.appendChild(dot);
      const a = document.createElement("a");
      a.href = meta.url;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = meta.label;
      name.appendChild(a);
      head.appendChild(name);

      const filtered = dealsBySource[key].filter(dealPassesFilters);
      totalShown += filtered.length;

      const right = document.createElement("div");
      if (!meta.ok) {
        right.className = "warn";
        right.textContent = "수집 실패";
        right.title = meta.error || "";
      } else {
        right.className = "count";
        right.textContent = `${filtered.length} / ${dealsBySource[key].length}`;
      }
      head.appendChild(right);
      col.appendChild(head);

      const body = document.createElement("div");
      body.className = "col-body";
      if (filtered.length === 0) {
        const e = document.createElement("div");
        e.className = "col-empty";
        e.textContent = meta.ok ? "조건에 맞는 글이 없습니다." : (meta.error || "수집 실패");
        body.appendChild(e);
      } else {
        for (const d of filtered.slice(0, 100)) {
          body.appendChild(buildRow(d));
        }
      }
      col.appendChild(body);
      root.appendChild(col);
    }
    state._totalShown = totalShown;
  }

  function buildRow(d) {
    const hit = matchKeyword(d);
    const a = document.createElement("a");
    a.className = "row" + (hit ? " match" : "");
    a.href = d.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";

    const t = document.createElement("div");
    t.className = "t";
    t.innerHTML = highlight(d.title, state.search);
    if (hit) {
      const b = document.createElement("span");
      b.className = "badge";
      b.textContent = hit.word;
      t.appendChild(b);
    }
    a.appendChild(t);

    const m = document.createElement("div");
    m.className = "m";
    m.textContent = fmtTime(d.first_seen);
    a.appendChild(m);
    return a;
  }

  function renderList() {
    const root = $("#view-list");
    root.innerHTML = "";
    const sources = state.data.sources || {};
    let shown = 0;
    for (const d of state.data.deals || []) {
      if (!dealPassesFilters(d)) continue;
      const hit = matchKeyword(d);

      const el = document.createElement("a");
      el.className = "deal" + (hit ? " match" : "");
      el.href = d.url;
      el.target = "_blank";
      el.rel = "noopener noreferrer";

      const src = document.createElement("div");
      src.className = "src";
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.style.background = SITE_COLORS[d.source] || "#888";
      src.appendChild(dot);
      const srcText = document.createElement("span");
      srcText.textContent = (sources[d.source] && sources[d.source].label) || d.source;
      src.appendChild(srcText);

      const title = document.createElement("div");
      title.className = "title";
      title.innerHTML = highlight(d.title, state.search);
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
      if (shown >= 500) break;
    }
    state._totalShown = shown;
  }

  function renderStatus() {
    const sources = (state.data && state.data.sources) || {};
    const okCount = Object.values(sources).filter(s => s.ok).length;
    const total = Object.keys(sources).length;
    const shown = state._totalShown || 0;
    const search = state.search ? ` · 검색: "${state.search}"` : "";
    $("#status").textContent = `${shown}건 표시${search} · 소스 ${okCount}/${total} 정상 · 갱신 ${fmtTime(state.data.updated_at)}`;
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
        const n = new Notification("핫딜 키워드 매칭: " + hit.word, { body: d.title, tag: d.id });
        n.onclick = () => { window.open(d.url, "_blank", "noopener"); n.close(); };
      } catch {}
      notifyCount++;
      if (notifyCount >= 5) break;
    }
    saveJSON(LS_NOTIFIED, Array.from(state.notified).slice(-2000));
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
      render();
      if (!initial) maybeNotify(newOnes);
    } catch (e) {
      $("#status").textContent = "데이터를 불러올 수 없습니다: " + e.message;
    }
  }

  function applyViewButton() {
    $("#view-toggle").textContent = state.view === "columns" ? "📊 통합" : "📋 사이트별";
    $("#view-toggle").title = state.view === "columns" ? "통합 목록으로 보기" : "사이트별 컬럼으로 보기";
  }

  function init() {
    $("#match-only").checked = !!state.matchOnly;
    $("#match-only").addEventListener("change", (e) => {
      state.matchOnly = e.target.checked;
      saveJSON(LS_MATCH_ONLY, state.matchOnly);
      render();
    });

    const searchInput = $("#search");
    let searchTimer = null;
    searchInput.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.search = searchInput.value.trim().toLowerCase();
        render();
      }, 80);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && document.activeElement !== searchInput) {
        e.preventDefault();
        searchInput.focus();
      } else if (e.key === "Escape" && document.activeElement === searchInput) {
        searchInput.value = "";
        state.search = "";
        render();
      }
    });

    applyViewButton();
    $("#view-toggle").addEventListener("click", () => {
      state.view = state.view === "columns" ? "list" : "columns";
      saveJSON(LS_VIEW, state.view);
      applyViewButton();
      render();
    });

    $("#refresh").addEventListener("click", () => loadData(false));

    $("#enable-notify").addEventListener("click", async () => {
      if (typeof Notification === "undefined") { alert("이 브라우저는 알림을 지원하지 않습니다."); return; }
      const p = await Notification.requestPermission();
      if (p === "granted") $("#enable-notify").textContent = "🔔 켜짐";
      else alert("알림 권한이 거부되었습니다.");
    });
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      $("#enable-notify").textContent = "🔔 켜짐";
    }

    $("#kw-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const word = $("#kw-input").value.trim();
      const scope = $("#kw-scope").value;
      if (!word) return;
      if (state.keywords.some(k => k.word === word && k.scope === scope)) {
        $("#kw-input").value = ""; return;
      }
      state.keywords.push({ word, scope });
      saveJSON(LS_KEYWORDS, state.keywords);
      $("#kw-input").value = "";
      renderKeywords();
      render();
    });

    loadData(true);
    setInterval(() => loadData(false), REFRESH_MS);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
