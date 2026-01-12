// netlify/functions/proxy_linda2026.js

/* =========================
   CONFIG
========================= */
const MAX_TEXT_LEN = 8000;
const MAX_HISTORY_MESSAGES = 6; // 3 Turns (user/assistant)
const BLOCK_MESSAGE =
  "Dabei kann ich nicht helfen. Bitte formuliere deine Frage ohne Aufforderungen, interne Anweisungen offenzulegen.";

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
   PROMPT-INJECTION / EXFIL FILTER (HARD)
   - blocks obvious attempts to reveal system/developer/tooling,
     secrets, payload structure, etc.
========================= */
const BLOCK_PATTERNS = [
  // roles & system
  /\bsystem\b/i,
  /\bdeveloper\b/i,
  /\bassistant\b/i, // häufig in Rollen-Manipulation ("du bist jetzt assistant")
  /\brole\s*:\s*["']?(system|developer|assistant|tool)["']?/i,

  // prompt / instructions
  /\bprompt\b/i,
  /\bsystem\s*prompt\b/i,
  /\bdeveloper\s*prompt\b/i,
  /\binstruction(s)?\b/i,
  /\bignore\b/i,                // "ignore all..."
  /\bignoriere\b/i,
  /\boverride\b/i,

  // payload / messages array / api details
  /\bpayload\b/i,
  /\bmessages\s*=\s*\[/i,
  /\bchat\.completions\b/i,
  /\bopenai\b/i,
  /\bfunction\s*calling\b/i,
  /\btools?\b/i,
  /\bfile_search\b/i,
  /\bknowledge\s*cutoff\b/i,

  // secrets / tokens / env
  /\bapi\s*key\b/i,
  /\btoken\b/i,
  /\bsecret\b/i,
  /\bwebhook\b/i,
  /\benv\b/i,
  /\bnetlify\.env\b/i,
  /\bprocess\.env\b/i,
  /\bhook\.us\d\.make\.com\b/i
];

function shouldBlockText(text) {
  const t = String(text || "");
  for (const rx of BLOCK_PATTERNS) {
    if (rx.test(t)) return true;
  }
  return false;
}

/* =========================
   OUTPUT FILTER (optional but recommended)
========================= */
function shouldBlockOutput(text) {
  const t = String(text || "").trim();
  if (!t) return false;

  // HTML error pages / unexpected HTML
  if (t.startsWith("<!DOCTYPE html") || t.startsWith("<html")) return true;

  // leak markers
  const leak = /(knowledge cutoff|file_search|tools|role\s*:\s*["']system["']|messages\s*=|openai\.chat|developer prompt)/i;
  return leak.test(t);
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
      history = [];
    }
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  if (!question) return new Response("Missing input", { status: 400 });
  if (question.length > MAX_TEXT_LEN) return new Response("Input too long", { status: 413 });

  // HARD block on suspicious input
  if (shouldBlockText(question)) {
    return new Response(BLOCK_MESSAGE, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }

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

  // Block suspicious output as well
  if (shouldBlockOutput(out)) {
    return new Response("Technischer Fehler im Backend. Bitte erneut versuchen.", {
      status: 502,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }

  return new Response(out, {
    status: resp.status,
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
};
