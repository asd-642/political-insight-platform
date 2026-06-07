(function installAdminKpiSync() {
  const state = {
    loaded: false,
    loading: null,
    articles: [],
    note: "正在讀取首頁文章清單",
  };
  const hourMs = 60 * 60 * 1000;

  function eventDate(event) {
    const value = event?.at || event?.createdAtIso || event?.createdAt || event?.timestamp;
    if (!value) return null;
    if (typeof value.toDate === "function") return value.toDate();
    if (typeof value === "object" && Number.isFinite(value.seconds)) return new Date(value.seconds * 1000);
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function eventsSince(events, hours) {
    const threshold = Date.now() - hours * hourMs;
    return events.filter((event) => {
      const date = eventDate(event);
      return date && date.getTime() >= threshold;
    });
  }

  function countBy(events, type) {
    return events.filter((event) => event.type === type).length;
  }

  function trendText(current, previous) {
    if (!previous && current) return "新進資料";
    if (!previous) return "等待資料";
    const diff = Math.round(((current - previous) / previous) * 100);
    if (diff === 0) return "持平";
    return `${diff > 0 ? "+" : ""}${diff}%`;
  }

  function dateValue(value) {
    const time = Date.parse(value || "");
    return Number.isFinite(time) ? time : 0;
  }

  function sortArticles(items = []) {
    return [...items].sort((a, b) => {
      const bTime = dateValue(b.publishedAt || b.reviewedAt || b.updated);
      const aTime = dateValue(a.publishedAt || a.reviewedAt || a.updated);
      return bTime - aTime || String(b.id || "").localeCompare(String(a.id || ""));
    });
  }

  function mergeArticles(base = [], extra = []) {
    const merged = new Map();
    base
      .filter((article) => article?.id && article.published !== false)
      .forEach((article) => merged.set(article.id, article));
    extra
      .filter((article) => article?.id && article.published !== false)
      .forEach((article) => merged.set(article.id, article));
    return sortArticles([...merged.values()]);
  }

  function extractSeedContent(source = "") {
    const start = source.indexOf("const seedContent");
    if (start < 0) return null;
    const braceStart = source.indexOf("{", start);
    if (braceStart < 0) return null;

    let depth = 0;
    let quote = "";
    let escaped = false;
    for (let index = braceStart; index < source.length; index += 1) {
      const char = source[index];
      if (quote) {
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === quote) {
          quote = "";
        }
        continue;
      }
      if (char === '"' || char === "'" || char === "`") {
        quote = char;
        continue;
      }
      if (char === "{") depth += 1;
      if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          const literal = source.slice(braceStart, index + 1);
          return Function(`"use strict"; return (${literal});`)();
        }
      }
    }
    return null;
  }

  async function fetchJson(path) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) return null;
    const text = await response.text();
    return JSON.parse(text.replace(/^\uFEFF/, ""));
  }

  function withTimeout(promise, timeoutMs, fallback = null) {
    if (!promise || typeof promise.then !== "function") return Promise.resolve(fallback);
    let timer;
    const timeout = new Promise((resolve) => {
      timer = window.setTimeout(() => resolve(fallback), timeoutMs);
    });
    return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timer));
  }

  async function loadPublicArticles() {
    if (state.loaded) return state.articles;
    if (state.loading) return state.loading;

    state.loading = (async () => {
      let articles = mergeArticles([], window.PolicyPulseContent?.articles || []);
      articles = mergeArticles(articles, window.PolicyPulseGeneratedContent?.articles || []);

      try {
        const appSource = await fetch("app.js", { cache: "no-store" }).then((response) =>
          response.ok ? response.text() : "",
        );
        articles = mergeArticles(articles, extractSeedContent(appSource)?.articles || []);
      } catch {
        // Keep going with the other public content sources.
      }

      try {
        articles = mergeArticles(articles, (await fetchJson("content/articles.json"))?.articles || []);
      } catch {
        // Static JSON can be missing during local previews.
      }

      try {
        const api = await withTimeout(window.PolicyPulseFirebaseReady, 3200, null);
        if (api?.enabled && typeof api.loadPublishedContent === "function") {
          const firebaseContent = await withTimeout(api.loadPublishedContent(), 5200, null);
          articles = mergeArticles(articles, firebaseContent?.articles || []);
        }
      } catch {
        // Static content remains useful when Firebase is not reachable.
      }

      state.loaded = true;
      state.articles = articles;
      state.note = articles.length ? "與首頁同源：內建、JSON、Firebase" : "尚未讀到公開文章";
      state.loading = null;
      return articles;
    })();

    return state.loading;
  }

  function createCard(label, value, note = "", trend = "") {
    const card = document.createElement("article");
    card.className = "admin-card";
    card.innerHTML = `
      <span>${window.PolicyPulseUtils?.escapeHtml?.(label) || label}</span>
      <strong>${window.PolicyPulseUtils?.escapeHtml?.(value) || value}</strong>
      <small>${window.PolicyPulseUtils?.escapeHtml?.(note) || note}</small>
      ${trend ? `<em>${window.PolicyPulseUtils?.escapeHtml?.(trend) || trend}</em>` : ""}
    `;
    return card;
  }

  function renderSyncedCards(events = []) {
    const current24h = eventsSince(events, 24);
    const previous24h = events.filter((event) => {
      const date = eventDate(event);
      if (!date) return false;
      const time = date.getTime();
      return time >= Date.now() - 48 * hourMs && time < Date.now() - 24 * hourMs;
    });

    const cards = [
      ["公開文章", state.articles.length || "讀取中", state.note, state.articles.length ? "首頁同源" : ""],
      ["統計事件", events.length, "瀏覽、點擊、搜尋等紀錄", trendText(current24h.length, previous24h.length)],
      ["頁面總瀏覽 PV", countBy(events, "page_view"), "page_view 累計", trendText(countBy(current24h, "page_view"), countBy(previous24h, "page_view"))],
      ["文章點擊事件", countBy(events, "article_select"), "點進文章卡片的次數", trendText(countBy(current24h, "article_select"), countBy(previous24h, "article_select"))],
      ["搜尋事件", countBy(events, "search"), "站內搜尋次數", trendText(countBy(current24h, "search"), countBy(previous24h, "search"))],
    ];

    const container = document.querySelector("#adminStats");
    if (!container) return;
    container.classList.add("admin-kpi-grid");
    container.replaceChildren(...cards.map(([label, value, note, trend]) => createCard(label, value, note, trend)));
  }

  function installStyle() {
    if (document.querySelector("#adminKpiSyncStyles")) return;
    const style = document.createElement("style");
    style.id = "adminKpiSyncStyles";
    style.textContent = `
      body.admin-page .admin-kpi-grid{grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}
      body.admin-page .admin-card small{display:block;margin-top:6px;color:var(--admin-muted,var(--muted));font-size:12px;font-weight:800;line-height:1.45}
    `;
    document.head.append(style);
  }

  async function refreshKpis() {
    installStyle();
    await loadPublicArticles();
    let events = [];
    try {
      if (typeof window.PolicyPulseStats?.readRemote === "function") {
        events = await window.PolicyPulseStats.readRemote();
      }
    } catch {
      events = [];
    }
    if (!events?.length) events = window.PolicyPulseStats?.read?.() || [];
    renderSyncedCards(events);
  }

  window.PolicyPulseAdminKpiSync = { refresh: refreshKpis };
  window.renderCards = renderSyncedCards;
  refreshKpis();
  document.addEventListener("policy-auth-change", refreshKpis);
})();
