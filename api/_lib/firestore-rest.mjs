import crypto from "node:crypto";

const tokenCache = {
  token: "",
  expiresAt: 0,
};

function stripEnvAssignment(value) {
  return String(value || "").replace(/^\s*(FIREBASE_SERVICE_ACCOUNT|GOOGLE_SERVICE_ACCOUNT_JSON)\s*=\s*/i, "");
}

function stripWrappingQuotes(value) {
  const trimmed = String(value || "").trim();
  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];
  if ((first === "'" || first === "\"" || first === "`") && first === last) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function parseJsonCandidate(text) {
  let value = JSON.parse(text.replace(/^\uFEFF/, ""));
  if (typeof value === "string") {
    value = JSON.parse(value);
  }
  return value;
}

function serviceAccountCandidates(raw) {
  const direct = stripWrappingQuotes(stripEnvAssignment(raw));
  const base64Source = direct.replace(/^base64:/i, "").trim();
  const candidates = [
    raw,
    direct,
    direct.replace(/\\"/g, "\""),
  ];

  for (const encoding of ["base64", "base64url"]) {
    try {
      candidates.push(Buffer.from(base64Source, encoding).toString("utf8"));
    } catch {
      // Try the next representation.
    }
  }

  return [...new Set(candidates.map((item) => String(item || "").trim()).filter(Boolean))];
}

function parseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "";
  if (!raw.trim()) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT on Vercel.");
  }

  let account;
  for (const candidate of serviceAccountCandidates(raw)) {
    try {
      account = parseJsonCandidate(candidate);
      break;
    } catch {
      account = null;
    }
  }

  if (!account || typeof account !== "object") {
    throw new Error("FIREBASE_SERVICE_ACCOUNT format is invalid. Paste the full service account JSON or a base64 encoded JSON value.");
  }

  if (!account.client_email || !account.private_key) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT must include client_email and private_key.");
  }

  account.private_key = String(account.private_key).replace(/\\n/g, "\n");
  return account;
}

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (tokenCache.token && tokenCache.expiresAt - 60 > now) return tokenCache.token;

  const account = parseServiceAccount();
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${payload}`;
  let signature;
  try {
    signature = crypto
      .createSign("RSA-SHA256")
      .update(unsigned)
      .sign(account.private_key, "base64url");
  } catch {
    throw new Error("Firebase service account private_key is invalid. Recopy the key from Firebase service account JSON.");
  }
  const assertion = `${unsigned}.${signature}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Unable to authorize Firebase service account.");
  }

  tokenCache.token = data.access_token;
  tokenCache.expiresAt = now + Number(data.expires_in || 3600);
  return tokenCache.token;
}

export function firebaseProjectId() {
  if (process.env.FIREBASE_PROJECT_ID) return process.env.FIREBASE_PROJECT_ID;
  return parseServiceAccount().project_id || "policy-pulse-tw";
}

function documentUrl(collection, id) {
  return `https://firestore.googleapis.com/v1/projects/${firebaseProjectId()}/databases/(default)/documents/${collection}/${encodeURIComponent(id)}`;
}

async function firestoreFetch(url, options = {}) {
  const token = await getAccessToken();
  const response = await fetch(url, {
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error?.message || `Firestore request failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

function toFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreValue) } };
  }
  if (typeof value === "object") {
    return { mapValue: { fields: toFirestoreFields(value) } };
  }
  return { stringValue: String(value) };
}

function toFirestoreFields(object) {
  return Object.fromEntries(
    Object.entries(object || {})
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, toFirestoreValue(value)]),
  );
}

function normalizeDraftFact(fact, index) {
  if (Array.isArray(fact)) {
    return {
      label: String(fact[0] || `Fact ${index + 1}`),
      value: String(fact[1] || ""),
    };
  }
  if (fact && typeof fact === "object") {
    return {
      label: String(fact.label || fact.name || `Fact ${index + 1}`),
      value: String(fact.value || fact.text || fact.description || ""),
    };
  }
  return {
    label: `Fact ${index + 1}`,
    value: String(fact || ""),
  };
}

function normalizeDraftSection(section, index) {
  if (!section || typeof section !== "object") {
    return {
      heading: `Section ${index + 1}`,
      paragraphs: String(section || ""),
    };
  }
  const paragraphs = Array.isArray(section.paragraphs)
    ? section.paragraphs.map((item) => String(item || "").trim()).filter(Boolean).join("\n\n")
    : String(section.paragraphs || section.body || section.content || "").trim();
  return {
    ...section,
    heading: String(section.heading || `Section ${index + 1}`),
    paragraphs,
  };
}

function normalizeDraftForFirestore(data) {
  if (!data || typeof data !== "object") return data;
  return {
    ...data,
    facts: Array.isArray(data.facts) ? data.facts.map(normalizeDraftFact) : [],
    sections: Array.isArray(data.sections) ? data.sections.map(normalizeDraftSection) : [],
  };
}

function fromFirestoreValue(value = {}) {
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(fromFirestoreValue);
  if ("mapValue" in value) return fromFirestoreFields(value.mapValue.fields || {});
  return undefined;
}

function fromFirestoreFields(fields = {}) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, fromFirestoreValue(value)]),
  );
}

export async function getDocument(collection, id) {
  try {
    const data = await firestoreFetch(documentUrl(collection, id));
    return { id, exists: true, data: fromFirestoreFields(data.fields || {}) };
  } catch (error) {
    if (error.status === 404) return { id, exists: false, data: null };
    throw error;
  }
}

export async function documentExists(collection, id) {
  return (await getDocument(collection, id)).exists;
}

export async function setDocument(collection, id, data) {
  const safeData = collection === "drafts" ? normalizeDraftForFirestore(data) : data;
  return firestoreFetch(documentUrl(collection, id), {
    method: "PATCH",
    body: JSON.stringify({ fields: toFirestoreFields(safeData) }),
  });
}
