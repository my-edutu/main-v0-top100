import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limit';

// Subscribe to push notifications
export async function POST(req: NextRequest) {
    try {
        // Rate limiting
        const identifier = getClientIdentifier(req.headers);
        const rateLimitResult = checkRateLimit({
            maxRequests: 5,
            windowSeconds: 60,
            identifier: `push-subscribe:${identifier}`,
        });

        if (!rateLimitResult.success) {
            return createRateLimitResponse(rateLimitResult);
        }

        const { subscription, userAgent } = await req.json();

        if (!subscription || !subscription.endpoint) {
            return Response.json({ error: 'Invalid subscription' }, { status: 400 });
        }

        const supabase = createAdminClient();

        // Store the subscription
        const { data, error } = await supabase
            .from('push_subscriptions')
            .upsert({
                endpoint: subscription.endpoint,
                keys: subscription.keys,
                user_agent: userAgent || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'endpoint'
            })
            .select()
            .single();

        if (error) {
            console.error('Error saving subscription:', error);
            return Response.json({ error: 'Failed to save subscription' }, { status: 500 });
        }

        return Response.json({ success: true, id: data.id });
    } catch (error) {
        console.error('Error in push subscription:', error);
        return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Unsubscribe from push notifications
export async function DELETE(req: NextRequest) {
    try {
        const { endpoint } = await req.json();

        if (!endpoint) {
            return Response.json({ error: 'Endpoint required' }, { status: 400 });
        }

        const supabase = createAdminClient();

        const { error } = await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', endpoint);

        if (error) {
            console.error('Error deleting subscription:', error);
            return Response.json({ error: 'Failed to unsubscribe' }, { status: 500 });
        }

        return Response.json({ success: true });
    } catch (error) {
        console.error('Error in push unsubscribe:', error);
        return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Get subscription status
export async function GET(req: NextRequest) {
    try {
        const endpoint = req.nextUrl.searchParams.get('endpoint');

        if (!endpoint) {
            return Response.json({ error: 'Endpoint required' }, { status: 400 });
        }

        const supabase = createAdminClient();

        const { data } = await supabase
            .from('push_subscriptions')
            .select('id')
            .eq('endpoint', endpoint)
            .single();

        return Response.json({
            subscribed: !!data
        });
    } catch (error) {
        console.error('Error checking subscription:', error);
        return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
}

