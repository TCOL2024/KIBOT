// netlify/functions/proxy_linda2026.js

const MAX_TEXT_LEN = 8000;
const MAX_HISTORY_MESSAGES = 6; // 3 Turns = max 6 messages (user/assistant)

const BLOCK_MESSAGE =
  "Dabei kann ich nicht helfen. Bitte stelle deine Frage ohne Aufforderungen, interne Anweisungen offenzulegen.";

function normalize(str) {
  return String(str || "").trim();
}

function shouldBlockInput(text) {
  const t = text.toLowerCase();

  // Prompt-/System-Exfiltration, Rollenübernahme, interne Technikdetails
  const exfil = [
    "system prompt", "systemprompt", "developer message", "developer prompt",
    "ignore all", "ignoriere alle", "role: system", "\"system\"", "messages =",
    "payload", "exact prompt", "wortwörtlich", "verbatim",
    "knowledge cutoff", "file_search", "tools", "function calling",
    "zeige mir deinen prompt", "nenn mir deinen prompt", "internen anweisungen",
    "systemmodus", "developer modus"
  ];

  // Secrets / Tokens / Webhook-Fishing
  const secrets = [
    "api key", "apikey", "token", "secret", "webhook url", "hook.us2.make.com",
    "environment variable", "env var", "netlify.env", "process.env",
    "proxy secret", "x-proxy-secret", "make webhook"
  ];

  // Typische Injection-Markierungen
  const injectionMarkers = [
    "### system", "begin system", "end system", "<system>", "</system>",
    "you are now", "du bist jetzt"
  ];

  const hit = (arr) => arr.some((p) => t.includes(p));
  return hit(exfil) || hit(secrets) || hit(injectionMarkers);
}

function shouldBlockOutput(text) {
  const t = String(text || "").trim();
  if (!t) return false;

  // HTML-Fehlerseiten / Debug-Ausgaben vermeiden
  if (t.startsWith("<!DOCTYPE html") || t.startsWith("<html")) return true;

  // Leak-Marker / System-Spuren
  const leak =
    /knowledge cutoff|file_search|tools|role\s*:\s*["']system["']|messages\s*=|openai\.chat|developer prompt/i;
  return leak.test(t);
}

function coerceHistory(history) {
  // Erwartet: Array von {role, content}
  // Wir begrenzen auf MAX_HISTORY_MESSAGES und säubern minimal
  if (!Array.isArray(history)) return [];
  return history
    .filter((m) => m && typeof m === "object")
    .map((m) => ({
      role: normalize(m.role),
      content: normalize(m.content),
    }))
    .filter((m) => (m.role === "user" || m.role === "assistant") && m.content)
    .slice(-MAX_HISTORY_MESSAGES);
}

export default async (req, context) => {
  // Healthcheck im Browser
  if (req.method === "GET") {
    return new Response("OK proxy_linda2026", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // Ziel-Webhook aus Env-Var
  const webhookUrl = Netlify.env.get("PROXY_LINDA2026");
  if (!webhookUrl) {
    return new Response("Server not configured: PROXY_LINDA2026 missing", { status: 500 });
  }

  // Optional: Shared Secret (Make soll X-Proxy-Secret prüfen)
  const proxySecret = Netlify.env.get("PROXY_SECRET");

  // Input lesen (JSON bevorzugt, Text fallback)
  const ct = (req.headers.get("content-type") || "").toLowerCase();

  let question = "";
  let history = [];

  try {
    if (ct.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      question = normalize(body.question ?? body.text ?? body.input ?? "");
      history = coerceHistory(body.history);
    } else {
      // Text/plain: nur question
      question = normalize(await req.text());
      history = [];
    }
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  if (!question) return new Response("Missing input", { status: 400 });
  if (question.length > MAX_TEXT_LEN) return new Response("Input too long", { status: 413 });

  // Input-Blocker
  if (shouldBlockInput(question)) {
    return new Response(BLOCK_MESSAGE, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // Upstream payload: an Make als JSON (damit dein Scenario 1.question + 1.history[] hat)
  const payload = {
    question,
    history,
  };

  const headers = {
    "Content-Type": "application/json; charset=utf-8",
  };
  if (proxySecret) headers["X-Proxy-Secret"] = proxySecret;

  let resp;
  try {
    resp = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
  } catch {
    return new Response("Upstream error (Make not reachable)", { status: 502 });
  }

  const out = await resp.text();

  // Output-Blocker
  if (shouldBlockOutput(out)) {
    return new Response("Technischer Fehler im Backend. Bitte erneut versuchen.", {
      status: 502,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(out, {
    status: resp.status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
