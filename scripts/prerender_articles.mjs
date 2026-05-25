import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const articleDir = path.join(root, "articles");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeJson(value) {
  return JSON.stringify(value).replaceAll("</", "<\\/");
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  return [value];
}

function dateValue(value) {
  const time = Date.parse(value || "");
  return Number.isFinite(time) ? time : 0;
}

function mergeById(...lists) {
  const merged = new Map();
  lists.flat().filter(Boolean).forEach((item) => {
    if (!item?.id) return;
    merged.set(item.id, { ...merged.get(item.id), ...item });
  });
  return [...merged.values()];
}

async function readGeneratedContent() {
  try {
    const text = await readFile(path.join(root, "content", "generated-content.js"), "utf8");
    const match = text.match(/window\.PolicyPulseGeneratedContent\s*=\s*(\{[\s\S]*\});?\s*$/);
    return match ? JSON.parse(match[1]) : {};
  } catch {
    return {};
  }
}

async function readArticlesJson() {
  try {
    return JSON.parse(await readFile(path.join(root, "content", "articles.json"), "utf8"));
  } catch {
    return {};
  }
}

async function readSeedContent() {
  const appCode = await readFile(path.join(root, "app.js"), "utf8");
  const sandbox = {
    window: {},
    document: { querySelector: () => null },
    console,
    URL,
    URLSearchParams,
    setTimeout,
    clearTimeout,
  };
  vm.createContext(sandbox);
  vm.runInContext(appCode, sandbox, { filename: "app.js" });
  return sandbox.window.PolicyPulseContent || {};
}

async function loadContent() {
  const seed = await readSeedContent();
  const generated = await readGeneratedContent();
  const articlesJson = await readArticlesJson();
  const topics = mergeById(seed.topics || [], generated.topics || [], articlesJson.topics || []);
  const sources = mergeById(seed.sources || [], generated.sources || [], articlesJson.sources || []);
  const articles = mergeById(seed.articles || [], generated.articles || [], articlesJson.articles || [])
    .sort((a, b) =>
      dateValue(b.publishedAt || b.reviewedAt || b.updated) -
        dateValue(a.publishedAt || a.reviewedAt || a.updated) ||
      String(b.id).localeCompare(String(a.id)),
    );
  return { topics, sources, articles };
}

function topicName(topics, id) {
  return topics.find((topic) => topic.id === id)?.name || id || "政策";
}

function topicImage(topics, id) {
  return topics.find((topic) => topic.id === id)?.image || "assets/podium.png";
}

function articleImage(article, topics) {
  return article.image || topicImage(topics, article.topic);
}

function normalizeFacts(article) {
  if (Array.isArray(article.facts) && article.facts.length) {
    return article.facts
      .map((item) => Array.isArray(item) ? item : [item.label || item.title || "重點", item.value || item.text || ""])
      .filter((item) => item[0] || item[1]);
  }
  return [
    ["影響對象", "待依來源補齊"],
    ["核心爭點", article.summary || "待補資料"],
    ["觀察指標", "預算、執行進度、公開紀錄"],
  ];
}

function normalizeSections(article, topic) {
  const directSections = Array.isArray(article.sections)
    ? article.sections.map((section, index) => ({
        heading: section.heading || section.title || `段落 ${index + 1}`,
        paragraphs: normalizeList(section.paragraphs || section.body || section.content),
      }))
    : [];

  if (directSections.length) return directSections;

  if (Array.isArray(article.body) && article.body.length) {
    return article.body.map((section, index) => {
      if (typeof section === "string") return { heading: `段落 ${index + 1}`, paragraphs: [section] };
      return {
        heading: section.heading || section.title || `段落 ${index + 1}`,
        paragraphs: normalizeList(section.paragraphs || section.body || section.content),
      };
    });
  }

  if (typeof article.body === "string" && article.body.trim()) {
    return [{
      heading: "完整內容",
      paragraphs: article.body.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean),
    }];
  }

  return [
    {
      heading: "事件背景",
      paragraphs: [
        `這篇整理聚焦「${article.title}」，屬於「${topic}」議題。本站會把政策背景、影響對象、支持方、疑慮方與後續待查資料拆開，避免把評論混成事實。`,
        article.summary || "本文仍在補齊公開來源與後續追蹤資料。",
      ],
    },
    {
      heading: "支持方說法",
      paragraphs: [
        article.support || "支持方說法仍待補充，後續會整理政策目的、預期效果、受益對象與可驗證指標。",
      ],
    },
    {
      heading: "疑慮與反對理由",
      paragraphs: [
        article.concern || "疑慮方說法仍待補充，後續會整理預算、執行、公平性與資訊透明度等問題。",
      ],
    },
    {
      heading: "後續追蹤方向",
      paragraphs: [
        article.next || "本站接下來會補齊正式公告、議事紀錄、統計資料與主管機關回應。",
      ],
    },
  ];
}

