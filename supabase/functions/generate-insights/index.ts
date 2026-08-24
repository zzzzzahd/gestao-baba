import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, baggage, sentry-trace",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GEMINI_MODEL  = "gemini-3.5-flash";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  let GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
  if (!GEMINI_API_KEY) {
    const { data: cfg } = await supabase
      .from("app_config")
      .select("value")
      .eq("key", "gemini_api_key")
      .single();
    GEMINI_API_KEY = cfg?.value ?? "";
  }

  if (!GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: "GEMINI_API_KEY não configurada" }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  let body: any;
  try { body = await req.json(); } catch { body = {}; }

  const { baba_id } = body;
  if (!baba_id) {
    return new Response(JSON.stringify({ error: "baba_id obrigatório" }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const [{ data: baba }, { data: stats }, { data: recentMatches }] = await Promise.all([
    supabase.from("babas").select("name, modality").eq("id", baba_id).single(),
    supabase
      .from("player_stats")
      .select("player_id, matches_played, wins, goals, assists, win_rate, player:players(name)")
      .eq("baba_id", baba_id)
      .eq("period_type", "all_time")
      .order("matches_played", { ascending: false })
      .limit(10),
    supabase
      .from("matches")
      .select("id, match_date, team_a_score, team_b_score")
      .eq("baba_id", baba_id)
      .eq("status", "finished")
      .order("match_date", { ascending: false })
      .limit(5),
  ]);

  if (!baba) {
    return new Response(JSON.stringify({ error: "Baba não encontrado" }), {
      status: 404, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const statsText = (stats || []).map((s: any) =>
    `${s.player?.name}: ${s.matches_played} jogos, ${s.wins} vitórias, ${s.goals} gols, ${s.assists} assists, ${s.win_rate}% aproveitamento`
  ).join("\n") || "Sem estatísticas ainda.";

  const matchesText = (recentMatches || []).map((m: any) =>
    `Partida em ${m.match_date?.split("T")[0] ?? "?"}: ${m.team_a_score ?? 0}x${m.team_b_score ?? 0}`
  ).join("\n") || "Sem partidas recentes.";

  const prompt = `Você é um analista esportivo especialista em futebol amador brasileiro ("baba"). Responda APENAS em português brasileiro informal e empolgante.

Dados do grupo "${baba.name}" (${baba.modality ?? "futebol"}):

Estatísticas dos jogadores (all-time):
${statsText}

Últimas partidas:
${matchesText}

Gere exatamente 3 insights diferentes em JSON puro, sem markdown, sem explicação extra. Formato:
[
  {
    "type": "player_form",
    "player_name": "Nome do jogador ou null",
    "content": "Insight motivador em português (máx 120 chars)",
    "metadata": {}
  },
  {
    "type": "team_chemistry",
    "player_name": null,
    "content": "Insight sobre o grupo (máx 120 chars)",
    "metadata": {}
  },
  {
    "type": "draw_suggestion",
    "player_name": null,
    "content": "Dica para o próximo sorteio (máx 120 chars)",
    "metadata": {}
  }
]

Types disponíveis: player_form, team_chemistry, attendance_risk, draw_suggestion
Retorne APENAS o array JSON, sem nenhum texto antes ou depois.`;

  const geminiRes = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature:      0.7,
        maxOutputTokens:  2048,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!geminiRes.ok) {
    const errText = await geminiRes.text();
    console.error("[generate-insights] Gemini error:", errText);
    return new Response(JSON.stringify({ error: "Erro ao chamar Gemini API", detail: errText }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const geminiData = await geminiRes.json();
  const rawText    = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";

  let insights: any[] = [];
  try {
    const clean = rawText.replace(/```json|```/g, "").trim();
    insights = JSON.parse(clean);
    if (!Array.isArray(insights)) insights = [];
  } catch (e) {
    console.error("[generate-insights] parse error:", rawText);
    return new Response(JSON.stringify({ error: "Resposta inválida da IA", raw: rawText }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  await supabase
    .from("ai_insights")
    .delete()
    .eq("baba_id", baba_id)
    .lt("generated_at", weekAgo.toISOString());

  const { data: players } = await supabase
    .from("players").select("id, name").eq("baba_id", baba_id);

  const playerMap = new Map(
    (players || []).map((p: any) => [p.name?.toLowerCase().trim(), p.id])
  );

  const validUntil = new Date();
  validUntil.setHours(validUntil.getHours() + 24);

  const rows = insights.slice(0, 5).map((ins: any) => ({
    baba_id,
    player_id:   ins.player_name
      ? (playerMap.get(ins.player_name?.toLowerCase().trim()) ?? null)
      : null,
    type:        ins.type     || "player_form",
    content:     (ins.content || "").substring(0, 200),
    metadata:    ins.metadata || {},
    valid_until: validUntil.toISOString(),
  }));

  const { error: insertErr } = await supabase.from("ai_insights").insert(rows);
  if (insertErr) console.error("[generate-insights] insert error:", insertErr);

  return new Response(
    JSON.stringify({ ok: true, count: rows.length, insights: rows }),
    { headers: { ...CORS, "Content-Type": "application/json" } },
  );
});
