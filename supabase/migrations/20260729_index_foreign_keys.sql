-- 20260729_index_foreign_keys.sql
-- unindexed_foreign_keys: every FK below had no covering index, so each parent
-- delete forced a sequential scan of the child table to enforce the constraint,
-- and joins across the FK could not use an index. Idempotent.
--
-- Driven off pg_constraint rather than a hard-coded list, because three of the
-- affected tables (notification_history, support_tickets, support_messages)
-- exist in the live project but have no CREATE TABLE anywhere in this repo, so
-- naming them directly would break a fresh SETUP-ALL run.

do $$
declare fk record;
begin
  for fk in
    select c.conrelid, c.conrelid::regclass::text as tbl, c.conname,
      (select string_agg(quote_ident(a.attname), ', ' order by k.ord)
       from unnest(c.conkey) with ordinality k(attnum, ord)
       join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum) as cols
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where c.contype = 'f'
      and n.nspname = 'public'
      and not exists (
        select 1 from pg_index i
        where i.indrelid = c.conrelid
          and (i.indkey::int2[])[0:array_length(c.conkey, 1) - 1] = c.conkey
      )
  loop
    execute format(
      'create index if not exists %I on %s (%s)',
      'idx_' || fk.conname, fk.tbl, fk.cols
    );
  end loop;
end $$;
