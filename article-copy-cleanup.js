(function installArticleCopyCleanup() {
  function getArticleRoot() {
    return document.querySelector("#articleRoot");
  }

  function cleanupPublicCopy(value) {
    return String(value ?? "")
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
      .replace(/\s*追蹤建立$/g, "")
      .replace(/議題的的/g, "議題的")
      .replace(/\s{2,}/g, " ")
      .trim();
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
