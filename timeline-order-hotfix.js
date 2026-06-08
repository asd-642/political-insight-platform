(function installTimelineOrderHotfix() {
  const FIRESTORE_URL = "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
  const LIST_SELECTOR = "#timelineList";
  const ROW_SELECTOR = ".timeline-item";
  const RETRY_DELAYS = [0, 80, 250, 700, 1500, 3500, 7000];
  const TOPIC_NAMES = {
    budget: "財經",
    housing: "居住",
    energy: "能源",
    transport: "交通",
    labor: "勞工",
    education: "教育",
  };
  let officialArticles = [];
  let officialTitlesByDate = new Map();
  let timer = 0;

  function isoValue(value) {
    if (!value) return "";
    if (typeof value === "string") return value;
    const date = value?.toDate?.() || value;
    if (date instanceof Date && !Number.isNaN(date.getTime())) return date.toISOString();
    return "";
  }

  function dateKey(value, fallback = "") {
    const iso = isoValue(value) || value;
    if (typeof iso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return fallback;
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const part = (type) => parts.find((item) => item.type === type)?.value || "";
    return `${part("year")}-${part("month")}-${part("day")}`;
  }

  function articleDateValue(article) {
    return article.updated || article.publishedAt || article.reviewedAt || article.updatedAt || article.createdAtIso || article.createdAt || "";
  }

  function articleTime(article) {
    const time = Date.parse(isoValue(articleDateValue(article)) || article.updated || "");
    return Number.isFinite(time) ? time : 0;
  }

  function cleanText(value) {
    return String(value || "")
      .replace(/\s*(發布紀錄|追蹤建立|更新)$/g, "")
      .replaceAll("待審草稿", "已發布待檢查文章")
      .replaceAll("草稿審核", "發布後檢查")
      .replaceAll("確認發布 ", "標記已檢查")
      .replaceAll("待審核", "待檢查")
      .replace(/\s+/g, " ")
      .trim();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function normalizeArticle(doc) {
    const data = doc.data();
    const publishedAt = isoValue(data.publishedAt);
    const reviewedAt = isoValue(data.reviewedAt);
    const updatedAt = isoValue(data.updatedAt);
    const createdAtIso = isoValue(data.createdAtIso || data.createdAt);
    return {
      id: data.id || doc.id,
      ...data,
      publishedAt,
      reviewedAt,
      updatedAt,
      createdAtIso,
      updated: data.updated || dateKey(publishedAt || reviewedAt || updatedAt || createdAtIso),
      tags: Array.isArray(data.tags) ? data.tags : [],
      sources: Array.isArray(data.sources) ? data.sources : [],
    };
  }

  function mergeArticles(base = [], extra = []) {
    const extraArticles = extra.filter((article) => article?.id && article.published !== false);
    const extraIds = new Set(extraArticles.map((article) => article.id));
    const extraDays = new Set(extraArticles.map((article) => dateKey(articleDateValue(article), article.updated || "")).filter(Boolean));
    const baseArticles = base.filter((article) => {
      if (!article?.id || article.published === false) return false;
      const day = dateKey(articleDateValue(article), article.updated || "");
      return !extraDays.has(day) || extraIds.has(article.id);
    });
    const merged = new Map();
    extraArticles.forEach((article) => merged.set(article.id, article));
    baseArticles.forEach((article) => {
      if (!merged.has(article.id)) merged.set(article.id, article);
    });
    return [...merged.values()].sort((a, b) => articleTime(b) - articleTime(a) || String(b.id || "").localeCompare(String(a.id || "")));
  }

  function buildOfficialIndex(articles) {
    officialArticles = articles;
    const byDate = new Map();
    articles.forEach((article) => {
      const day = dateKey(articleDateValue(article), article.updated || "");
      const title = cleanText(article.title);
      if (!day || !title) return;
      if (!byDate.has(day)) byDate.set(day, new Set());
      byDate.get(day).add(title);
    });
    officialTitlesByDate = byDate;
  }

  async function getLatestArticles(api) {
    const firestore = await import(FIRESTORE_URL);
    const articlesRef = firestore.collection(api.db, "articles");
    try {
      const completeSnapshot = await firestore.getDocs(articlesRef);
      if (completeSnapshot?.docs?.length) return completeSnapshot;
    } catch {
      // Fall back to indexed queries if rules ever block a full collection read.
    }
    const attempts = [
      firestore.query(articlesRef, firestore.where("published", "==", true), firestore.orderBy("publishedAt", "desc"), firestore.limit(500)),
      firestore.query(articlesRef, firestore.orderBy("publishedAt", "desc"), firestore.limit(500)),
      firestore.query(articlesRef, firestore.where("published", "==", true), firestore.limit(500)),
    ];
    for (const query of attempts) {
      try {
        const snapshot = await firestore.getDocs(query);
        if (snapshot?.docs?.length) return snapshot;
      } catch {
        // Try the next supported query shape.
      }
    }
    return { docs: [] };
  }

  function articleTimeline(article, existing = {}) {
    const dateValue = articleDateValue(article);
    return {
      ...existing,
      id: `timeline-${article.id}`,
      articleId: article.id,
      date: dateKey(dateValue, article.updated || ""),
      publishedAt: isoValue(dateValue) || existing.publishedAt || "",
      topic: article.topic,
      title: cleanText(article.title || existing.title || "文章更新"),
      description: cleanText(existing.description || article.summary || article.excerpt || ""),
    };
  }

  function mergeTimeline(existingTimeline = [], articles = []) {
    const byArticleId = new Map();
    const officialDays = new Set(articles.map((article) => dateKey(articleDateValue(article), article.updated || "")).filter(Boolean));
    existingTimeline.forEach((item) => {
      const articleId = item.articleId || String(item.id || "").replace(/^timeline-/, "");
      const itemDate = dateKey(item.publishedAt || item.date || "", item.date || "");
      if (officialDays.has(itemDate)) return;
      if (articleId) byArticleId.set(articleId, item);
    });
    articles.forEach((article) => {
      if (article?.id) byArticleId.set(article.id, articleTimeline(article, byArticleId.get(article.id)));
    });
    return [...byArticleId.values()].sort((a, b) => {
      const bTime = Date.parse(b.publishedAt || b.date || "");
      const aTime = Date.parse(a.publishedAt || a.date || "");
      return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
    });
  }

  async function loadFullPublishedContent(api, fallback) {
    const snapshot = await getLatestArticles(api);
    const articles = snapshot.docs
      .map(normalizeArticle)
      .filter((article) => article.published !== false)
      .sort((a, b) => articleTime(b) - articleTime(a));
    if (!articles.length && fallback) return fallback();

    let timeline = [];
    try {
      const firestore = await import(FIRESTORE_URL);
      const timelineSnapshot = await firestore.getDocs(firestore.collection(api.db, "timeline"));
      timeline = timelineSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch {
      timeline = [];
    }
    return { articles, timeline: mergeTimeline(timeline, articles) };
  }

  function installApiOverride() {
    const ready = window.PolicyPulseFirebaseReady;
    if (!ready?.then || ready.__fullContentHotfix) return;
    const patched = ready.then((api) => {
      if (!api?.enabled || !api.db || api.__fullPublishedContentHotfix) return api;
      const fallback = api.loadPublishedContent?.bind(api);
      api.loadPublishedContent = () => loadFullPublishedContent(api, fallback);
      api.__fullPublishedContentHotfix = true;
      return api;
    });
    patched.__fullContentHotfix = true;
    window.PolicyPulseFirebaseReady = patched;
  }

  function rowDate(row) {
    const value = row.querySelector("time")?.textContent?.trim() || "";
    return dateKey(value, value);
  }

  function rowTitle(row) {
    return cleanText(row.querySelector("h3")?.textContent || "");
  }

  function cleanRow(row) {
    const title = row.querySelector("h3");
    if (!title) return;
    const cleaned = cleanText(title.textContent);
    if (cleaned && cleaned !== title.textContent) title.textContent = cleaned;
  }

  function rowTime(row) {
    const time = Date.parse(row.querySelector("time")?.textContent?.trim() || "");
    return Number.isFinite(time) ? time : 0;
  }

  function articleUrl(id) {
    return `/article.html?id=${encodeURIComponent(id)}`;
  }

  function articleDescription(article) {
    return cleanText(article.summary || article.excerpt || article.description || "");
  }

  function createOfficialRow(article) {
    const row = document.createElement("article");
    const date = dateKey(articleDateValue(article), article.updated || "");
    row.className = "timeline-item timeline-link";
    row.dataset.officialTimeline = "true";
    row.dataset.articleId = article.id || "";
    row.tabIndex = 0;
    row.setAttribute("role", "link");
    row.innerHTML = `
      <time>${escapeHtml(date)}</time>
      <div>
        <p class="eyebrow">${escapeHtml(TOPIC_NAMES[article.topic] || article.topic || "議題")}</p>
        <h3>${escapeHtml(cleanText(article.title || "文章更新"))}</h3>
        <p>${escapeHtml(articleDescription(article))}</p>
      </div>
    `;
    const open = () => {
      if (article.id) location.href = articleUrl(article.id);
    };
    row.addEventListener("click", open);
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
    return row;
  }

  function rebuildOfficialDayRows(list) {
    if (!officialArticles.length) return;
    const officialDays = new Set(officialArticles.map((article) => dateKey(articleDateValue(article), article.updated || "")).filter(Boolean));
    const rows = Array.from(list.querySelectorAll(`:scope > ${ROW_SELECTOR}`));
    const officialDayRows = rows.filter((row) => officialDays.has(rowDate(row)));
    const officialRows = officialDayRows.filter((row) => row.dataset.officialTimeline === "true");
    const needsRebuild = officialDayRows.length !== officialArticles.length || officialRows.length !== officialArticles.length;
    if (!needsRebuild) return;
    officialDayRows.forEach((row) => row.remove());
    officialArticles.forEach((article) => list.appendChild(createOfficialRow(article)));
  }

  function pruneAndSortRows() {
    const list = document.querySelector(LIST_SELECTOR);
    if (!list || list.dataset.sortingTimeline === "true") return;
    list.dataset.sortingTimeline = "true";
    try {
      rebuildOfficialDayRows(list);
      Array.from(list.querySelectorAll(`:scope > ${ROW_SELECTOR}`)).forEach((row) => {
        cleanRow(row);
        const day = rowDate(row);
        const officialTitles = officialTitlesByDate.get(day);
        if (officialTitles?.size && row.dataset.officialTimeline !== "true" && !officialTitles.has(rowTitle(row))) row.remove();
      });
      const rows = Array.from(list.querySelectorAll(`:scope > ${ROW_SELECTOR}`));
      if (rows.length < 2) return;
      const sorted = [...rows].sort((a, b) => rowTime(b) - rowTime(a) || rowTitle(b).localeCompare(rowTitle(a), "zh-Hant"));
      if (!sorted.every((row, index) => row === rows[index])) sorted.forEach((row) => list.appendChild(row));
    } finally {
      delete list.dataset.sortingTimeline;
    }
  }

  async function refreshOfficialRows() {
    const api = await window.PolicyPulseFirebaseReady;
    if (!api?.enabled || !api.db) return false;
    const content = await loadFullPublishedContent(api, null);
    const articles = content.articles || [];
    if (!articles.length) return false;

    buildOfficialIndex(articles);
    const publicContent = window.PolicyPulseContent;
    if (publicContent) {
      publicContent.articles = mergeArticles(publicContent.articles || [], articles);
      publicContent.timeline = mergeTimeline(publicContent.timeline || [], articles);
      if (typeof window.render === "function") window.render();
    }
    window.PolicyPulseTimelineOrderHotfix = {
      loaded: true,
      articleCount: articles.length,
      newestDate: dateKey(articleDateValue(articles[0]), articles[0]?.updated || ""),
      dates: Array.from(officialTitlesByDate.keys()).slice(0, 12),
      refresh: refreshOfficialRows,
      clean: pruneAndSortRows,
    };
    pruneAndSortRows();
    return true;
  }

  function scheduleClean() {
    window.clearTimeout(timer);
    timer = window.setTimeout(pruneAndSortRows, 0);
    window.requestAnimationFrame(pruneAndSortRows);
  }

  function start() {
    installApiOverride();
    const list = document.querySelector(LIST_SELECTOR);
    if (list) new MutationObserver(scheduleClean).observe(list, { childList: true });
    document.addEventListener("click", () => RETRY_DELAYS.forEach((delay) => window.setTimeout(pruneAndSortRows, delay)), true);
    RETRY_DELAYS.forEach((delay) => window.setTimeout(() => refreshOfficialRows().catch(pruneAndSortRows), delay));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
