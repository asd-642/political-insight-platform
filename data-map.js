const DATA_MAP_KEYS = {
  users: "policyPulseUsers",
  session: "policyPulseSession",
  stats: "policyPulseStats",
};

function readDataMapJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function dataMapEscape(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDataMapTime(value) {
  if (!value) return "未記錄";
  try {
    return new Intl.DateTimeFormat("zh-Hant-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function summarizePayload(payload = {}) {
  const preferred =
    payload.title ||
    payload.query ||
    payload.email ||
    payload.view ||
    payload.articleId ||
    payload.id ||
    "";
  if (preferred) return preferred;
  const keys = Object.keys(payload);
  return keys.length ? keys.slice(0, 3).join(", ") : "無額外資料";
}

function readLocalCommentCount() {
  let count = 0;
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith("policyPulseComments:")) continue;
    const comments = readDataMapJson(key, []);
    count += Array.isArray(comments) ? comments.length : 0;
  }
  return count;
}

function getLocalRecords() {
  const users = readDataMapJson(DATA_MAP_KEYS.users, {});
  const session = readDataMapJson(DATA_MAP_KEYS.session, null);
  const stats = window.PolicyPulseStats?.read?.() || readDataMapJson(DATA_MAP_KEYS.stats, []);
  const articles = window.PolicyPulseGeneratedContent?.articles || [];
  const comments = readLocalCommentCount();

  return {
    users,
    session,
    stats: Array.isArray(stats) ? stats : [],
    articles: Array.isArray(articles) ? articles : [],
    comments,
  };
}

function renderDataMapStats() {
  const { users, session, stats, articles, comments } = getLocalRecords();
  const cards = [
    ["本機帳號", Object.keys(users).length],
    ["目前登入", session?.email ? "1" : "0"],
    ["互動事件", stats.length],
    ["文章資料", articles.length],
    ["留言資料", comments],
    ["搜尋事件", stats.filter((event) => event.type === "search").length],
    ["文章點擊", stats.filter((event) => event.type === "article_select").length],
    ["頁面瀏覽", stats.filter((event) => event.type === "page_view").length],
  ];

  document.querySelector("#dataMapStats").innerHTML = cards
    .map(
      ([label, value]) => `
        <article class="admin-card">
          <span>${dataMapEscape(label)}</span>
          <strong>${dataMapEscape(value)}</strong>
        </article>
      `,
    )
    .join("");
}

function renderLiveRecordRows() {
  const { users, session, stats, articles, comments } = getLocalRecords();
  const latestEvents = [...stats].reverse().slice(0, 8);
  const userEmails = Object.keys(users);
  const latestArticle = articles[0];

  const sections = [
    {
      label: "users",
      title: userEmails.length ? `${userEmails.length} 個本機帳號` : "尚無本機帳號",
      detail: userEmails.length
        ? userEmails.map((email) => `${email}，密碼欄位以雜湊保存`).join("；")
        : "登入或建立測試帳號後，這裡會出現帳號摘要。",
      time: userEmails.length ? "localStorage" : "等待資料",
    },
    {
      label: "sessions",
      title: session?.email ? `目前登入：${session.email}` : "目前未登入",
      detail: session?.uid
        ? `uid: ${session.uid}`
        : "登入後會記錄登入信箱、uid、登入時間與角色判斷。",
      time: formatDataMapTime(session?.signedInAt),
    },
    {
      label: "articles",
      title: latestArticle ? `${articles.length} 篇文章內容` : "尚未載入文章內容",
      detail: latestArticle
        ? `最新範例：${latestArticle.title || latestArticle.id}`
        : "文章資料可由 JSON、Firebase 或正式 CMS 提供。",
      time: latestArticle?.updated || "content/generated-content.js",
    },
    {
      label: "comments",
      title: comments ? `${comments} 則本機留言` : "尚無本機留言",
      detail: comments ? "文章頁的留言、回覆、反應與檢舉會被後台整理。" : "會員留言後，後台留言管理與這裡都會讀得到。",
      time: "localStorage",
    },
  ];

  const eventRows = latestEvents.map((event) => ({
    label: "events",
    title: event.type || "unknown",
    detail: summarizePayload(event.payload),
    time: formatDataMapTime(event.at),
  }));

  document.querySelector("#localRecordRows").innerHTML = [...sections, ...eventRows]
    .map(
      (item) => `
        <article class="data-record-row">
          <span>${dataMapEscape(item.label)}</span>
          <strong>${dataMapEscape(item.title)}</strong>
          <p>${dataMapEscape(item.detail)}</p>
          <time>${dataMapEscape(item.time)}</time>
        </article>
      `,
    )
    .join("");
}

function renderDataMap() {
  renderDataMapStats();
  renderLiveRecordRows();
}

document.querySelector("#refreshDataMap")?.addEventListener("click", renderDataMap);
document.addEventListener("policy-auth-change", renderDataMap);
renderDataMap();
