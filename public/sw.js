const CACHE_NAME = 'habitforge-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/app.css',
  '/js/app.js',
  '/js/api.js',
  '/js/auth.js',
  '/js/components.js',
  '/js/crypto.js',
  '/js/dashboard.js',
  '/js/habits.js',
  '/js/rewards.js',
  '/js/punishments.js',
  '/js/challenges.js',
  '/js/stats.js',
  '/js/diary.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Install — pre-cache static assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate — remove old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch handler — GET ONLY
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // 1. Skip non-http(s) entirely (chrome-extension://, data:, etc.)
  if (!url.protocol.startsWith('http')) return;

  // 2. CRITICAL: Only intercept GET requests.
  //    POST/PUT/DELETE must go straight to the network — never cache mutations.
  if (e.request.method !== 'GET') return;

  // 3. Only intercept same-origin or known safe CDN requests
  const isSameOrigin = url.origin === self.location.origin;
  const isSafeCDN = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net'].includes(url.hostname);
  if (!isSameOrigin && !isSafeCDN) return;

  // 4. API routes — Network-First (fresh data, fall back to cache when offline)
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) {
            try {
              const clone = res.clone();
              caches.open(CACHE_NAME).then(c => c.put(e.request, clone)).catch(() => {});
            } catch {}
          }
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(e.request);
          if (cached) return cached;
          return new Response(
            JSON.stringify({ error: 'You are offline. Please reconnect.' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        })
    );
    return;
  }

  // 5. Static assets — Cache-First
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.ok) {
          try {
            caches.open(CACHE_NAME).then(c => c.put(e.request, res.clone())).catch(() => {});
          } catch {}
        }
        return res;
      }).catch(() =>
        // If offline and no cache — return offline page for navigation
        url.pathname === '/' || !url.pathname.includes('.')
          ? caches.match('/index.html')
          : new Response('Offline', { status: 503 })
      );
    })
  );
});

// Push Notifications
self.addEventListener('push', e => {
  if (!e.data) return;
  let data = {};
  try { data = e.data.json(); } catch { data = { title: 'HabitForge', body: e.data.text() }; }

  e.waitUntil(
    self.registration.showNotification(data.title || 'HabitForge', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: data.data || {},
      vibrate: [200, 100, 200],
      actions: [
        { action: 'open', title: 'Open App' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    })
  );
});

// Notification click
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action !== 'dismiss') {
    e.waitUntil(clients.openWindow('/'));
  }
});
