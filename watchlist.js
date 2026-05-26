(function setupPolicyPulseWatchlist() {
  const STORAGE_KEY = "policy_pulse_watchlist";
  const TOPIC_LABELS = {
    budget: "財經",
    housing: "居住",
    energy: "能源",
    transport: "交通",
    labor: "勞工",
    education: "教育",
  };
  let articlesCache = null;

  const unique = window.PolicyPulseUtils?.unique ||
    ((items = []) => [...new Set(items.map((item) => String(item || "").trim()).filter(Boolean))]);

  function escapeHtml(value) {
    return window.PolicyPulseUtils?.escapeHtml
      ? window.PolicyPulseUtils.escapeHtml(value)
      : String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
  }

  function read() {
    try {
      return unique(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
    } catch {
      return [];
    }
  }

  function write(items = []) {
    const next = unique(items);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    document.dispatchEvent(new CustomEvent("policy-watchlist-change", { detail: { watchlist: next } }));
    return next;
  }

  function articleUrl(id) {
    return window.PolicyPulseUtils?.articleUrl
      ? window.PolicyPulseUtils.articleUrl(id)
      : `/article.html?id=${encodeURIComponent(id)}`;
  }

  function findGeneratedArticles() {
    return [
      ...(window.PolicyPulseContent?.articles || []),
      ...(window.PolicyPulseGeneratedContent?.articles || []),
    ];
  }

  function normalizeArticle(article = {}) {
    if (!article?.id) return null;
    const topic = article.topic || "policy";
    return {
      ...article,
      path: article.path || articleUrl(article.id),
      topic,
      topicLabel: article.topicLabel || TOPIC_LABELS[topic] || topic || "政策",
      summary: article.summary || "",
    };
  }

  async function loadArticles() {
    if (articlesCache) return articlesCache;
    const generated = findGeneratedArticles();
    let remote = [];
    let prerendered = [];
    try {
      const response = await fetch("content/articles.json", { cache: "no-store" });
      if (response.ok) remote = (await response.json()).articles || [];
    } catch {
      remote = [];
    }
    try {
      const response = await fetch("content/prerendered-articles.json", { cache: "no-store" });
      if (response.ok) prerendered = (await response.json()).articles || [];
    } catch {
      prerendered = [];
    }
    const map = new Map();
    [...generated, ...remote, ...prerendered].forEach((article) => {
      const normalized = normalizeArticle(article);
      if (normalized?.id) map.set(normalized.id, { ...map.get(normalized.id), ...normalized });
    });
    articlesCache = [...map.values()];
    return articlesCache;
  }

  async function firebaseApi(timeoutMs = 1500) {
    const ready = window.PolicyPulseFirebaseReady || Promise.resolve(window.PolicyPulseFirebase);
    let timer;
    try {
      const timeout = new Promise((resolve) => {
        timer = window.setTimeout(() => resolve(null), timeoutMs);
      });
      const api = await Promise.race([ready, timeout]);
      return api?.enabled ? api : null;
    } catch {
      return null;
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function syncFromCloud() {
    const api = await firebaseApi();
    if (!api?.getCurrentUser?.() || !api?.getUserWatchlist) return read();
    try {
      const cloudList = await api.getUserWatchlist();
      return write([...read(), ...cloudList]);
    } catch {
      return read();
    }
  }

  async function syncToCloud(items = read()) {
    const api = await firebaseApi();
    if (!api?.getCurrentUser?.() || !api?.updateUserWatchlist) return;
    try {
      await api.updateUserWatchlist(items);
    } catch {
      // Local watchlist remains the source of truth when cloud sync is unavailable.
    }
  }

  function isFollowing(articleId) {
    return read().includes(articleId);
  }

  function updateFollowButton(button, following) {
    button.classList.toggle("is-following", following);
    button.setAttribute("aria-pressed", String(following));
    const icon = button.querySelector(".follow-icon");
    const text = button.querySelector(".follow-text");
    if (icon) icon.textContent = following ? "✓" : "+";
    if (text) text.textContent = following ? "已加入追蹤清單" : "追蹤此議題";
  }

  function initFollowButton(article) {
    const articleId = typeof article === "string" ? article : article?.id;
    const button = document.querySelector("#followArticleBtn");
    if (!articleId || !button) return;
    button.dataset.articleId = articleId;
    updateFollowButton(button, isFollowing(articleId));

    button.addEventListener("click", async () => {
      const current = read();
      const following = current.includes(articleId);
      if (following && !window.confirm("確定要將此議題從您的追蹤清單中移除嗎？")) return;

      const next = following
        ? current.filter((id) => id !== articleId)
        : [...current, articleId];
      write(next);
      updateFollowButton(button, !following);
      window.PolicyPulseStats?.record?.(following ? "article_unfollowed" : "article_followed", {
        id: articleId,
        title: article?.title || button.dataset.articleTitle || "",
      });
      await syncToCloud(next);
    });

    syncFromCloud().then((items) => updateFollowButton(button, items.includes(articleId)));
  }

  function renderEmpty(container) {
    container.innerHTML = `
      <div class="account-watchlist-empty">
        <strong>目前沒有追蹤項目</strong>
        <span>到任一文章頁點選「追蹤此議題」，之後會出現在這裡。</span>
      </div>
    `;
  }

  async function renderAccountWatchlist() {
    const container = document.querySelector("[data-account-watchlist]");
    if (!container) return;
    const ids = read();
    if (!ids.length) {
      renderEmpty(container);
      return;
    }

    const articles = await loadArticles();
    const articleMap = new Map(articles.map((article) => [article.id, article]));
    container.innerHTML = ids
      .map((id) => {
        const article = articleMap.get(id);
        if (!article) {
          return `
          <article class="account-watchlist-item account-watchlist-item-muted" data-watchlist-id="${escapeHtml(id)}">
            <div>
              <span>已失效</span>
              <strong>議題代碼：${escapeHtml(id)}</strong>
              <small>這個追蹤項目已被移出資料庫，或目前沒有對應的公開文章。</small>
            </div>
            <div class="account-watchlist-actions">
              <button data-watchlist-remove="${escapeHtml(id)}" type="button">解除追蹤</button>
            </div>
          </article>
        `;
        }
        return `
          <article class="account-watchlist-item" data-watchlist-id="${escapeHtml(id)}">
            <div>
              <span>${escapeHtml(article.topicLabel || article.topic || "政策")}</span>
              <strong>${escapeHtml(article.title || id)}</strong>
              <small>${escapeHtml(article.summary || "點擊閱讀此公共政策的完整脈絡。")}</small>
            </div>
            <div class="account-watchlist-actions">
              <a href="${escapeHtml(article.path || articleUrl(id))}">閱讀</a>
              <button data-watchlist-remove="${escapeHtml(id)}" type="button">移除</button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function initAccountWatchlist() {
    const container = document.querySelector("[data-account-watchlist]");
    if (!container) return;
    container.addEventListener("click", async (event) => {
      const removeButton = event.target.closest("[data-watchlist-remove]");
      if (!removeButton) return;
      const id = removeButton.dataset.watchlistRemove;
      const next = read().filter((item) => item !== id);
      write(next);
      window.PolicyPulseStats?.record?.("article_unfollowed", { id, from: "account" });
      await syncToCloud(next);
      await renderAccountWatchlist();
    });
    syncFromCloud().then(renderAccountWatchlist);
    document.addEventListener("policy-watchlist-change", renderAccountWatchlist);
  }

  window.PolicyPulseWatchlist = {
    read,
    write,
    isFollowing,
    syncFromCloud,
    syncToCloud,
    initFollowButton,
    renderAccountWatchlist,
  };

  initAccountWatchlist();
})();
