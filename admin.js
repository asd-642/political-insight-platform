function readStats() {
  return window.PolicyPulseStats?.read() || [];
}

async function readStatsForAdmin() {
  try {
    return await window.PolicyPulseStats?.readRemote?.();
  } catch {
    return readStats();
  }
}

const adminShell = document.querySelector(".doc-panel");
const adminMarkup = adminShell.innerHTML;
const draftState = {
  items: [],
  selected: new Set(),
  loading: false,
  message: "",
  error: "",
};
const commentState = {
  items: [],
  loading: false,
  message: "",
  error: "",
};
const blacklistState = {
  items: [],
  loading: false,
  message: "",
  error: "",
};
const dailyDraftState = {
  loading: false,
  status: null,
  message: "",
  error: "",
};
let keywordDraftLoading = false;
const defaultTopicNames = {
  budget: "財經",
  housing: "居住",
  energy: "能源",
  transport: "交通",
  labor: "勞工",
  education: "教育",
};

function hasAdminAccess() {
  const api = window.PolicyPulseFirebase;
  if (api?.enabled) return Boolean(api.isAdmin?.());
  return Boolean(window.PolicyPulseAuth?.isAdmin());
}

async function resolveAdminAccess() {
  try {
    const api = await window.PolicyPulseFirebaseReady;
    if (api?.enabled) {
      if (api.resolveAdminAccess) return Boolean(await api.resolveAdminAccess());
      return Boolean(api.isAdmin?.());
    }
  } catch {
    // Fall back to local preview access below.
  }
  return hasAdminAccess();
}

function escapeHtml(value = "") {
  return window.PolicyPulseUtils?.escapeHtml
    ? window.PolicyPulseUtils.escapeHtml(value)
    : String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
}

function isLocalPreview() {
  return ["127.0.0.1", "localhost"].includes(location.hostname);
}

function renderDenied() {
  const session = window.PolicyPulseAuth?.getSession?.();
  if (isLocalPreview()) {
    document.title = "後台登入｜政策脈絡";
    adminShell.innerHTML = `
      <p class="eyebrow">Admin Access</p>
      <h1>需要管理員登入</h1>
      <p>
        目前登入的是「${escapeHtml(session?.email || "未登入")}」。本機測試後台只開放管理員 Google 帳號。
      </p>
      <div class="admin-denied-actions">
        <button id="adminSwitchAccount" class="article-back" type="button">切換管理員帳號</button>
        <a class="article-back secondary" href="index.html">回到首頁</a>
      </div>
    `;
    document.querySelector("#adminSwitchAccount")?.addEventListener("click", () => {
      window.PolicyPulseAuth?.logout?.();
      window.PolicyPulseAuth?.showLogin?.();
    });
    return;
  }

  document.title = "頁面不存在｜政策脈絡";
  adminShell.innerHTML = `
    <p class="eyebrow">Not Found</p>
    <h1>找不到這個頁面</h1>
    <p>
      這個連結目前無法開啟，可能是網址已變更、內容不存在，或你沒有可檢視的權限。
    </p>
    <a class="article-back" href="index.html">回到首頁</a>
  `;
}

function countBy(events, type) {
  return events.filter((event) => event.type === type).length;
}

