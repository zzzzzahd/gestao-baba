// supabase/functions/process-payment/index.ts
// Fase 3B — Integração Mercado Pago: gera cobrança PIX e recebe webhook.
//
// Variáveis de ambiente necessárias (configurar no Supabase Dashboard):
//   MP_ACCESS_TOKEN       → Token de produção do Mercado Pago
//   MP_WEBHOOK_SECRET     → Secret para validar webhooks (MP usa HMAC-SHA256)
//   CRON_SECRET           → Para chamadas internas
//   SUPABASE_URL          → Automático
//   SUPABASE_SERVICE_ROLE_KEY → Automático

import { serve }        from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z }            from "npm:zod@3.22.4";
import { crypto }       from "https://deno.land/std@0.177.0/crypto/mod.ts";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-signature, x-request-id",
};

const MP_API    = "https://api.mercadopago.com";
const SUPABASE  = createClient(
  Deno.env.get("SUPABASE_URL")              ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);
const MP_TOKEN  = Deno.env.get("MP_ACCESS_TOKEN")   ?? "";
const WH_SECRET = Deno.env.get("MP_WEBHOOK_SECRET") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET")     ?? "";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

// ─── Schemas Zod ─────────────────────────────────────────────────────────────

const CreatePixSchema = z.object({
  action:       z.literal("create_pix"),
  intent_id:    z.string().uuid(),             // payment_intents.id existente
  payer_email:  z.string().email(),
  payer_name:   z.string().min(1).max(100),
  description:  z.string().max(255).optional().default("Mensalidade baba"),
});

const WebhookSchema = z.object({
  action:   z.string(),                        // "payment.updated" | "payment.created"
  type:     z.string(),                        // "payment"
  data:     z.object({ id: z.union([z.string(), z.number()]) }),
});

// ─── Verificar assinatura HMAC do webhook ─────────────────────────────────────

