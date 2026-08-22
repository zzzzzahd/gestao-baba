// supabase/functions/auto-draw/index.ts
// Fase 5 — Auto-sorteio: chamado pelo pg_cron de hora em hora.
// Algoritmo v3: goleiro configurável (separado/fixo, com fallback) + snake draft balanceado.
// Validação Zod + dedup por baba+data + notifica jogadores via send-push.
// Corrigido: select de babas usava colunas (players_per_team, draw_config) que não existiam
// na tabela — provavelmente fazia essa função falhar em toda execução do cron.

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

// ─── Algoritmo de sorteio balanceado v3 ──────────────────────────────────────
// v3: goleiro configurável por baba (gk_mode: separate | fixed) com fallback
// configurável (gk_fallback: incomplete | lineplayer) para quando faltam
// goleiros pra cobrir todos os times. Corrige o bug da v2 onde
// floor(goleiros/times) zerava e jogava TODOS os goleiros pro pool de linha
// quando havia menos goleiros que times.

interface Player { id: string; name: string; position?: string; final_rating?: number; [k: string]: unknown; }
interface Team   { name: string; players: Player[]; }
type GkMode     = "separate" | "fixed";
type GkFallback = "incomplete" | "lineplayer";

/** Distribui um pool (já ordenado por prioridade) em times respeitando a capacidade de cada um, em formato serpentina (cobra). */
function snakeDistribute<T>(pool: T[], capacities: number[]): T[][] {
  const teams: T[][] = capacities.map(() => []);
  let dir = 1;
  let poolIdx = 0;
  while (poolIdx < pool.length) {
    const order = dir === 1
      ? capacities.map((_, i) => i)
      : capacities.map((_, i) => i).reverse();
    let placedAny = false;
    for (const t of order) {
      if (poolIdx >= pool.length) break;
      if (teams[t].length < capacities[t]) {
        teams[t].push(pool[poolIdx]);
        poolIdx++;
        placedAny = true;
      }
    }
    if (!placedAny) break; // todos os times já bateram a capacidade
    dir *= -1;
  }
  return teams;
}

