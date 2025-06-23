// netlify/functions/webhook-proxy.js
exports.handler = async (event, context) => {
  console.log('–– EVENT BODY ––');
  console.log(event.body);
  console.log('–– ENV WEBHOOK_URL ––');
  console.log(process.env.WEBHOOK_URL);

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { Allow: 'POST' }, body: 'Method Not Allowed' };
  }

  const webhookUrl = process.env.WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('✖️ WEBHOOK_URL missing');
    return { statusCode: 500, body: 'WEBHOOK_URL not configured' };
  }

  try {
    const resp = await fetch(webhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    event.body,
    });
    console.log(`→ upstream status: ${resp.status} ${resp.statusText}`);

    if (!resp.ok) {
      const text = await resp.text();
      console.error('→ upstream body:', text);
      return { statusCode: resp.status, body: `Forward error: ${resp.statusText}` };
    }

    const text = await resp.text();
    return { statusCode: resp.status, body: text };
  } catch (err) {
    console.error('❌ fetch threw:', err);
    return { statusCode: 500, body: `Internal error: ${err}` };
  }
};
