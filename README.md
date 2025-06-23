This repository contains a demo PWA chatbot. Open `assistant-ki-app-test.html`
in a modern browser to try it out. You can serve the files with any static
web server, for example:

```bash
npm install -g serve
serve .
```

The conversation history is stored locally in the browser and sent to a
webhook. In production you can deploy this on Netlify and set `WEBHOOK_URL`
as an environment variable. Requests from the chatbot are then proxied via
`/.netlify/functions/webhook-proxy`.
