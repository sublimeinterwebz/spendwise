const CACHE_NAME = 'spendwise-v3';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/InShot_20260321_223346698.png',
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500&display=swap',
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

  // Never intercept Firebase / Gemini / Vercel API calls — always network
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com') ||
    url.hostname.includes('firebaseinstallations.googleapis.com') ||
    url.hostname.includes('firebase.googleapis.com') ||
    url.hostname.includes('generativelanguage.googleapis.com') ||
    url.pathname.startsWith('/api/')
  ) return;

  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        // Serve from cache instantly, refresh in background
        fetch(event.request)
          .then(response => {
            if (response.ok) {
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, response));
            }
          })
          .catch(() => {});
        return cached;
      }

      // Not cached — fetch from network and cache for next time
      return fetch(event.request).then(response => {
        if (response.ok && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline and not cached — serve index.html as fallback
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
