'use client';

import { Turnstile as TurnstileWidget } from '@marsidev/react-turnstile';
import { useCallback } from 'react';

interface TurnstileProps {
    onVerify: (token: string) => void;
    onError?: () => void;
    onExpire?: () => void;
}

/**
 * Cloudflare Turnstile CAPTCHA Component
 * 
 * A privacy-friendly, free CAPTCHA alternative from Cloudflare.
 * 
 * Setup:
 * 1. Go to https://dash.cloudflare.com/ → Turnstile
 * 2. Create a new widget (use "Managed" mode)
 * 3. Add your domain(s)
 * 4. Get Site Key and Secret Key
 * 5. Add to .env:
 *    NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_site_key
 *    TURNSTILE_SECRET_KEY=your_secret_key
 */
export function TurnstileCaptcha({ onVerify, onError, onExpire }: TurnstileProps) {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

    const handleVerify = useCallback((token: string) => {
        onVerify(token);
    }, [onVerify]);

    // Without a site key there is nothing to render. Warn the developer in the
    // console rather than putting env-var instructions on screen.
    if (!siteKey) {
        if (process.env.NODE_ENV === 'development') {
            console.warn(
                '[Turnstile] CAPTCHA disabled: set NEXT_PUBLIC_TURNSTILE_SITE_KEY in .env to enable it.'
            );
        }
        return null;
    }

    return (
        <div className="flex justify-center">
            <TurnstileWidget
                siteKey={siteKey}
                onSuccess={handleVerify}
                onError={onError}
                onExpire={onExpire}
                options={{
                    theme: 'light',
                    size: 'normal',
                }}
            />
        </div>
    );
}

/**
 * Verify CAPTCHA token on the server
 * Call this function before processing form submissions
 */
export async function verifyCaptcha(token: string): Promise<boolean> {
    try {
        const response = await fetch('/api/verify-captcha', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token }),
        });

        const data = await response.json();
        return data.success === true;
    } catch (error) {
        console.error('CAPTCHA verification error:', error);
        return false;
    }
}