async function verifyWebhookSignature(
  req: Request,
  body: string,
): Promise<boolean> {
  if (!WH_SECRET) return true; // skip em dev
  const sig       = req.headers.get("x-signature") ?? "";
  const requestId = req.headers.get("x-request-id") ?? "";
  // MP formato: "ts=<timestamp>,v1=<hash>"
  const parts     = Object.fromEntries(sig.split(",").map(p => p.split("=")));
  const ts        = parts["ts"] ?? "";
  const v1        = parts["v1"] ?? "";

  const manifest = `id:${(JSON.parse(body)?.data?.id ?? "")};request-id:${requestId};ts:${ts};`;
  const key       = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(WH_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signedBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
  const signed    = Array.from(new Uint8Array(signedBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
  return signed === v1;
}

// ─── Criar cobrança PIX no Mercado Pago ──────────────────────────────────────

async function createPixPayment(intent: Record<string, unknown>, payer: { email: string; name: string }, description: string) {
  const payload = {
    transaction_amount: Number(intent.amount),
    description,
    payment_method_id: "pix",
    payer: {
      email:          payer.email,
      first_name:     payer.name.split(" ")[0],
      last_name:      payer.name.split(" ").slice(1).join(" ") || "-",
      identification: { type: "CPF", number: "00000000000" }, // anônimo; coletar CPF real p/ produção
    },
    notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/process-payment`,
    metadata: {
      intent_id: intent.id,
      baba_id:   intent.baba_id,
      player_id: intent.player_id,
    },
    expires: true,
    date_of_expiration: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
  };

  const res  = await fetch(`${MP_API}/v1/payments`, {
    method:  "POST",
    headers: {
      "Authorization":   `Bearer ${MP_TOKEN}`,
      "Content-Type":    "application/json",
      "X-Idempotency-Key": String(intent.id),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`MP error ${res.status}: ${JSON.stringify(err)}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const bodyText = await req.text();
  let body: unknown;
  try { body = JSON.parse(bodyText); }
  catch { return json({ error: "JSON inválido" }, 400); }

  // ── 1. Webhook do Mercado Pago ────────────────────────────────────────────
  const isWebhook = req.headers.has("x-signature") || (body as any)?.type === "payment";
  if (isWebhook) {
    const valid = await verifyWebhookSignature(req, bodyText);
    if (!valid) return json({ error: "Assinatura inválida" }, 401);

    let wh: z.infer<typeof WebhookSchema>;
    try { wh = WebhookSchema.parse(body); }
    catch (e) { return json({ error: "Webhook inválido", detail: String(e) }, 400); }

    if (wh.type !== "payment") return json({ ok: true, skipped: true });

    // Consultar pagamento no MP para obter status atual
    const mpRes = await fetch(`${MP_API}/v1/payments/${wh.data.id}`, {
      headers: { Authorization: `Bearer ${MP_TOKEN}` },
    });
    if (!mpRes.ok) return json({ error: "Falha ao consultar MP" }, 502);

    const mpPayment = await mpRes.json() as Record<string, unknown>;
    const mpStatus  = String(mpPayment.status);
    const intentId  = String((mpPayment.metadata as any)?.intent_id ?? "");

    // Mapear status MP → nosso status
    const statusMap: Record<string, string> = {
      approved:    "paid",
      pending:     "pending",
      in_process:  "processing",
      rejected:    "failed",
      cancelled:   "cancelled",
      refunded:    "refunded",
    };
    const ourStatus = statusMap[mpStatus] ?? "pending";

    // Chamar nosso webhook handler no banco
    const { data, error } = await SUPABASE.rpc("handle_payment_webhook", {
      p_provider_id: String(wh.data.id),
      p_status:      ourStatus,
      p_provider:    "mercadopago",
      p_metadata:    {
        mp_status:       mpStatus,
        mp_detail:       mpPayment.status_detail,
        mp_payment_id:   wh.data.id,
        pix_qr_code:     (mpPayment.point_of_interaction as any)?.transaction_data?.qr_code ?? null,
      },
    });

    if (error) console.error("[process-payment] handle_payment_webhook:", error);

    // Se pago, notificar o jogador
    if (ourStatus === "paid" && intentId) {
      const { data: intent } = await SUPABASE
        .from("payment_intents")
        .select("baba_id, player_id, player:players(user_id, baba:babas(name))")
        .eq("id", intentId)
        .single();

      const userId  = (intent as any)?.player?.user_id;
      const babaName = (intent as any)?.player?.baba?.name ?? "baba";

      if (userId) {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${CRON_SECRET}` },
          body:   JSON.stringify({
            user_ids: [userId],
            title:    "✅ Pagamento confirmado!",
            body:     `Seu pagamento para o ${babaName} foi confirmado.`,
            url:      "/financial",
            baba_id:  (intent as any)?.baba_id,
            evt_type: "payment_confirmed",
            ref_id:   intentId,
          }),
        }).catch(e => console.error("[process-payment] push fail:", e));
      }
    }

    return json({ ok: true, status: ourStatus });
  }

  // ── 2. Ação manual: criar PIX ─────────────────────────────────────────────
  const auth  = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return json({ error: "Unauthorized" }, 401);

  // Validar token (usuário autenticado via JWT ou cron)
  const { data: { user }, error: authErr } = await SUPABASE.auth.getUser(token);
  const isServiceCall = token === CRON_SECRET || token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (authErr && !isServiceCall) return json({ error: "Unauthorized" }, 401);

  let payload: z.infer<typeof CreatePixSchema>;
  try { payload = CreatePixSchema.parse(body); }
  catch (e) {
    const issues = e instanceof z.ZodError ? e.flatten().fieldErrors : String(e);
    return json({ error: "Payload inválido", issues }, 400);
  }

  // Buscar payment_intent
  const { data: intent, error: iErr } = await SUPABASE
    .from("payment_intents")
    .select("*")
    .eq("id", payload.intent_id)
    .eq("status", "pending")
    .single();

  if (iErr || !intent) return json({ error: "Intent não encontrado ou já processado" }, 404);

  // Verificar que o usuário é o dono (ou admin)
  if (!isServiceCall) {
    const { data: pl } = await SUPABASE
      .from("players")
      .select("user_id")
      .eq("id", intent.player_id)
      .single();
    if (pl?.user_id !== user?.id) return json({ error: "Acesso negado" }, 403);
  }

  // Criar pagamento no Mercado Pago
  let mpPayment: Record<string, unknown>;
  try {
    mpPayment = await createPixPayment(
      intent,
      { email: payload.payer_email, name: payload.payer_name },
      payload.description,
    );
  } catch (err) {
    console.error("[process-payment] createPix:", err);
    return json({ error: "Falha ao gerar PIX", detail: String(err) }, 502);
  }

  const qrCode      = (mpPayment.point_of_interaction as any)?.transaction_data?.qr_code ?? null;
  const qrCodeBase64 = (mpPayment.point_of_interaction as any)?.transaction_data?.qr_code_base64 ?? null;
  const mpId        = String(mpPayment.id);

  // Atualizar intent com dados do MP
  await SUPABASE
    .from("payment_intents")
    .update({
      provider:    "mercadopago",
      provider_id: mpId,
      status:      "processing",
      pix_qr_code: qrCode,
      expires_at:  new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      metadata:    { mp_payment_id: mpId, qr_code_base64: qrCodeBase64 },
    })
    .eq("id", payload.intent_id);

  return json({
    ok:             true,
    payment_id:     mpId,
    pix_qr_code:    qrCode,
    pix_qr_base64:  qrCodeBase64,
    expires_at:     new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    amount:         intent.amount,
    status:         "processing",
  });
});