function renderFacts(article) {
  return normalizeFacts(article).map(([label, value]) => `
                <li>
                  <strong>${escapeHtml(label)}</strong>
                  <span>${escapeHtml(value)}</span>
                </li>`).join("");
}

function renderSections(article, topic) {
  return normalizeSections(article, topic).map((section, index) => `
        <section class="article-news-section">
          <h2 class="body-subhead">${escapeHtml(section.heading)}</h2>
          ${normalizeList(section.paragraphs).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
        </section>
        ${index === 1 ? `
        <aside class="promo-slot article-inline-ad" data-promo-slot aria-label="文章內廣告版位">
          <span>廣告版位</span>
          <strong>In-article / 728 x 90</strong>
        </aside>` : ""}`).join("");
}

function renderTags(article) {
  return normalizeList(article.tags).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
}

function renderSources(article) {
  return normalizeList(article.sources).map((source) => `<span class="source-pill">${escapeHtml(source)}</span>`).join("");
}

function renderArticleBody(article, content) {
  const topic = topicName(content.topics, article.topic);
  const image = articleImage(article, content.topics);
  const sourceLabel = normalizeList(article.sources)[0] || "政策脈絡";
  const caption = article.caption || `${topic}議題示意圖。本站以公開資料與後續追蹤整理政策脈絡。`;
  return `
    <article class="article-news-card">
      <header class="article-news-head">
        <div class="article-kicker-line">
          <span class="topic-badge">${escapeHtml(topic)}</span>
          <span>${escapeHtml(article.status || "追蹤中")}</span>
        </div>
        <h1 class="news-title">${escapeHtml(article.title)}</h1>
        <div class="article-actions-bar">
          <button
            id="followArticleBtn"
            class="follow-btn"
            type="button"
            data-article-id="${escapeHtml(article.id)}"
            data-article-title="${escapeHtml(article.title)}"
            aria-pressed="false"
          >
            <span class="follow-icon" aria-hidden="true">+</span>
            <span class="follow-text">追蹤此議題</span>
          </button>
        </div>
        <div class="news-meta">
          <span>${escapeHtml(sourceLabel)}</span>
          <span>更新時間 ${escapeHtml(article.updated || "尚未標示")}</span>
          <span>政策脈絡整理</span>
        </div>
      </header>

      <figure class="article-media">
        <img src="${escapeHtml(image)}" alt="${escapeHtml(topic)}議題文章封面" decoding="async" fetchpriority="high" />
        <figcaption>${escapeHtml(caption)}</figcaption>
      </figure>

      <p class="article-lead">${escapeHtml(article.summary || "本文整理議題背景、支持與疑慮、後續觀察指標。")}</p>

      <section class="article-quick-box">
        <h2>重點摘要</h2>
        <ul>${renderFacts(article)}</ul>
      </section>

      <section class="article-news-body">${renderSections(article, topic)}</section>

      <section class="article-disclaimer" aria-label="免責聲明">
        <h2>免責聲明</h2>
        <p>本文為公開資料、新聞來源與政策脈絡整理，目的在於協助讀者理解議題背景與後續追蹤方向，不構成法律、投資、醫療或其他專業建議。</p>
        <p>文章中的支持方、疑慮方與待查資料為編輯整理架構，並不代表本站立場。若內容涉及人物、機關或事件責任，仍應以主管機關公告、法院判決、議事紀錄與當事方正式說法為準。</p>
      </section>

      <footer class="article-footer-meta">
        <div class="source-line">${renderSources(article)}</div>
        <div class="tag-row">${renderTags(article)}</div>
      </footer>
    </article>

    <aside class="article-aside">
      <section class="promo-slot" data-promo-slot>
        <span>廣告版位</span>
        <strong>300 x 250</strong>
      </section>
      <section class="article-side-card">
        <p class="eyebrow">Reading Note</p>
        <h2>本站閱讀原則</h2>
        <p>政策文章分開呈現事實、支持方、疑慮方與待補資料，避免把評論混成事實。</p>
      </section>
      <aside class="promo-slot article-inline-ad" data-promo-slot aria-label="文章內廣告版位">
        <span>廣告版位</span>
        <strong>Sidebar / 300 x 600</strong>
      </aside>
    </aside>`;
}

function themeBootScript() {
  return `<script>
      (() => {
        try {
          const saved = localStorage.getItem("policyPulseTheme");
          const prefersLight = window.matchMedia?.("(prefers-color-scheme: light)").matches;
          document.documentElement.dataset.theme = saved || (prefersLight ? "light" : "dark");
        } catch {
          document.documentElement.dataset.theme = "dark";
        }
      })();
    <\/script>`;
}

