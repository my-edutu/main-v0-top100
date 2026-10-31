// Push Notification Service Worker
// Handles push notifications for Top100 Africa Future Leaders

// Cache name for offline support
const CACHE_NAME = 'top100-afl-offline-v2';
const OFFLINE_URL = '/offline.html';
const ASSET_CACHE_NAME = 'top100-afl-static-v1';
let assetWrites = Promise.resolve();

// Install event - cache essential assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.add(OFFLINE_URL))
        .catch(() => {}).then(() => self.skipWaiting()));
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name.startsWith('top100-afl-') && name !== CACHE_NAME && name !== ASSET_CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// Keep authenticated pages and APIs on the network. Only a generic public
// offline screen is stored; deployments can never be hidden by cached HTML.
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);
    const immutableAsset = request.method === 'GET' && url.origin === self.location.origin &&
        ['script', 'style', 'font'].includes(request.destination) &&
        /^\/_next\/static\/.+\/(?=[^/]*\d)[a-zA-Z0-9_.-]{8,}\.(?:js|css|woff2?)$/.test(url.pathname);
    if (immutableAsset) {
        const response = (async () => {
            try {
                const cached = await (await caches.open(ASSET_CACHE_NAME)).match(request);
                if (cached) return cached;
            } catch { /* Cache access is optional, including in private browsing. */ }
            return fetch(request);
        })();
        event.waitUntil(response.then(result => {
            if (!result.ok || result.type === 'opaque' || result.redirected ||
                !/\bimmutable\b/i.test(result.headers.get('Cache-Control') || '') ||
                /no-store|private/i.test(result.headers.get('Cache-Control') || '')) return;
            const copy = result.clone();
            assetWrites = assetWrites.catch(() => {}).then(async () => {
                const cache = await caches.open(ASSET_CACHE_NAME);
                // Do not reinsert hits: eviction is ordered by initial insertion.
                if (!await cache.match(request)) await cache.put(request, copy);
                const keys = await cache.keys();
                for (const key of keys.slice(0, Math.max(0, keys.length - 60))) await cache.delete(key);
            });
            return assetWrites;
        }).catch(() => {}));
        event.respondWith(response);
        return;
    }
    if (request.mode !== 'navigate' || request.method !== 'GET' ||
        new URL(request.url).origin !== self.location.origin) return;
    event.respondWith(fetch(request, { cache: 'no-store' }).catch(async () => {
        try {
            const cache = await caches.open(CACHE_NAME);
            const fallback = await cache.match(OFFLINE_URL);
            if (fallback) return fallback;
        } catch { /* Storage can be disabled or full. */ }
        return new Response('You are offline. Reconnect and try again.', {
            status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
    }));
});

// Push notification received
self.addEventListener('push', (event) => {
    console.log('[SW] Push notification received');

    let notificationData = {
        title: 'Top100 Africa Future Leaders',
        body: 'You have a new notification!',
        icon: '/icons/top100-africa-192.png',
        badge: '/icons/top100-africa-180.png',
        tag: undefined,
        data: {
            url: '/dashboard/notifications',
        },
    };

    // Try to parse push data
    let raw = null;
    if (event.data) {
        try {
            const data = event.data.json();
            raw = data;
            notificationData = {
                title: data.title || notificationData.title,
                body: data.body || notificationData.body,
                icon: data.icon || notificationData.icon,
                badge: data.badge || notificationData.badge,
                tag: data.tag || undefined,
                data: {
                    url: data.url || data.click_action || '/dashboard/notifications',
                    ...data.data,
                },
            };
        } catch (e) {
            // If not JSON, use text as body
            notificationData.body = event.data.text();
        }
    }

    const count = raw?.unreadCount;
    // Badging is optional. A missing method or synchronous platform error must
    // never stop the visible notification from being displayed.
    const badgeUpdate = Promise.resolve().then(() => {
        if (!Number.isInteger(count) || count < 0) return;
        if (count && typeof self.navigator?.setAppBadge === 'function') return self.navigator.setAppBadge(count);
        if (!count && typeof self.navigator?.clearAppBadge === 'function') return self.navigator.clearAppBadge();
    });
    const options = {
        body: notificationData.body,
        icon: notificationData.icon,
        badge: notificationData.badge,
        data: notificationData.data,
    };
    // A shared nonempty tag replaces earlier notifications in the panel.
    if (notificationData.tag) options.tag = notificationData.tag;
    event.waitUntil(
        Promise.all([
            badgeUpdate.catch(() => {}),
            self.registration.showNotification(notificationData.title, options).catch((error) => {
                console.error('[SW] Could not display push notification', error);
            }),
        ])
    );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event.action);
    event.notification.close();

    let urlToOpen = '/dashboard/notifications';
    try {
      const candidate = new URL(event.notification.data?.url || urlToOpen, self.location.origin);
      if (candidate.origin === self.location.origin) urlToOpen = candidate.href;
    } catch {}

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Check if there's already a window open
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.navigate(urlToOpen);
                    return client.focus();
                }
            }
            // Open new window if none exists
            return clients.openWindow(urlToOpen);
        })
    );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync:', event.tag);
});

// Notification close handler (for analytics)
self.addEventListener('notificationclose', (event) => {
    console.log('[SW] Notification dismissed');
});
