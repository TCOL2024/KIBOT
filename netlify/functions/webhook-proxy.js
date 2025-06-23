// ── netlify/functions/webhook-proxy.js ──
import fetch from "node-fetch";        // node-fetch v3 ist ESM!
import { Blob }  from "buffer";        // nativ in Node 18

// damit global.Blob existiert (für FormData & file.js)
if (typeof global.Blob === "undefined") {
  global.Blob = Blob;
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: { Allow: "POST" }, body: "Method Not Allowed" };
  }
  const webhookUrl = process.env.WEBHOOK_URL;
  if (!webhookUrl) {
    return { statusCode: 500, body: "Webhook URL not configured" };
  }

  const payload = event.body; // wir erwarten bereits JSON → einfach weiterleiten

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload
    });
    const text = await res.text();
    return { statusCode: res.status, body: text };
  } catch (err) {
    return { statusCode: 500, body: `Error: ${err.message}` };
  }
}
