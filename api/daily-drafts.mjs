import { getDocument, listDocuments, setDocument } from "./_lib/firestore-rest.mjs";
import { runDailyDrafts } from "./_lib/policy-drafts.mjs";

const firebaseWebApiKey = process.env.FIREBASE_WEB_API_KEY || "AIzaSyA6ZmZnNMylKj2Uy9tS_d933fYHHFWkmS8";
const defaultAdminEmails = ["lutinghui941025@gmail.com"];

function sendJson(response, status, payload) {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store");
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  response.setHeader("access-control-allow-headers", "authorization,content-type");
  response.end(JSON.stringify(payload, null, 2));
}

function adminEmails() {
  return (process.env.ADMIN_EMAILS || defaultAdminEmails.join(","))
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function bearerToken(request) {
  const header = request.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
}

async function lookupFirebaseUser(idToken) {
  if (!idToken) return null;
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseWebApiKey}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.error?.message || "Unable to verify Firebase login.";
    throw new Error(message);
  }
  const user = data.users?.[0];
  if (!user?.localId) return null;
  return {
    uid: user.localId,
    email: String(user.email || "").toLowerCase(),
  };
}

async function isAdminToken(idToken) {
  const user = await lookupFirebaseUser(idToken);
  if (!user) return false;
  if (adminEmails().includes(user.email)) return true;
  const adminDoc = await getDocument("admins", user.uid);
  return adminDoc.exists;
}

function isCronAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return bearerToken(request) === secret;
}

async function isAuthorized(request) {
  if (isCronAuthorized(request)) return true;
  try {
    return await isAdminToken(bearerToken(request));
  } catch {
    return false;
  }
}

async function readJsonBody(request) {
  if (request.method !== "POST") return {};
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8").trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function taipeiDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function resolveRequestedDate(value) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return taipeiDate();
}

async function existingDailyArticles(date) {
  const articles = await listDocuments("articles", { pageSize: 300, maxPages: 12 });
  return articles
    .filter(({ id, data }) => id.endsWith(`-${date}`) && data?.published !== false)
    .map(({ id, data }) => ({
      id,
      title: data?.title || id,
      topic: data?.topic || "",
      reason: "alreadyRanForDate",
    }));
}

async function writeDailyReport(report) {
  const payload = {
    ...report,
    createdCount: report.created?.length || 0,
    skippedCount: report.skipped?.length || 0,
    finishedAt: new Date().toISOString(),
  };
  await Promise.all([
    setDocument("automationRuns", "daily-drafts-latest", payload),
    setDocument("automationRuns", `daily-drafts-${report.date}`, payload),
  ]).catch(() => {});
  return payload;
}

async function dailyStatus() {
  const latest = await getDocument("automationRuns", "daily-drafts-latest")
    .then((doc) => doc.data || null)
    .catch((error) => ({
      error: error.message || "無法讀取上次執行紀錄。",
    }));

  return {
    ok: true,
    schedule: {
      utc: "30 22 * * *",
      taipei: "每天 06:30",
    },
    configured: {
      cronSecret: Boolean(process.env.CRON_SECRET),
      firebaseServiceAccount: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT || process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
      firebaseProjectId: Boolean(process.env.FIREBASE_PROJECT_ID),
    },
    latest,
  };
}

export default async function handler(request, response) {
  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return;
  }

  if (request.method !== "GET" && request.method !== "POST") {
    sendJson(response, 405, { ok: false, error: "Method not allowed." });
    return;
  }

  if (!(await isAuthorized(request))) {
    sendJson(response, 401, {
      ok: false,
      error: "Unauthorized. Vercel Cron must use CRON_SECRET, and manual runs must be started by an admin account.",
    });
    return;
  }

  const url = new URL(request.url || "/api/daily-drafts", "https://policypulse.tw");
  if (url.searchParams.get("status") === "1") {
    sendJson(response, 200, await dailyStatus());
    return;
  }

  try {
    const body = await readJsonBody(request);
    const date = url.searchParams.get("date") || body.date || "";
    const requestedDate = resolveRequestedDate(date);
    const existing = await existingDailyArticles(requestedDate);
    if (existing.length && url.searchParams.get("force") !== "1" && body.force !== true) {
      const report = await writeDailyReport({
        date: requestedDate,
        requested: 0,
        created: [],
        skipped: existing,
        alreadyRanForDate: true,
        existingArticleCount: existing.length,
        startedAt: new Date().toISOString(),
      });
      sendJson(response, 200, { ok: true, ...report });
      return;
    }
    const result = await runDailyDrafts({ date });
    sendJson(response, 200, {
      ok: true,
      ...result,
      createdCount: result.created.length,
      skippedCount: result.skipped.length,
    });
  } catch (error) {
    sendJson(response, 500, {
      ok: false,
      error: error.message || "Daily draft generation failed.",
    });
  }
}
