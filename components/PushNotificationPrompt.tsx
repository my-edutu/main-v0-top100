'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
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
 * Invitations can be postponed; native permission is requested only on a tap.
 */
export function PushNotificationPrompt() {
    const pathname = usePathname();
    const [isVisible, setIsVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        setIsVisible(false);
        if (!pathname.startsWith('/dashboard') || !window.isSecureContext) return;
        const shouldShow = () => {
            const supportsNotifications = 'Notification' in window;
            const supportsServiceWorker = 'serviceWorker' in navigator;

            return isPushPromptAvailable({
                supportsNotifications,
                supportsServiceWorker,
                supportsPushManager: supportsServiceWorker && 'PushManager' in window,
                permission: supportsNotifications ? Notification.permission : 'denied',
                vapidPublicKey: VAPID_PUBLIC_KEY,
                alreadyPrompted: (() => { try { return Number(localStorage.getItem('top100-push-remind-after')) > Date.now() } catch { return false } })(),
            });
        };

        // Let onboarding and the install dialog finish before inviting.
        let timer: ReturnType<typeof setTimeout>;
        const invite = () => {
            if (document.hidden || document.querySelector('[role="dialog"]')) {
                timer = setTimeout(invite, 5000);
                return;
            }
            if (shouldShow()) setIsVisible(true);
        };
        timer = setTimeout(invite, 12000);
        return () => clearTimeout(timer);
    }, [pathname]);

    const handleEnable = async () => {
        setIsLoading(true);
        setError('');

        try {
            const permission = await Notification.requestPermission();

            if (permission !== 'granted') {
                setIsVisible(false);
                return;
            }

            const registration = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
            await navigator.serviceWorker.ready;
            const pushSubscription = await registration.pushManager.getSubscription() ?? await registration.pushManager.subscribe({
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
                await pushSubscription.unsubscribe();
                throw new Error('The notification subscription could not be saved.');
            }

            await registration.showNotification('Notifications enabled', {
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
        try { localStorage.setItem('top100-push-remind-after', String(Date.now() + 7 * 86400000)); } catch {}
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
                    className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+6rem)] z-[60] mx-auto max-w-md"
                >
                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
                      <div className="flex items-center gap-3">
                        {/* Icon */}
                        <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                            <Bell className="h-4 w-4 text-orange-600" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">Stay up to date</p>
                            <p className="text-xs leading-5 text-gray-600">Get Top100 updates on your phone. Turn them off anytime in Settings.</p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                            <button
                                onClick={handleEnable}
                                disabled={isLoading}
                                className="min-h-11 px-3 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isLoading ? 'Enabling…' : 'Enable'}
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="min-h-11 min-w-11 p-2 text-gray-400 hover:text-gray-600 rounded transition-colors"
                                aria-label="Remind me in a week"
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
