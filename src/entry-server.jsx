import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';

import LandingPage from './pages/LandingPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import VisitorMode from './pages/VisitorMode';
import AboutPage from './pages/AboutPage';
import PublicProfilePage from './pages/PublicProfilePage.jsx';

import { supabase } from './services/supabase';
import { getPublicProfileData } from './services/publicProfileService';

// ---------------------------------------------------------
// ROTAS ESTÁTICAS
// ---------------------------------------------------------

export const PRERENDER_ROUTES = [
  '/',
  '/termos',
  '/privacidade',
  '/visitor',
  '/sobre',
];

// ---------------------------------------------------------
// PÁGINAS ESTÁTICAS
// ---------------------------------------------------------

const PAGES = {
  '/': LandingPage,
  '/termos': TermsPage,
  '/privacidade': PrivacyPage,
  '/visitor': VisitorMode,
  '/sobre': AboutPage,
};

// ---------------------------------------------------------
// DESCOBRIR PERFIS PÚBLICOS
// ---------------------------------------------------------

export async function getPublicProfileRoutes() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('is_public', true);

  if (error) {
    console.error(
      '[entry-server] erro ao buscar perfis públicos:',
      error
    );

    return [];
  }

  return (data || [])
    .map((profile) => profile.id)
    .filter(Boolean)
    .map((id) => `/player/${id}`);
}

// ---------------------------------------------------------
// RENDER
// ---------------------------------------------------------

export async function render(url) {
  // -------------------------------------------------------
  // PERFIL PÚBLICO DINÂMICO
  // Exemplo: /player/abc123
  // -------------------------------------------------------

  const playerMatch = url.match(/^\/player\/([^/]+)\/?$/);

  if (playerMatch) {
    const userId = playerMatch[1];

    const initialData = await getPublicProfileData(userId);

    if (!initialData) {
      throw new Error(
        `[entry-server] perfil público não encontrado: ${userId}`
      );
    }

    return renderToString(
      <React.StrictMode>
        <StaticRouter location={url}>
          <PublicProfilePage initialData={initialData} />
        </StaticRouter>
      </React.StrictMode>
    );
  }

  // -------------------------------------------------------
  // ROTAS ESTÁTICAS
  // -------------------------------------------------------

  const Page = PAGES[url];

  if (!Page) {
    throw new Error(
      `[entry-server] rota não mapeada para pré-render: ${url}`
    );
  }

  return renderToString(
    <React.StrictMode>
      <StaticRouter location={url}>
        <Page />
      </StaticRouter>
    </React.StrictMode>
  );
}