function renderPage(article, content) {
  const topic = topicName(content.topics, article.topic);
  const image = articleImage(article, content.topics);
  const url = `articles/${encodeURIComponent(article.id)}.html`;
  const schema = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.summary || `${article.title}｜政策脈絡整理`,
    image: [image],
    datePublished: article.publishedAt || article.updated || new Date().toISOString(),
    dateModified: article.updated || article.publishedAt || new Date().toISOString(),
    articleSection: topic,
    author: { "@type": "Organization", name: "政策脈絡" },
    publisher: {
      "@type": "Organization",
      name: "政策脈絡",
      logo: { "@type": "ImageObject", url: "assets/podium.png" },
    },
    mainEntityOfPage: url,
  };

  return `<!doctype html>
<html lang="zh-Hant-TW">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    ${themeBootScript()}
    <base href="../" />
    <title>${escapeHtml(article.title)}｜政策脈絡</title>
    <meta name="description" content="${escapeHtml(article.summary || article.title)}" />
    <meta name="robots" content="index,follow" />
    <link rel="canonical" href="${escapeHtml(url)}" />
    <meta property="og:title" content="${escapeHtml(article.title)}" />
    <meta property="og:description" content="${escapeHtml(article.summary || article.title)}" />
    <meta property="og:type" content="article" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <script id="articleStructuredData" type="application/ld+json">${safeJson(schema)}<\/script>
    <link rel="preconnect" href="https://www.gstatic.com" crossorigin />
    <link rel="preconnect" href="https://pagead2.googlesyndication.com" crossorigin />
    <link rel="stylesheet" href="styles.css?v=20260525-2" />
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4133542156062168"
      crossorigin="anonymous"><\/script>
  </head>
  <body class="article-page">
    <header class="topbar">
      <a class="brand" href="index.html" aria-label="回到政策脈絡首頁">
        <span class="brand-mark">政</span>
        <span class="brand-text">政策脈絡</span>
      </a>
      <nav class="nav-tabs" aria-label="文章導覽">
        <a class="nav-tab" href="index.html">焦點</a>
        <a class="nav-tab" href="index.html#top">議題</a>
        <a class="nav-tab" href="admin.html" data-admin-only hidden>後台</a>
      </nav>
      <form id="articleSearchForm" class="search-field" action="index.html" method="GET" role="search">
        <span aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="m21 21-4.35-4.35m1.35-5.15a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />
          </svg>
        </span>
        <input id="articleSearch" name="search" type="search" minlength="2" placeholder="搜尋政策、人物、事件" />
      </form>
      <div class="auth-controls" aria-label="帳號與顯示設定">
        <button id="themeToggle" class="utility-button" type="button">
          <span id="themeLabel">亮色</span>
        </button>
        <button id="accountButton" class="account-button" type="button" hidden>帳號</button>
      </div>
    </header>

    <main class="article-shell">
      <article id="articleRoot" class="article-layout">${renderArticleBody(article, content)}</article>
    </main>

    <footer class="site-footer">
      <a href="index.html">回首頁</a>
      <a href="about.html">關於本站</a>
      <a href="corrections.html">更正與來源政策</a>
      <a href="privacy.html">隱私權政策</a>
    </footer>

    <script src="utils.js?v=20260524-1"></script>
    <script src="firebase-config.js?v=20260525-2"></script>
    <script src="firebase-bootstrap.js?v=20260520-2"></script>
    <script src="site-seo.js?v=20260520-2"></script>
    <script src="auth-theme.js?v=20260525-2"></script>
    <script src="ad-safety.js?v=20260520-2"></script>
    <script src="watchlist.js?v=20260520-4"></script>
    <script src="visuals.js?v=20260520-2"></script>
    <script src="content/generated-content.js"></script>
    <script src="app.js?v=20260525-4"></script>
    <script src="article.js?v=20260525-1"></script>
  </body>
</html>
`;
}

async function clearOldPages() {
  await mkdir(articleDir, { recursive: true });
  const files = await readdir(articleDir);
  await Promise.all(files.filter((file) => file.endsWith(".html")).map((file) => rm(path.join(articleDir, file))));
}

async function main() {
  const content = await loadContent();
  await clearOldPages();
  await Promise.all(content.articles.map((article) =>
    writeFile(path.join(articleDir, `${article.id}.html`), renderPage(article, content), "utf8"),
  ));
  await writeFile(
    path.join(root, "content", "prerendered-articles.json"),
    `${JSON.stringify({ articles: content.articles.map((article) => ({
      id: article.id,
      topic: article.topic || "policy",
      topicLabel: topicName(content.topics, article.topic),
      title: article.title,
      summary: article.summary || "",
      status: article.status || "",
      updated: article.updated || "",
      path: `articles/${encodeURIComponent(article.id)}.html`,
    })) }, null, 2)}\n`,
    "utf8",
  );
  console.log(`已產生 ${content.articles.length} 個靜態文章頁。`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
