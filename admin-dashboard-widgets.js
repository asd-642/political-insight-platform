(function installAdminDashboardWidgets() {
  const topicLabels = {
    budget: "財經",
    housing: "居住",
    energy: "能源",
    transport: "交通",
    labor: "勞工",
    education: "教育",
  };
  const topicMatchers = [
    ["交通", /交通|公車|捷運|鐵路|通勤|月票|道路|運輸/],
    ["財經", /財經|財政|預算|稅|物價|投資|產業|支出|補助/],
    ["居住", /居住|住宅|社宅|租屋|房租|都更|房價/],
    ["能源", /能源|供電|停電|電價|電網|光電|儲能/],
    ["勞工", /勞工|勞保|職安|工時|薪資|最低工資|就業/],
    ["教育", /教育|校園|學費|高教|技職|課綱/],
  ];
  const palette = ["#087a6d", "#b66a00", "#315d8c", "#7a4a89", "#4f7d35", "#9b3d35", "#5a6472"];

  function installStyles() {
    if (document.querySelector("#adminDashboardWidgetStyles")) return;
    const style = document.createElement("style");
    style.id = "adminDashboardWidgetStyles";
    style.textContent = `
      .traffic-chart{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:12px;align-items:end;min-height:150px;padding-top:10px}
      .traffic-bar{display:grid;grid-template-rows:1fr auto auto;gap:6px;min-width:0;text-align:center;color:var(--muted, #52606d)}
      .traffic-stack{height:96px;display:flex;align-items:flex-end;border:1px solid rgba(8,122,109,.22);background:rgba(8,122,109,.05)}
      .traffic-stack i{display:block;width:100%;height:var(--bar-height,8%);min-height:4px;background:#087a6d}
      .traffic-bar strong{font-size:14px;color:var(--ink, #101820)}
      .traffic-bar small{font-size:12px;white-space:nowrap}
      .topic-chart-shell{display:grid;grid-template-columns:minmax(116px,150px) 1fr;gap:18px;align-items:center}
      .topic-donut{width:140px;max-width:100%;aspect-ratio:1;border-radius:50%;display:grid;place-items:center;position:relative;background:rgba(8,122,109,.12)}
      .topic-donut::after{content:"";position:absolute;inset:24%;border-radius:50%;background:var(--panel, #fffdf8)}
      .topic-donut strong,.topic-donut span{position:relative;z-index:1}
      .topic-donut strong{display:block;font-size:26px;line-height:1;color:var(--ink, #101820)}
      .topic-donut span{align-self:start;margin-top:6px;font-size:12px;color:var(--muted, #52606d)}
      .topic-legend,.insight-list{display:grid;gap:10px}
      .topic-legend-row,.insight-row{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center}
      .topic-legend-row i{width:10px;height:10px;border-radius:999px}
      .topic-legend-row span,.insight-row span{color:var(--muted, #52606d)}
      .insight-row{grid-template-columns:1fr auto}
      .insight-row i{grid-column:1 / -1;height:6px;background:linear-gradient(90deg,#087a6d var(--insight-width,0%),rgba(8,122,109,.12) var(--insight-width,0%));border-radius:999px}
      .insight-empty{color:var(--muted, #52606d);padding:8px 0}
      .activity-heatmap{display:grid;grid-template-columns:34px repeat(24,minmax(8px,1fr));gap:4px;align-items:center;overflow:auto;padding-top:8px}
      .heatmap-axis,.heatmap-hour,.heatmap-day{font-size:11px;color:var(--muted, #52606d)}
      .heatmap-hour{text-align:center}
      .heatmap-cell{aspect-ratio:1;min-width:8px;border:1px solid rgba(8,122,109,.16);background:color-mix(in srgb,#087a6d var(--heat-mix,12%),transparent)}
      @media (max-width:720px){.traffic-chart{gap:8px}.topic-chart-shell{grid-template-columns:1fr}.activity-heatmap{grid-template-columns:30px repeat(12,minmax(12px,1fr))}.activity-heatmap .heatmap-hour:nth-of-type(n+14),.activity-heatmap .heatmap-cell:nth-child(2n){display:none}}
    `;
    document.head.append(style);
  }

  function escapeHtml(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function payloadOf(event) {
    return event && typeof event.payload === "object" && event.payload ? event.payload : {};
  }

  function dateFromValue(value) {
    if (!value) return null;
    if (typeof value.toDate === "function") return value.toDate();
    if (typeof value === "object" && Number.isFinite(value.seconds)) return new Date(value.seconds * 1000);
    if (typeof value === "number") return new Date(value < 10000000000 ? value * 1000 : value);
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function eventDate(event) {
    const payload = payloadOf(event);
    return dateFromValue(event?.at) || dateFromValue(event?.createdAtIso) || dateFromValue(event?.createdAt) || dateFromValue(event?.timestamp) || dateFromValue(payload.at) || dateFromValue(payload.timestamp) || new Date();
  }

  function localDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function normalizeTopic(value = "") {
    const text = String(value).trim();
    if (!text) return "";
    return topicLabels[text] || topicLabels[text.toLowerCase()] || text;
  }

  function inferTopic(text = "") {
    const row = topicMatchers.find(([, pattern]) => pattern.test(text));
    return row ? row[0] : "";
  }

  function eventTopic(event) {
    const payload = payloadOf(event);
    const explicit = normalizeTopic(payload.topicName || payload.topic || payload.category || payload.categoryName);
    if (explicit) return explicit;
    const text = [payload.title, payload.query, payload.id, payload.articleId, payload.path, event?.path].filter(Boolean).join(" ");
    return inferTopic(text) || "未分類";
  }

  function countLabels(labels) {
    const counts = new Map();
    labels.forEach((label) => {
      if (!label) return;
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }

  function sourceLabel(event) {
    const payload = payloadOf(event);
    const raw = String(payload.source || payload.channel || payload.referrer || payload.from || "").trim();
    const lower = raw.toLowerCase();
    if (lower.includes("google")) return "Google 搜尋";
    if (lower.includes("facebook")) return "Facebook";
    if (lower.includes("threads")) return "Threads";
    if (lower.includes("line")) return "LINE";
    if (lower.includes("yahoo")) return "Yahoo";
    if (raw) {
      try {
        const host = new URL(raw).hostname.replace(/^www\./, "");
        if (host && host !== location.hostname) return host;
      } catch {
        return raw.length > 18 ? `${raw.slice(0, 18)}...` : raw;
      }
    }
    if (event?.type === "search") return "站內搜尋";
    if (["article_select", "article_open", "article_read"].includes(event?.type)) return "文章閱讀";
    if (String(event?.type || "").startsWith("comment")) return "留言互動";
    if (event?.type === "page_view") return "直接進站";
    return "其他事件";
  }

  function browserLabel(event) {
    const payload = payloadOf(event);
    const text = String(payload.browser || payload.userAgent || payload.ua || navigator.userAgent || "").toLowerCase();
    if (text.includes("edg")) return "Edge";
    if (text.includes("chrome") || text.includes("crios")) return "Chrome";
    if (text.includes("firefox")) return "Firefox";
    if (text.includes("safari")) return "Safari";
    if (text.includes("samsung")) return "Samsung Internet";
    return "其他瀏覽器";
  }

  function renderTraffic(events) {
    const chart = document.querySelector("#trafficTrendChart");
    if (!chart) return;
    const today = new Date();
    const buckets = Array.from({ length: 7 }, (_, offset) => {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (6 - offset));
      return { key: localDateKey(date), label: new Intl.DateTimeFormat("zh-Hant-TW", { weekday: "short" }).format(date), count: 0 };
    });
    const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));
    events.forEach((event) => {
      const bucket = bucketMap.get(localDateKey(eventDate(event)));
      if (bucket) bucket.count += 1;
    });
    const max = Math.max(1, ...buckets.map((bucket) => bucket.count));
    chart.innerHTML = buckets.map((bucket) => {
      const height = Math.max(6, Math.round((bucket.count / max) * 100));
      return `<div class="traffic-bar" title="${escapeHtml(bucket.key)}，${bucket.count} 筆事件"><span class="traffic-stack"><i style="--bar-height:${height}%"></i></span><strong>${bucket.count}</strong><small>${escapeHtml(bucket.label)}</small></div>`;
    }).join("");
  }

  function renderTopicShare(events) {
    const donut = document.querySelector("#topicDonut");
    const legend = document.querySelector("#topicLegend");
    if (!donut || !legend) return;
    const rows = countLabels(events.map(eventTopic)).slice(0, 6);
    const total = rows.reduce((sum, [, count]) => sum + count, 0);
    if (!total) {
      donut.style.background = "";
      donut.innerHTML = "<strong>0</strong><span>事件</span>";
      legend.innerHTML = '<div class="insight-empty">目前沒有可分類的事件。</div>';
      return;
    }
    let cursor = 0;
    const segments = rows.map(([, count], index) => {
      const start = cursor;
      const end = cursor + (count / total) * 100;
      cursor = end;
      return `${palette[index % palette.length]} ${start}% ${end}%`;
    });
    donut.style.background = `conic-gradient(${segments.join(", ")})`;
    donut.innerHTML = `<strong>${total}</strong><span>事件</span>`;
    legend.innerHTML = rows.map(([label, count], index) => `<div class="topic-legend-row"><i style="background:${palette[index % palette.length]}"></i><span>${escapeHtml(label)}</span><strong>${Math.round((count / total) * 100)}%</strong></div>`).join("");
  }

  function renderInsightList(selector, rows, emptyText) {
    const container = document.querySelector(selector);
    if (!container) return;
    if (!rows.length) {
      container.innerHTML = `<div class="insight-empty">${escapeHtml(emptyText)}</div>`;
      return;
    }
    const total = rows.reduce((sum, row) => sum + row.count, 0) || 1;
    container.innerHTML = rows.map((row) => {
      const percent = Math.round((row.count / total) * 100);
      return `<div class="insight-row"><div><strong>${escapeHtml(row.label)}</strong><span>${escapeHtml(row.note || `${row.count} 筆事件`)}</span></div><b>${percent}%</b><i style="--insight-width:${percent}%"></i></div>`;
    }).join("");
  }

  function renderHeatmap(events) {
    const grid = document.querySelector("#heatmapGrid");
    if (!grid) return;
    const matrix = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
    events.forEach((event) => {
      const date = eventDate(event);
      matrix[date.getDay()][date.getHours()] += 1;
    });
    const max = Math.max(1, ...matrix.flat());
    const days = ["日", "一", "二", "三", "四", "五", "六"];
    grid.innerHTML = `<div class="heatmap-axis"></div>${Array.from({ length: 24 }, (_, hour) => `<div class="heatmap-hour">${hour}</div>`).join("")}${matrix.map((hours, day) => `<div class="heatmap-day">週${days[day]}</div>${hours.map((count, hour) => `<span class="heatmap-cell" style="--heat-mix:${Math.round(12 + (count / max) * 80)}%" title="週${days[day]} ${hour}:00，${count} 筆事件"></span>`).join("")}`).join("")}`;
  }

  async function loadEvents() {
    try {
      if (typeof readStatsForAdmin === "function") {
        const remote = await readStatsForAdmin();
        if (Array.isArray(remote)) return remote;
      }
    } catch {}
    return window.PolicyPulseStats?.read?.() || [];
  }

  async function renderWidgets() {
    installStyles();
    const events = await loadEvents();
    if (!Array.isArray(events)) return;
    renderTraffic(events);
    renderTopicShare(events);
    renderInsightList("#sourceInsights", countLabels(events.map(sourceLabel)).slice(0, 5).map(([label, count]) => ({ label, count })), "目前沒有可分類的流量來源。");
    renderInsightList("#browserInsights", countLabels(events.map(browserLabel)).slice(0, 5).map(([label, count]) => ({ label, count })), "目前沒有瀏覽器事件。");
    renderHeatmap(events);
  }

  window.PolicyPulseRenderAdminDashboardWidgets = renderWidgets;
  const schedule = (delay = 0) => window.setTimeout(renderWidgets, delay);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => schedule(), { once: true });
  else schedule();
  schedule(800);
  schedule(2200);
  document.addEventListener("policy-auth-change", () => schedule(300));
  document.querySelector("#refreshStats")?.addEventListener("click", () => schedule(650));
})();
