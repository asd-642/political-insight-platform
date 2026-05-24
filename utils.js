(function setupPolicyPulseUtils() {
  const escapeHtml = (value = "") =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const formatTime = (value, locale = "zh-Hant-TW") => {
    try {
      return new Intl.DateTimeFormat(locale, {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value));
    } catch {
      return value;
    }
  };

  const taipeiDate = (date = new Date()) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${byType.year}-${byType.month}-${byType.day}`;
  };

  const articleUrl = (id) => `articles/${encodeURIComponent(id)}.html`;

  const unique = (items = []) => [
    ...new Set(items.map((item) => String(item || "").trim()).filter(Boolean)),
  ];

  const clearNode = (node) => {
    if (!node) return;
    while (node.firstChild) node.removeChild(node.firstChild);
  };

  const replaceChildren = (node, children = []) => {
    if (!node) return;
    clearNode(node);
    const fragment = document.createDocumentFragment();
    children.filter(Boolean).forEach((child) => fragment.appendChild(child));
    node.appendChild(fragment);
  };

  window.PolicyPulseUtils = {
    escapeHtml,
    formatTime,
    taipeiDate,
    articleUrl,
    unique,
    clearNode,
    replaceChildren,
  };
})();
