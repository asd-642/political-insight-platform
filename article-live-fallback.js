(function installArticleLiveFallback() {
  const FIREBASE_WAIT_MS = 9000;
  const INITIAL_RENDER_WAIT_MS = 3600;
  const FIRESTORE_SDK_URL = "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

  function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function withTimeout(promise, timeoutMs, fallback = null) {
    return Promise.race([
      promise,
      new Promise((resolve) => window.setTimeout(() => resolve(fallback), timeoutMs)),
    ]);
  }

  function getArticleIdFromUrl() {
    const queryId = new URLSearchParams(location.search).get("id");
    if (queryId) return queryId;

    const path = decodeURIComponent(location.pathname || "");
    if (!path.includes("/articles/")) return "";

    const fileName = path.split("/").filter(Boolean).pop() || "";
    return fileName.replace(/\.html$/i, "");
  }

  function getArticleRoot() {
    return document.querySelector("#articleRoot");
  }

  function hasRenderedArticle() {
    return Boolean(getArticleRoot()?.querySelector(".article-news-head"));
  }

  function rootLooksMissing() {
    const root = getArticleRoot();
    if (!root) return false;
    const text = root.textContent || "";
    return text.includes("Not Found") || text.includes("找不到這篇文章");
  }

  async function waitForInitialArticleDecision() {
    const startedAt = Date.now();
    while (Date.now() - startedAt < INITIAL_RENDER_WAIT_MS) {
      if (hasRenderedArticle() || rootLooksMissing()) return;
      await sleep(100);
    }
  }

  function renderLoading() {
    const root = getArticleRoot();
    if (!root) return;

    root.innerHTML = `
      <article class="article-news-card">
        <p class="eyebrow">Loading</p>
        <h1 class="news-title">正在讀取文章</h1>
        <p class="article-lead">正在從文章資料庫重新查詢這篇內容。</p>
      </article>
    `;
  }

  async function waitForFirebaseApi() {
    if (!window.PolicyPulseFirebaseReady) return null;

    try {
      const api = await withTimeout(window.PolicyPulseFirebaseReady, FIREBASE_WAIT_MS, null);
      return api?.enabled ? api : null;
    } catch {
      return null;
    }
  }

  function normalizeList(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (!value) return [];
    return [value];
  }

  function dateText(value) {
    if (!value) return "";
    if (typeof value === "string") return value.slice(0, 10);
    if (typeof value.toDate === "function") {
      return value.toDate().toISOString().slice(0, 10);
    }
    if (typeof value.seconds === "number") {
      return new Date(value.seconds * 1000).toISOString().slice(0, 10);
    }
    return String(value).slice(0, 10);
  }

  function normalizeArticleSnapshot(snapshot) {
    const data = snapshot.data() || {};
    return {
      ...data,
      id: data.id || snapshot.id,
      updated: dateText(data.updated || data.publishedAt || data.createdAt),
      tags: normalizeList(data.tags),
      facts: normalizeList(data.facts),
      sources: normalizeList(data.sources),
      sourceLinks: normalizeList(data.sourceLinks),
      sections: normalizeList(data.sections),
    };
  }

  function mergeArticleIntoContent(article) {
    const content = window.PolicyPulseContent || {};
    const articles = Array.isArray(content.articles) ? content.articles : [];
    window.PolicyPulseContent = {
      ...content,
      articles: [article, ...articles.filter((item) => item?.id !== article.id)],
    };
  }

  async function loadArticleFromFirestore(id, api) {
    if (!api?.db) return null;

    const firestore = await import(FIRESTORE_SDK_URL);
    const snapshot = await firestore.getDoc(firestore.doc(api.db, "articles", id));
    if (!snapshot.exists()) return null;

    const article = normalizeArticleSnapshot(snapshot);
    return article.published === false ? null : article;
  }

  async function loadArticleFromPublishedList(id, api) {
    if (!api?.loadPublishedContent) return null;

    const content = await withTimeout(api.loadPublishedContent(), FIREBASE_WAIT_MS, null);
    return (content?.articles || []).find((article) => article?.id === id) || null;
  }

  async function recoverArticle() {
    const id = getArticleIdFromUrl();
    if (!id) return;

    await waitForInitialArticleDecision();
    if (hasRenderedArticle() || !rootLooksMissing()) return;

    renderLoading();

    const api = await waitForFirebaseApi();
    let article = await loadArticleFromFirestore(id, api).catch(() => null);
    if (!article) {
      article = await loadArticleFromPublishedList(id, api).catch(() => null);
    }

    if (!article) {
      if (typeof window.renderMissing === "function") window.renderMissing();
      return;
    }

    mergeArticleIntoContent(article);
    if (typeof window.renderArticle === "function") {
      window.renderArticle(article);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", recoverArticle, { once: true });
  } else {
    window.setTimeout(recoverArticle, 0);
  }
})();
