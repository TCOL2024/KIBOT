// netlify/functions/proxy_linda2026.js

/* =========================
   CONFIG
========================= */
const MAX_TEXT_LEN = 8000;
const MAX_HISTORY_MESSAGES = 6; // 3 Turns (user/assistant)

/* =========================
   AEVO FAST DETECTION
========================= */
const AEVO_PATTERNS = [
  /\baevo\b/i,
  /\bbbig\b/i,
  /\bausbild\w*/i,          // ausbildung, ausbilder, ausbilden
  /\bazubi\w*/i,            // azubi, azubis
  /\bauszubild\w*/i,        // auszubildende
  /\bberufsausbild\w*/i,    // berufsausbildung
  /\bunterweis\w*/i,        // unterweisung
  /\brahmenplan\w*/i,
  /\bausbildungsnachweis\w*/i,
  /\babschlussprüfung\b/i,
  /\bihk\b/i
];

function detectTags(question) {
  const q = String(question || "");
  let score = 0;
  for (const rx of AEVO_PATTERNS) {
    if (rx.test(q)) score++;
    if (score >= 2) break; // early exit
  }
  if (/\bbbig\b/i.test(q) || score >= 2) return ["AEVO"];
  return [];
}

/* =========================
   HELPERS
========================= */
function normalize(str) {
  return String(str || "").trim();
}

function coerceHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter(m => m && typeof m === "object")
    .map(m => ({
      role: normalize(m.role),
      content: normalize(m.content)
    }))
    .filter(m => (m.role === "user" || m.role === "assistant") && m.content)
    .slice(-MAX_HISTORY_MESSAGES);
}

/* =========================
   NETLIFY FUNCTION
========================= */
export default async (req) => {

  /* --- Healthcheck --- */
  if (req.method === "GET") {
    return new Response("OK proxy_linda2026", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const webhookUrl = Netlify.env.get("PROXY_LINDA2026");
  if (!webhookUrl) {
    return new Response("Server not configured", { status: 500 });
  }

  const proxySecret = Netlify.env.get("PROXY_SECRET");

  /* --- Read input --- */
  let question = "";
  let history = [];

  try {
    const ct = (req.headers.get("content-type") || "").toLowerCase();
    if (ct.includes("application/json")) {
      const body = await req.json();
      question = normalize(body.question);
      history = coerceHistory(body.history);
    } else {
      question = normalize(await req.text());
    }
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  if (!question) return new Response("Missing input", { status: 400 });
  if (question.length > MAX_TEXT_LEN) return new Response("Input too long", { status: 413 });

  /* --- Tag detection (FAST) --- */
  const tags = detectTags(question);

  /* --- Payload to Make --- */
  const payload = {
    question,
    history,
    tags
  };

  const headers = {
    "Content-Type": "application/json; charset=utf-8"
  };
  if (proxySecret) headers["X-Proxy-Secret"] = proxySecret;

  /* --- Forward to Make --- */
  let resp;
  try {
    resp = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });
  } catch {
    return new Response("Upstream error", { status: 502 });
  }

  const out = await resp.text();

  return new Response(out, {
    status: resp.status,
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
};
