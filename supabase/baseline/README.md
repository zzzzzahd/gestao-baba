# Baseline do schema (Supabase `App - Baba`)

O banco de produção tem 85 migrations aplicadas e o repositório só 4 em
`supabase/migrations/`. Isto torna o repositório incapaz de recriar o banco
(achado DP-AUD-009 da auditoria).

Este diretório guarda um **instantâneo de referência** do schema atual. Ele é
**somente documentação/restauração**: não é uma migration e não deve ser
aplicado em produção.

## Como gerar (feito pelo responsável, com credenciais próprias)

No PowerShell, na raiz do projeto, com a Supabase CLI instalada e logada:

    .\supabase\baseline\dump-schema.ps1

O script gera `supabase/baseline/schema_YYYYMMDD.sql` com `supabase db dump`
(apenas schema, **sem dados**). Revise o arquivo antes de commitar: ele não
deve conter chaves, tokens nem dados de usuários.

## Por que não foi gerado pela auditoria

A auditoria só tem acesso de leitura ao catálogo via consultas. Reconstruir
~58 tabelas, ~100 funções, policies, índices e triggers à mão arrisca omitir
algo e dar falsa sensação de backup. O `supabase db dump` é o método
fiel e reproduzível.
