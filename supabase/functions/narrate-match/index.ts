// supabase/functions/narrate-match/index.ts
// Sprint 5 — Gera narrativa cômica/dramática da partida usando Gemini 1.5 Flash.
// Chamada pelo presidente após finalizar uma partida.

import { serve }        from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z }            from "npm:zod@3.22.4";

const GEMINI_KEY  = Deno.env.get("GEMINI_API_KEY")           ?? "";
const SVC_ROLE    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET")               ?? "";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

const json = (data: unknown, s = 200) =>
  new Response(JSON.stringify(data), {
    status: s,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

const BodySchema = z.object({
  match_id: z.string().uuid(),
  baba_id:  z.string().uuid(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const auth  = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    SVC_ROLE,
  );

  // Verificar autenticação
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  const isService = token === CRON_SECRET || token === SVC_ROLE;
  if (authErr && !isService) return json({ error: "Unauthorized" }, 401);

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch (e) {
    return json({ error: "Payload inválido", detail: String(e) }, 400);
  }

  // Buscar dados da partida
  const { data: match } = await supabase
    .from("matches")
    .select("*, match_players(goals, assists, player:players(name, position))")
    .eq("id", body.match_id)
    .single();

  if (!match) return json({ error: "Partida não encontrada" }, 404);

  // Verificar se já existe narrativa
  const { data: existing } = await supabase
    .from("match_narratives")
    .select("narrative")
    .eq("match_id", body.match_id)
    .maybeSingle();

  if (existing) return json({ narrative: existing.narrative, cached: true });

  // Construir prompt
  const scoreA  = match.team_a_score ?? 0;
  const scoreB  = match.team_b_score ?? 0;
  const winner  = scoreA > scoreB ? match.team_a_name : scoreB > scoreA ? match.team_b_name : null;
  const players = (match.match_players || [])
    .filter((mp: any) => mp.goals > 0 || mp.assists > 0)
    .map((mp: any) => `${mp.player?.name}: ${mp.goals}g ${mp.assists}a`)
    .join(", ");

  const prompt = `Você é o narrador hilário e dramático de um baba de futebol amador brasileiro.
Gere uma narrativa cômica e empolgante de até 3 frases sobre esta partida:

- Placar: ${match.team_a_name} ${scoreA} × ${scoreB} ${match.team_b_name}
- ${winner ? `Vencedor: ${winner}` : "Empate!"}
- Destaques: ${players || "nenhum gol marcado"}

Use gírias do futebol brasileiro, seja dramático e bem-humorado. Máximo 3 frases curtas.`;

  if (!GEMINI_KEY) {
    return json({ error: "GEMINI_API_KEY não configurado" }, 500);
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 200, temperature: 0.9 },
        }),
      }
    );

    const data = await res.json();
    const narrative = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "Que jogo! O baba tá pegando fogo! 🔥";

    // Salvar no banco
    await supabase.from("match_narratives").insert({
      match_id:  body.match_id,
      baba_id:   body.baba_id,
      narrative,
      model:     "gemini-1.5-flash",
    });

    return json({ narrative, cached: false });
  } catch (err) {
    console.error("[narrate-match]", err);
    return json({ error: "Erro ao gerar narrativa", detail: String(err) }, 500);
  }
});
