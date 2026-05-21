function articleEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getArticleId() {
  const queryId = new URLSearchParams(location.search).get("id");
  if (queryId) return queryId;
  const match = decodeURIComponent(location.pathname).match(/\/articles\/([^/]+)\.html$/);
  return match?.[1] || "";
}

function articlePageUrl(id) {
  return `articles/${encodeURIComponent(id)}.html`;
}

function currentContent() {
  return window.PolicyPulseContent || {};
}

function findArticle(id) {
  return (currentContent().articles || []).find((article) => article.id === id);
}

function findTopicName(id) {
  return (currentContent().topics || []).find((topic) => topic.id === id)?.name || id;
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  return [value];
}

function normalizeFacts(article) {
  return normalizeList(article.facts).map((fact, index) => {
    if (Array.isArray(fact)) return [fact[0] || `重點 ${index + 1}`, fact[1] || ""];
    if (typeof fact === "object") {
      return [fact.label || fact.name || `重點 ${index + 1}`, fact.value || fact.text || ""];
    }
    return [`重點 ${index + 1}`, fact];
  });
}

function joinOrFallback(items, fallback) {
  const text = normalizeList(items).join("、").trim();
  return text || fallback;
}

function enrichArticleSections(article, sections, topic) {
  const facts = normalizeFacts(article);
  const factText = facts
    .map(([label, value]) => `${label}：${value}`)
    .filter((item) => item.trim() !== "：")
    .join("；");
  const tags = joinOrFallback(article.tags, topic);
  const sources = joinOrFallback(article.sources, "公開資料、會議紀錄與後續新聞追蹤");
  const updated = article.updated || "尚未標示日期";

  const enriched = sections.map((section, index) => {
    const paragraphs = normalizeList(section.paragraphs)
      .map((paragraph) => String(paragraph).trim())
      .filter(Boolean);
    if (paragraphs.length < 2) {
      paragraphs.push(
        `這一段後續會再比對來源資料、時間序列與相關單位說法，避免只停留在單一訊息。對讀者來說，重點不是先判斷誰對誰錯，而是先確認這項議題的事實基礎是否足夠清楚。`,
      );
    }
    return {
      heading: section.heading || `段落 ${index + 1}`,
      paragraphs,
    };
  });

  const additions = [
    {
      heading: "影響範圍與利害關係人",
      paragraphs: [
        `這項議題的影響不只落在單一主管機關，也可能牽動民眾、地方政府、產業或第一線執行人員。若政策涉及經費、補助、採購或公共服務，後續就要看哪些群體會直接受益，哪些群體可能承擔成本。`,
        `目前可先從「${tags}」這幾個關鍵字切入，檢查相關政策是否有清楚列出適用對象、排除條件與申請或執行流程。若這些條件不明確，政策容易在實施階段產生爭議。`,
      ],
    },
    {
      heading: "主管機關需要說明的問題",
      paragraphs: [
        `後續最需要釐清的是責任分工。政策若跨越中央與地方，或牽涉多個部會，讀者應該能看見誰負責編列預算、誰負責執行、誰負責查核，以及出現落差時由誰回應。`,
        `若官方說法只強調政策目標，卻沒有提供預算來源、執行期程、績效指標與公開回報機制，這篇文章就會持續標示為追蹤中，直到資料足以支撐較完整的判斷。`,
      ],
    },
    {
      heading: "資料查核清單",
      paragraphs: [
        factText
          ? `目前已整理的查核基準包括：${factText}。這些項目可以用來對照後續公告、質詢紀錄與執行報告，確認說法是否前後一致。`
          : "目前仍缺少可直接比對的查核基準。後續需要補上正式公告、會議紀錄、預算表、統計資料與主管機關回應，才能避免文章只停留在概括描述。",
        `資料來源目前包括：${sources}。之後若同一議題出現新的正式文件、地方回應或統計更新，會優先補到本文，並同步放進時間線。`,
      ],
    },
    {
      heading: "讀者可以怎麼判斷",
      paragraphs: [
        "閱讀政策新聞時，可以先問三個問題：第一，政策要解決的問題是否被具體描述；第二，提出的工具是否真的對應問題；第三，後續是否有可被外界檢查的指標。",
        `以本文來說，更新時間是 ${updated}，代表目前呈現的是截至該時間點的整理。若後續出現新資料，舊有判斷可能需要調整，因此本文會保留追蹤與修正空間。`,
      ],
    },
    {
      heading: "後續追蹤方向",
      paragraphs: [
        article.next || "本站接下來會補齊正式文件、關鍵數字、時程與相關人員說法，並把後續更新串回事件時間線。",
        "如果這項議題進入審查、發包、補助申請、地方執行或成效檢討階段，文章會優先更新時間點、責任單位與可量化指標，讓讀者能看見政策從宣示到落地的完整過程。",
      ],
    },
  ];

  const existingHeadings = new Set(enriched.map((section) => section.heading));
  additions.forEach((section) => {
    if (enriched.length >= 8 || existingHeadings.has(section.heading)) return;
    enriched.push(section);
    existingHeadings.add(section.heading);
  });

  return enriched;
}

