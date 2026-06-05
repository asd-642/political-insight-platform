(function installPublicUiStabilityFixes() {
  const TIMELINE_PAGE_SIZE = 8;
  const params = new URLSearchParams(window.location.search);
  const adsenseReviewMode = params.get("review") === "adsense";

  function injectStyle() {
    if (document.getElementById("policyPublicUiFixes")) return;

    const style = document.createElement("style");
    style.id = "policyPublicUiFixes";
    style.textContent = `
      .article-pagination:empty {
        display: none;
      }

      .timeline-pagination {
        margin-top: 22px;
      }

      .timeline-pagination .pagination-summary {
        flex-basis: 100%;
        color: var(--muted);
        font-size: 0.9rem;
        margin-bottom: 8px;
      }

      @media (min-width: 1241px) {
        .side-panel {
          max-height: calc(100vh - 104px);
          overflow-y: auto;
          padding-right: 2px;
          scrollbar-width: thin;
        }

        .side-panel::-webkit-scrollbar {
          width: 8px;
        }

        .side-panel::-webkit-scrollbar-thumb {
          background: var(--line-strong);
        }
      }

      @media (max-width: 1240px) {
        .side-panel {
          position: static;
          max-height: none;
          overflow: visible;
          padding-right: 0;
        }
      }

      @media (max-width: 900px) {
        .main-panel {
          order: 2;
        }

        .side-panel {
          order: 1;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .detail-panel {
          order: 3;
        }
      }

      @media (max-width: 560px) {
        .side-panel {
          grid-template-columns: 1fr;
        }
      }

      ${adsenseReviewMode ? "[data-promo-slot], .promo-slot { display: none !important; visibility: hidden !important; }" : ""}
    `;
    document.head.append(style);
  }

  function getTimelineList() {
    return document.querySelector("#timelineList");
  }

  function getTimelinePager(list) {
    let pager = document.querySelector("#timelinePagination");
    if (!pager && list) {
      pager = document.createElement("nav");
      pager.id = "timelinePagination";
      pager.className = "article-pagination timeline-pagination";
      pager.setAttribute("aria-label", "時間線分頁");
      list.after(pager);
    }
    return pager;
  }

  function buildPageNumbers(totalPages, currentPage) {
    const wanted = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
    const sorted = Array.from(wanted)
      .filter((page) => Number.isInteger(page) && page >= 1 && page <= totalPages)
      .sort((left, right) => left - right);

    const result = [];
    let previous = 0;
    sorted.forEach((page) => {
      if (previous && page - previous > 1) result.push("ellipsis");
      result.push(page);
      previous = page;
    });
    return result;
  }

  function installTimelinePagination() {
    const list = getTimelineList();
    if (!list || list.dataset.timelinePaginatorInstalled === "true") return;

    list.dataset.timelinePaginatorInstalled = "true";
    let currentPage = 1;
    let scheduledTimer = 0;

    function render(resetPage) {
      const items = Array.from(list.querySelectorAll(":scope > .timeline-item"));
      const pager = getTimelinePager(list);
      if (!pager) return;

      if (resetPage) currentPage = 1;

      if (items.length <= TIMELINE_PAGE_SIZE) {
        items.forEach((item) => {
          item.hidden = false;
        });
        pager.innerHTML = "";
        return;
      }

      const totalPages = Math.max(1, Math.ceil(items.length / TIMELINE_PAGE_SIZE));
      currentPage = Math.min(Math.max(1, currentPage), totalPages);
      const startIndex = (currentPage - 1) * TIMELINE_PAGE_SIZE;
      const endIndex = startIndex + TIMELINE_PAGE_SIZE;

      items.forEach((item, index) => {
        item.hidden = index < startIndex || index >= endIndex;
      });

      const startCount = startIndex + 1;
      const endCount = Math.min(endIndex, items.length);
      const pageButtons = buildPageNumbers(totalPages, currentPage)
        .map((page, index) => {
          if (page === "ellipsis") {
            return `<span class="page-ellipsis" aria-hidden="true" data-gap="${index}">...</span>`;
          }
          const active = page === currentPage ? " active" : "";
          const current = page === currentPage ? " aria-current=\"page\"" : "";
          return `<button type="button" class="page-button${active}" data-timeline-page="${page}"${current}>${page}</button>`;
        })
        .join("");

      pager.innerHTML = `
        <div class="pagination-summary">第 ${currentPage} / ${totalPages} 頁，顯示 ${startCount}-${endCount} 則，共 ${items.length} 則</div>
        <button type="button" class="page-button" data-timeline-page="${currentPage - 1}" ${currentPage === 1 ? "disabled" : ""}>上一頁</button>
        ${pageButtons}
        <button type="button" class="page-button" data-timeline-page="${currentPage + 1}" ${currentPage === totalPages ? "disabled" : ""}>下一頁</button>
      `;

      pager.querySelectorAll("[data-timeline-page]").forEach((button) => {
        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          const nextPage = Number(button.getAttribute("data-timeline-page"));
          if (!Number.isFinite(nextPage) || nextPage === currentPage) return;
          currentPage = nextPage;
          render(false);
          list.scrollIntoView({ block: "start", behavior: "smooth" });
        });
      });
    }

    function schedule(resetPage) {
      window.clearTimeout(scheduledTimer);
      scheduledTimer = window.setTimeout(() => render(resetPage), 40);
    }

    new MutationObserver(() => schedule(true)).observe(list, { childList: true });

    document.addEventListener("click", (event) => {
      if (event.target.closest(".nav-tab, .filter-chip, .issue-card, .related-timeline, [data-view='timeline']")) {
        schedule(true);
      }
    });

    document.querySelector("#siteSearch")?.addEventListener("input", () => schedule(true));
    schedule(true);
  }

  function init() {
    injectStyle();
    installTimelinePagination();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.addEventListener("load", init);
})();
