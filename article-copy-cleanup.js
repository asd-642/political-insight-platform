(function installArticleCopyCleanup() {
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

  function getArticleRoot() {
    return document.querySelector("#articleRoot");
  }

  function topicFromPhrase(value) {
    const phrase = String(value || "");
    return TOPIC_WORDS.find((topic) => phrase.includes(topic)) || "公共政策";
  }

  function cleanSubject(value, topic) {
    const subject = String(value || "")
      .replace(/追蹤|待補|來源摘要|自動抓取|資料待查核|後續影響|議題整理/g, "")
      .replace(/\s+/g, "")
      .trim();
    if (!subject) return `${topic}議題`;
    if (subject.includes("議題")) return subject;
    if (TOPIC_WORDS.some((word) => subject.includes(word))) return `${subject}議題`;
    return `${subject}${topic}議題`;
  }

  function newsExcerpt(subject) {
    return `${subject}近期受到關注，重點包括政策背景、各方說法、預算或執行進度，後續可觀察主管機關回應。`;
  }

  function cleanupPublicCopy(value) {
    let text = String(value ?? "");

    text = text
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
      .replace(/\s*[，,]\s*後續影響與資料待查核(?=\s*(?:追蹤建立)?(?:｜|$))/g, "")
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

  function cleanTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const cleaned = cleanupPublicCopy(node.nodeValue);
      if (cleaned !== node.nodeValue) node.nodeValue = cleaned;
      node = walker.nextNode();
    }
  }

  function splitTagText(value) {
    const seen = new Set();
    return String(value || "")
      .trim()
      .split(/\s+/)
      .map((part) => cleanupPublicCopy(part).trim())
      .filter((part) => {
        if (!part || seen.has(part)) return false;
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
        if (!text || seen.has(text)) {
          tag.remove();
          return;
        }
        seen.add(text);
        if (tag.textContent !== text) tag.textContent = text;
      });
    });
  }

  function cleanupMetadata() {
    document.title = cleanupPublicCopy(document.title);
    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.setAttribute("content", cleanupPublicCopy(description.getAttribute("content") || ""));
    }
  }

  function startCleanup() {
    const root = getArticleRoot();
    if (!root) return;

    let scheduled = false;
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(() => {
        scheduled = false;
        cleanTextNodes(root);
        splitCombinedTags(root);
        cleanupMetadata();
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
