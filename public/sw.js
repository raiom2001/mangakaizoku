const CACHE = 'kaizoku-v1';
const STATIC = ['/', '/assets/css/style.css', '/assets/js/store.js', '/assets/js/api.js', '/assets/js/ui.js', '/assets/js/router.js', '/assets/js/app.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
