(function setupPolicyPulseVisuals() {
  const genericImages = new Set([
    "assets/podium.png",
    "assets/hero-market.png",
    "assets/housing.png",
    "assets/energy.png",
    "assets/transport.png",
    "assets/labor.png",
    "assets/education.png",
  ]);

  const paletteSets = [
    { bg: "#071015", bg2: "#17313a", panel: "#10242b", accent: "#2dd4bf", accent2: "#f4b942", ink: "#f8fafc", muted: "#9fc8ce", paper: "#eef3ea" },
    { bg: "#132018", bg2: "#2c3a24", panel: "#18291f", accent: "#78d27a", accent2: "#f0cf65", ink: "#f8fbef", muted: "#bbd3b8", paper: "#f1ead8" },
    { bg: "#171217", bg2: "#3a202d", panel: "#241822", accent: "#ff8c6b", accent2: "#ffd166", ink: "#fff6ef", muted: "#ddb9b6", paper: "#f6eadf" },
    { bg: "#081629", bg2: "#163a5c", panel: "#102338", accent: "#6fb7ff", accent2: "#2dd4bf", ink: "#f2f8ff", muted: "#a9c6df", paper: "#edf5ff" },
    { bg: "#f4efe4", bg2: "#d8eadf", panel: "#ffffff", accent: "#00796b", accent2: "#c47c16", ink: "#0f1720", muted: "#51606a", paper: "#fffaf0" },
    { bg: "#f7f2ea", bg2: "#f3ddbd", panel: "#fffdf7", accent: "#005f73", accent2: "#bb3e03", ink: "#121a20", muted: "#65737a", paper: "#ffffff" },
    { bg: "#10131f", bg2: "#202645", panel: "#171d31", accent: "#9a8cff", accent2: "#f4c430", ink: "#f8f7ff", muted: "#bdb8df", paper: "#f2eefc" },
    { bg: "#0e1719", bg2: "#263438", panel: "#162227", accent: "#e9d8a6", accent2: "#47c2a8", ink: "#f9f6ea", muted: "#c7c0aa", paper: "#f3ead5" },
  ];

  const topicWords = {
    budget: ["budget", "tax", "audit", "fund", "freeze"],
    housing: ["housing", "rent", "vacancy", "home", "zoning"],
    energy: ["energy", "grid", "solar", "storage", "power"],
    transport: ["transport", "bus", "rail", "route", "commute"],
    labor: ["labor", "wage", "work", "insurance", "contract"],
    education: ["education", "campus", "curriculum", "digital", "resource"],
    default: ["policy", "public", "brief", "record", "review"],
  };

  const photoPools = {
    budget: [
      "photo-1460925895917-afdab827c52f",
      "photo-1554224155-6726b3ff858f",
      "photo-1454165804606-c3d57bc86b40",
      "photo-1486406146926-c627a92ad1ab",
      "photo-1497366754035-f200968a6e72",
      "photo-1497366811353-6870744d04b2",
      "photo-1486312338219-ce68d2c6f44d",
      "photo-1516321318423-f06f85e504b3",
      "photo-1504384308090-c894fdcc538d",
      "photo-1517048676732-d65bc937f952",
      "photo-1551836022-d5d88e9218df",
      "photo-1554224154-22dec7ec8818",
      "photo-1520607162513-77705c0f0d4a",
      "photo-1551288049-bebda4e38f71",
    ],
    housing: [
      "photo-1560518883-ce09059eeffa",
      "photo-1570129477492-45c003edd2be",
      "photo-1600585154340-be6161a56a0c",
      "photo-1600607687939-ce8a6c25118c",
      "photo-1600566753190-17f0baa2a6c3",
      "photo-1598228723793-52759bba239c",
      "photo-1518780664697-55e3ad937233",
      "photo-1484154218962-a197022b5858",
      "photo-1449844908441-8829872d2607",
      "photo-1582407947304-fd86f028f716",
      "photo-1600047509807-ba8f99d2cdde",
      "photo-1560185127-6ed189bf02f4",
    ],
    energy: [
      "photo-1509395176047-4a66953fd231",
      "photo-1509391366360-2e959784a276",
      "photo-1473341304170-971dccb5ac1e",
      "photo-1497435334941-8c899ee9e8e9",
      "photo-1466611653911-95081537e5b7",
      "photo-1532601224476-15c79f2f7a51",
      "photo-1451187580459-43490279c0fa",
      "photo-1518770660439-4636190af475",
      "photo-1508514177221-188b1cf16e9d",
      "photo-1559302504-64aae6ca6b6d",
      "photo-1497440001374-f26997328c1b",
      "photo-1500530855697-b586d89ba3ee",
    ],
    transport: [
      "photo-1500530855697-b586d89ba3ee",
      "photo-1500534314209-a25ddb2bd429",
      "photo-1494515843206-f3117d3f51b7",
      "photo-1508057198894-247b23fe5ade",
      "photo-1544620347-c4fd4a3d5957",
      "photo-1519003722824-194d4455a60c",
      "photo-1516733968668-dbdce39c4651",
      "photo-1532105956626-9569c03602f6",
      "photo-1526772662000-3f88f10405ff",
      "photo-1501785888041-af3ef285b470",
      "photo-1449824913935-59a10b8d2000",
      "photo-1494783367193-149034c05e8f",
    ],
    labor: [
      "photo-1504384308090-c894fdcc538d",
      "photo-1517048676732-d65bc937f952",
      "photo-1521737604893-d14cc237f11d",
      "photo-1531482615713-2afd69097998",
      "photo-1552664730-d307ca884978",
      "photo-1581091226825-a6a2a5aee158",
      "photo-1504917595217-d4dc5ebe6122",
      "photo-1531973576160-7125cd663d86",
      "photo-1517245386807-bb43f82c33c4",
      "photo-1497366754035-f200968a6e72",
      "photo-1486312338219-ce68d2c6f44d",
      "photo-1497366811353-6870744d04b2",
    ],
    education: [
      "photo-1523050854058-8df90110c9f1",
      "photo-1503676260728-1c00da094a0b",
      "photo-1524995997946-a1c2e315a42f",
      "photo-1498243691581-b145c3f54a5a",
      "photo-1522202176988-66273c2fd55f",
      "photo-1488190211105-8b0e65b80b4e",
      "photo-1513258496099-48168024aec0",
      "photo-1456513080510-7bf3a84b82f8",
      "photo-1512820790803-83ca734da794",
      "photo-1497633762265-9d179a990aa6",
      "photo-1492538368677-f6e0afe31dcc",
      "photo-1509062522246-3755977927d7",
    ],
    default: [
      "photo-1497366754035-f200968a6e72",
      "photo-1486406146926-c627a92ad1ab",
      "photo-1500530855697-b586d89ba3ee",
      "photo-1454165804606-c3d57bc86b40",
      "photo-1504384308090-c894fdcc538d",
    ],
  };

  const cuePhotoTopics = {
    safety: "labor",
    wage: "labor",
    subsidy: "budget",
    prices: "budget",
    industry: "budget",
    local: "budget",
    "housing-tax": "housing",
    rent: "housing",
    solar: "energy",
    battery: "energy",
    grid: "energy",
    wind: "energy",
    bus: "transport",
    rail: "transport",
    campus: "education",
    "education-policy": "education",
  };

  const allPhotoIds = uniqueItems(Object.values(photoPools).flat());
  const photoAssignments = new Map();
  const usedPhotoIds = new Set();

  function hashText(value) {
    let hash = 2166136261;
    const text = String(value || "");
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function escapeXml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function isGenericImage(src = "") {
    const clean = String(src).split("?")[0];
    return !clean || genericImages.has(clean);
  }

  function pick(items, seed, offset = 0) {
    return items[(seed + offset) % items.length];
  }

  function uniqueItems(items = []) {
    return [...new Set(items.filter(Boolean))];
  }

  function shortLabel(article, topicLabel) {
    const title = String(article.title || topicLabel || "Policy brief")
      .replace(/[|｜:：,，.。;；!?！？]/g, " ")
      .trim();
    const parts = title.split(/\s+/).filter(Boolean);
    const label = parts.slice(0, 2).join(" ");
    return label.length > 18 ? `${label.slice(0, 18)}...` : label;
  }

  function clue(article, topic) {
    const text = `${article.title || ""} ${article.summary || ""} ${(article.tags || []).join(" ")}`.toLowerCase();
    if (/光電|太陽|solar/.test(text)) return "solar";
    if (/儲能|電池|battery|storage/.test(text)) return "battery";
    if (/電網|供電|停電|grid|power/.test(text)) return "grid";
    if (/風電|wind/.test(text)) return "wind";
    if (/空屋|房稅|vacancy|tax/.test(text)) return "housing-tax";
    if (/租屋|租金|rent/.test(text)) return "rent";
    if (/公車|公共運輸|bus/.test(text)) return "bus";
    if (/捷運|鐵路|rail|train/.test(text)) return "rail";
    if (/預算|凍結|budget|freeze/.test(text)) return "budget";
    if (/補助|津貼|subsidy|allowance/.test(text)) return "subsidy";
    if (/物價|通膨|價格|price|inflation/.test(text)) return "prices";
    if (/產業|投資|industry|investment/.test(text)) return "industry";
    if (/地方資源|區域|地方|local|regional/.test(text)) return "local";
    if (/薪資|最低工資|wage/.test(text)) return "wage";
    if (/職安|工安|職災|safety/.test(text)) return "safety";
    if (/校園|採購|school|campus/.test(text)) return "campus";
    if (/課綱|技職|學費|curriculum|tuition/.test(text)) return "education-policy";
    return topic;
  }

  function background(style, colors, seed) {
    if (style === 0) {
      return `
        <rect width="520" height="292" fill="${colors.bg}"/>
        <path d="M0 230 H520 M0 184 H520 M0 138 H520 M0 92 H520 M72 0 V292 M168 0 V292 M264 0 V292 M360 0 V292 M456 0 V292" stroke="${colors.accent}" stroke-opacity="0.13" stroke-width="2"/>
        <rect x="28" y="26" width="464" height="240" fill="none" stroke="${colors.accent2}" stroke-opacity="0.35" stroke-width="3"/>
      `;
    }
    if (style === 1) {
      return `
        <rect width="520" height="292" fill="${colors.bg}"/>
        <path d="M0 0 H214 L156 292 H0 Z" fill="${colors.bg2}" opacity="0.96"/>
        <path d="M236 0 H520 V292 H188 Z" fill="${colors.panel}" opacity="0.72"/>
        <path d="M34 244 H472" stroke="${colors.accent2}" stroke-width="6"/>
      `;
    }
    if (style === 2) {
      return `
        <rect width="520" height="292" fill="${colors.bg}"/>
        ${Array.from({ length: 8 }).map((_, index) => {
          const y = 42 + index * 28 + ((seed >> index) % 8);
          return `<path d="M0 ${y} C96 ${y - 28} 160 ${y + 34} 250 ${y} S410 ${y - 26} 520 ${y + 10}" fill="none" stroke="${index % 2 ? colors.accent : colors.accent2}" stroke-opacity="0.16" stroke-width="3"/>`;
        }).join("")}
        <rect x="32" y="34" width="456" height="224" fill="${colors.panel}" opacity="0.42"/>
      `;
    }
    if (style === 3) {
      return `
        <rect width="520" height="292" fill="${colors.paper}"/>
        <rect x="0" y="0" width="520" height="86" fill="${colors.bg}"/>
        <rect x="0" y="86" width="184" height="206" fill="${colors.bg2}"/>
        <rect x="184" y="86" width="336" height="206" fill="${colors.panel}"/>
        <path d="M24 44 H236" stroke="${colors.accent2}" stroke-width="7"/>
      `;
    }
    if (style === 4) {
      return `
        <rect width="520" height="292" fill="${colors.bg2}"/>
        <rect x="0" y="0" width="520" height="292" fill="${colors.bg}" opacity="0.62"/>
        ${Array.from({ length: 34 }).map((_, index) => {
          const x = 20 + ((seed + index * 47) % 480);
          const y = 24 + ((seed >> (index % 12)) + index * 31) % 236;
          return `<rect x="${x}" y="${y}" width="${16 + (index % 3) * 12}" height="3" fill="${index % 2 ? colors.accent : colors.accent2}" opacity="${0.26 + (index % 4) * 0.08}"/>`;
        }).join("")}
      `;
    }
    return `
      <rect width="520" height="292" fill="${colors.paper}"/>
      <rect x="22" y="20" width="216" height="246" fill="${colors.panel}" opacity="0.92"/>
      <rect x="266" y="36" width="214" height="58" fill="${colors.bg2}" opacity="0.92"/>
      <rect x="266" y="114" width="166" height="126" fill="${colors.bg}" opacity="0.88"/>
      <path d="M40 48 H206 M40 78 H176 M286 64 H452 M286 146 H394 M286 174 H418 M286 202 H370" stroke="${colors.accent}" stroke-width="6" opacity="0.72"/>
    `;
  }

  function dataMarks(colors, seed) {
    const mode = seed % 4;
    if (mode === 0) {
      return Array.from({ length: 7 }).map((_, index) => {
        const x = 36 + ((seed >> (index % 12)) + index * 71) % 430;
        const y = 46 + ((seed >> ((index + 3) % 12)) + index * 37) % 170;
        return `<rect x="${x}" y="${y}" width="${42 + (index % 3) * 18}" height="18" fill="${index % 2 ? colors.accent : colors.accent2}" opacity="0.28"/>`;
      }).join("");
    }
    if (mode === 1) {
      return Array.from({ length: 6 }).map((_, index) => {
        const x = 58 + index * 78;
        const y = 54 + ((seed >> (index % 14)) + index * 29) % 158;
        return `<circle cx="${x}" cy="${y}" r="${24 + (index % 3) * 12}" fill="${index % 2 ? colors.accent : colors.accent2}" opacity="0.2"/>`;
      }).join("");
    }
    if (mode === 2) {
      return Array.from({ length: 9 }).map((_, index) => {
        const x = 24 + index * 56;
        return `<path d="M${x} 28 V${84 + ((seed >> (index % 10)) % 140)}" stroke="${index % 2 ? colors.accent : colors.accent2}" stroke-width="${3 + (index % 3) * 2}" opacity="0.28"/>`;
      }).join("");
    }
    return `
      <path d="M34 58 C122 26 176 112 248 74 S392 32 486 88" fill="none" stroke="${colors.accent}" stroke-width="4" opacity="0.24"/>
      <path d="M38 214 C118 174 188 244 270 202 S408 156 484 208" fill="none" stroke="${colors.accent2}" stroke-width="5" opacity="0.24"/>
    `;
  }

  function documentStack(colors, seed, x = 64, y = 74) {
    return Array.from({ length: 4 }).map((_, index) => {
      const dx = index * 64;
      const dy = (index % 2) * 22;
      return `
        <rect x="${x + dx}" y="${y + dy}" width="74" height="104" rx="5" fill="${colors.paper}" stroke="${colors.ink}" stroke-opacity="0.18"/>
        <path d="M${x + dx + 14} ${y + dy + 32} H${x + dx + 58} M${x + dx + 14} ${y + dy + 54} H${x + dx + 54} M${x + dx + 14} ${y + dy + 76} H${x + dx + 46}" stroke="${index % 2 ? colors.accent : colors.accent2}" stroke-width="5"/>
      `;
    }).join("");
  }

  function bars(colors, seed, x = 70, y = 232) {
    return Array.from({ length: 10 }).map((_, index) => {
      const h = 36 + ((seed >> (index % 10)) + index * 17) % 120;
      return `<rect x="${x + index * 34}" y="${y - h}" width="18" height="${h}" rx="4" fill="${index % 3 ? colors.accent : colors.accent2}" opacity="${0.58 + (index % 3) * 0.12}"/>`;
    }).join("");
  }

  function buildings(colors, seed) {
    return Array.from({ length: 8 }).map((_, index) => {
      const h = 58 + ((seed >> (index % 9)) + index * 19) % 118;
      const x = 56 + index * 50;
      return `
        <rect x="${x}" y="${248 - h}" width="36" height="${h}" fill="${index % 2 ? colors.bg2 : colors.panel}" stroke="${colors.ink}" stroke-opacity="0.08"/>
        ${Array.from({ length: Math.max(2, Math.floor(h / 28)) }).map((__, row) => `
          <rect x="${x + 10}" y="${248 - h + 14 + row * 24}" width="6" height="8" fill="${colors.accent2}" opacity="0.86"/>
          <rect x="${x + 24}" y="${248 - h + 14 + row * 24}" width="6" height="8" fill="${colors.accent}" opacity="0.72"/>
        `).join("")}
      `;
    }).join("");
  }

  function lineChart(colors, seed, y = 230) {
    const points = Array.from({ length: 8 }).map((_, index) => {
      const x = 58 + index * 56;
      const lift = 28 + ((seed >> (index % 13)) + index * 23) % 118;
      return `${x},${y - lift}`;
    });
    return `
      <polyline points="${points.join(" ")}" fill="none" stroke="${colors.accent2}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      ${points.map((point, index) => {
        const [x, py] = point.split(",");
        return `<circle cx="${x}" cy="${py}" r="${index % 2 ? 7 : 5}" fill="${index % 2 ? colors.accent : colors.accent2}"/>`;
      }).join("")}
    `;
  }

  function nodeMap(colors, seed) {
    const nodes = Array.from({ length: 9 }).map((_, index) => ({
      x: 70 + ((seed >> (index % 12)) + index * 61) % 380,
      y: 64 + ((seed >> ((index + 4) % 14)) + index * 43) % 150,
    }));
    return `
      <g stroke="${colors.accent}" stroke-opacity="0.42" stroke-width="3">
        ${nodes.slice(1).map((node, index) => `<path d="M${nodes[index].x} ${nodes[index].y} L${node.x} ${node.y}"/>`).join("")}
      </g>
      ${nodes.map((node, index) => `
        <circle cx="${node.x}" cy="${node.y}" r="${12 + (index % 3) * 5}" fill="${index % 2 ? colors.accent2 : colors.accent}" opacity="0.86"/>
        <circle cx="${node.x}" cy="${node.y}" r="${5 + (index % 2) * 3}" fill="${colors.bg}"/>
      `).join("")}
    `;
  }

  function receiptPanel(colors, seed) {
    return `
      <rect x="${68 + (seed % 18)}" y="54" width="170" height="192" rx="8" fill="${colors.paper}" stroke="${colors.ink}" stroke-opacity="0.2"/>
      <path d="M96 92 H204 M96 124 H184 M96 156 H212 M96 188 H172" stroke="${colors.bg}" stroke-width="8" opacity="0.85"/>
      <rect x="286" y="86" width="138" height="118" rx="8" fill="${colors.bg2}" stroke="${colors.accent2}" stroke-width="5"/>
      <path d="M314 128 H398 M314 160 H376" stroke="${colors.paper}" stroke-width="8"/>
      <circle cx="420" cy="82" r="34" fill="${colors.accent}" opacity="0.88"/>
    `;
  }

  function meetingTable(colors, seed) {
    const x = 74 + (seed % 28);
    return `
      <rect x="${x}" y="104" width="314" height="94" rx="16" fill="${colors.bg2}" stroke="${colors.accent}" stroke-width="5"/>
      <path d="M${x + 34} 142 H${x + 134} M${x + 184} 142 H${x + 276} M${x + 34} 172 H${x + 246}" stroke="${colors.paper}" stroke-width="8"/>
      <circle cx="${x + 48}" cy="78" r="22" fill="${colors.accent2}"/>
      <circle cx="${x + 160}" cy="78" r="22" fill="${colors.accent}"/>
      <circle cx="${x + 276}" cy="78" r="22" fill="${colors.accent2}"/>
      <path d="M54 238 H468" stroke="${colors.accent2}" stroke-width="5"/>
    `;
  }

  function safetyScene(colors, seed) {
    const x = 86 + (seed % 32);
    return `
      <path d="M${x} 216 H418" stroke="${colors.accent2}" stroke-width="6"/>
      <rect x="${x + 16}" y="126" width="82" height="88" rx="8" fill="${colors.paper}"/>
      <rect x="${x + 132}" y="92" width="96" height="122" rx="8" fill="${colors.paper}"/>
      <rect x="${x + 260}" y="136" width="70" height="78" rx="8" fill="${colors.paper}"/>
      <path d="M${x + 36} 154 H${x + 80} M${x + 152} 124 H${x + 208} M${x + 152} 154 H${x + 196} M${x + 276} 164 H${x + 314}" stroke="${colors.bg}" stroke-width="7"/>
      <path d="M${x + 158} 74 Q${x + 180} 42 ${x + 214} 74 V88 H${x + 154} Z" fill="${colors.accent}" stroke="${colors.accent2}" stroke-width="4"/>
    `;
  }

  function educationScene(cue, colors, seed) {
    if (cue === "education-policy" || seed % 2) {
      return `
        <rect x="88" y="72" width="122" height="152" rx="8" fill="${colors.paper}" stroke="${colors.accent}" stroke-width="5"/>
        <rect x="244" y="58" width="178" height="132" rx="8" fill="${colors.bg2}" stroke="${colors.accent2}" stroke-width="5"/>
        <path d="M112 112 H184 M112 146 H176 M112 180 H166 M274 98 H386 M274 132 H362 M274 166 H398" stroke="${colors.ink}" stroke-opacity="0.72" stroke-width="7"/>
        <path d="M72 248 C156 204 270 280 438 218" fill="none" stroke="${colors.accent}" stroke-width="6"/>
      `;
    }
    return `
      <path d="M80 250 C154 174 344 174 434 250" fill="none" stroke="${colors.accent}" stroke-width="7"/>
      <path d="M118 270 C188 214 318 214 402 270" fill="none" stroke="${colors.accent2}" stroke-width="6"/>
      <rect x="92" y="120" width="102" height="62" rx="7" fill="${colors.paper}"/>
      <rect x="212" y="92" width="112" height="82" rx="7" fill="${colors.accent}"/>
      <rect x="348" y="126" width="90" height="56" rx="7" fill="${colors.paper}"/>
      <path d="M116 144 H174 M238 118 H296 M238 144 H286 M366 150 H420" stroke="${colors.ink}" stroke-width="5"/>
    `;
  }

  function energyScene(kind, colors, seed) {
    if (kind === "solar") {
      return `
        <g transform="translate(${36 + (seed % 30)} 118) skewX(-13)">
          ${Array.from({ length: 7 }).map((_, index) => `
            <rect x="${index * 62}" y="${index % 2 ? 38 : 0}" width="52" height="72" fill="${colors.bg2}" stroke="${colors.accent}" stroke-width="3"/>
            <path d="M${index * 62 + 9} ${index % 2 ? 58 : 20} H${index * 62 + 43} M${index * 62 + 26} ${index % 2 ? 42 : 4} V${index % 2 ? 102 : 64}" stroke="${colors.accent2}" stroke-opacity="0.55" stroke-width="3"/>
          `).join("")}
        </g>
        <path d="M42 250 C136 216 218 280 308 232 C372 198 430 210 484 176" fill="none" stroke="${colors.accent2}" stroke-width="6"/>
      `;
    }
    if (kind === "battery") {
      return `
        <rect x="86" y="92" width="112" height="148" rx="10" fill="${colors.panel}" stroke="${colors.accent}" stroke-width="6"/>
        <rect x="228" y="66" width="126" height="174" rx="10" fill="${colors.bg2}" stroke="${colors.accent}" stroke-width="6"/>
        <rect x="386" y="116" width="74" height="124" rx="10" fill="${colors.panel}" stroke="${colors.accent}" stroke-width="6"/>
        <path d="M118 134 H164 M118 166 H174 M118 198 H154 M262 110 H320 M262 146 H316 M262 182 H302 M406 154 H438 M406 188 H438" stroke="${colors.accent2}" stroke-width="6"/>
        <path d="M48 264 H482" stroke="${colors.accent2}" stroke-width="5"/>
      `;
    }
    if (kind === "wind") {
      return `
        <g stroke="${colors.accent}" stroke-width="6" stroke-linecap="round">
          <path d="M118 242 L118 112 M258 246 L258 82 M394 238 L394 124"/>
        </g>
        <g stroke="${colors.accent2}" stroke-width="5" stroke-linecap="round">
          <path d="M118 112 L66 86 M118 112 L166 82 M118 112 L120 54"/>
          <path d="M258 82 L204 56 M258 82 L316 54 M258 82 L258 30"/>
          <path d="M394 124 L344 100 M394 124 L446 96 M394 124 L398 76"/>
        </g>
        <path d="M40 266 C128 232 206 292 286 252 C360 216 420 242 486 202" fill="none" stroke="${colors.accent}" stroke-width="5"/>
      `;
    }
    return `
      <g stroke="${colors.accent}" stroke-width="8" stroke-linecap="round">
        <path d="M84 236 L138 76 L196 236"/>
        <path d="M306 236 L362 76 L420 236"/>
        <path d="M112 150 H166 M334 150 H388"/>
      </g>
      <path d="M62 254 C142 214 214 282 304 226 C372 184 430 202 488 166" fill="none" stroke="${colors.accent2}" stroke-width="6"/>
      <rect x="78" y="246" width="342" height="26" fill="${colors.panel}" opacity="0.8"/>
    `;
  }

  function topicShape(topic, cue, variant, colors, seed) {
    if (topic === "energy") return energyScene(cue, colors, seed);
    if (topic === "housing") {
      if (cue === "housing-tax" || variant % 3 === 0) {
        return `
          ${buildings(colors, seed)}
          <rect x="64" y="64" width="128" height="74" fill="${colors.paper}" stroke="${colors.accent}" stroke-width="4"/>
          <path d="M86 92 H168 M86 116 H146" stroke="${colors.ink}" stroke-opacity="0.65" stroke-width="5"/>
          <path d="M332 78 L436 78 L456 132 L312 132 Z" fill="${colors.accent2}" opacity="0.72"/>
        `;
      }
      return `
        <path d="M74 164 L158 94 L242 164 V248 H74 Z" fill="${colors.bg2}" stroke="${colors.accent}" stroke-width="5"/>
        <path d="M278 144 L352 88 L438 144 V248 H278 Z" fill="${colors.panel}" stroke="${colors.accent2}" stroke-width="5"/>
        <rect x="116" y="184" width="48" height="64" fill="${colors.paper}"/>
        <path d="M92 150 L158 94 L224 150 M296 132 L352 88 L420 132" stroke="${colors.ink}" stroke-opacity="0.2" stroke-width="8"/>
        <path d="M46 268 H480" stroke="${colors.accent}" stroke-width="5"/>
      `;
    }
    if (topic === "transport") {
      if (cue === "rail" || variant % 3 === 1) {
        return `
          <path d="M36 248 H484" stroke="${colors.accent2}" stroke-width="5"/>
          <path d="M58 270 H462" stroke="${colors.accent}" stroke-width="5"/>
          <rect x="96" y="92" width="318" height="104" rx="12" fill="${colors.paper}"/>
          <rect x="124" y="120" width="68" height="42" rx="4" fill="${colors.bg2}"/>
          <rect x="212" y="120" width="84" height="42" rx="4" fill="${colors.bg2}"/>
          <rect x="316" y="120" width="58" height="42" rx="4" fill="${colors.bg2}"/>
          <circle cx="156" cy="202" r="15" fill="${colors.ink}"/>
          <circle cx="354" cy="202" r="15" fill="${colors.ink}"/>
        `;
      }
      return `
        <path d="M18 238 L500 194 L500 292 H18 Z" fill="${colors.panel}" opacity="0.9"/>
        <g stroke="${colors.accent2}" stroke-width="2" opacity="0.8">
          <path d="M56 262 L486 218"/>
          <path d="M82 282 L500 238"/>
        </g>
        <rect x="82" y="104" width="332" height="88" rx="10" fill="${colors.paper}"/>
        <rect x="112" y="128" width="84" height="38" rx="4" fill="${colors.bg2}"/>
        <rect x="216" y="128" width="96" height="38" rx="4" fill="${colors.bg2}"/>
        <circle cx="142" cy="198" r="17" fill="${colors.ink}"/>
        <circle cx="352" cy="198" r="17" fill="${colors.ink}"/>
        <path d="M82 194 H414" stroke="${colors.accent}" stroke-width="5"/>
      `;
    }
    if (topic === "budget") {
      if (cue === "safety" || cue === "wage") {
        return safetyScene(colors, seed);
      }
      if (cue === "industry" || cue === "local") {
        return `
          ${nodeMap(colors, seed)}
          <rect x="70" y="218" width="120" height="34" fill="${colors.panel}" opacity="0.9"/>
          <rect x="210" y="218" width="92" height="34" fill="${colors.bg2}" opacity="0.9"/>
          <rect x="324" y="218" width="116" height="34" fill="${colors.panel}" opacity="0.9"/>
        `;
      }
      if (cue === "subsidy" || cue === "prices") {
        return receiptPanel(colors, seed);
      }
      if (variant % 5 === 0) {
        return `
          ${lineChart(colors, seed)}
          <rect x="66" y="70" width="120" height="54" fill="${colors.paper}" opacity="0.94"/>
          <path d="M88 98 H164" stroke="${colors.ink}" stroke-opacity="0.55" stroke-width="7"/>
          <rect x="330" y="80" width="92" height="92" rx="46" fill="${colors.accent}" opacity="0.22"/>
        `;
      }
      if (variant % 5 === 1) {
        return `
          ${bars(colors, seed, 92, 238)}
          <path d="M54 246 C132 206 204 260 286 212 C360 170 426 188 478 138" fill="none" stroke="${colors.accent2}" stroke-width="7"/>
          <rect x="64" y="56" width="132" height="52" fill="${colors.paper}" opacity="0.9"/>
          <path d="M84 84 H172" stroke="${colors.ink}" stroke-opacity="0.55" stroke-width="6"/>
        `;
      }
      if (variant % 5 === 2) {
        return meetingTable(colors, seed);
      }
      return `
        ${documentStack(colors, seed, 58, 76)}
        <path d="M320 88 L454 88 L454 226 L320 226 Z" fill="${colors.bg2}" stroke="${colors.accent2}" stroke-width="5"/>
        <path d="M344 128 H430 M344 160 H414 M344 192 H392" stroke="${colors.paper}" stroke-width="7"/>
      `;
    }
    if (topic === "labor") {
      if (cue === "safety" || variant % 3 === 0) {
        return safetyScene(colors, seed);
      }
      if (cue === "wage" || variant % 3 === 1) {
        return `
          ${bars(colors, seed, 86, 238)}
          <rect x="72" y="64" width="154" height="56" fill="${colors.paper}" opacity="0.92"/>
          <path d="M96 92 H202" stroke="${colors.ink}" stroke-opacity="0.55" stroke-width="7"/>
          <path d="M52 258 H466" stroke="${colors.accent2}" stroke-width="5"/>
        `;
      }
      return `
        ${documentStack(colors, seed, 78, 102)}
        <rect x="214" y="58" width="92" height="30" rx="10" fill="${colors.accent}"/>
        <path d="M58 256 H462" stroke="${colors.accent2}" stroke-width="5"/>
        <path d="M370 86 L426 122 L398 172 L344 136 Z" fill="${colors.bg2}" stroke="${colors.accent}" stroke-width="5"/>
      `;
    }
    if (topic === "education") {
      return educationScene(cue, colors, seed);
    }
    return `
      ${bars(colors, seed, 74, 232)}
      <path d="M54 258 C150 220 218 286 310 234 C378 198 420 212 478 182" fill="none" stroke="${colors.accent2}" stroke-width="5"/>
      <path d="M50 280 H472" stroke="${colors.accent}" stroke-width="4"/>
    `;
  }

  function photoUrl(photoId, seed) {
    const cropModes = ["entropy", "edges"];
    const crop = pick(cropModes, seed, 2);
    return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&crop=${crop}&w=960&h=540&q=82`;
  }

  function realPhotoCover(article = {}, topicLabel = "") {
    const topic = article.topic || "default";
    const title = article.title || topicLabel || "Policy brief";
    const articleKey = article.id || title;
    if (photoAssignments.has(articleKey)) {
      return photoAssignments.get(articleKey);
    }

    const seed = hashText(`${article.id || ""}|${title}|${article.updated || ""}|${article.summary || ""}|${article.imagePrompt || ""}|${(article.tags || []).join("|")}`);
    const cueName = clue(article, topic);
    const photoTopic = cuePhotoTopics[cueName] || topic;
    const relatedTopics = {
      budget: ["budget", "labor", "housing", "default"],
      housing: ["housing", "budget", "transport", "default"],
      energy: ["energy", "transport", "budget", "default"],
      transport: ["transport", "housing", "energy", "default"],
      labor: ["labor", "budget", "education", "default"],
      education: ["education", "labor", "budget", "default"],
      default: ["default", "budget", "transport"],
    };
    const primaryPool = uniqueItems(photoPools[photoTopic] || photoPools[topic] || photoPools.default);
    const relatedPool = uniqueItems((relatedTopics[photoTopic] || relatedTopics[topic] || relatedTopics.default)
      .flatMap((name) => photoPools[name] || []));
    const chooseUnusedPhoto = (pool) => {
      for (let step = 0; step < pool.length; step += 1) {
        const candidate = pool[(seed + cueName.length + step * 7) % pool.length];
        if (!usedPhotoIds.has(candidate)) return candidate;
      }
      return "";
    };

    let photoId = chooseUnusedPhoto(primaryPool);
    if (!photoId) photoId = chooseUnusedPhoto(relatedPool);
    if (!photoId) photoId = chooseUnusedPhoto(allPhotoIds);
    if (!photoId) photoId = pick(primaryPool, seed, cueName.length);
    usedPhotoIds.add(photoId);
    const url = photoUrl(photoId, seed);
    photoAssignments.set(articleKey, url);
    return url;
  }

  function generatedCover(article = {}, topicLabel = "") {
    const topic = article.topic || "default";
    const title = article.title || topicLabel || "Policy brief";
    const seed = hashText(`${article.id || ""}|${title}|${article.updated || ""}|${article.summary || ""}|${article.imagePrompt || ""}|${(article.tags || []).join("|")}`);
    const colors = paletteSets[seed % paletteSets.length];
    const style = (seed >> 5) % 6;
    const variant = (seed >> 11) % 17;
    const cueName = clue(article, topic);
    const label = shortLabel(article, topicLabel);
    const words = topicWords[topic] || topicWords.default;
    const wordA = pick(words, seed, 1).toUpperCase();
    const wordB = pick(words, seed, 3).toUpperCase();
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 292" role="img" aria-label="${escapeXml(title)}">
        ${background(style, colors, seed)}
        <g opacity="0.95">
          ${dataMarks(colors, seed)}
        </g>
        <g opacity="0.98">
          ${topicShape(topic, cueName, variant, colors, seed)}
        </g>
        <rect x="0" y="0" width="8" height="292" fill="${colors.accent}"/>
        <g font-family="Arial, 'Noto Sans TC', sans-serif">
          <rect x="24" y="22" width="${96 + (seed % 44)}" height="28" fill="${colors.accent}" opacity="0.92"/>
          <text x="38" y="42" fill="${colors.bg}" font-size="13" font-weight="700">${escapeXml(wordA)}</text>
          <text x="36" y="274" fill="${colors.ink}" font-size="18" font-weight="800" opacity="0.92">${escapeXml(label)}</text>
          <text x="386" y="42" fill="${colors.accent2}" font-size="12" font-weight="700" opacity="0.9">${escapeXml(wordB)}</text>
        </g>
      </svg>
    `;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function articleImage(article = {}, topicLabel = "") {
    if (article.image && !isGenericImage(article.image) && article.imageMode !== "generated") {
      return article.image;
    }
    return realPhotoCover(article, topicLabel) || generatedCover(article, topicLabel);
  }

  window.PolicyPulseVisuals = {
    articleImage,
    realPhotoCover,
    generatedCover,
    isGenericImage,
  };
})();
