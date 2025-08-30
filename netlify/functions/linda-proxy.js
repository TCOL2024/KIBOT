// netlify/functions/linda-proxy.js
export default async (req, context) => {
  const ALLOWED_ORIGIN = "*"; // oder Deine Domain
  const MAKE_WEBHOOK_URL =
    process.env.MAKE_WEBHOOK_URL ||
    "https://hook.us2.make.com/5e92q8frgmrood9tkbjp69zcr4itow8h"; // <- dein neuer Hook

  // Preflight für CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400"
      }
    });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { "Access-Control-Allow-Origin": ALLOWED_ORIGIN }
    });
  }

  let bodyText = "";
  try {
    bodyText = await req.text(); // Roh übernehmen (Make akzeptiert JSON-Body)
  } catch {
    bodyText = "";
  }

  // Weiterleiten an Make (1:1)
  const fwd = await fetch(MAKE_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: bodyText
  });

  // Antwort vom Make-Scenario so wie sie kommt zurückgeben
  const contentType = fwd.headers.get("content-type") || "text/plain";
  const payload = await fwd.text();

  return new Response(payload, {
    status: fwd.status,
    headers: {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Content-Type": contentType
    }
  });
};
