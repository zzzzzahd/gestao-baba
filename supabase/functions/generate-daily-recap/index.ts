import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, baggage, sentry-trace",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GEMINI_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-3.5-flash",
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function fallbackRecap(babaName: string, stats: any): string {
  const leader = stats.topTeam
    ? `${stats.topTeam.name} fechou na frente com ${stats.topTeam.Pts} pts`
    : "o dia teve disputa equilibrada";
  const win = stats.biggestWin
    ? ` A maior goleada foi ${stats.biggestWin.winner} ${stats.biggestWin.score} em cima de ${stats.biggestWin.loser}.`
    : "";
  const unbeaten = stats.unbeatenTeams?.length
    ? ` Invicto(s): ${stats.unbeatenTeams.join(", ")}.`
    : "";
  return `No ${babaName} de hoje foram ${stats.totalMatches} partida(s) e ${stats.totalGoals} gol(s): ${leader}.${win}${unbeaten}`;
}

async function generateRecapText(apiKey: string, prompt: string): Promise<string> {
  let lastErr = "";
  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.8, maxOutputTokens: 1024 },
          }),
        },
      );
      if (res.ok) {
        const data = await res.json();
        const text = (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
        if (text) return text;
        lastErr = `empty response from ${model}`;
        break;
      }
      lastErr = await res.text();
      console.error(`[generate-daily-recap] ${model} attempt ${attempt + 1}:`, lastErr);
      if (res.status === 503 || res.status === 429) {
        await sleep(500 * (attempt + 1));
        continue;
      }
      break;
    }
  }
  console.error("[generate-daily-recap] Gemini failed, using fallback:", lastErr);
  return "";
}

function getBrazilToday(): string {
  const now = new Date();
  const brShifted = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return brShifted.toISOString().split("T")[0];
}

function computeDailyStats(matches: any[]) {
  const table: Record<string, any> = {};
  const ensure = (name: string) => {
    if (!table[name]) table[name] = { name, P: 0, V: 0, E: 0, D: 0, GP: 0, GC: 0, Pts: 0 };
    return table[name];
  };

  let biggestWin: any = null;
  let totalGoals = 0;

  for (const m of matches) {
    if (m.status !== "finished" || m.team_a_score == null || m.team_b_score == null) continue;
    const A = ensure(m.team_a_name);
    const B = ensure(m.team_b_name);
    A.P++; B.P++;
    A.GP += m.team_a_score; A.GC += m.team_b_score;
    B.GP += m.team_b_score; B.GC += m.team_a_score;
    totalGoals += m.team_a_score + m.team_b_score;

    const diff = Math.abs(m.team_a_score - m.team_b_score);
    if (!biggestWin || diff > biggestWin.diff) {
      biggestWin = {
        diff,
        winner: m.team_a_score > m.team_b_score ? m.team_a_name
               : m.team_b_score > m.team_a_score ? m.team_b_name : null,
        loser: m.team_a_score > m.team_b_score ? m.team_b_name
              : m.team_b_score > m.team_a_score ? m.team_a_name : null,
        score: `${m.team_a_score}x${m.team_b_score}`,
      };
    }

    if (m.team_a_score > m.team_b_score) { A.V++; A.Pts += 3; B.D++; }
    else if (m.team_a_score < m.team_b_score) { B.V++; B.Pts += 3; A.D++; }
    else { A.E++; B.E++; A.Pts++; B.Pts++; }
  }

  const standings = Object.values(table).sort((a: any, b: any) => b.Pts - a.Pts || (b.GP - b.GC) - (a.GP - a.GC));
  const unbeaten = standings.filter((t: any) => t.P > 0 && t.D === 0).map((t: any) => t.name);

  return {
    standings,
    topTeam: standings[0] ?? null,
    unbeatenTeams: unbeaten,
    biggestWin: biggestWin?.winner ? biggestWin : null,
    totalMatches: matches.filter((m) => m.status === "finished").length,
    totalGoals,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  let GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
  if (!GEMINI_API_KEY) {
    const { data: cfg } = await supabase.from("app_config").select("value").eq("key", "gemini_api_key").single();
    GEMINI_API_KEY = cfg?.value ?? "";
  }
  if (!GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: "GEMINI_API_KEY não configurada" }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  let body: any;
  try { body = await req.json(); } catch { body = {}; }
  const { baba_id } = body;
  if (!baba_id) {
    return new Response(JSON.stringify({ error: "baba_id obrigatório" }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const { data: baba } = await supabase.from("babas").select("name").eq("id", baba_id).single();
  if (!baba) {
    return new Response(JSON.stringify({ error: "Baba não encontrado" }), {
      status: 404, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const today = getBrazilToday();
  const { data: matches } = await supabase
    .from("matches")
    .select("team_a_name, team_b_name, team_a_score, team_b_score, status")
    .eq("baba_id", baba_id)
    .eq("status", "finished")
    .gte("match_date", `${today}T00:00:00-03:00`)
    .lte("match_date", `${today}T23:59:59-03:00`);

  const stats = computeDailyStats(matches || []);

  if (stats.totalMatches === 0) {
    return new Response(JSON.stringify({ error: "Nenhuma partida finalizada hoje ainda" }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const statsText = `
Partidas finalizadas hoje: ${stats.totalMatches}
Gols no total: ${stats.totalGoals}
Classificação do dia (Pts = 3 por vitória, 1 por empate):
${stats.standings.map((t: any) => `- ${t.name}: ${t.Pts} pts (${t.V}V ${t.E}E ${t.D}D, saldo ${t.GP - t.GC})`).join("\n")}
Time(s) invicto(s) hoje: ${stats.unbeatenTeams.length ? stats.unbeatenTeams.join(", ") : "nenhum"}
${stats.biggestWin ? `Maior goleada do dia: ${stats.biggestWin.winner} ${stats.biggestWin.score} em cima de ${stats.biggestWin.loser}` : ""}
`.trim();

  const prompt = `Você é um narrador esportivo de futebol amador brasileiro ("baba"). Responda APENAS em português brasileiro informal e empolgante, como quem manda um áudio no grupo do zap contando como foi o dia.

Dados de HOJE no grupo "${baba.name}":
${statsText}

Escreva um resumo curto (2 a 4 frases, máx 400 caracteres) contando como foi o dia, destacando o time que mais se destacou e, se fizer sentido, a goleada ou o time invicto.
IMPORTANTE: você só tem o placar final de cada partida, não a sequência dos gols — então NÃO invente virada de placar, empate técnico no meio do jogo ou qualquer coisa sobre a ordem dos gols. Fale só do que os dados acima realmente mostram.
Retorne APENAS o texto do resumo, sem markdown, sem aspas, sem explicação.`;

  let recapText = await generateRecapText(GEMINI_API_KEY, prompt);
  if (!recapText) recapText = fallbackRecap(baba.name, stats);

  await supabase.from("ai_insights").delete()
    .eq("baba_id", baba_id).eq("type", "daily_recap")
    .gte("generated_at", `${today}T00:00:00-03:00`);

  const validUntil = new Date(`${today}T23:59:59-03:00`);

  const { error: insertErr } = await supabase.from("ai_insights").insert([{
    baba_id,
    type: "daily_recap",
    content: recapText.substring(0, 500),
    metadata: stats,
    valid_until: validUntil.toISOString(),
  }]);
  if (insertErr) console.error("[generate-daily-recap] insert error:", insertErr);

  return new Response(
    JSON.stringify({ ok: true, content: recapText, stats }),
    { headers: { ...CORS, "Content-Type": "application/json" } },
  );
});
