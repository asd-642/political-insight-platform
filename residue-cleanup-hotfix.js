(function installResidueCleanupHotfix() {
  const TOPIC_WORDS = [
    "交通",
    "公車",
    "月票",
    "居住",
    "住宅",
    "租屋",
    "房租",
    "能源",
    "電網",
    "停電",
    "儲能",
    "勞工",
    "教育",
    "財經",
    "財政",
    "預算",
  ];
  const TAG_LABELS = {
    budget: "財經",
    housing: "居住",
    energy: "能源",
    transport: "交通",
    labor: "勞工",
    education: "教育",
  };

  function topicFromText(value) {
    const text = String(value || "");
    return TOPIC_WORDS.find((topic) => text.includes(topic)) || "公共政策";
  }

  function newsExcerpt(topic) {
    return `${topic}議題近期受到關注，重點包括政策背景、各方說法、預算或執行進度，後續可觀察主管機關回應。`;
  }

  function clean(value) {
    return String(value ?? "")
      .replace(/\s*[，,]\s*後續影響與資料(?:待查核|追蹤中)?/g, "")
      .replace(/\s*後續影響與資料(?:待查核|追蹤中)?/g, "")
      .replace(/根據公開資料，近期與([^。]+?)議題相關。本文先整理[，、]?主要爭點與後續觀察方向。?/g, (_, topic) => newsExcerpt(String(topic).trim()))
      .replace(/根據公開資料，近期與([^。]+?)議題相關。本文先整理[，、]?/g, (_, topic) => newsExcerpt(String(topic).trim()))
      .replace(/本文先整理[，、]?/g, "")
      .replace(/待審核|待核查|待查核|已發布待檢查/g, "追蹤中")
      .replace(/\s*[，,]\s*後續影響與資料(?:追蹤中)?/g, "")
      .replace(/道路議題整理/g, "道路議題")
      .replace(/議題整理/g, "議題")
      .replace(/議題議題/g, "議題")
      .replace(/追蹤中追蹤中/g, "追蹤中")
      .replace(/\s+([，。；：])/g, "$1")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function topicName(id) {
    const topics = window.PolicyPulseContent?.topics || [];
    return topics.find((topic) => topic.id === id)?.name || TAG_LABELS[String(id || "").toLowerCase()] || id || "政策";
  }

  function articleTitle(article) {
    return clean(article?.title)
      .replace(/\s*政策議題$/g, "政策")
      .replace(/\s*追蹤議題$/g, "議題")
      .replace(/\s+/g, " ")
      .trim();
  }

  function articleExcerpt(article) {
    const raw = clean(article?.summary);
    if (raw && !/(草稿|後台審核|發布前|待依來源補齊|需要補齊|待審核|待核查|待查核|資料待查核|根據自動抓取來源摘要|內容大綱|後續影響與資料|本文先整理)/.test(raw)) {
      return raw;
    }
    const topic = topicName(article?.topic) || topicFromText(articleTitle(article));
    return newsExcerpt(topic);
  }

  function cleanFactPair(fact, index) {
    const label = (value) => {
      const cleaned = clean(value).replace(/^[:：\s]+|[:：\s]+$/g, "");
      return cleaned || `重點 ${index + 1}`;
    };
    if (Array.isArray(fact)) {
      return [label(fact[0]), clean(fact[1]) || "可比對公開資料"];
    }
    if (fact && typeof fact === "object") {
      return [
        label(fact.label || fact.name),
        clean(fact.value || fact.text || fact.description) || "可比對公開資料",
      ];
    }
    return [`重點 ${index + 1}`, clean(fact) || "可比對公開資料"];
  }

  function renderDetailBody(article) {
    const fallback = "後續可觀察正式資料、議事紀錄與主管機關回應。";
    const facts = (article?.facts || []).map(cleanFactPair);
    const support = clean(article?.support) || fallback;
    const concern = clean(article?.concern) || fallback;
    const next = clean(article?.next) || fallback;
    const sources = (article?.sources || []).map(clean).filter(Boolean);
    return `
      <p class="detail-summary">${escapeHtml(articleExcerpt(article))}</p>
      <section class="detail-block">
        <h3>快速事實</h3>
        <ul>
          ${facts.map(([label, value]) => `<li><strong>${escapeHtml(label)}：</strong>${escapeHtml(value)}</li>`).join("")}
        </ul>
      </section>
      <section class="detail-block">
        <h3>支持方說法</h3>
        <p>${escapeHtml(support)}</p>
      </section>
      <section class="detail-block">
        <h3>疑慮與反對理由</h3>
        <p>${escapeHtml(concern)}</p>
      </section>
      <section class="detail-block">
        <h3>後續觀察</h3>
        <p>${escapeHtml(next)}</p>
      </section>
      <section class="detail-block">
        <h3>來源</h3>
        <div>${sources.map((source) => `<span class="source-pill">${escapeHtml(source)}</span>`).join("")}</div>
      </section>
    `;
  }

  function shouldSkip(node) {
    return node.parentElement?.closest("script, style, textarea, input, code, pre");
  }

  function cleanText(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      if (!shouldSkip(node)) {
        const cleaned = clean(node.nodeValue);
        if (cleaned !== node.nodeValue) node.nodeValue = cleaned;
      }
      node = walker.nextNode();
    }
  }

  function cleanAttributes(root) {
    root.querySelectorAll("[aria-label], [title], [alt]").forEach((element) => {
      ["aria-label", "title", "alt"].forEach((name) => {
        if (!element.hasAttribute(name)) return;
        const value = element.getAttribute(name);
        const cleaned = clean(value);
        if (cleaned !== value) element.setAttribute(name, cleaned);
      });
    });
  }

  function cleanMetadata() {
    document.title = clean(document.title);
    [
      'meta[name="description"]',
      'meta[property="og:title"]',
      'meta[property="og:description"]',
      'meta[name="twitter:title"]',
      'meta[name="twitter:description"]',
    ].forEach((selector) => {
      const meta = document.querySelector(selector);
      if (!meta) return;
      const value = meta.getAttribute("content") || "";
      const cleaned = clean(value);
      if (cleaned !== value) meta.setAttribute("content", cleaned);
    });

    const structuredData = document.querySelector("#articleStructuredData");
    if (structuredData?.textContent) {
      try {
        const data = JSON.parse(structuredData.textContent);
        if (data.headline) data.headline = clean(data.headline);
        if (data.description) data.description = clean(data.description);
        structuredData.textContent = JSON.stringify(data);
      } catch (_) {
        // Keep the visible cleanup path active even if structured data is malformed.
      }
    }
  }

  function fixBlankFactLabels(root) {
    root.querySelectorAll("#detailBody li strong, #articleRoot li strong").forEach((strong, index) => {
      const text = clean(strong.textContent || "").replace(/^[:：\s]+|[:：\s]+$/g, "");
      if (!text) strong.textContent = `重點 ${index + 1}：`;
    });
  }

  function syncSelectedShell() {
    const card =
      document.querySelector(".article-card.is-selected") ||
      document.querySelector(".headline-item.is-selected") ||
      document.querySelector(".article-card") ||
      document.querySelector(".headline-item");
    const cardTitle = clean(card?.querySelector("h3, strong")?.textContent || "");
    if (!cardTitle) return;
    const article = (window.PolicyPulseContent?.articles || []).find((item) => articleTitle(item) === cardTitle);

    const detailTitle = document.querySelector("#detailTitle");
    const featuredTitle = document.querySelector("#featuredStory h1");
    [detailTitle, featuredTitle].forEach((element) => {
      if (!element) return;
      const cleaned = clean(element.textContent || "");
      if (cleaned !== element.textContent) element.textContent = cleaned;
      if (/後續影響與資料/.test(element.textContent || "")) {
        element.textContent = cardTitle;
      }
    });

    if (article) {
      const title = articleTitle(article);
      if (detailTitle && detailTitle.textContent !== title) detailTitle.textContent = title;
      if (featuredTitle && featuredTitle.textContent !== title) featuredTitle.textContent = title;
      const featuredSummary = document.querySelector("#featuredStory .featured-overlay p");
      const summary = articleExcerpt(article);
      if (featuredSummary && featuredSummary.textContent !== summary) featuredSummary.textContent = summary;
      const detailBody = document.querySelector("#detailBody");
      if (detailBody) {
        const needsRewrite =
          detailBody.dataset.hotfixArticleId !== article.id ||
          /後續影響與資料|待查核|待核查|待審核|本文先整理|根據自動抓取來源摘要/.test(detailBody.textContent || "");
        if (needsRewrite) {
          detailBody.innerHTML = renderDetailBody(article);
          detailBody.dataset.hotfixArticleId = article.id;
        }
      }
    }
  }

  function run() {
    const root = document.body;
    if (!root) return;
    cleanText(root);
    cleanAttributes(root);
    cleanMetadata();
    fixBlankFactLabels(root);
    syncSelectedShell();
  }

  function start() {
    let scheduled = false;
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(() => {
        scheduled = false;
        run();
      });
    };

    schedule();
    new MutationObserver(schedule).observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["aria-label", "title", "alt"],
    });
    window.setTimeout(schedule, 800);
    window.setTimeout(schedule, 2500);
    window.setTimeout(schedule, 6000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
