import { readFile } from "node:fs/promises";
import path from "node:path";
import { documentExists, getDocument, setDocument } from "./firestore-rest.mjs";

const DEFAULT_FETCH_TIMEOUT_MS = 1800;

const topicMeta = {
  budget: { name: "財經", image: "assets/hero-market.png" },
  housing: { name: "居住", image: "assets/housing.png" },
  energy: { name: "能源", image: "assets/energy.png" },
  transport: { name: "交通", image: "assets/transport.png" },
  labor: { name: "勞工", image: "assets/labor.png" },
  education: { name: "教育", image: "assets/education.png" },
};

const fallbackConfig = {
  dailyRandomDrafts: { enabled: true, count: 15 },
  personRegionDrafts: { enabled: true, minDraftsPerArea: 2, maxDraftsPerArea: 4 },
  topicNames: {
    budget: "財經",
    housing: "居住",
    energy: "能源",
    transport: "交通",
    labor: "勞工",
    education: "教育",
  },
  topicKeywords: {
    budget: ["預算", "稅制", "補助", "物價", "產業", "財政"],
    housing: ["租屋", "社宅", "房價", "都更", "空屋"],
    energy: ["電價", "電網", "儲能", "再生能源", "停電"],
    transport: ["捷運", "公車", "月票", "道路", "鐵路"],
    labor: ["最低工資", "工時", "勞保", "職安", "薪資"],
    education: ["技職", "高教", "校園", "課綱", "學費"],
  },
  people: [
    { id: "north-policy", name: "北部議員", role: "民代", area: "北部", focus: "交通、居住", topicHints: ["transport", "housing"] },
    { id: "central-policy", name: "中部首長", role: "地方首長", area: "中部", focus: "能源、產業", topicHints: ["energy", "budget"] },
    { id: "south-policy", name: "南部議員", role: "民代", area: "南部", focus: "勞工、財經", topicHints: ["labor", "budget"] },
    { id: "east-policy", name: "東部委員", role: "委員", area: "東部", focus: "教育、交通", topicHints: ["education", "transport"] },
  ],
};

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function randomBetween(min, max) {
  return Math.floor(min + Math.random() * Math.max(1, max - min + 1));
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function groupBy(items, keyForItem) {
  return items.reduce((groups, item) => {
    const key = keyForItem(item);
    groups[key] = groups[key] || [];
    groups[key].push(item);
    return groups;
  }, {});
}

export function taipeiDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function slugify(input) {
  return String(input || "keyword")
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 64) || "keyword";
}

