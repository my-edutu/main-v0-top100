// Push Notification Service Worker
// Handles push notifications for Top100 Africa Future Leaders

// Cache name for offline support
const CACHE_NAME = 'top100-afl-v1';

// Import Brevo SDK if available
try {
    importScripts("https://cdn.brevo.com/js/sdk-loader.js");
    if (typeof Brevo !== 'undefined') {
        Brevo.push([
            "init",
            {
                client_key: (location.search.match(/[?&]key=([^&]*)/) || [])[1],
            },
        ]);
    }
} catch (e) {
    console.log('[SW] Brevo SDK not loaded');
}

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
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Push notification received
self.addEventListener('push', (event) => {
    console.log('[SW] Push notification received');

    let notificationData = {
        title: 'Top100 Africa Future Leaders',
        body: 'You have a new notification!',
        icon: '/Top100 Africa Future leaders Logo .png',
        badge: '/Top100 Africa Future leaders Logo .png',
        tag: 'top100-notification',
        data: {
            url: '/',
        },
    };

    // Try to parse push data
    if (event.data) {
        try {
            const data = event.data.json();
            notificationData = {
                title: data.title || notificationData.title,
                body: data.body || notificationData.body,
                icon: data.icon || notificationData.icon,
                badge: data.badge || notificationData.badge,
                tag: data.tag || notificationData.tag,
                data: {
                    url: data.url || data.click_action || '/',
                    ...data.data,
                },
            };
        } catch (e) {
            // If not JSON, use text as body
            notificationData.body = event.data.text();
        }
    }

    event.waitUntil(
        self.registration.showNotification(notificationData.title, {
            body: notificationData.body,
            icon: notificationData.icon,
            badge: notificationData.badge,
            tag: notificationData.tag,
            data: notificationData.data,
            vibrate: [100, 50, 100],
            actions: [
                {
                    action: 'open',
                    title: 'View',
                },
                {
                    action: 'close',
                    title: 'Dismiss',
                },
            ],
        })
    );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event.action);
    event.notification.close();

    if (event.action === 'close') {
        return;
    }

    const urlToOpen = event.notification.data?.url || '/';

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