import crypto from "node:crypto";

const tokenCache = {
  token: "",
  expiresAt: 0,
};

function parseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "";
  if (!raw.trim()) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT on Vercel.");
  }

  const text = raw.trim().startsWith("{")
    ? raw.trim()
    : Buffer.from(raw.trim(), "base64").toString("utf8");
  const account = JSON.parse(text);
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
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(unsigned)
    .sign(account.private_key, "base64url");
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

function collectionUrl(collection, params = {}) {
  const url = new URL(`https://firestore.googleapis.com/v1/projects/${firebaseProjectId()}/databases/(default)/documents/${collection}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  });
  return url.toString();
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

function toFirestoreValue(value, insideArray = false) {
  if (value === null || value === undefined) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) {
    if (insideArray) {
      return {
        mapValue: {
          fields: Object.fromEntries(
            value.map((item, index) => [`item${index}`, toFirestoreValue(item, true)]),
          ),
        },
      };
    }
    return { arrayValue: { values: value.map((item) => toFirestoreValue(item, true)) } };
  }
  if (typeof value === "object") {
    return { mapValue: { fields: toFirestoreFields(value, insideArray) } };
  }
  return { stringValue: String(value) };
}

function toFirestoreFields(object, insideArray = false) {
  return Object.fromEntries(
    Object.entries(object || {})
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, toFirestoreValue(value, insideArray)]),
  );
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

export async function listDocuments(collection, { pageSize = 300, maxPages = 8 } = {}) {
  const items = [];
  let pageToken = "";
  for (let page = 0; page < maxPages; page += 1) {
    const data = await firestoreFetch(collectionUrl(collection, { pageSize, pageToken }));
    (data.documents || []).forEach((document) => {
      const id = decodeURIComponent(String(document.name || "").split("/").pop() || "");
      if (id) items.push({ id, data: fromFirestoreFields(document.fields || {}) });
    });
    pageToken = data.nextPageToken || "";
    if (!pageToken) break;
  }
  return items;
}

export async function setDocument(collection, id, data) {
  return firestoreFetch(documentUrl(collection, id), {
    method: "PATCH",
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
  });
}
