-- Allow 10 MiB source spreadsheets for the private awardee-import staging bucket.
update storage.buckets
set file_size_limit = 10485760
where id = 'awardee-import-staging';
