-- A public awardee should appear at most once in a team's active contact list.
-- Archived rows remain available for audit and can retain historical references.
create unique index if not exists team_awardees_active_public_id_uidx
  on public.team_awardees (team_id, public_awardee_id)
  where is_active and public_awardee_id is not null;
