// netlify/functions/linda-proxy.js
exports.handler = async (event) => {
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { ...CORS, 'Allow': 'POST' }, body: 'Method Not Allowed' };
  }

  const webhookUrl = process.env.MAKE_WEBHOOK_URL
    || 'https://hook.us2.make.com/5e92q8frgmrood9tkbjp69zcr4itow8h';

  try {
    // 1:1 an Make durchreichen
    const upstream = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: event.body || '{}'
    });

    const ct = upstream.headers.get('content-type') || 'text/plain';
    const text = await upstream.text();

    // Status + Body unverändert zurückgeben (hilft beim Debuggen)
    return { statusCode: upstream.status, headers: { ...CORS, 'Content-Type': ct }, body: text };
  } catch (err) {
    return { statusCode: 502, headers: CORS, body: `Relay error: ${err?.message || String(err)}` };
  }
};
