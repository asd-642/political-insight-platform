(function installHomeFreshHotfix() {
  const isHome = location.pathname === "/" || /\/index\.html$/i.test(location.pathname);
  if (!isHome) return;

  const STYLE_ID = "policyFreshHomeStyle";
  const LOADING_CLASS = "policy-fresh-home-loading";
  const FIREBASE_TIMEOUT_MS = 12000;
  const TOPIC_NAMES = {
    budget: "財經",
    housing: "居住",
    energy: "能源",
    transport: "交通",
    labor: "勞工",
    education: "教育",
  };
  const TOPIC_IMAGES = {
    policy: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=82",
    budget: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=82",
    housing: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=82",
    energy: "https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1200&q=82",
    transport: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=82",
    labor: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=82",
    education: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=82",
  };
  const HIDDEN_TAGS = new Set(["待核查", "待審核", "待補資料", "追蹤中"]);
  let latestArticles = [];
  let isRendering = false;
  let observerInstalled = false;

  function installLoadingStyle() {
    document.documentElement.classList.add(LOADING_CLASS);
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      html.${LOADING_CLASS} #featuredStory,
      html.${LOADING_CLASS} #headlineList,
      html.${LOADING_CLASS} #articleGrid,
      html.${LOADING_CLASS} #articlePagination,
      html.${LOADING_CLASS} #detailBody {
        visibility: hidden;
      }
      html.${LOADING_CLASS} #viewOverview::after {
        content: "正在更新今日文章";
        display: block;
        padding: 22px;
        border: 1px solid var(--line, #d7d0c2);
        background: var(--paper, #fffdf8);
        color: var(--ink, #0f1a22);
        font-weight: 800;
      }
      html[data-theme="dark"].${LOADING_CLASS} #viewOverview::after {
        background: #0f2025;
        color: #f2fbf8;
        border-color: rgba(111, 226, 207, 0.28);
      }
      #articleGrid .article-card,
      #headlineList .headline-item,
      .filter-chip,
      .watch-row {
        transform: none !important;
      }
      #articleGrid .article-card:hover,
      #articleGrid .article-card.is-selected,
      #headlineList .headline-item:hover,
      #headlineList .headline-item.is-selected,
      .filter-chip:hover,
      .filter-chip.is-active,
      .watch-row:hover {
        transform: none !important;
      }
      #articleGrid .article-card {
        min-height: 360px;
      }
      #articleGrid .article-card .thumb {
        display: block;
      }
      #detailBody.detail-body {
        gap: 12px;
      }
    `;
    document.head.append(style);
  }

  function reveal() {
    document.documentElement.classList.remove(LOADING_CLASS);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function withTimeout(promise, timeoutMs) {
    return Promise.race([
      Promise.resolve(promise),
      delay(timeoutMs).then(() => null),
    ]);
  }

  function isoValue(value) {
    if (!value) return "";
    if (typeof value === "string") return value;
    const date = value?.toDate?.() || value;
    if (date instanceof Date && !Number.isNaN(date.getTime())) return date.toISOString();
    return "";
  }

  function dateKey(article) {
    const raw = article?.publishedAt || article?.reviewedAt || article?.updatedAt || article?.createdAtIso || article?.createdAt || article?.updated || "";
    const value = isoValue(raw) || raw;
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }

  function articleTime(article) {
    const raw = article?.publishedAt || article?.reviewedAt || article?.updatedAt || article?.createdAtIso || article?.createdAt || article?.updated || "";
    const time = Date.parse(isoValue(raw) || raw);
    return Number.isFinite(time) ? time : 0;
  }

  function cleanCopy(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .replace(/根據(?:自動抓取來源摘要|關鍵字)[，,、\s]*/g, "")
      .replace(/(?:本文先整理|先整理)[^。]{0,32}(?:補充的資料|後續觀察方向)。?/g, "")
      .replace(/(?:後續影響與資料待查核|資料待查核|仍需補充的資料|內容大綱)[:：]?\s*/g, "")
      .trim();
  }

  function articleTitle(article) {
    return cleanCopy(article?.title)
      .replace(/\s*，?\s*後續影響與資料待查核\s*$/g, "")
      .replace(/\s*議題整理\s*$/g, "")
      .replace(/\s*議題\s*$/g, "")
      .trim() || "政策更新";
  }

  function articleExcerpt(article) {
    const text = cleanCopy(article?.summary || article?.excerpt || article?.description || "");
    if (text) return text;
    const topic = TOPIC_NAMES[article?.topic] || "公共政策";
    return `${topic}近期受到關注，重點包括政策背景、各方說法與後續觀察。`;
  }

  function topicName(topic) {
    return TOPIC_NAMES[topic] || cleanCopy(topic) || "政策";
  }

  function visualTopic(article) {
    const text = [
      article?.id,
      article?.title,
      article?.summary,
      article?.excerpt,
      Array.isArray(article?.tags) ? article.tags.join(" ") : "",
    ].join(" ");
    if (/交通|道路|公車|捷運|鐵路|通勤|運輸|車流|路線|班次|停車/.test(text)) return "transport";
    if (/教育|校園|學費|學校|學生|採購|課程/.test(text)) return "education";
    if (/能源|電價|供電|電網|再生|風力|太陽能|發電/.test(text)) return "energy";
    if (/居住|住宅|房價|房租|租屋|社宅|都更/.test(text)) return "housing";
    if (/勞工|薪資|就業|職安|加班|工資/.test(text)) return "labor";
    if (/預算|財經|財政|補助|稅|產業|投資|物價|經費|財源/.test(text)) return "budget";
    return article?.topic || "policy";
  }

  function articleImage(article) {
    return TOPIC_IMAGES[visualTopic(article)] || TOPIC_IMAGES.policy;
  }

  function publicTags(article) {
    const tags = Array.isArray(article?.tags) ? article.tags : [];
    const pieces = tags
      .flatMap((tag) => String(tag || "").split(/\s+/))
      .map(cleanCopy)
      .filter(Boolean)
      .filter((tag) => !/^[a-z0-9_-]+$/i.test(tag))
      .filter((tag) => !HIDDEN_TAGS.has(tag));
    const unique = [];
    pieces.forEach((tag) => {
      if (!unique.includes(tag)) unique.push(tag);
    });
    if (article?.topic) unique.unshift(topicName(article.topic));
    return [...new Set(unique)].slice(0, 6);
  }

  function openArticle(article) {
    if (!article?.id) return;
    location.href = `/article.html?id=${encodeURIComponent(article.id)}`;
  }

  function normalizeArticles(content) {
    const articles = Array.isArray(content?.articles) ? content.articles : [];
    const byId = new Map();
    articles
      .filter((article) => article?.id && article.published !== false)
      .forEach((article) => byId.set(article.id, { ...article, updated: dateKey(article) || article.updated }));
    return [...byId.values()].sort((a, b) => articleTime(b) - articleTime(a) || String(b.id).localeCompare(String(a.id)));
  }

  async function loadFreshArticles() {
    const api = await withTimeout(window.PolicyPulseFirebaseReady, FIREBASE_TIMEOUT_MS);
    if (!api?.enabled || typeof api.loadPublishedContent !== "function") return [];
    const content = await withTimeout(api.loadPublishedContent(), FIREBASE_TIMEOUT_MS);
    return normalizeArticles(content);
  }

  async function waitForAppRender() {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      if (document.querySelector("#articleGrid .article-card") || document.querySelector("#headlineList .headline-item")) return;
      await delay(80);
    }
  }

  function renderFeatured(article) {
    const featured = document.getElementById("featuredStory");
    if (!featured || !article) return;
    const title = articleTitle(article);
    featured.innerHTML = `
      <img src="${escapeHtml(articleImage(article))}" alt="${escapeHtml(topicName(article.topic))}焦點圖片" decoding="async" fetchpriority="high" referrerpolicy="no-referrer" />
      <div class="featured-overlay">
        <span class="topic-badge">${escapeHtml(topicName(article.topic))}</span>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(articleExcerpt(article))}</p>
      </div>
    `;
    featured.tabIndex = 0;
    featured.setAttribute("role", "link");
    featured.setAttribute("aria-label", `閱讀全文：${title}`);
    featured.onclick = () => openArticle(article);
    featured.onkeydown = (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openArticle(article);
      }
    };
  }

  function renderHeadlines(articles) {
    const container = document.getElementById("headlineList");
    if (!container) return;
    container.innerHTML = articles.slice(1, 5).map((article, index) => `
      <button class="headline-item ${index === 0 ? "is-selected" : ""}" type="button" data-fresh-article="${escapeHtml(article.id)}">
        <strong>${escapeHtml(articleTitle(article))}</strong>
        <span>${escapeHtml(articleExcerpt(article))}</span>
      </button>
    `).join("");
    container.querySelectorAll("[data-fresh-article]").forEach((button) => {
      const article = articles.find((item) => item.id === button.dataset.freshArticle);
      button.addEventListener("click", () => openArticle(article));
    });
  }

  function renderGrid(articles) {
    const container = document.getElementById("articleGrid");
    const pagination = document.getElementById("articlePagination");
    const label = document.getElementById("activeTopicLabel");
    if (label) label.textContent = "全部";
    if (!container) return;
    const pageItems = articles.slice(0, 12);
    container.innerHTML = pageItems.map((article, index) => `
      <button class="article-card ${index === 0 ? "is-selected" : ""}" type="button" data-fresh-article="${escapeHtml(article.id)}">
        <img class="thumb" src="${escapeHtml(articleImage(article))}" alt="${escapeHtml(topicName(article.topic))}文章圖片" loading="lazy" decoding="async" referrerpolicy="no-referrer" />
        <span class="card-content">
          <span class="card-kicker">
            <span>${escapeHtml(topicName(article.topic))}</span>
            <span>${escapeHtml(dateKey(article) || article.updated)}</span>
          </span>
          <h3>${escapeHtml(articleTitle(article))}</h3>
          <p>${escapeHtml(articleExcerpt(article))}</p>
          <span class="tag-row">
            ${publicTags(article).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
          </span>
        </span>
      </button>
    `).join("");
    container.querySelectorAll("[data-fresh-article]").forEach((button) => {
      const article = articles.find((item) => item.id === button.dataset.freshArticle);
      button.addEventListener("click", () => openArticle(article));
    });
    if (pagination) {
      const totalPages = Math.max(1, Math.ceil(articles.length / 12));
      pagination.innerHTML = `
        <div class="pagination-summary">第 1 / ${totalPages} 頁，顯示 1-${Math.min(12, articles.length)} 則，共 ${articles.length} 篇</div>
        <div class="pagination-controls">
          <button class="pagination-button" type="button" disabled>上一頁</button>
          <button class="pagination-page is-active" type="button" aria-current="page">1</button>
          ${totalPages > 1 ? `<button class="pagination-page" type="button">2</button>` : ""}
          ${totalPages > 2 ? `<span class="pagination-gap" aria-hidden="true">...</span><button class="pagination-page" type="button">${totalPages}</button>` : ""}
          <button class="pagination-button" type="button" ${totalPages <= 1 ? "disabled" : ""}>下一頁</button>
        </div>
      `;
    }
  }

  function renderDetail(article) {
    const title = document.getElementById("detailTitle");
    const body = document.getElementById("detailBody");
    if (!article || !title || !body) return;
    title.textContent = articleTitle(article);
    body.innerHTML = `
      <p class="detail-summary">${escapeHtml(articleExcerpt(article))}</p>
      <section class="detail-block">
        <h3>快速事實</h3>
        <ul>
          <li><strong>重點 1：</strong>可比對公開資料</li>
          <li><strong>核心爭點：</strong>${escapeHtml(topicName(article.topic))}相關政策影響與各方主張</li>
          <li><strong>觀察指標：</strong>預算、執行進度、公開紀錄</li>
        </ul>
      </section>
      <section class="detail-block">
        <h3>來源</h3>
        <div class="source-line"><span class="source-pill">資料庫最新文章</span></div>
      </section>
    `;
  }

  function renderFreshHome(articles) {
    if (!articles.length) return false;
    latestArticles = articles;
    isRendering = true;
    window.PolicyPulseContent = {
      ...(window.PolicyPulseContent || {}),
      articles,
    };
    renderFeatured(articles[0]);
    renderHeadlines(articles);
    renderGrid(articles);
    renderDetail(articles[0]);
    isRendering = false;
    window.PolicyPulseHomeFreshHotfix = {
      loaded: true,
      articleCount: articles.length,
      newestDate: dateKey(articles[0]),
      refreshedAt: new Date().toISOString(),
    };
    return true;
  }

  function needsFreshRender() {
    if (!latestArticles.length) return false;
    const firstDate = document.querySelector("#articleGrid .article-card .card-kicker span:nth-child(2)")?.textContent?.trim() || "";
    const newestDate = dateKey(latestArticles[0]);
    const heroSrc = document.querySelector("#featuredStory img")?.getAttribute("src") || "";
    return firstDate !== newestDate || /hero-market|assets\/(?:education|energy|housing|labor|podium|transport)\.png/i.test(heroSrc);
  }

  function installRenderGuard() {
    if (observerInstalled) return;
    const targets = ["featuredStory", "headlineList", "articleGrid", "articlePagination", "detailBody"]
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    if (!targets.length) return;
    observerInstalled = true;
    const observer = new MutationObserver(() => {
      if (isRendering || !latestArticles.length) return;
      clearTimeout(installRenderGuard.timer);
      installRenderGuard.timer = setTimeout(() => renderFreshHome(latestArticles), 80);
    });
    targets.forEach((target) => observer.observe(target, { childList: true, subtree: false }));
  }

  async function refresh() {
    installLoadingStyle();
    try {
      const [articles] = await Promise.all([loadFreshArticles(), waitForAppRender()]);
      if (!renderFreshHome(articles)) return false;
      installRenderGuard();
      [9000, 14000].forEach((ms) => setTimeout(() => {
        if (needsFreshRender()) renderFreshHome(articles);
      }, ms));
      return true;
    } finally {
      reveal();
    }
  }

  installLoadingStyle();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => refresh().catch(reveal), { once: true });
  } else {
    refresh().catch(reveal);
  }
  setTimeout(reveal, FIREBASE_TIMEOUT_MS + 4000);
})();
