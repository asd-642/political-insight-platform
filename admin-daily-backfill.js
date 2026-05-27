(function setupDailyDraftBackfill() {
  if (window.__policyPulseDailyBackfillLoaded) return;
  window.__policyPulseDailyBackfillLoaded = true;

  const state = {
    checked: false,
    manualBackfill: false,
  };

  const fallbackKeywords = {
    budget: ["預算", "財政"],
    housing: ["居住", "租屋"],
    energy: ["能源", "電價"],
    transport: ["交通", "公車"],
    labor: ["勞工", "薪資"],
    education: ["教育", "校園"],
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

  function draftDate(item = {}) {
    const fields = [item.updated, item.createdAtIso, item.updatedAt, item.createdAt, item.id, item.file];
    for (const field of fields) {
      const match = String(field || "").match(/\d{4}-\d{2}-\d{2}/);
      if (match) return match[0];
    }
    return "";
  }

  function hasTodayDrafts() {
    const today = taipeiDate();
    return Array.isArray(draftState?.items) && draftState.items.some((item) => draftDate(item) === today);
  }

  async function createClientBackfillDrafts() {
    const api = await window.PolicyPulseFirebaseReady;
    const canCreate = api?.enabled
      && api?.getCurrentUser?.()
      && api?.isAdmin?.()
      && typeof api.createKeywordDrafts === "function";
    if (!canCreate) {
      throw new Error("目前的登入狀態無法用瀏覽器端補建草稿，請重新登入管理員帳號後再按一次。");
    }

    let createdCount = 0;
    const errors = [];
    for (const [topic, keywords] of Object.entries(fallbackKeywords)) {
      try {
        const result = await api.createKeywordDrafts({
          topic,
          keywords: keywords.join("\n"),
          maxDrafts: keywords.length,
          sourceUrls: [],
        });
        createdCount += result.created?.length || 0;
      } catch (error) {
        errors.push(`${topic}: ${error.message || "建立失敗"}`);
      }
    }
    return { createdCount, errors };
  }

  async function ensureClientBackfill({ manual = false } = {}) {
    if (hasTodayDrafts()) return;
    dailyDraftState.message = "伺服器設定暫時壞掉，正在改用管理員登入權限補建今天草稿。";
    dailyDraftState.error = "";
    if (typeof renderDailyDraftStatus === "function") renderDailyDraftStatus();

    let result;
    try {
      result = await createClientBackfillDrafts();
    } catch (error) {
      dailyDraftState.error = error.message || "瀏覽器端補建草稿失敗。";
      dailyDraftState.message = "";
      if (typeof renderDailyDraftStatus === "function") renderDailyDraftStatus();
      return;
    }

    const createdCount = result.createdCount || 0;
    if (typeof loadDrafts === "function") await loadDrafts();

    if (!createdCount && !hasTodayDrafts()) {
      dailyDraftState.error = result.errors?.length
        ? `後台補救產稿也失敗：${result.errors.join("；")}`
        : "後台補救沒有建立新草稿，請重新登入管理員帳號後再按一次「補跑今日產稿」。";
      dailyDraftState.message = "";
      if (typeof renderDailyDraftStatus === "function") renderDailyDraftStatus();
      return;
    }

    dailyDraftState.message = createdCount
      ? `伺服器每日產稿暫時失敗，已用後台補救建立 ${createdCount} 篇今天的待審草稿。`
      : "今天的待審草稿已存在，草稿列表已重新整理。";
    dailyDraftState.error = "";
    dailyDraftState.status = {
      ok: true,
      schedule: { taipei: "每天 06:30" },
      configured: dailyDraftState.status?.configured || {},
      latest: {
        date: taipeiDate(),
        createdCount,
        skippedCount: 0,
        finishedAt: new Date().toISOString(),
        fallback: true,
      },
    };
    if (typeof renderDailyDraftStatus === "function") renderDailyDraftStatus();
    if (manual) document.querySelector("#draftReviewQueue")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function waitForIdle() {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      if (!dailyDraftState?.loading && !draftState?.loading) return;
      await new Promise((resolve) => window.setTimeout(resolve, 500));
    }
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

    if (hasTodayRun() || hasTodayDrafts() || dailyDraftState?.loading || draftState?.loading) return;

    dailyDraftState.message = "今天還沒有自動產稿，正在幫你補跑一次。";
    if (typeof renderDailyDraftStatus === "function") renderDailyDraftStatus();

    if (typeof runDailyDraftsNow === "function") {
      await runDailyDraftsNow();
    }
    await ensureClientBackfill();
  }

  function scheduleBackfillCheck() {
    window.setTimeout(maybeBackfill, 2500);
    window.setTimeout(maybeBackfill, 8000);
  }

  document.addEventListener("policy-auth-change", scheduleBackfillCheck);
  document.addEventListener("DOMContentLoaded", scheduleBackfillCheck);
  document.addEventListener("click", (event) => {
    if (!event.target.closest?.("#runDailyDraftsNow")) return;
    if (state.manualBackfill) return;
    state.manualBackfill = true;
    window.setTimeout(async () => {
      await waitForIdle();
      await ensureClientBackfill({ manual: true });
      state.manualBackfill = false;
    }, 800);
  });
  scheduleBackfillCheck();
})();
