(function installTimelineOrderHotfix() {
  const LIST_SELECTOR = "#timelineList";
  const ROW_SELECTOR = ".timeline-item";

  function parseDate(row) {
    const value = row.querySelector("time")?.textContent?.trim() || "";
    const time = Date.parse(value);
    return Number.isFinite(time) ? time : 0;
  }

  function rowTitle(row) {
    return row.querySelector("h3")?.textContent?.trim() || "";
  }

  function sortTimelineRows() {
    const list = document.querySelector(LIST_SELECTOR);
    if (!list || list.dataset.sortingTimeline === "true") return;

    const rows = Array.from(list.querySelectorAll(`:scope > ${ROW_SELECTOR}`));
    if (rows.length < 2) return;

    const sorted = [...rows].sort((a, b) => {
      const timeDiff = parseDate(b) - parseDate(a);
      if (timeDiff) return timeDiff;
      return rowTitle(b).localeCompare(rowTitle(a), "zh-Hant");
    });

    const alreadySorted = sorted.every((row, index) => row === rows[index]);
    if (alreadySorted) return;

    list.dataset.sortingTimeline = "true";
    sorted.forEach((row) => list.appendChild(row));
    delete list.dataset.sortingTimeline;
  }

  function scheduleSort() {
    window.requestAnimationFrame(sortTimelineRows);
  }

  function start() {
    const list = document.querySelector(LIST_SELECTOR);
    if (list) {
      const observer = new MutationObserver(scheduleSort);
      observer.observe(list, { childList: true });
    }
    document.addEventListener("click", scheduleSort);
    scheduleSort();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
