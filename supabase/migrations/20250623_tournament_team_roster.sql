-- Elenco por time: técnico + jogadores cadastrados na criação do torneio

alter table public.tournament_teams
  add column if not exists coach_name text;

create table if not exists public.tournament_team_players (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_id uuid not null references public.tournament_teams(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_ttp_team on public.tournament_team_players(team_id);
create index if not exists idx_ttp_tournament on public.tournament_team_players(tournament_id);

grant select, insert, update, delete on public.tournament_team_players to authenticated;
grant all on public.tournament_team_players to service_role;
alter table public.tournament_team_players enable row level security;

create policy "ttp_select_own" on public.tournament_team_players
  for select to authenticated using (
    exists (select 1 from public.tournaments t where t.id = tournament_id and t.user_id = auth.uid())
  );
create policy "ttp_write_own" on public.tournament_team_players
  for all to authenticated using (
    exists (select 1 from public.tournaments t where t.id = tournament_id and t.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.tournaments t where t.id = tournament_id and t.user_id = auth.uid())
  );