function normalizeBodySections(article, topic) {
  if (Array.isArray(article.sections) && article.sections.length) {
    return enrichArticleSections(article, article.sections.map((section, index) => ({
      heading: section.heading || section.title || `段落 ${index + 1}`,
      paragraphs: normalizeList(section.paragraphs || section.body || section.content),
    })), topic);
  }

  if (Array.isArray(article.body) && article.body.length) {
    return enrichArticleSections(article, article.body.map((section, index) => {
      if (typeof section === "string") {
        return { heading: "", paragraphs: [section] };
      }
      return {
        heading: section.heading || section.title || `段落 ${index + 1}`,
        paragraphs: normalizeList(section.paragraphs || section.body || section.content),
      };
    }), topic);
  }

  if (typeof article.body === "string" && article.body.trim()) {
    return enrichArticleSections(article, [
      {
        heading: "",
        paragraphs: article.body
          .split(/\n{2,}/)
          .map((paragraph) => paragraph.trim())
          .filter(Boolean),
      },
    ], topic);
  }

  const facts = normalizeFacts(article);
  const factText = facts
    .map(([label, value]) => `${label}：${value}`)
    .filter((item) => item.trim() !== "：")
    .join("；");
  const tags = joinOrFallback(article.tags, topic);
  const sources = joinOrFallback(article.sources, "公開資料、會議紀錄與後續新聞追蹤");
  const updated = article.updated || "尚未標示日期";
  const status = article.status || "追蹤中";

  return enrichArticleSections(article, [
    {
      heading: "事件背景",
      paragraphs: [
        `這篇整理聚焦「${article.title}」。目前條目狀態為「${status}」，最後更新時間是 ${updated}。它被歸在「${topic}」議題下，代表後續觀察不只看單一新聞標題，也會看預算、制度、地方執行與利害關係人的反應。`,
        article.summary || `本站目前正在補齊「${article.title}」的摘要與資料鏈。這一頁先保留分析框架，方便之後把來源、時序與支持反對理由補進來。`,
      ],
    },
    {
      heading: "為什麼值得追蹤",
      paragraphs: [
        "這類政策議題通常會同時影響民眾、地方政府、執行單位與產業部門。表面上看是單一政策更新，實際上牽涉的是資源如何分配、責任如何切分，以及資訊是否足以讓外界判斷政策成效。",
        "若只看發布當下的說法，容易忽略後續執行落差。本站會把「宣布了什麼」、「誰會受到影響」、「有沒有配套」、「下一步能否被驗證」拆開處理，避免把立場判斷和事實整理混在一起。",
      ],
    },
    {
      heading: "目前可確認的重點",
      paragraphs: [
        factText
          ? `從目前整理到的資料看，幾個需要先放在前面的重點包括：${factText}。這些資訊還不是最後結論，而是後續比較不同說法時的基準。`
          : "目前仍缺少可直接比對的數字與正式文件。後續若取得預算書、會議紀錄、公告或主管機關說明，會優先補到這一段。",
        `目前標籤集中在「${tags}」。這些標籤可以協助讀者快速判斷文章和哪些公共議題相連，也方便後台之後自動分類與建立相關文章。`,
      ],
    },
    {
      heading: "支持方說法",
      paragraphs: [
        article.support || "支持方的理由尚待補充。後續會把支持理由拆成政策目的、預期效果、受益對象與可驗證指標，避免只留下口號式說法。",
        "若支持方主張政策能改善公共服務或資源分配，下一步就需要看執行期程、經費來源、績效指標與責任單位是否清楚。這些條件越明確，越容易讓外界追蹤政策是否真的推進。",
      ],
    },
    {
      heading: "疑慮與反對理由",
      paragraphs: [
        article.concern || "疑慮方的理由尚待補充。後續會把反對意見分成財務負擔、執行風險、公平性問題與資訊不足幾類。",
        "反對或保留意見不一定代表完全否定政策，有時是在提醒配套不足、成本估算不清、或地方執行能力跟不上。這些疑慮若沒有被回應，政策即使通過，也可能在落地階段出現新的爭議。",
      ],
    },
    {
      heading: "接下來要看的指標",
      paragraphs: [
        article.next || "本站接下來會補齊正式文件、關鍵數字、時程與相關人員說法，並把後續更新串回事件時間線。",
        `目前主要來源包括：${sources}。未來若同一議題出現新公告、質詢紀錄、統計資料或地方回應，會優先更新在這篇文章與時間線中。`,
      ],
    },
  ], topic);
}

