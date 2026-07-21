#!/usr/bin/env bash
# setup-tests.sh — configura testes do Draft Play (Linux/macOS/Git Bash)
# Uso: bash setup-tests.sh

set -e

echo "🧪 Configurando testes do Draft Play..."
echo ""

# 1. Dependências
echo "📦 Instalando dependências do projeto..."
npm install

echo "🌐 Instalando navegador Chromium (Playwright)..."
npx playwright install chromium

# 2. .env
if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    cp .env.example .env
    echo "✅ Arquivo .env criado a partir de .env.example"
    echo "   → Edite o .env com suas chaves do Supabase"
  else
    echo "⚠️  .env.example não encontrado"
  fi
else
  echo "ℹ️  .env já existe — mantido"
fi

# 3. Pastas
mkdir -p test-results coverage e2e
echo "✅ Pastas de teste ok"
echo ""

echo "🎉 Pronto! Comandos úteis:"
echo "   npm test              → testes unitários"
echo "   npm run test:e2e      → testes E2E no navegador"
echo "   npm run test:coverage → cobertura"
echo "   npm run test:all      → unitários + E2E"
echo "   npm run dev           → app em http://localhost:3000"
echo ""
echo "📖 Guia: GUIA-TESTES.md"
echo "✅ Checklist: CHECKLIST-TESTES.md"
