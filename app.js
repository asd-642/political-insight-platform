const seedContent = {
  topics: [
    {
      id: "all",
      name: "全部",
      description: "所有已整理條目",
      image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80",
    },
    {
      id: "budget",
      name: "財經",
      description: "預算、稅制、補助、產業與物價",
      image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=900&q=80",
    },
    {
      id: "housing",
      name: "居住",
      description: "租屋、社宅、房價與都市更新",
      image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=900&q=80",
    },
    {
      id: "energy",
      name: "能源",
      description: "電價、電網、再生能源與供電安全",
      image: "https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=900&q=80",
    },
    {
      id: "transport",
      name: "交通",
      description: "大眾運輸、通勤補助與道路安全",
      image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=900&q=80",
    },
    {
      id: "labor",
      name: "勞工",
      description: "薪資、工時、職安與社會保險",
      image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80",
    },
    {
      id: "education",
      name: "教育",
      description: "學費、課綱、技職與高教資源",
      image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=900&q=80",
    },
  ],
  sources: [
    {
      id: "gazette",
      title: "政府公報",
      description:
        "收錄中央與地方機關發布的法規預告、公告、行政命令、施政計畫與政策原始文件，是本站判讀政策是否正式啟動的第一層依據。",
      reliability: "原始資料",
      scope: "行政院、各部會、縣市政府、公所、主管機關網站與公報系統。",
      use: "確認政策名稱、發布日期、主管單位、適用對象與正式文字。",
      update: "每日整理，遇到重大公告或爭議政策時優先補查。",
      checks: ["是否有正式文號", "是否為主管機關發布", "是否仍在預告期或已正式生效"],
    },
    {
      id: "legislature",
      title: "議事紀錄",
      description:
        "整理院會、委員會、地方議會、質詢紀錄、提案文字與表決結果，用來追蹤政治人物在議題中的立場變化與制度推進進度。",
      reliability: "原始資料",
      scope: "立法院、地方議會、會議逐字稿、議案系統、質詢影片與議事日程。",
      use: "比對誰提出主張、誰支持或反對、案件目前卡在哪個程序。",
      update: "議會開議期間提高更新頻率，閉會期間以重大提案為主。",
      checks: ["是否有完整會議紀錄", "是否能對應到提案或預算案", "發言是否被新聞或剪輯斷章取義"],
    },
    {
      id: "election",
      title: "選舉公報",
      description:
        "保存候選人政見、經歷、選區資料與選務機關公告，協助比對選前承諾與選後政策行動是否一致。",
      reliability: "原始資料",
      scope: "中央選舉委員會、地方選委會、選舉公報、候選人登記資料。",
      use: "建立人物資料基礎，追蹤政見承諾、選區關聯與後續問政。",
      update: "選舉期間密集整理，平時作為人物資料與政策承諾的比對底稿。",
      checks: ["政見是否為正式公報文字", "人物與選區是否一致", "承諾是否已有後續政策行動"],
    },
    {
      id: "budget",
      title: "預算與決算文件",
      description:
        "包含年度預算書、追加減預算、決算報告、審議資料與補助計畫，用來判斷政策是否有實際經費支撐。",
      reliability: "財務資料",
      scope: "中央與地方總預算、特別預算、基金預算、決算書、補助明細。",
      use: "查核政策金額、預算來源、執行率、凍結案與經費流向。",
      update: "預算審查季與決算公布期優先整理。",
      checks: ["金額是否為編列數或決算數", "是否含跨年度經費", "是否有凍結或附帶決議"],
    },
    {
      id: "statistics",
      title: "統計資料與公開數據",
      description:
        "整理政府統計、公開資料平台、專題調查與民生指標，補足政策討論中常被忽略的趨勢背景。",
      reliability: "數據資料",
      scope: "data.gov.tw、主計總處、部會統計、地方政府開放資料、公共服務指標。",
      use: "檢查政策問題是否存在、影響規模多大、不同地區或族群是否差異明顯。",
      update: "依資料發布週期更新，重大議題會補充歷史序列。",
      checks: ["資料年份是否最新", "指標定義是否改版", "樣本或統計口徑是否一致"],
    },
    {
      id: "audit",
      title: "審計、判決與監察資料",
      description:
        "用審計報告、法院判決、監察院調查與裁罰公告補強爭議事件，避免只看單方說法。",
      reliability: "查核資料",
      scope: "審計部、司法院裁判書、監察院、主管機關裁罰公告與廉政資料。",
      use: "確認是否已有違規、疏失、裁罰、糾正或判決結果。",
      update: "遇到弊案、採購、工程、補助與重大事故時優先查核。",
      checks: ["案件是否定讞", "裁罰是否仍可申訴", "調查結論是否有明確責任歸屬"],
    },
    {
      id: "briefings",
      title: "官方簡報與新聞稿",
      description:
        "收錄主管機關記者會、政策簡報、新聞稿與問答資料，作為理解政府主張與政策包裝方式的輔助來源。",
      reliability: "官方說明",
      scope: "部會新聞稿、地方政府新聞稿、政策簡報、記者會逐字與問答。",
      use: "整理政府說法、預期成效、對外承諾與尚未完整公開的執行方向。",
      update: "重大政策發布日即時補入，後續以正式文件校正。",
      checks: ["是否只是宣傳說法", "是否已有正式文件支撐", "承諾日期是否明確"],
    },
    {
      id: "news",
      title: "新聞報導",
      description:
        "新聞報導主要用來補足事件時間線、當事人反應與公共討論脈絡；本站會盡量回到原始文件確認，不把單篇報導直接當作結論。",
      reliability: "交叉查核",
      scope: "多家新聞媒體、專題報導、地方新聞、採訪稿與公開訪談。",
      use: "追蹤事件進展、整理各方說法、找出需要回查的官方文件。",
      update: "每日篩選，政治爭議與民生議題會比對不同媒體版本。",
      checks: ["是否只有單一媒體報導", "是否有引用原始文件", "是否混入評論或未證實消息"],
    },
  ],
  articles: [
    {
      id: "budget-review",
      topic: "budget",
      title: "總預算案審查進入攻防，支出凍結與地方建設成焦點",
      status: "焦點",
      updated: "2026-05-18",
      image: "assets/hero-market.png",
      summary:
        "整理年度總預算審查中的主要爭點，包括凍結案、地方建設、社福支出與各黨團主張。",
      facts: [
        ["影響對象", "中央部會、地方政府、納稅人"],
        ["核心爭點", "預算透明度與支出優先順序"],
        ["觀察指標", "凍結比例、刪減金額、附帶決議"],
      ],
      sources: ["預算書", "委員會紀錄", "黨團聲明"],
      support:
        "支持方認為嚴格審查能提高財政紀律，避免預算流於形式。",
      concern:
        "疑慮方擔心過度凍結會影響行政執行，尤其是地方建設與社福方案。",
      next: "補上各委員會凍結案明細與表決紀錄。",
      tags: ["預算", "國會", "財政"],
    },
    {
      id: "housing-rent-index",
      topic: "housing",
      title: "租屋補貼制度調整，申請資格與租金轉嫁疑慮待追蹤",
      status: "追蹤中",
      updated: "2026-05-18",
      image: "assets/housing.png",
      summary:
        "整理租屋補貼申請資格、補助級距、預算來源與地方執行差異，並追蹤新制對青年與弱勢家庭的影響。",
      facts: [
        ["影響對象", "租屋族、青年、育兒家庭"],
        ["核心爭點", "資格門檻與房租推升疑慮"],
        ["觀察指標", "申請通過率、平均租金、地方配套"],
      ],
      sources: ["政府公報", "地方住宅處公告", "立法院質詢"],
      support:
        "支持方主張補貼能降低短期居住壓力，並讓弱勢租屋族有更穩定的居住選擇。",
      concern:
        "疑慮方擔心補貼被轉嫁到租金，若供給沒有增加，長期效果會被削弱。",
      next: "補上各縣市申請數、通過率與近一年租金變化。",
      tags: ["租屋", "青年", "社會住宅"],
    },
    {
      id: "energy-grid",
      topic: "energy",
      title: "電網韌性與區域供電，儲能建設進度受關注",
      status: "更新中",
      updated: "2026-05-17",
      image: "assets/energy.png",
      summary:
        "追蹤電網強化預算、區域供電風險、儲能建設與停電事故檢討，整理各方對能源安全的主張。",
      facts: [
        ["影響對象", "家庭用戶、製造業、地方政府"],
        ["核心爭點", "供電穩定與能源組合"],
        ["觀察指標", "停電次數、備轉容量、儲能裝置量"],
      ],
      sources: ["能源主管機關資料", "電力公司說明", "委員會紀錄"],
      support:
        "支持方認為擴充電網和儲能能降低區域事故擴散，提升供電韌性。",
      concern:
        "疑慮方關注預算執行效率、施工期程，以及電價是否反映成本。",
      next: "建立重大停電影響區域表，補入年度預算與實際執行率。",
      tags: ["電價", "供電", "儲能"],
    },
    {
      id: "transport-pass",
      topic: "transport",
      title: "通勤月票補助續辦，跨縣市分攤比例仍待協調",
      status: "待查核",
      updated: "2026-05-16",
      image: "assets/transport.png",
      summary:
        "整理通勤月票補助金額、中央與地方分攤比例、運量變化，以及偏鄉與跨縣市通勤族的覆蓋率。",
      facts: [
        ["影響對象", "跨縣市通勤族、學生、上班族"],
        ["核心爭點", "財源穩定與公平性"],
        ["觀察指標", "搭乘量、補助成本、私人運具移轉率"],
      ],
      sources: ["交通主管機關統計", "地方議會紀錄", "營運單位資料"],
      support:
        "支持方認為月票可降低通勤成本，並提升大眾運輸使用率。",
      concern:
        "疑慮方認為補助可能集中在都會區，偏鄉服務密度不足時受益有限。",
      next: "補上各生活圈月票使用量與補助分攤表。",
      tags: ["通勤", "公共運輸", "地方財政"],
    },
    {
      id: "labor-minimum-wage",
      topic: "labor",
      title: "最低工資調整機制，物價指標與企業成本拉鋸",
      status: "追蹤中",
      updated: "2026-05-14",
      image: "assets/labor.png",
      summary:
        "整理最低工資審議流程、物價指標、產業承受度與勞資雙方主張。",
      facts: [
        ["影響對象", "基層勞工、中小企業"],
        ["核心爭點", "實質薪資與企業成本"],
        ["觀察指標", "CPI、失業率、受僱人數"],
      ],
      sources: ["勞動統計", "審議會資料", "產業團體聲明"],
      support:
        "支持方主張工資應反映物價上漲，避免低薪勞工實質購買力下滑。",
      concern:
        "疑慮方關注中小企業成本與服務業價格轉嫁。",
      next: "建立歷年調幅、物價與基本生活費對照表。",
      tags: ["薪資", "物價", "勞資"],
    },
    {
      id: "education-digital",
      topic: "education",
      title: "校園數位設備採購，維護成本與使用率需公開",
      status: "資料蒐集",
      updated: "2026-05-13",
      image: "assets/education.png",
      summary:
        "追蹤校園數位設備預算、採購標準、維護成本與城鄉資源差距。",
      facts: [
        ["影響對象", "學生、教師、地方教育局"],
        ["核心爭點", "設備使用率與維護成本"],
        ["觀察指標", "採購單價、維修率、師生比"],
      ],
      sources: ["教育預算書", "採購公告", "地方審議紀錄"],
      support:
        "支持方認為數位設備可改善學習資源，縮短城鄉差距。",
      concern:
        "疑慮方認為採購後的維護、人員訓練和課程整合更關鍵。",
      next: "補齊採購案清單與設備到校後使用情況。",
      tags: ["教育預算", "採購", "數位學習"],
    },
  ],
  people: [
    {
      id: "lin-policy",
      name: "林政遠",
      role: "立法委員",
      area: "北部都會區",
      focus: "居住、交通",
      stance: "主張社宅供給與通勤補助並行",
      related: ["housing-rent-index", "transport-pass"],
    },
    {
      id: "chen-energy",
      name: "陳雅庭",
      role: "地方首長",
      area: "中部縣市",
      focus: "能源、產業",
      stance: "主張電網投資需納入地方產業負載",
      related: ["energy-grid"],
    },
    {
      id: "wu-labor",
      name: "吳承安",
      role: "議員",
      area: "南部工業區",
      focus: "勞工、職安",
      stance: "關注最低工資與中小企業配套",
      related: ["labor-minimum-wage"],
    },
    {
      id: "hsu-education",
      name: "徐若晴",
      role: "教育委員",
      area: "東部地區",
      focus: "教育、地方資源",
      stance: "主張設備採購需同步公開使用成效",
      related: ["education-digital"],
    },
  ],
  timeline: [
    {
      date: "2026-05-18",
      topic: "budget",
      title: "總預算案審查條目建立",
      description: "加入支出凍結、地方建設與社福支出三個追蹤軸。",
    },
    {
      date: "2026-05-18",
      topic: "housing",
      title: "租屋補貼新制版本更新",
      description: "新增地方執行差異欄位，標記觀察指標。",
    },
    {
      date: "2026-05-17",
      topic: "energy",
      title: "電網韌性條目加入預算欄",
      description: "先建立預算、期程、區域三個追蹤軸。",
    },
    {
      date: "2026-05-16",
      topic: "transport",
      title: "通勤月票條目建立",
      description: "整理補助對象、地方分攤與運量指標。",
    },
  ],
};

