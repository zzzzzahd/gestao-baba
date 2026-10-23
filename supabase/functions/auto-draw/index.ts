// supabase/functions/auto-draw/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Sorteio AUTOMÁTICO — chamado pelo pg_cron a cada 5 minutos.
//
// Faz exatamente o que o sorteio manual faz (mesmo algoritmo, mesmas regras):
//   • só age em babas com auto_draw_enabled = true
//   • sorteia quando chega o horário (auto_draw_time; sem ele, 30 min antes do jogo)
//   • lê as configurações salvas: players_per_team, draw_strategy, gk_mode
//   • aplica as restrições (draw_constraints) e o nível dos jogadores
//     (player_rating_summary.avg_level) / dos convidados (players.balance_level)
//   • só entra quem está 'confirmed' (lista de espera fica de fora)
//   • grava draw_results com status 'active' — NÃO cria partida: a partida nasce
//     quando o presidente/coordenador inicia (StepMatch), igual ao fluxo manual.
//     (Antes esta função criava matches 'scheduled' + match_players, que duplicavam
//     com os criados pelo StepMatch.)
//
// Algoritmo e agenda vêm de ../_shared (cópias de src/utils/drawAlgorithm.js e
// src/utils/drawSchedule.js — o teste drawShared.sync.test.js garante que não divergem).
// Deploy: supabase functions deploy auto-draw   (a pasta _shared vai junto)
// ─────────────────────────────────────────────────────────────────────────────

import { serve }        from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z }            from "npm:zod@3.22.4";
// @ts-ignore — módulos JS puros
import { drawTeamsWithConstraints } from "../_shared/drawAlgorithm.js";
// @ts-ignore
import { getTodayGame } from "../_shared/drawSchedule.js";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")              ?? "";
const SERVICE_ROLE  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET   = Deno.env.get("CRON_SECRET")               ?? "";
const SEND_PUSH_URL = SUPABASE_URL + "/functions/v1/send-push";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

const BodySchema = z.object({
  force_baba_id: z.string().uuid().optional(),   // teste: sortear baba específico (ignora auto_draw_enabled e horário)
  force_date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dry_run:       z.boolean().optional().default(false),
}).optional();

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } });

/** Relógio de parede de Bahia como Date "local" (a função roda em UTC; os getters
 *  de getTodayGame leem esse relógio, não o UTC). */
