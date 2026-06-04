(function installAdSenseReviewMode() {
  const REVIEW_IDS = [
    "budget-review",
    "housing-rent-index",
    "energy-grid",
    "transport-pass",
    "labor-minimum-wage",
    "education-digital",
  ];

  const topics = [
    { id: "all", name: "全部", description: "所有已整理條目", image: "assets/podium.png" },
    { id: "budget", name: "財經", description: "預算、稅制、補助、產業與物價", image: "assets/hero-market.png" },
    { id: "housing", name: "居住", description: "租屋、社宅、房價與都市更新", image: "assets/housing.png" },
    { id: "energy", name: "能源", description: "電價、電網、再生能源與供電安全", image: "assets/energy.png" },
    { id: "transport", name: "交通", description: "大眾運輸、通勤補助與道路安全", image: "assets/transport.png" },
    { id: "labor", name: "勞工", description: "薪資、工時、職安與社會保險", image: "assets/labor.png" },
    { id: "education", name: "教育", description: "學費、課綱、技職與高教資源", image: "assets/education.png" },
  ];

  function sectionsFor(config) {
    const facts = Array.isArray(config.facts) ? config.facts : [];
    const factBullets = facts.map((fact, index) => {
      if (Array.isArray(fact)) return `${fact[0] || `重點 ${index + 1}`}：${fact[1] || ""}`;
      return String(fact || "").trim();
    }).filter(Boolean);
    const sourceText = Array.isArray(config.sources) ? config.sources.join("、") : "公開資料";
    const positionRows = config.positionRows || [
      ["支持方", config.support || config.supportDetail, "檢查政策目標、預算來源與受益對象是否清楚"],
      ["疑慮方", config.concern || config.concernDetail, "檢查成本、執行能力、公平性與資訊透明度"],
      ["後續查核", config.next || config.indicators, `回查${sourceText}與後續正式公告`],
    ];
    const checkpoints = config.checkpoints || [
      "是否有正式公告、預算表或會議紀錄可供比對",
      "主管機關是否說明責任分工、期程與可量化指標",
      "地方執行資料或統計更新是否與原先說法一致",
    ];

    return [
      {
        heading: "事件摘要",
        paragraphs: [
          config.summary,
          `本文整理「${config.scope}」的公開資訊與主要爭點，重點放在可查證事實、不同立場與後續觀察指標，而不是單一新聞敘述。`,
        ],
      },
      {
        heading: "背景脈絡",
        paragraphs: [
          config.context,
          config.why,
        ],
      },
      {
        heading: "目前可確認事實",
        paragraphs: [
          config.confirmed,
          "以下列出目前可先檢查的基本面向，後續若出現新的正式文件，可再回頭比對是否有變化。",
        ],
        bullets: factBullets,
      },
      {
        heading: "各方主張比較",
        paragraphs: [
          "同一項政策通常會同時牽涉支持理由、疑慮理由與後續查核重點。本站將不同主張分開列示，避免把立場判斷寫成既定事實。",
        ],
        table: {
          headers: ["角色", "立場與主張", "需要檢查的資料"],
          rows: positionRows,
        },
      },
      {
        heading: "爭點分析",
        paragraphs: [
          config.supportDetail,
          config.concernDetail,
          "判讀這類爭點時，應把政策目的、執行成本、受影響群體與公開資料完整度分開檢查，才能避免只看單一陣營說法。",
        ],
      },
      {
        heading: "可能影響",
        paragraphs: [
          `${config.scope}後續可能影響民眾權益、地方執行負擔、預算配置或相關產業判斷。實際影響仍需看主管機關的執行期程與公開回報。`,
          config.next,
        ],
      },
      {
        heading: "後續觀察指標",
        paragraphs: [
          config.indicators,
          "這些指標可以幫助讀者看出政策是否只是宣布，或已經進入實際執行與檢討階段。",
        ],
        bullets: checkpoints,
      },
      {
        heading: "來源與限制",
        paragraphs: [
          `本文主要依據${sourceText}進行脈絡整理。新聞報導只作為事件發展補充，涉及金額、日期、程序或責任歸屬時，仍優先回查正式文件。`,
          "若不同來源說法不一致，本文會把爭點保留下來，並避免把尚未被正式文件支撐的說法寫成已確認結論。",
        ],
      },
    ];
  }

  function article(config) {
    return {
      ...config,
      reviewReady: true,
      sections: sectionsFor(config),
    };
  }

  const articles = [
    article({
      id: "budget-review",
      topic: "budget",
      title: "總預算案審查進入攻防，支出凍結與地方建設成焦點",
      status: "焦點",
      updated: "2026-06-04",
      image: "assets/hero-market.png",
      summary: "整理年度總預算審查中的主要爭點，包括凍結案、地方建設、社福支出與各黨團主張。",
      facts: [["影響對象", "中央部會、地方政府、納稅人"], ["核心爭點", "預算透明度與支出優先順序"], ["觀察指標", "凍結比例、刪減金額、附帶決議"]],
      sources: ["預算書", "委員會紀錄", "黨團聲明"],
      support: "支持方認為嚴格審查能提高財政紀律，避免預算流於形式。",
      concern: "疑慮方擔心過度凍結會影響行政執行，尤其是地方建設與社福方案。",
      next: "觀察各委員會凍結案明細、表決紀錄與主管機關回應。",
      tags: ["預算", "國會", "財政"],
      scope: "總預算審查",
      context: "總預算案是政府年度施政能否落地的關鍵文件，審查過程會同時牽動中央部會計畫、地方建設需求與納稅人的財政負擔。",
      why: "預算爭議常被簡化成刪減或護航，但真正需要看的是哪些項目被凍結、凍結理由是否清楚，以及主管機關能否提出可檢查的改善說明。",
      confirmed: "目前可確認的焦點集中在支出凍結、地方建設排序、社福支出穩定性與附帶決議的執行責任。",
      supportDetail: "支持嚴審的一方認為，要求部會說明計畫成效與預算用途，可以避免重複編列與執行率偏低的項目繼續擴張。",
      concernDetail: "保留意見的一方則擔心，若凍結比例過高或理由過於概括，可能使正在進行的公共服務與地方計畫延宕。",
      indicators: "後續可觀察凍結案解除條件、執行率、追加減預算需求，以及被要求提出書面報告的部會是否按期回覆。",
      reader: "若一項預算被凍結，讀者可以先看凍結理由是否具體，再看解凍條件是否能被客觀檢查。",
    }),
    article({
      id: "housing-rent-index",
      topic: "housing",
      title: "租屋補貼制度調整，申請資格與租金轉嫁疑慮受關注",
      status: "追蹤中",
      updated: "2026-06-04",
      image: "assets/housing.png",
      summary: "整理租屋補貼申請資格、補助級距、預算來源與地方執行差異，追蹤新制對青年與弱勢家庭的影響。",
      facts: [["影響對象", "租屋族、青年、育兒家庭"], ["核心爭點", "資格門檻與房租推升疑慮"], ["觀察指標", "申請通過率、平均租金、地方配套"]],
      sources: ["政府公報", "地方住宅處公告", "立法院質詢"],
      support: "支持方主張補貼能降低短期居住壓力，讓弱勢租屋族有更穩定的居住選擇。",
      concern: "疑慮方擔心補貼被轉嫁到租金，若供給沒有增加，長期效果會被削弱。",
      next: "觀察各縣市申請數、通過率與近一年租金變化。",
      tags: ["租屋", "青年", "社會住宅"],
      scope: "租屋補貼制度",
      context: "租屋補貼的目標是降低居住負擔，但補助金額、申請資格與房東端反應，都會影響政策實際效果。",
      why: "租屋市場資訊不透明，若補貼設計沒有搭配租金監測與供給政策，可能只解決短期支付壓力，卻沒有改善居住條件。",
      confirmed: "目前可先觀察補助級距、所得門檻、家庭條件、地方審查速度與補貼發放時間。",
      supportDetail: "支持方認為，對青年、育兒家庭與弱勢租屋者而言，穩定補貼能降低搬遷風險，也讓家庭預算更可預測。",
      concernDetail: "疑慮方關心補貼是否被房租吸收，以及沒有租約、租屋黑市或轉租情況是否讓真正需要的人難以申請。",
      indicators: "後續可觀察申請通過率、退件原因、租金指數、社宅供給量與地方政府審核時間。",
      reader: "讀者可以把補貼金額和當地租金變化一起看；若租金同步上升，就需要進一步檢查供給與稽核措施。",
    }),
    article({
      id: "energy-grid",
      topic: "energy",
      title: "電網韌性與區域供電，儲能建設進度受關注",
      status: "更新中",
      updated: "2026-06-04",
      image: "assets/energy.png",
      summary: "追蹤電網強化預算、區域供電風險、儲能建設與停電事故檢討，整理各方對能源安全的主張。",
      facts: [["影響對象", "家庭用戶、製造業、地方政府"], ["核心爭點", "供電穩定與能源組合"], ["觀察指標", "停電次數、備轉容量、儲能裝置量"]],
      sources: ["能源主管機關資料", "電力公司說明", "委員會紀錄"],
      support: "支持方認為擴充電網和儲能能降低區域事故擴散，提升供電韌性。",
      concern: "疑慮方關注預算執行效率、施工期程，以及電價是否反映成本。",
      next: "觀察重大停電影響區域、年度預算與實際執行率。",
      tags: ["電價", "供電", "儲能"],
      scope: "電網與儲能建設",
      context: "能源政策不只涉及發電量，也涉及輸配電系統、區域負載、儲能配置與事故回復能力。",
      why: "當用電需求提高、再生能源占比變動時，電網韌性會直接影響民生用電與產業投資判斷。",
      confirmed: "目前可確認的觀察面向包括電網投資預算、儲能建置進度、區域備援能力與停電事故後的檢討報告。",
      supportDetail: "支持投資的一方認為，提前強化電網可以降低事故擴散，也能讓再生能源更穩定地併入系統。",
      concernDetail: "疑慮方則會追問工程期程、採購效率、電價負擔與不同區域是否承擔不均。",
      indicators: "後續可觀察停電頻率、事故修復時間、儲能容量、尖峰負載與電網工程執行率。",
      reader: "若只看到供電充足的總量說法，仍要回到區域分布與事故回復能力，因為停電通常發生在具體的線路與節點。",
    }),
    article({
      id: "transport-pass",
      topic: "transport",
      title: "通勤月票補助續辦，跨縣市分攤比例仍需協調",
      status: "追蹤中",
      updated: "2026-06-04",
      image: "assets/transport.png",
      summary: "整理通勤月票補助金額、中央與地方分攤比例、運量變化，以及偏鄉與跨縣市通勤族的覆蓋率。",
      facts: [["影響對象", "跨縣市通勤族、學生、上班族"], ["核心爭點", "財源穩定與公平性"], ["觀察指標", "搭乘量、補助成本、私人運具移轉率"]],
      sources: ["交通主管機關統計", "地方議會紀錄", "營運單位資料"],
      support: "支持方認為月票可降低通勤成本，並提升大眾運輸使用率。",
      concern: "疑慮方認為補助可能集中在都會區，偏鄉服務密度不足時受益有限。",
      next: "觀察各生活圈月票使用量與補助分攤表。",
      tags: ["通勤", "公共運輸", "地方財政"],
      scope: "通勤月票補助",
      context: "通勤月票牽涉交通補貼、運具轉移、地方財政與生活圈整合，並不是單純票價優惠。",
      why: "如果月票降低了固定通勤成本，可能提升大眾運輸使用率；但若路線供給不足，補貼效果就會受到限制。",
      confirmed: "目前可先觀察各生活圈票價、使用人次、中央地方分攤比例與營運單位收入補償方式。",
      supportDetail: "支持方強調月票能減輕通勤族負擔，也可能讓部分民眾從私人運具轉向公共運輸。",
      concernDetail: "疑慮方擔心補助集中在公共運輸密度高的都會區，偏鄉居民即使有補貼，也可能因班次不足而難以受益。",
      indicators: "後續可觀察月票使用量、運量成長、地方負擔金額、路線班次與私人運具使用變化。",
      reader: "判斷月票政策時，可以同時看票價、班次、轉乘便利性與地方財政負擔，而不是只看折扣幅度。",
    }),
    article({
      id: "labor-minimum-wage",
      topic: "labor",
      title: "最低工資調整機制，物價指標與企業成本拉鋸",
      status: "追蹤中",
      updated: "2026-06-04",
      image: "assets/labor.png",
      summary: "整理最低工資審議流程、物價指標、產業承受度與勞資雙方主張。",
      facts: [["影響對象", "基層勞工、中小企業"], ["核心爭點", "實質薪資與企業成本"], ["觀察指標", "CPI、失業率、受僱人數"]],
      sources: ["勞動統計", "審議會資料", "產業團體聲明"],
      support: "支持方主張工資應反映物價上漲，避免低薪勞工實質購買力下滑。",
      concern: "疑慮方關注中小企業成本與服務業價格轉嫁。",
      next: "觀察歷年調幅、物價與基本生活費對照。",
      tags: ["薪資", "物價", "勞資"],
      scope: "最低工資調整",
      context: "最低工資調整同時涉及勞工生活、企業成本、物價變化與就業市場承受度。",
      why: "工資若長期追不上物價，基層勞工購買力會下降；但調幅若超過部分產業承受能力，也可能引發轉嫁或人力調整。",
      confirmed: "目前可先回查審議會流程、歷年調幅、消費者物價指數、基本生活費與產業團體意見。",
      supportDetail: "支持調升的一方認為，最低工資是基層勞工的基本保障，應該讓薪資能跟上生活成本。",
      concernDetail: "疑慮方則會關注微型企業、服務業與低毛利產業是否能承受成本上升，以及政府是否有配套。",
      indicators: "後續可觀察調幅、物價指數、失業率、受僱人數、部分工時比例與服務價格變化。",
      reader: "讀者可以把名目工資與物價一起看，因為真正影響生活的是實質購買力，而不是單一數字。",
    }),
    article({
      id: "education-digital",
      topic: "education",
      title: "校園數位設備採購，維護成本與使用率需公開",
      status: "資料彙整",
      updated: "2026-06-04",
      image: "assets/education.png",
      summary: "追蹤校園數位設備預算、採購標準、維護成本與城鄉資源差距。",
      facts: [["影響對象", "學生、教師、地方教育局"], ["核心爭點", "設備使用率與維護成本"], ["觀察指標", "採購單價、維修率、師生比"]],
      sources: ["教育預算書", "採購公告", "地方審議紀錄"],
      support: "支持方認為數位設備可改善學習資源，縮短城鄉差距。",
      concern: "疑慮方認為採購後的維護、人員訓練和課程整合更關鍵。",
      next: "觀察採購案清單與設備到校後使用情況。",
      tags: ["教育預算", "採購", "數位學習"],
      scope: "校園數位設備採購",
      context: "校園數位設備政策看似是採購問題，實際上還涉及教師培訓、課程設計、維修預算與不同地區的資源差距。",
      why: "若只採購設備卻沒有維護、人員訓練與使用回報機制，設備可能無法真正改善學習品質。",
      confirmed: "目前可先觀察採購規格、單價、交付時程、維修責任、教師培訓安排與設備使用率。",
      supportDetail: "支持方認為，穩定提供數位工具能讓偏鄉或資源不足學校取得更多學習材料，也能提升教學彈性。",
      concernDetail: "疑慮方則會追問設備是否閒置、維修費是否被低估，以及課程是否真的整合到日常教學。",
      indicators: "後續可觀察採購單價、故障率、維修時間、教師培訓人次、學生使用頻率與學校回報資料。",
      reader: "判斷這類政策時，可以把採購金額和使用率一起看；有設備不等於有效使用，公開回報才是關鍵。",
    }),
  ];

  const articleIds = new Set(REVIEW_IDS);

  const reviewContent = {
    topics,
    articles,
    people: [
      { id: "lin-policy", name: "林政遠", role: "立法委員", area: "北部都會區", focus: "居住、交通", stance: "主張社宅供給與通勤補助並行", related: ["housing-rent-index", "transport-pass"] },
      { id: "chen-energy", name: "陳雅庭", role: "地方首長", area: "中部縣市", focus: "能源、產業", stance: "主張電網投資需納入地方產業負載", related: ["energy-grid"] },
      { id: "wu-labor", name: "吳承安", role: "議員", area: "南部工業區", focus: "勞工、職安", stance: "關注最低工資與中小企業配套", related: ["labor-minimum-wage"] },
      { id: "hsu-education", name: "徐若晴", role: "教育委員", area: "東部地區", focus: "教育、地方資源", stance: "主張設備採購需同步公開使用成效", related: ["education-digital"] },
    ],
    timeline: [
      { date: "2026-06-04", topic: "budget", title: "總預算審查整理更新", description: "整理支出凍結、地方建設與附帶決議的觀察重點。" },
      { date: "2026-06-04", topic: "housing", title: "租屋補貼觀察面向更新", description: "加入申請通過率、租金變化與地方審查速度。" },
      { date: "2026-06-04", topic: "energy", title: "電網韌性條目更新", description: "整理儲能容量、區域備援與停電事故回復指標。" },
      { date: "2026-06-04", topic: "transport", title: "通勤月票條目更新", description: "整理中央地方分攤、使用人次與班次供給觀察重點。" },
    ],
    sources: [],
  };

  function contentResponse(data) {
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  const nativeFetch = window.fetch?.bind(window);
  if (nativeFetch) {
    window.fetch = (input, init) => {
      const url = String(typeof input === "string" ? input : input?.url || "");
      if (/content\/articles\.json(?:$|\?)/.test(url)) return Promise.resolve(contentResponse({ articles: [], topics: [], people: [], timeline: [] }));
      if (/content\/automation-config\.json(?:$|\?)/.test(url)) return Promise.resolve(contentResponse({ topicKeywords: {}, people: [] }));
      if (/content\/local-politicians\.json(?:$|\?)/.test(url)) return Promise.resolve(contentResponse([]));
      return nativeFetch(input, init);
    };
  }

  window.PolicyPulseGeneratedContent = reviewContent;
  window.PolicyPulseFirebaseReady = Promise.resolve({ enabled: false });

  const style = document.createElement("style");
  style.textContent = "[data-promo-slot],.promo-slot{display:none!important;visibility:hidden!important}";
  document.head.append(style);

  function removePromoSlots() {
    document.querySelectorAll("[data-promo-slot],.promo-slot").forEach((node) => node.remove());
  }

  function articleIdFromLocation() {
    const queryId = new URLSearchParams(location.search).get("id");
    if (queryId) return queryId;
    const path = decodeURIComponent(location.pathname || "");
    if (!path.includes("/articles/")) return "";
    return (path.split("/").filter(Boolean).pop() || "").replace(/\.html$/i, "");
  }

  function applyNoindexForRetiredArticles() {
    const id = articleIdFromLocation();
    if (!id || articleIds.has(id)) return;
    let robots = document.head.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.append(robots);
    }
    robots.content = "noindex,follow";
  }

  const observer = new MutationObserver(() => {
    removePromoSlots();
    applyNoindexForRetiredArticles();
  });

  if (document.documentElement) observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("DOMContentLoaded", () => {
    removePromoSlots();
    applyNoindexForRetiredArticles();
  });
  window.setTimeout(removePromoSlots, 500);
  window.setTimeout(removePromoSlots, 1500);
  window.setTimeout(removePromoSlots, 4000);
})();
