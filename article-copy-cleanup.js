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

  function getArticleRoot() {
    return document.querySelector("#articleRoot");
  }

  function topicFromPhrase(value) {
    const phrase = String(value || "");
    return TOPIC_WORDS.find((topic) => phrase.includes(topic)) || "公共政策";
  }

  function cleanupPublicCopy(value) {
    let text = String(value ?? "");

    text = text
      .replace(
        /根據自動抓取來源摘要，?「[^」]+」近期與([^。]+?)議題相關。本文先整理/g,
        "本文先整理$1議題的",
      )
      .replace(
        /根據來源摘要，?[^，。]+近期與([^。]+?)議題相關。本文先整理/g,
        "本文先整理$1議題的",
      )
      .replace(/根據關鍵字「[^」]+」建立待審草稿，?先整理/g, "本文先整理")
      .replace(/根據自動抓取來源摘要，?「[^」]+」/g, "根據公開資料")
      .replace(/根據公開資料近期/g, "根據公開資料，近期")
      .replace(/\s*[，,]\s*後續影響與資料待查核(?=\s*(?:追蹤建立)?(?:｜|$))/g, "")
      .replace(
        /(?:本文先)?整理([^。]+?)議題的影響對象、主要爭點與(?:後續需要補充|仍需補充)的資料。?/g,
        "內容大綱：$1議題背景、影響對象、主要爭點與後續觀察。",
      )
      .replace(
        /(?:本文先)?整理影響對象、主要爭點與(?:後續需要補充|仍需補充)的資料。?/g,
        "內容大綱：政策背景、影響對象、主要爭點與後續觀察。",
      )
      .replace(/(?:後續需要補充|仍需補充)的資料/g, "後續觀察指標")
      .replace(/\s*追蹤建立$/g, "")
      .replace(/議題的的/g, "議題的")
      .replace(/\s{2,}/g, " ");

    text = text
      .replace(new RegExp(`^(.+?)\\s+(${TOPIC_PATTERN})\\s*追蹤議題整理`, "g"), (_, subject, topic) => {
        const cleanSubject = String(subject || "").trim();
        return cleanSubject ? `${cleanSubject}相關${topic}議題整理` : `${topic}議題整理`;
      })
      .replace(new RegExp(`^(${TOPIC_PATTERN})\\s*追蹤議題整理`, "g"), "$1議題整理")
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
