// video-demo/demo-config.js
// ─────────────────────────────────────────────────────────────────────────────
// Configuração central do gravador de vídeo promocional do Draft Play.
// Não mexe em nada do app nem dos testes E2E — é usado só pelo
// e2e-video-demo.js.
// ─────────────────────────────────────────────────────────────────────────────

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..'); // raiz do projeto (video-demo/ fica um nível abaixo)

// ── Carrega .env.local / .env manualmente ────────────────────────────────
// IMPORTANTE: isso aqui é um script Node puro (rodado com `node`, fora do
// Vite) — o Vite carrega .env.local sozinho para `npm run dev`/`build`,
// mas um script `node` avulso NÃO faz isso automaticamente. Por isso este
// parser mínimo existe, sem depender de nenhuma lib nova no projeto.
// Trata corretamente valores entre aspas (ex: senha com "#" dentro).
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;

    const key = line.slice(0, eqIdx).trim().replace(/^export\s+/, '');
    let value = line.slice(eqIdx + 1).trim();

    // Aspas simples ou duplas — remove as aspas e NÃO corta em '#' interno.
    const quoted = value.match(/^"([\s\S]*)"$/) || value.match(/^'([\s\S]*)'$/);
    if (quoted) {
      value = quoted[1];
    } else {
      // Sem aspas: tudo depois de um '#' (comentário) é descartado.
      const hashIdx = value.indexOf('#');
      if (hashIdx !== -1) value = value.slice(0, hashIdx).trim();
    }

    // Não sobrescreve variáveis já definidas no ambiente (ex: exportadas no
    // terminal) — mesmo comportamento padrão do dotenv.
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

// .env.local tem prioridade; .env serve de fallback — mesma ordem do Vite.
loadEnvFile(path.join(PROJECT_ROOT, '.env.local'));
loadEnvFile(path.join(PROJECT_ROOT, '.env'));

// ── Credenciais e ambiente ─────────────────────────────────────────────────
// Reaproveita exatamente o padrão já usado em screenshots-playstore.js e nos
// testes (TEST_EMAIL / TEST_PASSWORD / BASE_URL). Se preferir uma conta de
// demonstração separada, defina DEMO_EMAIL / DEMO_PASSWORD no .env.local —
// eles têm prioridade.
export const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
export const EMAIL    = process.env.DEMO_EMAIL    || process.env.TEST_EMAIL    || '';
export const PASSWORD = process.env.DEMO_PASSWORD || process.env.TEST_PASSWORD || '';

// ── Login via Supabase Admin (pula o captcha) ────────────────────────────────
// Reaproveita as mesmas VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY que
// o app já usa (o front-end e este script apontam pro mesmo projeto). A
// SERVICE_ROLE_KEY é só sua, local, nunca commitada — pegue em
// Supabase → Project Settings → API → service_role.
export const SUPABASE_URL         = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
export const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
export const SUPABASE_ANON_KEY    = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

// ── Velocidade da demonstração ──────────────────────────────────────────────
// Controla TODAS as pausas do roteiro a partir de um único lugar.
// Valores possíveis: 'slow' | 'normal' | 'fast'
export const DEMO_SPEED = process.env.DEMO_SPEED || 'normal';

const SPEED_MULTIPLIER = {
  slow:   1.6,
  normal: 1,
  fast:   0.55,
};

export const SPEED = SPEED_MULTIPLIER[DEMO_SPEED] ?? 1;

// ── Formato do vídeo ────────────────────────────────────────────────────────
// 'vertical' → 1080x1920 (Reels / TikTok / Shorts)
// 'desktop'  → 1920x1080 (YouTube / site)
export const VIDEO_FORMAT = process.env.VIDEO_FORMAT || 'vertical';

export const VIEWPORTS = {
  // IMPORTANTE: o Playwright grava o vídeo no tamanho da viewport em pixels
  // de CSS — ele NÃO multiplica pelo deviceScaleFactor. Se a viewport for
  // menor que RECORD_SIZE, o vídeo final fica com uma borda cinza sólida
  // preenchendo o espaço sobrando (foi exatamente o que causou aquela área
  // acinzentada/"estourada" no vídeo — não era brilho, era preenchimento).
  // Por isso a viewport aqui é IDÊNTICA ao RECORD_SIZE.
  vertical: { width: 1080, height: 1920 },
  desktop:  { width: 1920, height: 1080 },
};

export const RECORD_SIZE = {
  vertical: { width: 1080, height: 1920 },
  desktop:  { width: 1920, height: 1080 },
};

// ── Roteiro configurável ─────────────────────────────────────────────────────
// Liga/desliga cenas sem editar o script principal.
export const DEMO_SCENES = {
  landing:      true,   // Cena 01 — abertura do app
  babaOverview: true,   // Cena 02 — dashboard do baba
  attendance:   true,   // Cena 03 — confirmação de presença
  draw:         true,   // Cena 04 — sorteio de times
  matchStart:   true,   // Cena 05 — início da partida
  goals:        true,   // Cena 06 — gols
  reactions:    true,   // Cena 07 — reações (pulada automaticamente se o baba não tiver o recurso)
  clock:        true,   // Cena 08 — cronômetro (mostrado junto da partida)
  matchEnd:     true,   // Cena 09 — final da partida / pós-jogo
  rankings:     true,   // Cena 10 — ranking / estatísticas
};

// ── Saída ────────────────────────────────────────────────────────────────────
export const OUTPUT_DIR      = path.join(__dirname, 'output');
export const VIDEO_DIR       = path.join(OUTPUT_DIR, 'videos');
export const SCREENSHOT_DIR  = path.join(OUTPUT_DIR, 'error-screenshots');

// ── Dados fictícios de exemplo (só usados se for preciso adicionar
// convidados avulsos via recurso já existente do app — "Convidados avulsos"
// no sorteio — nunca cria tabelas ou dados novos no banco). ──────────────────
export const DEMO_GUEST_NAMES = [
  'Ney', 'Juninho', 'Paredão', 'Caneta', 'Professor', 'Mito',
  'Canelinha', 'Foguete', 'Bruxo', 'Pitbull', 'Motorzinho', 'Maestro',
];
