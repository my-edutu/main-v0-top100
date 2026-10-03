'use client';

import dynamic from 'next/dynamic';
import { AuthRecoveryLinkRouter } from '@/components/auth-recovery-link-router';

/**
 * Client-side providers and components that need to be in the root layout
 */
const DeferredPushNotificationPrompt = dynamic(
    () => import('@/components/PushNotificationPrompt').then((mod) => mod.PushNotificationPrompt),
    { ssr: false, loading: () => null }
);

const DeferredCookieConsent = dynamic(
    () => import('@/app/components/CookieConsent'),
    { ssr: false, loading: () => null }
);

export function ClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <>
            <AuthRecoveryLinkRouter />
            {children}
            {/* Minimal push notification prompt - shows once per user */}
            <DeferredPushNotificationPrompt />
            {/* Cookie notice - shows until the visitor accepts or declines */}
            <DeferredCookieConsent />
        </>
    );
}
