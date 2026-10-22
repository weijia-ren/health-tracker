const CACHE = 'health-tracker-v16';
const ASSETS = [
  './',
  './index.html',
  './assets/style.css?v=16',
  './assets/app.js?v=15',
  './resources/starter-resources.json?v=14',
  './posts/sleep-timing-matters.html',
  './posts/skincare-blackheads-routine.html',
  './manifest.json?v=15',
  './assets/icons/Health%20Tracker%20-%20App%20icon.png?v=15',
  './assets/icons/Health%20Tracker%20-%20Primary%20logo%20with%20name.png',
  './assets/icons/icon.svg?v=14',
  './assets/icons/icon-180.png?v=14',
  './assets/icons/icon-192.png?v=14',
  './assets/icons/icon-512.png?v=14',
  './assets/icons/icon-maskable-512.png?v=14'
];
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
