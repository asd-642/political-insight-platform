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
    return article.publishedAt || article.reviewedAt || article.updatedAt || article.createdAtIso || article.createdAt || article.updated || "";
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
    };
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
    const attempts = [
      firestore.query(
        articlesRef,
        firestore.where("published", "==", true),
        firestore.orderBy("publishedAt", "desc"),
        firestore.limit(240),
      ),
      firestore.query(
        articlesRef,
        firestore.orderBy("publishedAt", "desc"),
        firestore.limit(240),
      ),
      firestore.query(
        articlesRef,
        firestore.where("published", "==", true),
        firestore.limit(240),
      ),
      articlesRef,
    ];
    for (const query of attempts) {
      try {
        return await firestore.getDocs(query);
      } catch {
        // Try the next supported query shape. Some projects may not have the composite index yet.
      }
    }
    return { docs: [] };
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
    const snapshot = await getLatestArticles(api);
    const articles = snapshot.docs
      .map(normalizeArticle)
      .filter((article) => article.published !== false)
      .sort((a, b) => articleTime(b) - articleTime(a));
    if (!articles.length) return false;

    buildOfficialIndex(articles);
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
