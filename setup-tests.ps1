# setup-tests.ps1 — configura testes do Draft Play (Windows PowerShell)
# Uso: .\setup-tests.ps1

$ErrorActionPreference = "Stop"

Write-Host "Configurando testes do Draft Play..." -ForegroundColor Cyan
Write-Host ""

Write-Host "Instalando dependencias do projeto..."
npm install

Write-Host "Instalando navegador Chromium (Playwright)..."
npx playwright install chromium

if (-not (Test-Path ".env")) {
  if (Test-Path ".env.example") {
    Copy-Item ".env.example" ".env"
    Write-Host "Arquivo .env criado a partir de .env.example" -ForegroundColor Green
    Write-Host "  -> Edite o .env com suas chaves do Supabase"
  } else {
    Write-Host ".env.example nao encontrado" -ForegroundColor Yellow
  }
} else {
  Write-Host ".env ja existe — mantido"
}

New-Item -ItemType Directory -Force -Path "test-results", "coverage", "e2e" | Out-Null
Write-Host "Pastas de teste ok" -ForegroundColor Green
Write-Host ""

Write-Host "Pronto! Comandos uteis:" -ForegroundColor Cyan
Write-Host "   npm test              -> testes unitarios"
Write-Host "   npm run test:e2e      -> testes E2E no navegador"
Write-Host "   npm run test:coverage -> cobertura"
Write-Host "   npm run test:all      -> unitarios + E2E"
Write-Host "   npm run dev           -> app em http://localhost:3000"
Write-Host ""
Write-Host "Guia: GUIA-TESTES.md"
Write-Host "Checklist: CHECKLIST-TESTES.md"
