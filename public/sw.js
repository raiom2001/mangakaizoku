const CACHE = 'kaizoku-v2';
const ASSETS = ['/', '/assets/css/style.css', '/assets/js/store.js',
  '/assets/js/api.js', '/assets/js/ui.js', '/assets/js/router.js', '/assets/js/app.js'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(()=>{}));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('api.mangadex') || e.request.url.includes('uploads.mangadex')) return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => cached))
  );
});