function formatTime(value) {
  if (window.PolicyPulseUtils?.formatTime) return window.PolicyPulseUtils.formatTime(value);
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

function topArticles(events) {
  const counts = new Map();
  events
    .filter((event) => event.type === "article_select")
    .forEach((event) => {
      const key = event.payload?.title || event.payload?.id || "未命名文章";
      counts.set(key, (counts.get(key) || 0) + 1);
    });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
}

function createAdminCard(label, value) {
  const card = document.createElement("article");
  card.className = "admin-card";

  const labelNode = document.createElement("span");
  labelNode.textContent = label;

  const valueNode = document.createElement("strong");
  valueNode.textContent = String(value);

  card.append(labelNode, valueNode);
  return card;
}

function renderCards(events) {
  const cards = [
    ["總事件", events.length],
    ["頁面瀏覽", countBy(events, "page_view")],
    ["文章點擊", countBy(events, "article_select")],
    ["搜尋次數", countBy(events, "search")],
  ];

  const container = document.querySelector("#adminStats");
  if (window.PolicyPulseUtils?.replaceChildren) {
    window.PolicyPulseUtils.replaceChildren(
      container,
      cards.map(([label, value]) => createAdminCard(label, value)),
    );
    return;
  }
  container.innerHTML = cards
    .map(
      ([label, value]) => `
        <article class="admin-card">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </article>
      `,
    )
    .join("");
}

function renderArticles(events) {
  const rows = topArticles(events);
  document.querySelector("#articleStats").innerHTML = rows.length
    ? rows
        .map(
          ([title, count]) => `
            <div class="admin-row">
              <strong>${count} 次</strong>
              <span>${escapeHtml(title)}</span>
              <span>article_select</span>
            </div>
          `,
        )
        .join("")
    : `<div class="admin-row"><span>還沒有文章點擊紀錄</span><span></span><span></span></div>`;
}

function renderEvents(events) {
  const latest = [...events].reverse().slice(0, 12);
  document.querySelector("#eventList").innerHTML = latest.length
    ? latest
        .map((event) => {
          const label =
            event.payload?.title ||
            event.payload?.query ||
            event.payload?.email ||
            event.payload?.theme ||
            event.path ||
            "";
          return `
            <div class="admin-row">
              <strong>${escapeHtml(event.type)}</strong>
              <span>${escapeHtml(label)}</span>
              <span>${formatTime(event.at)}</span>
            </div>
          `;
        })
        .join("")
    : `<div class="admin-row"><span>還沒有事件紀錄</span><span></span><span></span></div>`;
}

function reviewServerHelp() {
  return `
    草稿審核需要用本機後台服務開啟。請執行：
    node scripts\\review_server.mjs
    然後打開 http://127.0.0.1:4173/admin.html
  `;
}

function canUseReviewApi() {
  return ["http:", "https:"].includes(window.location.protocol);
}

async function localDraftApi(path, options = {}) {
  if (!canUseReviewApi()) {
    throw new Error(reviewServerHelp());
  }

  const response = await fetch(path, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...options.headers,
    },
    credentials: "same-origin",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || `後台服務回應失敗：${response.status}`);
  }
  return data;
}

async function firebaseDraftApi(path, options = {}) {
  const api = await window.PolicyPulseFirebaseReady;
  const useFirebaseDrafts = api?.enabled && api?.getCurrentUser?.() && api?.isAdmin?.();
  if (!useFirebaseDrafts) return null;

  if (path === "/api/drafts") {
    return { ok: true, drafts: await api.listDrafts() };
  }

  const body = options.body ? JSON.parse(options.body) : {};
  if (path === "/api/drafts/approve") {
    const published = await api.approveDrafts(body.files || []);
    return { ok: true, published, drafts: await api.listDrafts() };
  }

  if (path === "/api/drafts/reject") {
    const rejected = await api.rejectDrafts(body.files || []);
    return { ok: true, rejected, drafts: await api.listDrafts() };
  }

  if (path === "/api/keyword-drafts" && api.createKeywordDrafts) {
    const result = await api.createKeywordDrafts(body);
    return { ok: true, ...result, drafts: await api.listDrafts() };
  }

  if (path === "/api/keyword-blacklist" && api.getKeywordBlacklist) {
    if (options.method === "POST" && api.saveKeywordBlacklist) {
      return { ok: true, blockedKeywords: await api.saveKeywordBlacklist(body.blockedKeywords || []) };
    }
    return { ok: true, blockedKeywords: await api.getKeywordBlacklist() };
  }

  return null;
}

async function draftApi(path, options = {}) {
  if (isLocalPreview()) {
    try {
      return await localDraftApi(path, options);
    } catch (localError) {
      const firebaseResult = await firebaseDraftApi(path, options);
      if (firebaseResult) return firebaseResult;
      throw localError;
    }
  }

  const firebaseResult = await firebaseDraftApi(path, options);
  if (firebaseResult) return firebaseResult;
  return localDraftApi(path, options);
}

function dailyDraftApiUrl(status = false) {
  const path = `/api/daily-drafts${status ? "?status=1" : ""}`;
  return isLocalPreview() ? `https://policypulse.tw${path}` : path;
}

async function firebaseIdToken() {
  const api = await window.PolicyPulseFirebaseReady;
  const user = api?.getCurrentUser?.();
  const token = await user?.getIdToken?.();
  if (!token) throw new Error("請先用管理員帳號登入。");
  return token;
}