const nowBahia = () =>
  new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bahia" }));

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const auth  = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || (token !== CRON_SECRET && token !== SERVICE_ROLE)) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body: z.infer<typeof BodySchema> = {};
  try {
    const raw = await req.json().catch(() => ({}));
    body = BodySchema.parse(raw) ?? {};
  } catch (err) {
    return json({ error: "Payload inválido", detail: String(err) }, 400);
  }

  const { force_baba_id, force_date, dry_run } = body ?? {};
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const now      = nowBahia();
  const results: Record<string, unknown>[] = [];

  let q = supabase
    .from("babas")
    .select("id, name, game_days_config, game_days, game_time, location, " +
            "auto_draw_enabled, auto_draw_time, players_per_team, draw_strategy, gk_mode");
  q = force_baba_id ? q.eq("id", force_baba_id) : q.eq("auto_draw_enabled", true);

  const { data: babas, error: bErr } = await q;
  if (bErr) return json({ error: bErr.message }, 500);

  for (const baba of babas ?? []) {
    try {
      // ── Quando? ───────────────────────────────────────────────────────────
      const game = getTodayGame(baba, now);
      if (!game) continue;
      if (!force_baba_id && !game.isDue) continue;       // ainda não deu a hora / janela acabou
      const dateStr: string = force_date ?? game.dateStr;

      // ── Já sorteado? (qualquer sessão desse baba nessa data) ──────────────
      const { data: sameDate } = await supabase
        .from("draw_results").select("id")
        .eq("baba_id", baba.id).eq("draw_date", dateStr).limit(1);
      if (sameDate?.length) { results.push({ baba: baba.name, status: "já_sorteado", date: dateStr }); continue; }

      // ── Outra sessão ativa (baba anterior não encerrado)? O índice único
      //    permite 1 ativa por baba — não atropela, só avisa. ─────────────────
      const { data: activeOther } = await supabase
        .from("draw_results").select("id, draw_date")
        .eq("baba_id", baba.id).eq("status", "active").limit(1);
      if (activeOther?.length) {
        results.push({ baba: baba.name, status: "sessao_ativa_anterior", active_date: activeOther[0].draw_date });
        continue;
      }

      // ── Configurações salvas ──────────────────────────────────────────────
      const playersPerTeam: number = baba.players_per_team ?? 5;
      const strategy: string       = baba.draw_strategy === "substitute" ? "substitute" : "reserve";
      const gkMode: string         = baba.gk_mode ?? "fixed";

      // ── Confirmados (não-waitlist) com o jogador ──────────────────────────
      const { data: confs } = await supabase
        .from("game_confirmations")
        .select("player_id, created_at, player:players(id, name, position, user_id, is_guest, balance_level)")
        .eq("baba_id", baba.id).eq("game_date", dateStr).eq("status", "confirmed")
        .order("created_at", { ascending: true });

      // ── Nível médio de cada jogador + restrições ──────────────────────────
      const { data: ratings } = await supabase
        .from("player_rating_summary").select("player_id, avg_level").eq("baba_id", baba.id);
      const levelMap = new Map((ratings ?? []).map((r: any) => [r.player_id, r.avg_level ?? 2]));

      // Direto na tabela: a RPC get_draw_constraints exige auth.uid() de admin
      // e a service role não tem uid.
      const { data: cons } = await supabase
        .from("draw_constraints").select("player_a_id, player_b_id, type")
        .eq("baba_id", baba.id).eq("is_active", true);
      const constraints = (cons ?? []).map((c: any) => ({
        player_a_id: c.player_a_id, player_b_id: c.player_b_id, constraint_type: c.type,
      }));

      const players = (confs ?? [])
        .map((c: any) => c.player)
        .filter((p: any) => p?.id)
        .map((p: any) => ({
          ...p,
          balance_level: p.is_guest ? (p.balance_level ?? 2) : (levelMap.get(p.id) ?? 2),
        }));

      const needed = (strategy === "reserve" ? playersPerTeam + 1 : playersPerTeam) * 2;
      if (players.length < needed) {
        results.push({ baba: baba.name, status: "jogadores_insuficientes", count: players.length, needed });
        continue;
      }

      if (dry_run) {
        results.push({ baba: baba.name, status: "dry_run_ok", players: players.length, date: dateStr, strategy, playersPerTeam, constraints: constraints.length });
        continue;
      }

      // ── Sortear (mesmo algoritmo do manual) ───────────────────────────────
      const { teams, reserves, goalkeeperQueue } =
        drawTeamsWithConstraints(players, playersPerTeam, strategy, constraints, gkMode);

      if (!teams || teams.length < 2) {
        results.push({ baba: baba.name, status: "menos_de_2_times", count: players.length });
        continue;
      }

      const avgs = teams.map((t: any) =>
        t.players.reduce((s: number, p: any) => s + (p.balance_level || 0), 0) / (t.players.length || 1));
      const balanceScore = Math.round((Math.max(...avgs) - Math.min(...avgs)) * 100) / 100;

      const { data: drawRes, error: dErr } = await supabase
        .from("draw_results")
        .insert({
          baba_id:          baba.id,
          draw_date:        dateStr,
          teams,
          reserves,
          goalkeeper_queue: goalkeeperQueue,
          draw_config:      { playersPerTeam, strategy, gkMode, source: "auto-server" },
          players_per_team: playersPerTeam,
          strategy,
          algorithm:        "balanced_snake",
          constraints_used: constraints,
          balance_score:    balanceScore,
          teams_snapshot:   teams,
          total_confirmed:  players.length,
          status:           "active",
        })
        .select().single();

      if (dErr) {
        // 23505 = outra sessão ativa nasceu agora (cliente do presidente rodou o
        // fallback ao mesmo tempo) — resultado equivalente, não é erro.
        results.push({ baba: baba.name, status: dErr.code === "23505" ? "já_sorteado_agora" : "erro_draw_result", error: dErr.message });
        continue;
      }

      // ── Avisa os jogadores (o convidado não tem user_id) ──────────────────
      const userIds = players.map((p: any) => p.user_id as string).filter(Boolean);
      await fetch(SEND_PUSH_URL, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${CRON_SECRET}` },
        body:    JSON.stringify({
          user_ids: userIds,
          title:    `🎲 Times sorteados — ${baba.name}`,
          body:     `Confira seu time! Baba às ${game.time}.`,
          url:      "/teams",
          baba_id:  baba.id,
          evt_type: "draw_done",
          ref_id:   drawRes.id,
        }),
      }).catch((e) => console.error("[auto-draw] push fail:", e));

      results.push({
        baba: baba.name, status: "sorteado", date: dateStr,
        teams_count: teams.length, players: players.length, reserves: reserves.length,
        balance_score: balanceScore, draw_result_id: drawRes.id,
      });
    } catch (err) {
      console.error("[auto-draw] baba", baba?.name, err);
      results.push({ baba: baba?.name, status: "erro", error: String(err) });
    }
  }

  return json({ ok: true, dry_run: !!dry_run, processed: results });
});
