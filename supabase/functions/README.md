# Edge Functions

Estas funções existem implantadas no projeto `App - Baba`. As três primeiras
foram trazidas da produção para o repositório pela auditoria (23/10/2026), com
o conteúdo idêntico ao implantado (delete-account v6, create-mp-preference v4,
mercadopago-webhook v5).

| Função | verify_jwt em produção | Observações |
|---|---|---|
| `delete-account` | true | Anonimiza dados (LGPD) e grava em `audit_log`. |
| `create-mp-preference` | true | Cria a preferência do Mercado Pago. Usa `MP_ACCESS_TOKEN`. |
| `mercadopago-webhook` | **false** | Autenticada por assinatura HMAC (`MP_WEBHOOK_SECRET`). Ao reimplantar, **use `--no-verify-jwt`**, senão o webhook deixa de funcionar. |

Não há `supabase/config.toml`; o `verify_jwt` de cada função é configurado no
deploy. As demais funções (`auto-draw`, `send-push`, `send-reminders`,
`generate-insights`, `narrate-match`, `generate-daily-recap`) já estavam aqui.
`process-payment` e `send-email` estão no repositório, mas **não** implantadas
(ver auditoria, DP-AUD-010).
