'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  Award,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Handshake,
  HeartHandshake,
  Inbox,
  Mail,
  MailOpen,
  Megaphone,
  RefreshCw,
  Reply,
  Search,
  Trash2,
  User,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/utils/supabase/client'
import PageHeader from '../components/PageHeader'

interface Message {
  id: string
  name: string
  email: string
  subject: string
  message: string
  type: 'awardee' | 'ambassador' | 'partnership' | 'volunteer' | 'contact' | 'general'
  status: 'unread' | 'read' | 'replied'
  created_at: string
  updated_at?: string
}

const typeLabels: Record<Message['type'], string> = {
  awardee: 'Awardee application',
  ambassador: 'Ambassador application',
  partnership: 'Partnership inquiry',
  volunteer: 'Volunteer interest',
  contact: 'Contact',
  general: 'General',
}

const typeTones: Record<Message['type'], string> = {
  awardee: 'message-type-awardee', ambassador: 'message-type-ambassador',
  partnership: 'message-type-partnership', volunteer: 'message-type-volunteer',
  contact: 'message-type-contact', general: 'message-type-general',
}

function TypeIcon({ type }: { type: Message['type'] }) {
  const Icon = type === 'awardee' ? Award
    : type === 'ambassador' ? Megaphone
      : type === 'partnership' ? Handshake
        : type === 'volunteer' ? HeartHandshake
          : type === 'contact' ? User : Mail

  return <Icon aria-hidden="true" />
}

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | Message['status']>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | Message['type']>('all')

  const fetchMessages = useCallback(async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from('messages').select('*').order('created_at', { ascending: false })
      if (error) throw error
      setMessages(data || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
      toast.error('Failed to load messages')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // This memoized loader owns the asynchronous state transitions for the external inbox.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMessages()
  }, [fetchMessages])

  const markAsRead = async (messageId: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase.from('messages').update({ status: 'read' }).eq('id', messageId)
      if (error) throw error

      setMessages((current) => current.map((message) => message.id === messageId ? { ...message, status: 'read' } : message))
      setSelectedMessage((current) => current?.id === messageId ? { ...current, status: 'read' } : current)
    } catch (error) {
      console.error('Error updating message:', error)
      toast.error('Failed to mark message as read')
    }
  }

  const deleteMessage = async (messageId: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase.from('messages').delete().eq('id', messageId)
      if (error) throw error

      setMessages((current) => current.filter((message) => message.id !== messageId))
      setSelectedMessage((current) => current?.id === messageId ? null : current)
      toast.success('Message deleted')
    } catch (error) {
      console.error('Error deleting message:', error)
      toast.error('Failed to delete message')
    }
  }

  const handleReply = (email: string, subject: string) => {
    window.open(`mailto:${email}?subject=${encodeURIComponent(`Re: ${subject}`)}`, '_blank', 'noopener,noreferrer')
  }

  const normalizedSearch = searchQuery.trim().toLowerCase()
  const filteredMessages = useMemo(() => messages.filter((message) => {
    const matchesSearch = !normalizedSearch || [message.name, message.email, message.subject, message.message]
      .some((value) => value?.toLowerCase().includes(normalizedSearch))
    return matchesSearch && (statusFilter === 'all' || message.status === statusFilter) && (typeFilter === 'all' || message.type === typeFilter)
  }), [messages, normalizedSearch, statusFilter, typeFilter])

  const unreadCount = messages.filter((message) => message.status === 'unread').length
  const repliedCount = messages.filter((message) => message.status === 'replied').length
  const applicationCount = messages.filter((message) => ['awardee', 'ambassador', 'partnership', 'volunteer'].includes(message.type)).length
  const hasFilters = Boolean(normalizedSearch || statusFilter !== 'all' || typeFilter !== 'all')

  return (
    <div className="messages-admin-page space-y-6 pb-4">
      <PageHeader
        eyebrow="Shared inbox"
        title="Applications & messages"
        description="Review awardee, ambassador, partnership, volunteer, and contact submissions."
        actions={(
          <Button variant="outline" onClick={fetchMessages} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        )}
      />

      <section className="space-y-3" aria-labelledby="message-overview-heading">
        <div className="message-section-heading">
          <div><p className="admin-kicker">Response pulse</p><h2 id="message-overview-heading">Inbox overview</h2></div>
          <p>{unreadCount > 0 ? `${unreadCount} conversation${unreadCount === 1 ? '' : 's'} need attention.` : 'The inbox is caught up.'}</p>
        </div>
        <div className="message-metrics">
          <article className="message-metric"><span><Inbox aria-hidden="true" /></span><div><strong>{messages.length}</strong><p>All submissions</p><small>Across every request type</small></div></article>
          <article className="message-metric"><span><Mail aria-hidden="true" /></span><div><strong>{unreadCount}</strong><p>Unread</p><small>Needs a first review</small></div></article>
          <article className="message-metric"><span><CheckCircle2 aria-hidden="true" /></span><div><strong>{repliedCount}</strong><p>Replied</p><small>Response recorded</small></div></article>
          <article className="message-metric"><span><Award aria-hidden="true" /></span><div><strong>{applicationCount}</strong><p>Applications</p><small>Awardee, partner or volunteer</small></div></article>
        </div>
      </section>

      <section className="message-workspace" aria-label="Applications and messages inbox">
        <div className="message-master admin-panel">
          <div className="message-toolbar">
            <div><p className="admin-kicker">Inbox</p><h2>{filteredMessages.length} {filteredMessages.length === 1 ? 'conversation' : 'conversations'}</h2></div>
            <div className="message-filter-grid">
              <div className="message-search"><Search aria-hidden="true" /><Input aria-label="Search messages" placeholder="Search inbox" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} /></div>
              <select aria-label="Filter by type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}>
                <option value="all">All types</option><option value="awardee">Awardee</option><option value="ambassador">Ambassador</option><option value="partnership">Partnership</option><option value="volunteer">Volunteer</option><option value="contact">Contact</option><option value="general">General</option>
              </select>
              <select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
                <option value="all">All statuses</option><option value="unread">Unread</option><option value="read">Read</option><option value="replied">Replied</option>
              </select>
            </div>
          </div>

          <div className="message-list">
            {isLoading ? (
              <div className="message-list-state"><RefreshCw className="animate-spin" /><p>Loading inbox…</p></div>
            ) : filteredMessages.length === 0 ? (
              <div className="message-list-state"><Inbox /><h3>{hasFilters ? 'No matching messages' : 'Inbox empty'}</h3><p>{hasFilters ? 'Try another search, type, or status.' : 'New submissions will appear here.'}</p>{hasFilters ? <Button variant="outline" onClick={() => { setSearchQuery(''); setTypeFilter('all'); setStatusFilter('all') }}>Clear filters</Button> : null}</div>
            ) : filteredMessages.map((message) => (
              <button
                key={message.id}
                type="button"
                onClick={() => {
                  setSelectedMessage(message)
                  if (message.status === 'unread') void markAsRead(message.id)
                }}
                className={`message-list-item ${selectedMessage?.id === message.id ? 'is-selected' : ''} ${message.status === 'unread' ? 'is-unread' : ''}`}
                aria-pressed={selectedMessage?.id === message.id}
              >
                <span className="message-read-icon">{message.status === 'unread' ? <Mail aria-hidden="true" /> : <MailOpen aria-hidden="true" />}</span>
                <span className="message-list-copy">
                  <span className="message-sender"><strong>{message.name}</strong><span className={typeTones[message.type]}><TypeIcon type={message.type} />{typeLabels[message.type]}</span></span>
                  <span className="message-subject">{message.subject || message.message.slice(0, 80)}</span>
                  <time dateTime={message.created_at}>{formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}</time>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="message-detail admin-panel">
          {selectedMessage ? (
            <>
              <header className="message-detail-header">
                <div className="message-detail-title-row">
                  <div>
                    <div className="message-detail-badges"><span className={typeTones[selectedMessage.type]}>{typeLabels[selectedMessage.type]}</span><span className={`message-status-${selectedMessage.status}`}>{selectedMessage.status}</span></div>
                    <h2>{selectedMessage.subject || 'No subject'}</h2>
                    <p className="message-from"><span>From <strong>{selectedMessage.name}</strong></span><a href={`mailto:${selectedMessage.email}`}>{selectedMessage.email}</a></p>
                  </div>
                  <div className="message-detail-actions">
                    <Button variant="outline" onClick={() => handleReply(selectedMessage.email, selectedMessage.subject || '')}><Reply className="h-4 w-4" /> Reply</Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="outline" size="icon" aria-label="Delete message"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                      <AlertDialogContent className="bg-white">
                        <AlertDialogHeader><AlertDialogTitle>Delete this message?</AlertDialogTitle><AlertDialogDescription>This will permanently remove the message from {selectedMessage.name}. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMessage(selectedMessage.id)} className="bg-red-600 text-white hover:bg-red-700">Delete</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <time dateTime={selectedMessage.created_at}><Calendar aria-hidden="true" />{new Date(selectedMessage.created_at).toLocaleString()}</time>
              </header>
              <div className="message-body"><p>{selectedMessage.message}</p></div>
              <footer className="message-detail-footer">
                <Button className="admin-primary" onClick={() => handleReply(selectedMessage.email, selectedMessage.subject || '')}><Reply className="h-4 w-4" /> Reply via email</Button>
                <Button variant="outline" onClick={() => window.open(`mailto:${selectedMessage.email}`, '_blank', 'noopener,noreferrer')}><ExternalLink className="h-4 w-4" /> Open email client</Button>
              </footer>
            </>
          ) : (
            <div className="message-detail-empty"><span><Inbox aria-hidden="true" /></span><p className="admin-kicker">Conversation reader</p><h2>Select a message</h2><p>Choose a conversation from the inbox to review its details and reply.</p></div>
          )}
        </div>
      </section>
    </div>
  )
}
