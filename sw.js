// ═══════════════════════════════════════════════════════════════
//  Shruti Monitor – Service Worker (PWA Offline Support)
// ═══════════════════════════════════════════════════════════════

const CACHE_NAME = 'shruti-monitor-v1';

// Core app shell files to cache for offline use
const APP_SHELL = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './carnatic_data.js',
    './hindustani_data.js',
    './harmonium.js',
    './pitch-processor.js',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png',
];

// External resources to cache (fonts, etc.)
const EXTERNAL_RESOURCES = [
    'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Hind:wght@400;500;600;700&family=Inter:wght@400;500;700&display=swap',
];

// ── Install ─────────────────────────────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching app shell');
            // Cache external resources separately (may fail on network issues)
            const externalPromises = EXTERNAL_RESOURCES.map((url) =>
                cache.add(url).catch((err) => {
                    console.warn('[SW] Failed to cache external resource:', url, err);
                })
            );
            return Promise.all([
                cache.addAll(APP_SHELL),
                ...externalPromises,
            ]);
        })
    );
    // Activate immediately without waiting for existing clients to close
    self.skipWaiting();
});

// ── Activate ────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        })
    );
    // Take control of all open clients immediately
    self.clients.claim();
});

// ── Fetch Strategy: Network-First with Cache Fallback ───────
self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // For navigation requests, use network-first
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Clone and cache the fresh response
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    return response;
                })
                .catch(() => caches.match(request))
        );
        return;
    }

    // For same-origin assets, use stale-while-revalidate
    if (new URL(request.url).origin === location.origin) {
        event.respondWith(
            caches.match(request).then((cached) => {
                const fetchPromise = fetch(request)
                    .then((response) => {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                        return response;
                    })
                    .catch(() => cached);

                return cached || fetchPromise;
            })
        );
        return;
    }

    // For external resources (fonts, CDNs), cache-first
    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) return cached;
            return fetch(request).then((response) => {
                // Only cache successful responses
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                }
                return response;
            });
        })
    );
});
