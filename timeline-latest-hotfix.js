(function loadStableFreshHomepage() {
  const isHome = location.pathname === "/" || /\/index\.html$/i.test(location.pathname);
  if (!isHome) return;

  const loadingClass = "policy-fresh-home-loading";
  const styleId = "policyFreshHomeBootstrapStyle";
  const renderGuardTargets = new Set(["featuredStory", "headlineList", "articleGrid", "articlePagination", "detailBody"]);
  const imageUrl = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=82`;
  const images = [
    imageUrl("photo-1544620347-c4fd4a3d5957"),
    imageUrl("photo-1494515843206-f3117d3f51b7"),
    imageUrl("photo-1519003722824-194d4455a60c"),
    imageUrl("photo-1449965408869-eaa3f722e40d"),
    imageUrl("photo-1474487548417-781cb71495f3"),
    imageUrl("photo-1502877338535-766e1452684a"),
    imageUrl("photo-1532105956626-9569c03602f6"),
    imageUrl("photo-1511919884226-fd3cad34687c"),
    imageUrl("photo-1554224155-6726b3ff858f"),
    imageUrl("photo-1554224154-26032ffc0d07"),
    imageUrl("photo-1450101499163-c8848c66ca85"),
    imageUrl("photo-1579621970563-ebec7560ff3e"),
    imageUrl("photo-1542744173-8e7e53415bb0"),
    imageUrl("photo-1460925895917-afdab827c52f"),
    imageUrl("photo-1560518883-ce09059eeffa"),
    imageUrl("photo-1570129477492-45c003edd2be"),
    imageUrl("photo-1564013799919-ab600027ffc6"),
    imageUrl("photo-1600585154340-be6161a56a0c"),
    imageUrl("photo-1582407947304-fd86f028f716"),
    imageUrl("photo-1509391366360-2e959784a276"),
    imageUrl("photo-1473341304170-971dccb5ac1e"),
    imageUrl("photo-1466611653911-95081537e5b7"),
    imageUrl("photo-1508514177221-188b1cf16e9d"),
    imageUrl("photo-1473649085228-583485e6e4d7"),
    imageUrl("photo-1497440001374-f26997328c1b"),
    imageUrl("photo-1521737604893-d14cc237f11d"),
    imageUrl("photo-1556761175-b413da4baf72"),
    imageUrl("photo-1497366754035-f200968a6e72"),
    imageUrl("photo-1521791136064-7986c2920216"),
    imageUrl("photo-1517048676732-d65bc937f952"),
    imageUrl("photo-1503676260728-1c00da094a0b"),
    imageUrl("photo-1523240795612-9a054b0db644"),
    imageUrl("photo-1519452635265-7b1fbfd1e4e0"),
    imageUrl("photo-1509062522246-3755977927d7"),
    imageUrl("photo-1497633762265-9d179a990aa6"),
    imageUrl("photo-1524995997946-a1c2e315a42f"),
    imageUrl("photo-1486406146926-c627a92ad1ab"),
    imageUrl("photo-1529107386315-e1a2ed48a620"),
    imageUrl("photo-1526304640581-d334cdbbf45e"),
    imageUrl("photo-1541872705-1f73c6400ec9"),
  ];

  document.documentElement.classList.add(loadingClass);
  installLoadingStyle();
  suppressLegacyRenderLoop();
  installImageGuard();
  loadScriptOnce("home-fresh-hotfix.js?v=20260611-3", "home-fresh-hotfix.js");
  setTimeout(reveal, 18000);

  function installLoadingStyle() {
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      html.${loadingClass} #featuredStory,
      html.${loadingClass} #headlineList,
      html.${loadingClass} #articleGrid,
      html.${loadingClass} #articlePagination,
      html.${loadingClass} #detailBody { visibility: hidden; }
      html.${loadingClass} #viewOverview::after {
        content: "正在更新今日文章";
        display: block;
        padding: 22px;
        border: 1px solid var(--line, #d7d0c2);
        background: var(--paper, #fffdf8);
        color: var(--ink, #0f1a22);
        font-weight: 800;
      }
      html[data-theme="dark"].${loadingClass} #viewOverview::after {
        background: #0f2025;
        color: #f2fbf8;
        border-color: rgba(111, 226, 207, 0.28);
      }
      #articleGrid .article-card,
      #headlineList .headline-item,
      .filter-chip,
      .watch-row,
      #articleGrid .article-card:hover,
      #articleGrid .article-card.is-selected,
      #headlineList .headline-item:hover,
      #headlineList .headline-item.is-selected,
      .filter-chip:hover,
      .filter-chip.is-active,
      .watch-row:hover {
        transform: none !important;
      }
    `;
    document.head.append(style);
  }

  function reveal() {
    document.documentElement.classList.remove(loadingClass);
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

  function suppressLegacyRenderLoop() {
    const nativeObserve = MutationObserver.prototype.observe;
    const patchedObserve = function patchedObserve(target, options) {
      const isLegacyHomeGuard =
        target?.id &&
        renderGuardTargets.has(target.id) &&
        options?.childList === true &&
        options?.subtree === false;
      if (isLegacyHomeGuard) {
        window.PolicyPulseRenderLoopPatch = {
          suppressed: true,
          targetId: target.id,
          refreshedAt: new Date().toISOString(),
        };
        return undefined;
      }
      return nativeObserve.call(this, target, options);
    };
    MutationObserver.prototype.observe = patchedObserve;
    setTimeout(() => {
      if (MutationObserver.prototype.observe === patchedObserve) {
        MutationObserver.prototype.observe = nativeObserve;
      }
    }, 20000);
  }

  function hash(value) {
    return String(value || "").split("").reduce((sum, char) => ((sum * 31) + char.charCodeAt(0)) >>> 0, 0);
  }

  function pickImage(seed, used) {
    const start = hash(seed) % images.length;
    for (let offset = 0; offset < images.length; offset += 1) {
      const candidate = images[(start + offset) % images.length];
      if (!used.has(candidate)) {
        used.add(candidate);
        return candidate;
      }
    }
    return images[start] || images[0];
  }

  function setImage(img, src) {
    if (!img || !src || img.getAttribute("src") === src) return;
    img.onerror = () => {
      img.onerror = null;
      if (img.getAttribute("src") !== images[0]) img.setAttribute("src", images[0]);
    };
    img.setAttribute("src", src);
    img.setAttribute("referrerpolicy", "no-referrer");
  }

  function applyImageVariety() {
    const cards = Array.from(document.querySelectorAll("#articleGrid .article-card"));
    if (!cards.length) return false;
    const used = new Set();
    cards.forEach((card, index) => {
      const title = card.querySelector("h3")?.textContent || card.textContent || "";
      setImage(card.querySelector("img.thumb, img"), pickImage(`${title}|${index}`, used));
    });
    const featuredImg = document.querySelector("#featuredStory img");
    const featuredText = document.querySelector("#featuredStory")?.textContent || "";
    if (featuredImg) setImage(featuredImg, pickImage(`featured|${featuredText}`, new Set(used)));
    window.PolicyPulseImageVarietyHotfix = {
      loaded: true,
      stable: true,
      cardCount: cards.length,
      uniqueImageCount: new Set(cards.map((card) => card.querySelector("img")?.getAttribute("src")).filter(Boolean)).size,
      refreshedAt: new Date().toISOString(),
    };
    reveal();
    return true;
  }

  function installImageGuard() {
    [250, 700, 1300, 2500, 5000, 9000, 14000].forEach((delay) => setTimeout(applyImageVariety, delay));
    const observer = new MutationObserver(() => {
      clearTimeout(installImageGuard.timer);
      installImageGuard.timer = setTimeout(applyImageVariety, 140);
    });
    const attach = () => {
      ["articleGrid", "featuredStory"].forEach((id) => {
        const target = document.getElementById(id);
        if (target && !target.dataset.imageGuardObserved) {
          target.dataset.imageGuardObserved = "true";
          observer.observe(target, { childList: true, subtree: true });
        }
      });
    };
    attach();
    [500, 1500, 3500].forEach((delay) => setTimeout(attach, delay));
  }
})();
