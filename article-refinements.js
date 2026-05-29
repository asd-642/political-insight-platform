(function installArticleRefinements() {
  const REFINEMENTS = {
    "transport-曾品蓁-交通-追蹤-2026-05-29": {
      id: "transport-曾品蓁-交通-追蹤-2026-05-29",
      topic: "transport",
      topicName: "交通",
      title: "曾品蓁交通議題待查：預算、期程與責任單位要說清楚",
      status: "追蹤中",
      updated: "2026-05-29",
      summary:
        "目前可確認的是，這項交通議題仍停在資料整理階段；真正影響民眾的，不是口號，而是主管機關能不能拿出預算來源、改善範圍、執行期程與公開回報機制。",
      caption: "交通議題示意圖。政策能否落地，關鍵在預算、期程與責任單位是否說清楚。",
      sources: ["政策脈絡整理"],
      tags: ["交通", "地方治理", "資料查核", "公共運輸"],
      facts: [
        ["第一個檢查點", "是否有正式預算、補助來源或既有計畫可回查。"],
        ["第二個檢查點", "是否指定主管機關、承辦單位與實際改善範圍。"],
        ["第三個檢查點", "是否提出明確期程，讓民眾能追蹤進度。"],
      ],
      sections: [
        {
          heading: "爭點先看預算與時程",
          paragraphs: [
            "這條與曾品蓁相關的交通線索，現在最需要補的不是形容詞，而是四件事：錢從哪裡來、誰負責、要改善哪一段或哪一項服務、何時能讓民眾看見變化。",
            "如果主管機關只說會研議、會滾動檢討，對通勤族和地方居民來說幫助有限。政策能不能落地，最後會回到預算書、會議紀錄和執行進度。",
          ],
        },
        {
          heading: "公共運輸不是一句口號",
          paragraphs: [
            "交通政策通常會牽動主管機關、地方執行單位、預算使用者與一般民眾。公車班次、轉乘便利、道路安全或偏鄉接駁，只要其中一環沒有說清楚，最後都會變成民眾每天通勤時承受的成本。",
            "這也是為什麼這類議題不能只停在「重視交通」或「持續追蹤」。讀者真正需要知道的是，哪個單位要動、哪筆錢要用、哪個路段或服務會先改。",
          ],
        },
        {
          heading: "地方居民會先問什麼",
          paragraphs: [
            "站在地方居民角度，最直接的問題通常很樸素：等車時間會不會變短？危險路口會不會調整？偏遠地區是不是仍然一天等不到幾班車？這些問題沒有漂亮口號，只有現場感。",
            "若後續資料能指出具體路線、站點、路口或服務範圍，這篇文章才有條件往更深的政策分析推進。否則，它仍只能算是一則需要補證據的交通觀察。",
          ],
        },
        {
          heading: "支持方可能主張什麼",
          paragraphs: [
            "支持方可能會把焦點放在通勤效率、交通安全與區域公平。若改善措施真的能減少等待、降低轉乘成本，或讓偏鄉居民更容易接上主要生活圈，政策就有公共利益的基礎。",
            "但支持一項政策，不等於替它跳過查核。越是看起來有必要的交通改善，越需要把預算、施工或服務期程攤開，避免好政策最後卡在執行細節。",
          ],
        },
        {
          heading: "質疑方會追哪一筆帳",
          paragraphs: [
            "反對或質疑的一方，攻防焦點會更務實：錢從哪裡來？執行期程要多久？如果跳票，誰要出面負責？這些問題比抽象的政策態度更關鍵。",
            "如果後續只看到倡議文字，卻沒有預算來源、決標資料、會議紀錄或主管機關回應，這項議題就還不能被寫成已經落地的政策成果。",
          ],
        },
        {
          heading: "目前缺少的證據",
          paragraphs: [
            "目前頁面能呈現的公開資訊仍不足，還缺至少兩類材料：一是官方或議會端的正式紀錄，二是能指向具體改善範圍的資料，例如路線、路段、站點、期程或預算科目。",
            "在這些材料補齊前，文章應維持追蹤狀態，而不是急著替政策下結論。這樣寫雖然保守，卻能避免把未完成的倡議包裝成已經發生的成果。",
          ],
        },
        {
          heading: "接下來該看哪裡",
          paragraphs: [
            "下一步應優先回查地方議會質詢紀錄、主管機關新聞稿、預算書、招標或決標公告，以及地方政府對相關交通改善的書面回覆。",
            "如果其中任何一項資料出現具體日期、金額或承辦單位，文章就能從「議題整理」往「政策進度追蹤」推進；如果沒有，讀者也能清楚知道資料缺口在哪裡。",
          ],
        },
        {
          heading: "判斷標準",
          paragraphs: [
            "這項交通議題能不能成立，關鍵不在聲量，而在可驗證的下一步。只要預算、期程、責任單位和改善範圍其中一項仍然模糊，地方居民就有理由繼續追問。",
            "等到主管機關把方案攤開，這篇文章才適合再補上各方說法與實際影響。否則，最誠實的寫法就是把問題留在桌面上：這件事還沒說清楚。",
          ],
        },
      ],
    },
  };

  let rendering = false;

  function getArticleIdFromUrl() {
    const queryId = new URLSearchParams(location.search).get("id");
    if (queryId) return queryId;
    const path = decodeURIComponent(location.pathname || "");
    if (!path.includes("/articles/")) return "";
    return (path.split("/").filter(Boolean).pop() || "").replace(/\.html$/i, "");
  }

  function mergeTopic(content) {
    const topics = Array.isArray(content.topics) ? content.topics : [];
    if (topics.some((topic) => topic.id === "transport")) return topics;
    return [...topics, { id: "transport", name: "交通" }];
  }

  function mergeRefinedArticle(article) {
    const content = window.PolicyPulseContent || {};
    const articles = Array.isArray(content.articles) ? content.articles : [];
    window.PolicyPulseContent = {
      ...content,
      topics: mergeTopic(content),
      articles: [article, ...articles.filter((item) => item?.id !== article.id)],
    };
  }

  function currentArticle(id) {
    const articles = window.PolicyPulseContent?.articles;
    return Array.isArray(articles) ? articles.find((article) => article?.id === id) : null;
  }

  function renderRefinement() {
    if (rendering || typeof window.renderArticle !== "function") return false;
    const id = getArticleIdFromUrl();
    const refinement = REFINEMENTS[id];
    if (!refinement) return false;

    const article = {
      ...(currentArticle(id) || {}),
      ...refinement,
      refined: true,
    };

    mergeRefinedArticle(article);
    rendering = true;
    window.renderArticle(article);
    rendering = false;
    return true;
  }

  function startRefinement() {
    const id = getArticleIdFromUrl();
    if (!REFINEMENTS[id]) return;

    let attempts = 0;
    const retry = () => {
      attempts += 1;
      renderRefinement();
      if (attempts < 36) window.setTimeout(retry, 250);
    };

    retry();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startRefinement, { once: true });
  } else {
    startRefinement();
  }
})();
