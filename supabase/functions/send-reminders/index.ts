// supabase/functions/send-reminders/index.ts
// Fase 1.4 — Validação Zod + dedup via was_notified_today + timezone Bahia.
// Chamado pelo pg_cron a cada hora.

import { serve }        from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z }            from "npm:zod@3.22.4";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")              ?? "";
const SERVICE_ROLE  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET   = Deno.env.get("CRON_SECRET")               ?? "";
const SEND_PUSH_URL = SUPABASE_URL + "/functions/v1/send-push";

// Schema para chamadas manuais (cron não envia body, mas admite override de data p/ teste)
const BodySchema = z.object({
  force_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dry_run:    z.boolean().optional().default(false),
}).optional();

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

// Hora atual no fuso America/Bahia
const nowBahia = () =>
  new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bahia" }));

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const auth  = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token !== CRON_SECRET && token !== SERVICE_ROLE) {
    return json({ error: "Unauthorized" }, 401);
  }

  // Parse body opcional
  let body: z.infer<typeof BodySchema> = {};
  try {
    const raw = await req.json().catch(() => ({}));
    body      = BodySchema.parse(raw) ?? {};
  } catch (err) {
    return json({ error: "Payload inválido", detail: String(err) }, 400);
  }

  const { force_date, dry_run } = body ?? {};
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const now      = nowBahia();
  const results: string[] = [];

  // ── Helper: chamar send-push ──────────────────────────────────────────────
  async function sendPush(opts: {
    user_ids: string[];
    title:    string;
    body:     string;
    url?:     string;
    baba_id?: string;
    evt_type?: string;
    ref_id?:  string;
  }) {
    if (!opts.user_ids.length) return 0;
    if (dry_run) { results.push(`[DRY RUN] ${opts.evt_type} → ${opts.user_ids.length} users`); return 0; }
    const res = await fetch(SEND_PUSH_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${CRON_SECRET}` },
      body:    JSON.stringify(opts),
    });
    const data = await res.json().catch(() => ({}));
    return data.sent ?? 0;
  }

  // ── D-1: amanhã tem baba ─────────────────────────────────────────────────
  const tomorrow    = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = force_date ?? tomorrow.toISOString().split("T")[0];
  const tomorrowDow = tomorrow.getDay();

  const { data: babas } = await supabase
    .from("babas")
    .select("id, name, game_days_config, game_days, max_players");

  for (const baba of babas ?? []) {
    // Verificar se há jogo amanhã neste baba
    const configs = Array.isArray(baba.game_days_config) ? baba.game_days_config : [];
    const legacy  = Array.isArray(baba.game_days) ? baba.game_days : [];
    const days    = configs.length ? configs.map((c: any) => Number(c.day)) : legacy.map(Number);
    if (!days.includes(tomorrowDow)) continue;

    const { data: allPlayers } = await supabase
      .from("players")
      .select("id, user_id")
      .eq("baba_id", baba.id)
      .not("user_id", "is", null);

    const { data: confirmed } = await supabase
      .from("game_confirmations")
      .select("player_id")
      .eq("baba_id", baba.id)
      .eq("game_date", tomorrowStr);

    const confirmedSet = new Set((confirmed ?? []).map((c: any) => c.player_id));
    const unconfirmed  = (allPlayers ?? [])
      .filter(p => !confirmedSet.has(p.id) && p.user_id)
      .map(p => p.user_id as string);

    const n = await sendPush({
      user_ids: unconfirmed,
      title:    `⚽ Amanhã tem ${baba.name}!`,
      body:     "Confirma sua presença antes do prazo fechar.",
      url:      "/dashboard?tab=overview",
      baba_id:  baba.id,
      evt_type: "game_reminder_d1",
      ref_id:   baba.id, // ref = baba_id (único por baba por dia)
    });
    results.push(`D-1 [${baba.name}] ${n} enviados`);
  }

  // ── H-0.5: sorteio em 30 min ─────────────────────────────────────────────
  const in30     = new Date(now.getTime() + 30 * 60 * 1000);
  const todayStr = force_date ?? now.toISOString().split("T")[0];
  const hhmm     = `${String(in30.getHours()).padStart(2, "0")}:${String(in30.getMinutes()).padStart(2, "0")}`;

  for (const baba of babas ?? []) {
    const configs = Array.isArray(baba.game_days_config) ? baba.game_days_config : [];
    const hasGameNow = configs.some(
      (c: any) => c.time?.startsWith(hhmm) && Number(c.day) === now.getDay()
    );
    if (!hasGameNow) continue;

    const { data: confirmed30 } = await supabase
      .from("game_confirmations")
      .select("player_id, player:players(user_id)")
      .eq("baba_id", baba.id)
      .eq("game_date", todayStr)
      .eq("status", "confirmed");

    const userIds = (confirmed30 ?? [])
      .map((c: any) => c.player?.user_id)
      .filter(Boolean) as string[];

    const n = await sendPush({
      user_ids: userIds,
      title:    `🎲 Sorteio em 30min — ${baba.name}`,
      body:     "Os times serão sorteados em breve. Já está pronto?",
      url:      "/draw",
      baba_id:  baba.id,
      evt_type: "draw_soon",
      ref_id:   baba.id,
    });
    results.push(`H-0.5 [${baba.name}] ${n} enviados`);
  }

  // ── Pós-jogo: avaliar companheiros ────────────────────────────────────────
  const { data: finishedToday } = await supabase
    .from("matches")
    .select("id, baba_id, baba:babas(name)")
    .eq("status", "finished")
    .gte("updated_at", `${todayStr}T00:00:00`)
    .lte("updated_at", `${todayStr}T23:59:59`);

  for (const match of finishedToday ?? []) {
    const { data: mp } = await supabase
      .from("match_players")
      .select("player:players(user_id)")
      .eq("match_id", match.id);

    const userIds = (mp ?? [])
      .map((m: any) => m.player?.user_id)
      .filter(Boolean) as string[];

    const n = await sendPush({
      user_ids: userIds,
      title:    `⭐ Avalie seus craques — ${(match as any).baba?.name}`,
      body:     "A partida acabou! Avalie seus companheiros de baba.",
      url:      "/dashboard?tab=postgame",
      baba_id:  match.baba_id,
      evt_type: "rate_players",
      ref_id:   match.id,
    });
    results.push(`Pós-jogo [${match.id}] ${n} enviados`);
  }

  // ── D+14: inativo há 2 semanas (só às 10h) ───────────────────────────────
  if (now.getHours() === 10) {
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const twoWeeksStr = twoWeeksAgo.toISOString().split("T")[0];

    const { data: recentConfs } = await supabase
      .from("game_confirmations")
      .select("player:players(user_id)")
      .gte("game_date", twoWeeksStr);

    const activeIds = new Set(
      (recentConfs ?? []).map((c: any) => c.player?.user_id).filter(Boolean)
    );

    const { data: allConfs } = await supabase
      .from("game_confirmations")
      .select("player:players(user_id)")
      .lt("game_date", twoWeeksStr);

    const inactiveIds = [
      ...new Set(
        (allConfs ?? [])
          .map((c: any) => c.player?.user_id)
          .filter((id: any) => id && !activeIds.has(id)) as string[]
      ),
    ];

    const n = await sendPush({
      user_ids: inactiveIds,
      title:    "⚽ Saudades do baba?",
      body:     "Faz 2 semanas que você não joga. Tem partida essa semana!",
      url:      "/home",
      evt_type: "reengagement_d14",
      ref_id:   undefined,
    });
    results.push(`D+14 inativo ${n} enviados`);
  }

  return json({ ok: true, dry_run: !!dry_run, processed: results });
});