function drawTeamsV3(
  players: Player[], // já vem ordenado por ordem de confirmação (created_at asc)
  playersPerTeam: number,
  gkMode: GkMode,
  gkFallback: GkFallback,
  iterations = 8,
): { teams: Team[]; reserves: Player[]; balance_score: number; teams_incomplete: boolean[] } {
  const gksAll      = players.filter(p => p.position === "goleiro");
  const outfieldAll = players.filter(p => p.position !== "goleiro");

  const totalTeams = gkMode === "separate"
    ? Math.max(2, Math.floor(outfieldAll.length / playersPerTeam))
    : Math.max(2, Math.floor(players.length / playersPerTeam));

  const teamsWithGk = Math.min(gksAll.length, totalTeams);

  // Quantas vagas de LINHA cada time tem (varia conforme modo/fallback quando falta goleiro)
  const lineCapacity: number[] = Array.from({ length: totalTeams }, (_, i) => {
    if (gkMode === "separate") {
      // Goleiro é sempre vaga à parte nesse modo — time tem playersPerTeam de linha
      // sempre, tenha ou não um goleiro real. O fallback aqui só decide se um jogador
      // de linha é marcado como goleiro improvisado pra aquela partida (ver match_players
      // abaixo), não quantos jogadores o time tem.
      return playersPerTeam;
    }
    // fixed: goleiro conta como 1 dos playersPerTeam
    if (i < teamsWithGk) return playersPerTeam - 1;
    return gkFallback === "lineplayer" ? playersPerTeam : playersPerTeam - 1;
  });

  // Times que ficam sem goleiro real (metadado — em modo fixo isso reduz o time quando
  // fallback=incomplete; em modo separado é só informativo, o time continua com playersPerTeam)
  const teamsIncomplete = Array.from({ length: totalTeams }, (_, i) => i >= teamsWithGk && gkFallback === "incomplete");

  const gkPool     = [...gksAll].slice(0, teamsWithGk).sort((a, b) => (b.final_rating ?? 5) - (a.final_rating ?? 5));
  const leftoverGk = gksAll.slice(teamsWithGk); // goleiros excedentes (mais goleiros do que times) -> disputam vaga de linha
  const linePoolBase = [...outfieldAll, ...leftoverGk];

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

    // 1. Goleiros primeiro, só nos times que têm (capacidade 1 nesses, 0 nos demais)
    const gkCapacity = Array.from({ length: totalTeams }, (_, i) => (i < teamsWithGk ? 1 : 0));
    snakeDistribute(gkPool, gkCapacity).forEach((assigned, i) => teams[i].players.push(...assigned));

    // 2. Linha — snake por nota, com leve aleatorização a partir da 3ª iteração
    const linePool = iter < 2
      ? [...linePoolBase].sort((a, b) => (b.final_rating ?? 5) - (a.final_rating ?? 5))
      : [...linePoolBase].sort((a, b) => ((b.final_rating ?? 5) + (Math.random() - 0.5) * 0.5) - ((a.final_rating ?? 5) + (Math.random() - 0.5) * 0.5));

    snakeDistribute(linePool, lineCapacity).forEach((assigned, i) => teams[i].players.push(...assigned));

    const s = score(teams);
    if (s < bestScore) { bestScore = s; bestTeams = teams.map(t => ({ ...t, players: [...t.players] })); }
    if (bestScore < 0.05) break;
  }

  const usedIds  = new Set((bestTeams ?? []).flatMap(t => t.players.map(p => p.id)));
  const reserves = players.filter(p => !usedIds.has(p.id));
  return {
    teams: bestTeams ?? [],
    reserves,
    balance_score: Math.round(bestScore * 100) / 100,
    teams_incomplete: teamsIncomplete,
    teams_with_gk: teamsWithGk, // times de índice < teamsWithGk têm goleiro real; os demais usam o fallback
  };
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
    .select("id, name, game_days_config, game_days, game_time, max_players, players_per_team, gk_mode, gk_fallback");
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

    // Buscar jogadores confirmados — status=confirmed já exclui quem está na fila de
    // espera (a RPC confirm_presence, chamada pelo PresenceBlock.jsx, decide status
    // 'confirmed' vs 'waitlist' no momento da confirmação, respeitando max_players e
    // a ordem de chegada). Ordena por created_at pra manter a ordem de confirmação em
    // qualquer corte que sobre aqui (ex: total não é múltiplo exato de playersPerTeam).
    const { data: confs } = await supabase
      .from("game_confirmations")
      .select("player_id, created_at, player:players(id, name, position, user_id, final_rating:player_rating_summary(final_rating))")
      .eq("baba_id", baba.id)
      .eq("game_date", dateStr)
      .eq("status", "confirmed")
      .order("created_at", { ascending: true });

    const players: Player[] = (confs ?? [])
      .map((c: any) => ({
        ...(c.player ?? {}),
        final_rating: c.player?.final_rating?.[0]?.final_rating ?? 5,
      }))
      .filter((p: any) => p.id);

    const playersPerTeam = baba.players_per_team ?? 5;
    const gkMode: "separate" | "fixed"       = baba.gk_mode ?? "fixed";
    const gkFallback: "incomplete" | "lineplayer" = baba.gk_fallback ?? "lineplayer";
    const minNeeded = playersPerTeam * 2;

    if (players.length < minNeeded) {
      results.push({ baba: baba.name, status: "jogadores_insuficientes", count: players.length, needed: minNeeded });
      continue;
    }

    if (dry_run) {
      results.push({ baba: baba.name, status: "dry_run_ok", players: players.length, date: dateStr });
      continue;
    }

    // ── Sortear ─────────────────────────────────────────────────────────────
    const { teams, reserves, balance_score, teams_incomplete, teams_with_gk } = drawTeamsV3(players, playersPerTeam, gkMode, gkFallback);

    // ── Persistir draw_result ────────────────────────────────────────────────
    const { data: drawRes, error: dErr } = await supabase
      .from("draw_results")
      .insert({
        baba_id:       baba.id,
        draw_date:     dateStr,
        teams,
        reserves,
        draw_config:   { playersPerTeam, gkMode, gkFallback, teams_incomplete },
        algorithm:     "balanced_snake_v3",
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
    const matchPlayers = teams.slice(0, 2).flatMap((t, ti) => {
      const teamIdx        = ti; // índice real do time no array `teams` original
      const noRealGk        = teamIdx >= teams_with_gk;
      const needsMakeshift  = gkMode === "separate" && gkFallback === "lineplayer" && noRealGk
        && !t.players.some(p => p.position === "goleiro");
      let makeshiftAssigned = false;

      return t.players.map(p => {
        // último jogador de linha do time vira goleiro improvisado só pra essa partida
        const isLast = needsMakeshift && !makeshiftAssigned && p === t.players[t.players.length - 1];
        if (isLast) makeshiftAssigned = true;
        return {
          match_id:  match.id,
          player_id: p.id,
          team:      ti === 0 ? "A" : "B",
          position:  isLast ? "goleiro" : (p.position ?? "linha"),
        };
      });
    });
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
