// netlify/functions/linda-proxy.js
const fetch = require('node-fetch');

exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Preflight für CORS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { ...cors, Allow: 'POST' }, body: 'Method Not Allowed' };
  }

  // 👉 Dein neuer Make-Webhook
  const webhookUrl = process.env.MAKE_WEBHOOK_URL 
    || 'https://hook.us2.make.com/5e92q8frgmrood9tkbjp69zcr4itow8h';

  try {
    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: event.body, // User-Frage 1:1 an Make weiterreichen
    });

    const text = await resp.text();
    return { statusCode: resp.status, headers: cors, body: text };
  } catch (err) {
    return { statusCode: 500, headers: cors, body: `Internal error: ${err}` };
  }
};
