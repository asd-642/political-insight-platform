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

  function syncSelectedShell() {
    const card =
      document.querySelector(".article-card.is-selected") ||
      document.querySelector(".headline-item.is-selected") ||
      document.querySelector(".article-card") ||
      document.querySelector(".headline-item");
    const cardTitle = clean(card?.querySelector("h3, strong")?.textContent || "");
    if (!cardTitle) return;

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
  }

  function run() {
    const root = document.body;
    if (!root) return;
    cleanText(root);
    cleanAttributes(root);
    cleanMetadata();
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
