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
      .replace(/\s*[，,]\s*後續影響與(?:資料)?(?:待查核|追蹤中)?/g, "")
      .replace(/\s*後續影響與(?:資料)?(?:待查核|追蹤中)?/g, "")
      .replace(/根據公開資料，近期與([^。]+?)議題相關。本文先整理[，、]?主要爭點與後續觀察方向。?/g, (_, topic) => newsExcerpt(String(topic).trim()))
      .replace(/根據公開資料，近期與([^。]+?)議題相關。本文先整理[，、]?/g, (_, topic) => newsExcerpt(String(topic).trim()))
      .replace(/本文先整理[，、]?/g, "")
      .replace(/資料待查核|資料待比對|待比對/g, "")
      .replace(/待審核|待核查|待查核|已發布待檢查/g, "追蹤中")
      .replace(/\s*[，,]\s*後續影響與(?:資料)?(?:追蹤中)?/g, "")
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

  const HEADLINE_DIMENSIONS = {
    財經: "預算與執行進度成觀察重點",
    交通: "通勤成本與地方執行成觀察重點",
    居住: "租屋負擔與住宅供給成觀察重點",
    能源: "供電穩定與電網韌性成觀察重點",
    勞工: "薪資保障與企業成本成觀察重點",
    教育: "資源分配與校園執行成觀察重點",
    政策: "主管機關回應與執行進度成觀察重點",
  };

  const HEADLINE_SUBJECT_LABELS = {
    稅: "稅務政策",
    財政: "財政政策",
    投資: "投資政策",
    產業: "產業政策",
    公車: "公車服務",
    交通: "交通政策",
    道路: "道路建設",
    能源: "能源政策",
    供電: "供電穩定",
    住宅: "住宅政策",
    居住: "住宅政策",
    租屋: "租屋市場",
    勞工: "勞動政策",
    勞動: "勞動政策",
    最低工資: "最低工資調整",
    教育: "教育政策",
  };

  function inferHeadlineTopic(value) {
    const text = String(value || "");
    if (/稅|財政|投資|產業|財經/.test(text)) return "財經";
    if (/交通|公車|道路|通勤|月票|捷運|鐵路/.test(text)) return "交通";
    if (/住宅|居住|租屋|房租|社宅/.test(text)) return "居住";
    if (/能源|供電|電網|停電|儲能/.test(text)) return "能源";
    if (/勞工|勞動|薪資|最低工資/.test(text)) return "勞工";
    if (/教育|學校|校園|大學/.test(text)) return "教育";
    return "政策";
  }

  function publicHeadlineTitle(value, context = "") {
    const title = clean(value);
    if (!title || /[，。！？；：]/.test(title) || title.length > 18) return title;
    if (!/(議題|政策)$/.test(title)) return title;
    const subject = title
      .replace(/\s+/g, "")
      .replace(/(?:政策)?議題$/g, "")
      .replace(/政策$/g, "");
    if (!subject || subject === "政策") return title;
    const topic = inferHeadlineTopic(`${title} ${context}`);
    const label =
      HEADLINE_SUBJECT_LABELS[subject] ||
      `${subject}${/(政策|服務|建設|調整|市場|穩定)$/.test(subject) ? "" : "政策"}`;
    return `${label}受關注，${HEADLINE_DIMENSIONS[topic] || HEADLINE_DIMENSIONS["政策"]}`;
  }

  function rewriteVisibleHeadlines(root) {
    root
      .querySelectorAll("#featuredStory h1, #headlineList .headline-item strong, #articleGrid .article-card h3, #detailTitle, #articleRoot h1")
      .forEach((element) => {
        const context =
          element.closest(".article-card, .headline-item, #featuredStory, .detail-panel, #articleRoot")?.textContent || "";
        const rewritten = publicHeadlineTitle(element.textContent, context);
        if (rewritten && rewritten !== element.textContent.trim()) element.textContent = rewritten;
      });
  }

  function articleTitle(article) {
    return publicHeadlineTitle(clean(article?.title), `${topicName(article?.topic)} ${(article?.tags || []).join(" ")}`)
      .replace(/\s*政策議題$/g, "政策")
      .replace(/\s*追蹤議題$/g, "議題")
      .replace(/\s+/g, " ")
      .trim();
  }

  function articleExcerpt(article) {
    const raw = clean(article?.summary);
    if (raw && !/(草稿|後台審核|發布前|待依來源補齊|需要補齊|待審核|待核查|待查核|資料待查核|資料待比對|待比對|根據自動抓取來源摘要|內容大綱|後續影響與資料|本文先整理)/.test(raw)) {
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
    const [pageTitle, ...suffix] = clean(document.title).split("｜");
    document.title = [publicHeadlineTitle(pageTitle, document.body?.textContent || ""), ...suffix].filter(Boolean).join("｜");
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
      const cleaned = /title/i.test(selector) ? publicHeadlineTitle(value, document.body?.textContent || "") : clean(value);
      if (cleaned !== value) meta.setAttribute("content", cleaned);
    });

    const structuredData = document.querySelector("#articleStructuredData");
    if (structuredData?.textContent) {
      try {
        const data = JSON.parse(structuredData.textContent);
        if (data.headline) data.headline = publicHeadlineTitle(data.headline, document.body?.textContent || "");
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
          /後續影響與資料|待查核|待核查|待審核|待比對|本文先整理|根據自動抓取來源摘要/.test(detailBody.textContent || "");
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
    rewriteVisibleHeadlines(root);
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
