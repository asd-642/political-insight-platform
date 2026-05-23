import { runDailyDrafts } from "./_lib/policy-drafts.mjs";

function sendJson(response, status, payload) {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store");
  response.end(JSON.stringify(payload, null, 2));
}

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.authorization === `Bearer ${secret}`;
}

export default async function handler(request, response) {
  if (request.method !== "GET" && request.method !== "POST") {
    sendJson(response, 405, { ok: false, error: "Method not allowed." });
    return;
  }

  if (!isAuthorized(request)) {
    sendJson(response, 401, {
      ok: false,
      error: "Unauthorized. Set CRON_SECRET in Vercel and let Vercel Cron call this endpoint.",
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
    sendJson(response, 500, {
      ok: false,
      error: error.message,
    });
  }
}