async function dailyDraftApi(status = false, options = {}) {
  const token = await firebaseIdToken();
  const response = await fetch(dailyDraftApiUrl(status), {
    method: status ? "GET" : "POST",
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || `每日產稿服務回應失敗：${response.status}`);
  }
  return data;
}

function setDailyDraftLoading(value) {
  dailyDraftState.loading = value;
  document.querySelector("#refreshDailyDraftStatus")?.toggleAttribute("disabled", value);
  document.querySelector("#runDailyDraftsNow")?.toggleAttribute("disabled", value);
}

function renderDailyDraftStatus() {
  const status = document.querySelector("#dailyDraftStatus");
  const details = document.querySelector("#dailyDraftDetails");
  if (!status || !details) return;

  status.className = `draft-status${dailyDraftState.error ? " is-error" : ""}`;
  status.textContent = dailyDraftState.error || dailyDraftState.message || "";

  const latest = dailyDraftState.status?.latest;
  if (!latest) {
    details.innerHTML = `
      <div class="draft-empty">
        <strong>還沒有排程紀錄</strong>
        <span>部署後可以按「補跑今日產稿」測試一次。</span>
      </div>
    `;
    return;
  }

  if (latest.error) {
    details.innerHTML = `
      <div class="draft-empty">
        <strong>暫時無法讀取上次紀錄</strong>
        <span>${escapeHtml(latest.error)}</span>
      </div>
    `;
    return;
  }

  const configured = dailyDraftState.status.configured || {};
  const rows = [
    ["排程時間", dailyDraftState.status.schedule?.taipei || "每天 06:30"],
    ["上次執行", latest.finishedAt ? formatTime(latest.finishedAt) : "尚無"],
    ["要求篇數", latest.requested ?? "尚無"],
    ["建立草稿", latest.createdCount ?? latest.created?.length ?? 0],
    ["略過項目", latest.skippedCount ?? latest.skipped?.length ?? 0],
    ["排程密鑰", configured.cronSecret ? "已設定" : "未設定"],
    ["Firebase 服務帳號", configured.firebaseServiceAccount ? "已設定" : "未設定"],
  ];
  details.innerHTML = rows
    .map(([label, value]) => `
      <div class="admin-row compact-row">
        <strong>${escapeHtml(label)}</strong>
        <span>${escapeHtml(value)}</span>
      </div>
    `)
    .join("");
}

async function loadDailyDraftStatus() {
  if (!hasAdminAccess()) return;
  setDailyDraftLoading(true);
  dailyDraftState.error = "";
  dailyDraftState.message = "正在檢查每日產稿狀態...";
  renderDailyDraftStatus();

  try {
    dailyDraftState.status = await dailyDraftApi(true);
    const latest = dailyDraftState.status.latest;
    dailyDraftState.message = latest?.finishedAt
      ? `上次每日產稿：建立 ${latest.createdCount || 0} 篇，略過 ${latest.skippedCount || 0} 項。`
      : "每日產稿尚未留下執行紀錄。";
  } catch (error) {
    dailyDraftState.error = error.message || "無法檢查每日產稿狀態。";
  } finally {
    setDailyDraftLoading(false);
    renderDailyDraftStatus();
  }
}

async function runDailyDraftsNow() {
  if (!hasAdminAccess() || dailyDraftState.loading) return;
  setDailyDraftLoading(true);
  dailyDraftState.error = "";
  dailyDraftState.message = "正在補跑今日自動產稿...";
  renderDailyDraftStatus();

  try {
    const result = await dailyDraftApi(false);
    dailyDraftState.status = {
      ok: true,
      schedule: { taipei: "每天 06:30" },
      configured: {},
      latest: result,
    };
    dailyDraftState.message = `補跑完成：建立 ${result.createdCount || 0} 篇，略過 ${result.skippedCount || 0} 項。`;
    await loadDrafts();
  } catch (error) {
    dailyDraftState.error = error.message || "補跑每日產稿失敗。";
  } finally {
    setDailyDraftLoading(false);
    renderDailyDraftStatus();
  }
}

