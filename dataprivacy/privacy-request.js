const fetch = require('node-fetch');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { Allow: 'POST' }, body: 'Method Not Allowed' };
  }

  const targetUrl = process.env.PRIVACY_REQUEST_WEBHOOK_URL;
  if (!targetUrl) {
    return {
      statusCode: 500,
      body: 'PRIVACY_REQUEST_WEBHOOK_URL not configured',
    };
  }

  try {
    const upstream = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: event.body,
    });

    const text = await upstream.text();
    if (!upstream.ok) {
      return {
        statusCode: upstream.status,
        body: text || `Upstream error: ${upstream.statusText}`,
      };
    }

    return {
      statusCode: 200,
      body: text || 'OK',
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: `Internal error: ${error.message}`,
    };
  }
};
