/* Service worker for "Rekenen oefenen".
   Bump CACHE on every deploy, otherwise the old version sticks around. */
var CACHE = 'rekenen-v6';

// Everything relative: the site lives at /math-game/, not at the root.
// './' and './index.html' are separate cache keys, so both are needed.
var PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './drawings/tekening_1.png',
  './drawings/tekening_2.png',
  './drawings/tekening_3.png',
  './drawings/tekening_4.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) {
        return c.addAll(PRECACHE.map(function (u) {
          return new Request(u, { cache: 'reload' });
        }));
      })
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

  // Network-first for the page itself: online you always get the newest
  // version, offline you fall back on the cache. Without this a child stays
  // stuck on an old version forever.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req.url, { cache: 'reload' })
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

  // Cache-first for everything else (icons, manifest).
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
