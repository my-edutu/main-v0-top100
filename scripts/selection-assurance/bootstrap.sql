-- CI-only minimal Supabase-compatible scaffolding. Never run in a hosted project.
CREATE ROLE anon NOINHERIT;
CREATE ROLE authenticated NOINHERIT;
CREATE ROLE service_role NOINHERIT BYPASSRLS;
CREATE SCHEMA auth;
CREATE SCHEMA storage;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE TABLE public.profiles(id uuid PRIMARY KEY,role text NOT NULL);
CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
GRANT USAGE ON SCHEMA public,auth,storage TO service_role;
GRANT SELECT,UPDATE ON public.profiles TO service_role;
INSERT INTO auth.users VALUES
 ('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002'),('00000000-0000-4000-8000-000000000003');
INSERT INTO public.profiles VALUES
 ('00000000-0000-4000-8000-000000000001','admin'),('00000000-0000-4000-8000-000000000002','admin'),('00000000-0000-4000-8000-000000000003','user');
