'use client';

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    isPushPromptAvailable,
    urlBase64ToUint8Array,
} from '@/lib/push-notification-readiness';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? '';

/**
 * Minimal Push Notification Permission Prompt
 * 
 * Shows a small, unobtrusive popup in the corner asking users to enable notifications.
 * Only shows ONCE per user (persisted indefinitely in localStorage).
 */
export function PushNotificationPrompt() {
    const [isVisible, setIsVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const shouldShow = () => {
            const supportsNotifications = 'Notification' in window;
            const supportsServiceWorker = 'serviceWorker' in navigator;

            return isPushPromptAvailable({
                supportsNotifications,
                supportsServiceWorker,
                supportsPushManager: supportsServiceWorker && 'PushManager' in window,
                permission: supportsNotifications ? Notification.permission : 'denied',
                vapidPublicKey: VAPID_PUBLIC_KEY,
                alreadyPrompted: localStorage.getItem('push-popup-shown') === 'true',
            });
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
        setError('');

        try {
            const permission = await Notification.requestPermission();

            if (permission !== 'granted') {
                setIsVisible(false);
                return;
            }

            const registration = await navigator.serviceWorker.register('/sw.js');
            const pushSubscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });
            const response = await fetch('/api/notifications/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subscription: pushSubscription.toJSON(),
                    userAgent: navigator.userAgent,
                }),
            });

            if (!response.ok) {
                throw new Error('The notification subscription could not be saved.');
            }

            registration.showNotification('Notifications enabled', {
                body: 'You can now receive Top100 AFL updates on this device.',
                icon: '/Top100 Africa Future leaders Logo .png',
                silent: true,
            });
            setIsVisible(false);
        } catch (error) {
            console.error('[Push] Error:', error);
            setError('Notifications could not be enabled. Please try again later.');
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
                    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
                      <div className="flex items-center gap-3">
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
                                {isLoading ? 'Enabling...' : 'Enable'}
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
                      {error && (
                        <p role="alert" className="mt-2 text-xs font-medium leading-snug text-rose-700">
                          {error}
                        </p>
                      )}
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
