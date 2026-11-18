import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, baggage, sentry-trace, x-signature, x-request-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

async function verifySignature(req: Request, dataId: string): Promise<boolean> {
  const secret = Deno.env.get("MP_WEBHOOK_SECRET");
  if (!secret) return false;

  const signatureHeader = req.headers.get("x-signature");
  const requestId = req.headers.get("x-request-id");
  if (!signatureHeader || !requestId) return false;

  const parts: Record<string, string> = {};
  for (const p of signatureHeader.split(",")) {
    const [k, v] = p.split("=");
    if (k && v) parts[k.trim()] = v.trim();
  }
  const ts = parts["ts"];
  const hash = parts["v1"];
  if (!ts || !hash) return false;

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
  const computedHash = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computedHash === hash;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const dataIdFromQuery = url.searchParams.get("data.id") || url.searchParams.get("id");

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // algumas notificacoes chegam so via query params
    }

    const paymentId = body?.data?.id || dataIdFromQuery;
    if (!paymentId) {
      return new Response(JSON.stringify({ error: "no payment id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validSignature = await verifySignature(req, String(paymentId));
    if (!validSignature) {
      return new Response(JSON.stringify({ error: "invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = Deno.env.get("MP_ACCESS_TOKEN")!;
    const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const payment = await paymentRes.json();

    if (!paymentRes.ok) {
      return new Response(JSON.stringify({ error: "failed to fetch payment", details: payment }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payment.status !== "approved") {
      return new Response(JSON.stringify({ received: true, status: payment.status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = payment.metadata?.user_id;
    const packageId = payment.metadata?.package_id;
    if (!userId || !packageId) {
      return new Response(JSON.stringify({ error: "missing metadata on payment" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: pkg } = await supabase
      .from("dp_packages")
      .select("*")
      .eq("id", packageId)
      .single();

    if (!pkg) {
      return new Response(JSON.stringify({ error: "package not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const totalDp = pkg.dp_amount + pkg.bonus_dp;

    // credit_dp e atomico: insere a transacao (mp_payment_id UNIQUE garante idempotencia)
    // e atualiza o saldo na mesma operacao. Se o pagamento ja foi processado antes,
    // o insert falha por violacao de unique e devolvemos "already_processed".
    const { error: creditError } = await supabase.rpc("credit_dp", {
      p_user_id: userId,
      p_amount: totalDp,
      p_type: "purchase",
      p_description: `Compra: ${pkg.name}`,
      p_package_id: pkg.id,
      p_mp_payment_id: String(paymentId),
    });

    if (creditError) {
      if (creditError.code === "23505") {
        return new Response(JSON.stringify({ received: true, already_processed: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw creditError;
    }

    return new Response(JSON.stringify({ received: true, credited: totalDp }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
