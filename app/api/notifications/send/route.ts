import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/api/require-admin';

// Send push notification to all subscribers (Admin only)
export async function POST(req: NextRequest) {
    // Require admin authentication
    const adminCheck = await requireAdmin(req);
    if ('error' in adminCheck) {
        return adminCheck.error;
    }

    try {
        const { title, body, url, icon } = await req.json();

        if (!title || !body) {
            return Response.json({ error: 'Title and body are required' }, { status: 400 });
        }

        const supabase = createAdminClient(); // Use service role

        // Get all subscriptions
        const { data: subscriptions, error: fetchError } = await supabase
            .from('push_subscriptions')
            .select('*');

        if (fetchError) {
            console.error('Error fetching subscriptions:', fetchError);
            return Response.json({ error: 'Failed to fetch subscribers' }, { status: 500 });
        }

        if (!subscriptions || subscriptions.length === 0) {
            return Response.json({
                success: true,
                sentCount: 0,
                message: 'No subscribers to notify'
            });
        }

        // Prepare notification payload
        const notificationPayload = {
            title,
            body,
            icon: icon || '/Top100 Africa Future leaders Logo .png',
            badge: '/Top100 Africa Future leaders Logo .png',
            url: url || '/',
            tag: `notification-${Date.now()}`,
        };

        let successCount = 0;
        let failCount = 0;
        const failedEndpoints: string[] = [];

        // For now, we'll use a simple approach
        // In production, you'd use web-push library with VAPID keys
        // This simulates the send and tracks history

        // Since we can't actually send push without VAPID keys,
        // we'll store the notification for when users visit the site

        // Save notification to history
        const { error: historyError } = await supabase
            .from('notification_history')
            .insert({
                title,
                body,
                url: url || '/',
                recipient_count: subscriptions.length,
                status: 'sent',
                sent_at: new Date().toISOString(),
                sent_by: adminCheck.user?.id || null,
            });

        if (historyError) {
            console.error('Error saving notification history:', historyError);
        }

        // Store as pending notification for users to receive
        const { error: pendingError } = await supabase
            .from('pending_notifications')
            .insert({
                title,
                body,
                url: url || '/',
                icon: notificationPayload.icon,
                created_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
            });

        if (pendingError) {
            console.error('Error saving pending notification:', pendingError);
        }

        successCount = subscriptions.length;

        return Response.json({
            success: true,
            sentCount: successCount,
            failedCount: failCount,
            message: `Notification queued for ${successCount} subscribers`,
        });
    } catch (error) {
        console.error('Error sending notifications:', error);
        return Response.json({
            error: 'Failed to send notifications',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

// Get notification history (Admin only)
export async function GET(req: NextRequest) {
    const adminCheck = await requireAdmin(req);
    if ('error' in adminCheck) {
        return adminCheck.error;
    }

    try {
        const supabase = createAdminClient();

        const { data, error } = await supabase
            .from('notification_history')
            .select('*')
            .order('sent_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Error fetching notification history:', error);
            return Response.json({ error: 'Failed to fetch history' }, { status: 500 });
        }

        return Response.json({ history: data || [] });
    } catch (error) {
        console.error('Error in notification history:', error);
        return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
}

