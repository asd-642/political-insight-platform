(function installHomeImageVarietyHotfix() {
  const isHome = location.pathname === "/" || /\/index\.html$/i.test(location.pathname);
  if (!isHome) return;

  const imageUrl = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=82`;
  const TOPIC_IMAGES = {
    policy: [
      imageUrl("photo-1486406146926-c627a92ad1ab"),
      imageUrl("photo-1529107386315-e1a2ed48a620"),
      imageUrl("photo-1526304640581-d334cdbbf45e"),
      imageUrl("photo-1541872705-1f73c6400ec9"),
    ],
    budget: [
      imageUrl("photo-1554224155-6726b3ff858f"),
      imageUrl("photo-1554224154-26032ffc0d07"),
      imageUrl("photo-1450101499163-c8848c66ca85"),
      imageUrl("photo-1579621970563-ebec7560ff3e"),
      imageUrl("photo-1542744173-8e7e53415bb0"),
      imageUrl("photo-1460925895917-afdab827c52f"),
    ],
    housing: [
      imageUrl("photo-1560518883-ce09059eeffa"),
      imageUrl("photo-1570129477492-45c003edd2be"),
      imageUrl("photo-1564013799919-ab600027ffc6"),
      imageUrl("photo-1600585154340-be6161a56a0c"),
      imageUrl("photo-1582407947304-fd86f028f716"),
    ],
    energy: [
      imageUrl("photo-1509391366360-2e959784a276"),
      imageUrl("photo-1473341304170-971dccb5ac1e"),
      imageUrl("photo-1466611653911-95081537e5b7"),
      imageUrl("photo-1508514177221-188b1cf16e9d"),
      imageUrl("photo-1473649085228-583485e6e4d7"),
      imageUrl("photo-1497440001374-f26997328c1b"),
    ],
    transport: [
      imageUrl("photo-1544620347-c4fd4a3d5957"),
      imageUrl("photo-1494515843206-f3117d3f51b7"),
      imageUrl("photo-1519003722824-194d4455a60c"),
      imageUrl("photo-1449824913935-59a10b8d2000c"),
      imageUrl("photo-1474487548417-781cb71495f3"),
      imageUrl("photo-1502877338535-766e1452684a"),
      imageUrl("photo-1532105956626-9569c03602f6"),
      imageUrl("photo-1511919884226-fd3cad34687c"),
    ],
    labor: [
      imageUrl("photo-1521737604893-d14cc237f11d"),
      imageUrl("photo-1556761175-b413da4baf72"),
      imageUrl("photo-1497366754035-f200968a6e72"),
      imageUrl("photo-1521791136064-7986c2920216"),
      imageUrl("photo-1517048676732-d65bc937f952"),
    ],
    education: [
      imageUrl("photo-1503676260728-1c00da094a0b"),
      imageUrl("photo-1523240795612-9a054b0db644"),
      imageUrl("photo-1519452635265-7b1fbfd1e4e0"),
      imageUrl("photo-1509062522246-3755977927d7"),
      imageUrl("photo-1497633762265-9d179a990aa6"),
      imageUrl("photo-1524995997946-a1c2e315a42f"),
    ],
  };

  function hashString(value) {
    return String(value || "").split("").reduce((hash, char) => ((hash * 31) + char.charCodeAt(0)) >>> 0, 0);
  }

  function inferTopic(text) {
    if (/交通|道路|公車|捷運|鐵路|通勤|運輸|車流|路線|班次|停車/.test(text)) return "transport";
    if (/教育|校園|學費|學校|學生|採購|課程/.test(text)) return "education";
    if (/能源|電價|供電|電網|再生|風力|太陽能|發電/.test(text)) return "energy";
    if (/居住|住宅|房價|房租|租屋|社宅|都更/.test(text)) return "housing";
    if (/勞工|薪資|就業|職安|加班|工資/.test(text)) return "labor";
    if (/預算|財經|財政|補助|稅|產業|投資|物價|經費|財源/.test(text)) return "budget";
    return "policy";
  }

  function chooseImage(topic, seed, usedImages) {
    const pool = TOPIC_IMAGES[topic] || TOPIC_IMAGES.policy;
    const start = hashString(seed) % pool.length;
    for (let offset = 0; offset < pool.length; offset += 1) {
      const candidate = pool[(start + offset) % pool.length];
      if (!usedImages.has(candidate)) {
        usedImages.add(candidate);
        return candidate;
      }
    }
    return pool[start] || TOPIC_IMAGES.policy[0];
  }

  function setImage(img, src) {
    if (!img || !src) return;
    if (img.getAttribute("src") !== src) img.setAttribute("src", src);
    img.setAttribute("referrerpolicy", "no-referrer");
  }

  function applyImageVariety() {
    const cards = Array.from(document.querySelectorAll("#articleGrid .article-card"));
    if (!cards.length) return false;

    const usedImages = new Set();
    cards.forEach((card, index) => {
      const text = card.textContent || "";
      const title = card.querySelector("h3")?.textContent || text;
      const topic = inferTopic(text);
      const src = chooseImage(topic, `${topic}|${title}|${index}`, usedImages);
      setImage(card.querySelector("img.thumb, img"), src);
    });

    const featured = document.querySelector("#featuredStory");
    const featuredImg = featured?.querySelector("img");
    if (featuredImg) {
      const text = featured.textContent || "";
      const topic = inferTopic(text);
      setImage(featuredImg, chooseImage(topic, `${topic}|featured|${text}`, new Set(usedImages)));
    }

    window.PolicyPulseImageVarietyHotfix = {
      loaded: true,
      cardCount: cards.length,
      uniqueImageCount: new Set(cards.map((card) => card.querySelector("img")?.getAttribute("src")).filter(Boolean)).size,
      refreshedAt: new Date().toISOString(),
    };
    return true;
  }

  function scheduleApply(delay) {
    setTimeout(() => applyImageVariety(), delay);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => scheduleApply(600), { once: true });
  } else {
    scheduleApply(300);
  }
  [1200, 2500, 5000, 9000, 14000].forEach(scheduleApply);

  const observer = new MutationObserver(() => {
    clearTimeout(observer.timer);
    observer.timer = setTimeout(() => applyImageVariety(), 80);
  });
  const startObserver = () => {
    ["articleGrid", "featuredStory"].forEach((id) => {
      const target = document.getElementById(id);
      if (target) observer.observe(target, { childList: true, subtree: true });
    });
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startObserver, { once: true });
  } else {
    startObserver();
  }
})();
