// scripts/test-and-report.mjs
// Roda os testes + gera o relatório HTML em um único comando
// Uso: node scripts/test-and-report.mjs [--coverage] [--open]

import { execSync, spawnSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '..');

const args      = process.argv.slice(2);
const withCover = args.includes('--coverage') || args.includes('-c');
const openAfter = args.includes('--open')     || args.includes('-o');

// ─── Garantir que as pastas existem ──────────────────────────────────────────
for (const dir of ['test-results', 'coverage']) {
  const p = resolve(ROOT, dir);
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

// ─── Rodar Vitest ─────────────────────────────────────────────────────────────
const cmd = withCover ? 'npm run test:coverage' : 'npm test';

console.log('\n🧪 Rodando testes...\n');
console.log(`   Comando: ${cmd}\n`);

const result = spawnSync(cmd, {
  shell:  true,
  cwd:    ROOT,
  stdio:  'inherit',
  env:    { ...process.env, CI: 'true' }, // ativa JUnit reporter
});

const testsFailed = result.status !== 0;

// ─── Gerar relatório ──────────────────────────────────────────────────────────
console.log('\n📄 Gerando relatório HTML...\n');

try {
  execSync('node scripts/generate-report.mjs', { cwd: ROOT, stdio: 'inherit' });
} catch (err) {
  console.error('❌ Erro ao gerar relatório:', err.message);
  process.exit(1);
}

// ─── Abrir no browser (opcional) ─────────────────────────────────────────────
const reportPath = resolve(ROOT, 'test-report.html');

if (openAfter && existsSync(reportPath)) {
  const opener =
    process.platform === 'win32'  ? `start "" "${reportPath}"` :
    process.platform === 'darwin' ? `open "${reportPath}"` :
    `xdg-open "${reportPath}"`;

  try {
    execSync(opener, { shell: true });
    console.log('🌐 Relatório aberto no browser.\n');
  } catch {
    console.log(`🌐 Abra manualmente: ${reportPath}\n`);
  }
} else if (!openAfter) {
  console.log(`📁 Relatório salvo em: ${reportPath}`);
  console.log('   Dica: use --open para abrir automaticamente no browser.\n');
}

// ─── Exit code correto ────────────────────────────────────────────────────────
process.exit(testsFailed ? 1 : 0);
