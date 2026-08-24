-- O upsert do sorteio (e o auto-draw) grava draw_config; a coluna não existia
-- e o PostgREST respondia 400 em POST /draw_results?on_conflict=baba_id,draw_date.
ALTER TABLE public.draw_results
  ADD COLUMN IF NOT EXISTS draw_config jsonb;

COMMENT ON COLUMN public.draw_results.draw_config IS
  'Configuração usada no sorteio (playersPerTeam, strategy, etc.)';
