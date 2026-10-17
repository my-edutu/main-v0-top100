export type BotStatus = {
  connected: boolean; knowledge_enabled: boolean; groq_enabled: boolean; memory_enabled: boolean;
  test_group_configured: boolean; reply_policy: string; worker_queue: number;
}
export type KnowledgeEntry = {
  id: string; title: string; content?: string; audience: 'admin_only' | 'members';
  status: 'draft' | 'published' | 'retired'; active?: boolean; effective_at: string;
  expires_at: string | null; superseded_at: string | null; replaces: string | null;
  source_url: string | null; filename: string | null; created_by: string; created_at: string;
  published_by: string | null; published_at: string | null;
  audit?: { action: string; actor: string; at: string }[];
}
export type Announcement = {
  id: string; title: string; content: string; target: string;
  status: 'draft' | 'sending' | 'sent' | 'unconfirmed'; created_by: string; created_at: number;
  sent_by: string | null; sent_at: number | null; audit?: { action: string; actor: string; at: number }[];
}
export type AnnouncementPreview = Announcement & { preview_token: string; preview_expires_at: number }
