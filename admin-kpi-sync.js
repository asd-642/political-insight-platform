(function installAdminKpiSync() {
  const FIRESTORE_URL = "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
  const hourMs = 60 * 60 * 1000;
  const state = {
    articles: [],
    articlesLoaded: false,
    articleLoading: null,
    note: "正在讀取前台文章清單",
  };
  const topicLabels = {
    budget: "財經",
    housing: "居住",
    energy: "能源",
    transport: "交通",
    labor: "勞工",
    education: "教育",
    uncategorized: "未分類",
  };
  const topicPalette = ["#2dd4bf", "#f4b942", "#7bb4ff", "#ef6a62", "#9b6dff", "#e97b45", "#67e8f9"];

  function escapeHtml(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function withTimeout(promise, timeoutMs, fallback = null) {
    if (!promise || typeof promise.then !== "function") return Promise.resolve(fallback);
    let timer;
    const timeout = new Promise((resolve) => {
      timer = window.setTimeout(() => resolve(fallback), timeoutMs);
    });
    return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timer));
  }

  function dateFromValue(value) {
    if (!value) return null;
    if (typeof value.toDate === "function") return value.toDate();
    if (typeof value === "object" && Number.isFinite(value.seconds)) return new Date(value.seconds * 1000);
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function dateKeyFromValue(value, fallback = "") {
    if (!value) return fallback;
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const date = dateFromValue(value);
    if (!date) return fallback;
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const part = (type) => parts.find((item) => item.type === type)?.value || "";
    return `${part("year")}-${part("month")}-${part("day")}`;
  }

  function articleDate(article) {
    return dateKeyFromValue(
      article?.publishedAt || article?.reviewedAt || article?.updatedAt || article?.createdAtIso || article?.updated,
      article?.updated || "",
    );
  }

  function articleTime(article) {
    const time = Date.parse(article?.publishedAt || article?.reviewedAt || article?.updatedAt || article?.updated || "");
    return Number.isFinite(time) ? time : 0;
  }

  function sortArticles(articles = []) {
    return [...articles].sort((a, b) => articleTime(b) - articleTime(a) || String(b.id || "").localeCompare(String(a.id || "")));
  }

  function mergeArticles(base = [], extra = []) {
    const extraArticles = extra.filter((article) => article?.id && article.published !== false);
    const extraIds = new Set(extraArticles.map((article) => article.id));
    const extraDays = new Set(extraArticles.map(articleDate).filter(Boolean));
    const baseArticles = base.filter((article) => {
      if (!article?.id || article.published === false) return false;
      const day = articleDate(article);
      return !extraDays.has(day) || extraIds.has(article.id);
    });
    const merged = new Map();
    extraArticles.forEach((article) => merged.set(article.id, article));
    baseArticles.forEach((article) => {
      if (!merged.has(article.id)) merged.set(article.id, article);
    });
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
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === quote) quote = "";
        continue;
      }
      if (char === '"' || char === "'" || char === "`") {
        quote = char;
        continue;
      }
      if (char === "{") depth += 1;
      if (char === "}") {
        depth -= 1;
        if (depth === 0) return Function(`"use strict"; return (${source.slice(braceStart, index + 1)});`)();
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

  function normalizeRemoteArticle(doc) {
    const data = doc.data();
    return { id: data.id || doc.id, ...data };
  }

  async function loadFirebaseArticles() {
    const api = await withTimeout(window.PolicyPulseFirebaseReady, 4200, null);
    if (!api?.enabled || !api.db) return [];
    const firestore = await import(FIRESTORE_URL);
    const snapshot = await withTimeout(firestore.getDocs(firestore.collection(api.db, "articles")), 7200, null);
    return snapshot?.docs?.map(normalizeRemoteArticle).filter((article) => article.published !== false) || [];
  }

  async function loadArticles() {
    if (state.articlesLoaded) return state.articles;
    if (state.articleLoading) return state.articleLoading;
    state.articleLoading = (async () => {
      let articles = mergeArticles([], window.PolicyPulseContent?.articles || []);
      articles = mergeArticles(articles, window.PolicyPulseGeneratedContent?.articles || []);
      try {
        const appSource = await fetch("app.js", { cache: "no-store" }).then((response) => (response.ok ? response.text() : ""));
        articles = mergeArticles(articles, extractSeedContent(appSource)?.articles || []);
      } catch {
        // Static JSON and Firebase can still supply the public article list.
      }
      try {
        articles = mergeArticles(articles, (await fetchJson("content/articles.json"))?.articles || []);
      } catch {
        // The dashboard stays usable with Firebase-only content.
      }
      try {
        const firebaseArticles = await loadFirebaseArticles();
        if (firebaseArticles.length) {
          articles = mergeArticles(articles, firebaseArticles);
          state.note = "與前台同源：靜態備援 + Firebase 完整公開文章";
        } else {
          state.note = articles.length ? "與前台同源：靜態備援文章" : "尚未讀到公開文章";
        }
      } catch {
        state.note = articles.length ? "與前台同源：靜態備援文章" : "尚未讀到公開文章";
      }
      state.articles = articles;
      state.articlesLoaded = true;
      state.articleLoading = null;
      return articles;
    })();
    return state.articleLoading;
  }

  function eventDate(event) {
    return dateFromValue(event?.at || event?.createdAtIso || event?.createdAt || event?.timestamp);
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
    if (!previous && current) return "新增流量";
    if (!previous) return "持平";
    const diff = Math.round(((current - previous) / previous) * 100);
    if (diff === 0) return "持平";
    return `${diff > 0 ? "+" : ""}${diff}%`;
  }

  async function loadEvents() {
    try {
      if (typeof window.PolicyPulseStats?.readRemote === "function") {
        const remote = await window.PolicyPulseStats.readRemote();
        if (Array.isArray(remote)) return remote;
      }
    } catch {
      // Fall back to browser-side stats.
    }
    return window.PolicyPulseStats?.read?.() || [];
  }

  function createCard(label, value, note = "", trend = "") {
    const card = document.createElement("article");
    card.className = "admin-card";
    card.innerHTML = `
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(note)}</small>
      ${trend ? `<em>${escapeHtml(trend)}</em>` : ""}
    `;
    return card;
  }

  function renderCards(events, articles) {
    const current24h = eventsSince(events, 24);
    const previous24h = events.filter((event) => {
      const date = eventDate(event);
      if (!date) return false;
      const time = date.getTime();
      return time >= Date.now() - 48 * hourMs && time < Date.now() - 24 * hourMs;
    });
    const cards = [
      ["公開文章", articles.length || "讀取中", state.note, articles.length ? "已同步" : ""],
      ["統計事件", events.length, "瀏覽、點擊、搜尋等紀錄", trendText(current24h.length, previous24h.length)],
      ["頁面瀏覽 PV", countBy(events, "page_view"), "page_view 累計", trendText(countBy(current24h, "page_view"), countBy(previous24h, "page_view"))],
      ["文章點擊事件", countBy(events, "article_select"), "點進文章卡片的次數", trendText(countBy(current24h, "article_select"), countBy(previous24h, "article_select"))],
      ["搜尋事件", countBy(events, "search"), "站內搜尋次數", trendText(countBy(current24h, "search"), countBy(previous24h, "search"))],
    ];
    const container = document.querySelector("#adminStats");
    if (!container) return;
    container.classList.add("admin-kpi-grid");
    container.replaceChildren(...cards.map(([label, value, note, trend]) => createCard(label, value, note, trend)));
  }

  function topicForArticle(article) {
    const raw = String(article?.topic || article?.topicName || article?.category || "").trim();
    if (topicLabels[raw]) return raw;
    const byLabel = Object.entries(topicLabels).find(([, label]) => label === raw);
    return byLabel?.[0] || raw || "uncategorized";
  }

  function renderTopicShare(articles) {
    const donut = document.querySelector("#topicDonut");
    const legend = document.querySelector("#topicLegend");
    if (!donut || !legend) return;
    const counts = new Map();
    articles.forEach((article) => {
      const topic = topicForArticle(article);
      counts.set(topic, (counts.get(topic) || 0) + 1);
    });
    const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    const total = rows.reduce((sum, [, count]) => sum + count, 0);
    if (!total) {
      donut.style.background = "";
      donut.innerHTML = '<div class="donut-center"><strong>0</strong><span>文章</span></div>';
      legend.innerHTML = '<div class="insight-empty">目前沒有可統計的公開文章。</div>';
      return;
    }
    let cursor = 0;
    const segments = rows.map(([, count], index) => {
      const start = cursor;
      const end = cursor + (count / total) * 100;
      cursor = end;
      return `${topicPalette[index % topicPalette.length]} ${start}% ${end}%`;
    });
    donut.style.background = `conic-gradient(${segments.join(", ")})`;
    donut.innerHTML = `<div class="donut-center"><strong>${total}</strong><span>文章</span></div>`;
    legend.innerHTML = rows
      .map(([topic, count], index) => {
        const percent = Math.round((count / total) * 100);
        return `
          <div class="topic-legend-row">
            <i style="background:${topicPalette[index % topicPalette.length]}"></i>
            <span>${escapeHtml(topicLabels[topic] || topic || "未分類")}</span>
            <strong>${percent}%</strong>
          </div>
        `;
      })
      .join("");
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

  async function refresh() {
    installStyle();
    const [articles, events] = await Promise.all([loadArticles(), loadEvents()]);
    renderCards(events, articles);
    renderTopicShare(articles);
    window.PolicyPulseAdminKpiSync = {
      articleCount: articles.length,
      topicCounts: articles.reduce((acc, article) => {
        const topic = topicForArticle(article);
        acc[topic] = (acc[topic] || 0) + 1;
        return acc;
      }, {}),
      refresh,
    };
  }

  function resetArticleCache() {
    state.articlesLoaded = false;
    state.articleLoading = null;
    state.articles = [];
    state.note = "正在讀取前台文章清單";
  }

  const schedule = (delay = 0) => window.setTimeout(() => refresh().catch(() => {}), delay);
  window.renderCards = (events = []) => renderCards(events, state.articles);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => schedule(250), { once: true });
  } else {
    schedule(250);
  }
  schedule(1600);
  schedule(2600);
  schedule(6200);
  document.addEventListener("policy-auth-change", () => {
    resetArticleCache();
    schedule(600);
  });
  document.querySelector("#refreshStats")?.addEventListener("click", () => {
    resetArticleCache();
    schedule(600);
  });
})();
