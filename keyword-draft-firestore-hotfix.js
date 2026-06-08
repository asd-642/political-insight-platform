(function installKeywordDraftFirestoreHotfix() {
  const topicNames = {
    budget: "財經",
    housing: "居住",
    energy: "能源",
    transport: "交通",
    labor: "勞工",
    education: "教育",
  };

  function splitKeywords(input) {
    if (Array.isArray(input)) return input.map((item) => String(item).trim()).filter(Boolean);
    return String(input || "")
      .split(/[\n,，、]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function normalizeBlockedKeywords(input) {
    return [...new Set(splitKeywords(input).filter(Boolean).slice(0, 200))];
  }

  function collectText(value, parts = []) {
    if (value == null) return parts;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      parts.push(String(value));
      return parts;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => collectText(item, parts));
      return parts;
    }
    if (typeof value === "object") Object.values(value).forEach((item) => collectText(item, parts));
    return parts;
  }

  function findBlockedKeywords(value, blockedKeywords = []) {
    const text = collectText(value).join("\n").toLowerCase();
    return normalizeBlockedKeywords(blockedKeywords)
      .filter((keyword) => text.includes(keyword.toLowerCase()));
  }

  function safeDraftId(topic, keyword, date) {
    const cleanKeyword = String(keyword || "keyword")
      .replace(/[\\/#?[\]]+/g, "-")
      .replace(/\s+/g, "-")
      .slice(0, 42);
    return `${topic}-${cleanKeyword}-${date}`;
  }

  function taipeiDate(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${byType.year}-${byType.month}-${byType.day}`;
  }

  function reviewDisplayText(value) {
    return String(value || "")
      .replaceAll("待審草稿", "已發布待檢查文章")
      .replaceAll("草稿審核", "發布後檢查")
      .replaceAll("確認發布", "標記已檢查")
      .replaceAll("待審核", "待檢查");
  }

  function keywordDraftSections(keyword, topicName) {
    return [
      {
        heading: "背景脈絡",
        paragraphs: [
          `這篇文章先整理「${keyword}」在 ${topicName} 議題中的基本背景，讓讀者快速理解它為什麼值得追蹤。`,
          "內容會先以中性方式呈現，避免把尚未查證的說法寫成定論。",
        ],
      },
      {
        heading: "主要爭點",
        paragraphs: [
          `目前可先檢查 ${keyword} 涉及的主管機關、地方執行、預算來源與影響對象。`,
          "後續審稿時，應補上正式公告、會議紀錄、新聞來源或公開資料。",
        ],
      },
      {
        heading: "支持與疑慮",
        paragraphs: [
          "支持方通常會強調公共利益、效率或資源分配；疑慮方則可能關心成本、資料透明與執行公平。",
          "這些觀點需要分開呈現，避免讓文章變成單一立場的宣傳。",
        ],
      },
      {
        heading: "後續追蹤",
        paragraphs: [
          "審稿時可補上時間線、政策承諾、實際進度與受影響族群回應。",
          "若資料不足，應標示待補資料，或下架後重新整理。",
        ],
      },
    ];
  }

  function buildKeywordDraft({ keyword, topic, sourceUrls, now, timestamp, date }) {
    const topicName = topicNames[topic] || topic;
    const sourceList = sourceUrls.length ? sourceUrls : ["待補來源"];
    return {
      id: safeDraftId(topic, keyword, date),
      topic,
      topicName,
      title: `${keyword}政策追蹤：先整理重點，再回頭檢查`,
      status: "已發布待檢查",
      summary: `這篇文章根據「${keyword}」先建立可發布的政策追蹤骨架，之後可再補來源、修正內容或下架。`,
      image: "",
      imageMode: "generated",
      imagePrompt: `${topicName} policy newsroom cover about ${keyword}`,
      caption: `${topicName}議題追蹤示意圖`,
      updated: date,
      tags: [keyword, topicName, "追蹤中"],
      sources: sourceList,
      sourceLinks: sourceUrls,
      reviewChecklist: [
        "確認至少 2 個可查來源",
        "補上正式公告、會議紀錄或可信新聞來源",
        "確認重大指控沒有寫成既定事實",
        "檢查標題、摘要與內文是否一致",
      ],
      facts: [
        `影響對象：${keyword} 相關主管機關、地方執行單位與受影響民眾`,
        `主要爭點：${keyword} 相關政策影響與各方主張`,
        "追蹤狀態：已先公開，等待站長回頭檢查來源與細節",
      ],
      support: `支持方可能認為 ${keyword} 有助於改善資源分配、行政效率或公共服務。`,
      concern: `疑慮方可能關心 ${keyword} 的成本、執行落差、資料透明與問責機制。`,
      next: "後續應補上來源、時間線、預算與地方回應；若內容不正確，可直接下架或重寫。",
      sections: keywordDraftSections(keyword, topicName),
      published: true,
      createdAt: timestamp || now,
      updatedAt: timestamp || now,
      createdAtIso: now,
    };
  }

  function markDraftPublishedForReview(draft, now, timestamp) {
    return {
      ...draft,
      published: true,
      title: reviewDisplayText(draft.title || "未命名文章"),
      status: "已發布待檢查",
      summary: reviewDisplayText(draft.summary || ""),
      reviewStatus: "needsReview",
      publishedBeforeReview: true,
      publishedAt: draft.publishedAt || now,
      reviewedAt: "",
      updated: draft.updated || now.slice(0, 10),
      updatedAt: timestamp || now,
    };
  }

  function articleTimeline(article) {
    return {
      id: `timeline-${article.id}`,
      articleId: article.id,
      date: article.updated || new Date().toISOString().slice(0, 10),
      publishedAt: article.publishedAt || new Date().toISOString(),
      topic: article.topic,
      title: `${reviewDisplayText(article.title)} 更新`,
      description: reviewDisplayText(article.summary),
    };
  }

  async function install(api, firestoreModule) {
    if (!api?.ready || !api.db || !api.resolveAdminAccess) return;
    const db = api.db;
    const serverNow = () => firestoreModule.serverTimestamp();
    const reviewFileForArticle = (id) => `article:${id}`;

    async function requireAdmin() {
      if (await api.resolveAdminAccess()) return;
      throw new Error("需要管理員權限。");
    }

    api.createKeywordDrafts = async function createKeywordDraftsWithoutNestedArrays(options = {}) {
      await requireAdmin();
      const topic = String(options.topic || "budget");
      const sourceUrls = Array.isArray(options.sourceUrls)
        ? options.sourceUrls.map((item) => String(item).trim()).filter(Boolean)
        : [];
      const keywords = splitKeywords(options.keywords)
        .slice(0, Math.max(1, Math.min(Number(options.maxDrafts || 1), 5)));
      if (!keywords.length) throw new Error("請先輸入關鍵字。");

      const now = new Date().toISOString();
      const date = taipeiDate();
      const batch = firestoreModule.writeBatch(db);
      const created = [];
      const reports = [];
      const blockedKeywords = await api.getKeywordBlacklist?.().catch(() => []) || [];

      keywords.forEach((keyword) => {
        const draft = buildKeywordDraft({ keyword, topic, sourceUrls, now, timestamp: serverNow(), date });
        const blocked = findBlockedKeywords({ keyword, draft, sourceUrls }, blockedKeywords);
        const report = {
          keyword,
          topic,
          usedAI: false,
          sourceCount: sourceUrls.length,
          title: draft.title,
        };
        if (blocked.length) {
          reports.push({
            ...report,
            skipped: true,
            reason: "blockedKeyword",
            blockedKeywords: blocked,
          });
          return;
        }

        const article = markDraftPublishedForReview(draft, now, serverNow());
        batch.set(firestoreModule.doc(db, "articles", article.id), article, { merge: true });
        batch.set(firestoreModule.doc(db, "timeline", `timeline-${article.id}`), articleTimeline(article), { merge: true });
        created.push({
          file: reviewFileForArticle(article.id),
          id: article.id,
          title: article.title,
          topic,
          publishedBeforeReview: true,
          reviewStatus: "needsReview",
        });
        reports.push(report);
      });

      if (created.length) await batch.commit();
      return { created, reports };
    };
  }

  Promise.all([
    window.PolicyPulseFirebaseReady,
    import("https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js"),
  ])
    .then(([api, firestoreModule]) => install(api, firestoreModule))
    .catch((error) => {
      console.warn("Keyword draft Firestore hotfix failed", error);
    });
})();
