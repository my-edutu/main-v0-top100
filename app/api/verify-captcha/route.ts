import { NextRequest } from 'next/server';

interface TurnstileResponse {
    success: boolean;
    'error-codes'?: string[];
    challenge_ts?: string;
    hostname?: string;
    action?: string;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => null);
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            return Response.json({ success: false, error: 'Invalid security check request' }, { status: 400 });
        }
        const { token, action } = body;

        if (typeof token !== 'string' || !token.trim() || token.length > 2048) {
            return Response.json(
                { success: false, error: 'CAPTCHA token is required' },
                { status: 400 }
            );
        }
        if (action !== undefined && action !== 'login' && action !== 'admin_login') {
            return Response.json({ success: false, error: 'Invalid security check action' }, { status: 400 });
        }

        const secretKey = process.env.TURNSTILE_SECRET_KEY;

        if (!secretKey) {
            console.error('[CAPTCHA] TURNSTILE_SECRET_KEY is not configured');
            // In development without key, allow through
            if (process.env.NODE_ENV === 'development') {
                console.warn('[CAPTCHA] Development mode: bypassing verification');
                return Response.json({ success: true, development: true });
            }
            return Response.json(
                { success: false, error: 'CAPTCHA not configured' },
                { status: 500 }
            );
        }

        // Verify the token with Cloudflare
        const formData = new URLSearchParams();
        formData.append('secret', secretKey);
        formData.append('response', token);

        const response = await fetch(
            'https://challenges.cloudflare.com/turnstile/v0/siteverify',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData.toString(),
                signal: AbortSignal.timeout(10_000),
                cache: 'no-store',
            }
        );
        if (!response.ok) {
            console.error('[CAPTCHA] Siteverify unavailable', { status: response.status });
            return Response.json({ success: false, error: 'Security check temporarily unavailable. Please retry.' }, { status: 503 });
        }

        const data: TurnstileResponse = await response.json();
        const hostnames = new Set((process.env.NODE_ENV === 'production'
            ? process.env.TURNSTILE_HOSTNAMES || 'top100afl.com,www.top100afl.com'
            : 'localhost,127.0.0.1').split(',').map(hostname => hostname.trim()).filter(Boolean));

        // Keep older deployed clients (without an action) working during rollout.
        if (data.success === true && hostnames.has(data.hostname ?? '') && (!action || data.action === action)) {
            return Response.json({ success: true });
        } else {
            console.warn('[CAPTCHA] Verification failed:', {
                codes: data['error-codes'], hostname: data.hostname, action: data.action,
            });
            return Response.json(
                {
                    success: false,
                    error: 'CAPTCHA verification failed',
                    codes: data['error-codes']
                },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error('[CAPTCHA] Error verifying token:', error);
        return Response.json(
            { success: false, error: 'Security check temporarily unavailable. Please retry.' },
            { status: 503 }
        );
    }
}
