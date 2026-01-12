import type { Context, Config } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  // Text-Body lesen
  const textIn = (await req.text()).trim();
  if (!textIn || textIn.length < 2) return new Response("Missing text", { status: 400 });
  if (textIn.length > 4000) return new Response("Text too long", { status: 413 });

  // Env Vars (nur serverseitig!)
  const webhookUrl = Netlify.env.get("MAKE_WEBHOOK_URL");
  const proxySecret = Netlify.env.get("PROXY_SECRET");

  if (!webhookUrl || !proxySecret) return new Response("Server not configured", { status: 500 });

  // Optional: Input-Blocklist (gegen Prompt-Exfiltration-Anfragen)
  const bad = /(nenne.*prompt|systemprompt|zeige.*system|exakt.*weitergeleitet|payload|messages\s*=|\brole\s*:\s*["']system["'])/i;
  if (bad.test(textIn)) {
    return new Response("Dabei kann ich nicht helfen.", { status: 200 });
  }

  // Server -> Make (Text rein / Text raus)
  const resp = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Proxy-Secret": proxySecret,
    },
    body: textIn,
  });

  const textOut = await resp.text();

  // Optional: Output-Filter (falls Modell Interna „ausspuckt“)
  const leak = /(Knowledge cutoff|file_search|Tools|role\s*:\s*["']system["']|messages\s*=\s*\[|openai\.chat|systemprompt)/i;
  if (leak.test(textOut)) {
    return new Response("Dabei kann ich nicht helfen.", { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  return new Response(textOut, {
    status: resp.status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};

export const config: Config = {
  // schöner Pfad (statt /.netlify/functions/...)
  path: "/api/webhook-proxy",
};
