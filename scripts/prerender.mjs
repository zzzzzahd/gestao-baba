import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const ssrDir = path.join(root, 'dist-ssr');

// Domínio canônico de produção — único lugar que precisa mudar se o domínio
// mudar um dia.
const SITE_URL = 'https://www.draftplay.app.br';

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

  // Fallback usado quando não for possível ler os dados do perfil
  '/player/:userId': {
    title: 'Perfil Público - Draft Play',
    description: 'Perfil público de um usuário do Draft Play.',
  },
};

// -----------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------

const escapeHtml = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// O React escapa os atributos no SSR; aqui desfazemos para depois escapar
// uma única vez (evita "&amp;amp;").
const decodeHtml = (s = '') =>
  String(s)
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

const truncate = (s, max) =>
  s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;

/**
 * Lê os data-attributes que o PublicProfilePage coloca na div raiz.
 * Retorna null se o HTML renderizado não tiver o marcador (ex.: estado de
 * loading ou "não encontrado").
 */
function readProfileMarker(appHtml) {
  const nameMatch = appHtml.match(/data-profile-name="([^"]*)"/);
  if (!nameMatch) return null;

  const num = (attr) => {
    const m = appHtml.match(new RegExp(`data-profile-${attr}="(\\d+)"`));
    return m ? Number(m[1]) : 0;
  };

  return {
    name: decodeHtml(nameMatch[1]).trim(),
    goals: num('goals'),
    assists: num('assists'),
    matches: num('matches'),
  };
}

/**
 * Aplica template + meta. Usa funções como substituto no .replace() para que
 * "$&", "$$" etc. dentro do texto/HTML não sejam interpretados.
 */
function applyMeta(
  template,
  appHtml,
  { title, description, canonicalUrl, noindex }
) {
  const t = escapeHtml(title);
  const d = escapeHtml(description);

  let html = template
    .replace(
      '<main id="main-content"></main>',
      () => `<main id="main-content">${appHtml}</main>`
    )
    .replace(/<title>.*?<\/title>/, () => `<title>${t}</title>`)
    .replace(
      /<meta name="description" content=".*?" \/>/,
      () => `<meta name="description" content="${d}" />`
    )
    .replace(
      /<meta property="og:title" content=".*?" \/>/,
      () => `<meta property="og:title" content="${t}" />`
    )
    .replace(
      /<meta property="og:description" content=".*?" \/>/,
      () => `<meta property="og:description" content="${d}" />`
    )
    .replace(
      /<meta name="twitter:title" content=".*?" \/>/,
      () => `<meta name="twitter:title" content="${t}" />`
    )
    .replace(
      /<meta name="twitter:description" content=".*?" \/>/,
      () => `<meta name="twitter:description" content="${d}" />`
    )
    .replace(
      /<link rel="canonical" href=".*?" \/>/,
      () => `<link rel="canonical" href="${canonicalUrl}" />`
    )
    .replace(
      /<meta property="og:url" content=".*?" \/>/,
      () => `<meta property="og:url" content="${canonicalUrl}" />`
    );

  if (noindex) {
    html = html.replace(
      '</head>',
      () => `    <meta name="robots" content="noindex,follow" />\n  </head>`
    );
  }

  return html;
}

