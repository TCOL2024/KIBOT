// netlify/functions/webhook-proxy.js
exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { Allow: 'POST' }, body: 'Method Not Allowed' };
  }

  const webhookUrl = process.env.WEBHOOK_URL;
  if (!webhookUrl) {
    return { statusCode: 500, body: 'WEBHOOK_URL not set' };
  }

  try {
    // <— benutze hier das eingebaute fetch
    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: event.body
    });
    if (!resp.ok) {
      return { statusCode: resp.status, body: `Forward error: ${resp.statusText}` };
    }
    return { statusCode: 200, body: 'OK' };
  } catch (e) {
    return { statusCode: 500, body: e.toString() };
  }
};
