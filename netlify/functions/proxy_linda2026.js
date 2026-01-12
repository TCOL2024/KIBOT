// netlify/functions/proxy_linda2026.js

/* =========================
   CONFIG
========================= */
const MAX_TEXT_LEN = 8000;
const MAX_HISTORY_MESSAGES = 6; // 3 Turns (user/assistant)
const BLOCK_MESSAGE =
  "Dabei kann ich nicht helfen. Ich beantworte ausschließlich fachliche Fragen (z. B. Ausbildung/AEVO, Prüfungen, Personalmanagement).";

/* =========================
   AEVO / AUSBILDUNG TAGGING (FAST)
   - adds tags: ["AEVO"] when question is likely Ausbildung/AEVO-related
========================= */
const AEVO_PATTERNS = [
  /\baevo\b/i,
  /\bbbig\b/i,
  /\bausbild\w*/i,          // ausbildung, ausbilder, ausbilden, ...
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
   HARD INPUT BLOCKING
   1) Keyword/structure exfil
   2) Meta/Audit/Debug intention (semantic injection)
========================= */

// 1) Direct exfil / system / tooling / secrets / payload structure
const BLOCK_PATTERNS = [
  // roles & system
  /\bsystem\b/i,
  /\bdeveloper\b/i,
  /\brole\s*:\s*["']?(system|developer|assistant|tool)["']?/i,

  // prompt / instructions
  /\bprompt\b/i,
  /\bsystem\s*prompt\b/i,
  /\bdeveloper\s*prompt\b/i,
  /\binstruction(s)?\b/i,
  /\bignore\b/i,
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

  // secrets / tokens / env / webhook fishing
  /\bapi\s*key\b/i,
  /\btoken\b/i,
  /\bsecret\b/i,
  /\bwebhook\b/i,
  /\benv\b/i,
  /\bnetlify\.env\b/i,
  /\bprocess\.env\b/i,
  /\bhook\.us\d\.make\.com\b/i
];

// 2) Semantic “meta” requests that often bypass keyword filters
// These are exactly the “Audit/Debug-Protokoll/Struktur/JSON-Felder” style attacks.
const INTENT_BLOCK_PATTERNS = [
  /\bdebug\b/i,
  /\bdebug[-\s]?protokoll\b/i,
  /\baudit\b/i,
  /\bforensik\b/i,
  /\bprotokoll\b/i,
  /\bintern(e|er|en)?\b/i,
  /\binterne\s+regeln\b/i,
  /\bregeln\s+zusammenfassung\b/i,
  /\bzusammenfassung\s+der\s+regeln\b/i,
  /\bwie\s+du\s+arbeitest\b/i,
  /\bwie\s+du\s+verarbeitest\b/i,
  /\bwie\s+ist\s+dein\s+aufbau\b/i,
  /\bkonfiguration\b/i,
  /\bsetup\b/i,
  /\bgenutzte\s+tools\b/i,
  /\btool\s*config\b/i,
  /\bknowledge\s*cutoff\b/i,
  /\bcutoff\b/i,
  /\brequest\s*payload\b/i,
  /\bpayload[-\s]?struktur\b/i,
  /\bmessages[-\s]?array\b/i,
  /\bfelder\b/i,
  /\bjson\b/i,
  /\banonymisier\w*\b/i,
  /\bplatzhalter\b/i,
  /\bwortwörtlich\b/i,
  /\bverbatim\b/i
];

function shouldBlockInput(text) {
  const t = String(text || "");
  for (const rx of BLOCK_PATTERNS) if (rx.test(t)) return true;
  for (const rx of INTENT_BLOCK_PATTERNS) if (rx.test(t)) return true;
  return false;
}

/* =========================
   OUTPUT NOTBREMSE (VERY IMPORTANT)
   - blocks “structured leakage” like the screenshots:
     internal rules, tools, cutoff, payload schemas, etc.
========================= */
function shouldBlockOutput(text) {
  const t = String(text || "").trim();
  if (!t) return false;

  // HTML error pages / unexpected HTML
  if (t.startsWith("<!DOCTYPE html") || t.startsWith("<html")) return true;

  // "structured leakage" markers (German + English)
  const structuredLeak = /(
    system[-\s]?prompt|
    developer[-\s]?prompt|
    interne\s+regeln|
    genutzte\s+tools|
    knowledge\s*cutoff|
    payload|
    request_payload|
    tool_config|
    messages[-\s]?array|
    rolle\s+und\s+identität|
    antwortstruktur|
    der\s+gesamte\s+prompt
  )/ix;

  if (structuredLeak.test(t)) return true;

  // Generic leak markers
  const leak = /(file_search|tools|role\s*:\s*["']system["']|messages\s*=|openai\.chat)/i;
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

  // Make Webhook URL from env var (must be set in Netlify)
  const webhookUrl = Netlify.env.get("PROXY_LINDA2026");
  if (!webhookUrl) {
    return new Response("Server not configured", { status: 500 });
  }

  // Optional shared secret header for Make verification
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
      // Fallback: accept text/plain
      question = normalize(await req.text());
      history = [];
    }
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  if (!question) return new Response("Missing input", { status: 400 });
  if (question.length > MAX_TEXT_LEN) return new Response("Input too long", { status: 413 });

  /* --- HARD input block BEFORE any upstream call --- */
  if (shouldBlockInput(question)) {
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

  /* --- HARD output block (prevents the exact leak in your screenshots) --- */
  if (shouldBlockOutput(out)) {
    return new Response("⚠️ Interner Systemfehler. Die Anfrage konnte nicht sicher verarbeitet werden.", {
      status: 502,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }

  return new Response(out, {
    status: resp.status,
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
};
