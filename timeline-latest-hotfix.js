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

  if (!document.querySelector('script[src*="home-fresh-hotfix.js"]')) {
    const script = document.createElement("script");
    script.src = "home-fresh-hotfix.js?v=20260611-1";
    script.async = false;
    const current = document.currentScript;
    if (current?.parentNode) {
      current.parentNode.insertBefore(script, current.nextSibling);
    } else {
      document.head.append(script);
    }
  }

  setTimeout(() => document.documentElement.classList.remove(cls), 18000);
})();
