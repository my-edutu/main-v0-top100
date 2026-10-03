insert into storage.buckets (id, name, public, file_size_limit)
values ('awardee-import-staging', 'awardee-import-staging', false, 10485760)
on conflict (id) do update
  set public = false, file_size_limit = 10485760;
