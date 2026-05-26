import { getDocument, setDocument } from "./_lib/firestore-rest.mjs";
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

function taipeiDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function friendlyServiceError(error) {
  const message = error?.message || "Daily draft service failed.";
  if (message.includes("Missing FIREBASE_SERVICE_ACCOUNT")) {
    return "Vercel 缺少 FIREBASE_SERVICE_ACCOUNT，產稿服務無法寫入 Firebase。";
  }
  if (message.includes("FIREBASE_SERVICE_ACCOUNT format is invalid")) {
    return "Vercel 的 FIREBASE_SERVICE_ACCOUNT 格式不正確，請重新貼上完整 JSON 或 base64 JSON。";
  }
  if (message.includes("private_key is invalid")) {
    return "Firebase 服務帳號 private_key 格式不正確，請重新複製服務帳號 JSON。";
  }
  if (message.includes("PERMISSION_DENIED") || message.includes("permission")) {
    return "Firebase 服務帳號沒有足夠權限，請確認它可讀寫 Firestore。";
  }
  return message;
}

async function writeFailureReport(error) {
  const now = new Date().toISOString();
  const report = {
    date: taipeiDate(),
    requested: 0,
    created: [],
    skipped: [],
    createdCount: 0,
    skippedCount: 0,
    startedAt: now,
    finishedAt: now,
    error: friendlyServiceError(error),
  };

  try {
    await setDocument("automationRuns", "daily-drafts-latest", report);
    await setDocument("automationRuns", `daily-drafts-${report.date}`, report);
  } catch {
    // If Firebase itself is unavailable, the API response still carries the error.
  }

  return report;
}

async function dailyStatus() {
  const latest = await getDocument("automationRuns", "daily-drafts-latest")
    .then((doc) => doc.data || null)
    .catch((error) => ({
      error: friendlyServiceError(error),
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

function publicDailyStatus(status) {
  const latest = status.latest
    ? {
        date: status.latest.date || null,
        finishedAt: status.latest.finishedAt || null,
        createdCount: status.latest.createdCount ?? status.latest.created?.length ?? 0,
        skippedCount: status.latest.skippedCount ?? status.latest.skipped?.length ?? 0,
        hasError: Boolean(status.latest.error),
      }
    : null;

  return {
    ok: true,
    public: true,
    schedule: status.schedule,
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

  const url = new URL(request.url || "/api/daily-drafts", "https://policypulse.tw");
  const wantsStatus = url.searchParams.get("status") === "1";
  const authorized = await isAuthorized(request);

  if (wantsStatus) {
    const status = await dailyStatus();
    sendJson(response, 200, authorized ? status : publicDailyStatus(status));
    return;
  }

  if (!authorized) {
    sendJson(response, 401, {
      ok: false,
      error: "Unauthorized. Vercel Cron must use CRON_SECRET, and manual runs must be started by an admin account.",
    });
    return;
  }

  try {
    const result = await runDailyDrafts();
    sendJson(response, 200, {
      ok: true,
      ...result,
      createdCount: result.created.length,
      skippedCount: result.skipped.length,
    });
  } catch (error) {
    const report = await writeFailureReport(error);
    sendJson(response, 500, {
      ok: false,
      ...report,
      error: report.error,
    });
  }
}
