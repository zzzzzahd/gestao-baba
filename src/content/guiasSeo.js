// src/content/guiasSeo.js
// Metadados (título, descrição, canonical, JSON-LD) dos guias numa fonte única:
// usados pelas páginas (useDocumentHead, navegação SPA) e pelo pré-render
// (HTML estático que o Google lê). Antes, o JSON-LD só existia no navegador.

import { GUIAS } from '../data/guias';

export const SITE_URL = 'https://www.draftplay.app.br';
export const GUIAS_PATH = '/guias';
export const guiaPath = (slug) => `${GUIAS_PATH}/${slug}`;

export const GUIAS_INDEX_SEO = {
  title: 'Guias para organizar seu baba | Draft Play',
  description:
    'Guias práticos para organizar o baba: sorteio equilibrado, lista de presença, cobrança de mensalidade, regras de goleiro e reserva, desempate e ranking.',
  canonical: `${SITE_URL}${GUIAS_PATH}`,
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Guias para organizar seu baba',
    url: `${SITE_URL}${GUIAS_PATH}`,
    hasPart: GUIAS.map((g) => ({
      '@type': 'Article',
      headline: g.title,
      url: `${SITE_URL}${guiaPath(g.slug)}`,
    })),
  },
};

export const guiaSeo = (guia) => {
  const url = `${SITE_URL}${guiaPath(guia.slug)}`;
  return {
    title: `${guia.title} | Draft Play`,
    description: guia.description,
    canonical: url,
    ogType: 'article',
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Article',
          headline: guia.title,
          description: guia.description,
          datePublished: guia.published,
          dateModified: guia.updated,
          mainEntityOfPage: url,
          inLanguage: 'pt-BR',
          author: { '@type': 'Organization', name: 'Draft Play' },
          publisher: { '@type': 'Organization', name: 'Draft Play', url: SITE_URL },
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Início', item: `${SITE_URL}/` },
            { '@type': 'ListItem', position: 2, name: 'Guias', item: `${SITE_URL}${GUIAS_PATH}` },
            { '@type': 'ListItem', position: 3, name: guia.title, item: url },
          ],
        },
      ],
    },
  };
};
