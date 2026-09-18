/* Service worker voor "Rekenen oefenen".
   Bump CACHE bij elke deploy, anders blijft de oude versie hangen. */
var CACHE = 'rekenen-v3';

// Alles relatief: de site staat op /math-game/, niet op de root.
// './' en './index.html' zijn aparte cache-keys, dus allebei nodig.
var PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(PRECACHE); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) {
          return k === CACHE ? null : caches.delete(k);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  // Network-first voor de pagina zelf: online krijg je altijd de nieuwste
  // versie, offline val je terug op de cache. Zonder dit blijft een kind
  // voor altijd op een oude versie hangen.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(function (res) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put('./', copy); });
          return res;
        })
        .catch(function () {
          return caches.match('./').then(function (hit) {
            return hit || caches.match('./index.html');
          });
        })
    );
    return;
  }

  // Cache-first voor de rest (icons, manifest).
  e.respondWith(
    caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      });
    })
  );
});