function readLocalModerationComments() {
  const comments = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith("policyPulseComments:")) continue;
    const articleId = key.replace("policyPulseComments:", "");
    try {
      const items = JSON.parse(localStorage.getItem(key)) || [];
      items.forEach((item) => {
        const reactions = Object.values(item.reactions || {});
        comments.push({
          articleId,
          likeCount: reactions.filter((value) => value === "like").length,
          dislikeCount: reactions.filter((value) => value === "dislike").length,
          ...item,
          reportCount: Object.keys(item.reports || {}).length || Number(item.reportCount || 0),
        });
      });
    } catch {
      // Ignore broken local comment entries.
    }
  }
  return comments.sort((a, b) => String(b.createdAtIso).localeCompare(String(a.createdAtIso)));
}

function updateLocalComment(commentId, updater) {
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith("policyPulseComments:")) continue;
    try {
      const items = JSON.parse(localStorage.getItem(key)) || [];
      const next = updater(items);
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Ignore broken local comment entries.
    }
  }
}

function renderCommentModeration() {
  const status = document.querySelector("#commentModerationStatus");
  const list = document.querySelector("#commentModerationList");
  const refresh = document.querySelector("#refreshComments");
  if (!status || !list) return;

  if (refresh) refresh.disabled = commentState.loading;
  status.className = `draft-status${commentState.error ? " is-error" : ""}`;
  status.textContent = commentState.error || commentState.message || "";

  if (!commentState.items.length) {
    list.innerHTML = `
      <div class="draft-empty">
        <strong>目前沒有留言</strong>
        <span>文章頁有會員留言後，這裡會出現可管理的紀錄。</span>
      </div>
    `;
    return;
  }

  list.innerHTML = commentState.items
    .map(
      (comment) => `
        <article class="comment-admin-row ${comment.status === "hidden" ? "is-hidden" : ""} ${Number(comment.reportCount || 0) ? "is-reported" : ""}">
          <div class="comment-admin-meta">
            <strong>${escapeHtml(comment.authorName || comment.authorEmail || "會員")}</strong>
            <span>${escapeHtml(comment.authorEmail || "未提供信箱")}</span>
            <span>${escapeHtml(comment.articleId || "未知文章")}</span>
            <span>${escapeHtml(comment.parentId ? `回覆 ${comment.parentId}` : "主留言")}</span>
            ${Number(comment.reportCount || 0) ? `<span class="review-warning">檢舉 ${Number(comment.reportCount || 0)}</span>` : ""}
            ${(comment.reportReasons || []).slice(0, 3).map((reason) => `<span class="review-warning">${escapeHtml(reason)}</span>`).join("")}
          </div>
          <p>${escapeHtml(comment.body || "")}</p>
          <div class="comment-admin-side">
            <span>${escapeHtml(comment.status === "hidden" ? "已隱藏" : "公開")}</span>
            <span>喜歡 ${Number(comment.likeCount || 0)}</span>
            <time>${escapeHtml(formatTime(comment.createdAtIso || comment.createdAt))}</time>
            <button class="admin-button" data-hide-comment="${escapeHtml(comment.id)}" type="button">
              隱藏
            </button>
            <button class="admin-button" data-delete-comment="${escapeHtml(comment.id)}" type="button">
              刪除
            </button>
          </div>
        </article>
      `,
    )
    .join("");
}

function isFirebasePermissionError(error) {
  const text = `${error?.code || ""} ${error?.message || ""}`.toLowerCase();
  return text.includes("permission") || text.includes("insufficient");
}

function friendlyCommentError(error) {
  if (!isFirebasePermissionError(error)) return error.message || "留言管理讀取失敗。";
  return "留言管理權限尚未套用。請把最新 Firestore 規則發布到 Firebase，或確認目前登入帳號已列入管理員。";
}

async function loadCommentsForAdmin() {
  if (!hasAdminAccess()) return;
  commentState.loading = true;
  commentState.error = "";
  commentState.message = "正在讀取留言...";
  renderCommentModeration();

  try {
    const api = await window.PolicyPulseFirebaseReady;
    if (api?.enabled && api?.isAdmin?.() && api?.listRecentComments) {
      commentState.items = await api.listRecentComments(100);
    } else {
      commentState.items = readLocalModerationComments();
    }
    commentState.items = [...commentState.items].sort((a, b) =>
      Number(b.reportCount || 0) - Number(a.reportCount || 0) ||
      String(b.createdAtIso || b.createdAt || "").localeCompare(String(a.createdAtIso || a.createdAt || "")),
    );
    commentState.message = commentState.items.length
      ? `目前有 ${commentState.items.length} 則留言可管理。`
      : "目前沒有留言。";
  } catch (error) {
    commentState.items = [];
    commentState.error = friendlyCommentError(error);
    commentState.message = "";
  } finally {
    commentState.loading = false;
    renderCommentModeration();
  }
}

