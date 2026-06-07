(function installArticleLayoutPolish() {
  function cleanSourceLabel(value) {
    return String(value || "")
      .replace(/Google News 新聞搜尋摘要/g, "新聞搜尋摘要")
      .replace(/Google News/g, "新聞搜尋線索")
      .trim();
  }

  function textOf(element) {
    return String(element?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function unique(items) {
    return [...new Set(items.map((item) => String(item || "").trim()).filter(Boolean))];
  }

  function renderSideFacts() {
    const facts = Array.from(document.querySelectorAll(".article-quick-box li")).slice(0, 3);
    if (!facts.length) return "";
    return `
      <section class="article-side-card article-side-card-generated">
        <p class="eyebrow">Quick Scan</p>
        <h2>快速摘要</h2>
        <ul class="article-side-list">
          ${facts
            .map((item) => {
              const label = textOf(item.querySelector("strong")) || "重點";
              const value = textOf(item.querySelector("span")) || textOf(item);
              return `<li><strong>${label}</strong><span>${value}</span></li>`;
            })
            .join("")}
        </ul>
      </section>
    `;
  }

  function renderSideIndex() {
    const headings = unique(
      Array.from(document.querySelectorAll(".article-news-body .body-subhead"))
        .map(textOf)
        .filter(Boolean),
    ).slice(0, 6);
    if (!headings.length) return "";
    return `
      <section class="article-side-card article-side-card-generated">
        <p class="eyebrow">Index</p>
        <h2>文章索引</h2>
        <ul class="article-side-sources">
          ${headings.map((heading) => `<li><span>${heading}</span></li>`).join("")}
        </ul>
      </section>
    `;
  }

  function renderSideTags() {
    const tags = unique(Array.from(document.querySelectorAll(".article-footer-meta .tag")).map(textOf)).slice(0, 10);
    if (!tags.length) return "";
    return `
      <section class="article-side-card article-side-card-generated">
        <p class="eyebrow">Tags</p>
        <h2>相關標籤</h2>
        <div class="article-side-tags">
          ${tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}
        </div>
      </section>
    `;
  }

  function polishMeta() {
    document.querySelectorAll(".news-meta span, .article-source-item small, .article-source-item strong").forEach((item) => {
      const cleaned = cleanSourceLabel(textOf(item));
      if (cleaned && cleaned !== textOf(item)) item.textContent = cleaned;
    });
  }

  function rebuildAside() {
    const aside = document.querySelector(".article-aside");
    if (!aside) return;
    polishMeta();
    aside.querySelectorAll(".article-side-card-generated").forEach((card) => card.remove());
    aside.insertAdjacentHTML("beforeend", [renderSideFacts(), renderSideIndex(), renderSideTags()].join(""));
  }

  function start() {
    let scheduled = false;
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(() => {
        scheduled = false;
        rebuildAside();
      });
    };

    schedule();
    new MutationObserver(schedule).observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    window.setTimeout(schedule, 800);
    window.setTimeout(schedule, 2500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
