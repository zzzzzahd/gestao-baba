// supabase/functions/send-push/index.ts
// Fase 1.4 + 3 — Envia Web Push com validação Zod + dedup via notification_log.

import { serve }       from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush          from "npm:web-push@3.6.7";
import { z }            from "npm:zod@3.22.4";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

// ─── Schema Zod ───────────────────────────────────────────────────────────────

const PushPayloadSchema = z.object({
  user_ids:   z.array(z.string().uuid()).min(1, "Pelo menos 1 user_id"),
  title:      z.string().min(1).max(100),
  body:       z.string().min(1).max(255),
  url:        z.string().url().optional().default("/"),
  // Campos opcionais para dedup no notification_log
  baba_id:    z.string().uuid().optional(),
  evt_type:   z.string().max(64).optional(),
  ref_id:     z.string().uuid().optional(),
});

type PushPayload = z.infer<typeof PushPayloadSchema>;

// ─── Helper: resposta JSON ────────────────────────────────────────────────────

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

// ─── Handler ─────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // Auth: Bearer = CRON_SECRET (chamada interna) ou service_role
  const auth       = req.headers.get("Authorization") ?? "";
  const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
  const svcRole    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const token      = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (token !== cronSecret && token !== svcRole) {
    return json({ error: "Unauthorized" }, 401);
  }

  // Parse + validação Zod
  let payload: PushPayload;
  try {
    const raw = await req.json();
    payload   = PushPayloadSchema.parse(raw);
  } catch (err) {
    const issues = err instanceof z.ZodError ? err.flatten().fieldErrors : String(err);
    return json({ error: "Payload inválido", issues }, 400);
  }

  const { user_ids, title, body, url, baba_id, evt_type, ref_id } = payload;

  // Config VAPID
  webpush.setVapidDetails(
    "mailto:" + (Deno.env.get("VAPID_EMAIL") ?? "admin@gestao-baba.app"),
    Deno.env.get("VAPID_PUBLIC_KEY")  ?? "",
    Deno.env.get("VAPID_PRIVATE_KEY") ?? "",
  );

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    svcRole,
  );

  // Busca subscriptions ativas
  const { data: subs, error: subErr } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, user_id")
    .in("user_id", user_ids)
    .eq("is_active", true);

  if (subErr) {
    console.error("[send-push] buscar subs:", subErr.message);
    return json({ error: subErr.message }, 500);
  }

  if (!subs?.length) {
    return json({ sent: 0, skipped: 0, removed: 0, message: "Sem subscriptions ativas" });
  }

  const pushPayload = JSON.stringify({ title, body, url, icon: "/icons/icon-192x192.png" });
  const staleIds:   string[] = [];
  const sentUserIds: string[] = [];
  let sent    = 0;
  let skipped = 0;

  await Promise.allSettled(
    subs.map(async (sub) => {
      // Dedup: já foi notificado hoje para este evento?
      if (baba_id && evt_type && ref_id) {
        const { data: alreadySent } = await supabase.rpc("was_notified_today", {
          p_user_id:  sub.user_id,
          p_evt_type: evt_type,
          p_ref_id:   ref_id,
          p_channel:  "push",
        });
        if (alreadySent) { skipped++; return; }
      }

      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          pushPayload,
          { TTL: 86400 },
        );
        sent++;
        sentUserIds.push(sub.user_id);
      } catch (err: any) {
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          staleIds.push(sub.id);
        }
        console.error("[send-push] falha:", sub.endpoint, err?.statusCode);
      }
    }),
  );

  // Remover subscriptions inválidas
  if (staleIds.length > 0) {
    await supabase.from("push_subscriptions")
      .update({ is_active: false })
      .in("id", staleIds);
  }

  // Registrar no notification_log (só se dedup configurado)
  if (baba_id && evt_type && sentUserIds.length > 0) {
    const logRows = sentUserIds.map(uid => ({
      baba_id,
      user_id:  uid,
      channel:  "push",
      evt_type,
      ref_id:   ref_id ?? null,
      nstatus:  "sent",
    }));
    await supabase.from("notification_log").insert(logRows).onConflict?.(() => {});
  }

  return json({ sent, skipped, removed: staleIds.length });
});
