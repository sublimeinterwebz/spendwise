const CACHE_NAME = 'spendwise-v2';

const STATIC_ASSETS = [
  '/spendwise/',
  '/spendwise/index.html',
  '/spendwise/InShot_20260321_223346698.png',
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js',
];

// ── Install: cache all static assets ─────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clear old caches, claim clients immediately ─
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: smart caching strategy ────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Never intercept Firebase API calls — always go to network
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com') ||
    url.hostname.includes('firebaseinstallations.googleapis.com') ||
    url.hostname.includes('firebase.googleapis.com')
  ) return;

  // Cache-first for GET requests (HTML, JS SDK, fonts, images)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        // Serve from cache instantly, update cache in background
        fetch(event.request)
          .then(response => {
            if (response.ok) {
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, response));
            }
          })
          .catch(() => {}); // silent — offline is fine
        return cached;
      }

      // Not in cache — fetch from network and cache for next time
      return fetch(event.request).then(response => {
        if (response.ok && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
