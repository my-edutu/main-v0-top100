-- Keep signup compatible with the legacy production profiles table, where
-- user_id is a required duplicate of the canonical profile id.
alter table public.profiles add column if not exists user_id uuid;
update public.profiles set user_id = id where user_id is null;
alter table public.profiles alter column user_id set not null;
create unique index if not exists profiles_user_id_key on public.profiles (user_id);

-- Existing codes retain their one-use behavior. New timed codes can be reused
-- until expires_at; the server never decrements their uses_left counter.
alter table public.access_codes
  add column if not exists redemption_mode text not null default 'single_use';

alter table public.access_codes
  drop constraint if exists access_codes_redemption_mode_check;

alter table public.access_codes
  add constraint access_codes_redemption_mode_check
  check (redemption_mode in ('single_use', 'time_limited'));

comment on column public.access_codes.redemption_mode is
  'single_use is consumed by one successful signup; time_limited remains reusable until expires_at.';
