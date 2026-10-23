-- Sorteio unificado (manual + automático)
-- 1) Padrão de suplentes do baba: antes só existia no wizard manual (estado local),
--    então o sorteio automático não tinha como saber se era "reserva" ou "incompleto".
ALTER TABLE public.babas
  ADD COLUMN IF NOT EXISTS draw_strategy text NOT NULL DEFAULT 'reserve';

DO $$ BEGIN
  ALTER TABLE public.babas
    ADD CONSTRAINT babas_draw_strategy_check CHECK (draw_strategy IN ('reserve','substitute'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON COLUMN public.babas.draw_strategy IS
  'Suplentes no sorteio: reserve (cada time ganha 1 reserva) | substitute (times incompletos). Lido pelo sorteio automático e pré-preenche o manual.';

-- 2) Cron do auto-draw: antes rodava "0 9-23 * * *" (UTC = 06h–20h em Bahia, só no minuto 0)
--    e a função só sorteava na janela de 30 min antes do jogo — jogo às 20h quase nunca
--    caía nessa janela. Agora roda a cada 5 min o dia todo; a função só age nos babas com
--    auto_draw_enabled e só quando chegou a hora (auto_draw_time), e é idempotente.
SELECT cron.unschedule('auto-draw-hourly')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-draw-hourly');

SELECT cron.schedule(
  'auto-draw-5min',
  '*/5 * * * *',
  $cron$
  SELECT net.http_post(
    url     := current_setting('app.supabase_url') || '/functions/v1/auto-draw',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret')
    ),
    body    := '{}'::jsonb
  );
  $cron$
);
