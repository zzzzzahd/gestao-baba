// scripts/verify-prerender.mjs
// Confere o HTML REAL gerado pelo build (dist/): rode depois de `npm run build`.
//   node scripts/verify-prerender.mjs     (ou: npm run verify:prerender)
// Por rota pré-renderizada, verifica: arquivo existe, 1 <h1>, 1 <main>, ids únicos,
// <title> e canonical corretos, JSON-LD válido quando a rota define um, og:type e
// que não caiu na página 404 por engano. Sai com código 1 se houver problema.

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const ssrDir = path.join(root, 'dist-ssr');
const SITE_URL = 'https://www.draftplay.app.br';

if (!existsSync(distDir) || !existsSync(ssrDir)) {
  console.error('dist/ e dist-ssr/ não existem. Rode "npm run build" antes.');
  process.exit(1);
}

const { PRERENDER_ROUTES, EXTRA_ROUTE_META } = await import(pathToFileURL(path.join(ssrDir, 'entry-server.js')).href);

const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const count = (html, re) => (html.match(re) || []).length;

let problems = 0;
const fail = (route, msg) => { problems += 1; console.error(`✗ ${route}: ${msg}`); };

for (const route of PRERENDER_ROUTES) {
  const file = route === '/' ? path.join(distDir, 'index.html') : path.join(distDir, route.replace(/^\//, ''), 'index.html');
  if (!existsSync(file)) { fail(route, 'HTML pré-renderizado não existe'); continue; }
  const html = await readFile(file, 'utf-8');

  if (count(html, /<h1\b/g) !== 1) fail(route, `esperado 1 <h1>, encontrado ${count(html, /<h1\b/g)}`);
  if (count(html, /<main\b/g) !== 1) fail(route, `esperado 1 <main>, encontrado ${count(html, /<main\b/g)} (<main> aninhado?)`);
  if (/Essa página não existe/.test(html)) fail(route, 'renderizou a página 404');

  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  const dup = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  if (dup.length) fail(route, `ids duplicados: ${dup.join(', ')}`);

  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
  const expectedCanonical = `${SITE_URL}${route === '/' ? '' : route}`;
  if (route !== '/' && canonical !== expectedCanonical) fail(route, `canonical ${canonical} ≠ ${expectedCanonical}`);

  const meta = EXTRA_ROUTE_META[route];
  if (meta) {
    const title = html.match(/<title>(.*?)<\/title>/)?.[1];
    if (title !== escapeHtml(meta.title)) fail(route, `<title> inesperado: ${title}`);
    if (meta.jsonLd) {
      const raw = html.match(/<script type="application\/ld\+json" id="dp-jsonld">(.*?)<\/script>/s)?.[1];
      if (!raw) fail(route, 'JSON-LD ausente');
      else {
        try {
          const parsed = JSON.parse(raw);
          if (parsed['@context'] !== 'https://schema.org') fail(route, 'JSON-LD sem @context schema.org');
        } catch { fail(route, 'JSON-LD inválido (não é JSON)'); }
      }
    }
    if (meta.ogType && !html.includes(`<meta property="og:type" content="${meta.ogType}" />`)) fail(route, `og:type deveria ser ${meta.ogType}`);
  }
}

const sitemap = existsSync(path.join(distDir, 'sitemap.xml')) ? await readFile(path.join(distDir, 'sitemap.xml'), 'utf-8') : '';
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(SITE_URL, '') || '/');
for (const l of locs) {
  const f = l === '/' ? path.join(distDir, 'index.html') : path.join(distDir, l.replace(/^\//, ''), 'index.html');
  if (!existsSync(f)) fail(l, 'está no sitemap mas não tem HTML pré-renderizado');
}
for (const r of PRERENDER_ROUTES) if (!locs.includes(r)) fail(r, 'rota pré-renderizada fora do sitemap');

console.log(`${PRERENDER_ROUTES.length} rotas verificadas, ${locs.length} no sitemap. Problemas: ${problems}`);
process.exit(problems ? 1 : 0);
