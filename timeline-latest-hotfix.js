(function loadFreshHomepageBeforeRender() {
  const isHome = location.pathname === "/" || /\/index\.html$/i.test(location.pathname);
  if (!isHome) return;

  const cls = "policy-fresh-home-loading";
  const styleId = "policyFreshHomeBootstrapStyle";
  document.documentElement.classList.add(cls);

  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      html.${cls} #featuredStory,
      html.${cls} #headlineList,
      html.${cls} #articleGrid,
      html.${cls} #articlePagination,
      html.${cls} #detailBody { visibility: hidden; }
      html.${cls} #viewOverview::after {
        content: "正在更新今日文章";
        display: block;
        padding: 22px;
        border: 1px solid var(--line, #d7d0c2);
        background: var(--paper, #fffdf8);
        color: var(--ink, #0f1a22);
        font-weight: 800;
      }
      html[data-theme="dark"].${cls} #viewOverview::after {
        background: #0f2025;
        color: #f2fbf8;
        border-color: rgba(111, 226, 207, 0.28);
      }
    `;
    document.head.append(style);
  }

  function insertScript(script) {
    const current = document.currentScript;
    if (current?.parentNode) {
      current.parentNode.insertBefore(script, current.nextSibling);
    } else {
      document.head.append(script);
    }
  }

  function loadScriptOnce(src, marker) {
    return new Promise((resolve) => {
      const existing = document.querySelector(`script[src*="${marker}"]`);
      if (existing && existing !== document.currentScript) {
        existing.addEventListener("load", () => resolve(existing), { once: true });
        existing.addEventListener("error", () => resolve(existing), { once: true });
        setTimeout(() => resolve(existing), 1200);
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.onload = () => resolve(script);
      script.onerror = () => resolve(script);
      insertScript(script);
    });
  }

  const imageUrl = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=82`;
  const topicImages = {
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
      imageUrl("photo-1449965408869-eaa3f722e40d"),
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

  const topicKeywords = {
    transport: ["交通", "道路", "公車", "鐵路", "捷運", "通勤", "運輸"],
    education: ["教育", "校園", "學校", "採購", "教委"],
    energy: ["能源", "電價", "供電", "電網", "光電", "風力", "儲能"],
    housing: ["居住", "住宅", "租屋", "房屋", "社宅"],
    labor: ["勞工", "勞動", "薪資", "就業", "工資"],
    budget: ["財經", "預算", "補助", "稅", "財政", "產業"],
  };

  function hashString(value) {
    return String(value || "").split("").reduce((hash, char) => ((hash * 31) + char.charCodeAt(0)) >>> 0, 0);
  }

  function inferTopic(text) {
    const value = String(text || "");
    for (const [topic, words] of Object.entries(topicKeywords)) {
      if (words.some((word) => value.includes(word))) return topic;
    }
    return "policy";
  }

  function chooseImage(topic, seed, usedImages) {
    const pool = topicImages[topic] || topicImages.policy;
    const start = hashString(seed) % pool.length;
    for (let offset = 0; offset < pool.length; offset += 1) {
      const candidate = pool[(start + offset) % pool.length];
      if (!usedImages.has(candidate)) {
        usedImages.add(candidate);
        return candidate;
      }
    }
    return pool[start] || topicImages.policy[0];
  }

  function setManagedImage(img, src, fallbackSrc) {
    if (!img || !src) return;
    img.onerror = () => {
      img.onerror = null;
      if (fallbackSrc && img.getAttribute("src") !== fallbackSrc) img.setAttribute("src", fallbackSrc);
    };
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
      setManagedImage(card.querySelector("img.thumb, img"), src, topicImages.policy[index % topicImages.policy.length]);
    });

    const featured = document.querySelector("#featuredStory");
    const featuredImg = featured?.querySelector("img");
    if (featuredImg) {
      const text = featured.textContent || "";
      const topic = inferTopic(text);
      const src = chooseImage(topic, `${topic}|featured|${text}`, new Set(usedImages));
      setManagedImage(featuredImg, src, topicImages.policy[0]);
    }

    window.PolicyPulseImageVarietyHotfix = {
      loaded: true,
      inline: true,
      cardCount: cards.length,
      uniqueImageCount: new Set(cards.map((card) => card.querySelector("img")?.getAttribute("src")).filter(Boolean)).size,
      refreshedAt: new Date().toISOString(),
    };
    return true;
  }

  function installImageVarietyGuard() {
    [80, 300, 700, 1200, 2500, 5000, 9000, 14000].forEach((delay) => setTimeout(applyImageVariety, delay));
    const observer = new MutationObserver(() => {
      clearTimeout(installImageVarietyGuard.timer);
      installImageVarietyGuard.timer = setTimeout(applyImageVariety, 80);
    });
    ["articleGrid", "featuredStory"].forEach((id) => {
      const target = document.getElementById(id);
      if (target) observer.observe(target, { childList: true, subtree: true });
    });
  }

  loadScriptOnce("home-fresh-hotfix.js?v=20260611-3", "home-fresh-hotfix.js").then(() => {
    installImageVarietyGuard();
  });

  setTimeout(() => document.documentElement.classList.remove(cls), 18000);
})();
