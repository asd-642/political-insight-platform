(function setupLocalPeopleDirectory() {
  const PEOPLE_PER_PAGE = 8;
  const directoryUrl = "content/local-politicians.json";
  let directoryPeople = [];
  let currentPage = 1;
  let renderTimer = 0;
  let rendering = false;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function compactLocalPersonId(value) {
    return String(value || "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[、，,]/g, "-");
  }

  function expandDirectory(directory = {}) {
    const groups = Array.isArray(directory.groups) ? directory.groups : [];
    const defaultTopicHints = Array.isArray(directory.defaultTopicHints)
      ? directory.defaultTopicHints
      : ["budget", "transport", "housing", "education"];
    const defaultFocus = directory.defaultFocus || "地方預算、交通、公共服務";

    return groups.flatMap((group, groupIndex) => {
      const names = Array.isArray(group.names) ? group.names : [];
      const area = group.area || "未分區";
      const role = group.role || "地方民代";
      const focus = group.focus || defaultFocus;
      const topicHints = Array.isArray(group.topicHints) && group.topicHints.length
        ? group.topicHints
        : defaultTopicHints;

      return names
        .map((name) => String(name || "").trim())
        .filter(Boolean)
        .map((name, nameIndex) => ({
          id: `local-${compactLocalPersonId(area)}-${compactLocalPersonId(name)}`,
          name,
          role,
          area,
          focus,
          stance: group.stance || "追蹤地方議會問政、預算審查與公共服務執行情形。",
          related: [],
          topicHints,
          directoryOrder: nameIndex * Math.max(1, groups.length) + groupIndex,
        }));
    }).sort((a, b) => a.directoryOrder - b.directoryOrder);
  }

  async function loadDirectory() {
    const response = await fetch(directoryUrl, { cache: "no-store" });
    if (!response.ok) throw new Error("local politician directory unavailable");
    const directory = await response.json();
    directoryPeople = expandDirectory(directory);
    if (window.PolicyPulseContent) {
      const existing = Array.isArray(window.PolicyPulseContent.people)
        ? window.PolicyPulseContent.people
        : [];
      const ids = new Set(directoryPeople.map((person) => person.id));
      window.PolicyPulseContent.people = [
        ...directoryPeople,
        ...existing.filter((person) => !ids.has(person?.id)),
      ];
    }
  }

  function getArticles() {
    return [
      ...(window.PolicyPulseContent?.articles || []),
      ...(window.PolicyPulseGeneratedContent?.articles || []),
    ].filter((article, index, articles) => article?.id && articles.findIndex((item) => item?.id === article.id) === index);
  }

  function articleMatchesPerson(article, person) {
    const personIds = Array.isArray(article.personIds) ? article.personIds : [];
    const people = Array.isArray(article.people) ? article.people : [];
    const context = article.personContext || {};
    return personIds.includes(person.id) ||
      people.some((item) => item?.id === person.id || item?.name === person.name) ||
      context.id === person.id ||
      context.name === person.name;
  }

  function relatedArticlesForPerson(person) {
    return getArticles().filter((article) => articleMatchesPerson(article, person));
  }

  function currentQuery() {
    return document.querySelector("#siteSearch")?.value?.trim().toLowerCase() || "";
  }

  function personMatchesQuery(person, query) {
    if (!query) return true;
    return [person.name, person.role, person.area, person.focus, person.stance]
      .some((value) => String(value || "").toLowerCase().includes(query));
  }

  function ensurePagination(container) {
    let pagination = document.querySelector("#peoplePagination");
    if (!pagination) {
      pagination = document.createElement("nav");
      pagination.id = "peoplePagination";
      pagination.className = "article-pagination people-pagination";
      pagination.setAttribute("aria-label", "人物分頁");
      container.after(pagination);
    }
    return pagination;
  }

  function renderPagination(totalItems, totalPages) {
    const container = document.querySelector("#peopleList");
    if (!container) return;
    const pagination = ensurePagination(container);
    if (totalPages <= 1) {
      pagination.innerHTML = "";
      return;
    }

    const pages = Array.from({ length: totalPages }, (_, index) => index + 1)
      .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1);
    const buttons = [];
    pages.forEach((page, index) => {
      if (index && page - pages[index - 1] > 1) {
        buttons.push('<span class="pagination-gap" aria-hidden="true">...</span>');
      }
      buttons.push(`
        <button class="pagination-page ${page === currentPage ? "is-active" : ""}" data-local-people-page="${page}" type="button" ${page === currentPage ? 'aria-current="page"' : ""}>
          ${page}
        </button>
      `);
    });

    const pageStart = (currentPage - 1) * PEOPLE_PER_PAGE + 1;
    const pageEnd = Math.min(totalItems, currentPage * PEOPLE_PER_PAGE);
    pagination.innerHTML = `
      <div class="pagination-summary">
        第 ${currentPage} / ${totalPages} 頁・顯示 ${pageStart}-${pageEnd} 位，共 ${totalItems} 位
      </div>
      <div class="pagination-controls">
        <button class="pagination-button" data-local-people-page="${currentPage - 1}" type="button" ${currentPage === 1 ? "disabled" : ""}>上一頁</button>
        ${buttons.join("")}
        <button class="pagination-button" data-local-people-page="${currentPage + 1}" type="button" ${currentPage === totalPages ? "disabled" : ""}>下一頁</button>
      </div>
    `;

    pagination.querySelectorAll("[data-local-people-page]").forEach((button) => {
      button.addEventListener("click", () => {
        const page = Number(button.dataset.localPeoplePage);
        if (!Number.isFinite(page) || page < 1 || page > totalPages || page === currentPage) return;
        currentPage = page;
        renderPeopleDirectory();
        container.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function renderPeopleDirectory() {
    const container = document.querySelector("#peopleList");
    if (!container || !directoryPeople.length) return;

    const query = currentQuery();
    const people = directoryPeople.filter((person) => personMatchesQuery(person, query));
    const totalPages = Math.max(1, Math.ceil(people.length / PEOPLE_PER_PAGE));
    currentPage = Math.min(Math.max(1, currentPage), totalPages);
    const pageStart = (currentPage - 1) * PEOPLE_PER_PAGE;
    const pageItems = people.slice(pageStart, pageStart + PEOPLE_PER_PAGE);

    rendering = true;
    container.dataset.localPoliticians = "active";
    container.innerHTML = "";

    if (!pageItems.length) {
      container.innerHTML = '<div class="empty-state">目前沒有符合條件的人物。</div>';
      renderPagination(people.length, totalPages);
      rendering = false;
      return;
    }

    pageItems.forEach((person) => {
      const relatedArticles = relatedArticlesForPerson(person);
      const relatedStatus = relatedArticles.length ? `${relatedArticles.length} 篇` : "待建立";
      const button = document.createElement("button");
      button.className = "person-card";
      button.type = "button";
      button.innerHTML = `
        <span class="card-kicker">
          <span>${escapeHtml(person.role)}</span>
          <span>${escapeHtml(person.area)}</span>
        </span>
        <h3>${escapeHtml(person.name)}</h3>
        <p>${escapeHtml(person.stance)}</p>
        <div class="person-meta">
          <span>關注議題<strong>${escapeHtml(person.focus)}</strong></span>
          <span>文章連結<strong>${escapeHtml(relatedStatus)}</strong></span>
        </div>
      `;
      button.addEventListener("click", () => showPersonDialog(person));
      container.append(button);
    });

    renderPagination(people.length, totalPages);
    rendering = false;
  }

  function articleUrl(article) {
    if (article?.url) return article.url;
    return `articles/${encodeURIComponent(article.id)}.html`;
  }

  function showPersonDialog(person) {
    const relatedArticles = relatedArticlesForPerson(person);
    document.querySelector("#personArticleDialog")?.remove();
    const dialog = document.createElement("section");
    dialog.id = "personArticleDialog";
    dialog.className = "modal-backdrop";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", `${person.name} 相關文章`);
    dialog.innerHTML = `
      <article class="related-dialog">
        <div class="related-head">
          <div>
            <p class="eyebrow">Related Articles</p>
            <h2>${escapeHtml(person.name)} 的相關文章</h2>
            <p>${escapeHtml(person.stance)}</p>
          </div>
          <button class="modal-close" type="button" aria-label="關閉">×</button>
        </div>
        <div class="related-list">
          ${
            relatedArticles.length
              ? relatedArticles.map((article) => `
                  <button class="related-row" data-article-url="${escapeHtml(articleUrl(article))}" type="button">
                    <time>${escapeHtml(article.updated || "")}</time>
                    <span>
                      <small>${escapeHtml(article.topicLabel || article.topic || "政策")}</small>
                      <strong>${escapeHtml(article.title)}</strong>
                      <em>${escapeHtml(article.summary || "")}</em>
                    </span>
                  </button>
                `).join("")
              : `<div class="empty-state">目前還沒有 ${escapeHtml(person.name)} 的關聯文章；之後每日產稿或新聞追蹤命中時，會自動掛到這裡。</div>`
          }
        </div>
      </article>
    `;
    document.body.append(dialog);
    dialog.querySelector(".modal-close")?.addEventListener("click", () => dialog.remove());
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.remove();
    });
    dialog.querySelectorAll(".related-row").forEach((row) => {
      row.addEventListener("click", () => {
        location.href = row.dataset.articleUrl;
      });
    });
  }

  function scheduleRender(delay = 0) {
    window.clearTimeout(renderTimer);
    renderTimer = window.setTimeout(renderPeopleDirectory, delay);
  }

  function bindRenderHooks() {
    document.querySelector("#siteSearch")?.addEventListener("input", () => {
      currentPage = 1;
      scheduleRender(60);
    });
    document.querySelectorAll('.nav-tab[data-view="people"]').forEach((button) => {
      button.addEventListener("click", () => scheduleRender(250));
    });
    const peopleList = document.querySelector("#peopleList");
    if (peopleList) {
      new MutationObserver(() => {
        if (!rendering && peopleList.dataset.localPoliticians !== "active") scheduleRender(60);
      }).observe(peopleList, { childList: true });
    }
  }

  async function boot() {
    if (!document.querySelector("#peopleList")) return;
    try {
      await loadDirectory();
      bindRenderHooks();
      scheduleRender(250);
      scheduleRender(1200);
    } catch {
      // Keep the original people page if the expanded directory cannot be loaded.
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
