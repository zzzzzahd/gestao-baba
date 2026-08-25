import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, baggage, sentry-trace",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const GEMINI_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-3.5-flash",
];

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fallback usado quando o Gemini não responde.
 */
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

/**
 * Tenta vários modelos Gemini.
 */
async function generateRecapText(
  apiKey: string,
  prompt: string,
): Promise<string> {
  let lastErr = "";

  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.8,
              maxOutputTokens: 1024,
            },
          }),
        },
      );

      if (res.ok) {
        const data = await res.json();

        const text = (
          data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
        ).trim();

        if (text) {
          return text;
        }

        lastErr = `empty response from ${model}`;
        break;
      }

      lastErr = await res.text();

      console.error(
        `[generate-daily-recap] ${model} attempt ${attempt + 1}:`,
        lastErr,
      );

      if (res.status === 503 || res.status === 429) {
        await sleep(500 * (attempt + 1));
        continue;
      }

      break;
    }
  }

  console.error(
    "[generate-daily-recap] Gemini failed, using fallback:",
    lastErr,
  );

  return "";
}

/**
 * Retorna a data atual no horário de Brasília.
 */
function getBrazilToday(): string {
  const now = new Date();

  const brShifted = new Date(
    now.getTime() - 3 * 60 * 60 * 1000,
  );

  return brShifted.toISOString().split("T")[0];
}

/**
 * Calcula estatísticas do baba.
 *
 * IMPORTANTE:
 * - O baba pode possuir QUALQUER quantidade de times.
 * - Cada partida individual possui somente dois times:
 *   team_a x team_b.
 * - A classificação é construída dinamicamente a partir
 *   de todas as partidas finalizadas.
 */
function computeDailyStats(matches: any[]) {
  const table: Record<string, any> = {};

  const ensure = (name: string) => {
    if (!name) return null;

    if (!table[name]) {
      table[name] = {
        name,
        P: 0,
        V: 0,
        E: 0,
        D: 0,
        GP: 0,
        GC: 0,
        Pts: 0,
      };
    }

    return table[name];
  };

  let biggestWin: any = null;
  let totalGoals = 0;

  const finishedMatches = matches.filter(
    (m) =>
      m.status === "finished" &&
      m.team_a_score != null &&
      m.team_b_score != null &&
      m.team_a_name &&
      m.team_b_name,
  );

  for (const m of finishedMatches) {
    const A = ensure(m.team_a_name);
    const B = ensure(m.team_b_name);

    if (!A || !B) continue;

    A.P++;
    B.P++;

    A.GP += Number(m.team_a_score);
    A.GC += Number(m.team_b_score);

    B.GP += Number(m.team_b_score);
    B.GC += Number(m.team_a_score);

    totalGoals +=
      Number(m.team_a_score) + Number(m.team_b_score);

    const scoreA = Number(m.team_a_score);
    const scoreB = Number(m.team_b_score);

    const diff = Math.abs(scoreA - scoreB);

    /**
     * Maior goleada.
     *
     * Empates não entram como goleada.
     */
    if (
      scoreA !== scoreB &&
      (!biggestWin || diff > biggestWin.diff)
    ) {
      const winner = scoreA > scoreB ? m.team_a_name : m.team_b_name;
      const loser = scoreA > scoreB ? m.team_b_name : m.team_a_name;

      const winnerScore = Math.max(scoreA, scoreB);
      const loserScore = Math.min(scoreA, scoreB);

      biggestWin = {
        diff,
        winner,
        loser,
        winnerScore,
        loserScore,
        score: `${winnerScore}x${loserScore}`,
      };
    }

    /**
     * Vitória / empate / derrota.
     */
    if (scoreA > scoreB) {
      A.V++;
      A.Pts += 3;
      B.D++;
    } else if (scoreA < scoreB) {
      B.V++;
      B.Pts += 3;
      A.D++;
    } else {
      A.E++;
      B.E++;

      A.Pts++;
      B.Pts++;
    }
  }

  /**
   * Classificação de TODOS os times que participaram
   * das partidas do dia.
   */
  const standings = Object.values(table).sort(
    (a: any, b: any) => {
      const pointsDiff = b.Pts - a.Pts;

      if (pointsDiff !== 0) {
        return pointsDiff;
      }

      const saldoA = a.GP - a.GC;
      const saldoB = b.GP - b.GC;

      if (saldoB !== saldoA) {
        return saldoB - saldoA;
      }

      return b.GP - a.GP;
    },
  );

  /**
   * Times que terminaram o dia sem nenhuma derrota.
   */
  const unbeatenTeams = standings
    .filter(
      (team: any) =>
        team.P > 0 &&
        team.D === 0,
    )
    .map((team: any) => team.name);

  return {
    standings,
    topTeam: standings[0] ?? null,
    unbeatenTeams,
    biggestWin: biggestWin?.winner
      ? biggestWin
      : null,
    totalMatches: finishedMatches.length,
    totalGoals,
  };
}

