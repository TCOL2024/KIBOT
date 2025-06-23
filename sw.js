const CACHE_NAME = 'ki-chatbot-cache-v1';
const APP_SHELL = [
  './assistant-ki-app-test.html',
  './manifest.json',
  './'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});
