// supabase/functions/send-email/index.ts
// Fase 3C — Emails transacionais via Resend.
// Templates: boas-vindas, convite, confirmação de pagamento, recap mensal.
//
// Variáveis de ambiente (Supabase Dashboard → Edge Functions → Secrets):
//   RESEND_API_KEY   → chave da API Resend (re_xxxx)
//   FROM_EMAIL       → email remetente verificado no Resend (ex: noreply@gestao-baba.app)
//   APP_URL          → https://gestao-baba.vercel.app

import { serve }        from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z }            from "npm:zod@3.22.4";

const RESEND_KEY  = Deno.env.get("RESEND_API_KEY")           ?? "";
const FROM_EMAIL  = Deno.env.get("FROM_EMAIL")               ?? "noreply@gestao-baba.app";
const APP_URL     = Deno.env.get("APP_URL")                  ?? "https://gestao-baba.vercel.app";
const CRON_SECRET = Deno.env.get("CRON_SECRET")              ?? "";
const SVC_ROLE    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

const json = (data: unknown, s = 200) =>
  new Response(JSON.stringify(data), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

// ─── Schema Zod ───────────────────────────────────────────────────────────────

const EmailSchema = z.discriminatedUnion("template", [
  z.object({
    template:   z.literal("welcome"),
    to:         z.string().email(),
    name:       z.string().min(1),
  }),
  z.object({
    template:   z.literal("invite"),
    to:         z.string().email(),
    name:       z.string().min(1),
    baba_name:  z.string().min(1),
    invite_url: z.string().url(),
    inviter:    z.string().optional().default("Um amigo"),
  }),
  z.object({
    template:    z.literal("payment_confirmed"),
    to:          z.string().email(),
    name:        z.string().min(1),
    baba_name:   z.string().min(1),
    amount:      z.number().positive(),
    pix_key:     z.string().optional(),
  }),
  z.object({
    template:    z.literal("monthly_recap"),
    to:          z.string().email(),
    name:        z.string().min(1),
    baba_name:   z.string().min(1),
    goals:       z.number().int().min(0),
    assists:     z.number().int().min(0),
    matches:     z.number().int().min(0),
    wins:        z.number().int().min(0),
    streak:      z.number().int().min(0),
    top_scorer:  z.string().optional(),
  }),
  z.object({
    template:    z.literal("payment_reminder"),
    to:          z.string().email(),
    name:        z.string().min(1),
    baba_name:   z.string().min(1),
    amount:      z.number().positive(),
    due_date:    z.string(),
    pix_key:     z.string().optional(),
  }),
]);

type EmailPayload = z.infer<typeof EmailSchema>;

// ─── Templates HTML ───────────────────────────────────────────────────────────

const baseStyle = `
  font-family: 'Inter', Arial, sans-serif;
  background: #000;
  color: #fff;
  padding: 40px 20px;
  max-width: 600px;
  margin: 0 auto;
`;

const btnStyle = `
  display: inline-block;
  background: #00f2ff;
  color: #000;
  font-weight: 900;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 2px;
  text-decoration: none;
  padding: 14px 32px;
  border-radius: 50px;
  margin: 24px 0;
`;

const cardStyle = `
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 20px;
  padding: 24px;
  margin: 16px 0;
`;

const footer = `
  <p style="color:rgba(255,255,255,0.3);font-size:11px;margin-top:40px;text-align:center;">
    Draft Play · Gestão de Baba<br>
    <a href="${APP_URL}/privacidade" style="color:#00f2ff;">Privacidade</a> ·
    <a href="${APP_URL}/termos" style="color:#00f2ff;">Termos</a>
  </p>
`;

const templates: Record<string, (p: EmailPayload) => { subject: string; html: string }> = {
  welcome: (p: any) => ({
    subject: `Bem-vindo ao Draft Play, ${p.name}! ⚽`,
    html: `<div style="${baseStyle}">
      <h1 style="color:#00f2ff;font-size:28px;font-weight:900;">⚽ Bem-vindo ao Draft Play!</h1>
      <p>Olá, <strong>${p.name}</strong>!</p>
      <p>Sua conta foi criada com sucesso. Agora você pode gerenciar seu baba, sortear times e acompanhar rankings.</p>
      <div style="${cardStyle}">
        <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.7);">🎲 Sorteio balanceado por avaliação<br>📊 Rankings e estatísticas em tempo real<br>💰 Controle financeiro integrado</p>
      </div>
      <a href="${APP_URL}" style="${btnStyle}">Entrar no app</a>
      ${footer}
    </div>`,
  }),

  invite: (p: any) => ({
    subject: `${p.inviter} te convidou para o baba ${p.baba_name}! ⚽`,
    html: `<div style="${baseStyle}">
      <h1 style="color:#00f2ff;font-size:24px;font-weight:900;">Convite para o Baba!</h1>
      <p>Olá, <strong>${p.name}</strong>!</p>
      <p><strong>${p.inviter}</strong> te convidou para participar do <strong>${p.baba_name}</strong> no Draft Play.</p>
      <div style="${cardStyle}">
        <p style="margin:0;color:rgba(255,255,255,0.7);font-size:13px;">Confirme presenças, veja o sorteio dos times e acompanhe seu desempenho — tudo em um lugar.</p>
      </div>
      <a href="${p.invite_url}" style="${btnStyle}">Aceitar convite</a>
      <p style="color:rgba(255,255,255,0.4);font-size:11px;">Link válido por 7 dias.</p>
      ${footer}
    </div>`,
  }),

  payment_confirmed: (p: any) => ({
    subject: `Pagamento confirmado — ${p.baba_name} ✅`,
    html: `<div style="${baseStyle}">
      <h1 style="color:#39ff14;font-size:24px;font-weight:900;">✅ Pagamento Confirmado!</h1>
      <p>Olá, <strong>${p.name}</strong>!</p>
      <p>Seu pagamento para o <strong>${p.baba_name}</strong> foi confirmado.</p>
      <div style="${cardStyle}">
        <p style="margin:0;font-size:20px;font-weight:900;color:#00f2ff;">R$ ${Number(p.amount).toFixed(2).replace('.',',')}</p>
        <p style="margin:4px 0 0;color:rgba(255,255,255,0.5);font-size:12px;">Pago via PIX</p>
      </div>
      <a href="${APP_URL}/financial" style="${btnStyle}">Ver financeiro</a>
      ${footer}
    </div>`,
  }),

  payment_reminder: (p: any) => ({
    subject: `Lembrete: mensalidade do ${p.baba_name} vence em breve 💳`,
    html: `<div style="${baseStyle}">
      <h1 style="color:#ffbd00;font-size:24px;font-weight:900;">💳 Lembrete de Pagamento</h1>
      <p>Olá, <strong>${p.name}</strong>!</p>
      <p>A mensalidade do <strong>${p.baba_name}</strong> vence em <strong>${p.due_date}</strong>.</p>
      <div style="${cardStyle}">
        <p style="margin:0;font-size:20px;font-weight:900;color:#ffbd00;">R$ ${Number(p.amount).toFixed(2).replace('.',',')}</p>
        ${p.pix_key ? `<p style="margin:8px 0 0;color:rgba(255,255,255,0.5);font-size:12px;">PIX: ${p.pix_key}</p>` : ''}
      </div>
      <a href="${APP_URL}/financial" style="${btnStyle}">Pagar agora</a>
      ${footer}
    </div>`,
  }),

  monthly_recap: (p: any) => ({
    subject: `Seu mês no baba ${p.baba_name} ⚽📊`,
    html: `<div style="${baseStyle}">
      <h1 style="color:#00f2ff;font-size:24px;font-weight:900;">📊 Recap do Mês</h1>
      <p>Olá, <strong>${p.name}</strong>! Veja seu desempenho no <strong>${p.baba_name}</strong> este mês:</p>
      <div style="${cardStyle}">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:rgba(255,255,255,0.6);">⚽ Gols</td><td style="text-align:right;font-weight:900;color:#fff;">${p.goals}</td></tr>
          <tr><td style="padding:8px 0;color:rgba(255,255,255,0.6);">🎯 Assistências</td><td style="text-align:right;font-weight:900;color:#fff;">${p.assists}</td></tr>
          <tr><td style="padding:8px 0;color:rgba(255,255,255,0.6);">🏟️ Partidas</td><td style="text-align:right;font-weight:900;color:#fff;">${p.matches}</td></tr>
          <tr><td style="padding:8px 0;color:rgba(255,255,255,0.6);">🏆 Vitórias</td><td style="text-align:right;font-weight:900;color:#fff;">${p.wins}</td></tr>
          ${p.streak > 0 ? `<tr><td style="padding:8px 0;color:rgba(255,255,255,0.6);">🔥 Sequência</td><td style="text-align:right;font-weight:900;color:#00f2ff;">${p.streak} jogos</td></tr>` : ''}
        </table>
      </div>
      ${p.top_scorer ? `<p style="color:rgba(255,255,255,0.5);font-size:12px;">🥇 Artilheiro do mês: <strong style="color:#fff;">${p.top_scorer}</strong></p>` : ''}
      <a href="${APP_URL}/rankings" style="${btnStyle}">Ver rankings</a>
      ${footer}
    </div>`,
  }),
};

// ─── Envio via Resend API ─────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_KEY) {
    console.warn("[send-email] RESEND_API_KEY não configurado");
    return false;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_KEY}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      from:    `Draft Play <${FROM_EMAIL}>`,
      to:      [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("[send-email] Resend error:", res.status, err);
    return false;
  }
  return true;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const auth  = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token !== CRON_SECRET && token !== SVC_ROLE) {
    return json({ error: "Unauthorized" }, 401);
  }

  let payload: EmailPayload;
  try {
    const raw = await req.json();
    payload   = EmailSchema.parse(raw);
  } catch (err) {
    const issues = err instanceof z.ZodError ? err.flatten().fieldErrors : String(err);
    return json({ error: "Payload inválido", issues }, 400);
  }

  const tmpl = templates[payload.template];
  if (!tmpl) return json({ error: `Template '${payload.template}' não encontrado` }, 400);

  const { subject, html } = tmpl(payload);
  const ok = await sendEmail(payload.to, subject, html);

  return json({ ok, template: payload.template, to: payload.to });
});