async function hideModerationComment(commentId) {
  if (!commentId || commentState.loading) return;
  commentState.loading = true;
  commentState.message = "正在隱藏留言...";
  commentState.error = "";
  renderCommentModeration();

  try {
    const api = await window.PolicyPulseFirebaseReady;
    if (api?.enabled && api?.isAdmin?.() && api?.hideComment) {
      await api.hideComment(commentId);
    } else {
      updateLocalComment(commentId, (items) =>
        items.map((item) => item.id === commentId ? { ...item, status: "hidden" } : item),
      );
    }
    await loadCommentsForAdmin();
  } catch (error) {
    commentState.error = error.message;
    commentState.loading = false;
    renderCommentModeration();
  }
}

async function deleteModerationComment(commentId) {
  if (!commentId || commentState.loading) return;
  commentState.loading = true;
  commentState.message = "正在刪除留言...";
  commentState.error = "";
  renderCommentModeration();

  try {
    const api = await window.PolicyPulseFirebaseReady;
    if (api?.enabled && api?.isAdmin?.() && api?.deleteComment) {
      await api.deleteComment(commentId);
    } else {
      updateLocalComment(commentId, (items) => items.filter((item) => item.id !== commentId));
    }
    await loadCommentsForAdmin();
  } catch (error) {
    commentState.error = error.message;
    commentState.loading = false;
    renderCommentModeration();
  }
}

function setKeywordDraftStatus(message = "", isError = false) {
  const status = document.querySelector("#keywordDraftStatus");
  if (!status) return;
  status.className = `draft-status${isError ? " is-error" : ""}`;
  status.textContent = message;
}

function splitKeywordBlacklist(value) {
  return [...new Set(String(value || "")
    .split(/[\n,，、]+/)
    .map((item) => item.trim())
    .filter(Boolean))];
}

function setKeywordBlacklistLoading(value) {
  blacklistState.loading = value;
  document.querySelector("#refreshKeywordBlacklist")?.toggleAttribute("disabled", value);
  document.querySelector("#saveKeywordBlacklist")?.toggleAttribute("disabled", value);
}

function renderKeywordBlacklistStatus() {
  const status = document.querySelector("#keywordBlacklistStatus");
  if (!status) return;
  status.className = `draft-status${blacklistState.error ? " is-error" : ""}`;
  status.textContent = blacklistState.error || blacklistState.message || "";
}

async function loadKeywordBlacklist() {
  if (!hasAdminAccess()) return;
  setKeywordBlacklistLoading(true);
  blacklistState.error = "";
  blacklistState.message = "正在讀取黑名單...";
  renderKeywordBlacklistStatus();

  try {
    const data = await draftApi("/api/keyword-blacklist");
    blacklistState.items = data.blockedKeywords || [];
    const input = document.querySelector("#keywordBlacklistInput");
    if (input) input.value = blacklistState.items.join("\n");
    blacklistState.message = blacklistState.items.length
      ? `目前有 ${blacklistState.items.length} 個避開字詞。`
      : "目前沒有設定黑名單。";
  } catch (error) {
    blacklistState.error = error.message;
  } finally {
    setKeywordBlacklistLoading(false);
    renderKeywordBlacklistStatus();
  }
}

async function saveKeywordBlacklist() {
  if (!hasAdminAccess() || blacklistState.loading) return;
  const blockedKeywords = splitKeywordBlacklist(document.querySelector("#keywordBlacklistInput")?.value || "");
  setKeywordBlacklistLoading(true);
  blacklistState.error = "";
  blacklistState.message = "正在儲存黑名單...";
  renderKeywordBlacklistStatus();

  try {
    const data = await draftApi("/api/keyword-blacklist", {
      method: "POST",
      body: JSON.stringify({ blockedKeywords }),
    });
    blacklistState.items = data.blockedKeywords || [];
    const input = document.querySelector("#keywordBlacklistInput");
    if (input) input.value = blacklistState.items.join("\n");
    blacklistState.message = blacklistState.items.length
      ? `已儲存 ${blacklistState.items.length} 個避開字詞。之後命中的草稿會直接略過。`
      : "黑名單已清空。";
  } catch (error) {
    blacklistState.error = error.message;
  } finally {
    setKeywordBlacklistLoading(false);
    renderKeywordBlacklistStatus();
  }
}

