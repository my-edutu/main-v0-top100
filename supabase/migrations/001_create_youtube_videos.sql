-- Create youtube_videos table and populate with initial data
-- Run this in Supabase SQL Editor

-- Create table
create table if not exists public.youtube_videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  video_id text not null unique,
  date text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Create index
create index if not exists youtube_videos_video_id_idx on public.youtube_videos (video_id);

-- Create update trigger function
create or replace function public.handle_youtube_updated()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger
drop trigger if exists on_youtube_updated on public.youtube_videos;
create trigger on_youtube_updated
  before update on public.youtube_videos
  for each row execute function public.handle_youtube_updated();

-- Enable RLS
alter table public.youtube_videos enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Public youtube videos" on public.youtube_videos;
drop policy if exists "Service manages youtube videos" on public.youtube_videos;

-- Create policies
create policy "Public youtube videos" on public.youtube_videos
  for select using (true);

create policy "Service manages youtube videos" on public.youtube_videos
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Insert initial videos (only if they don't exist)
insert into public.youtube_videos (video_id, title, description, date)
select '-gbPMU40-LQ', 'Leadership Summit 2024', 'Annual gathering of young African leaders discussing innovation and impact', 'March 2024'
where not exists (select 1 from public.youtube_videos where video_id = '-gbPMU40-LQ');

insert into public.youtube_videos (video_id, title, description, date)
select 'abSGdFZ3URU', 'Innovation Workshop', 'Interactive session on entrepreneurship and technology solutions', 'February 2024'
where not exists (select 1 from public.youtube_videos where video_id = 'abSGdFZ3URU');

insert into public.youtube_videos (video_id, title, description, date)
select 'dcKQs726FLI', 'Community Impact Forum', 'Showcasing community-driven projects across Africa', 'January 2024'
where not exists (select 1 from public.youtube_videos where video_id = 'dcKQs726FLI');

insert into public.youtube_videos (video_id, title, description, date)
select 'AJjsyO9ff8g', 'Awards Ceremony Highlights', 'Celebrating outstanding achievements of young African leaders', 'December 2023'
where not exists (select 1 from public.youtube_videos where video_id = 'AJjsyO9ff8g');

-- Verify the data
select 'Successfully created table and inserted ' || count(*)::text || ' videos' as status
from public.youtube_videos;
