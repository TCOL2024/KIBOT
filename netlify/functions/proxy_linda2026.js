export default async (req) => {
  // Healthcheck (im Browser testbar)
  if (req.method === "GET") {
    return new Response("OK proxy_linda2026", { status: 200 });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const debug = new URL(req.url).searchParams.get("debug") === "1";

  const webhookUrl = Netlify.env.get("PROXY_LINDA2026");
  const proxySecret = Netlify.env.get("PROXY_SECRET");

  if (!webhookUrl) {
    return new Response("Server not configured: PROXY_LINDA2026 missing", { status: 500 });
  }

  const textIn = (await req.text()).trim();
  if (!textIn) return new Response("Missing input", { status: 400 });

  const headers = { "Content-Type": "text/plain; charset=utf-8" };
  if (proxySecret) headers["X-Proxy-Secret"] = proxySecret;

  try {
    const resp = await fetch(webhookUrl, { method: "POST", headers, body: textIn });
    const out = await resp.text();

    if (debug) {
      const diag = {
        makeStatus: resp.status,
        sentSecretHeader: Boolean(proxySecret),
        outStartsWith: out.slice(0, 30),
      };
      return new Response(JSON.stringify(diag, null, 2), {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }

    return new Response(out, {
      status: resp.status,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (e) {
    return new Response("Upstream error (Make not reachable)", { status: 502 });
  }
};
