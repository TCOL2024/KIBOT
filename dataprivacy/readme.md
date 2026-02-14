diff --git a/README.md b/README.md
index eaa36eb95e75044a28f3aa2595d367577218dddc..9e30481f0ebe982678e18bcb95fb7323cc7b81d6 100644
--- a/README.md
+++ b/README.md
@@ -1,17 +1,27 @@
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
+
+
+## Datenschutz-Portal (OneTrust-inspiriert)
+
+Die Datei `n26-onetrust-portal.html` enthält ein Datenschutz-Portal mit Anfrageformular.
+Für den Live-Betrieb auf Netlify nutzt die Seite standardmäßig den Endpoint:
+
+- `/.netlify/functions/privacy-request`
+
+Dafür muss die Umgebungsvariable `PRIVACY_REQUEST_WEBHOOK_URL` gesetzt sein. Die Function leitet eingehende JSON-Anfragen an diese URL weiter.
