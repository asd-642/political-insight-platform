(function setupDailyDraftBackfill() {
  if (window.__policyPulseDailyBackfillLoaded) return;
  window.__policyPulseDailyBackfillLoaded = true;

  const state = {
    checked: false,
    manualBackfill: false,
    firestoreModule: null,
  };

  const topicNames = {
    budget: "財經",
    housing: "居住",
    energy: "能源",
    transport: "交通",
    labor: "勞工",
    education: "教育",
  };

  const fallbackKeywords = {
    budget: ["預算", "財政"],
    housing: ["居住", "租屋"],
    energy: ["能源", "電價"],
    transport: ["交通", "公車"],
    labor: ["勞工", "薪資"],
    education: ["教育", "校園"],
  };

  function normalizeFactForAdmin(fact, index) {
    if (Array.isArray(fact)) return [fact[0] || `重點 ${index + 1}`, fact[1] || ""];
    if (fact && typeof fact === "object") {
      return [
        fact.label || fact.name || `重點 ${index + 1}`,
        fact.value || fact.text || fact.description || "",
      ];
    }
    return [`重點 ${index + 1}`, fact || ""];
  }

  function normalizeDraftForAdmin(draft) {
    if (!draft || typeof draft !== "object") return draft;
    return {
      ...draft,
      facts: Array.isArray(draft.facts) ? draft.facts.map(normalizeFactForAdmin) : [],
    };
  }

  async function patchDraftListForAdmin() {
    const api = await window.PolicyPulseFirebaseReady;
    if (!api?.listDrafts || api.__policyPulseDraftFactPatch) return;
    const originalListDrafts = api.listDrafts.bind(api);
    api.listDrafts = async (...args) => {
      const drafts = await originalListDrafts(...args);
      return Array.isArray(drafts) ? drafts.map(normalizeDraftForAdmin) : drafts;
    };
    api.__policyPulseDraftFactPatch = true;

    window.setTimeout(() => {
      const queueText = document.querySelector("#draftReviewQueue")?.textContent || "";
      if (queueText.includes("[object Object]") && typeof loadDrafts === "function") {
        loadDrafts();
      }
    }, 800);
  }

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

  function safeDraftId(topic, keyword, date) {
    const cleanKeyword = String(keyword || "keyword")
      .replace(/[\\/#?[\]]+/g, "-")
      .replace(/\s+/g, "-")
      .slice(0, 42);
    return `${topic}-${cleanKeyword}-${date}`;
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

  async function loadFirestoreModule() {
    if (!state.firestoreModule) {
      state.firestoreModule = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js");
    }
    return state.firestoreModule;
  }

  function buildBackfillDraft({ topic, keyword, date, now }) {
    const topicName = topicNames[topic] || topic;
    return {
      id: safeDraftId(topic, keyword, date),
      topic,
      topicName,
      title: `${keyword}議題整理，後續影響與資料待查核`,
      status: "待審核",
      summary: `根據關鍵字「${keyword}」建立待審草稿，先整理影響對象、主要爭點與後續需要補充的資料。`,
      image: "",
      imageMode: "generated",
      imagePrompt: `${topicName} policy newsroom cover about ${keyword}`,
      caption: `${topicName}議題示意圖。`,
      updated: date,
      tags: [keyword, topicName, "待查核"],
      sources: ["後台補救草稿"],
      sourceLinks: [],
      reviewChecklist: [
        "確認至少 2 個可查來源",
        "補足事件背景、支持方、疑慮方與後續追蹤",
        "檢查是否有未查證指控或過度判斷",
      ],
      facts: [
        { label: "影響對象", value: "待依來源確認" },
        { label: "核心爭點", value: `${keyword}相關政策影響與各方主張` },
        { label: "觀察指標", value: "正式公告、預算、執行進度、地方回應" },
      ],
      support: `支持方可能認為，處理「${keyword}」有助於改善公共服務或補足制度缺口。`,
      concern: `疑慮方可能關注「${keyword}」背後的程序透明、成本負擔、地方執行能力或資訊不足。`,
      next: "補上原始公告、第二來源、時間線與相關人員說法後，再決定是否發布。",
      sections: [
        {
          heading: "事件背景",
          paragraphs: `這篇草稿聚焦「${keyword}」相關政策與公共議題，先建立可審核的文章骨架。`,
        },
        {
          heading: "目前可整理的重點",
          paragraphs: `「${keyword}」需要確認正式公告、政策主張、預算期程與責任單位。`,
        },
        {
          heading: "後續追蹤方向",
          paragraphs: "後續可以追蹤正式公告、議會質詢、主管機關新聞稿、預算書與地方政府回應。",
        },
      ],
      published: false,
      createdAtIso: now,
    };
  }

  async function createClientBackfillDrafts() {
    const api = await window.PolicyPulseFirebaseReady;
    const canCreate = api?.enabled
      && api?.db
      && api?.getCurrentUser?.()
      && api?.isAdmin?.();
    if (!canCreate) {
      throw new Error("目前的登入狀態無法用瀏覽器端補建草稿，請重新登入管理員帳號後再按一次。");
    }

    const firestore = await loadFirestoreModule();
    const batch = firestore.writeBatch(api.db);
    const now = new Date().toISOString();
    const date = taipeiDate();
    const drafts = [];

    for (const [topic, keywords] of Object.entries(fallbackKeywords)) {
      for (const keyword of keywords) {
        const draft = buildBackfillDraft({ topic, keyword, date, now });
        batch.set(firestore.doc(api.db, "drafts", draft.id), {
          ...draft,
          createdAt: firestore.serverTimestamp(),
          updatedAt: firestore.serverTimestamp(),
        }, { merge: true });
        drafts.push(draft);
      }
    }

    await batch.commit();
    return { createdCount: drafts.length, errors: [] };
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
  patchDraftListForAdmin().catch(() => {});
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
