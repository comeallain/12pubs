/* Keeps the app shell on the phone so it opens without signal.
   Data from the database is never cached here; the app keeps its own copy. */
const CACHE = '12pubs-v20';
const SHELL = ['./', 'index.html', 'app.css?v=20', 'app.js?v=20', 'manifest.json', 'icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if(req.method !== 'GET' || url.hostname.endsWith('supabase.co')) return;
  // Pages: try the network first so updates land, fall back to the saved copy.
  if(req.mode === 'navigate'){
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put('./', copy)); return r; }).catch(() => caches.match('./')));
    return;
  }
  // Map tiles, fonts and the app's own files: saved copy first, refreshed in the background.
  if(url.origin === location.origin || /unpkg\.com|fonts\.(googleapis|gstatic)\.com|tile\.openstreetmap\.org/.test(url.hostname)){
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(r => { if(r.ok || r.type === 'opaque'){ const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return r; }).catch(() => hit);
      return hit || net;
    }));
  }
});
