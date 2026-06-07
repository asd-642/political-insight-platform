(function installArticleSkillCopyCleanup() {
  const BAD_PUBLIC_PATTERNS =
    /(這篇文章聚焦|來源摘要通常只呈現|支持方可能主張|後續追蹤方向|後續追蹤重點|需要補齊的資料|各方說法與執行進度)/;

  function cleanupArticleSkillCopy(value) {
    return String(value ?? "")
      .replace(
        /這篇文章聚焦「([^」]+)」，先把近期來源中的相關標題與摘要整理成\s*([^。]+?)\s*議題脈絡。它不是直接複製新聞，而是把可追蹤的政策問題、影響對象與後續資料缺口先整理出來。?/g,
        (_, keyword, topic) => `「${String(keyword).trim()}」近期出現在${String(topic).trim()}相關討論中，本文先把公開線索、可能影響與仍待確認的資料分開整理。`,
      )
      .replace(/來源摘要通常只呈現事件表層，因此(?:文章|草稿)會把標題、摘要與關鍵字拆成待查核問題，而不是直接把外部報導當成完整結論。?/g, "新聞摘要只能當作線索，本文會分開標示已知資訊與仍待確認的部分。")
      .replace(/([^。]{2,80}?議題)先整理政策背景、影響對象與公開資料線索，後續再比對正式公告、議事紀錄與主管機關回應。?/g, "$1先交代目前能確認的公開線索，再分開整理影響範圍、各方說法、資料缺口與接下來要看的文件。")
      .replace(/([^。]{2,80}?議題)先整理政策背景、影響對象、各方說法與執行進度，後續再比對正式公告、議事紀錄與主管機關回應。?/g, "$1先交代目前能確認的公開線索，再分開整理影響範圍、各方說法、資料缺口與接下來要看的文件。")
      .replace(/政策背景、影響對象、各方說法與執行進度/g, "目前能確認的公開線索、影響範圍、各方說法與資料缺口")
      .replace(/支持方可能主張/g, "支持方說法")
      .replace(/需要補齊的資料/g, "仍待確認的資料")
      .replace(/資料查核清單|資料查核方向/g, "公開資料清單")
      .replace(/主管機關需要說明的問題/g, "主管機關要說清楚什麼")
      .replace(/影響範圍與利害關係人/g, "政策影響會落在哪裡")
      .replace(/後續追蹤方向|後續追蹤重點/g, "接下來要看哪裡")
      .replace(/後續應優先補齊/g, "接下來應優先比對")
      .replace(/但仍需要更多正式說明支撐/g, "仍要用正式說明或公開紀錄支撐")
      .replace(/仍需交叉查核/g, "相關說法需要和公開紀錄對照")
      .replace(/補上正式公告、議事紀錄、數據表、主管機關回應與各方正式說法。?/g, "接下來先看正式公告、議事紀錄、數據表、主管機關回應與各方正式說法。")
      .replace(/目的在於協助讀者理解議題背景與後續追蹤方向/g, "目的在於協助讀者理解議題背景與後續資訊")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function cleanTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const original = node.nodeValue;
      if (BAD_PUBLIC_PATTERNS.test(original)) {
        const cleaned = cleanupArticleSkillCopy(original);
        if (cleaned !== original) node.nodeValue = cleaned;
      }
      node = walker.nextNode();
    }
  }

  function cleanAttributes(root) {
    root.querySelectorAll("[aria-label], [title], [alt], [content]").forEach((element) => {
      ["aria-label", "title", "alt", "content"].forEach((name) => {
        if (!element.hasAttribute(name)) return;
        const value = element.getAttribute(name);
        if (!BAD_PUBLIC_PATTERNS.test(value)) return;
        element.setAttribute(name, cleanupArticleSkillCopy(value));
      });
    });
  }

  function startCleanup() {
    const root = document.body;
    if (!root) return;

    let scheduled = false;
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(() => {
        scheduled = false;
        cleanTextNodes(root);
        cleanAttributes(document);
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
