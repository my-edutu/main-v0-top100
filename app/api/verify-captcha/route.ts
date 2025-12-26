import { NextRequest } from 'next/server';

interface TurnstileResponse {
    success: boolean;
    'error-codes'?: string[];
    challenge_ts?: string;
    hostname?: string;
}

export async function POST(req: NextRequest) {
    try {
        const { token } = await req.json();

        if (!token) {
            return Response.json(
                { success: false, error: 'CAPTCHA token is required' },
                { status: 400 }
            );
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
            }
        );

        const data: TurnstileResponse = await response.json();

        if (data.success) {
            return Response.json({ success: true });
        } else {
            console.warn('[CAPTCHA] Verification failed:', data['error-codes']);
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
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
