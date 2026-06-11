(function setupSiteSeo() {
  const canonicalUrl = new URL(location.href);
  canonicalUrl.hash = "";
  const urlParams = new URLSearchParams(location.search);
  const articleQueryId = urlParams.get("id");
  const isArticleShell = canonicalUrl.pathname.endsWith("/article.html") && articleQueryId;
  if (!isArticleShell) canonicalUrl.search = "";
  if (canonicalUrl.pathname.endsWith("/index.html")) canonicalUrl.pathname = "/";
  const siteName = "政策脈絡";
  const siteTitle = "政策脈絡｜台灣公共政策、人物與事件追蹤";
  const siteDescription =
    "政策脈絡整理台灣公共政策、政治人物、事件時間線與資料來源，追蹤財經、居住、能源、交通、勞工與教育議題，協助讀者快速理解政策背景與後續發展。";
  const siteImage = `${canonicalUrl.origin}/assets/podium.png`;
  const faviconUrl = `${canonicalUrl.origin}/favicon.svg`;
  const staticPages = new Set([
    "",
    "index",
    "admin",
    "account",
    "about",
    "corrections",
    "privacy",
    "register",
    "forgot-password",
    "data-map",
  ]);
  const topicLabels = {
    budget: "財經",
    housing: "居住",
    energy: "能源",
    transport: "交通",
    labor: "勞工",
    education: "教育",
  };

  function upsertLink(rel, href) {
    let link = document.head.querySelector(`link[rel="${rel}"]`);
    if (!link) {
      link = document.createElement("link");
      link.rel = rel;
      document.head.append(link);
    }
    link.href = href;
  }

  function ensureSiteFavicon() {
    const existing = document.head.querySelector('link[rel="icon"][href="/favicon.svg"], link[rel="icon"][href$="/favicon.svg"]');
    if (existing) {
      existing.setAttribute("type", "image/svg+xml");
      existing.setAttribute("sizes", "any");
      return;
    }
    const transientIcon = document.head.querySelector('link[rel="icon"][href^="data:"]');
    if (transientIcon) return;
    const icon = document.createElement("link");
    icon.rel = "icon";
    icon.href = faviconUrl;
    icon.type = "image/svg+xml";
    icon.sizes = "any";
    document.head.append(icon);
  }

  function upsertMeta(selector, attrs) {
    let node = document.head.querySelector(selector);
    if (!node) {
      node = document.createElement("meta");
      document.head.append(node);
    }
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  }

  function absoluteAssetUrl(value) {
    return new URL(value, document.baseURI || location.href).href;
  }

  upsertLink("canonical", canonicalUrl.href);
  ensureSiteFavicon();
  upsertMeta('meta[name="application-name"]', { name: "application-name", content: siteName });
  upsertMeta('meta[name="apple-mobile-web-app-title"]', { name: "apple-mobile-web-app-title", content: siteName });
  upsertMeta('meta[name="theme-color"]', { name: "theme-color", content: "#071719" });
  upsertMeta('meta[property="og:site_name"]', { property: "og:site_name", content: siteName });
  upsertMeta('meta[property="og:locale"]', { property: "og:locale", content: "zh_TW" });
  upsertMeta('meta[property="og:url"]', { property: "og:url", content: canonicalUrl.href });
  upsertMeta('meta[property="og:type"]', { property: "og:type", content: "website" });
  upsertMeta('meta[property="og:title"]', { property: "og:title", content: document.title || siteTitle });
  upsertMeta('meta[property="og:description"]', {
    property: "og:description",
    content: document.querySelector('meta[name="description"]')?.content || siteDescription,
  });
  upsertMeta('meta[property="og:image"]', { property: "og:image", content: siteImage });
  upsertMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
  upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: document.title || siteTitle });
  upsertMeta('meta[name="twitter:description"]', {
    name: "twitter:description",
    content: document.querySelector('meta[name="description"]')?.content || siteDescription,
  });
  upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: siteImage });

  if (!document.querySelector("#siteStructuredData")) {
    const schema = document.createElement("script");
    schema.id = "siteStructuredData";
    schema.type = "application/ld+json";
    schema.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: siteName,
      alternateName: ["Policy Pulse TW", "Policy Pulse"],
      url: `${canonicalUrl.origin}/`,
      description: siteDescription,
      inLanguage: "zh-Hant-TW",
      publisher: { "@id": `${canonicalUrl.origin}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: `${canonicalUrl.origin}/?search={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    });
    document.head.append(schema);
  }

  if (!document.querySelector("#organizationStructuredData")) {
    const schema = document.createElement("script");
    schema.id = "organizationStructuredData";
    schema.type = "application/ld+json";
    schema.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${canonicalUrl.origin}/#organization`,
      name: siteName,
      url: `${canonicalUrl.origin}/`,
      logo: siteImage,
      description: siteDescription,
    });
    document.head.append(schema);
  }

  function currentArticleId() {
    const urlParams = new URLSearchParams(location.search);
    const queryId = urlParams.get("id");
    if (queryId) return queryId;
    const fileName = decodeURIComponent(location.pathname.split("/").pop() || "").replace(/\.html$/i, "");
    if (staticPages.has(fileName)) return "";
    return document.body?.classList.contains("article-page") || location.pathname.includes("/articles/")
      ? fileName
      : "";
  }

  function findArticle(articleId) {
    const sources = [
      ...(window.PolicyPulseContent?.articles || []),
      ...(window.PolicyPulseGeneratedContent?.articles || []),
    ];
    return sources.find((article) => article?.id === articleId);
  }

  function upsertArticleSchema(article) {
    if (!article?.id) return;
    const image = article.image && !String(article.image).startsWith("data:")
      ? absoluteAssetUrl(article.image)
      : absoluteAssetUrl("assets/podium.png");
    let schema = document.querySelector("#articleStructuredData");
    if (!schema) {
      schema = document.createElement("script");
      schema.id = "articleStructuredData";
      schema.type = "application/ld+json";
      document.head.append(schema);
    }
    schema.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      headline: article.title,
      description: article.summary || `${article.title}｜政策脈絡整理`,
      image: [image],
      datePublished: article.publishedAt || article.updated || new Date().toISOString(),
      dateModified: article.updated || article.publishedAt || new Date().toISOString(),
      articleSection: article.topicLabel || topicLabels[article.topic] || article.topic || "政策",
      author: { "@type": "Organization", name: "政策脈絡" },
      publisher: {
        "@type": "Organization",
        name: "政策脈絡",
        logo: { "@type": "ImageObject", url: absoluteAssetUrl("assets/podium.png") },
      },
      mainEntityOfPage: canonicalUrl.href,
    });
  }

  function tryArticleSchema(attempt = 0) {
    const articleId = currentArticleId();
    if (!articleId) return;
    const article = findArticle(articleId);
    if (article) {
      upsertArticleSchema(article);
      return;
    }
    if (attempt < 6) window.setTimeout(() => tryArticleSchema(attempt + 1), 180 * (attempt + 1));
  }

  function loadPeopleDirectoryOverride() {
    if (!document.querySelector("#peopleList")) return;
    if (document.querySelector('script[data-people-directory-override="true"]')) return;
    const script = document.createElement("script");
    script.src = "people-directory-override.js?v=20260602-2";
    script.defer = true;
    script.dataset.peopleDirectoryOverride = "true";
    document.body.append(script);
  }

  tryArticleSchema();
  loadPeopleDirectoryOverride();
})();
