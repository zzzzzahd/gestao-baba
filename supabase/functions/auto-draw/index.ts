// supabase/functions/auto-draw/index.ts
// Fase 5 — Auto-sorteio: chamado pelo pg_cron de hora em hora.
// Algoritmo v2: goleiro separado + snake draft balanceado.
// Validação Zod + dedup por baba+data + notifica jogadores via send-push.

import { serve }        from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z }            from "npm:zod@3.22.4";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")              ?? "";
const SERVICE_ROLE  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET   = Deno.env.get("CRON_SECRET")               ?? "";
const SEND_PUSH_URL = SUPABASE_URL + "/functions/v1/send-push";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

// ─── Schema Zod ───────────────────────────────────────────────────────────────

const BodySchema = z.object({
  force_baba_id: z.string().uuid().optional(),   // para teste: sortear baba específico
  force_date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dry_run:       z.boolean().optional().default(false),
}).optional();

// ─── Helpers ─────────────────────────────────────────────────────────────────

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

/** Hora atual no fuso America/Bahia */
const nowBahia = () =>
  new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bahia" }));

/** Extrair configuração de dias/horários do baba */
interface GameDayConfig { day: number; time: string; location?: string; }
function getGameDayConfigs(baba: Record<string, unknown>): GameDayConfig[] {
  const raw = baba.game_days_config;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((c: any) => ({ day: Number(c.day), time: String(c.time).slice(0, 5), location: c.location ?? "" }));
  }
  // fallback legado
  if (Array.isArray(baba.game_days) && baba.game_time) {
    const t = String(baba.game_time).slice(0, 5);
    return (baba.game_days as number[]).map(d => ({ day: Number(d), time: t }));
  }
  return [];
}

/** Próximo jogo do baba que deve ser sorteado agora (entre deadline e horário do jogo) */
function getDrawableGame(baba: Record<string, unknown>, now: Date, forceDate?: string) {
  const configs = getGameDayConfigs(baba);
  if (!configs.length) return null;
  const todayDow = now.getDay();

  for (let offset = 0; offset < 2; offset++) {
    const checkDow = (todayDow + offset) % 7;
    const cfg = configs.find(c => c.day === checkDow);
    if (!cfg) continue;

    const [h, m]   = cfg.time.split(":").map(Number);
    const gameDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, h, m, 0, 0);
    const deadline = new Date(gameDate.getTime() - 30 * 60 * 1000); // 30min antes
    const dateStr  = forceDate ?? gameDate.toISOString().split("T")[0];

    // Só sorteia se passou do deadline e ainda não começou
    if (forceDate || (now >= deadline && now < gameDate)) {
      return { cfg, gameDate, deadline, dateStr };
    }
  }
  return null;
}

// ─── Algoritmo de sorteio balanceado v2 ──────────────────────────────────────

interface Player { id: string; name: string; position?: string; final_rating?: number; [k: string]: unknown; }
interface Team   { name: string; players: Player[]; }

function drawTeamsV2(players: Player[], playersPerTeam: number, iterations = 8): { teams: Team[]; reserves: Player[]; balance_score: number } {
  const totalTeams = Math.max(2, Math.floor(players.length / playersPerTeam));
  const totalSlots = totalTeams * playersPerTeam;

  const gks      = players.filter(p => p.position === "goleiro");
  const outfield = players.filter(p => p.position !== "goleiro");
  const gkPerTeam = Math.min(Math.floor(gks.length / totalTeams), 1);
  const gkPool    = [...gks].slice(0, gkPerTeam * totalTeams).sort((a, b) => (b.final_rating ?? 5) - (a.final_rating ?? 5));
  const linePool  = [...outfield, ...gks.slice(gkPerTeam * totalTeams)].sort((a, b) => (b.final_rating ?? 5) - (a.final_rating ?? 5));

  const teamAvg = (t: Team) => t.players.length ? t.players.reduce((s, p) => s + (p.final_rating ?? 5), 0) / t.players.length : 0;
  const score   = (teams: Team[]) => {
    if (teams.length < 2) return 0;
    const avgs = teams.map(teamAvg);
    return Math.max(...avgs) - Math.min(...avgs);
  };

  let bestTeams: Team[] | null = null;
  let bestScore = Infinity;

  for (let iter = 0; iter < iterations; iter++) {
    const teams: Team[] = Array.from({ length: totalTeams }, (_, i) => ({
      name: `Time ${String.fromCharCode(65 + i)}`, players: [],
    }));

    // 1. Goleiros — snake
    gkPool.forEach((gk, idx) => {
      const round = Math.floor(idx / totalTeams);
      const pos   = round % 2 === 0 ? idx % totalTeams : totalTeams - 1 - (idx % totalTeams);
      teams[pos]?.players.push(gk);
    });

    // 2. Linha — snake com leve aleatorização a partir iter 2
    const pool = iter < 2
      ? linePool
      : [...linePool].sort((a, b) => ((b.final_rating ?? 5) + (Math.random() - 0.5) * 0.5) - ((a.final_rating ?? 5) + (Math.random() - 0.5) * 0.5));

    const slotsLeft = totalSlots - teams.reduce((s, t) => s + t.players.length, 0);
    pool.slice(0, slotsLeft).forEach((p, idx) => {
      const round = Math.floor(idx / totalTeams);
      const pos   = round % 2 === 0 ? idx % totalTeams : totalTeams - 1 - (idx % totalTeams);
      teams[pos]?.players.push(p);
    });

    const s = score(teams);
    if (s < bestScore) { bestScore = s; bestTeams = teams.map(t => ({ ...t, players: [...t.players] })); }
    if (bestScore < 0.05) break;
  }

  const usedIds  = new Set((bestTeams ?? []).flatMap(t => t.players.map(p => p.id)));
  const reserves = players.filter(p => !usedIds.has(p.id));
  return { teams: bestTeams ?? [], reserves, balance_score: Math.round(bestScore * 100) / 100 };
}

