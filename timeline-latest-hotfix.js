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

  loadScriptOnce("home-fresh-hotfix.js?v=20260611-3", "home-fresh-hotfix.js").then(() => {
    loadScriptOnce("home-image-variety-hotfix.js?v=20260611-2", "home-image-variety-hotfix.js");
  });

  setTimeout(() => document.documentElement.classList.remove(cls), 18000);
})();