async function main() {
  // -------------------------------------------------------
  // VERIFICAÇÕES
  // -------------------------------------------------------

  if (!existsSync(distDir)) {
    throw new Error('dist/ não existe — rode "vite build" antes deste script.');
  }

  if (!existsSync(ssrDir)) {
    throw new Error(
      'dist-ssr/ não existe — rode "vite build --ssr src/entry-server.jsx --outDir dist-ssr" antes deste script.'
    );
  }

  // -------------------------------------------------------
  // IMPORTAR BUNDLE SSR
  // -------------------------------------------------------

  const { render, PRERENDER_ROUTES, getPublicProfileRoutes } = await import(
    pathToFileURL(path.join(ssrDir, 'entry-server.js')).href
  );

  // -------------------------------------------------------
  // TEMPLATE
  // -------------------------------------------------------

  const template = await readFile(path.join(distDir, 'index.html'), 'utf-8');

  // -------------------------------------------------------
  // ROTAS ESTÁTICAS + PERFIS PÚBLICOS
  // -------------------------------------------------------

  const staticRoutes = [...PRERENDER_ROUTES];

  let profileRoutes = [];

  try {
    profileRoutes = await getPublicProfileRoutes();
  } catch (error) {
    console.error('[prerender] erro ao descobrir perfis públicos:', error);
  }

  const uniqueRoutes = [...new Set([...staticRoutes, ...profileRoutes])];

  console.log(`[prerender] ${uniqueRoutes.length} rotas encontradas`);
  console.log(`[prerender] ${profileRoutes.length} perfis públicos encontrados`);

  // Perfis sem conteúdo próprio: recebem noindex e ficam fora do sitemap
  const noindexRoutes = new Set();

  // -------------------------------------------------------
  // RENDERIZAR CADA ROTA
  // -------------------------------------------------------

  for (const route of uniqueRoutes) {
    try {
      const appHtml = await render(route);

      const canonicalUrl = `${SITE_URL}${route}`;
      const isPublicProfile = route.startsWith('/player/');

      let meta = isPublicProfile
        ? ROUTE_META['/player/:userId']
        : ROUTE_META[route] ?? ROUTE_META['/'];

      let noindex = false;

      if (isPublicProfile) {
        const info = readProfileMarker(appHtml);

        if (!info) {
          // Sem marcador no HTML (SSR não trouxe dados). Não arrisca
          // marcar noindex: mantém meta genérica e avisa no log.
          console.warn(
            `[prerender] aviso: ${route} sem data-profile-* no HTML renderizado — usando meta genérica`
          );
        } else {
          if (info.name) {
            const nome = truncate(info.name, 60);
            meta = {
              title: `${nome} - Perfil de jogador | Draft Play`,
              description: truncate(
                `Perfil de ${nome} no Draft Play: ${info.goals} gols e ${info.assists} assistências em ${info.matches} jogos, com rating e conquistas.`,
                158
              ),
            };
          }

          if (info.matches === 0) {
            noindex = true;
            noindexRoutes.add(route);
          }
        }
      }

      const html = applyMeta(template, appHtml, {
        ...meta,
        canonicalUrl,
        noindex,
      });

      // -----------------------------------------------------
      // CAMINHO DE SAÍDA
      // -----------------------------------------------------

      const outPath =
        route === '/'
          ? path.join(distDir, 'index.html')
          : path.join(distDir, route.replace(/^\//, ''), 'index.html');

      await mkdir(path.dirname(outPath), { recursive: true });
      await writeFile(outPath, html, 'utf-8');

      console.log(
        `[prerender] ${route} -> ${path.relative(root, outPath)}${noindex ? ' (noindex)' : ''}`
      );
    } catch (error) {
      console.error(`[prerender] falhou na rota ${route}:`, error);
      throw error;
    }
  }

  // -------------------------------------------------------
  // SITEMAP.XML — gerado aqui porque precisa incluir os perfis públicos
  // reais (que mudam a cada build). Perfis noindex ficam de fora.
  // -------------------------------------------------------

  const PRIORITY = {
    '/': '1.0',
    '/sobre': '0.5',
    '/visitor': '0.8',
    '/termos': '0.3',
    '/privacidade': '0.3',
  };

  const CHANGEFREQ = {
    '/': 'weekly',
    '/sobre': 'monthly',
    '/visitor': 'monthly',
    '/termos': 'yearly',
    '/privacidade': 'yearly',
  };

  const sitemapRoutes = uniqueRoutes.filter(
    (route) => !noindexRoutes.has(route)
  );

  const sitemapEntries = sitemapRoutes
    .map((route) => {
      const isProfile = route.startsWith('/player/');
      const loc = `${SITE_URL}${route}`;
      const changefreq = isProfile ? 'monthly' : CHANGEFREQ[route] ?? 'monthly';
      const priority = isProfile ? '0.4' : PRIORITY[route] ?? '0.5';
      return `  <url>\n    <loc>${loc}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
    })
    .join('\n');

  const sitemapXml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries}\n</urlset>\n`;

  await writeFile(path.join(distDir, 'sitemap.xml'), sitemapXml, 'utf-8');

  const profilesInSitemap = sitemapRoutes.filter((r) =>
    r.startsWith('/player/')
  ).length;

  console.log(
    `[prerender] sitemap.xml gerado com ${sitemapRoutes.length} URLs (${profilesInSitemap} perfis públicos; ${noindexRoutes.size} perfis sem partidas ficaram de fora com noindex)`
  );
}

main().catch((error) => {
  console.error('[prerender] falhou:', error);
  process.exit(1);
});
