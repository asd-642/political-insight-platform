(function setupSiteSeo() {
  const canonicalUrl = new URL(location.href);
  canonicalUrl.hash = "";
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
  upsertMeta('meta[property="og:site_name"]', { property: "og:site_name", content: "政策脈絡" });
  upsertMeta('meta[property="og:locale"]', { property: "og:locale", content: "zh_TW" });
  upsertMeta('meta[property="og:url"]', { property: "og:url", content: canonicalUrl.href });

  if (!document.querySelector("#siteStructuredData")) {
    const schema = document.createElement("script");
    schema.id = "siteStructuredData";
    schema.type = "application/ld+json";
    schema.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "政策脈絡",
      url: canonicalUrl.origin,
      inLanguage: "zh-Hant-TW",
      potentialAction: {
        "@type": "SearchAction",
        target: `${canonicalUrl.origin}/index.html?search={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
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

  tryArticleSchema();
})();
