-- Fresh databases can enforce identity immediately. A populated deployment
-- with duplicates must reach the subsequent transactional ownership repair.
do $$
begin
  if not exists (
    select 1 from public.team_awardees where is_active and public_awardee_id is not null
    group by team_id, public_awardee_id having count(*) > 1
  ) then
    create unique index if not exists team_awardees_active_public_id_uidx
      on public.team_awardees (team_id, public_awardee_id)
      where is_active and public_awardee_id is not null;
  else
    raise notice 'Duplicate worklist identities found; the ownership repair migration will archive them before enforcing uniqueness.';
  end if;
end;
$$;
