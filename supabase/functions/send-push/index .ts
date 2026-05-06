// supabase/functions/send-push/index.ts
// Sprint 9.1b — Envia Web Push para uma lista de subscriptions.
// Chamada internamente por send-reminders e pelo trigger de promoção de waitlist.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // Validar Bearer token (cron ou chamada interna)
  const auth = req.headers.get("Authorization") ?? "";
  const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
  if (!auth.startsWith("Bearer ") || auth.slice(7) !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const { user_ids, title, body, url = "/" }: {
    user_ids: string[];
    title: string;
    body: string;
    url?: string;
  } = await req.json();

  if (!user_ids?.length || !title || !body) {
    return new Response(JSON.stringify({ error: "Missing fields" }), {
      status: 400,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  // Configurar VAPID
  webpush.setVapidDetails(
    "mailto:" + (Deno.env.get("VAPID_EMAIL") ?? "admin@gestao-baba.app"),
    Deno.env.get("VAPID_PUBLIC_KEY") ?? "",
    Deno.env.get("VAPID_PRIVATE_KEY") ?? "",
  );

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  // Busca todas as subscriptions dos usuários
  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("user_id", user_ids);

  if (error || !subs?.length) {
    return new Response(JSON.stringify({ sent: 0, error: error?.message }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const payload = JSON.stringify({ title, body, url });
  const staleIds: string[] = [];
  let sent = 0;

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { TTL: 86400 },
        );
        sent++;
      } catch (err: any) {
        // 410 Gone = subscription inválida → remover
        if (err?.statusCode === 410) {
          staleIds.push(sub.id);
        }
        console.error("[send-push] error for", sub.endpoint, err?.statusCode);
      }
    }),
  );

  // Limpar subscriptions inválidas
  if (staleIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", staleIds);
  }

  return new Response(
    JSON.stringify({ sent, removed: staleIds.length }),
    { headers: { ...CORS, "Content-Type": "application/json" } },
  );
});
