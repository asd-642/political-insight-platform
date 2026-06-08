(function installTimelineOrderHotfix() {
  const FIRESTORE_URL = "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
  const MAX_PUBLIC_ARTICLES = 240;
  const LIST_SELECTOR = "#timelineList";
  const ROW_SELECTOR = ".timeline-item";
  const RETRY_DELAYS = [0, 50, 150, 400, 900, 1600];
  let observer = null;
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
    return (
      article.publishedAt ||
      article.reviewedAt ||
      article.updatedAt ||
      article.createdAtIso ||
      article.createdAt ||
      article.updated ||
      ""
    );
  }

  function articleTime(article) {
    const time = Date.parse(isoValue(articleDateValue(article)) || article.updated || "");
    return Number.isFinite(time) ? time : 0;
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

  function sortArticles(articles) {
    return [...articles].sort((a, b) => articleTime(b) - articleTime(a));
  }

  function mergeArticles(existing, incoming) {
    const byId = new Map();
    existing.forEach((article) => {
      if (article?.id) byId.set(article.id, article);
    });
    incoming.forEach((article) => {
      if (!article?.id) return;
      byId.set(article.id, { ...(byId.get(article.id) || {}), ...article });
    });
    return sortArticles([...byId.values()]);
  }

  function cleanReviewCopy(value) {
    return String(value || "")
      .replace(/\s*發布紀錄$/g, "")
      .replaceAll("待審草稿", "已發布待檢查文章")
      .replaceAll("草稿審核", "發布後檢查")
      .replaceAll("確認發布 ", "標記已檢查")
      .replaceAll("待審核", "待檢查");
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
      title: cleanReviewCopy(article.title || existing.title || "文章更新"),
      description: cleanReviewCopy(existing.description || article.summary || article.excerpt || ""),
    };
  }

  function mergeTimeline(existingTimeline, articles) {
    const byArticleId = new Map();
    existingTimeline.forEach((item) => {
      const articleId = item.articleId || String(item.id || "").replace(/^timeline-/, "");
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

  async function getLatestArticles(api) {
    const firestore = await import(FIRESTORE_URL);
    const articlesRef = firestore.collection(api.db, "articles");
    const orderedPublicQuery = firestore.query(
      articlesRef,
      firestore.where("published", "==", true),
      firestore.orderBy("publishedAt", "desc"),
      firestore.limit(MAX_PUBLIC_ARTICLES),
    );
    try {
      return await firestore.getDocs(orderedPublicQuery);
    } catch {
      try {
        return await firestore.getDocs(
          firestore.query(
            articlesRef,
            firestore.orderBy("publishedAt", "desc"),
            firestore.limit(MAX_PUBLIC_ARTICLES),
          ),
        );
      } catch {
        return firestore.getDocs(
          firestore.query(
            articlesRef,
            firestore.where("published", "==", true),
            firestore.limit(MAX_PUBLIC_ARTICLES),
          ),
        );
      }
    }
  }

  async function refreshLatestContent() {
    const api = await window.PolicyPulseFirebaseReady;
    if (!api?.enabled || !api.db) return false;
    const snapshot = await getLatestArticles(api);
    const incoming = sortArticles(
      snapshot.docs
        .map(normalizeArticle)
        .filter((article) => article.published !== false),
    );
    if (!incoming.length || !window.PolicyPulseContent) return false;

    const content = window.PolicyPulseContent;
    content.articles = mergeArticles(content.articles || [], incoming);
    content.timeline = mergeTimeline(content.timeline || [], content.articles);
    window.PolicyPulseTimelineLatestHotfix = {
      loaded: true,
      articleCount: incoming.length,
      newestDate: dateKey(articleDateValue(incoming[0])),
    };

    if (typeof window.render === "function") {
      window.render();
    } else if (typeof window.renderTimeline === "function") {
      window.renderTimeline();
    }
    scheduleRetrySorts();
    return true;
  }

  function parseDate(row) {
    const value = row.querySelector("time")?.textContent?.trim() || "";
    const time = Date.parse(value);
    return Number.isFinite(time) ? time : 0;
  }

  function rowTitle(row) {
    return row.querySelector("h3")?.textContent?.trim() || "";
  }

  function cleanTimelineRowTitle(row) {
    const title = row.querySelector("h3");
    if (!title) return;
    const cleaned = cleanReviewCopy(title.textContent);
    if (cleaned && cleaned !== title.textContent) title.textContent = cleaned;
  }

  function sortTimelineRows() {
    const list = document.querySelector(LIST_SELECTOR);
    if (!list || list.dataset.sortingTimeline === "true") return;

    const rows = Array.from(list.querySelectorAll(`:scope > ${ROW_SELECTOR}`));
    if (rows.length < 2) return;
    rows.forEach(cleanTimelineRowTitle);

    const sorted = [...rows].sort((a, b) => {
      const timeDiff = parseDate(b) - parseDate(a);
      if (timeDiff) return timeDiff;
      return rowTitle(b).localeCompare(rowTitle(a), "zh-Hant");
    });

    const alreadySorted = sorted.every((row, index) => row === rows[index]);
    if (alreadySorted) return;

    list.dataset.sortingTimeline = "true";
    sorted.forEach((row) => list.appendChild(row));
    delete list.dataset.sortingTimeline;
  }

  function scheduleSort() {
    window.clearTimeout(timer);
    timer = window.setTimeout(sortTimelineRows, 0);
    window.requestAnimationFrame(sortTimelineRows);
  }

  function scheduleRetrySorts() {
    RETRY_DELAYS.forEach((delay) => {
      window.setTimeout(sortTimelineRows, delay);
    });
  }

  function scheduleRetryRefreshes() {
    [0, 500, 1500, 3500, 7000].forEach((delay) => {
      window.setTimeout(() => {
        refreshLatestContent().catch(() => {});
      }, delay);
    });
  }

  function start() {
    const list = document.querySelector(LIST_SELECTOR);
    if (list) {
      observer = new MutationObserver(scheduleSort);
      observer.observe(list, { childList: true });
    }
    document.addEventListener("click", scheduleRetrySorts, true);
    window.PolicyPulseTimelineOrderHotfix = {
      sort: sortTimelineRows,
      schedule: scheduleRetrySorts,
      refresh: refreshLatestContent,
      observer,
    };
    scheduleRetrySorts();
    scheduleRetryRefreshes();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
