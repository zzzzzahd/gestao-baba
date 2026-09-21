// src/components/AdsenseScriptGate.jsx
//
// Controla quando o script REAL do AdSense (adsbygoogle.js — o que ativa
// anúncio/Auto ads de verdade) existe no DOM.
//
// Por que isso existe: numa SPA, um <script> injetado estaticamente no
// index.html fica presente e ativo durante toda a sessão do usuário, mesmo
// depois que ele navega (client-side, sem recarregar a página) pra outras
// rotas — inclusive as protegidas por login. Isso vale mesmo sem nenhum
// <AdBanner> montado ali: se a conta tiver Auto ads habilitado, o próprio
// script do Google escaneia a página em busca de onde colocar anúncio,
// independente de quem chamou (ou não) o adsbygoogle.push manualmente.
//
// Este componente resolve isso na raiz: só existe UM <script> de verdade no
// DOM quando a rota atual é uma página pública com conteúdo do editor
// (Landing, Sobre, Perfil Público — as mesmas 3 que usam <AdBanner>). Em
// qualquer outra rota — incluindo login, join, followers, visitor, e claro
// todas as protegidas — o script é removido do DOM.
//
// A tag de VERIFICAÇÃO de propriedade do site (<meta name="google-adsense-
// account">) é outra coisa, injetada estaticamente no build (vite.config.js)
// e continua presente em toda página — ela sozinha já é aceita pelo Google
// pra comprovar propriedade, sem precisar ativar o script pesado.

import { useEffect } from 'react';
import { useLocation, matchPath } from 'react-router-dom';

const ADSENSE_CLIENT = import.meta.env.VITE_ADSENSE_CLIENT_ID;
const SCRIPT_ID = 'adsbygoogle-script';

// Mesmas rotas que hoje renderizam <AdBanner>, mais a /visitor-match (que
// usa o rewarded ad de useRewardedAd.js) — todas públicas, sem login. Ajuste
// aqui junto de qualquer mudança em quais páginas usam anúncio.
const AD_ELIGIBLE_PATTERNS = ['/', '/sobre', '/player/:userId', '/visitor-match'];

function isAdEligiblePath(pathname) {
  return AD_ELIGIBLE_PATTERNS.some((pattern) => matchPath(pattern, pathname));
}

export function AdsenseScriptGate() {
  const location = useLocation();

  useEffect(() => {
    if (!ADSENSE_CLIENT) return;

    const eligible = isAdEligiblePath(location.pathname);
    const existing = document.getElementById(SCRIPT_ID);

    if (eligible && !existing) {
      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
      document.head.appendChild(script);
    } else if (!eligible && existing) {
      existing.remove();
      // Best-effort: evita que um push antigo em fila seja processado se o
      // script recarregar depois. Não desfaz observers internos que o
      // Google já tenha registrado enquanto estava ativo, mas garante que
      // nada novo seja enfileirado fora das páginas elegíveis.
      window.adsbygoogle = [];
    }
  }, [location.pathname]);

  return null;
}

export default AdsenseScriptGate;
