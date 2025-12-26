'use client';

import { PushNotificationPrompt } from '@/components/PushNotificationPrompt';

/**
 * Client-side providers and components that need to be in the root layout
 */
export function ClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <>
            {children}
            {/* Minimal push notification prompt - shows once per user */}
            <PushNotificationPrompt />
        </>
    );
}

