(function installTimelineOrderHotfix() {
  const LIST_SELECTOR = "#timelineList";
  const ROW_SELECTOR = ".timeline-item";
  const RETRY_DELAYS = [0, 50, 150, 400, 900, 1600];
  let observer = null;
  let timer = 0;

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
    window.clearTimeout(timer);
    timer = window.setTimeout(sortTimelineRows, 0);
    window.requestAnimationFrame(sortTimelineRows);
  }

  function scheduleRetrySorts() {
    RETRY_DELAYS.forEach((delay) => {
      window.setTimeout(sortTimelineRows, delay);
    });
  }

  function start() {
    const list = document.querySelector(LIST_SELECTOR);
    if (list) {
      observer = new MutationObserver(scheduleSort);
      observer.observe(list, { childList: true });
    }
    document.addEventListener("click", scheduleRetrySorts, true);
    window.PolicyPulseTimelineOrderHotfix = {
      sort: sortTimelineRows,
      schedule: scheduleRetrySorts,
      observer,
    };
    scheduleRetrySorts();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