function stripHtml(text) {
  return String(text || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

async function loadConfig() {
  try {
    const raw = await readFile(path.join(process.cwd(), "content", "automation-config.json"), "utf8");
    const config = JSON.parse(raw);
    return {
      ...fallbackConfig,
      ...config,
      topicNames: { ...fallbackConfig.topicNames, ...(config.topicNames || {}) },
      topicKeywords: Object.keys(config.topicKeywords || {}).length ? config.topicKeywords : fallbackConfig.topicKeywords,
      people: Array.isArray(config.people) && config.people.length ? config.people : fallbackConfig.people,
    };
  } catch {
    return fallbackConfig;
  }
}

function googleNewsUrl(keyword) {
  const query = encodeURIComponent(`${keyword} 台灣 政策`);
  return `https://news.google.com/rss/search?q=${query}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`;
}

function parseRss(xml, sourceName) {
  const items = [...String(xml).matchAll(/<item\b[\s\S]*?<\/item>/gi)].slice(0, 6);
  return items.map((match) => {
    const item = match[0];
    const readTag = (tag) => {
      const found = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
      return stripHtml(found?.[1] || "");
    };
    return {
      source: sourceName,
      title: readTag("title"),
      summary: readTag("description"),
      link: readTag("link"),
      publishedAt: readTag("pubDate"),
    };
  }).filter((item) => item.title);
}

async function fetchRecords(keyword) {
  const timeoutMs = Math.max(
    700,
    Math.min(4500, Number(process.env.DAILY_DRAFT_FETCH_TIMEOUT_MS || DEFAULT_FETCH_TIMEOUT_MS) || DEFAULT_FETCH_TIMEOUT_MS),
  );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(googleNewsUrl(keyword), {
      headers: { "user-agent": "PolicyPulseBot/0.3 daily draft research" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    const records = parseRss(text, "Google News");
    if (records.length) return records;
  } catch {
    // Fall through to a reviewable skeleton.
  } finally {
    clearTimeout(timeout);
  }

  return [{
    source: "待補來源",
    title: `${keyword} 相關政策資料待補`,
    summary: "目前自動抓取來源不足，先建立草稿框架，後續可補正式公告、新聞來源或會議紀錄。",
    link: "",
  }];
}

function normalizeBlockedKeywords(input) {
  return unique((Array.isArray(input) ? input : String(input || "").split(/[\n,，、]+/))
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, 200));
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

async function readKeywordBlacklist() {
  try {
    const policy = await getDocument("settings", "contentPolicy");
    return normalizeBlockedKeywords(policy.data?.blockedKeywords || []);
  } catch (error) {
    return [];
  }
}

function buildSections({ keyword, topicName, records, support, concern, next }) {
  const sourceList = unique(records.map((record) => record.source)).join("、") || "待補來源";
  const headlines = records.slice(0, 4).map((record, index) => `${index + 1}. ${record.title}`).join("；");

  return [
    {
      heading: "事件背景",
      paragraphs: [
        `這篇草稿聚焦「${keyword}」，先把近期來源中的相關標題與摘要整理成 ${topicName} 議題脈絡。它不是直接複製新聞，而是把可追蹤的政策問題、影響對象與後續資料缺口先整理出來。`,
        `目前抓到的來源包括：${sourceList}。系統會保留來源標記，方便後台審核時判斷是否需要補正式公告、議事紀錄或主管機關回應。`,
      ],
    },
    {
      heading: "目前來源提到什麼",
      paragraphs: [
        headlines || `目前和「${keyword}」直接相關的公開來源還不足，這篇先建立文章骨架，等待後續補資料。`,
        "來源摘要通常只呈現事件表層，因此草稿會把標題、摘要與關鍵字拆成待查核問題，而不是直接把外部報導當成完整結論。",
      ],
    },
    {
      heading: "影響對象與政策關聯",
      paragraphs: [
        `「${keyword}」若進入公共政策討論，通常會牽涉主管機關、地方執行單位、預算使用者與一般民眾。不同對象受到的影響不一樣，因此文章需要分開整理。`,
        "若議題涉及補助、採購、稅制、交通、能源、居住或教育服務，後續應檢查政策工具是否真的對應問題，而不是只看宣示文字。",
      ],
    },
    {
      heading: "支持方可能主張",
      paragraphs: [
        support,
        "支持理由需要被拆成政策目的、預期效果、受益對象與可驗證指標。若缺少這些條件，讀者就很難判斷政策是否真的有效。",
      ],
    },
    {
      heading: "疑慮與反對理由",
      paragraphs: [
        concern,
        "疑慮方的重點通常不只是反對政策，而是要求補足成本、期程、責任歸屬與資訊公開。這些疑慮若沒有被回應，後續執行容易出現落差。",
      ],
    },
    {
      heading: "需要補齊的資料",
      paragraphs: [
        "後續應優先補齊正式公告、原始文件、議事紀錄、預算明細、統計表與主管機關書面回應，避免只依賴媒體轉述。",
        "如果來源之間說法不一致，文章應保留各方版本，並把差異標示在時間線中，讓讀者看見資訊如何變化。",
      ],
    },
    {
      heading: "審核時建議檢查",
      paragraphs: [
        "發布前可以先確認標題是否過度下判斷、摘要是否把未證實內容寫成事實、來源是否足以支撐文章，以及分類是否正確。",
        "若文章涉及具名人物或機關責任，應優先補上正式來源或公開紀錄，並避免加入未查證的指控性描述。",
      ],
    },
    {
      heading: "後續追蹤方向",
      paragraphs: [
        next,
        "如果議題進入審查、發包、補助申請、地方執行或成效檢討階段，文章應更新時間點、責任單位與可量化指標，讓讀者能追蹤政策是否落地。",
      ],
    },
  ];
}

function buildDraft({ keyword, topic, config, records, person = null }) {
  const topicName = config.topicNames?.[topic] || topicMeta[topic]?.name || topic;
  const date = taipeiDate();
  const id = `${topic}-${slugify(keyword)}-${date}`;
  const support = `支持方可能認為「${keyword}」有助於改善公共服務、補足制度缺口或提升資源使用效率，但仍需要更多正式說明支撐。`;
  const concern = `疑慮方可能關注「${keyword}」相關政策的預算效率、執行落差、資訊透明度或責任歸屬問題，仍需交叉查核。`;
  const next = "補上正式公告、議事紀錄、數據表、主管機關回應與各方正式說法。";
  const now = new Date().toISOString();

  const draft = {
    id,
    topic,
    topicName,
    title: `${keyword}議題整理，後續影響與資料待查核`,
    status: "待審核",
    updated: date,
    image: "",
    imageMode: "generated",
    imagePrompt: `${topicName} policy newsroom cover about ${keyword}`,
    caption: `${topicName}議題示意圖。本站以公開資料與後續追蹤整理政策脈絡。`,
    summary: `根據自動抓取來源摘要，「${keyword}」近期與${topicName}議題相關。本文先整理影響對象、主要爭點與後續需要補充的資料。`,
    facts: [
      ["影響對象", person?.area ? `${person.area}、相關主管機關與民眾` : "待依來源補齊"],
      ["核心爭點", `${keyword}相關政策影響與各方主張`],
      ["觀察指標", "預算、執行進度、公開紀錄"],
    ],
    sources: unique(records.map((record) => record.source)).slice(0, 5),
    sourceLinks: records.map((record) => ({
      title: record.title,
      source: record.source,
      link: record.link,
    })).filter((record) => record.title || record.link),
    support,
    concern,
    next,
    tags: unique([
      keyword,
      topic,
      topicName,
      person?.name,
      person?.area,
      person?.role,
      "待查核",
    ]).slice(0, 8),
    reviewChecklist: [
      "確認至少 2 個可查來源",
      "補足事件背景、支持方、疑慮方與後續追蹤",
      "檢查是否有未查證指控或過度判斷",
      "確認圖片來源或使用自動生成示意圖",
    ],
    sections: buildSections({ keyword, topicName, records, support, concern, next }),
    published: false,
    createdAt: now,
    updatedAt: now,
    createdAtIso: now,
  };

  if (person) {
    draft.area = person.area;
    draft.personIds = [person.id];
    draft.people = [{ id: person.id, name: person.name, role: person.role, area: person.area }];
    draft.personContext = person;
    draft.reviewChecklist.push("確認人物相關說法是否有正式來源或公開紀錄");
    draft.reviewChecklist.push("避免把未查證指控寫成事實");
  }

  return draft;
}

function buildTopicPicks(config, count) {
  const pool = Object.entries(config.topicKeywords || {})
    .flatMap(([topic, keywords]) => (Array.isArray(keywords) ? keywords : []).map((keyword) => ({ topic, keyword })));
  const picks = shuffle(pool).slice(0, Math.min(count, pool.length));
  while (picks.length < count && pool.length) picks.push(randomItem(pool));
  return picks;
}

function topicForPerson(person, config) {
  const hints = Array.isArray(person.topicHints) ? person.topicHints.filter((topic) => config.topicKeywords?.[topic]) : [];
  if (hints.length) return randomItem(hints);
  return Object.keys(config.topicKeywords || {})[0] || "budget";
}

function keywordForPerson(person, topic, config) {
  const topicName = config.topicNames?.[topic] || topic;
  const focusParts = String(person.focus || topicName).split(/[,，、]/).map((item) => item.trim()).filter(Boolean);
  const focus = randomItem(focusParts.length ? focusParts : [topicName]);
  return randomItem([
    `${person.name} ${focus}`,
    `${person.area} ${focus}`,
    `${person.role} ${person.name}`,
    `${person.area} ${topicName} 政策`,
    `${person.name} ${topicName} 追蹤`,
  ]);
}

function buildPersonPicks(config) {
  const settings = config.personRegionDrafts || {};
  const minDrafts = Math.max(1, Number(settings.minDraftsPerArea || 2) || 2);
  const maxDrafts = Math.max(minDrafts, Number(settings.maxDraftsPerArea || 4) || 4);
  const people = Array.isArray(config.people) ? config.people.filter((person) => person.id && person.name && person.area) : [];
  const byArea = groupBy(people, (person) => person.area);

  return Object.entries(byArea).flatMap(([area, areaPeople]) => {
    const count = randomBetween(minDrafts, maxDrafts);
    const selected = shuffle(areaPeople).slice(0, Math.min(count, areaPeople.length));
    while (selected.length < count && areaPeople.length) selected.push(randomItem(areaPeople));
    return selected.map((person) => {
      const topic = topicForPerson(person, config);
      return {
        topic,
        keyword: keywordForPerson(person, topic, config),
        person: { ...person, area },
      };
    });
  });
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function createDraftFromPick(pick, config, blockedKeywords) {
  const records = await fetchRecords(pick.keyword);
  const draft = buildDraft({ keyword: pick.keyword, topic: pick.topic, config, records, person: pick.person });
  const blocked = findBlockedKeywords({ keyword: pick.keyword, draft, records }, blockedKeywords);
  if (blocked.length) {
    return { skipped: true, reason: "blockedKeyword", blockedKeywords: blocked, pick, draft };
  }
  if (await documentExists("articles", draft.id)) {
    return { skipped: true, reason: "alreadyPublished", pick, draft };
  }
  await setDocument("drafts", draft.id, draft);
  return { created: true, pick, draft };
}

async function writeRunReport(result, extra = {}) {
  const report = {
    ...result,
    ...extra,
    createdCount: result.created.length,
    skippedCount: result.skipped.length,
    finishedAt: new Date().toISOString(),
  };
  try {
    await setDocument("automationRuns", "daily-drafts-latest", report);
    await setDocument("automationRuns", `daily-drafts-${result.date}`, report);
  } catch {
    // Draft creation is more important than telemetry. Keep the run successful.
  }
  return report;
}

export async function runDailyDrafts() {
  const startedAt = new Date().toISOString();
  const config = await loadConfig();
  const blockedKeywords = await readKeywordBlacklist();
  const issueCount = Math.max(1, Math.min(60, Number(config.dailyRandomDrafts?.count || 15) || 15));
  const issuePicks = config.dailyRandomDrafts?.enabled === false ? [] : buildTopicPicks(config, issueCount);
  const personPicks = config.personRegionDrafts?.enabled === false ? [] : buildPersonPicks(config);
  const picks = [
    ...issuePicks.map((pick) => ({ ...pick, type: "issue" })),
    ...personPicks.map((pick) => ({ ...pick, type: "person" })),
  ];

  const results = await mapWithConcurrency(picks, 8, (pick) => createDraftFromPick(pick, config, blockedKeywords));
  const created = results.filter((item) => item.created).map((item) => ({
    id: item.draft.id,
    title: item.draft.title,
    topic: item.draft.topic,
    type: item.pick.type,
  }));
  const skipped = results.filter((item) => item.skipped).map((item) => ({
    id: item.draft.id,
    title: item.draft.title,
    topic: item.draft.topic,
    type: item.pick.type,
    reason: item.reason,
    blockedKeywords: item.blockedKeywords || [],
  }));

  const result = {
    date: taipeiDate(),
    requested: picks.length,
    created,
    skipped,
    issueRequested: issuePicks.length,
    personRequested: personPicks.length,
    startedAt,
  };
  return writeRunReport(result);
}
