import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const ssrDir = path.join(root, 'dist-ssr');

const ROUTE_META = {
  '/': {
    title: 'Draft Play - Gestão de Baba',
    description:
      'Sistema profissional de gestão de peladas e babas. Sorteio de times, rankings, presenças e financeiro.',
  },

  '/termos': {
    title: 'Termos de Uso - Draft Play',
    description:
      'Termos de uso da plataforma Draft Play de gestão de peladas e babas.',
  },

  '/privacidade': {
    title: 'Política de Privacidade - Draft Play',
    description:
      'Política de privacidade e tratamento de dados da plataforma Draft Play.',
  },

  '/visitor': {
    title: 'Modo Visitante - Sorteio de Times | Draft Play',
    description:
      'Monte a lista de jogadores e sorteie times equilibrados na hora, sem precisar criar conta.',
  },

  '/sobre': {
    title: 'Sobre - Draft Play',
    description:
      'Conheça o Draft Play: gestão de peladas e babas, sorteio de times, financeiro e ranking em um só lugar.',
  },

  '/player/:userId': {
    title: 'Perfil Público - Draft Play',
    description:
      'Perfil público de um usuário do Draft Play.',
  },
};

async function main() {
  // -------------------------------------------------------
  // VERIFICAÇÕES
  // -------------------------------------------------------

  if (!existsSync(distDir)) {
    throw new Error(
      'dist/ não existe — rode "vite build" antes deste script.'
    );
  }

  if (!existsSync(ssrDir)) {
    throw new Error(
      'dist-ssr/ não existe — rode "vite build --ssr src/entry-server.jsx --outDir dist-ssr" antes deste script.'
    );
  }

  // -------------------------------------------------------
  // IMPORTAR BUNDLE SSR
  // -------------------------------------------------------

  const {
    render,
    PRERENDER_ROUTES,
    getPublicProfileRoutes,
  } = await import(
    pathToFileURL(
      path.join(ssrDir, 'entry-server.js')
    ).href
  );

  // -------------------------------------------------------
  // TEMPLATE
  // -------------------------------------------------------

  const template = await readFile(
    path.join(distDir, 'index.html'),
    'utf-8'
  );

  // -------------------------------------------------------
  // ROTAS ESTÁTICAS
  // -------------------------------------------------------

  const staticRoutes = [...PRERENDER_ROUTES];

  // -------------------------------------------------------
  // PERFIS PÚBLICOS
  // -------------------------------------------------------

  let profileRoutes = [];

  try {
    profileRoutes = await getPublicProfileRoutes();
  } catch (error) {
    console.error(
      '[prerender] erro ao descobrir perfis públicos:',
      error
    );
  }

  const routes = [
    ...staticRoutes,
    ...profileRoutes,
  ];

  // Remove duplicados
  const uniqueRoutes = [...new Set(routes)];

  console.log(
    `[prerender] ${uniqueRoutes.length} rotas encontradas`
  );

  console.log(
    `[prerender] ${profileRoutes.length} perfis públicos encontrados`
  );

  // -------------------------------------------------------
  // RENDERIZAR CADA ROTA
  // -------------------------------------------------------

  for (const route of uniqueRoutes) {
    try {
      const appHtml = await render(route);

      const isPublicProfile =
        route.startsWith('/player/');

      const meta = isPublicProfile
        ? ROUTE_META['/player/:userId']
        : ROUTE_META[route] ?? ROUTE_META['/'];

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

      // -----------------------------------------------------
      // CAMINHO DE SAÍDA
      // -----------------------------------------------------

      const outPath =
        route === '/'
          ? path.join(distDir, 'index.html')
          : path.join(
              distDir,
              route.replace(/^\//, ''),
              'index.html'
            );

      await mkdir(
        path.dirname(outPath),
        { recursive: true }
      );

      await writeFile(
        outPath,
        html,
        'utf-8'
      );

      console.log(
        `[prerender] ${route} -> ${path.relative(
          root,
          outPath
        )}`
      );
    } catch (error) {
      console.error(
        `[prerender] falhou na rota ${route}:`,
        error
      );

      throw error;
    }
  }
}

main().catch((error) => {
  console.error(
    '[prerender] falhou:',
    error
  );

  process.exit(1);
});