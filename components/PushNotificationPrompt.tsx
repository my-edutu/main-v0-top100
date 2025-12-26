'use client';

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Minimal Push Notification Permission Prompt
 * 
 * Shows a small, unobtrusive popup in the corner asking users to enable notifications.
 * Only shows ONCE per user (persisted indefinitely in localStorage).
 */
export function PushNotificationPrompt() {
    const [isVisible, setIsVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const shouldShow = () => {
            // Check if push notifications are supported
            if (!('Notification' in window) || !('serviceWorker' in navigator)) {
                return false;
            }

            // Check if already granted or denied
            if (Notification.permission !== 'default') {
                return false;
            }

            // Check if user has EVER seen this popup (one-time only)
            const hasSeenPopup = localStorage.getItem('push-popup-shown');
            if (hasSeenPopup === 'true') {
                return false;
            }

            return true;
        };

        // Show after 8 seconds of browsing
        const timer = setTimeout(() => {
            if (shouldShow()) {
                setIsVisible(true);
                // Mark as shown immediately
                localStorage.setItem('push-popup-shown', 'true');
            }
        }, 8000);

        return () => clearTimeout(timer);
    }, []);

    const handleEnable = async () => {
        setIsLoading(true);

        try {
            // Register service worker
            const registration = await navigator.serviceWorker.register('/sw.js');

            // Request permission
            const permission = await Notification.requestPermission();

            if (permission === 'granted') {
                // Show confirmation notification
                new Notification('🔔 Notifications enabled!', {
                    body: 'You\'ll receive updates from Top100 AFL.',
                    icon: '/Top100 Africa Future leaders Logo .png',
                    silent: true,
                });

                // Try to save subscription
                try {
                    const subscriptionData = {
                        subscription: {
                            endpoint: `browser-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                            keys: null,
                        },
                        userAgent: navigator.userAgent,
                    };

                    try {
                        const pushSubscription = await registration.pushManager.subscribe({
                            userVisibleOnly: true,
                        });
                        subscriptionData.subscription = pushSubscription.toJSON() as any;
                    } catch (e) {
                        // VAPID not configured, use fallback
                    }

                    await fetch('/api/notifications/subscribe', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(subscriptionData),
                    });
                } catch (e) {
                    console.log('[Push] Subscription save failed:', e);
                }
            }

            setIsVisible(false);
        } catch (error) {
            console.error('[Push] Error:', error);
            setIsVisible(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                    className="fixed bottom-4 left-4 z-50 max-w-[280px]"
                >
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-3 flex items-center gap-3">
                        {/* Icon */}
                        <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                            <Bell className="h-4 w-4 text-orange-600" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-900">Get notified</p>
                            <p className="text-[10px] text-gray-500">Updates on events & news</p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                            <button
                                onClick={handleEnable}
                                disabled={isLoading}
                                className="px-2.5 py-1.5 text-[11px] font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isLoading ? '...' : 'Yes'}
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                                aria-label="Close"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/**
 * Hook to manage push notifications programmatically
 */
export function usePushNotifications() {
    const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
    const [isSubscribed, setIsSubscribed] = useState(false);

    useEffect(() => {
        if (!('Notification' in window)) {
            setPermission('unsupported');
            return;
        }

        setPermission(Notification.permission);

        if ('serviceWorker' in navigator && Notification.permission === 'granted') {
            navigator.serviceWorker.ready.then((registration) => {
                registration.pushManager.getSubscription().then((subscription) => {
                    setIsSubscribed(!!subscription);
                });
            });
        }
    }, []);

    const requestPermission = async () => {
        if (!('Notification' in window)) {
            return 'unsupported';
        }

        const result = await Notification.requestPermission();
        setPermission(result);
        return result;
    };

    const showNotification = (title: string, options?: NotificationOptions) => {
        if (permission !== 'granted') {
            return null;
        }

        return new Notification(title, {
            icon: '/Top100 Africa Future leaders Logo .png',
            ...options,
        });
    };

    return {
        permission,
        isSubscribed,
        isSupported: permission !== 'unsupported',
        requestPermission,
        showNotification,
    };
}

/**
 * Helper to verify CAPTCHA (kept for compatibility)
 */
export async function verifyCaptcha(token: string): Promise<boolean> {
    try {
        const response = await fetch('/api/verify-captcha', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
        });
        const data = await response.json();
        return data.success === true;
    } catch {
        return false;
    }
}
