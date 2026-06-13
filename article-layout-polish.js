(function installArticleLayoutPolish() {
  const PLACEHOLDER_FACT_RE = /^(?:重點\s*\d*|第\s*\d+\s*點|重點|目前無資料|目前沒有資料|尚未整理|尚未確認|待補|待確認|待查核|待核查|[-—–]+)$/;
  const NARRATIVE_HEADINGS = new Set([
    "政策影響會落在哪裡",
    "支持方說法",
    "支持方說法怎麼讀",
    "疑慮與反對理由",
    "疑慮方會追什麼",
    "還不能下結論的部分",
    "接下來要看哪裡",
    "接下來要看的指標",
  ]);

  function cleanSourceLabel(value) {
    return String(value || "")
      .replace(/Google News 新聞搜尋摘要/g, "新聞搜尋摘要")
      .replace(/Google News/g, "新聞搜尋線索")
      .trim();
  }

  function textOf(element) {
    return String(element?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function unique(items) {
    return [...new Set(items.map((item) => String(item || "").trim()).filter(Boolean))];
  }

  function isPlaceholderText(value) {
    return PLACEHOLDER_FACT_RE.test(String(value || "").replace(/\s+/g, " ").trim());
  }

  function isEmptyFact(item) {
    const label = textOf(item.querySelector("strong"));
    const value = textOf(item.querySelector("span"));
    const all = textOf(item);
    if (!value || isPlaceholderText(value)) return true;
    if (isPlaceholderText(all)) return true;
    return isPlaceholderText(label) && label === value;
  }

  function ensureStyle() {
    if (document.querySelector("#articleLayoutPolishRuntimeStyle")) return;
    const style = document.createElement("style");
    style.id = "articleLayoutPolishRuntimeStyle";
    style.textContent = `
      .article-quick-box.is-empty,
      .article-side-card-generated.is-empty {
        display: none !important;
      }

      .article-source-trails {
        list-style: decimal;
        margin: 0;
        padding-left: 1.35rem;
        display: grid;
        gap: 0.85rem;
      }

      .article-source-trails li {
        line-height: 1.75;
        padding-left: 0.15rem;
        overflow-wrap: anywhere;
      }

      .source-trail-title {
        display: block;
        font-weight: 800;
      }

      .source-trail-meta {
        display: inline-block;
        margin-top: 0.25rem;
        color: var(--muted, #607080);
        font-size: 0.92rem;
      }

      .article-news-section.article-narrative-section {
        border-top: 1px solid var(--border, #d8d0c3);
        padding-top: 1.4rem;
      }

      .article-narrative-section p {
        margin: 0 0 1.1rem;
        line-height: 2;
      }

      .article-narrative-section p:last-child {
        margin-bottom: 0;
      }
    `;
    document.head.append(style);
  }

  function polishQuickFacts() {
    const box = document.querySelector(".article-quick-box");
    if (!box) return;

    let kept = 0;
    box.querySelectorAll("li").forEach((item) => {
      if (isEmptyFact(item)) {
        item.remove();
        return;
      }

      kept += 1;
      const strong = item.querySelector("strong");
      if (strong && isPlaceholderText(textOf(strong))) strong.textContent = `重點 ${kept}`;
    });

    if (!box.querySelector("li")) {
      box.classList.add("is-empty");
      box.remove();
    }
  }

  function splitSourceTrailText(value) {
    const text = String(value || "")
      .replace(/\s+/g, " ")
      .replace(/[；;。]\s*(?:新聞摘要|公開來源|本文會|文章會|這些資料|系統會|後續仍要).+$/g, "")
      .trim();
    if (!text) return [];

    const numbered = [];
    const pattern = /(?:^|[；;]\s*)\d+[.．、]\s*(.*?)(?=(?:[；;]\s*\d+[.．、])|$)/g;
    let match = pattern.exec(text);
    while (match) {
      numbered.push(cleanTrailItem(match[1]));
      match = pattern.exec(text);
    }
    if (numbered.length) return numbered.filter(Boolean);

    return text
      .split(/[；;]\s*/)
      .map(cleanTrailItem)
      .filter((item) => item.length > 5);
  }

  function cleanTrailItem(value) {
    return String(value || "")
      .replace(/[；;。]\s*(?:新聞摘要|公開來源|本文會|文章會|這些資料|系統會|後續仍要).+$/g, "")
      .replace(/[；;]\s*$/g, "")
      .trim();
  }

  function parseSourceTrail(item) {
    const match = String(item || "").match(/^(.*?)(?:\s*[-－—]\s*([^－—-]{2,40}))$/);
    if (!match) return { title: item, source: "" };
    return {
      title: match[1].trim(),
      source: match[2].trim(),
    };
  }

  function polishSourceTrailSection() {
    document.querySelectorAll(".article-news-section").forEach((section) => {
      if (section.dataset.sourceTrailPolished === "true") return;
      const heading = textOf(section.querySelector(".body-subhead"));
      if (!heading.includes("目前") || !heading.includes("線索")) return;

      const paragraphs = Array.from(section.querySelectorAll("p"));
      const items = splitSourceTrailText(paragraphs.map(textOf).join("；"));
      if (items.length < 2) return;

      const list = document.createElement("ol");
      list.className = "article-source-trails";
      items.forEach((item) => {
        const parsed = parseSourceTrail(item);
        const li = document.createElement("li");
        li.innerHTML = `
          <span class="source-trail-title">${escapeHtml(parsed.title)}</span>
          ${parsed.source ? `<span class="source-trail-meta">${escapeHtml(parsed.source)}</span>` : ""}
        `;
        list.append(li);
      });

      paragraphs.forEach((paragraph) => paragraph.remove());
      section.append(list);
      section.dataset.sourceTrailPolished = "true";
    });
  }

  function polishNarrativeSections() {
    const body = document.querySelector(".article-news-body");
    if (!body || body.querySelector(".article-narrative-section")) return;

    const sections = Array.from(body.querySelectorAll(".article-news-section"));
    const targets = sections.filter((section) => NARRATIVE_HEADINGS.has(textOf(section.querySelector(".body-subhead"))));
    if (targets.length < 2) return;

    const paragraphs = [];
    targets.forEach((section) => {
      const heading = textOf(section.querySelector(".body-subhead"));
      section.querySelectorAll("p").forEach((paragraph) => {
        const text = textOf(paragraph);
        if (!text || isPlaceholderText(text)) return;
        paragraphs.push({ heading, text });
      });
    });
    if (!paragraphs.length) return;

    const narrative = document.createElement("section");
    narrative.className = "article-news-section article-narrative-section";
    narrative.dataset.narrativePolished = "true";
    narrative.innerHTML = `
      <h2 class="body-subhead">本文怎麼讀</h2>
      ${paragraphs
        .map(({ heading, text }, index) => {
          const prefix = index === 0
            ? ""
            : heading.includes("支持")
              ? "支持方的說法可以這樣看："
              : heading.includes("疑慮")
                ? "疑慮方會追問的是："
                : heading.includes("下結論")
                  ? "因此目前還不能直接下結論："
                  : "";
          return `<p>${escapeHtml(prefix + text)}</p>`;
        })
        .join("")}
    `;

    targets[0].replaceWith(narrative);
    targets.slice(1).forEach((section) => section.remove());
  }

  function renderSideFacts() {
    const facts = Array.from(document.querySelectorAll(".article-quick-box li"))
      .filter((item) => !isEmptyFact(item))
      .slice(0, 3);
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
              return `<li><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></li>`;
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
          ${headings.map((heading) => `<li><span>${escapeHtml(heading)}</span></li>`).join("")}
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
          ${tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
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
    const generatedHtml = [renderSideFacts(), renderSideIndex(), renderSideTags()].join("");
    if (aside.dataset.generatedHtml === generatedHtml) return;
    aside.querySelectorAll(".article-side-card-generated").forEach((card) => card.remove());
    if (generatedHtml) aside.insertAdjacentHTML("beforeend", generatedHtml);
    aside.dataset.generatedHtml = generatedHtml;
  }

  function polishArticle() {
    ensureStyle();
    polishQuickFacts();
    polishSourceTrailSection();
    polishNarrativeSections();
    rebuildAside();
  }

  function start() {
    let scheduled = false;
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(() => {
        scheduled = false;
        polishArticle();
      });
    };

    schedule();
    const target = document.querySelector("#articleRoot") || document.body;
    new MutationObserver(schedule).observe(target, {
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
