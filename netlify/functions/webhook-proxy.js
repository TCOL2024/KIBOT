import fetch from 'node-fetch';

export async function handler(event, context) {
  // HTTP-Methoden-Check aus dem „main“-Branch
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Allow': 'POST' },
      body: 'Method Not Allowed',
    };
  }

  const webhookUrl = process.env.WEBHOOK_URL;
  if (!webhookUrl) {
    return {
      statusCode: 500,
      body: 'Webhook URL not configured'
    };
  }

  const body = event.body;

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body
    });

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: `Error forwarding webhook: ${response.statusText}`
      };
    }

    return {
      statusCode: 200,
      body: 'Webhook forwarded successfully'
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: `Internal Server Error: ${error.message}`
    };
  }
}