function findRelatedArticles(article) {
  const tags = new Set(normalizeList(article.tags));
  return (currentContent().articles || [])
    .filter((item) => item.id !== article.id)
    .map((item) => {
      const sharedTags = normalizeList(item.tags).filter((tag) => tags.has(tag)).length;
      const topicScore = item.topic === article.topic ? 2 : 0;
      return { item, score: sharedTags + topicScore };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || String(b.item.updated || "").localeCompare(String(a.item.updated || "")))
    .slice(0, 4)
    .map(({ item }) => item);
}

function renderMissing() {
  document.querySelector("#articleRoot").innerHTML = `
    <article class="article-news-card">
      <p class="eyebrow">Not Found</p>
      <h1 class="news-title">找不到這篇文章</h1>
      <p class="article-lead">這篇文章可能已移除，或網址中的 id 不正確。</p>
      <a class="article-back" href="index.html">回到首頁</a>
    </article>
  `;
}

function renderInlineAd(label = "In-article / 728 x 90") {
  return `
    <aside class="promo-slot article-inline-ad" data-promo-slot aria-label="文章內廣告版位">
      <span>廣告版位</span>
      <strong>${articleEscape(label)}</strong>
    </aside>
  `;
}

function renderBodySections(sections) {
  return sections
    .map((section, index) => {
      const heading = section.heading
        ? `<h2 class="body-subhead">${articleEscape(section.heading)}</h2>`
        : "";
      const paragraphs = normalizeList(section.paragraphs)
        .map((paragraph) => `<p>${articleEscape(paragraph)}</p>`)
        .join("");
      return `
        <section class="article-news-section">
          ${heading}
          ${paragraphs}
        </section>
        ${index === 1 ? renderInlineAd() : ""}
      `;
    })
    .join("");
}

function renderRelatedArticles(article) {
  const related = findRelatedArticles(article);
  if (!related.length) return "";

  return `
    <section class="article-related">
      <h2>延伸閱讀</h2>
      ${related
        .map(
          (item) => `
            <a class="related-link" href="${articleEscape(articlePageUrl(item.id))}">
              <span>${articleEscape(findTopicName(item.topic))}</span>
              <strong>${articleEscape(item.title)}</strong>
            </a>
          `,
        )
        .join("")}
    </section>
  `;
}

const COMMENT_STORAGE_PREFIX = "policyPulseComments:";
let activeCommentArticleId = "";
const COMMENT_FIREBASE_WAIT_MS = 1200;
let activeReplyCommentId = "";
let activeReportCommentId = "";
let activeArticleComments = [];
const expandedCommentIds = new Set();
const reportReasons = [
  { id: "minor_safety", label: "涉及未滿 18 歲用戶的問題" },
  { id: "bullying", label: "霸凌、騷擾或虐待" },
  { id: "self_harm", label: "自殺或自我傷害" },
  { id: "violence_hate", label: "暴力、仇恨或擾人內容" },
  { id: "regulated_goods", label: "販售或推廣管制商品" },
  { id: "adult_content", label: "成人內容" },
  { id: "scam_false", label: "詐騙、詐欺或不實資訊" },
  { id: "intellectual_property", label: "智慧財產權" },
  { id: "not_interested", label: "我不想看到這個內容" },
];

function getCommentStorageKey(articleId) {
  return `${COMMENT_STORAGE_PREFIX}${articleId}`;
}

function readLocalComments(articleId) {
  try {
    return JSON.parse(localStorage.getItem(getCommentStorageKey(articleId))) || [];
  } catch {
    return [];
  }
}

function writeLocalComments(articleId, comments) {
  localStorage.setItem(getCommentStorageKey(articleId), JSON.stringify(comments.slice(-200)));
}

function getCommentSession() {
  const firebaseUser = window.PolicyPulseFirebase?.getCurrentUser?.();
  if (firebaseUser) {
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email || "",
      name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "會員",
      provider: "firebase",
    };
  }
  const session = window.PolicyPulseAuth?.getSession?.();
  if (!session) return null;
  return {
    uid: session.uid || session.email || "local-user",
    email: session.email || "",
    name: session.email?.split("@")[0] || "會員",
    provider: "local",
  };
}

