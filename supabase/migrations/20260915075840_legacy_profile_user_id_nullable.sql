-- user_id is a legacy duplicate of profiles.id. Keep it populated from the
-- application when available, but do not let it block older signup releases.
alter table public.profiles alter column user_id drop not null;