function setKeywordDraftLoading(value) {
  keywordDraftLoading = value;
  const button = document.querySelector("#createKeywordDrafts");
  if (button) {
    button.disabled = value;
    button.textContent = value ? "正在抓取與產稿..." : "自動抓取並產生草稿";
  }
}

async function loadAutomationConfig() {
  try {
    const response = await fetch("content/automation-config.json", { cache: "no-store" });
    return response.ok ? response.json() : null;
  } catch {
    return null;
  }
}

async function populateKeywordTopics() {
  const select = document.querySelector("#keywordDraftTopic");
  if (!select || select.dataset.loaded === "true") return;
  const config = await loadAutomationConfig();
  const topicIds = Object.keys(config?.topicKeywords || defaultTopicNames);
  const topicNames = { ...defaultTopicNames, ...(config?.topicNames || {}) };
  if (!topicIds.length) return;
  const previous = select.value;
  select.innerHTML = topicIds
    .map((id) => `<option value="${escapeHtml(id)}">${escapeHtml(topicNames[id] || id)}</option>`)
    .join("");
  if (topicIds.includes(previous)) select.value = previous;
  select.dataset.loaded = "true";
}

async function createKeywordDrafts(event) {
  event.preventDefault();
  if (keywordDraftLoading) return;

  const keywords = document.querySelector("#keywordDraftInput")?.value.trim();
  const topic = document.querySelector("#keywordDraftTopic")?.value || "budget";
  const maxDrafts = Number(document.querySelector("#keywordDraftMax")?.value || 1);
  const sourceUrls = document.querySelector("#keywordDraftSources")?.value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean) || [];

  if (!keywords) {
    setKeywordDraftStatus("請先輸入你想追蹤的關鍵字。", true);
    return;
  }

  setKeywordDraftLoading(true);
  setKeywordDraftStatus("正在抓取相關來源並建立待審草稿...");

  try {
    const data = await draftApi("/api/keyword-drafts", {
      method: "POST",
      body: JSON.stringify({ keywords, topic, maxDrafts, sourceUrls }),
    });
    const count = data.created?.length || 0;
    const aiCount = (data.reports || []).filter((item) => item.usedAI).length;
    const skipped = (data.reports || []).filter((item) => item.skipped);
    const blockedWords = [...new Set(skipped.flatMap((item) => item.blockedKeywords || []))];
    setKeywordDraftStatus(
      count
        ? `已建立 ${count} 篇待審草稿。${skipped.length ? `另外 ${skipped.length} 篇命中黑名單已略過：${blockedWords.join("、")}` : ""}${aiCount ? `其中 ${aiCount} 篇已使用 AI 潤稿。` : "目前使用本機整理稿；設定 OPENAI_API_KEY 後會自動 AI 潤稿。"}`
        : `沒有建立新草稿。${skipped.length ? `命中黑名單已略過：${blockedWords.join("、")}` : "請換關鍵字或確認來源是否可讀。"}`,
      !count,
    );
    draftState.items = data.drafts || draftState.items;
    draftState.selected.clear();
    renderDraftQueue();
  } catch (error) {
    setKeywordDraftStatus(error.message, true);
  } finally {
    setKeywordDraftLoading(false);
  }
}

function setDraftLoading(value) {
  draftState.loading = value;
  const refresh = document.querySelector("#refreshDrafts");
  if (refresh) refresh.disabled = value;
}

async function loadDrafts() {
  if (!hasAdminAccess()) return;

  setDraftLoading(true);
  draftState.error = "";
  draftState.message = "正在載入待審草稿...";
  renderDraftQueue();

  try {
    const data = await draftApi("/api/drafts");
    draftState.items = data.drafts || [];
    draftState.selected = new Set([...draftState.selected].filter((file) => {
      return draftState.items.some((item) => item.file === file);
    }));
    draftState.message = draftState.items.length
      ? `目前有 ${draftState.items.length} 篇待審草稿。`
      : "目前沒有待審草稿。";
  } catch (error) {
    draftState.items = [];
    draftState.selected.clear();
    draftState.error = error.message;
    draftState.message = "";
  } finally {
    setDraftLoading(false);
    renderDraftQueue();
  }
}

