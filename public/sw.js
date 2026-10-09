// Push Notification Service Worker
// Handles push notifications for Top100 Africa Future Leaders

// Cache name for offline support
const CACHE_NAME = 'top100-afl-v1';

// Install event - cache essential assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name.startsWith('top100-afl-'))
                    .map((name) => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
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
