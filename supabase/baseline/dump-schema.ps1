# Gera um dump somente de schema (sem dados) do projeto Supabase vinculado.
# Pré-requisitos: Supabase CLI instalada e `supabase login` + `supabase link`.
$ErrorActionPreference = 'Stop'
$stamp = Get-Date -Format 'yyyyMMdd'
$out = Join-Path $PSScriptRoot "schema_$stamp.sql"
supabase db dump --schema public --file $out
Write-Host "Schema salvo em $out. Revise antes de commitar (sem segredos, sem dados)."
