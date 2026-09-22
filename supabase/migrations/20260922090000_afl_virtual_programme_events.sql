-- Editable Africa Future Leaders October 2026 programme support.

alter table public.events
  add column if not exists programme_label text,
  add column if not exists session_number integer,
  add column if not exists learning_outcomes jsonb not null default '[]'::jsonb,
  add column if not exists timezone text not null default 'Africa/Lagos',
  add column if not exists reminder_minutes integer,
  add column if not exists speaker_id uuid;

alter table public.events
  drop constraint if exists events_reminder_minutes_check;

alter table public.events
  add constraint events_reminder_minutes_check
  check (reminder_minutes is null or reminder_minutes in (15, 30, 60, 1440));

create table if not exists public.programme_speakers (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  portrait_url text,
  role text,
  organisation text,
  biography text,
  website_url text,
  linkedin_url text,
  social_url text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

do $$ begin
  alter table public.events
    add constraint events_speaker_id_fkey
    foreign key (speaker_id) references public.programme_speakers(id) on delete set null;
exception when duplicate_object then null; end $$;

create index if not exists events_programme_session_idx on public.events (programme_label, session_number);
create index if not exists events_speaker_id_idx on public.events (speaker_id);
create index if not exists programme_speakers_status_idx on public.programme_speakers (status);

create or replace function public.handle_programme_speaker_updated()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_programme_speaker_updated on public.programme_speakers;
create trigger on_programme_speaker_updated
  before update on public.programme_speakers
  for each row execute function public.handle_programme_speaker_updated();

alter table public.programme_speakers enable row level security;

do $$ begin
  create policy "Published programme speakers" on public.programme_speakers
    for select using (status = 'published');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Service manages programme speakers" on public.programme_speakers
    for all using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.programme_speakers;
exception
  when duplicate_object then null;
  when others then
    if SQLSTATE = '42704' then null;
    else raise;
    end if;
end $$;
