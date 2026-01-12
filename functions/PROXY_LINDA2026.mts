import type { Context, Config } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const webhookUrl = Netlify.env.get("PROXY_LINDA2026");
  const proxySecret = Netlify.env.get("PROXY_SECRET");

  if (!webhookUrl) return new Response("Server not configured: PROXY_LINDA2026 missing", { status: 500 });

  const contentType = (req.headers.get("content-type") || "").toLowerCase();
  let textIn = "";

  if (contentType.includes("application/json")) {
    const body: any = await req.json().catch(() => ({}));
    textIn = String(body.question ?? body.text ?? body.input ?? "").trim();
  } else {
    textIn = (await req.text()).trim();
  }

  if (!textIn) return new Response("Missing text", { status: 400 });

  const headers: Record<string, string> = { "Content-Type": "text/plain; charset=utf-8" };
  if (proxySecret) headers["X-Proxy-Secret"] = proxySecret;

  const resp = await fetch(webhookUrl, { method: "POST", headers, body: textIn });
  const out = await resp.text();

  return new Response(out, { status: resp.status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
};

export const config: Config = { path: "/api/linda" };
