// netlify/functions/PROXY_LINDA2026.js

export default async (req, context) => {
  // Nur POST zulassen
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // Ziel-Webhook aus Env-Var (bei dir: PROXY_LINDA2026)
  const webhookUrl = Netlify.env.get("PROXY_LINDA2026");
  if (!webhookUrl) {
    return new Response("Server not configured: PROXY_LINDA2026 missing", { status: 500 });
  }

  // Optional: Shared Secret (Make soll X-Proxy-Secret prüfen)
  const proxySecret = Netlify.env.get("PROXY_SECRET");

  // Input lesen: Text/plain ODER JSON (fallback)
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  let textIn = "";

  try {
    if (ct.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      textIn = String(body.question ?? body.text ?? body.input ?? "").trim();
    } else {
      textIn = (await req.text()).trim();
    }
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  if (!textIn) {
    return new Response("Missing input", { status: 400 });
  }
  if (textIn.length > 8000) {
    return new Response("Input too long", { status: 413 });
  }

  // Server -> Make (immer Text/plain)
  const headers = { "Content-Type": "text/plain; charset=utf-8" };
  if (proxySecret) headers["X-Proxy-Secret"] = proxySecret;

  let resp;
  try {
    resp = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: textIn,
    });
  } catch {
    return new Response("Upstream error (Make not reachable)", { status: 502 });
  }

  const out = await resp.text();

  return new Response(out, {
    status: resp.status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};

// Optional: Friendly Path zusätzlich zum Default
// Default bleibt: /.netlify/functions/PROXY_LINDA2026
export const config = {
  path: "/api/linda2026",
};
