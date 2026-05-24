(function setupDailyDraftBackfill() {
  if (typeof dailyDraftState !== "undefined" && "autoBackfillChecked" in dailyDraftState) return;

  const state = {
    checked: false,
  };

  function taipeiDate(date = new Date()) {
    if (window.PolicyPulseUtils?.taipeiDate) return window.PolicyPulseUtils.taipeiDate(date);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${byType.year}-${byType.month}-${byType.day}`;
  }

  function hasTodayRun() {
    return dailyDraftState?.status?.latest?.date === taipeiDate();
  }

  function hasReviewableDrafts() {
    return Array.isArray(draftState?.items) && draftState.items.length > 0;
  }

  function reschedule() {
    window.setTimeout(maybeBackfill, 1500);
  }

  async function maybeBackfill() {
    if (state.checked) return;
    if (typeof hasAdminAccess !== "function" || !hasAdminAccess()) return;
    if (draftState?.loading || dailyDraftState?.loading) {
      reschedule();
      return;
    }

    state.checked = true;
    try {
      if (!dailyDraftState.status && typeof loadDailyDraftStatus === "function") {
        await loadDailyDraftStatus();
      }
    } catch {
      // The regular admin status panel will show the actionable error.
    }

    if (hasTodayRun() || hasReviewableDrafts() || dailyDraftState?.loading || draftState?.loading) return;

    dailyDraftState.message = "今天還沒有自動產稿，正在幫你補跑一次。";
    if (typeof renderDailyDraftStatus === "function") renderDailyDraftStatus();

    if (typeof runDailyDraftsNow === "function") {
      await runDailyDraftsNow();
    }
  }

  function scheduleBackfillCheck() {
    window.setTimeout(maybeBackfill, 2500);
    window.setTimeout(maybeBackfill, 8000);
  }

  document.addEventListener("policy-auth-change", scheduleBackfillCheck);
  document.addEventListener("DOMContentLoaded", scheduleBackfillCheck);
  scheduleBackfillCheck();
})();
