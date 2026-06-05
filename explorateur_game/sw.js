const CACHE_NAME = 'explorateur-v2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './game.js',
  './manifest.json',
  './assets/arr.jpg',
  './assets/character.png',
  './assets/chaimaa.png',
  './assets/platform.png',
  './assets/relic.png',
  './assets/run1.png',
  './assets/run2.png',
  './assets/foret.mp3',
  './assets/sauter.mp3',
  './assets/super.mp3'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
