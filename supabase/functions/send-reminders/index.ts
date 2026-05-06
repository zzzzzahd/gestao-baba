// supabase/functions/send-reminders/index.ts
// Sprint 9.1c — Verifica qual lembrete enviar agora e dispara send-push.
// Chamado pelo cron job a cada hora.
//
// Templates:
//   D-1  → "Amanhã tem baba! Confirma presença?"
//   H-0.5 → "Times sendo sorteados em 30min"
//   Pós-jogo (D+0 após partida) → "Avalie seus companheiros"
//   D+14 sem baba → "Saudades? Tem jogo essa semana"

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

const SUPABASE_URL        = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE        = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET         = Deno.env.get("CRON_SECRET") ?? "";
const SEND_PUSH_URL       = SUPABASE_URL + "/functions/v1/send-push";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // Validar chamador (pg_cron ou outro serviço interno)
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ") || auth.slice(7) !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const now      = new Date();
  const results: string[] = [];

  // ── Helper: chamar send-push ─────────────────────────────────────────────
  async function sendPush(user_ids: string[], title: string, body: string, url = "/") {
    if (!user_ids.length) return;
    await fetch(SEND_PUSH_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${CRON_SECRET}` },
      body:    JSON.stringify({ user_ids, title, body, url }),
    });
  }

  // ── Template D-1: amanhã tem baba ────────────────────────────────────────
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  // Busca babas com jogo amanhã (via game_days_config)
  const { data: tomorrowBabas } = await supabase
    .from("babas")
    .select("id, name, game_days")
    .contains("game_days", [tomorrow.getDay()]);

  for (const baba of tomorrowBabas ?? []) {
    // Usuários desse baba que ainda não confirmaram
    const { data: players } = await supabase
      .from("players")
      .select("user_id")
      .eq("baba_id", baba.id);

    const { data: confirmed } = await supabase
      .from("game_confirmations")
      .select("player_id")
      .eq("baba_id", baba.id)
      .eq("game_date", tomorrowStr);

    const confirmedPlayerIds = new Set((confirmed ?? []).map(c => c.player_id));

    const { data: allPlayers } = await supabase
      .from("players")
      .select("id, user_id")
      .eq("baba_id", baba.id);

    const unconfirmedUserIds = (allPlayers ?? [])
      .filter(p => !confirmedPlayerIds.has(p.id) && p.user_id)
      .map(p => p.user_id);

    await sendPush(
      unconfirmedUserIds,
      `⚽ Amanhã tem ${baba.name}!`,
      "Confirma sua presença antes do prazo fechar.",
      "/dashboard?tab=overview",
    );
    results.push(`D-1 ${baba.name}: ${unconfirmedUserIds.length} users`);
  }

  // ── Template H-0.5: sorteio em 30min ─────────────────────────────────────
  const in30min    = new Date(now.getTime() + 30 * 60 * 1000);
  const todayStr   = now.toISOString().split("T")[0];
  const targetHour = in30min.getHours().toString().padStart(2, "0");
  const targetMin  = in30min.getMinutes().toString().padStart(2, "0");
  const targetTime = `${targetHour}:${targetMin}`;

  const { data: drawBabas } = await supabase
    .from("babas")
    .select("id, name, game_time")
    .like("game_time", `${targetTime}%`);

  for (const baba of drawBabas ?? []) {
    const { data: confirmed30 } = await supabase
      .from("game_confirmations")
      .select("player:players(user_id)")
      .eq("baba_id", baba.id)
      .eq("game_date", todayStr)
      .eq("status", "confirmed");

    const userIds = (confirmed30 ?? [])
      .map((c: any) => c.player?.user_id)
      .filter(Boolean);

    await sendPush(
      userIds,
      `🎲 Sorteio em 30min — ${baba.name}`,
      "Os times serão sorteados em breve. Já está pronto?",
      "/draw",
    );
    results.push(`H-0.5 ${baba.name}: ${userIds.length} users`);
  }

  // ── Template Pós-jogo: avaliar companheiros ───────────────────────────────
  const { data: finishedToday } = await supabase
    .from("matches")
    .select("id, baba_id, baba:babas(name)")
    .eq("status", "finished")
    .gte("finished_at", `${todayStr}T00:00:00`)
    .lte("finished_at", `${todayStr}T23:59:59`);

  for (const match of finishedToday ?? []) {
    const { data: mp } = await supabase
      .from("match_players")
      .select("player:players(user_id)")
      .eq("match_id", match.id);

    const userIds = (mp ?? [])
      .map((m: any) => m.player?.user_id)
      .filter(Boolean);

    await sendPush(
      userIds,
      `⭐ Avalie seus craques — ${(match as any).baba?.name}`,
      "A partida acabou! Avalie seus companheiros de baba.",
      "/dashboard?tab=postgame",
    );
    results.push(`Pós-jogo ${match.id}: ${userIds.length} users`);
  }

  // ── Template D+14: sem baba há 2 semanas ─────────────────────────────────
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  // Usuários que não tiveram confirmação nos últimos 14 dias
  const { data: inactiveConfs } = await supabase
    .from("game_confirmations")
    .select("player:players(user_id)")
    .lt("game_date", twoWeeksAgo.toISOString().split("T")[0]);

  // Buscar quem confirmou nos últimos 14 dias (ativo = excluir)
  const { data: recentConfs } = await supabase
    .from("game_confirmations")
    .select("player:players(user_id)")
    .gte("game_date", twoWeeksAgo.toISOString().split("T")[0]);

  const recentIds = new Set(
    (recentConfs ?? []).map((c: any) => c.player?.user_id).filter(Boolean)
  );

  const inactiveIds = [
    ...new Set(
      (inactiveConfs ?? [])
        .map((c: any) => c.player?.user_id)
        .filter((id: any) => id && !recentIds.has(id))
    ),
  ];

  if (inactiveIds.length > 0 && now.getHours() === 10) {
    // Envia só às 10h para não spammar
    await sendPush(
      inactiveIds,
      "⚽ Saudades do baba?",
      "Faz 2 semanas que você não joga. Tem partida essa semana!",
      "/home",
    );
    results.push(`D+14 inativo: ${inactiveIds.length} users`);
  }

  return new Response(
    JSON.stringify({ ok: true, processed: results }),
    { headers: { ...CORS, "Content-Type": "application/json" } },
  );
});
