// netlify/functions/proxy_linda2026.js

/* =========================
   CONFIG
========================= */
const MAX_TEXT_LEN = 8000;
const MAX_HISTORY_MESSAGES = 6; // 3 Turns
const BLOCK_MESSAGE =
  "Dabei kann ich nicht helfen. Ich beantworte ausschließlich fachliche Fragen (z. B. Ausbildung/AEVO, Prüfungen, Personalmanagement).";

/* =========================
   AEVO / AUSBILDUNG TAGGING
========================= */
const AEVO_PATTERNS = [
  /\baevo\b/i,
  /\bbbig\b/i,
  /\bausbild\w*/i,
  /\bazubi\w*/i,
  /\bauszubild\w*/i,
  /\bberufsausbild\w*/i,
  /\bunterweis\w*/i,
  /\brahmenplan\w*/i,
  /\bausbildungsnachweis\w*/i,
  /\babschlussprüfung\b/i,
  /\bihk\b/i
];

function detectTags(question) {
  let score = 0;
  for (const rx of AEVO_PATTERNS) {
    if (rx.test(question)) score++;
    if (score >= 2) break;
  }
  if (/\bbbig\b/i.test(question) || score >= 2) return ["AEVO"];
  return [];
}

/* =========================
   INPUT BLOCKING (HARD)
========================= */
const BLOCK_PATTERNS = [
  /\bsystem\b/i,
  /\bdeveloper\b/i,
  /\brole\s*:\s*(system|developer|assistant|tool)/i,
  /\bprompt\b/i,
  /\binstruction(s)?\b/i,
  /\bignore\b/i,
  /\bignoriere\b/i,
  /\bpayload\b/i,
  /\bmessages\s*=\s*\[/i,
  /\btools?\b/i,
  /\bfile_search\b/i,
  /\bknowledge\s*cutoff\b/i,
  /\bapi\s*key\b/i,
  /\btoken\b/i,
  /\bsecret\b/i,
  /\bwebhook\b/i,
  /\benv\b/i,
  /\bprocess\.env\b/i
];

const INTENT_BLOCK_PATTERNS = [
  /\bdebug\b/i,
  /\baudit\b/i,
  /\bprotokoll\b/i,
  /\bintern(e|er|en)?\b/i,
  /\binterne\s+regeln\b/i,
  /\bwie\s+du\s+arbeitest\b/i,
  /\bgenutzte\s+tools\b/i,
  /\btool\s*config\b/i,
  /\bknowledge\s*cutoff\b/i,
  /\brequest\s*payload\b/i,
  /\bjson\b/i,
  /\bwortwörtlich\b/i,
  /\bverbatim\b/i
];

function shouldBlockInput(text) {
  return [...BLOCK_PATTERNS, ...INTENT_BLOCK_PATTERNS].some(rx => rx.test(text));
}

/* =========================
   OUTPUT BLOCKING (NOTBREMSE)
========================= */
const OUTPUT_BLOCK_PATTERNS = [
  /system[-\s]?prompt/i,
  /developer[-\s]?prompt/i,
  /interne\s+regeln/i,
  /genutzte\s+tools/i,
  /knowledge\s*cutoff/i,
  /payload/i,
  /request_payload/i,
  /tool_config/i,
  /messages[-\s]?array/i,
  /rolle\s+und\s+identität/i,
  /antwortstruktur/i,
  /der\s+gesamte\s+prompt/i,
  /file_search/i,
  /openai/i
];

function shouldBlockOutput(text) {
  if (!text) return false;
  if (text.startsWith("<!DOCTYPE html") || text.startsWith("<html")) return true;
  return OUTPUT_BLOCK_PATTERNS.some(rx => rx.test(text));
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
    .filter(m => m && (m.role === "user" || m.role === "assistant") && m.content)
    .map(m => ({ role: m.role, content: normalize(m.content) }))
    .slice(-MAX_HISTORY_MESSAGES);
}

/* =========================
   NETLIFY FUNCTION
========================= */
export default async (req) => {

  if (req.method === "GET") {
    return new Response("OK proxy_linda2026", { status: 200 });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const webhookUrl = Netlify.env.get("PROXY_LINDA2026");
  if (!webhookUrl) return new Response("Server not configured", { status: 500 });

  const proxySecret = Netlify.env.get("PROXY_SECRET");

  let question = "";
  let history = [];

  try {
    const body = await req.json();
    question = normalize(body.question);
    history = coerceHistory(body.history);
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  if (!question) return new Response("Missing input", { status: 400 });
  if (question.length > MAX_TEXT_LEN) return new Response("Input too long", { status: 413 });

  if (shouldBlockInput(question)) {
    return new Response(BLOCK_MESSAGE, { status: 200 });
  }

  const payload = {
    question,
    history,
    tags: detectTags(question)
  };

  const headers = { "Content-Type": "application/json" };
  if (proxySecret) headers["X-Proxy-Secret"] = proxySecret;

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

  if (shouldBlockOutput(out)) {
    return new Response(
      "⚠️ Die Anfrage konnte aus Sicherheitsgründen nicht verarbeitet werden.",
      { status: 502 }
    );
  }

  return new Response(out, {
    status: resp.status,
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
};
