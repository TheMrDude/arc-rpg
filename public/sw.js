// Service Worker for HabitQuest PWA
//
// This worker previously served a child yesterday's app for an hour.
//
// Two faults did it together. First, CACHE_NAME was the hardcoded string
// 'habitquest-v1' and had never changed, so the activate handler's cleanup
// (`if (cacheName !== CACHE_NAME) delete`) had never once been true -- it read
// like protection and was dead code. Second, the fetch handler cached EVERY
// same-origin non-API response, HTML documents included. Next.js HTML pins
// content-hashed chunk URLs, so a cached /dashboard document is a pointer to one
// exact past build. One slow network response was enough to serve that document
// from cache, whose chunk hashes were also cached, producing a complete and
// entirely functional copy of an older app: no error, no warning, and a missing
// recurrence control.
//
// The fixes, which only work together:
//
//   1. The cache name carries the build. The worker is registered as
//      /sw.js?v=<build id>, so every deploy is a byte-different script URL that
//      forces a reinstall, and the version becomes the cache name -- which
//      finally makes the existing cleanup delete something.
//
//   2. Navigations are network-only. HTML is a pointer to hashed assets and must
//      never be served stale; /offline is its only fallback. This is the part
//      that actually cures what happened. Versioning alone would still have
//      served her the old document until the next deploy.

// Derived from the ?v= on the registration URL. A worker registered without one
// (a local `next start`, or an old registration that somehow survives) gets its
// own 'dev' cache rather than silently sharing a versioned one.
const VERSION = new URL(self.location).searchParams.get('v') || 'dev';
const CACHE_NAME = `habitquest-${VERSION}`;
const OFFLINE_URL = '/offline';

// Only the offline page is precached. The old list included /, /dashboard,
// /login and /signup -- all HTML, all now deliberately uncacheable, and all of
// them the reason a stale document could be served in the first place.
const PRECACHE_URLS = [OFFLINE_URL];

// Content-hashed by the build, so the URL changes whenever the bytes do. Safe to
// serve from cache without asking the network first.
const IMMUTABLE_PREFIX = '/_next/static/';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => {
        // A precache miss must not block installation: without skipWaiting the
        // old worker stays in control, which is the state we are trying to leave.
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith('habitquest-') && name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

/**
 * cache.put rejects on redirected and non-basic responses, and the old code
 * called it bare -- every redirect produced an unhandled rejection. Nothing here
 * is worth failing a request over, so every store is guarded and filtered.
 */
function putSafe(request, response) {
  if (!response || !response.ok || response.type !== 'basic' || response.redirected) return;
  const copy = response.clone();
  caches
    .open(CACHE_NAME)
    .then((cache) => cache.put(request, copy))
    .catch(() => {});
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // cache.put throws on anything that is not a GET, and a POST has no business
  // in a cache regardless. The old worker only skipped /api/, so a POST to a
  // non-API route reached the caching path.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Navigations: network only. A stale HTML document is exactly the bug.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then(
          (cached) =>
            cached ||
            new Response('<h1>Offline</h1>', {
              status: 503,
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
            })
        )
      )
    );
    return;
  }

  // Build output: content-hashed, so a cache hit can never be the wrong version.
  if (url.pathname.startsWith(IMMUTABLE_PREFIX)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            putSafe(request, response);
            return response;
          })
      )
    );
    return;
  }

  // Everything else same-origin: images, icons, the manifest. These live at
  // stable unhashed paths -- /images/companions/seeker/1.png is overwritten in
  // place when art changes -- so the network has to win, or updated art would
  // never reach a device that had already seen the old file.
  event.respondWith(
    fetch(request)
      .then((response) => {
        putSafe(request, response);
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// Handle background sync for offline quest completion
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-quests') {
    event.waitUntil(syncQuests());
  }
});

async function syncQuests() {
  // This would sync any offline-completed quests when back online
  console.log('Background sync triggered');
}

// Handle push notifications (for future use)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'HabitQuest';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/dashboard'
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/dashboard')
  );
});
