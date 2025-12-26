'use client';

import { PushNotificationPrompt } from '@/components/PushNotificationPrompt';

/**
 * Client-side providers and components that need to be in the root layout
 */
export function ClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <>
            {children}
            {/* Push Notification Prompt - shows after 5 seconds */}
            <PushNotificationPrompt delay={5000} position="bottom-left" />
        </>
    );
}
