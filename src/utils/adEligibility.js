// src/utils/adEligibility.js
//
// POLÍTICA ÚNICA de elegibilidade de anúncios. Antes, a lista de rotas vivia
// duplicada em AdsenseScriptGate.jsx e CookieConsentBanner.jsx; agora ambos
// (e o AdBanner) consultam este módulo.
//
// Regra: anúncio só em página com conteúdo editorial próprio e estável.
//   - Eligível: landing, sobre, guias (conteúdo textual original) e perfil
//     público (o próprio componente só renderiza o banner quando o jogador
//     tem partidas ou conquistas).
//   - NÃO eligível: ferramentas interativas (/ferramentas/*) — formulário
//     isolado, mesmo com texto explicativo; telas de ação (placar rápido);
//     login, convites, termos/privacidade, 404 e toda área autenticada.
// Para tornar uma página elegível, adicione o padrão aqui e confirme que ela
// tem conteúdo próprio, sem estados vazios/erro/carregamento com anúncio.

import { matchPath } from 'react-router-dom';

export const AD_ELIGIBLE_PATTERNS = [
  '/',
  '/sobre',
  '/player/:userId',
  // Central de guias (conteúdo editorial). Só passam a valer quando as rotas existirem.
  '/guias',
  '/guias/:slug',
];

// Anúncio RECOMPENSADO opcional (ex.: "assista para baixar a imagem dos times").
// Desligado por padrão: só liga com VITE_TOOLS_REWARDED_EXPORT=true (definir na
// Vercel DEPOIS da aprovação do AdSense). Não é banner e não bloqueia a função
// principal da ferramenta, que continua livre.
export const REWARDED_OPTIONAL_PATTERNS = ['/ferramentas/sorteador'];

export function rewardedExportEnabled() {
  return import.meta.env.VITE_TOOLS_REWARDED_EXPORT === 'true';
}

/** Rotas em que o script do AdSense pode existir (banner elegível OU recompensado opcional ligado). */
export function isAdScriptPath(pathname) {
  if (isAdEligiblePath(pathname)) return true;
  return rewardedExportEnabled()
    && REWARDED_OPTIONAL_PATTERNS.some((p) => matchPath({ path: p, end: true }, pathname));
}

export function isAdEligiblePath(pathname) {
  return AD_ELIGIBLE_PATTERNS.some((pattern) => matchPath({ path: pattern, end: true }, pathname));
}
