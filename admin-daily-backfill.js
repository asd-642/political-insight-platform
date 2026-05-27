(function setupDailyDraftBackfill() {
  if (window.__policyPulseDailyBackfillLoaded) return;
  window.__policyPulseDailyBackfillLoaded = true;

  const state = {
    checked: false,
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
    if (!canCreate) return 0;

    let createdCount = 0;
    for (const [topic, keywords] of Object.entries(fallbackKeywords)) {
      const result = await api.createKeywordDrafts({
        topic,
        keywords: keywords.join("\n"),
        maxDrafts: keywords.length,
        sourceUrls: [],
      });
      createdCount += result.created?.length || 0;
    }
    return createdCount;
  }

  async function ensureClientBackfill() {
    if (hasTodayDrafts()) return;
    const createdCount = await createClientBackfillDrafts().catch(() => 0);
    if (!createdCount) return;
    if (typeof loadDrafts === "function") await loadDrafts();
    dailyDraftState.message = `伺服器每日產稿暫時失敗，已用後台補救建立 ${createdCount} 篇今天的待審草稿。`;
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
  scheduleBackfillCheck();
})();
