/**
 * Gully Cricket - Service Worker
 * Handles offline caching, push notifications, and background sync
 */

const CACHE_NAME = 'gully-v1';
const STATIC_CACHE_NAME = 'gully-static-v1';
const DYNAMIC_CACHE_NAME = 'gully-dynamic-v1';
const OFFLINE_QUEUE_NAME = 'gully-offline-queue';

// Static assets to cache immediately (only ones that exist)
const STATIC_ASSETS = [
    '/',
    '/manifest.json'
];

// API routes to cache with network-first strategy
const API_ROUTES = [
    '/api/'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');

    event.waitUntil(
        caches.open(STATIC_CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                // Cache each asset individually to handle failures gracefully
                return Promise.allSettled(
                    STATIC_ASSETS.map(asset =>
                        cache.add(asset).catch(err => {
                            console.warn('[SW] Failed to cache:', asset, err);
                        })
                    )
                );
            })
            .then(() => {
                console.log('[SW] Static assets cached');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Failed to cache static assets:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => {
                            return name.startsWith('gully-') &&
                                name !== STATIC_CACHE_NAME &&
                                name !== DYNAMIC_CACHE_NAME;
                        })
                        .map((name) => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Service worker activated');
                return self.clients.claim();
            })
    );
});

// Fetch event - handle requests with caching strategies
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests for caching
    if (request.method !== 'GET') {
        // Store POST/PUT requests for offline sync
        if (request.method === 'POST' || request.method === 'PUT') {
            event.respondWith(
                fetch(request.clone())
                    .catch(async () => {
                        // Queue for later if offline
                        await addToOfflineQueue(request);
                        return new Response(
                            JSON.stringify({
                                offline: true,
                                message: 'Request queued for sync'
                            }),
                            {
                                status: 202,
                                headers: { 'Content-Type': 'application/json' }
                            }
                        );
                    })
            );
        }
        return;
    }

    // For Firebase/external requests - network only
    if (!url.origin.includes(self.location.origin)) {
        return;
    }

    // API routes - network first, fallback to cache
    if (API_ROUTES.some(route => url.pathname.startsWith(route))) {
        event.respondWith(networkFirst(request));
        return;
    }

    // Static assets - cache first, fallback to network
    event.respondWith(cacheFirst(request));
});

/**
 * Cache-first strategy
 */
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
        // Return cached version, but update cache in background
        updateCache(request);
        return cachedResponse;
    }

    try {
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        // Return offline fallback page
        return getOfflineFallback(request);
    }
}

/**
 * Network-first strategy
 */
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        const cachedResponse = await caches.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        return getOfflineFallback(request);
    }
}

/**
 * Update cache in background
 */
async function updateCache(request) {
    try {
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            cache.put(request, networkResponse);
        }
    } catch (error) {
        // Silently fail - we're just updating
    }
}

/**
 * Get offline fallback response
 */
function getOfflineFallback(request) {
    const url = new URL(request.url);

    // For navigation requests, return cached home page
    if (request.mode === 'navigate') {
        return caches.match('/') || new Response(
            `<!DOCTYPE html>
            <html>
            <head>
                <title>Gully - Offline</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body { 
                        font-family: system-ui; 
                        display: flex; 
                        align-items: center; 
                        justify-content: center; 
                        min-height: 100vh; 
                        margin: 0;
                        background: #0a0a0a;
                        color: white;
                        text-align: center;
                        padding: 2rem;
                    }
                    h1 { margin-bottom: 0.5rem; }
                    p { opacity: 0.7; }
                    button {
                        background: #6366f1;
                        color: white;
                        border: none;
                        padding: 1rem 2rem;
                        border-radius: 8px;
                        font-size: 1rem;
                        cursor: pointer;
                        margin-top: 1rem;
                    }
                </style>
            </head>
            <body>
                <div>
                    <h1>🏏 You're Offline</h1>
                    <p>Please check your internet connection and try again.</p>
                    <button onclick="location.reload()">Retry</button>
                </div>
            </body>
            </html>`,
            {
                status: 200,
                headers: { 'Content-Type': 'text/html' }
            }
        );
    }

    // For other requests, return error
    return new Response('Offline', { status: 503 });
}

/**
 * Add request to offline queue for background sync
 */
async function addToOfflineQueue(request) {
    try {
        const db = await openOfflineDB();
        const tx = db.transaction(OFFLINE_QUEUE_NAME, 'readwrite');
        const store = tx.objectStore(OFFLINE_QUEUE_NAME);

        await store.add({
            url: request.url,
            method: request.method,
            headers: Object.fromEntries(request.headers.entries()),
            body: await request.text(),
            timestamp: Date.now()
        });
    } catch (error) {
        console.warn('[SW] Failed to queue request:', error);
    }
}

/**
 * Open IndexedDB for offline queue
 */
function openOfflineDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('gully-offline', 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(OFFLINE_QUEUE_NAME)) {
                db.createObjectStore(OFFLINE_QUEUE_NAME, {
                    keyPath: 'id',
                    autoIncrement: true
                });
            }
        };
    });
}

// Background sync - process offline queue
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync triggered:', event.tag);

    if (event.tag === 'offline-sync') {
        event.waitUntil(processOfflineQueue());
    }
});

/**
 * Process queued offline requests
 */
async function processOfflineQueue() {
    try {
        const db = await openOfflineDB();
        const tx = db.transaction(OFFLINE_QUEUE_NAME, 'readwrite');
        const store = tx.objectStore(OFFLINE_QUEUE_NAME);
        const requests = await store.getAll();

        for (const item of requests) {
            try {
                await fetch(item.url, {
                    method: item.method,
                    headers: item.headers,
                    body: item.body
                });

                // Remove from queue on success
                await store.delete(item.id);
                console.log('[SW] Synced offline request:', item.url);
            } catch (error) {
                console.error('[SW] Failed to sync request:', item.url, error);
            }
        }
    } catch (error) {
        console.error('[SW] Failed to process offline queue:', error);
    }
}

// Push notifications
self.addEventListener('push', (event) => {
    console.log('[SW] Push notification received');

    if (!event.data) return;

    try {
        const payload = event.data.json();
        const { title, body, icon, badge, data } = payload;

        const options = {
            body,
            icon: icon || '/next.svg',
            badge: badge || '/next.svg',
            vibrate: [100, 50, 100],
            data,
            actions: [
                { action: 'open', title: 'Open' },
                { action: 'dismiss', title: 'Dismiss' }
            ]
        };

        event.waitUntil(
            self.registration.showNotification(title, options)
        );
    } catch (error) {
        console.warn('[SW] Failed to parse push payload:', error);
    }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event.action);

    event.notification.close();

    if (event.action === 'dismiss') return;

    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((windowClients) => {
                // Check if there's already a window open
                for (const client of windowClients) {
                    if (client.url.includes(self.location.origin)) {
                        client.navigate(urlToOpen);
                        return client.focus();
                    }
                }
                // Open new window
                return clients.openWindow(urlToOpen);
            })
    );
});

console.log('[SW] Service worker loaded');
