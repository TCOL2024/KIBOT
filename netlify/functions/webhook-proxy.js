import fetch from 'node-fetch';

export async function handler(event, context) {
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
