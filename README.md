# Demo PWA Chatbot

Dieses Repository enthält eine einfache Demo-PWA mit Chatbot. Öffne `assistant-ki-app-test.html`  
in einem modernen Browser, um es auszuprobieren. Du kannst die Dateien mit jedem beliebigen statischen Web-Server bereitstellen, z. B.:

```bash
npm install -g serve
serve .
```

Der Befehl startet einen lokalen Webserver (standardmäßig auf Port 3000). Rufe danach
`http://localhost:3000/assistant-ki-app-test.html` im Browser auf, um den Chatbot zu testen.

Möchtest du die PWA auf Netlify oder einem ähnlichen Dienst bereitstellen, sind keine
zusätzlichen Build-Schritte notwendig. Setze in den Netlify-Einstellungen die
Umgebungsvariable `WEBHOOK_URL`, falls du den Webhook-Proxy unter
`netlify/functions` verwendest.
