-- Persist each approved member's one-time WhatsApp group assignment and
-- announce the new Groups experience in the member dashboard inbox.

create table if not exists public.whatsapp_group_assignments (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  group_key text not null check (group_key in ('group-1', 'group-2', 'group-3')),
  assigned_at timestamptz not null default now()
);

alter table public.whatsapp_group_assignments enable row level security;

revoke all on table public.whatsapp_group_assignments from public, anon, authenticated;
grant all on table public.whatsapp_group_assignments to service_role;

insert into public.user_notifications (
  user_id,
  title,
  body,
  category,
  cta_label,
  cta_url,
  campaign_id,
  delivered_at,
  metadata
)
select
  profile.id,
  'Your AFL WhatsApp community is here',
  'Connect with fellow Africa Future Leaders. Open Groups to discover your assigned WhatsApp group.',
  'admin',
  'Discover your group',
  '/dashboard/discover/groups',
  'afl-whatsapp-member-groups',
  now(),
  jsonb_build_object(
    'audience', 'approved',
    'broadcast_id', 'afl-whatsapp-member-groups',
    'campaign_id', 'afl-whatsapp-member-groups'
  )
from public.profiles profile
where profile.role = 'user'
  and profile.membership_status = 'approved'
on conflict (user_id, campaign_id) do nothing;
