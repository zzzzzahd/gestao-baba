-- ============================================================
-- MODO TORNEIO STANDALONE — substitui torneio vinculado ao baba
-- Rode este arquivo INTEIRO no SQL Editor do Supabase
-- ============================================================

-- Remove schema antigo (vinculado ao baba)
drop function if exists public.record_tournament_result(uuid, int, int);
drop function if exists public.generate_bracket(uuid);
drop table if exists public.tournament_matches cascade;
drop table if exists public.tournaments cascade;

-- 1) TORNEIOS
create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sport text not null default 'futebol',
  format text not null check (format in ('knockout','round_robin')),
  status text not null default 'in_progress' check (status in ('in_progress','finished')),
  config jsonb not null default '{
    "periods": 2,
    "period_minutes": 25,
    "interval_minutes": 5,
    "extra_time": false,
    "penalties": true
  }'::jsonb,
  champion_team_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.tournaments to authenticated;
grant all on public.tournaments to service_role;
alter table public.tournaments enable row level security;

create policy "tournaments_select_own" on public.tournaments
  for select to authenticated using (auth.uid() = user_id);
create policy "tournaments_insert_own" on public.tournaments
  for insert to authenticated with check (auth.uid() = user_id);
create policy "tournaments_update_own" on public.tournaments
  for update to authenticated using (auth.uid() = user_id);
create policy "tournaments_delete_own" on public.tournaments
  for delete to authenticated using (auth.uid() = user_id);

-- 2) TIMES DO TORNEIO
create table public.tournament_teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text not null,
  seed int not null,
  created_at timestamptz not null default now()
);

create index idx_tournament_teams_tid on public.tournament_teams(tournament_id);

grant select, insert, update, delete on public.tournament_teams to authenticated;
grant all on public.tournament_teams to service_role;
alter table public.tournament_teams enable row level security;

create policy "tt_select_own" on public.tournament_teams
  for select to authenticated using (
    exists (select 1 from public.tournaments t where t.id = tournament_id and t.user_id = auth.uid())
  );
create policy "tt_write_own" on public.tournament_teams
  for all to authenticated using (
    exists (select 1 from public.tournaments t where t.id = tournament_id and t.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.tournaments t where t.id = tournament_id and t.user_id = auth.uid())
  );

-- 3) PARTIDAS DO TORNEIO
create table public.tournament_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  round int not null,
  match_index int not null,
  team_a_id uuid references public.tournament_teams(id) on delete set null,
  team_b_id uuid references public.tournament_teams(id) on delete set null,
  score_a int,
  score_b int,
  penalties_a int,
  penalties_b int,
  winner_team_id uuid references public.tournament_teams(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','playing','finished')),
  next_match_id uuid references public.tournament_matches(id) on delete set null,
  next_slot text check (next_slot in ('a','b')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tm_tid on public.tournament_matches(tournament_id);
create index idx_tm_round on public.tournament_matches(tournament_id, round);

grant select, insert, update, delete on public.tournament_matches to authenticated;
grant all on public.tournament_matches to service_role;
alter table public.tournament_matches enable row level security;

create policy "tm_select_own" on public.tournament_matches
  for select to authenticated using (
    exists (select 1 from public.tournaments t where t.id = tournament_id and t.user_id = auth.uid())
  );
create policy "tm_write_own" on public.tournament_matches
  for all to authenticated using (
    exists (select 1 from public.tournaments t where t.id = tournament_id and t.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.tournaments t where t.id = tournament_id and t.user_id = auth.uid())
  );

-- 4) ESTATÍSTICAS POR JOGADOR/PARTIDA
create table public.tournament_player_stats (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  match_id uuid not null references public.tournament_matches(id) on delete cascade,
  team_id uuid not null references public.tournament_teams(id) on delete cascade,
  player_name text not null,
  goals int not null default 0,
  assists int not null default 0,
  yellow_cards int not null default 0,
  red_cards int not null default 0,
  fouls int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_tps_tid on public.tournament_player_stats(tournament_id);
create index idx_tps_match on public.tournament_player_stats(match_id);

grant select, insert, update, delete on public.tournament_player_stats to authenticated;
grant all on public.tournament_player_stats to service_role;
alter table public.tournament_player_stats enable row level security;

create policy "tps_select_own" on public.tournament_player_stats
  for select to authenticated using (
    exists (select 1 from public.tournaments t where t.id = tournament_id and t.user_id = auth.uid())
  );
create policy "tps_write_own" on public.tournament_player_stats
  for all to authenticated using (
    exists (select 1 from public.tournaments t where t.id = tournament_id and t.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.tournaments t where t.id = tournament_id and t.user_id = auth.uid())
  );

-- 5) VIEW DE RANKING AGREGADO
create or replace view public.tournament_rankings as
select
  tournament_id,
  player_name,
  team_id,
  sum(goals)        as goals,
  sum(assists)      as assists,
  sum(yellow_cards) as yellow_cards,
  sum(red_cards)    as red_cards,
  sum(fouls)        as fouls
from public.tournament_player_stats
group by tournament_id, player_name, team_id;

grant select on public.tournament_rankings to authenticated;