function withCommentTimeout(promise, timeoutMs, fallback = null) {
  if (!promise || typeof promise.then !== "function") return Promise.resolve(promise);
  let timer;
  const timeout = new Promise((resolve) => {
    timer = window.setTimeout(() => resolve(fallback), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timer));
}

async function getCommentFirebaseApi() {
  try {
    const api = await withCommentTimeout(window.PolicyPulseFirebaseReady, COMMENT_FIREBASE_WAIT_MS, null);
    return api?.enabled ? api : null;
  } catch {
    return null;
  }
}

async function loadArticleComments(articleId) {
  const localComments = readLocalComments(articleId).filter((comment) => comment.status !== "hidden");
  const api = await getCommentFirebaseApi();
  if (api?.listComments) {
    try {
      const remoteComments = await api.listComments(articleId);
      const merged = new Map();
      [...remoteComments, ...localComments].forEach((comment) => merged.set(comment.id, comment));
      return [...merged.values()];
    } catch {
      return localComments;
    }
  }
  return localComments;
}

async function saveArticleComment(articleId, body, parentId = "") {
  const session = getCommentSession();
  if (!session) throw new Error("請先登入後再留言。");

  const cleanBody = String(body || "").replace(/\s+/g, " ").trim();
  if (cleanBody.length < 2) throw new Error("留言內容太短。");
  if (cleanBody.length > 1000) throw new Error("留言最多 1000 個字。");

  const api = await getCommentFirebaseApi();
  if (api?.addComment && api?.getCurrentUser?.()) {
    try {
      return await api.addComment(articleId, cleanBody, parentId);
    } catch (error) {
      if (!String(error?.code || error?.message || "").includes("permission")) {
        throw error;
      }
      // Firestore rules may not be published yet. Keep the comment visible locally instead of losing it.
    }
  }

  const comment = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    articleId,
    parentId,
    body: cleanBody,
    uid: session.uid,
    authorName: session.name,
    authorEmail: session.email,
    status: "visible",
    reactions: {},
    createdAtIso: new Date().toISOString(),
    localOnly: true,
  };
  const comments = readLocalComments(articleId);
  comments.push(comment);
  writeLocalComments(articleId, comments);
  return comment;
}

function toggleLocalCommentReaction(articleId, commentId, reaction) {
  const session = getCommentSession();
  if (!session) throw new Error("請先登入後再點讚。");
  const comments = readLocalComments(articleId).map((comment) => {
    if (comment.id !== commentId) return comment;
    const reactions = { ...(comment.reactions || {}) };
    if (reactions[session.uid] === reaction) {
      delete reactions[session.uid];
    } else {
      reactions[session.uid] = reaction;
    }
    return { ...comment, reactions };
  });
  writeLocalComments(articleId, comments);
}

function reportLocalComment(articleId, commentId, reason = "member_report") {
  const session = getCommentSession();
  if (!session) throw new Error("請先登入後再檢舉留言。");
  const comments = readLocalComments(articleId).map((comment) => {
    if (comment.id !== commentId) return comment;
    const reports = { ...(comment.reports || {}) };
    reports[session.uid] = {
      reason,
      createdAtIso: new Date().toISOString(),
    };
    return {
      ...comment,
      reports,
      reportReason: reason,
      reportCount: Object.keys(reports).length,
      reportedAt: new Date().toISOString(),
    };
  });
  writeLocalComments(articleId, comments);
}

async function toggleCommentReaction(articleId, commentId, reaction) {
  const session = getCommentSession();
  if (!session) throw new Error("請先登入後再點讚。");
  const api = await getCommentFirebaseApi();
  if (api?.toggleCommentReaction && api?.getCurrentUser?.() && !String(commentId).startsWith("local-")) {
    try {
      await api.toggleCommentReaction(commentId, reaction);
      return;
    } catch (error) {
      if (!String(error?.code || error?.message || "").includes("permission")) {
        throw error;
      }
    }
  }
  toggleLocalCommentReaction(articleId, commentId, reaction);
}

async function reportComment(articleId, commentId, reason = "member_report") {
  const session = getCommentSession();
  if (!session) throw new Error("請先登入後再檢舉留言。");
  const api = await getCommentFirebaseApi();
  if (api?.reportComment && api?.getCurrentUser?.() && !String(commentId).startsWith("local-")) {
    try {
      await api.reportComment(commentId, reason);
      return;
    } catch (error) {
      if (!String(error?.code || error?.message || "").includes("permission")) {
        throw error;
      }
    }
  }
  reportLocalComment(articleId, commentId, reason);
}

