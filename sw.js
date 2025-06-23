const CACHE_NAME = 'ki-chatbot-cache-v2';
const APP_SHELL = [
  './assistant-ki-app-test.html',
  './index.html',
  './manifest.json',
  './sw.js'
];

// Beim Install alle APP_SHELL-Dateien cachen und direkt aktiv werden
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Alte Caches entfernen und Service Worker sofort übernehmen
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Netzwerkanfrage: zuerst Cache, sonst Netzwerk
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(resp => resp || fetch(event.request))
  );
});
