This repository contains a demo PWA chatbot. Open `assistant-ki-app-test.html`
in a browser to try it out. The conversation history is stored locally and
sent to a Make.com webhook.

## Deployment

The chatbot expects to run on Netlify because the HTML files call
`/.netlify/functions/webhook-proxy`. Create a Netlify function from
`netlify/functions/webhook-proxy.js` and set an environment variable
`WEBHOOK_URL` with the URL of the webhook that should receive the
forwarded requests.

If you host the static files elsewhere, such as GitHub Pages, you must
update the `webhookUrl` constant in the HTML files to point at a valid
backend that accepts `POST` requests.