function formatCommentTime(value) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("zh-Hant-TW", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function commentInitial(name = "") {
  const text = String(name || "會員").trim();
  return text.slice(0, 1).toUpperCase() || "會";
}

function normalizedComments(comments) {
  const session = getCommentSession();
  return comments
    .filter((comment) => comment?.id && comment.status !== "hidden")
    .map((comment) => ({
      ...comment,
      parentId: comment.parentId || "",
      reactions: comment.reactions || {},
      reports: comment.reports || {},
      likeCount: Number(comment.likeCount || 0),
      dislikeCount: Number(comment.dislikeCount || 0),
      reportCount: Number(comment.reportCount || Object.keys(comment.reports || {}).length || 0),
      viewerReaction: comment.viewerReaction || "",
      viewerReported: Boolean(comment.viewerReported || (session && comment.reports?.[session.uid])),
      reportReason: comment.reportReason || "",
      createdAtIso: comment.createdAtIso || comment.createdAt || "",
    }));
}

function reactionSummary(comment, session) {
  const reactions = comment.reactions || {};
  const localValues = Object.values(reactions);
  return {
    likes: comment.likeCount || localValues.filter((value) => value === "like").length,
    dislikes: comment.dislikeCount || localValues.filter((value) => value === "dislike").length,
    viewerReaction: comment.viewerReaction || (session ? reactions[session.uid] || "" : ""),
  };
}

function buildCommentTree(comments) {
  const map = new Map();
  const roots = [];
  normalizedComments(comments).forEach((comment) => {
    map.set(comment.id, { ...comment, children: [] });
  });
  map.forEach((comment) => {
    const parent = map.get(comment.parentId);
    if (comment.parentId && parent && comment.parentId !== comment.id) {
      parent.children.push(comment);
    } else {
      roots.push(comment);
    }
  });

  const sortTree = (items) => {
    items.sort((a, b) => String(a.createdAtIso).localeCompare(String(b.createdAtIso)));
    items.forEach((item) => sortTree(item.children));
  };
  sortTree(roots);
  return roots;
}

function countReplies(comment) {
  return comment.children.reduce((total, child) => total + 1 + countReplies(child), 0);
}

function renderReplyForm(comment, session) {
  if (!session || activeReplyCommentId !== comment.id) return "";
  return `
    <form class="comment-reply-form" data-parent-id="${articleEscape(comment.id)}">
      <textarea
        name="reply"
        maxlength="1000"
        rows="3"
        placeholder="回覆 ${articleEscape(comment.authorName || "會員")}"
      ></textarea>
      <div class="comment-actions">
        <button class="admin-button primary" type="submit">送出回覆</button>
        <button class="admin-button" data-cancel-reply type="button">取消</button>
      </div>
    </form>
  `;
}

function renderReportPanel(comment, session) {
  if (!session || activeReportCommentId !== comment.id) return "";
  return `
    <section class="comment-report-panel" data-report-panel="${articleEscape(comment.id)}">
      <div class="comment-report-head">
        <strong>你為何要檢舉這則留言？</strong>
        <span>如果有人立即的人身安全疑慮，請先尋求協助；本站會把檢舉交由管理員審核。</span>
      </div>
      <div class="comment-report-options">
        ${reportReasons
          .map((reason) => `
            <button class="comment-report-option" data-report-reason="${articleEscape(reason.id)}" type="button">
              <span>${articleEscape(reason.label)}</span>
              <span aria-hidden="true">›</span>
            </button>
          `)
          .join("")}
      </div>
      <button class="comment-tool" data-cancel-report type="button">取消</button>
    </section>
  `;
}

function renderCommentNode(comment, session, depth = 0) {
  const replyCount = countReplies(comment);
  const repliesOpen = expandedCommentIds.has(comment.id);
  const summary = reactionSummary(comment, session);
  const disabled = session ? "" : "disabled";
  const author = comment.authorName || comment.authorEmail || "會員";
  return `
    <article class="comment-card ${depth ? "is-reply" : ""}" data-comment-id="${articleEscape(comment.id)}">
      <div class="comment-avatar" aria-hidden="true">${articleEscape(commentInitial(author))}</div>
      <div class="comment-content">
        <div class="comment-meta">
          <strong>${articleEscape(author)}</strong>
          <time>${articleEscape(formatCommentTime(comment.createdAtIso || comment.createdAt))}</time>
          ${comment.localOnly ? `<span class="comment-local-note">本機暫存</span>` : ""}
        </div>
        <p>${articleEscape(comment.body)}</p>
        <div class="comment-tools">
          <button class="comment-tool" data-reply-comment="${articleEscape(comment.id)}" type="button" ${disabled}>
            回覆
          </button>
          <button
            class="comment-tool comment-report ${comment.viewerReported ? "is-active" : ""}"
            data-report-comment="${articleEscape(comment.id)}"
            type="button"
            ${disabled}
          >
            ${comment.viewerReported ? "已檢舉" : "檢舉"}
          </button>
          <button
            class="comment-reaction ${summary.viewerReaction === "like" ? "is-active" : ""}"
            data-comment-id="${articleEscape(comment.id)}"
            data-comment-reaction="like"
            type="button"
            ${disabled}
          >
            <span class="reaction-symbol" aria-hidden="true">${summary.viewerReaction === "like" ? "♥" : "♡"}</span>
            <span>${summary.likes}</span>
          </button>
        </div>
        ${renderReplyForm(comment, session)}
        ${renderReportPanel(comment, session)}
        ${
          replyCount
            ? `<button class="comment-reply-toggle" data-toggle-replies="${articleEscape(comment.id)}" type="button">
                ${repliesOpen ? "收合" : "展開"} ${replyCount} 則回覆
              </button>`
            : ""
        }
        ${
          replyCount && repliesOpen
            ? `<div class="comment-replies">${comment.children
                .map((child) => renderCommentNode(child, session, depth + 1))
                .join("")}</div>`
            : ""
        }
      </div>
    </article>
  `;
}

function renderCommentsShell(article) {
  return `
    <section id="articleComments" class="article-comments" data-article-id="${articleEscape(article.id)}">
      <div class="comment-head">
        <p class="eyebrow">Comments</p>
        <h2>留言討論</h2>
      </div>
      <div id="commentPanel" class="comment-panel"></div>
    </section>
  `;
}

function renderCommentPanel(articleId, comments = [], message = "", isError = false) {
  const panel = document.querySelector("#commentPanel");
  if (!panel) return;

  activeArticleComments = comments;
  const session = getCommentSession();
  const canComment = Boolean(session);
  const tree = buildCommentTree(comments);
  const rows = tree.length
    ? tree.map((comment) => renderCommentNode(comment, session)).join("")
    : `<div class="comment-empty">目前還沒有留言，登入後可以先留下你的看法。</div>`;

  panel.innerHTML = `
    <form id="commentForm" class="comment-form">
      <label for="commentBody">
        <span>${canComment ? `以 ${articleEscape(session.email || session.name)} 留言` : "登入後可以留言"}</span>
        <textarea
          id="commentBody"
          name="body"
          maxlength="1000"
          rows="4"
          placeholder="留下補充資料、疑問或不同角度。請避免人身攻擊與未證實指控。"
          ${canComment ? "" : "disabled"}
        ></textarea>
      </label>
      <div class="comment-actions">
        <p class="comment-status ${isError ? "is-error" : ""}" id="commentStatus">${articleEscape(message)}</p>
        <button class="admin-button primary" type="submit" ${canComment ? "" : "disabled"}>送出留言</button>
      </div>
    </form>
    <div id="commentList" class="comment-list">
      ${rows}
    </div>
  `;

  document.querySelector("#commentForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const textarea = event.currentTarget.querySelector("#commentBody");
    const submit = event.currentTarget.querySelector("button");
    const status = event.currentTarget.querySelector("#commentStatus");
    submit.disabled = true;
    status.classList.remove("is-error");
    status.textContent = "正在送出留言...";
    try {
      const saved = await saveArticleComment(articleId, textarea.value);
      textarea.value = "";
      window.PolicyPulseStats?.record("comment_create", { articleId });
      await refreshArticleComments(
        articleId,
        saved?.localOnly ? "留言已暫存在本機。Firebase 規則發布後會改為線上保存。" : "留言已送出。",
      );
    } catch (error) {
      status.classList.add("is-error");
      status.textContent = error.message;
      submit.disabled = false;
    }
  });

  panel.querySelectorAll(".comment-reply-form").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const parentId = form.dataset.parentId || "";
      const textarea = form.querySelector("textarea");
      const submit = form.querySelector("button");
      submit.disabled = true;
      try {
        const saved = await saveArticleComment(articleId, textarea.value, parentId);
        expandedCommentIds.add(parentId);
        activeReplyCommentId = "";
        window.PolicyPulseStats?.record("comment_reply", { articleId, parentId });
        await refreshArticleComments(
          articleId,
          saved?.localOnly ? "回覆已暫存在本機。Firebase 規則發布後會改為線上保存。" : "回覆已送出。",
        );
      } catch (error) {
        renderCommentPanel(articleId, activeArticleComments, error.message, true);
      }
    });
  });

  panel.onclick = async (event) => {
    const replyTarget = event.target.closest("[data-reply-comment]");
    const cancelReply = event.target.closest("[data-cancel-reply]");
    const toggleReplies = event.target.closest("[data-toggle-replies]");
    const reactionTarget = event.target.closest("[data-comment-reaction]");
    const reportTarget = event.target.closest("[data-report-comment]");
    const reportReasonTarget = event.target.closest("[data-report-reason]");
    const cancelReport = event.target.closest("[data-cancel-report]");

    if (replyTarget) {
      activeReplyCommentId = replyTarget.dataset.replyComment;
      expandedCommentIds.add(activeReplyCommentId);
      renderCommentPanel(articleId, activeArticleComments);
      return;
    }

    if (cancelReply) {
      activeReplyCommentId = "";
      renderCommentPanel(articleId, activeArticleComments);
      return;
    }

    if (cancelReport) {
      activeReportCommentId = "";
      renderCommentPanel(articleId, activeArticleComments);
      return;
    }

    if (toggleReplies) {
      const id = toggleReplies.dataset.toggleReplies;
      if (expandedCommentIds.has(id)) {
        expandedCommentIds.delete(id);
      } else {
        expandedCommentIds.add(id);
      }
      renderCommentPanel(articleId, activeArticleComments);
      return;
    }

    if (reactionTarget) {
      try {
        await toggleCommentReaction(
          articleId,
          reactionTarget.dataset.commentId,
          reactionTarget.dataset.commentReaction,
        );
        window.PolicyPulseStats?.record("comment_reaction", {
          articleId,
          reaction: reactionTarget.dataset.commentReaction,
        });
        await refreshArticleComments(articleId);
      } catch (error) {
        renderCommentPanel(articleId, activeArticleComments, error.message, true);
      }
      return;
    }

    if (reportTarget) {
      activeReportCommentId = reportTarget.dataset.reportComment;
      renderCommentPanel(articleId, activeArticleComments);
      return;
    }

    if (reportReasonTarget) {
      try {
        const panelNode = reportReasonTarget.closest("[data-report-panel]");
        const commentId = panelNode?.dataset.reportPanel || activeReportCommentId;
        await reportComment(articleId, commentId, reportReasonTarget.dataset.reportReason);
        activeReportCommentId = "";
        window.PolicyPulseStats?.record("comment_report", { articleId });
        await refreshArticleComments(articleId, "已收到檢舉，管理員會在後台審核。");
      } catch (error) {
        renderCommentPanel(articleId, activeArticleComments, error.message, true);
      }
    }
  };
}

