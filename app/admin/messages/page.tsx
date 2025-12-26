'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Mail,
    Inbox,
    CheckCircle2,
    Clock,
    Trash2,
    Eye,
    Reply,
    Search,
    Filter,
    RefreshCw,
    MailOpen,
    Building2,
    User,
    Calendar,
    ExternalLink
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Message {
    id: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    type: 'partnership' | 'contact' | 'general';
    status: 'unread' | 'read' | 'replied';
    created_at: string;
    updated_at?: string;
}

export default function AdminMessagesPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read' | 'replied'>('all');

    const fetchMessages = async () => {
        setIsLoading(true);
        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setMessages(data || []);
        } catch (error) {
            console.error('Error fetching messages:', error);
            toast.error('Failed to load messages');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
    }, []);

    const markAsRead = async (messageId: string) => {
        try {
            const supabase = createClient();
            const { error } = await supabase
                .from('messages')
                .update({ status: 'read' })
                .eq('id', messageId);

            if (error) throw error;

            setMessages(msgs =>
                msgs.map(m => m.id === messageId ? { ...m, status: 'read' } : m)
            );
            if (selectedMessage?.id === messageId) {
                setSelectedMessage({ ...selectedMessage, status: 'read' });
            }
        } catch (error) {
            console.error('Error updating message:', error);
        }
    };

    const deleteMessage = async (messageId: string) => {
        if (!confirm('Are you sure you want to delete this message?')) return;

        try {
            const supabase = createClient();
            const { error } = await supabase
                .from('messages')
                .delete()
                .eq('id', messageId);

            if (error) throw error;

            setMessages(msgs => msgs.filter(m => m.id !== messageId));
            if (selectedMessage?.id === messageId) {
                setSelectedMessage(null);
            }
            toast.success('Message deleted');
        } catch (error) {
            console.error('Error deleting message:', error);
            toast.error('Failed to delete message');
        }
    };

    const handleReply = (email: string, subject: string) => {
        window.open(`mailto:${email}?subject=Re: ${subject}`, '_blank');
    };

    const filteredMessages = messages.filter(msg => {
        const matchesSearch =
            msg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            msg.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            msg.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            msg.message.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === 'all' || msg.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const unreadCount = messages.filter(m => m.status === 'unread').length;

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'partnership':
                return <Building2 className="h-4 w-4 text-orange-500" />;
            case 'contact':
                return <User className="h-4 w-4 text-blue-500" />;
            default:
                return <Mail className="h-4 w-4 text-gray-500" />;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'partnership':
                return 'Partnership';
            case 'contact':
                return 'Contact';
            default:
                return 'General';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Mail className="h-6 w-6 text-orange-500" />
                        Messages
                        {unreadCount > 0 && (
                            <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                {unreadCount} new
                            </span>
                        )}
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Partnership inquiries and contact messages
                    </p>
                </div>
                <Button
                    variant="outline"
                    onClick={fetchMessages}
                    disabled={isLoading}
                    className="gap-2"
                >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="border-gray-100">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                            <Inbox className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{messages.length}</p>
                            <p className="text-xs text-gray-500">Total</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-orange-100 bg-orange-50/50">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                            <Mail className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-orange-600">{unreadCount}</p>
                            <p className="text-xs text-gray-500">Unread</p>
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
                                {messages.filter(m => m.status === 'replied').length}
                            </p>
                            <p className="text-xs text-gray-500">Replied</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-blue-100 bg-blue-50/50">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-blue-600">
                                {messages.filter(m => m.type === 'partnership').length}
                            </p>
                            <p className="text-xs text-gray-500">Partnership</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Message List */}
                <div className="lg:col-span-1 space-y-4">
                    {/* Search & Filter */}
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search messages..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                            className="px-3 py-2 border rounded-lg text-sm bg-white"
                        >
                            <option value="all">All</option>
                            <option value="unread">Unread</option>
                            <option value="read">Read</option>
                            <option value="replied">Replied</option>
                        </select>
                    </div>

                    {/* Messages */}
                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                        {isLoading ? (
                            <div className="text-center py-8 text-gray-500">
                                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                                Loading messages...
                            </div>
                        ) : filteredMessages.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <Inbox className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                                <p>No messages found</p>
                            </div>
                        ) : (
                            filteredMessages.map((msg) => (
                                <button
                                    key={msg.id}
                                    onClick={() => {
                                        setSelectedMessage(msg);
                                        if (msg.status === 'unread') {
                                            markAsRead(msg.id);
                                        }
                                    }}
                                    className={`w-full text-left p-3 rounded-lg border transition-all ${selectedMessage?.id === msg.id
                                            ? 'border-orange-300 bg-orange-50'
                                            : msg.status === 'unread'
                                                ? 'border-orange-200 bg-orange-50/50 hover:bg-orange-50'
                                                : 'border-gray-100 bg-white hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`mt-1 ${msg.status === 'unread' ? 'text-orange-500' : 'text-gray-400'}`}>
                                            {msg.status === 'unread' ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`font-medium text-sm truncate ${msg.status === 'unread' ? 'text-gray-900' : 'text-gray-600'}`}>
                                                    {msg.name}
                                                </span>
                                                {getTypeIcon(msg.type)}
                                            </div>
                                            <p className="text-xs text-gray-500 truncate">
                                                {msg.subject || msg.message.slice(0, 50)}
                                            </p>
                                            <p className="text-[10px] text-gray-400 mt-1">
                                                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Message Detail */}
                <div className="lg:col-span-2">
                    {selectedMessage ? (
                        <Card className="border-gray-100">
                            <CardHeader className="border-b border-gray-100">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${selectedMessage.type === 'partnership'
                                                    ? 'bg-orange-100 text-orange-700'
                                                    : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {getTypeLabel(selectedMessage.type)}
                                            </span>
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${selectedMessage.status === 'unread'
                                                    ? 'bg-orange-100 text-orange-700'
                                                    : selectedMessage.status === 'replied'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                {selectedMessage.status.charAt(0).toUpperCase() + selectedMessage.status.slice(1)}
                                            </span>
                                        </div>
                                        <CardTitle className="text-lg">
                                            {selectedMessage.subject || 'No Subject'}
                                        </CardTitle>
                                        <CardDescription className="mt-1">
                                            From: <strong>{selectedMessage.name}</strong> ({selectedMessage.email})
                                        </CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleReply(selectedMessage.email, selectedMessage.subject || '')}
                                            className="gap-1"
                                        >
                                            <Reply className="h-4 w-4" />
                                            Reply
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => deleteMessage(selectedMessage.id)}
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {new Date(selectedMessage.created_at).toLocaleString()}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="prose prose-sm max-w-none">
                                    <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                                        {selectedMessage.message}
                                    </p>
                                </div>

                                {/* Quick Actions */}
                                <div className="mt-6 pt-4 border-t border-gray-100">
                                    <div className="flex gap-2">
                                        <Button
                                            variant="default"
                                            size="sm"
                                            onClick={() => handleReply(selectedMessage.email, selectedMessage.subject || '')}
                                            className="bg-orange-500 hover:bg-orange-600 gap-2"
                                        >
                                            <Reply className="h-4 w-4" />
                                            Reply via Email
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => window.open(`mailto:${selectedMessage.email}`, '_blank')}
                                            className="gap-1"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                            Open in Email Client
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="border-gray-100 h-full flex items-center justify-center">
                            <CardContent className="text-center py-16">
                                <Inbox className="h-16 w-16 mx-auto mb-4 text-gray-200" />
                                <p className="text-gray-500">Select a message to view details</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