// ─── Handler ─────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const auth  = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token !== CRON_SECRET && token !== SERVICE_ROLE) {
    return json({ error: "Unauthorized" }, 401);
  }

  // Parse body
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

  // Buscar babas (filtrado se force_baba_id)
  let babasQuery = supabase
    .from("babas")
    .select("id, name, game_days_config, game_days, game_time, max_players, players_per_team, draw_config");
  if (force_baba_id) babasQuery = babasQuery.eq("id", force_baba_id);

  const { data: babas, error: bErr } = await babasQuery;
  if (bErr) return json({ error: bErr.message }, 500);

  for (const baba of babas ?? []) {
    const drawable = getDrawableGame(baba, now, force_date);
    if (!drawable) continue;

    const { dateStr, gameDate, cfg } = drawable;

    // Verificar se já foi sorteado hoje
    const { data: existing } = await supabase
      .from("draw_results")
      .select("id")
      .eq("baba_id", baba.id)
      .eq("draw_date", dateStr)
      .maybeSingle();

    if (existing) {
      results.push({ baba: baba.name, status: "já_sorteado", date: dateStr });
      continue;
    }

    // Buscar jogadores confirmados
    const { data: confs } = await supabase
      .from("game_confirmations")
      .select("player_id, player:players(id, name, position, user_id, final_rating:player_rating_summary(final_rating))")
      .eq("baba_id", baba.id)
      .eq("game_date", dateStr)
      .eq("status", "confirmed");

    const players: Player[] = (confs ?? [])
      .map((c: any) => ({
        ...(c.player ?? {}),
        final_rating: c.player?.final_rating?.[0]?.final_rating ?? 5,
      }))
      .filter((p: any) => p.id);

    const playersPerTeam = baba.draw_config?.playersPerTeam ?? baba.players_per_team ?? 5;
    const minNeeded      = playersPerTeam * 2;

    if (players.length < minNeeded) {
      results.push({ baba: baba.name, status: "jogadores_insuficientes", count: players.length, needed: minNeeded });
      continue;
    }

    if (dry_run) {
      results.push({ baba: baba.name, status: "dry_run_ok", players: players.length, date: dateStr });
      continue;
    }

    // ── Sortear ─────────────────────────────────────────────────────────────
    const { teams, reserves, balance_score } = drawTeamsV2(players, playersPerTeam);

    // ── Persistir draw_result ────────────────────────────────────────────────
    const { data: drawRes, error: dErr } = await supabase
      .from("draw_results")
      .insert({
        baba_id:       baba.id,
        draw_date:     dateStr,
        teams,
        reserves,
        draw_config:   { playersPerTeam, strategy: "reserve" },
        algorithm:     "balanced_snake_v2",
        balance_score,
        teams_snapshot: teams,
      })
      .select()
      .single();

    if (dErr) {
      results.push({ baba: baba.name, status: "erro_draw_result", error: dErr.message });
      continue;
    }

    // ── Remover partida agendada antiga (não finalizada) ────────────────────
    await supabase
      .from("matches")
      .delete()
      .eq("baba_id", baba.id)
      .gte("match_date", `${dateStr}T00:00:00`)
      .lte("match_date", `${dateStr}T23:59:59`)
      .neq("status", "finished");

    // ── Criar match ─────────────────────────────────────────────────────────
    const gameTimeStr = `${dateStr}T${cfg.time}:00`;
    const { data: match, error: mErr } = await supabase
      .from("matches")
      .insert({
        baba_id:        baba.id,
        match_date:     gameTimeStr,
        team_a_name:    teams[0]?.name ?? "Time A",
        team_b_name:    teams[1]?.name ?? "Time B",
        draw_result_id: drawRes.id,
        status:         "scheduled",
        location:       cfg.location ?? null,
      })
      .select()
      .single();

    if (mErr) {
      results.push({ baba: baba.name, status: "erro_match", error: mErr.message });
      continue;
    }

    // ── Criar match_players ─────────────────────────────────────────────────
    const matchPlayers = teams.slice(0, 2).flatMap((t, ti) =>
      t.players.map(p => ({
        match_id:  match.id,
        player_id: p.id,
        team:      ti === 0 ? "A" : "B",
        position:  p.position ?? "linha",
      }))
    );
    await supabase.from("match_players").insert(matchPlayers);

    // ── Notificar jogadores ─────────────────────────────────────────────────
    const userIds = players.map(p => p.user_id as string).filter(Boolean);
    await fetch(SEND_PUSH_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${CRON_SECRET}` },
      body:    JSON.stringify({
        user_ids: userIds,
        title:    `🎲 Times sorteados — ${baba.name}`,
        body:     `Confira seu time! Baba às ${cfg.time}.`,
        url:      "/draw",
        baba_id:  baba.id,
        evt_type: "draw_done",
        ref_id:   drawRes.id,
      }),
    }).catch(e => console.error("[auto-draw] push fail:", e));

    results.push({
      baba:          baba.name,
      status:        "sorteado",
      date:          dateStr,
      teams_count:   teams.length,
      players:       players.length,
      reserves:      reserves.length,
      balance_score,
      match_id:      match.id,
    });
  }

  return json({ ok: true, dry_run: !!dry_run, processed: results });
});
