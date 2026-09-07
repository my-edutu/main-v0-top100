'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, Bell, CheckCircle2, Clock, History, Loader2, Send, ShieldCheck, Users } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/utils/supabase/client'
import PageHeader from '../components/PageHeader'

interface NotificationHistory {
  id: string
  title: string
  body: string
  sent_at: string
  recipient_count: number
  status: 'sent' | 'failed' | 'pending'
}

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [url, setUrl] = useState('/')
  const [isSending, setIsSending] = useState(false)
  const [history, setHistory] = useState<NotificationHistory[]>([])
  const [subscriberCount, setSubscriberCount] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient()
        const { data: historyData } = await supabase
          .from('notification_history')
          .select('*')
          .order('sent_at', { ascending: false })
          .limit(10)

        if (historyData) setHistory(historyData)

        const { count } = await supabase
          .from('push_subscriptions')
          .select('*', { count: 'exact', head: true })

        setSubscriberCount(count || 0)
      } catch (error) {
        console.log('Error fetching data:', error)
      }
    }

    fetchData()
  }, [])

  const sendNotification = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Please fill in title and message')
      return
    }

    setIsSending(true)

    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, url }),
      })
      const data = await response.json()

      if (!response.ok) throw new Error(data.error || 'Failed to send notification')

      toast.success(`Notification sent to ${data.sentCount || 0} subscribers!`)
      setHistory((current) => [{
        id: crypto.randomUUID(),
        title,
        body,
        sent_at: new Date().toISOString(),
        recipient_count: data.sentCount || 0,
        status: 'sent',
      }, ...current])
      setTitle('')
      setBody('')
      setUrl('/')
    } catch (error) {
      console.error('Error sending notification:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to send notification')
    } finally {
      setIsSending(false)
    }
  }

  const previewNotification = () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Please fill in title and message')
      return
    }

    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/Top100 Africa Future leaders Logo .png' })
      toast.success('Preview notification shown!')
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          new Notification(title, { body, icon: '/Top100 Africa Future leaders Logo .png' })
        }
      })
    } else {
      toast.error('Notifications are blocked. Enable them in browser settings.')
    }
  }

  const queuedCount = history.filter((item) => item.status === 'sent').length
  const lastSentAt = history[0]?.sent_at

  return (
    <div className="notifications-admin-page space-y-6 pb-4">
      <PageHeader
        eyebrow="Member communications"
        title="Push notifications"
        description="Compose concise updates for members who have opted in to browser notifications."
      />

      <section className="space-y-3" aria-labelledby="notification-overview-heading">
        <div className="notification-section-heading">
          <div><p className="admin-kicker">Delivery overview</p><h2 id="notification-overview-heading">Broadcast activity</h2></div>
          <p>Recent activity covers the latest 10 broadcasts.</p>
        </div>
        <div className="notification-metrics">
          <article className="notification-metric"><span><Users aria-hidden="true" /></span><div><strong>{subscriberCount}</strong><p>Subscribers</p><small>Current opted-in audience</small></div></article>
          <article className="notification-metric"><span><History aria-hidden="true" /></span><div><strong>{history.length}</strong><p>Recent broadcasts</p><small>Latest records loaded</small></div></article>
          <article className="notification-metric"><span><CheckCircle2 aria-hidden="true" /></span><div><strong>{queuedCount}</strong><p>Queued</p><small>Successful recent sends</small></div></article>
          <article className="notification-metric notification-metric-date">
            <span><Clock aria-hidden="true" /></span>
            <div><strong>{lastSentAt ? new Date(lastSentAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}</strong><p>Last broadcast</p><small>{lastSentAt ? new Date(lastSentAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : 'No send recorded'}</small></div>
          </article>
        </div>
      </section>

      <section className="notification-workspace" aria-label="Compose and review push notifications">
        <div className="notification-composer admin-panel">
          <header className="notification-panel-header">
            <div><p className="admin-kicker">New broadcast</p><h2><Send aria-hidden="true" />Compose notification</h2><p>Keep the message direct, useful, and easy to act on.</p></div>
            <span className="notification-audience-badge"><Users aria-hidden="true" />{subscriberCount} opted in</span>
          </header>
          <div className="notification-audience-note">
            <ShieldCheck aria-hidden="true" />
            <p><strong>Audience:</strong> this sends to every current push subscriber. Review the preview before broadcasting.</p>
          </div>

          <form className="notification-form" onSubmit={(event) => { event.preventDefault(); void sendNotification() }}>
            <div className="notification-field">
              <div className="notification-label-row"><label htmlFor="notif-title">Title <span aria-hidden="true">*</span></label><span>{title.length}/50</span></div>
              <Input id="notif-title" placeholder="e.g. New awardees announced" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={50} required />
              <p>Lead with the one thing members need to know.</p>
            </div>
            <div className="notification-field">
              <div className="notification-label-row"><label htmlFor="notif-body">Message <span aria-hidden="true">*</span></label><span>{body.length}/200</span></div>
              <textarea id="notif-body" placeholder="Write a short, actionable message…" value={body} onChange={(event) => setBody(event.target.value)} rows={5} maxLength={200} required />
              <p>Short messages are easier to read from a lock screen.</p>
            </div>
            <div className="notification-field">
              <label htmlFor="notif-url">Click destination <span>(optional)</span></label>
              <Input id="notif-url" placeholder="/dashboard" value={url} onChange={(event) => setUrl(event.target.value)} />
              <p>Use a site path such as /dashboard/discover or a complete URL.</p>
            </div>

            <div className="notification-preview" aria-label="Notification preview">
              <div className="notification-preview-heading"><span>Preview</span><small>Browser notification</small></div>
              <div className="notification-preview-card">
                <span><Bell aria-hidden="true" /></span>
                <div><strong>{title || 'Your notification title'}</strong><p>{body || 'Your message will appear here before you send it.'}</p><small>Top100 Africa Future Leaders</small></div>
              </div>
            </div>

            {subscriberCount === 0 ? <div className="notification-zero-audience" role="status"><AlertCircle aria-hidden="true" /><span>No subscribers yet. Members must enable browser notifications before they can receive a broadcast.</span></div> : null}

            <div className="notification-form-actions">
              <Button type="button" variant="outline" onClick={previewNotification} disabled={isSending}><Bell className="h-4 w-4" />Test on this device</Button>
              <Button type="submit" disabled={isSending || !title.trim() || !body.trim()} className="admin-primary">
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {isSending ? 'Sending…' : `Send to ${subscriberCount} subscriber${subscriberCount === 1 ? '' : 's'}`}
              </Button>
            </div>
          </form>
        </div>

        <div className="notification-history admin-panel">
          <header className="notification-panel-header">
            <div><p className="admin-kicker">Delivery log</p><h2><History aria-hidden="true" />Recent notifications</h2><p>The latest 10 broadcast records, newest first.</p></div>
          </header>
          {history.length === 0 ? (
            <div className="notification-history-empty">
              <span><Bell aria-hidden="true" /></span><p className="admin-kicker">Nothing sent</p><h3>No broadcasts yet</h3><p>Your recent notification history will appear here after the first send.</p>
            </div>
          ) : (
            <div className="notification-history-list">
              {history.map((item) => (
                <article key={item.id} className="notification-history-item">
                  <div className="notification-history-copy"><div><h3>{item.title}</h3><span className={`notification-status notification-status-${item.status}`}>{item.status}</span></div><p>{item.body}</p></div>
                  <dl>
                    <div><dt><Users aria-hidden="true" />Audience</dt><dd>{item.recipient_count} recipients</dd></div>
                    <div><dt><Clock aria-hidden="true" />Sent</dt><dd><time dateTime={item.sent_at}>{new Date(item.sent_at).toLocaleString()}</time></dd></div>
                  </dl>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <aside className="notification-guidance" aria-labelledby="notification-guidance-title">
        <span><AlertCircle aria-hidden="true" /></span>
        <div><p className="admin-kicker">Good broadcast practice</p><h2 id="notification-guidance-title">Send with purpose</h2><p>Members must opt in first. Use a clear title, one useful action, and a destination that matches the message. Avoid repeated broadcasts for the same update.</p></div>
      </aside>
    </div>
  )
}
