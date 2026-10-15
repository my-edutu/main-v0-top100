'use client';

import { Turnstile as TurnstileWidget } from '@marsidev/react-turnstile';
import { useCallback, useEffect, useState } from 'react';
import { createTimedFetch } from '@/lib/network/fetch-with-timeout';

interface TurnstileProps {
    onVerify: (token: string) => void;
    onError?: () => void;
    onExpire?: () => void;
    action?: string;
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
export function TurnstileCaptcha({ onVerify, onError, onExpire, action }: TurnstileProps) {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    const [attempt, setAttempt] = useState(0);
    const [widgetLoaded, setWidgetLoaded] = useState(false);
    const [failure, setFailure] = useState<{ message: string; reload?: boolean } | null>(null);

    useEffect(() => {
        if (!siteKey || widgetLoaded) return;
        const timeout = setTimeout(() => {
            setFailure({ message: 'The security check could not load. Reload the page to try again.', reload: true });
            onError?.();
        }, 20_000);
        return () => clearTimeout(timeout);
    }, [siteKey, widgetLoaded, attempt, onError]);

    const handleVerify = useCallback((token: string) => {
        setFailure(null);
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
        <div className="flex w-full flex-col items-center gap-2">
            <TurnstileWidget
                key={attempt}
                siteKey={siteKey}
                onWidgetLoad={() => setWidgetLoaded(true)}
                onSuccess={handleVerify}
                onError={(code) => {
                    onError?.();
                    const configurationError = ['110100', '110110', '110200', '400020', '400021', '400070'].includes(code);
                    setFailure({ message: configurationError
                        ? `The security check is unavailable (reference ${code}). Please contact support.`
                        : 'The security check was interrupted. Retry it below.' });
                }}
                onExpire={onExpire}
                onTimeout={() => { onExpire?.(); setFailure({ message: 'The security check timed out. Please retry it.' }); }}
                onUnsupported={() => { onError?.(); setFailure({ message: 'Open this page in an updated Chrome, Safari, Firefox or Edge browser to complete the security check.' }); }}
                scriptOptions={{ onError: () => {
                    onError?.();
                    setFailure({ message: 'The security check could not load. Reload the page to try again.', reload: true });
                } }}
                options={{
                    theme: 'light',
                    size: 'flexible',
                    retry: 'auto',
                    refreshExpired: 'auto',
                    refreshTimeout: 'auto',
                    ...(action ? { action } : {}),
                }}
            />
            {failure && <div role="alert" className="max-w-sm text-center text-sm text-rose-700">
                <p>{failure.message}</p>
                <button type="button" className="mt-2 rounded-lg border border-stone-300 bg-white px-3 py-2 font-semibold text-stone-900" onClick={() => {
                    onExpire?.();
                    if (failure.reload) { window.location.reload(); return; }
                    setFailure(null);
                    setWidgetLoaded(false);
                    setAttempt(value => value + 1);
                }}>{failure.reload ? 'Reload page' : 'Retry security check'}</button>
            </div>}
        </div>
    );
}

/**
 * Verify CAPTCHA token on the server
 * Call this function before processing form submissions
 */
export async function verifyCaptcha(token: string, action?: 'login' | 'admin_login'): Promise<boolean> {
    try {
        const response = await createTimedFetch(fetch, 12_000)('/api/verify-captcha', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token, ...(action ? { action } : {}) }),
        });

        const data = await response.json();
        return response.ok && data.success === true;
    } catch (error) {
        console.error('CAPTCHA verification error:', error);
        return false;
    }
}