serve(async (req) => {
  /**
   * CORS
   */
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: CORS,
    });
  }

  const supabase = createClient(
    SUPABASE_URL,
    SERVICE_ROLE,
  );

  /**
   * Busca a chave do Gemini.
   */
  let GEMINI_API_KEY =
    Deno.env.get("GEMINI_API_KEY") ?? "";

  if (!GEMINI_API_KEY) {
    const { data: cfg } = await supabase
      .from("app_config")
      .select("value")
      .eq("key", "gemini_api_key")
      .single();

    GEMINI_API_KEY = cfg?.value ?? "";
  }

  if (!GEMINI_API_KEY) {
    return new Response(
      JSON.stringify({
        error: "GEMINI_API_KEY não configurada",
      }),
      {
        status: 500,
        headers: {
          ...CORS,
          "Content-Type": "application/json",
        },
      },
    );
  }

  /**
   * Body.
   */
  let body: any;

  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const { baba_id } = body;

  if (!baba_id) {
    return new Response(
      JSON.stringify({
        error: "baba_id obrigatório",
      }),
      {
        status: 400,
        headers: {
          ...CORS,
          "Content-Type": "application/json",
        },
      },
    );
  }

  /**
   * Busca o baba.
   */
  const { data: baba } = await supabase
    .from("babas")
    .select("name")
    .eq("id", baba_id)
    .single();

  if (!baba) {
    return new Response(
      JSON.stringify({
        error: "Baba não encontrado",
      }),
      {
        status: 404,
        headers: {
          ...CORS,
          "Content-Type": "application/json",
        },
      },
    );
  }

  const today = getBrazilToday();

  /**
   * Busca TODAS as partidas finalizadas de hoje.
   *
   * Não existe limite de quantidade de times.
   * Cada registro de partida possui:
   *
   * team_a_name x team_b_name
   */
  const { data: matches, error: matchesError } =
    await supabase
      .from("matches")
      .select(
        "team_a_name, team_b_name, team_a_score, team_b_score, status",
      )
      .eq("baba_id", baba_id)
      .eq("status", "finished")
      .gte(
        "match_date",
        `${today}T00:00:00-03:00`,
      )
      .lte(
        "match_date",
        `${today}T23:59:59-03:00`,
      );

  if (matchesError) {
    console.error(
      "[generate-daily-recap] matches error:",
      matchesError,
    );

    return new Response(
      JSON.stringify({
        error: "Erro ao buscar partidas do dia",
      }),
      {
        status: 500,
        headers: {
          ...CORS,
          "Content-Type": "application/json",
        },
      },
    );
  }

  const stats = computeDailyStats(matches || []);

  /**
   * Não gera recap se ainda não existe partida finalizada.
   */
  if (stats.totalMatches === 0) {
    return new Response(
      JSON.stringify({
        error:
          "Nenhuma partida finalizada hoje ainda",
      }),
      {
        status: 400,
        headers: {
          ...CORS,
          "Content-Type": "application/json",
        },
      },
    );
  }

  /**
   * Monta a classificação para o Gemini.
   */
  const statsText = `
Partidas finalizadas hoje: ${stats.totalMatches}

Gols no total: ${stats.totalGoals}

Quantidade de times que participaram das partidas: ${stats.standings.length}

Classificação do dia
(Pts = 3 por vitória, 1 por empate):

${stats.standings
  .map(
    (t: any, index: number) =>
      `${index + 1}. ${t.name}: ${t.Pts} pts (${t.V}V ${t.E}E ${t.D}D, ${t.GP} GP, ${t.GC} GC, saldo ${t.GP - t.GC})`,
  )
  .join("\n")}

Time(s) invicto(s) hoje:
${
  stats.unbeatenTeams.length
    ? stats.unbeatenTeams.join(", ")
    : "nenhum"
}

${
  stats.biggestWin
    ? `Maior goleada do dia: ${stats.biggestWin.winner} ${stats.biggestWin.score} em cima de ${stats.biggestWin.loser}`
    : "Não houve goleada registrada."
}
`.trim();

  /**
   * Prompt do Gemini.
   *
   * A regra de quantidade de times fica explícita:
   *
   * - podem existir 2, 3, 4, 5, 6, 7 ou quantos times forem necessários;
   * - cada partida é sempre entre dois times;
   * - o recap deve analisar o conjunto completo.
   */
  const prompt = `
Você é um narrador esportivo de futebol amador brasileiro ("baba").

Responda APENAS em português brasileiro informal e empolgante, como quem manda um áudio no grupo do WhatsApp contando como foi o dia.

Dados de HOJE no grupo "${baba.name}":

${statsText}

REGRAS IMPORTANTES SOBRE OS TIMES:

1. O baba pode ter QUALQUER quantidade de times.
2. Pode existir Time A, Time B, Time C, Time D, Time E, Time F, Time G ou quantos times forem necessários.
3. Cada PARTIDA individual envolve somente DOIS times.
4. Portanto, uma partida deve ser entendida como:
   "Time X x Time Y".
5. NÃO interprete o baba inteiro como se tivesse apenas dois times.
6. Analise a classificação completa e considere todos os times que aparecem nos dados.
7. O time que lidera deve ser identificado pela classificação fornecida.
8. O(s) invicto(s) devem ser identificados pelos dados fornecidos.
9. A maior goleada deve ser mencionada somente quando realmente existir.

Escreva um resumo curto, de 2 a 4 frases e no máximo 400 caracteres.

O resumo deve:
- comentar como foi o baba;
- destacar o time que mais se destacou;
- mencionar a liderança quando fizer sentido;
- mencionar a maior goleada quando fizer sentido;
- mencionar o(s) time(s) invicto(s) quando isso deixar o resumo melhor;
- ter linguagem natural, informal e empolgante;
- parecer uma mensagem enviada no grupo do baba.

IMPORTANTE:

Você só possui o placar final de cada partida.

NÃO invente:
- virada de placar;
- gol no começo ou no final;
- sequência dos gols;
- domínio durante a partida;
- empate técnico durante o jogo;
- jogador que fez gol;
- jogador destaque;
- acontecimentos que não estejam nos dados.

Fale SOMENTE sobre o que os dados realmente mostram.

Exemplo de estrutura de partida:
"Time B venceu o Time A por 2x0."

Nunca transforme a existência de vários times em uma única partida.

Retorne APENAS o texto do resumo, sem markdown, sem aspas e sem explicação.
`.trim();

  /**
   * Gera com Gemini.
   */
  let recapText = await generateRecapText(
    GEMINI_API_KEY,
    prompt,
  );

  /**
   * Fallback caso o Gemini falhe.
   */
  if (!recapText) {
    recapText = fallbackRecap(
      baba.name,
      stats,
    );
  }

  /**
   * Remove recap anterior do mesmo dia.
   */
  await supabase
    .from("ai_insights")
    .delete()
    .eq("baba_id", baba_id)
    .eq("type", "daily_recap")
    .gte(
      "generated_at",
      `${today}T00:00:00-03:00`,
    );

  /**
   * Validade até o final do dia.
   */
  const validUntil = new Date(
    `${today}T23:59:59-03:00`,
  );

  /**
   * Salva o novo recap.
   */
  const { error: insertErr } = await supabase
    .from("ai_insights")
    .insert([
      {
        baba_id,

        type: "daily_recap",

        content: recapText.substring(0, 500),

        metadata: stats,

        valid_until: validUntil.toISOString(),
      },
    ]);

  if (insertErr) {
    console.error(
      "[generate-daily-recap] insert error:",
      insertErr,
    );
  }

  /**
   * Resposta.
   */
  return new Response(
    JSON.stringify({
      ok: true,
      content: recapText,
      stats,
    }),
    {
      headers: {
        ...CORS,
        "Content-Type": "application/json",
      },
    },
  );
});