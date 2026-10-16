// Garante que os guias estão ligados ao site: rotas pré-renderizadas, metadados e
// JSON-LD vindos da fonte única (src/content/guiasSeo.js).
import { describe, it, expect, vi } from 'vitest';

// O entry-server importa o cliente Supabase e o serviço de perfis; aqui não há rede.
vi.mock('../services/supabase', () => ({ supabase: {} }));
vi.mock('../services/publicProfileService', () => ({ getPublicProfileData: vi.fn() }));

import { GUIAS } from '../data/guias';
import { GUIAS_INDEX_SEO, guiaSeo, guiaPath, SITE_URL } from '../content/guiasSeo';
import { PRERENDER_ROUTES, EXTRA_ROUTE_META } from '../entry-server';

describe('SEO dos guias', () => {
  it('cada guia tem título, descrição, canonical e JSON-LD coerentes', () => {
    for (const g of GUIAS) {
      const seo = guiaSeo(g);
      expect(seo.canonical).toBe(`${SITE_URL}/guias/${g.slug}`);
      expect(seo.title).toContain(g.title);
      expect(seo.ogType).toBe('article');
      const [article, breadcrumb] = seo.jsonLd['@graph'];
      expect(article).toMatchObject({ '@type': 'Article', headline: g.title, datePublished: g.published, dateModified: g.updated, mainEntityOfPage: seo.canonical });
      expect(breadcrumb.itemListElement.map((i) => i.position)).toEqual([1, 2, 3]);
      expect(breadcrumb.itemListElement[2].item).toBe(seo.canonical);
    }
  });
  it('índice lista todos os guias no JSON-LD', () => {
    expect(GUIAS_INDEX_SEO.jsonLd.hasPart).toHaveLength(GUIAS.length);
  });
});

describe('guias no pré-render', () => {
  it('/guias e todos os /guias/:slug estão nas rotas e têm metadados', () => {
    expect(PRERENDER_ROUTES).toContain('/guias');
    for (const g of GUIAS) {
      expect(PRERENDER_ROUTES).toContain(guiaPath(g.slug));
      expect(EXTRA_ROUTE_META[guiaPath(g.slug)].jsonLd).toBeTruthy();
    }
  });
  // Obs.: o setup.js do projeto mocka o roteador (useLocation fixo em /home), então o HTML
  // das páginas com rota NÃO pode ser validado aqui. Use `npm run verify:prerender`
  // depois do build: ele confere o HTML real gerado em dist/.
});
