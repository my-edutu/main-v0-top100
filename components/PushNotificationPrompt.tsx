'use client';

import { useState, useEffect } from 'react';
import { Bell, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PushNotificationPromptProps {
    /** Delay before showing the popup (ms) */
    delay?: number;
    /** Position of the popup */
    position?: 'bottom-left' | 'bottom-right';
}

/**
 * Push Notification Permission Prompt
 * 
 * Shows a friendly popup in the corner asking users to enable push notifications.
 * Only shows if:
 * - Browser supports push notifications
 * - User hasn't already granted/denied permission
 * - User hasn't dismissed the prompt recently
 */
export function PushNotificationPrompt({
    delay = 5000,
    position = 'bottom-left'
}: PushNotificationPromptProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Check if we should show the prompt
        const shouldShow = async () => {
            // Check if push notifications are supported
            if (!('Notification' in window) || !('serviceWorker' in navigator)) {
                console.log('[Push] Push notifications not supported');
                return false;
            }

            // Check if already granted or denied
            if (Notification.permission !== 'default') {
                console.log('[Push] Permission already:', Notification.permission);
                return false;
            }

            // Check if user dismissed recently (don't show again for 7 days)
            const dismissedAt = localStorage.getItem('push-prompt-dismissed');
            if (dismissedAt) {
                const dismissedTime = parseInt(dismissedAt, 10);
                const sevenDays = 7 * 24 * 60 * 60 * 1000;
                if (Date.now() - dismissedTime < sevenDays) {
                    console.log('[Push] User dismissed recently, waiting...');
                    return false;
                }
            }

            return true;
        };

        const timer = setTimeout(async () => {
            const show = await shouldShow();
            if (show) {
                setIsVisible(true);
            }
        }, delay);

        return () => clearTimeout(timer);
    }, [delay]);

    const handleEnable = async () => {
        setIsLoading(true);

        try {
            // Register service worker first
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('[Push] Service Worker registered:', registration);

            // Request notification permission
            const permission = await Notification.requestPermission();
            console.log('[Push] Permission result:', permission);

            if (permission === 'granted') {
                // Show a test notification
                new Notification('Notifications Enabled! 🎉', {
                    body: 'You will now receive updates from Top100 Africa Future Leaders.',
                    icon: '/Top100 Africa Future leaders Logo .png',
                });

                // Save subscription to database
                try {
                    // Create a basic subscription record
                    const subscriptionData = {
                        subscription: {
                            endpoint: `browser-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                            keys: null,
                        },
                        userAgent: navigator.userAgent,
                    };

                    // Try to get actual push subscription if possible
                    try {
                        const pushSubscription = await registration.pushManager.subscribe({
                            userVisibleOnly: true,
                        });
                        subscriptionData.subscription = pushSubscription.toJSON() as any;
                    } catch (e) {
                        console.log('[Push] Using fallback subscription (VAPID not configured)');
                    }

                    // Save to database
                    await fetch('/api/notifications/subscribe', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(subscriptionData),
                    });

                    console.log('[Push] Subscription saved to database');
                } catch (subError) {
                    console.log('[Push] Error saving subscription:', subError);
                }
            }

            setIsVisible(false);
        } catch (error) {
            console.error('[Push] Error enabling notifications:', error);
        } finally {
            setIsLoading(false);
        }
    };


    const handleDismiss = () => {
        // Remember that user dismissed
        localStorage.setItem('push-prompt-dismissed', Date.now().toString());
        setIsVisible(false);
    };

    const handleNotNow = () => {
        // Shorter wait time for "Not Now" (1 day)
        const oneDayAgo = Date.now() - (6 * 24 * 60 * 60 * 1000); // Will show again in 1 day
        localStorage.setItem('push-prompt-dismissed', oneDayAgo.toString());
        setIsVisible(false);
    };

    const positionClasses = position === 'bottom-right'
        ? 'right-4 sm:right-6'
        : 'left-4 sm:left-6';

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className={`fixed bottom-4 sm:bottom-6 ${positionClasses} z-50 max-w-sm w-[calc(100%-2rem)] sm:w-auto`}
                >
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                        {/* Header with close button */}
                        <div className="relative bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3">
                            <button
                                onClick={handleDismiss}
                                className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/20 transition-colors"
                                aria-label="Close"
                            >
                                <X className="h-4 w-4 text-white" />
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                    <Bell className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-sm">Stay Updated!</h3>
                                    <p className="text-white/80 text-xs">Get the latest news & updates</p>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-4">
                            <p className="text-gray-600 text-sm mb-4">
                                Enable notifications to receive updates about new awardees, events, and opportunities from Top100 Africa Future Leaders.
                            </p>

                            {/* Buttons */}
                            <div className="flex gap-2">
                                <button
                                    onClick={handleNotNow}
                                    disabled={isLoading}
                                    className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    Not Now
                                </button>
                                <button
                                    onClick={handleEnable}
                                    disabled={isLoading}
                                    className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isLoading ? (
                                        <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                    ) : (
                                        <>
                                            <Check className="h-4 w-4" />
                                            Enable
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                            <p className="text-[10px] text-gray-400 text-center">
                                You can disable notifications anytime in your browser settings
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/**
 * Hook to manage push notifications
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

        // Check subscription status
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
            console.warn('[Push] Cannot show notification, permission:', permission);
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
