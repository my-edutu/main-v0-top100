-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create awardees table
create table awardees (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  email text,
  country text,
  cgpa text,
  course text,
  bio text,
  year integer default 2024,
  image_url text,
  slug text unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create posts table
create table posts (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  slug text unique not null,
  content text not null,
  cover_image text,
  is_featured boolean default false,
  status text default 'draft', -- draft, published
  tags text[] default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create youtube_videos table
create table youtube_videos (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  video_id text not null,
  date text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach the trigger to our tables
CREATE TRIGGER handle_awardees_updated_at 
  BEFORE UPDATE ON awardees 
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_posts_updated_at 
  BEFORE UPDATE ON posts 
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_youtube_videos_updated_at 
  BEFORE UPDATE ON youtube_videos 
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE awardees ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_videos ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public access (adjust as needed for your security requirements)
CREATE POLICY "Allow public read access for awardees" ON awardees FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to manage awardees" ON awardees FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow public read access for posts" ON posts FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to manage posts" ON posts FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow public read access for youtube_videos" ON youtube_videos FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to manage youtube_videos" ON youtube_videos FOR ALL USING (auth.role() = 'authenticated');