'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Bell,
    Send,
    Users,
    Clock,
    CheckCircle2,
    AlertCircle,
    History,
    Loader2
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

interface NotificationHistory {
    id: string;
    title: string;
    body: string;
    sent_at: string;
    recipient_count: number;
    status: 'sent' | 'failed' | 'pending';
}

export default function AdminNotificationsPage() {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [url, setUrl] = useState('/');
    const [isSending, setIsSending] = useState(false);
    const [history, setHistory] = useState<NotificationHistory[]>([]);
    const [subscriberCount, setSubscriberCount] = useState(0);

    // Fetch notification history and stats
    useEffect(() => {
        const fetchData = async () => {
            try {
                const supabase = createClient();

                // Fetch notification history
                const { data: historyData } = await supabase
                    .from('notification_history')
                    .select('*')
                    .order('sent_at', { ascending: false })
                    .limit(10);

                if (historyData) {
                    setHistory(historyData);
                }

                // Fetch subscriber count
                const { count } = await supabase
                    .from('push_subscriptions')
                    .select('*', { count: 'exact', head: true });

                setSubscriberCount(count || 0);
            } catch (error) {
                console.log('Error fetching data:', error);
            }
        };

        fetchData();
    }, []);

    const sendNotification = async () => {
        if (!title.trim() || !body.trim()) {
            toast.error('Please fill in title and message');
            return;
        }

        setIsSending(true);

        try {
            const response = await fetch('/api/notifications/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title,
                    body,
                    url,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send notification');
            }

            toast.success(`Notification sent to ${data.sentCount || 0} subscribers!`);

            // Add to history
            setHistory(prev => [{
                id: crypto.randomUUID(),
                title,
                body,
                sent_at: new Date().toISOString(),
                recipient_count: data.sentCount || 0,
                status: 'sent'
            }, ...prev]);

            // Clear form
            setTitle('');
            setBody('');
            setUrl('/');
        } catch (error) {
            console.error('Error sending notification:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to send notification');
        } finally {
            setIsSending(false);
        }
    };

    const previewNotification = () => {
        if (!title.trim() || !body.trim()) {
            toast.error('Please fill in title and message');
            return;
        }

        if (Notification.permission === 'granted') {
            new Notification(title, {
                body: body,
                icon: '/Top100 Africa Future leaders Logo .png',
            });
            toast.success('Preview notification shown!');
        } else if (Notification.permission === 'default') {
            Notification.requestPermission().then((permission) => {
                if (permission === 'granted') {
                    new Notification(title, {
                        body: body,
                        icon: '/Top100 Africa Future leaders Logo .png',
                    });
                }
            });
        } else {
            toast.error('Notifications are blocked. Enable them in browser settings.');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Bell className="h-6 w-6 text-orange-500" />
                    Push Notifications
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                    Send push notifications to all subscribed users
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="border-orange-100 bg-orange-50/50">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                            <Users className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-orange-600">{subscriberCount}</p>
                            <p className="text-xs text-gray-500">Subscribers</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-green-100 bg-green-50/50">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-green-600">
                                {history.filter(h => h.status === 'sent').length}
                            </p>
                            <p className="text-xs text-gray-500">Sent</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-gray-100">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                            <History className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-600">{history.length}</p>
                            <p className="text-xs text-gray-500">Total Sent</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-blue-100 bg-blue-50/50">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Clock className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-blue-600">
                                {history.length > 0
                                    ? new Date(history[0]?.sent_at).toLocaleDateString()
                                    : 'Never'
                                }
                            </p>
                            <p className="text-xs text-gray-500">Last Sent</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Send Notification Form */}
                <Card className="border-gray-100">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Send className="h-5 w-5 text-orange-500" />
                            Send New Notification
                        </CardTitle>
                        <CardDescription>
                            Compose and send a push notification to all subscribers
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">
                                Title <span className="text-red-500">*</span>
                            </label>
                            <Input
                                placeholder="e.g., New Awardees Announced!"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                maxLength={50}
                            />
                            <p className="text-xs text-gray-400">{title.length}/50 characters</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">
                                Message <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                className="w-full border rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                placeholder="Write your notification message..."
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                rows={4}
                                maxLength={200}
                            />
                            <p className="text-xs text-gray-400">{body.length}/200 characters</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">
                                Click URL (optional)
                            </label>
                            <Input
                                placeholder="/"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                            />
                            <p className="text-xs text-gray-400">Where users go when they click the notification</p>
                        </div>

                        {/* Preview */}
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                            <p className="text-xs font-medium text-gray-500 mb-2">Preview</p>
                            <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 flex gap-3">
                                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                                    <Bell className="h-5 w-5 text-orange-600" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-semibold text-gray-900 text-sm truncate">
                                        {title || 'Notification Title'}
                                    </p>
                                    <p className="text-gray-600 text-sm line-clamp-2">
                                        {body || 'Your notification message will appear here...'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button
                                variant="outline"
                                onClick={previewNotification}
                                disabled={isSending}
                                className="flex-1 gap-2"
                            >
                                <Bell className="h-4 w-4" />
                                Test Preview
                            </Button>
                            <Button
                                onClick={sendNotification}
                                disabled={isSending || !title.trim() || !body.trim()}
                                className="flex-1 bg-orange-500 hover:bg-orange-600 gap-2"
                            >
                                {isSending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                                Send to All
                            </Button>
                        </div>

                        {subscriberCount === 0 && (
                            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg text-sm">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>No subscribers yet. Users need to enable notifications first.</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* History */}
                <Card className="border-gray-100">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <History className="h-5 w-5 text-gray-500" />
                            Recent Notifications
                        </CardTitle>
                        <CardDescription>
                            Last 10 notifications sent
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {history.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <Bell className="h-12 w-12 mx-auto mb-2 text-gray-200" />
                                <p>No notifications sent yet</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {history.map((item) => (
                                    <div
                                        key={item.id}
                                        className="p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium text-gray-900 text-sm truncate">
                                                    {item.title}
                                                </p>
                                                <p className="text-gray-500 text-xs line-clamp-1 mt-0.5">
                                                    {item.body}
                                                </p>
                                            </div>
                                            <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${item.status === 'sent'
                                                    ? 'bg-green-100 text-green-700'
                                                    : item.status === 'failed'
                                                        ? 'bg-red-100 text-red-700'
                                                        : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                {item.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                                            <span className="flex items-center gap-1">
                                                <Users className="h-3 w-3" />
                                                {item.recipient_count} recipients
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {new Date(item.sent_at).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Info Box */}
            <Card className="border-blue-100 bg-blue-50/50">
                <CardContent className="p-4">
                    <div className="flex gap-3">
                        <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                        <div className="text-sm">
                            <p className="font-medium text-blue-900 mb-1">How Push Notifications Work</p>
                            <ul className="text-blue-700 space-y-1 text-xs">
                                <li>• Users must opt-in to receive notifications via the popup on your site</li>
                                <li>• Notifications work even when users aren't on your website</li>
                                <li>• Keep messages short and actionable for best engagement</li>
                                <li>• Avoid sending too many notifications to prevent unsubscribes</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
