// src/entry-server.jsx
//
// Usado SOMENTE pelo script de pré-render (scripts/prerender.mjs), nunca pelo
// app em runtime no navegador. Renderiza as páginas 100% públicas (que não
// dependem de sessão/Supabase) para HTML estático, para que o crawler do
// AdSense — e qualquer outro rastreador que não execute JS — veja conteúdo
// real na primeira resposta, em vez do <div id="root"></div> vazio que o SPA
// entrega por padrão.
//
// Cada página aqui foi conferida: nenhuma delas usa useAuth()/useBaba(), então
// dá para renderizar isolada, sem AuthProvider/BabaProvider/BrowserRouter reais
// nem chamadas ao Supabase durante o build.

import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';

import LandingPage from './pages/LandingPage';
import TermsPage   from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import VisitorMode from './pages/VisitorMode';
import AboutPage   from './pages/AboutPage';
import PublicProfilePage   from './pages/PublicProfilePage.jsx';

// Rotas elegíveis para pré-render. Mantém só páginas públicas e estáveis —
// nada que dependa de auth, dados do Supabase ou params dinâmicos.
export const PRERENDER_ROUTES = ['/', '/termos', '/privacidade', '/visitor', '/sobre'];

const PAGES = {
  '/':            LandingPage,
  '/termos':      TermsPage,
  '/privacidade': PrivacyPage,
  '/visitor':     VisitorMode,
  '/sobre':       AboutPage,
  '/perfil/:id':  PublicProfilePage,
};

export function render(url) {
  const Page = PAGES[url];
  if (!Page) {
    throw new Error(`[entry-server] rota não mapeada para pré-render: ${url}`);
  }

  return renderToString(
    <React.StrictMode>
      <StaticRouter location={url}>
        <Page />
      </StaticRouter>
    </React.StrictMode>
  );
}