async function approveDrafts(files) {
  const targets = [...files].filter(Boolean);
  if (!targets.length || draftState.loading) return;

  setDraftLoading(true);
  draftState.error = "";
  draftState.message = `正在確認發布 ${targets.length} 篇草稿...`;
  renderDraftQueue();

  try {
    const data = await draftApi("/api/drafts/approve", {
      method: "POST",
      body: JSON.stringify({ files: targets }),
    });
    draftState.items = data.drafts || [];
    draftState.selected.clear();
    draftState.message = `已發布 ${data.published?.length || targets.length} 篇文章，首頁和文章頁會同步讀到。`;
  } catch (error) {
    draftState.error = error.message;
  } finally {
    setDraftLoading(false);
    renderDraftQueue();
  }
}

async function rejectDrafts(files) {
  const targets = [...files].filter(Boolean);
  if (!targets.length || draftState.loading) return;

  setDraftLoading(true);
  draftState.error = "";
  draftState.message = `正在退回 ${targets.length} 篇草稿...`;
  renderDraftQueue();

  try {
    const data = await draftApi("/api/drafts/reject", {
      method: "POST",
      body: JSON.stringify({ files: targets }),
    });
    draftState.items = data.drafts || [];
    draftState.selected.clear();
    draftState.message = `已退回 ${data.rejected?.length || targets.length} 篇草稿。`;
  } catch (error) {
    draftState.error = error.message;
  } finally {
    setDraftLoading(false);
    renderDraftQueue();
  }
}

function draftQualityNotes(item) {
  const notes = [];
  const sourceCount = (item.sources || []).length + (item.sourceLinks || []).length;
  const sectionCount = (item.sections || []).length;
  const factCount = (item.facts || []).length;
  if (sourceCount < 2) notes.push("來源不足：發布前至少補 2 個可查來源");
  if (sectionCount && sectionCount < 6) notes.push("篇幅偏薄：建議補足背景、影響、各方說法與後續追蹤");
  if (!sectionCount) notes.push("未提供完整章節：請打開文章確認內容不是只有摘要");
  if (factCount < 3) notes.push("重點摘要不足：至少補 3 個可核對的重點");
  if (!item.imagePrompt && !item.image) notes.push("圖片待補：可用自動封面，正式站建議補授權圖或自產圖");
  return notes.length ? notes : ["結構基本完整，仍需人工查核標題、來源與語氣"];
}