const state = {
  content: seedContent,
  topic: "all",
  view: "overview",
  query: "",
  selectedArticle: seedContent.articles[0].id,
  armedArticle: null,
  timelinePersonId: null,
  timelineTopicId: null,
  topicOpen: false,
  articlePage: 1,
  peoplePage: 1,
};

const $ = (selector) => document.querySelector(selector);
const ARTICLES_PER_PAGE = 12;
const PEOPLE_PER_PAGE = 8;
const FIREBASE_INITIAL_WAIT_MS = 900;
const FIREBASE_BACKGROUND_WAIT_MS = 10000;
let firebaseContentSyncStarted = false;
const escapeHtml = window.PolicyPulseUtils?.escapeHtml || ((value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;"));

const topicName = (id) =>
  state.content.topics.find((topic) => topic.id === id)?.name || id;

const topicImage = (id) =>
  state.content.topics.find((topic) => topic.id === id)?.image || "assets/podium.png";

const articleUrl = window.PolicyPulseUtils?.articleUrl || ((id) => {
  const encodedId = encodeURIComponent(id);
  const host = window.location?.hostname || "";
  const isLocal = host === "localhost" || host === "127.0.0.1" || host === "";
  return isLocal ? `/article.html?id=${encodedId}` : `/articles/${encodedId}`;
});

const articleImage = (article) =>
  window.PolicyPulseVisuals?.articleImage?.(article, topicName(article.topic)) ||
  article.image ||
  topicImage(article.topic);

const defaultTopicNames = {
  budget: "財經",
  housing: "居住",
  energy: "能源",
  transport: "交通",
  labor: "勞工",
  education: "教育",
};

const defaultTopicImages = {
  budget: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=900&q=80",
  housing: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=900&q=80",
  energy: "https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=900&q=80",
  transport: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=900&q=80",
  labor: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80",
  education: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=900&q=80",
};

const matchText = (values) =>
  values
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(state.query.trim().toLowerCase());

const filteredArticles = () =>
  state.content.articles.filter((article) => {
    const topicMatch = state.topic === "all" || article.topic === state.topic;
    const queryMatch =
      !state.query ||
      matchText([
        article.title,
        article.summary,
        article.status,
        topicName(article.topic),
        article.tags.join(" "),
      ]);
    return topicMatch && queryMatch;
  });

const selectedArticle = () =>
  state.content.articles.find((article) => article.id === state.selectedArticle) ||
  state.content.articles[0];

function readWatchlistIds() {
  if (window.PolicyPulseWatchlist?.read) {
    return window.PolicyPulseWatchlist.read();
  }
  try {
    return JSON.parse(localStorage.getItem("policy_pulse_watchlist") || "[]")
      .map((id) => String(id || "").trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function resetArticlePage() {
  state.articlePage = 1;
}

function resetPeoplePage() {
  state.peoplePage = 1;
}

function mergeByKey(baseItems = [], extraItems = [], keyForItem = (item) => item.id) {
  const merged = new Map();
  baseItems.forEach((item) => merged.set(keyForItem(item), item));
  extraItems.forEach((item) => merged.set(keyForItem(item), { ...merged.get(keyForItem(item)), ...item }));
  return [...merged.values()];
}

function mergePriorityByKey(priorityItems = [], fallbackItems = [], keyForItem = (item) => item.id) {
  const merged = new Map();
  priorityItems.forEach((item) => merged.set(keyForItem(item), item));
  fallbackItems.forEach((item) => {
    const key = keyForItem(item);
    if (!merged.has(key)) {
      merged.set(key, item);
    } else {
      merged.set(key, { ...item, ...merged.get(key) });
    }
  });
  return [...merged.values()];
}

function dateValue(value) {
  const time = Date.parse(value || "");
  return Number.isFinite(time) ? time : 0;
}

function sortArticles(items = []) {
  return [...items].sort((a, b) => {
    const bTime = dateValue(b.publishedAt || b.reviewedAt || b.updated);
    const aTime = dateValue(a.publishedAt || a.reviewedAt || a.updated);
    return bTime - aTime || String(b.id || "").localeCompare(String(a.id || ""));
  });
}

function sortTimeline(items = []) {
  return [...items].sort((a, b) => {
    const bTime = dateValue(b.publishedAt || b.date);
    const aTime = dateValue(a.publishedAt || a.date);
    return bTime - aTime || String(b.id || "").localeCompare(String(a.id || ""));
  });
}

function mergeContent(base, extra = {}) {
  return {
    ...base,
    ...extra,
    topics: mergeByKey(base.topics || [], extra.topics || []),
    sources: mergeByKey(base.sources || [], extra.sources || []),
    articles: sortArticles(mergePriorityByKey(extra.articles || [], base.articles || [])),
    people: mergeByKey(base.people || [], extra.people || []),
    timeline: sortTimeline(mergePriorityByKey(
      extra.timeline || [],
      base.timeline || [],
      (item) => item.id || `${item.date}-${item.articleId || item.title}`,
    )),
  };
}

function topicsFromAutomationConfig(config = {}) {
  return Object.keys(config.topicKeywords || {}).map((id) => ({
    id,
    name: config.topicNames?.[id] || defaultTopicNames[id] || id,
    image: defaultTopicImages[id] || "assets/podium.png",
  }));
}

function peopleFromAutomationConfig(config = {}) {
  const areaOrder = ["北部", "中部", "南部", "東部"];
  const people = Array.isArray(config.people) ? config.people : [];
  return people
    .filter((person) => person.id && person.name)
    .map((person) => ({
      id: person.id,
      name: person.name,
      role: person.role || "公共人物",
      area: person.area || person.region || "未分區",
      focus: person.focus || "",
      stance: person.stance || "待補公開主張與來源紀錄",
      related: Array.isArray(person.related) ? person.related : [],
      topicHints: Array.isArray(person.topicHints) ? person.topicHints : [],
    }))
    .sort((a, b) => {
      const areaA = areaOrder.indexOf(a.area);
      const areaB = areaOrder.indexOf(b.area);
      const rankA = areaA === -1 ? areaOrder.length : areaA;
      const rankB = areaB === -1 ? areaOrder.length : areaB;
      return rankA - rankB || a.name.localeCompare(b.name, "zh-Hant");
    });
}

function normalizeTopicOrder(topics = []) {
  const all = topics.find((topic) => topic.id === "all");
  const rest = topics.filter((topic) => topic.id !== "all");
  return all ? [all, ...rest] : rest;
}

async function mergeAutomationConfig() {
  try {
    const response = await fetch("content/automation-config.json", { cache: "no-store" });
    if (!response.ok) return;
    const config = await response.json();
    const configTopics = topicsFromAutomationConfig(config);
    if (configTopics.length) {
      state.content.topics = normalizeTopicOrder(mergeByKey(state.content.topics, configTopics));
    }
    const configPeople = peopleFromAutomationConfig(config);
    if (configPeople.length) {
      state.content.people = mergePriorityByKey(configPeople, state.content.people || []);
    }
  } catch {
    // Automation config is optional; built-in content keeps the site usable.
  }
}

function withTimeout(promise, timeoutMs, fallback = null) {
  if (!promise || typeof promise.then !== "function") return Promise.resolve(promise);
  let timer;
  const timeout = new Promise((resolve) => {
    timer = window.setTimeout(() => resolve(fallback), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timer));
}

async function loadFirebasePublishedContent(timeoutMs) {
  const api = await withTimeout(window.PolicyPulseFirebaseReady, timeoutMs, null);
  if (!api?.enabled) return null;
  return withTimeout(api.loadPublishedContent(), timeoutMs, null);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

async function loadContent() {
  state.content = mergeContent(seedContent, window.PolicyPulseGeneratedContent || {});
  try {
    const response = await fetch("content/articles.json", { cache: "no-store" });
    if (response.ok) {
      const remote = await response.json();
      state.content = mergeContent(state.content, remote);
    }
  } catch {
    // Direct file opening blocks JSON fetch in many browsers. The embedded seed data keeps the site usable.
  }
  await mergeAutomationConfig();
  try {
    const firebaseContent = await loadFirebasePublishedContent(FIREBASE_INITIAL_WAIT_MS);
    if (firebaseContent) state.content = mergeContent(state.content, firebaseContent);
  } catch {
    // Firebase is optional. Static content remains available when it is not configured.
  }
  state.selectedArticle = state.content.articles[0]?.id || state.selectedArticle;
  window.PolicyPulseContent = state.content;
}

async function syncFirebaseContentInBackground() {
  if (firebaseContentSyncStarted) return;
  firebaseContentSyncStarted = true;
  try {
    const firebaseContent = await loadFirebasePublishedContent(FIREBASE_BACKGROUND_WAIT_MS);
    if (!firebaseContent) return;
    const previousIds = new Set(state.content.articles.map((article) => article.id));
    state.content = mergeContent(state.content, firebaseContent);
    const hasNewContent = state.content.articles.some((article) => !previousIds.has(article.id));
    window.PolicyPulseContent = state.content;
    if (hasNewContent) {
      state.selectedArticle = state.content.articles[0]?.id || state.selectedArticle;
      resetArticlePage();
      resetPeoplePage();
      render();
    }
  } catch {
    // The site remains usable with embedded content when Firebase is unavailable.
  }
}

function renderTopicFilters() {
  const container = $("#topicFilters");
  container.innerHTML = "";
  container.hidden = !state.topicOpen;

  const topicPanel = $(".topic-panel");
  topicPanel.classList.toggle("is-open", state.topicOpen);

  const toggle = $("#topicToggle");
  toggle.setAttribute("aria-expanded", String(state.topicOpen));
  $(".toggle-icon").textContent = state.topicOpen ? "−" : "+";

  state.content.topics.forEach((topic) => {
    const count =
      topic.id === "all"
        ? state.content.articles.length
        : state.content.articles.filter((article) => article.topic === topic.id).length;
    const button = el("button", "filter-chip", "");
    button.type = "button";
    button.classList.toggle("is-active", state.topic === topic.id);
    button.innerHTML = `<span>${escapeHtml(topic.name)}</span><span>${count}</span>`;
    button.addEventListener("click", () => {
      state.topic = topic.id;
      resetArticlePage();
      resetPeoplePage();
      const first = filteredArticles()[0];
      if (first) state.selectedArticle = first.id;
      render();
    });
    container.append(button);
  });
}

function renderFeatured() {
  const article = selectedArticle();
  const image = articleImage(article);
  const featured = $("#featuredStory");
  featured.innerHTML = `
    <img src="${escapeHtml(image)}" alt="${escapeHtml(topicName(article.topic))}議題封面" decoding="async" fetchpriority="high" />
    <div class="featured-overlay">
      <span class="topic-badge">${escapeHtml(topicName(article.topic))}</span>
      <h1>${escapeHtml(article.title)}</h1>
      <p>${escapeHtml(article.summary)}</p>
    </div>
  `;
  featured.tabIndex = 0;
  featured.setAttribute("role", "link");
  featured.setAttribute("aria-label", `閱讀全文：${article.title}`);
  featured.onclick = () => openArticle(article.id);
  featured.onkeydown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openArticle(article.id);
    }
  };
}

function renderHeadlines() {
  const container = $("#headlineList");
  const list = filteredArticles().slice(0, 7);
  container.innerHTML = "";

  list.forEach((article) => {
    const button = el("button", "headline-item");
    button.type = "button";
    button.classList.toggle("is-selected", article.id === state.selectedArticle);
    button.innerHTML = `
      <strong>${escapeHtml(article.title)}</strong>
      <span>${escapeHtml(article.summary)}</span>
    `;
    button.addEventListener("click", () => previewOrOpenArticle(article.id));
    container.append(button);
  });
}

function renderWatchList() {
  const container = $(".watch-list");
  if (!container) return;
  const ids = [...readWatchlistIds()].reverse();
  const articleMap = new Map(state.content.articles.map((article) => [article.id, article]));
  const watched = ids.map((id) => articleMap.get(id)).filter(Boolean);

  if (!ids.length) {
    container.innerHTML = `
      <div class="watch-empty">
        <strong>追蹤清單目前是空的</strong>
        <span>到文章頁按「追蹤此議題」後，會出現在這裡。</span>
      </div>
    `;
    return;
  }

  if (!watched.length) {
    container.innerHTML = `
      <div class="watch-empty">
        <strong>追蹤資料同步中</strong>
        <span>已找到追蹤紀錄，但目前沒有對應的公開文章。</span>
      </div>
    `;
    return;
  }

  container.innerHTML = watched
    .slice(0, 6)
    .map(
      (article) => `
        <button class="watch-row" data-article="${escapeHtml(article.id)}" type="button">
          <span>${escapeHtml(topicName(article.topic))}</span>
          <strong>${escapeHtml(article.title)}</strong>
        </button>
      `,
    )
    .join("");
}

function renderSearchSummary(totalItems) {
  const summary = $("#searchSummary");
  if (!summary) return;

  const query = state.query.trim();
  if (!query) {
    summary.hidden = true;
    summary.innerHTML = "";
    return;
  }

  const topicLabel = state.topic === "all" ? "全部議題" : topicName(state.topic);
  summary.hidden = false;
  summary.innerHTML = `
    <div>
      <p class="eyebrow">Search Results</p>
      <h2>「${escapeHtml(query)}」搜尋結果</h2>
      <p>目前在 ${escapeHtml(topicLabel)} 中找到 ${totalItems} 篇相關文章。你可以先點一次標題預覽，第二次再進入完整文章。</p>
    </div>
    <span class="search-count">${totalItems} 篇</span>
  `;
}

function renderArticles() {
  const container = $("#articleGrid");
  const pagination = $("#articlePagination");
  const list = filteredArticles();
  container.innerHTML = "";
  $("#activeTopicLabel").textContent = topicName(state.topic);
  renderSearchSummary(list.length);

  if (!list.length) {
    container.append(el("div", "empty-state", "目前沒有符合條件的條目。"));
    if (pagination) pagination.innerHTML = "";
    return;
  }

  const createFeedAd = () => null;

  const totalPages = Math.max(1, Math.ceil(list.length / ARTICLES_PER_PAGE));
  state.articlePage = Math.min(Math.max(1, state.articlePage), totalPages);
  const pageStart = (state.articlePage - 1) * ARTICLES_PER_PAGE;
  const pageItems = list.slice(pageStart, pageStart + ARTICLES_PER_PAGE);
  const adInsertIndex = pageItems.length > 3 ? 2 : Math.max(0, pageItems.length - 2);

  pageItems.forEach((article, index) => {
    const button = el("button", "article-card", "");
    button.type = "button";
    button.classList.toggle("is-selected", article.id === state.selectedArticle);
    button.innerHTML = `
      <img class="thumb" src="${escapeHtml(articleImage(article))}" alt="${escapeHtml(topicName(article.topic))}議題縮圖" loading="lazy" decoding="async" />
      <span class="card-content">
        <span class="card-kicker">
          <span>${escapeHtml(topicName(article.topic))}</span>
          <span>${escapeHtml(article.updated)}</span>
        </span>
        <h3>${escapeHtml(article.title)}</h3>
        <p>${escapeHtml(article.summary)}</p>
        <span class="tag-row">
          ${article.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
        </span>
      </span>
    `;
    button.addEventListener("click", () => previewOrOpenArticle(article.id));
    container.append(button);
    if (pageItems.length > 1 && index === adInsertIndex) {
      const feedAd = createFeedAd();
      if (feedAd) container.append(feedAd);
    }
  });

  renderArticlePagination(list.length, totalPages);
}

function renderArticlePagination(totalItems, totalPages) {
  const pagination = $("#articlePagination");
  if (!pagination) return;

  if (totalPages <= 1) {
    pagination.innerHTML = "";
    return;
  }

  const pageNumbers = Array.from({ length: totalPages })
    .map((_, index) => index + 1)
    .filter((page) => {
      return page === 1 || page === totalPages || Math.abs(page - state.articlePage) <= 1;
    });

  const items = [];
  pageNumbers.forEach((page, index) => {
    if (index && page - pageNumbers[index - 1] > 1) {
      items.push(`<span class="pagination-gap" aria-hidden="true">...</span>`);
    }
    items.push(`
      <button class="pagination-page ${page === state.articlePage ? "is-active" : ""}" data-page="${page}" type="button" ${page === state.articlePage ? 'aria-current="page"' : ""}>
        ${page}
      </button>
    `);
  });

  const pageStart = (state.articlePage - 1) * ARTICLES_PER_PAGE + 1;
  const pageEnd = Math.min(totalItems, state.articlePage * ARTICLES_PER_PAGE);
  pagination.innerHTML = `
    <div class="pagination-summary">
      第 ${state.articlePage} / ${totalPages} 頁・顯示 ${pageStart}-${pageEnd} 篇，共 ${totalItems} 篇
    </div>
    <div class="pagination-controls">
      <button class="pagination-button" data-page="${state.articlePage - 1}" type="button" ${state.articlePage === 1 ? "disabled" : ""}>
        上一頁
      </button>
      ${items.join("")}
      <button class="pagination-button" data-page="${state.articlePage + 1}" type="button" ${state.articlePage === totalPages ? "disabled" : ""}>
        下一頁
      </button>
    </div>
  `;

  pagination.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      const page = Number(button.dataset.page);
      if (!Number.isFinite(page) || page < 1 || page > totalPages || page === state.articlePage) return;
      state.articlePage = page;
      renderArticles();
      $("#articleGrid")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function renderIssueMap() {
  const container = $("#issueMap");
  container.innerHTML = "";
  state.content.topics
    .filter((topic) => topic.id !== "all")
    .forEach((topic) => {
      const count = state.content.articles.filter(
        (article) => article.topic === topic.id,
      ).length;
      const card = el("article", "issue-card");
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", `查看${topic.name}相關文章`);
      const image =
        window.PolicyPulseVisuals?.realPhotoCover?.(
          {
            id: topic.id,
            topic: topic.id,
            title: topic.name,
            summary: topic.description,
            updated: new Date().toISOString().slice(0, 10),
          },
          topic.name,
        ) || topic.image;
      card.innerHTML = `
        <img src="${escapeHtml(image)}" alt="${escapeHtml(topic.name)}議題示意圖" loading="lazy" decoding="async" />
        <p class="eyebrow">${escapeHtml(topic.id)}</p>
        <h3>${escapeHtml(topic.name)}</h3>
        <p>${escapeHtml(topic.description)}</p>
        <span class="issue-count">${count} 個條目</span>
      `;
      card.addEventListener("click", () => showTopicTimeline(topic.id));
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          showTopicTimeline(topic.id);
        }
      });
      container.append(card);
  });
}

function articleMatchesPerson(article, person) {
  const directRelated = Array.isArray(person.related) && person.related.includes(article.id);
  const personIds = Array.isArray(article.personIds) ? article.personIds : [];
  const people = Array.isArray(article.people) ? article.people : [];
  return directRelated ||
    personIds.includes(person.id) ||
    people.some((item) => item?.id === person.id);
}

function relatedArticlesForPerson(person) {
  return state.content.articles.filter((article) => articleMatchesPerson(article, person));
}

function renderPeople() {
  const container = $("#peopleList");
  const pagination = $("#peoplePagination");
  const list = state.content.people.filter((person) => {
    if (!state.query) return true;
    return matchText([person.name, person.role, person.area, person.focus, person.stance]);
  });
  container.innerHTML = "";

  if (!list.length) {
    container.append(el("div", "empty-state", "目前沒有符合條件的人物。"));
    if (pagination) pagination.innerHTML = "";
    return;
  }

  const totalPages = Math.max(1, Math.ceil(list.length / PEOPLE_PER_PAGE));
  state.peoplePage = Math.min(Math.max(1, state.peoplePage), totalPages);
  const pageStart = (state.peoplePage - 1) * PEOPLE_PER_PAGE;
  const pageItems = list.slice(pageStart, pageStart + PEOPLE_PER_PAGE);

  pageItems.forEach((person) => {
    const relatedArticles = relatedArticlesForPerson(person);
    const button = el("button", "person-card", "");
    button.type = "button";
    button.innerHTML = `
      <span class="card-kicker">
        <span>${escapeHtml(person.role)}</span>
        <span>${escapeHtml(person.area)}</span>
      </span>
      <h3>${escapeHtml(person.name)}</h3>
      <p>${escapeHtml(person.stance)}</p>
      <div class="person-meta">
        <span>關注議題<strong>${escapeHtml(person.focus)}</strong></span>
        <span>相關條目<strong>${relatedArticles.length}</strong></span>
      </div>
    `;
    button.addEventListener("click", () => {
      const firstRelated = relatedArticles[0];
      if (firstRelated) selectArticle(firstRelated.id);
    });
    button.addEventListener("dblclick", () => showPersonTimeline(person.id));
    container.append(button);
  });

  renderPeoplePagination(list.length, totalPages);
}

function renderPeoplePagination(totalItems, totalPages) {
  const pagination = $("#peoplePagination");
  if (!pagination) return;

  if (totalPages <= 1) {
    pagination.innerHTML = "";
    return;
  }

  const pageNumbers = Array.from({ length: totalPages })
    .map((_, index) => index + 1)
    .filter((page) => page === 1 || page === totalPages || Math.abs(page - state.peoplePage) <= 1);

  const items = [];
  pageNumbers.forEach((page, index) => {
    if (index && page - pageNumbers[index - 1] > 1) {
      items.push(`<span class="pagination-gap" aria-hidden="true">...</span>`);
    }
    items.push(`
      <button class="pagination-page ${page === state.peoplePage ? "is-active" : ""}" data-people-page="${page}" type="button" ${page === state.peoplePage ? 'aria-current="page"' : ""}>
        ${page}
      </button>
    `);
  });

  const pageStart = (state.peoplePage - 1) * PEOPLE_PER_PAGE + 1;
  const pageEnd = Math.min(totalItems, state.peoplePage * PEOPLE_PER_PAGE);
  pagination.innerHTML = `
    <div class="pagination-summary">
      第 ${state.peoplePage} / ${totalPages} 頁・顯示 ${pageStart}-${pageEnd} 位，共 ${totalItems} 位
    </div>
    <div class="pagination-controls">
      <button class="pagination-button" data-people-page="${state.peoplePage - 1}" type="button" ${state.peoplePage === 1 ? "disabled" : ""}>
        上一頁
      </button>
      ${items.join("")}
      <button class="pagination-button" data-people-page="${state.peoplePage + 1}" type="button" ${state.peoplePage === totalPages ? "disabled" : ""}>
        下一頁
      </button>
    </div>
  `;

  pagination.querySelectorAll("[data-people-page]").forEach((button) => {
    button.addEventListener("click", () => {
      const page = Number(button.dataset.peoplePage);
      if (!Number.isFinite(page) || page < 1 || page > totalPages || page === state.peoplePage) return;
      state.peoplePage = page;
      renderPeople();
      $("#peopleList")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function showPersonArticles(personId) {
  const person = state.content.people.find((item) => item.id === personId);
  if (!person) return;

  const relatedArticles = relatedArticlesForPerson(person);

  window.PolicyPulseStats?.record("person_related_open", {
    id: person.id,
    name: person.name,
    count: relatedArticles.length,
  });

  document.querySelector("#personArticleDialog")?.remove();

  const dialog = document.createElement("section");
  dialog.id = "personArticleDialog";
  dialog.className = "modal-backdrop";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-label", `${person.name} 相關文章`);
  dialog.innerHTML = `
    <article class="related-dialog">
      <div class="related-head">
        <div>
          <p class="eyebrow">Related Articles</p>
          <h2>${escapeHtml(person.name)} 的相關文章</h2>
          <p>${escapeHtml(person.stance)}</p>
        </div>
        <button class="modal-close" type="button" aria-label="關閉">×</button>
      </div>
      <div class="related-list">
        ${
          relatedArticles.length
            ? relatedArticles
                .map(
                  (article) => `
                    <button class="related-row" data-article="${escapeHtml(article.id)}" type="button">
                      <time>${escapeHtml(article.updated)}</time>
                      <span>
                        <small>${escapeHtml(topicName(article.topic))}</small>
                        <strong>${escapeHtml(article.title)}</strong>
                        <em>${escapeHtml(article.summary)}</em>
                      </span>
                    </button>
                  `,
                )
                .join("")
            : `<div class="empty-state">目前沒有關聯文章。</div>`
        }
      </div>
    </article>
  `;

  document.body.append(dialog);

  const closeDialog = () => dialog.remove();
  dialog.querySelector(".modal-close").addEventListener("click", closeDialog);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeDialog();
  });
  dialog.querySelectorAll(".related-row").forEach((row) => {
    row.addEventListener("click", () => openArticle(row.dataset.article));
  });

  const closeOnEscape = (event) => {
    if (event.key === "Escape") {
      closeDialog();
      document.removeEventListener("keydown", closeOnEscape);
    }
  };
  document.addEventListener("keydown", closeOnEscape);
}

function renderTimeline() {
  const container = $("#timelineList");
  const list = state.content.timeline.filter((item) => {
    const topicMatch = state.topic === "all" || item.topic === state.topic;
    const queryMatch =
      !state.query || matchText([item.title, item.description, topicName(item.topic)]);
    return topicMatch && queryMatch;
  });
  container.innerHTML = "";

  if (!list.length) {
    container.append(el("div", "empty-state", "目前沒有符合條件的事件。"));
    return;
  }

  list.forEach((item) => {
    const article = el("article", "timeline-item");
    article.innerHTML = `
      <time>${escapeHtml(item.date)}</time>
      <div>
        <p class="eyebrow">${escapeHtml(topicName(item.topic))}</p>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.description)}</p>
      </div>
    `;
    container.append(article);
  });
}

function showPersonTimeline(personId) {
  const person = state.content.people.find((item) => item.id === personId);
  if (!person) return;

  state.timelinePersonId = person.id;
  state.timelineTopicId = null;
  window.PolicyPulseStats?.record("person_timeline_open", {
    id: person.id,
    name: person.name,
    count: relatedArticlesForPerson(person).length,
  });
  switchView("timeline");
  renderTimeline();
  document.querySelector("#viewTimeline")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function showTopicTimeline(topicId) {
  const topic = state.content.topics.find((item) => item.id === topicId);
  if (!topic || topic.id === "all") return;

  state.timelinePersonId = null;
  state.timelineTopicId = topic.id;
  window.PolicyPulseStats?.record("topic_timeline_open", {
    id: topic.id,
    name: topic.name,
  });
  switchView("timeline");
  renderTimeline();
  document.querySelector("#viewTimeline")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function renderTimeline() {
  const container = $("#timelineList");
  const selectedPerson = state.timelinePersonId
    ? state.content.people.find((person) => person.id === state.timelinePersonId)
    : null;
  const selectedTopic = state.timelineTopicId
    ? state.content.topics.find((topic) => topic.id === state.timelineTopicId)
    : null;
  const title = $("#timelineTitle");
  if (title) {
    title.textContent = selectedPerson
      ? selectedPerson.name
      : selectedTopic
        ? selectedTopic.name
        : "事件時間線";
  }

  const list = selectedPerson
    ? relatedArticlesForPerson(selectedPerson)
        .map((article) => ({
          articleId: article.id,
          date: article.updated,
          topic: article.topic,
          title: article.title,
          description: article.summary,
        }))
    : selectedTopic
      ? state.content.articles
          .filter((article) => article.topic === selectedTopic.id)
          .map((article) => ({
            articleId: article.id,
            date: article.updated,
            topic: article.topic,
            title: article.title,
            description: article.summary,
          }))
    : state.content.timeline.filter((item) => {
        const topicMatch = state.topic === "all" || item.topic === state.topic;
        const queryMatch =
          !state.query ||
          matchText([item.title, item.description, topicName(item.topic)]);
        return topicMatch && queryMatch;
      });

  container.innerHTML = "";

  if (!list.length) {
    container.append(el("div", "empty-state", "目前沒有符合條件的事件。"));
    return;
  }

  list.forEach((item) => {
    const row = el("article", "timeline-item");
    if (item.articleId) {
      row.classList.add("timeline-link");
      row.tabIndex = 0;
      row.setAttribute("role", "link");
      row.addEventListener("click", () => openArticle(item.articleId));
      row.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openArticle(item.articleId);
        }
      });
    }
    row.innerHTML = `
      <time>${escapeHtml(item.date)}</time>
      <div>
        <p class="eyebrow">${escapeHtml(topicName(item.topic))}</p>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.description)}</p>
      </div>
    `;
    container.append(row);
  });
}

function renderSources() {
  const container = $("#sourceList");
  container.innerHTML = "";

  state.content.sources.forEach((source) => {
    const card = el("article", "source-card");
    card.innerHTML = `
      <p class="eyebrow">${escapeHtml(source.reliability)}</p>
      <h3>${escapeHtml(source.title)}</h3>
      <p class="source-description">${escapeHtml(source.description)}</p>
      <dl class="source-grid">
        <div>
          <dt>涵蓋範圍</dt>
          <dd>${escapeHtml(source.scope || "依議題補充來源範圍。")}</dd>
        </div>
        <div>
          <dt>使用方式</dt>
          <dd>${escapeHtml(source.use || "作為文章查核與脈絡整理依據。")}</dd>
        </div>
        <div>
          <dt>更新節奏</dt>
          <dd>${escapeHtml(source.update || "依資料發布與議題熱度更新。")}</dd>
        </div>
      </dl>
      ${
        Array.isArray(source.checks) && source.checks.length
          ? `<ul class="source-checklist">${source.checks
              .map((item) => `<li>${escapeHtml(item)}</li>`)
              .join("")}</ul>`
          : ""
      }
    `;
    container.append(card);
  });
}

function renderDetail() {
  const article = selectedArticle();
  $("#detailTitle").textContent = article.title;
  $("#detailBody").innerHTML = `
    <p class="detail-summary">${escapeHtml(article.summary)}</p>
    <section class="detail-block">
      <h3>快速事實</h3>
      <ul>
        ${article.facts
          .map(
            ([label, value]) =>
              `<li><strong>${escapeHtml(label)}：</strong>${escapeHtml(value)}</li>`,
          )
          .join("")}
      </ul>
    </section>
    <section class="detail-block">
      <h3>支持方說法</h3>
      <p>${escapeHtml(article.support)}</p>
    </section>
    <section class="detail-block">
      <h3>疑慮與反對理由</h3>
      <p>${escapeHtml(article.concern)}</p>
    </section>
    <section class="detail-block">
      <h3>下一步補資料</h3>
      <p>${escapeHtml(article.next)}</p>
    </section>
    <section class="detail-block">
      <h3>來源</h3>
      <div>
        ${article.sources
          .map((source) => `<span class="source-pill">${escapeHtml(source)}</span>`)
          .join("")}
      </div>
    </section>
  `;
}

function switchView(view) {
  const changed = state.view !== view;
  state.view = view;
  if (view !== "timeline") {
    state.timelinePersonId = null;
    state.timelineTopicId = null;
  }
  if (changed) window.PolicyPulseStats?.record("view_switch", { view });
  document.querySelectorAll(".nav-tab").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === view);
  });
  document.querySelectorAll(".view").forEach((section) => {
    const expectedId = `view${view[0].toUpperCase()}${view.slice(1)}`;
    section.classList.toggle("is-active", section.id === expectedId);
  });
}

function selectArticle(id) {
  state.selectedArticle = id;
  state.armedArticle = id;
  const article = selectedArticle();
  window.PolicyPulseStats?.record("article_select", {
    id: article.id,
    title: article.title,
    topic: article.topic,
  });
  renderFeatured();
  renderHeadlines();
  renderArticles();
  renderDetail();
}

function previewOrOpenArticle(id) {
  if (state.armedArticle === id) {
    openArticle(id);
    return;
  }
  selectArticle(id);
}

function openArticle(id) {
  const article = state.content.articles.find((item) => item.id === id);
  if (article) {
    window.PolicyPulseStats?.record("article_open", {
      id: article.id,
      title: article.title,
      topic: article.topic,
    });
  }
  location.href = articleUrl(id);
}

function render() {
  renderTopicFilters();
  renderWatchList();
  renderFeatured();
  renderHeadlines();
  renderArticles();
  renderIssueMap();
  renderPeople();
  renderTimeline();
  renderSources();
  renderDetail();
  switchView(state.view);
}

function bindEvents() {
  document.querySelectorAll(".nav-tab").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.view === "timeline") {
        state.timelinePersonId = null;
        state.timelineTopicId = null;
      }
      switchView(button.dataset.view);
      if (button.dataset.view === "timeline") renderTimeline();
    });
  });

  $("#topicToggle").addEventListener("click", () => {
    state.topicOpen = !state.topicOpen;
    renderTopicFilters();
  });

  $("#siteSearch").addEventListener("input", (event) => {
    event.currentTarget.setCustomValidity("");
    state.query = event.target.value;
    resetArticlePage();
    resetPeoplePage();
    if (state.query.trim().length >= 2) {
      window.PolicyPulseStats?.record("search", { query: state.query.trim() });
    }
    const first = filteredArticles()[0];
    if (first) state.selectedArticle = first.id;
    render();
  });

  $("#siteSearchForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = $("#siteSearch");
    const query = input.value.trim();
    if (query && query.length < 2) {
      input.setCustomValidity("請輸入至少兩個字元進行搜尋");
      input.reportValidity();
      return;
    }
    input.setCustomValidity("");
  });

  $(".watch-list")?.addEventListener("click", (event) => {
    const button = event.target.closest(".watch-row");
    if (!button) return;
    state.view = "overview";
    selectArticle(button.dataset.article);
    switchView("overview");
  });

  document.addEventListener("policy-watchlist-change", renderWatchList);
  document.addEventListener("policy-auth-change", async () => {
    await withTimeout(window.PolicyPulseWatchlist?.syncFromCloud?.(), 1500, null);
    renderWatchList();
  });
}

async function init() {
  await loadContent();
  const initialSearch = new URLSearchParams(location.search).get("search");
  if (initialSearch) {
    state.query = initialSearch;
    resetArticlePage();
    resetPeoplePage();
    const searchInput = $("#siteSearch");
    if (searchInput) searchInput.value = initialSearch;
    const first = filteredArticles()[0];
    if (first) state.selectedArticle = first.id;
  }
  bindEvents();
  render();
  withTimeout(window.PolicyPulseWatchlist?.syncFromCloud?.(), 1500, null).then(renderWatchList);
  syncFirebaseContentInBackground();
}

window.PolicyPulseContent = seedContent;

if (document.querySelector("#articleGrid")) {
  init();
}
