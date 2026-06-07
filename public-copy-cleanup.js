(function installPublicCopyCleanup() {
  const TOPIC_WORDS = [
    "交通",
    "公車",
    "月票",
    "居住",
    "住宅",
    "租屋",
    "房租",
    "能源",
    "電網",
    "停電",
    "儲能",
    "光電",
    "勞工",
    "勞保",
    "職安",
    "工時",
    "教育",
    "技職",
    "學費",
    "財經",
    "財政",
    "預算",
  ];
  const TOPIC_PATTERN = TOPIC_WORDS.join("|");
  const TAG_LABELS = {
    budget: "財經",
    housing: "居住",
    energy: "能源",
    transport: "交通",
    labor: "勞工",
    education: "教育",
  };
  const PUBLIC_TAG_BLOCKLIST = new Set([
    "待查核",
    "待核查",
    "待審核",
    "待審",
    "待補",
    "待補資料",
    "資料待查核",
  ]);

  function topicFromPhrase(value) {
    const phrase = String(value || "");
    return TOPIC_WORDS.find((topic) => phrase.includes(topic)) || "公共政策";
  }

  function cleanSubject(value, topic) {
    const subject = String(value || "")
      .replace(/追蹤|待補|來源摘要|自動抓取|資料待查核|資料待比對|待比對|後續影響|議題整理/g, "")
      .replace(/\s+/g, "")
      .trim();
    if (!subject) return `${topic}議題`;
    if (subject.includes("議題")) return subject;
    if (TOPIC_WORDS.some((word) => subject.includes(word))) return `${subject}議題`;
    return `${subject}${topic}議題`;
  }

  function newsExcerpt(subject) {
    return `${subject}先整理政策背景、影響對象與公開資料線索，後續再比對正式公告、議事紀錄與主管機關回應。`;
  }

  function cleanupPublicCopy(value) {
    let text = String(value ?? "");

    text = text
      .replace(/\s*[，,]\s*後續影響與資料(?:待查核|追蹤中)?/g, "")
      .replace(/\s*後續影響與資料(?:待查核|追蹤中)?/g, "")
      .replace(/這篇草稿/g, "本文")
      .replace(/草稿會先整理/g, "本文整理")
      .replace(/草稿/g, "文章")
      .replace(/方便後台審核時判斷是否需要補正式公告、議事紀錄或主管機關回應/g, "方便讀者對照正式公告、議事紀錄與主管機關回應")
      .replace(/後台審核/g, "公開資料比對")
      .replace(/發布前可以先確認/g, "閱讀時可以先確認")
      .replace(/發布前/g, "閱讀時")
      .replace(/待依來源補齊/g, "可比對公開資料")
      .replace(/需要補齊的資料/g, "後續可比對的資料")
      .replace(/後續需要補充的資料/g, "後續觀察方向")
      .replace(/仍需補充的資料/g, "後續觀察方向")
      .replace(/下一步補資料/g, "後續觀察")
      .replace(/待審核|待核查|待查核|已發布待檢查/g, "追蹤中")
      .replace(/\s*[，,]\s*後續影響與資料(?:追蹤中)?/g, "")
      .replace(/根據公開資料，近期與([^。]+?)議題相關。本文先整理[，、]?主要爭點與後續觀察方向。?/g, (_, topic) => newsExcerpt(`${String(topic).trim()}議題`))
      .replace(/本文先整理[，、]?/g, "")
      .replace(
        /根據自動抓取來源摘要，?「([^」]+)」近期與([^。]+?)議題相關。本文先整理影響對象、主要爭點與(?:後續需要補充|仍需補充)的資料。?/g,
        (_, keyword, topic) => newsExcerpt(cleanSubject(keyword, topic)),
      )
      .replace(
        /根據來源摘要，?([^，。]+)近期與([^。]+?)議題相關。本文先整理影響對象、主要爭點與(?:後續需要補充|仍需補充)的資料。?/g,
        (_, keyword, topic) => newsExcerpt(cleanSubject(keyword, topic)),
      )
      .replace(/根據關鍵字「([^」]+)」建立待審草稿，?先整理影響對象、主要爭點與(?:後續需要補充|仍需補充)的資料。?/g, (_, keyword) => newsExcerpt(cleanSubject(keyword, "公共政策")))
      .replace(/根據自動抓取來源摘要，?「[^」]+」/g, "根據公開資料")
      .replace(/^根據自動抓取來源摘要[:：]?$/g, "")
      .replace(/「([^」]+)」近期主要聚焦於([^議。]+)議題(?:及[^。]+)?的討論。本文除彙整[^。]+。?/g, (_, subject, topic) => newsExcerpt(cleanSubject(subject, topic)))
      .replace(/根據公開資料近期/g, "根據公開資料，近期")
      .replace(/\s*[，,]\s*後續影響與(?:資料)?(?:待查核|追蹤中)?(?=\s*(?:追蹤建立)?(?:｜|$))/g, "")
      .replace(/\s*後續影響與(?:資料)?(?:待查核|追蹤中)?(?=\s*(?:追蹤建立)?(?:｜|$))/g, "")
      .replace(
        /(?:本文先)?整理([^。]+?)議題的影響對象、主要爭點與(?:後續需要補充|仍需補充)的資料。?/g,
        (_, topic) => newsExcerpt(`${String(topic).trim()}議題`),
      )
      .replace(
        /(?:本文先)?整理影響對象、主要爭點與(?:後續需要補充|仍需補充)的資料。?/g,
        newsExcerpt("政策議題"),
      )
      .replace(/整理([^，。]+?)議題近期發展，說明主要爭點、政策脈絡與後續觀察方向。?/g, (_, topic) => newsExcerpt(`${String(topic).trim()}議題`))
      .replace(/內容大綱：([^，。]+?)議題背景、影響對象、主要爭點與後續觀察。?/g, (_, topic) => newsExcerpt(`${String(topic).trim()}議題`))
      .replace(/內容大綱：政策背景、影響對象、主要爭點與後續觀察。?/g, newsExcerpt("政策議題"))
      .replace(/聚焦([^，。]+?)議題背景、主要爭點與後續觀察。?/g, (_, topic) => newsExcerpt(`${String(topic).trim()}議題`))
      .replace(/聚焦政策背景、主要爭點與後續觀察。?/g, newsExcerpt("政策議題"))
      .replace(/「([^」]+)」近期進入公共討論，草稿會先整理來源中的事件背景、主要爭點與後續可能影響。?/g, (_, subject) => newsExcerpt(cleanSubject(subject, "公共政策")))
      .replace(/目前抓到的來源包括：([^。]+)。系統會保留來源標記，方便後台審核時判斷是否需要補正式公告、議事紀錄或主管機關回應。?/g, "目前公開來源包括：$1。本文會保留來源線索，方便讀者對照正式公告、議事紀錄與主管機關回應。")
      .replace(/來源摘要通常只呈現事件表層，因此草稿會把標題、摘要與關鍵字拆成待查核問題，而不是直接把外部報導當成完整結論。?/g, "公開來源多半先呈現事件表層，本文會把不同說法拆開整理，避免把單一來源直接當成完整結論。")
      .replace(/針對部分尚未明朗的統計數據，亦同步標記為待查核項目以利後續追蹤。?/g, "並整理後續可觀察的正式數據與主管機關回應。")
      .replace(/近期核心議題動態/g, "近期核心動態")
      .replace(/後續潛在影響評估/g, "後續影響評估")
      .replace(/資料待查核與追蹤項目/g, "後續觀察")
      .replace(/資料待查核|資料待比對|待比對/g, "")
      .replace(/影響範圍與利害關係人/g, "政策焦點與關聯")
      .replace(/主管機關需要說明的問題/g, "主管機關回應重點")
      .replace(/影響對象與政策關聯/g, "政策關聯")
      .replace(/資料查核清單|資料查核方向/g, "公開資料觀察")
      .replace(/審核時建議檢查/g, "閱讀時可留意")
      .replace(/後續追蹤方向/g, "後續觀察")
      .replace(/內容大綱：/g, "")
      .replace(/^影響對象$/g, "涉及範圍")
      .replace(/、?影響對象/g, "")
      .replace(/(?:後續需要補充|仍需補充)的資料/g, "後續觀察指標")
      .replace(/但仍需要更多正式說明支撐/g, "後續可從正式說明觀察政策設計是否完整")
      .replace(/仍需交叉查核/g, "相關說法需要和公開紀錄對照")
      .replace(/補上正式公告、議事紀錄、數據表、主管機關回應與各方正式說法。?/g, "後續可觀察正式公告、議事紀錄、數據表、主管機關回應與各方正式說法。")
      .replace(/\s*追蹤建立$/g, "")
      .replace(/議題的的/g, "議題的")
      .replace(/\s{2,}/g, " ");

    text = text
      .replace(new RegExp(`^(.+?)\\s+(${TOPIC_PATTERN})\\s*追蹤議題整理`, "g"), (_, subject, topic) => {
        const cleanSubject = String(subject || "").replace(/\s+/g, "");
        return cleanSubject ? `${cleanSubject}${topic}議題` : `${topic}議題`;
      })
      .replace(new RegExp(`^(${TOPIC_PATTERN})\\s*追蹤議題整理`, "g"), "$1議題整理")
      .replace(new RegExp(`^(.+?)\\s+(${TOPIC_PATTERN})\\s+政策議題整理`, "g"), (_, subject, topic) => `${String(subject || "").replace(/\s+/g, "")}${topic}政策`)
      .replace(/議題整理/g, "議題")
      .replace(/議題議題/g, "議題")
      .replace(/「([^」]+)」/g, (match, phrase) => {
        if (!/(追蹤|待補|來源摘要|自動抓取)/.test(phrase) && !/\s/.test(phrase)) return match;
        return `此${topicFromPhrase(phrase)}議題`;
      })
      .replace(
        new RegExp(`([^\\s，。；：「」]{2,}(?:\\s+[^\\s，。；：「」]{2,}){0,3})\\s+(${TOPIC_PATTERN})\\s+追蹤(?=\\s*(相關|若|，|。|；|$))`, "g"),
        (_, _subject, topic) => `此${topic}議題`,
      )
      .replace(/議題\s+相關/g, "議題相關")
      .replace(/\s+([，。；：])/g, "$1")
      .replace(/\s{2,}/g, " ")
      .trim();

    text = TAG_LABELS[text.toLowerCase()] || text;

    return text;
  }

  function shouldSkip(node) {
    const parent = node.parentElement;
    return !parent || parent.closest("script, style, textarea, input, code, pre");
  }

  function installLayoutFixes() {
    if (document.getElementById("public-copy-cleanup-layout")) return;
    const style = document.createElement("style");
    style.id = "public-copy-cleanup-layout";
    style.textContent = `
      .headline-item span {
        -webkit-line-clamp: 2;
        line-height: 1.55;
      }
    `;
    document.head.append(style);
  }

  function cleanTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      if (!shouldSkip(node)) {
        const cleaned = cleanupPublicCopy(node.nodeValue);
        if (cleaned !== node.nodeValue) node.nodeValue = cleaned;
      }
      node = walker.nextNode();
    }
  }

  function cleanAttributes(root) {
    root.querySelectorAll("[aria-label], [title], [alt]").forEach((element) => {
      ["aria-label", "title", "alt"].forEach((name) => {
        if (!element.hasAttribute(name)) return;
        const value = element.getAttribute(name);
        const cleaned = cleanupPublicCopy(value);
        if (cleaned !== value) element.setAttribute(name, cleaned);
      });
    });
  }

  function splitTagText(value) {
    const seen = new Set();
    return String(value || "")
      .trim()
      .split(/\s+/)
      .map((part) => cleanupPublicCopy(part).trim())
      .filter((part) => {
        if (!part || PUBLIC_TAG_BLOCKLIST.has(part) || seen.has(part)) return false;
        seen.add(part);
        return true;
      });
  }

  function splitCombinedTags(root) {
    root.querySelectorAll(".tag-row .tag").forEach((tag) => {
      const parts = splitTagText(tag.textContent);
      if (parts.length <= 1) {
        const single = parts[0] || "";
        if (single && tag.textContent !== single) tag.textContent = single;
        return;
      }

      const fragment = document.createDocumentFragment();
      parts.forEach((part) => {
        const item = tag.cloneNode(false);
        item.textContent = part;
        fragment.append(item);
      });
      tag.replaceWith(fragment);
    });

    root.querySelectorAll(".tag-row").forEach((row) => {
      const seen = new Set();
      row.querySelectorAll(".tag").forEach((tag) => {
        const text = cleanupPublicCopy(tag.textContent).trim();
        if (!text || PUBLIC_TAG_BLOCKLIST.has(text) || seen.has(text)) {
          tag.remove();
          return;
        }
        seen.add(text);
        if (tag.textContent !== text) tag.textContent = text;
      });
    });
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  const HEADLINE_SUBJECT_LABELS = {
    稅: "稅務政策",
    財政: "財政政策",
    投資: "投資政策",
    產業: "產業政策",
    公車: "公車服務",
    交通: "交通政策",
    道路: "道路建設",
    能源: "能源政策",
    供電: "供電穩定",
    住宅: "住宅政策",
    居住: "住宅政策",
    租屋: "租屋市場",
    勞工: "勞動政策",
    勞動: "勞動政策",
    最低工資: "最低工資調整",
    教育: "教育政策",
  };

  const HEADLINE_TEMPLATES = {
    財經: [
      (label) => `${label}預算怎麼花？執行率與補助流向受檢視`,
      (label) => `${label}支出怎麼分？審查進度與效益待說明`,
      (label) => `${label}卡在財源與期程，主管機關回應成焦點`,
      (label) => `${label}明細待攤開，執行率與受益對象需說清`,
      (label) => `${label}爭議延燒，經費來源與責任分工待釐清`,
      (label) => `${label}錢從哪裡來？財源、期程與成效指標待補`,
      (label) => `${label}執行卡在哪？預算流向與主管說法待說明`,
    ],
    交通: [
      (label) => `${label}進度到哪裡？班次、補助與地方分工待釐清`,
      (label) => `${label}牽動通勤成本，路線調整與執行期程受檢視`,
      (label) => `${label}地方怎麼配合？預算分攤與服務量能成焦點`,
      (label) => `${label}能否如期上路，民眾影響與配套仍待說明`,
    ],
    居住: [
      (label) => `${label}如何減輕負擔？供給、租金與補助門檻待查`,
      (label) => `${label}牽動租屋族權益，地方執行與申請流程受檢視`,
      (label) => `${label}進入政策攻防，住宅供給與財源配置成焦點`,
      (label) => `${label}能否落到住戶身上，審核進度與公開資料待補`,
    ],
    能源: [
      (label) => `${label}能否穩定供電？電網進度與採購資訊待釐清`,
      (label) => `${label}牽動區域用電，工程期程與事故紀錄受檢視`,
      (label) => `${label}成為能源攻防焦點，容量、成本與備援仍待說明`,
      (label) => `${label}執行進度受檢驗，供電韌性與公開資料待補`,
    ],
    勞工: [
      (label) => `${label}影響誰的薪資？企業成本與保障範圍待釐清`,
      (label) => `${label}進入勞資攻防，工時、職安與執法量能成焦點`,
      (label) => `${label}能否落實保障，稽查紀錄與申訴資料待補`,
      (label) => `${label}牽動就業條件，制度配套與執行落差受檢視`,
    ],
    教育: [
      (label) => `${label}資源怎麼分？校園需求與採購進度待釐清`,
      (label) => `${label}牽動學生權益，補助門檻與地方執行受檢視`,
      (label) => `${label}進入政策檢驗，課程、設備與師資配套成焦點`,
      (label) => `${label}能否改善現場，經費流向與成效資料待補`,
    ],
    政策: [
      (label) => `${label}下一步怎麼走？主管機關說明與期程待釐清`,
      (label) => `${label}爭議升溫，影響範圍與配套措施成焦點`,
      (label) => `${label}進入執行檢驗，公開資料與責任分工待補`,
      (label) => `${label}牽動地方回應，政策目標與實際成效受檢視`,
    ],
  };

  function inferHeadlineTopic(value) {
    const text = String(value || "");
    if (/稅|財政|投資|產業|財經/.test(text)) return "財經";
    if (/交通|公車|道路|通勤|月票|捷運|鐵路/.test(text)) return "交通";
    if (/住宅|居住|租屋|房租|社宅/.test(text)) return "居住";
    if (/能源|供電|電網|停電|儲能/.test(text)) return "能源";
    if (/勞工|勞動|薪資|最低工資/.test(text)) return "勞工";
    if (/教育|學校|校園|大學/.test(text)) return "教育";
    return "政策";
  }

  function stableHeadlineIndex(value, size) {
    let hash = 2166136261;
    String(value || "").split("").forEach((char, index) => {
      hash ^= char.charCodeAt(0) + index;
      hash = Math.imul(hash, 16777619) >>> 0;
    });
    return size ? hash % size : 0;
  }

  function fallbackHeadlineLabel(value) {
    const text = String(value || "");
    if (/稅/.test(text)) return "稅務政策";
    if (/財政/.test(text)) return "財政政策";
    if (/投資/.test(text)) return "投資政策";
    if (/產業/.test(text)) return "產業政策";
    if (/公車/.test(text)) return "公車服務";
    if (/交通/.test(text)) return "交通政策";
    if (/道路/.test(text)) return "道路建設";
    if (/供電/.test(text)) return "供電穩定";
    if (/能源/.test(text)) return "能源政策";
    if (/住宅|居住/.test(text)) return "住宅政策";
    if (/租屋/.test(text)) return "租屋市場";
    if (/勞工|勞動/.test(text)) return "勞動政策";
    if (/教育|校園/.test(text)) return "教育政策";
    return "";
  }

  function normalizeHeadlineLabel(subject) {
    const original = String(subject || "").replace(/\s+/g, "").trim();
    const fallback = fallbackHeadlineLabel(original);
    const cleanSubject = original
      .replace(/(?:財政|財經|交通|能源|教育|勞工|勞政|產業|住宅|居住)?(?:委員|議員|民代|代表)/g, "")
      .replace(/^(?!北部|中部|南部|東部|全台|台灣)[\u4e00-\u9fff]{2,4}(?=(稅|財政|財經|投資|產業|交通|公車|道路|能源|供電|住宅|居住|租屋|勞工|勞動|最低工資|教育|校園))/u, "")
      .trim();
    if (!cleanSubject || cleanSubject === "政策") return "";
    if (/^[\u4e00-\u9fff]{2,4}$/.test(cleanSubject) && fallback) return fallback;
    return (
      HEADLINE_SUBJECT_LABELS[cleanSubject] ||
      fallback ||
      `${cleanSubject}${/(政策|服務|建設|調整|市場|穩定|議題)$/.test(cleanSubject) ? "" : "政策"}`
    );
  }

  function publicHeadlineTitle(value, context = "") {
    const title = cleanupPublicCopy(value);
    if (!title) return title;
    const genericMatch = title.match(/^(.+?)受關注，.+成觀察重點$/);
    const legacyMatch = title.match(/^(.+?)(?:預算怎麼花？執行率與補助流向(?:受檢視|待釐清)|牽動支出分配，審查進度與效益(?:待說明|受檢視)|影響範圍擴大，預算明細成後續追蹤重點|卡在財源與期程，主管機關回應成焦點)$/);
    if (!genericMatch && !legacyMatch && (/[，。；：]/.test(title) || title.length > 18 || !/(議題|政策)$/.test(title))) return title;
    const subject = (genericMatch ? genericMatch[1] : legacyMatch ? legacyMatch[1] : title)
      .replace(/\s+/g, "")
      .replace(/(?:政策)?議題$/g, "")
      .replace(/政策$/g, "");
    const label = normalizeHeadlineLabel(subject);
    if (!label) return title;
    const topic = inferHeadlineTopic(`${title} ${context}`);
    const templates = HEADLINE_TEMPLATES[topic] || HEADLINE_TEMPLATES["政策"];
    return templates[stableHeadlineIndex(`${title} ${context}`, templates.length)](label);
  }

  function rewriteVisibleHeadlines(root) {
    root
      .querySelectorAll("#featuredStory h1, #headlineList .headline-item strong, #articleGrid .article-card h3, #detailTitle")
      .forEach((element) => {
        const context = element.closest(".article-card, .headline-item, #featuredStory, .detail-panel")?.textContent || "";
        const rewritten = publicHeadlineTitle(element.textContent, context);
        if (rewritten && rewritten !== element.textContent.trim()) element.textContent = rewritten;
      });
  }

  function articleTitle(article) {
    return cleanupPublicCopy(article?.title)
      .replace(/\s*[，,]\s*後續影響與(?:資料)?(?:待查核|追蹤中)?/g, "")
      .replace(/\s*後續影響與(?:資料)?(?:待查核|追蹤中)?/g, "")
      .replace(/資料待查核|資料待比對|待比對/g, "")
      .replace(/\s*追蹤建立$/g, "")
      .replace(/\s*政策議題整理$/g, "政策")
      .replace(/\s*追蹤議題整理$/g, "議題")
      .replace(/\s*議題整理$/g, "議題")
      .replace(/\s+/g, " ")
      .trim() || String(article?.title || "政策議題");
  }

  function articleExcerpt(article) {
    const raw = cleanupPublicCopy(article?.summary);
    if (raw && !/(草稿|後台審核|發布前|待依來源補齊|需要補齊|待審核|待核查|待查核|根據自動抓取來源摘要|內容大綱)/.test(raw)) return raw;
    const title = articleTitle(article).replace(/\s+/g, "");
    const subject = title.includes("議題") ? title : `${title}議題`;
    return `${subject}先整理政策背景、影響對象與公開資料線索，後續再比對正式公告、議事紀錄與主管機關回應。`;
  }

  function articleUrl(id) {
    if (window.PolicyPulseUtils?.articleUrl) return window.PolicyPulseUtils.articleUrl(id);
    const encodedId = encodeURIComponent(id);
    const host = window.location?.hostname || "";
    const isLocal = host === "localhost" || host === "127.0.0.1" || host === "";
    return isLocal ? `/article.html?id=${encodedId}` : `/articles/${encodedId}`;
  }

  function topicName(id) {
    const topics = window.PolicyPulseContent?.topics || [];
    return topics.find((topic) => topic.id === id)?.name || TAG_LABELS[String(id || "").toLowerCase()] || id || "政策";
  }

  function articleImage(article, card) {
    return card?.querySelector("img")?.getAttribute("src") || article?.image || "assets/podium.png";
  }

  function cleanFactPair(fact, index) {
    if (Array.isArray(fact)) {
      return [
        cleanupPublicCopy(fact[0] || `重點 ${index + 1}`).replace(/^影響對象$/g, "涉及範圍") || `重點 ${index + 1}`,
        cleanupPublicCopy(fact[1]) || "可比對公開資料",
      ];
    }
    if (fact && typeof fact === "object") {
      return [
        cleanupPublicCopy(fact.label || fact.name || `重點 ${index + 1}`).replace(/^影響對象$/g, "涉及範圍") || `重點 ${index + 1}`,
        cleanupPublicCopy(fact.value || fact.text || fact.description) || "可比對公開資料",
      ];
    }
    return [`重點 ${index + 1}`, cleanupPublicCopy(fact) || "可比對公開資料"];
  }

  function renderDetailBody(article) {
    const facts = (article.facts || []).map(cleanFactPair);
    const support = cleanupPublicCopy(article.support) || "後續可觀察正式資料、議事紀錄與主管機關回應。";
    const concern = cleanupPublicCopy(article.concern) || "後續可觀察正式資料、議事紀錄與主管機關回應。";
    const next = cleanupPublicCopy(article.next) || "後續可觀察正式資料、議事紀錄與主管機關回應。";
    const sources = (article.sources || []).map(cleanupPublicCopy).filter(Boolean);
    return `
      <p class="detail-summary">${escapeHtml(articleExcerpt(article))}</p>
      <section class="detail-block">
        <h3>快速事實</h3>
        <ul>
          ${facts.map(([label, value]) => `<li><strong>${escapeHtml(label)}：</strong>${escapeHtml(value)}</li>`).join("")}
        </ul>
      </section>
      <section class="detail-block">
        <h3>支持方說法</h3>
        <p>${escapeHtml(support)}</p>
      </section>
      <section class="detail-block">
        <h3>疑慮與反對理由</h3>
        <p>${escapeHtml(concern)}</p>
      </section>
      <section class="detail-block">
        <h3>後續觀察</h3>
        <p>${escapeHtml(next)}</p>
      </section>
      <section class="detail-block">
        <h3>來源</h3>
        <div>${sources.map((source) => `<span class="source-pill">${escapeHtml(source)}</span>`).join("")}</div>
      </section>
    `;
  }

  function findArticleByTitle(title) {
    const target = cleanupPublicCopy(title);
    const articles = window.PolicyPulseContent?.articles || [];
    return articles.find((article) => articleTitle(article) === target);
  }

  function syncVisibleArticleShell() {
    const grid = document.querySelector("#articleGrid");
    if (!grid || !window.PolicyPulseContent?.articles?.length) return;

    const card =
      document.querySelector(".article-card.is-selected") ||
      document.querySelector(".article-card") ||
      document.querySelector(".headline-item.is-selected") ||
      document.querySelector(".headline-item");
    if (!card) return;

    const cardTitle = card.querySelector("h3, strong")?.textContent?.trim();
    const article = findArticleByTitle(cardTitle);
    if (!article) return;

    const title = articleTitle(article);
    const detailTitle = document.querySelector("#detailTitle");
    const featured = document.querySelector("#featuredStory");
    const featuredTitle = featured?.querySelector("h1")?.textContent?.trim();
    const detailMismatch = detailTitle && cleanupPublicCopy(detailTitle.textContent) !== title;
    const featuredMismatch = featuredTitle && cleanupPublicCopy(featuredTitle) !== title;
    if (!detailMismatch && !featuredMismatch) return;

    if (detailTitle) detailTitle.textContent = title;
    const detailBody = document.querySelector("#detailBody");
    if (detailBody) detailBody.innerHTML = renderDetailBody(article);

    if (featured) {
      const image = articleImage(article, card);
      featured.innerHTML = `
        <img src="${escapeHtml(image)}" alt="${escapeHtml(topicName(article.topic))}議題封面" decoding="async" fetchpriority="high" />
        <div class="featured-overlay">
          <span class="topic-badge">${escapeHtml(topicName(article.topic))}</span>
          <h1>${escapeHtml(title)}</h1>
          <p>${escapeHtml(articleExcerpt(article))}</p>
        </div>
      `;
      featured.tabIndex = 0;
      featured.setAttribute("role", "link");
      featured.setAttribute("aria-label", `閱讀全文：${title}`);
      featured.onclick = () => {
        location.href = articleUrl(article.id);
      };
      featured.onkeydown = (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          location.href = articleUrl(article.id);
        }
      };
    }
  }

  function startCleanup() {
    const root = document.body;
    if (!root) return;
    installLayoutFixes();

    let scheduled = false;
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(() => {
        scheduled = false;
        cleanTextNodes(root);
        cleanAttributes(root);
        splitCombinedTags(root);
        syncVisibleArticleShell();
        rewriteVisibleHeadlines(root);
      });
    };

    schedule();
    new MutationObserver(schedule).observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    window.setTimeout(schedule, 800);
    window.setTimeout(schedule, 2500);
    window.setTimeout(schedule, 6000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startCleanup, { once: true });
  } else {
    startCleanup();
  }
})();