async function refreshArticleComments(articleId, message = "") {
  renderCommentPanel(articleId, [], "正在讀取留言...");
  try {
    const comments = await loadArticleComments(articleId);
    renderCommentPanel(articleId, comments, message);
  } catch (error) {
    renderCommentPanel(articleId, [], error.message, true);
  }
}

function initArticleComments(article) {
  activeCommentArticleId = article.id;
  refreshArticleComments(article.id);
}

function articleVisual(article, topic) {
  return window.PolicyPulseVisuals?.articleImage?.(article, topic) || article.image || "assets/podium.png";
}

function upsertMeta(selector, attrs) {
  let node = document.head.querySelector(selector);
  if (!node) {
    node = document.createElement(attrs.tag || "meta");
    document.head.append(node);
  }
  Object.entries(attrs).forEach(([key, value]) => {
    if (key !== "tag") node.setAttribute(key, value);
  });
}

function updateArticleSeo(article, topic, image) {
  const url = new URL(location.href);
  const description = article.summary || `${article.title}｜政策脈絡整理`;
  const baseUrl = document.baseURI || location.href;
  const imageUrl = image && !String(image).startsWith("data:")
    ? new URL(image, baseUrl).href
    : new URL("assets/podium.png", baseUrl).href;

  upsertMeta('link[rel="canonical"]', { tag: "link", rel: "canonical", href: url.href });
  upsertMeta('meta[property="og:title"]', { property: "og:title", content: article.title });
  upsertMeta('meta[property="og:description"]', { property: "og:description", content: description });
  upsertMeta('meta[property="og:type"]', { property: "og:type", content: "article" });
  upsertMeta('meta[property="og:url"]', { property: "og:url", content: url.href });
  upsertMeta('meta[property="og:image"]', { property: "og:image", content: imageUrl });

  let schema = document.querySelector("#articleStructuredData");
  if (!schema) {
    schema = document.createElement("script");
    schema.id = "articleStructuredData";
    schema.type = "application/ld+json";
    document.head.append(schema);
  }
  schema.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description,
    image: [imageUrl],
    datePublished: article.publishedAt || article.updated || new Date().toISOString(),
    dateModified: article.updated || article.publishedAt || new Date().toISOString(),
    articleSection: topic,
    author: { "@type": "Organization", name: "政策脈絡" },
    publisher: {
      "@type": "Organization",
      name: "政策脈絡",
      logo: { "@type": "ImageObject", url: new URL("assets/podium.png", baseUrl).href },
    },
    mainEntityOfPage: url.href,
  });
}

