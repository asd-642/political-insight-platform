const DATA_MAP_KEYS = {
  users: "policyPulseUsers",
  session: "policyPulseSession",
  stats: "policyPulseStats",
};

const dataMapState = {
  articles: null,
  articleSource: "前端內容檔",
  loadingArticles: false,
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

function dataMapDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function eventDateKey(event) {
  return dataMapDateKey(event?.at || event?.createdAtIso || event?.createdAt || "");
}

function eventCount(events, type) {
  return events.filter((event) => event.type === type).length;
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

function localDataMapArticles() {
  const articles = window.PolicyPulseContent?.articles || window.PolicyPulseGeneratedContent?.articles || [];
  return Array.isArray(articles) ? articles : [];
}

function getDataMapArticles() {
  if (Array.isArray(dataMapState.articles) && dataMapState.articles.length) return dataMapState.articles;
  return localDataMapArticles();
}

function getLocalRecords() {
  const users = readDataMapJson(DATA_MAP_KEYS.users, {});
  const session = readDataMapJson(DATA_MAP_KEYS.session, null);
  const stats = window.PolicyPulseStats?.read?.() || readDataMapJson(DATA_MAP_KEYS.stats, []);
  const articles = getDataMapArticles();
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
  const today = dataMapDateKey();
  const todayEvents = stats.filter((event) => eventDateKey(event) === today);
  const cards = [
    ["文章資料", articles.length],
    ["今日互動", todayEvents.length],
    ["頁面瀏覽", eventCount(stats, "page_view")],
    ["文章點擊", eventCount(stats, "article_select")],
    ["搜尋事件", eventCount(stats, "search")],
    ["留言資料", comments],
    ["本機帳號", Object.keys(users).length],
    ["目前登入", session?.email ? "已登入" : "未登入"],
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

function renderPracticalRecordCards() {
  const { users, session, stats, articles, comments } = getLocalRecords();
  const today = dataMapDateKey();
  const todayEvents = stats.filter((event) => eventDateKey(event) === today);
  const latestArticle = articles[0];
  const latestEvent = [...stats].reverse()[0];
  const isAdmin = Boolean(window.PolicyPulseAuth?.isAdmin?.());
  const firebaseEnabled = Boolean(window.PolicyPulseFirebase?.enabled || window.PolicyPulseFirebaseConfig?.enabled);
  const articleSource = dataMapState.articleSource || (firebaseEnabled ? "Firebase" : "前端內容檔");
  const cards = [
    {
      no: "01",
      title: "文章庫存",
      metric: `${articles.length} 篇`,
      detail: latestArticle ? `最新內容：${latestArticle.title || latestArticle.id}` : "尚未讀到文章資料。",
      items: [
        ["資料來源", articleSource],
        ["最新日期", latestArticle?.updated || latestArticle?.publishedAt || "未標示"],
      ],
    },
    {
      no: "02",
      title: "今日互動",
      metric: `${todayEvents.length} 筆`,
      detail: "只看公開前台互動，後台與本機測試不應混入正式統計。",
      items: [
        ["頁面瀏覽", eventCount(todayEvents, "page_view")],
        ["文章點擊", eventCount(todayEvents, "article_select")],
        ["搜尋", eventCount(todayEvents, "search")],
      ],
    },
    {
      no: "03",
      title: "登入權限",
      metric: session?.email ? "已登入" : "未登入",
      detail: session?.email || "登入後才會看到會員與管理員狀態。",
      items: [
        ["本機帳號", Object.keys(users).length],
        ["管理員", isAdmin ? "是" : "否"],
      ],
    },
    {
      no: "04",
      title: "留言風險",
      metric: `${comments} 則`,
      detail: comments ? "有留言資料時，後台留言管理會優先整理可疑或被檢舉內容。" : "目前沒有本機留言紀錄。",
      items: [
        ["待處理", comments],
        ["來源", "文章留言"],
      ],
    },
    {
      no: "05",
      title: "系統健康",
      metric: firebaseEnabled ? "Firebase 已啟用" : "本機模式",
      detail: "用來判斷正式站是否能讀寫雲端文章、事件與登入資料。",
      items: [
        ["登入設定", window.PolicyPulseFirebaseConfig?.firebase?.apiKey ? "已設定" : "未設定"],
        ["事件紀錄", stats.length],
      ],
    },
    {
      no: "06",
      title: "最近事件",
      metric: latestEvent?.type || "尚無",
      detail: latestEvent ? summarizePayload(latestEvent.payload) : "前台有互動後會出現最近一筆事件。",
      items: [
        ["時間", formatDataMapTime(latestEvent?.at)],
        ["頁面", latestEvent?.path || "未記錄"],
      ],
    },
  ];

  const target = document.querySelector("#practicalRecordCards");
  if (!target) return;
  target.innerHTML = cards
    .map(
      (card) => `
        <article class="schema-card practical-record-card">
          <div class="schema-card-head">
            <span>${dataMapEscape(card.no)}</span>
            <h3>${dataMapEscape(card.title)}</h3>
          </div>
          <strong class="practical-record-metric">${dataMapEscape(card.metric)}</strong>
          <p>${dataMapEscape(card.detail)}</p>
          <dl>
            ${card.items.map(([label, value]) => `<div><dt>${dataMapEscape(label)}</dt><dd>${dataMapEscape(value)}</dd></div>`).join("")}
          </dl>
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
  renderPracticalRecordCards();
  renderLiveRecordRows();
}

async function loadFirebaseDataMapArticles() {
  if (dataMapState.loadingArticles) return;
  const api = window.PolicyPulseFirebase;
  if (!api?.enabled || typeof api.loadPublishedContent !== "function") return;
  dataMapState.loadingArticles = true;
  try {
    const content = await api.loadPublishedContent();
    if (Array.isArray(content?.articles) && content.articles.length) {
      dataMapState.articles = content.articles;
      dataMapState.articleSource = "Firebase 正式文章";
      renderDataMap();
    }
  } catch {
    dataMapState.articleSource = "前端內容檔";
  } finally {
    dataMapState.loadingArticles = false;
  }
}

document.querySelector("#refreshDataMap")?.addEventListener("click", renderDataMap);
document.addEventListener("policy-auth-change", renderDataMap);
document.addEventListener("policy-firebase-ready", loadFirebaseDataMapArticles);
renderDataMap();
loadFirebaseDataMapArticles();