function renderDraftQueue() {
  const status = document.querySelector("#draftReviewStatus");
  const list = document.querySelector("#draftReviewQueue");
  const approveButton = document.querySelector("#approveSelectedDrafts");
  if (!status || !list) return;

  const selectedCount = draftState.selected.size;
  if (approveButton) {
    approveButton.disabled = !selectedCount || draftState.loading;
    approveButton.textContent = selectedCount ? `批次確認發布（${selectedCount}）` : "批次確認發布";
  }

  status.className = `draft-status${draftState.error ? " is-error" : ""}`;
  status.textContent = draftState.error || draftState.message || "";

  if (draftState.error) {
    list.innerHTML = `
      <div class="draft-empty">
        <strong>草稿審核尚未連線</strong>
        <span>${escapeHtml(draftState.error)}</span>
      </div>
    `;
    return;
  }

  if (!draftState.items.length) {
    list.innerHTML = `
      <div class="draft-empty">
        <strong>沒有待審草稿</strong>
        <span>產生新草稿後，這裡會出現可審核的文章。已確認發布的文章會移出審核區，改顯示在首頁與文章列表。</span>
      </div>
    `;
    return;
  }

  list.innerHTML = draftState.items
    .map((item) => {
      const checked = draftState.selected.has(item.file) ? "checked" : "";
      const facts = (item.facts || [])
        .slice(0, 3)
        .map((fact) => {
          const [label, value] = Array.isArray(fact) ? fact : ["重點", fact];
          return `
            <span>
              <small>${escapeHtml(label)}</small>
              <strong>${escapeHtml(value)}</strong>
            </span>
          `;
        })
        .join("");
      const qualityNotes = draftQualityNotes(item)
        .map((note) => `<span>${escapeHtml(note)}</span>`)
        .join("");
      return `
        <article class="draft-card ${item.error ? "is-error" : ""}">
          <label class="draft-select">
            <input class="draft-check" type="checkbox" value="${escapeHtml(item.file)}" ${checked} />
            <span>選取</span>
          </label>
          <div class="draft-main">
            <div class="draft-meta">
              <span>${escapeHtml(item.topicName || item.topic || "未分類")}</span>
              <span>${escapeHtml(item.status || "待審")}</span>
              <span>${escapeHtml(item.file)}</span>
            </div>
            <h3>${escapeHtml(item.title || "未命名草稿")}</h3>
            <p>${escapeHtml(item.summary || "沒有摘要")}</p>
            <div class="draft-facts">${facts}</div>
            <div class="draft-quality">
              <strong>審稿檢查</strong>
              ${qualityNotes}
            </div>
            <div class="draft-tags">
              ${(item.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
            </div>
          </div>
          <div class="draft-actions">
            <button class="admin-button primary" data-approve-draft="${escapeHtml(item.file)}" type="button">
              確認發布
            </button>
            <button class="admin-button" data-reject-draft="${escapeHtml(item.file)}" type="button">
              退回
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

async function renderAdmin() {
  if (!(await resolveAdminAccess())) {
    renderDenied();
    return;
  }
  if (!document.querySelector("#adminStats")) {
    adminShell.innerHTML = adminMarkup;
    bindAdminActions();
  }
  const events = await readStatsForAdmin();
  renderCards(events);
  renderArticles(events);
  renderEvents(events);
  loadKeywordBlacklist();
  loadDailyDraftStatus();
  loadDrafts();
  loadCommentsForAdmin();
}

function bindAdminActions() {
  populateKeywordTopics();
  document.querySelector("#refreshStats")?.addEventListener("click", renderAdmin);
  document.querySelector("#clearStats")?.addEventListener("click", () => {
    window.PolicyPulseStats?.clear();
    renderAdmin();
  });
  document.querySelector("#refreshDrafts")?.addEventListener("click", loadDrafts);
  document.querySelector("#refreshDailyDraftStatus")?.addEventListener("click", loadDailyDraftStatus);
  document.querySelector("#runDailyDraftsNow")?.addEventListener("click", runDailyDraftsNow);
  document.querySelector("#refreshComments")?.addEventListener("click", loadCommentsForAdmin);
  document.querySelector("#refreshKeywordBlacklist")?.addEventListener("click", loadKeywordBlacklist);
  document.querySelector("#saveKeywordBlacklist")?.addEventListener("click", saveKeywordBlacklist);
  document.querySelector("#keywordDraftForm")?.addEventListener("submit", createKeywordDrafts);
  document.querySelector("#selectAllDrafts")?.addEventListener("click", () => {
    draftState.selected = new Set(draftState.items.filter((item) => !item.error).map((item) => item.file));
    renderDraftQueue();
  });
  document.querySelector("#clearDraftSelection")?.addEventListener("click", () => {
    draftState.selected.clear();
    renderDraftQueue();
  });
  document.querySelector("#approveSelectedDrafts")?.addEventListener("click", () => {
    approveDrafts(draftState.selected);
  });
  document.querySelector("#draftReviewQueue")?.addEventListener("change", (event) => {
    if (!event.target.matches(".draft-check")) return;
    if (event.target.checked) {
      draftState.selected.add(event.target.value);
    } else {
      draftState.selected.delete(event.target.value);
    }
    renderDraftQueue();
  });
  document.querySelector("#draftReviewQueue")?.addEventListener("click", (event) => {
    const approveFile = event.target.closest("[data-approve-draft]")?.dataset.approveDraft;
    const rejectFile = event.target.closest("[data-reject-draft]")?.dataset.rejectDraft;
    if (approveFile) approveDrafts([approveFile]);
    if (rejectFile) rejectDrafts([rejectFile]);
  });
  document.querySelector("#commentModerationList")?.addEventListener("click", (event) => {
    const hideId = event.target.closest("[data-hide-comment]")?.dataset.hideComment;
    const deleteId = event.target.closest("[data-delete-comment]")?.dataset.deleteComment;
    if (hideId) hideModerationComment(hideId);
    if (deleteId) deleteModerationComment(deleteId);
  });
}

bindAdminActions();
document.addEventListener("policy-auth-change", renderAdmin);
renderAdmin();
