// scripts/prerender.mjs
//
// Roda depois de `vite build` (client) + `vite build --ssr` (server bundle).
// Para cada rota pública em PRERENDER_ROUTES, gera um dist/<rota>/index.html
// com o conteúdo já renderizado — sem isso, o dist/index.html do Vite chega
// vazio (<div id="root"></div>) e qualquer rastreador que não execute JS
// (incluindo o robô do AdSense) vê uma tela em branco em todas as rotas.
//
// Importante: isso NÃO troca o app pra SSR em runtime. O usuário real ainda
// recebe o SPA normal — o React monta por cima (createRoot) assim que o JS
// carrega. O HTML pré-renderizado só precisa existir na resposta inicial,
// antes do JS rodar.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root      = path.resolve(__dirname, '..');
const distDir   = path.join(root, 'dist');
const ssrDir    = path.join(root, 'dist-ssr');

// Metadados por rota — sobrescrevem o <title>/description genéricos do
// index.html só na página correspondente, o que também ajuda o SEO normal
// (cada URL pública com título/descrição próprios, não todas iguais).
const ROUTE_META = {
  '/': {
    title: 'Draft Play - Gestão de Baba',
    description: 'Sistema profissional de gestão de peladas e babas. Sorteio de times, rankings, presenças e financeiro.',
  },
  '/termos': {
    title: 'Termos de Uso - Draft Play',
    description: 'Termos de uso da plataforma Draft Play de gestão de peladas e babas.',
  },
  '/privacidade': {
    title: 'Política de Privacidade - Draft Play',
    description: 'Política de privacidade e tratamento de dados da plataforma Draft Play.',
  },
  '/visitor': {
    title: 'Modo Visitante - Sorteio de Times | Draft Play',
    description: 'Monte a lista de jogadores e sorteie times equilibrados na hora, sem precisar criar conta.',
  },
};

async function main() {
  if (!existsSync(distDir)) {
    throw new Error('dist/ não existe — rode "vite build" antes deste script.');
  }
  if (!existsSync(ssrDir)) {
    throw new Error('dist-ssr/ não existe — rode "vite build --ssr src/entry-server.jsx --outDir dist-ssr" antes deste script.');
  }

  const { render, PRERENDER_ROUTES } = await import(
    path.join(ssrDir, 'entry-server.js')
  );

  const template = await readFile(path.join(distDir, 'index.html'), 'utf-8');

  for (const route of PRERENDER_ROUTES) {
    const appHtml = render(route);
    const meta    = ROUTE_META[route] ?? ROUTE_META['/'];

    let html = template
      .replace(
        '<main id="main-content"></main>',
        `<main id="main-content">${appHtml}</main>`
      )
      .replace(
        /<title>.*?<\/title>/,
        `<title>${meta.title}</title>`
      )
      .replace(
        /<meta name="description" content=".*?" \/>/,
        `<meta name="description" content="${meta.description}" />`
      );

    const outPath =
      route === '/'
        ? path.join(distDir, 'index.html')
        : path.join(distDir, route.replace(/^\//, ''), 'index.html');

    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, html, 'utf-8');
    console.log(`[prerender] ${route} -> ${path.relative(root, outPath)}`);
  }
}

main().catch((err) => {
  console.error('[prerender] falhou:', err);
  process.exit(1);
});
