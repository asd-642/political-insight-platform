(function installArticleNestedArrayFix() {
  function objectItems(value) {
    return Object.entries(value || {})
      .filter(([key]) => /^item\d+$/.test(key))
      .sort(([a], [b]) => Number(a.slice(4)) - Number(b.slice(4)))
      .map(([, item]) => item);
  }

  window.normalizeList = function normalizeFirestoreSafeList(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (!value || typeof value !== "object") return [];
    if (Array.isArray(value.values)) return value.values.filter(Boolean);
    if (Array.isArray(value.items)) return value.items.filter(Boolean);
    const converted = objectItems(value).filter(Boolean);
    if (converted.length) return converted;
    if (value.text || value.value) return [value.text || value.value];
    return [];
  };

  function rerenderArticle() {
    if (typeof window.initArticle === "function") {
      window.initArticle();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", rerenderArticle, { once: true });
  } else {
    setTimeout(rerenderArticle, 0);
  }
})();