function renderArticle(article) {
  document.title = `${article.title}｜政策脈絡`;
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute("content", article.summary || article.title);

  const topic = findTopicName(article.topic);
  const facts = normalizeFacts(article);
  const sections = normalizeBodySections(article, topic);
  const sources = normalizeList(article.sources);
  const sourceLabel = sources[0] || "政策脈絡";
  const image = articleVisual(article, topic);
  const caption = article.caption || `${topic}議題示意圖。本站以公開資料與後續追蹤整理政策脈絡。`;
  updateArticleSeo(article, topic, image);

  document.querySelector("#articleRoot").innerHTML = `
    <article class="article-news-card">
      <header class="article-news-head">
        <div class="article-kicker-line">
          <span class="topic-badge">${articleEscape(topic)}</span>
          <span>${articleEscape(article.status || "追蹤中")}</span>
        </div>
        <h1 class="news-title">${articleEscape(article.title)}</h1>
        <div class="article-actions-bar">
          <button
            id="followArticleBtn"
            class="follow-btn"
            type="button"
            data-article-id="${articleEscape(article.id)}"
            data-article-title="${articleEscape(article.title)}"
            aria-pressed="false"
          >
            <span class="follow-icon" aria-hidden="true">+</span>
            <span class="follow-text">追蹤此議題</span>
          </button>
        </div>
        <div class="news-meta">
          <span>${articleEscape(sourceLabel)}</span>
          <span>更新時間 ${articleEscape(article.updated || "尚未標示")}</span>
          <span>政策脈絡整理</span>
        </div>
      </header>

      <figure class="article-media">
        <img src="${articleEscape(image)}" alt="${articleEscape(topic)}議題文章封面" decoding="async" fetchpriority="high" />
        <figcaption>${articleEscape(caption)}</figcaption>
      </figure>

      <p class="article-lead">${articleEscape(article.summary || "本文整理議題背景、支持與疑慮、後續觀察指標。")}</p>

      <section class="article-quick-box">
        <h2>重點摘要</h2>
        <ul>
          ${facts
            .map(
              ([label, value]) => `
                <li>
                  <strong>${articleEscape(label)}</strong>
                  <span>${articleEscape(value)}</span>
                </li>
              `,
            )
            .join("")}
        </ul>
      </section>

      <section class="article-news-body">
        ${renderBodySections(sections)}
      </section>

      <section class="article-compare compact">
        <div>
          <h2>判讀重點</h2>
          <p>閱讀這類政策文章時，先分辨哪些是已公開的文件與數字，哪些只是各方主張。若一項政策只提出方向，卻沒有預算來源、期程或責任單位，就還不能視為已經落實。</p>
        </div>
        <div>
          <h2>資料缺口</h2>
          <p>後續最需要補的是原始公告、會議紀錄、預算表、執行進度與地方回應。這些資料可以用來判斷政策是持續推進、暫時停留在宣示，還是已經出現落差。</p>
        </div>
      </section>

      ${renderRelatedArticles(article)}

      <section class="article-disclaimer" aria-label="免責聲明">
        <h2>免責聲明</h2>
        <p>
          本文為公開資料、新聞來源與政策脈絡整理，目的在於協助讀者理解議題背景與後續追蹤方向，不構成法律、投資、醫療或其他專業建議。
        </p>
        <p>
          文章中的支持方、疑慮方與待查資料為編輯整理架構，並不代表本站立場。若內容涉及人物、機關或事件責任，仍應以主管機關公告、法院判決、議事紀錄與當事方正式說法為準。
        </p>
      </section>

      ${renderCommentsShell(article)}

      <footer class="article-footer-meta">
        <div class="source-line">
          ${sources.map((source) => `<span class="source-pill">${articleEscape(source)}</span>`).join("")}
        </div>
        <div class="tag-row">
          ${normalizeList(article.tags).map((tag) => `<span class="tag">${articleEscape(tag)}</span>`).join("")}
        </div>
      </footer>
    </article>

    <aside class="article-aside">
      <section class="promo-slot" data-promo-slot>
        <span>廣告版位</span>
        <strong>300 x 250</strong>
      </section>
      <section class="article-side-card">
        <p class="eyebrow">Reading Note</p>
        <h2>本站閱讀原則</h2>
        <p>政策文章分開呈現事實、支持方、疑慮方與待補資料，避免把評論混成事實。</p>
      </section>
      ${renderInlineAd("Sidebar / 300 x 600")}
    </aside>
  `;

  window.PolicyPulseStats?.record("article_read", {
    id: article.id,
    title: article.title,
    topic: article.topic,
  });
  window.PolicyPulseWatchlist?.initFollowButton?.(article);
  initArticleComments(article);
}

async function initArticle() {
  if (typeof loadContent === "function") {
    await loadContent();
  }
  const id = getArticleId();
  const article = findArticle(id);
  if (!article) {
    renderMissing();
    return;
  }
  renderArticle(article);
}

function submitArticleSearch(event) {
  event.preventDefault();
  const input = document.querySelector("#articleSearch");
  const query = input?.value.trim() || "";
  if (query.length < 2) {
    input?.setCustomValidity("請輸入至少兩個字元進行搜尋");
    input?.reportValidity();
    return;
  }
  input.setCustomValidity("");
  location.href = `index.html?search=${encodeURIComponent(query)}`;
}

document.querySelector("#articleSearchForm")?.addEventListener("submit", submitArticleSearch);
document.querySelector("#articleSearch")?.addEventListener("input", (event) => {
  event.currentTarget.setCustomValidity("");
});

document.addEventListener("policy-auth-change", () => {
  if (activeCommentArticleId) refreshArticleComments(activeCommentArticleId);
});

initArticle();
