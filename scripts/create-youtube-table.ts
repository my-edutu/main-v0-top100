// Script to create the youtube_videos table
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Please check your .env.local file.');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const createTableSQL = `
-- Create youtube_videos table
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

-- Create policies
DO $$ BEGIN
  create policy "Public youtube videos" on public.youtube_videos
    for select using (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  create policy "Service manages youtube videos" on public.youtube_videos
    for all using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
`;

async function createTable() {
  console.log('🔧 Creating youtube_videos table...\n');

  try {
    const { error } = await supabase.rpc('exec_sql', { sql: createTableSQL });

    if (error) {
      // Try alternative approach - direct query
      console.log('Trying direct SQL execution...');

      const queries = createTableSQL.split(';').filter(q => q.trim());

      for (const query of queries) {
        if (query.trim()) {
          const { error: queryError } = await supabase.rpc('exec_sql', {
            sql: query + ';'
          });

          if (queryError && !queryError.message.includes('already exists')) {
            console.error('❌ Error executing query:', queryError.message);
          }
        }
      }
    }

    console.log('✅ Table created successfully!');
    console.log('Now you can run: npx tsx scripts/migrate-youtube-videos.ts');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Please run this SQL manually in Supabase SQL Editor:\n');
    console.log(createTableSQL);
  }
}

createTable();
