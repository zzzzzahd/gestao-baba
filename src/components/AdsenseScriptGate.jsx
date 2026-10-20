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
// (ver src/utils/adEligibility.js). Em
// qualquer outra rota — incluindo login, join, followers, visitor, e claro
// todas as protegidas — o script é removido do DOM.
//
// A tag de VERIFICAÇÃO de propriedade do site (<meta name="google-adsense-
// account">) é outra coisa, injetada estaticamente no build (vite.config.js)
// e continua presente em toda página — ela sozinha já é aceita pelo Google
// pra comprovar propriedade, sem precisar ativar o script pesado.

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { isAdScriptPath } from '../utils/adEligibility';

const ADSENSE_CLIENT = import.meta.env.VITE_ADSENSE_CLIENT_ID;
const SCRIPT_ID = 'adsbygoogle-script';

// A lista de rotas elegíveis fica em src/utils/adEligibility.js (política única).

export function AdsenseScriptGate() {
  const location = useLocation();

  useEffect(() => {
    if (!ADSENSE_CLIENT) return;

    // A partir da integração com o Google Consent Mode V2 (ver bootstrap em
    // index.html + useCookieConsent.js), quem decide se o anúncio pode ser
    // personalizado é o sinal gtag('consent', ...), não mais o carregamento
    // do script em si. O script carrega em qualquer rota elegível — sem
    // consentimento, o Google mostra anúncio não-personalizado (ainda gera
    // receita, sem usar dado pessoal); com consentimento, personalizado.
    const eligible = isAdScriptPath(location.pathname);
    const existing = document.getElementById(SCRIPT_ID);

    let cancelled = false;
    let idleHandle = null;
    let timeoutHandle = null;
    let onLoad = null;

    const inject = () => {
      if (cancelled || document.getElementById(SCRIPT_ID)) return;
      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
      document.head.appendChild(script);
    };

    // O script (~250 KiB + consentimento do Funding Choices) só entra depois do
    // evento `load` e de um momento ocioso, pra não disputar rede/CPU com a imagem
    // do LCP e o CSS. Os <AdBanner> já enfileiram o push em window.adsbygoogle,
    // que o script processa assim que carrega.
    const scheduleInject = () => {
      if (typeof window.requestIdleCallback === 'function') {
        idleHandle = window.requestIdleCallback(inject, { timeout: 3000 });
      } else {
        timeoutHandle = setTimeout(inject, 1500);
      }
    };

    if (eligible && !existing) {
      if (document.readyState === 'complete') {
        scheduleInject();
      } else {
        onLoad = scheduleInject;
        window.addEventListener('load', onLoad, { once: true });
      }
    } else if (!eligible && existing) {
      existing.remove();
      // Best-effort: evita que um push antigo em fila seja processado se o
      // script recarregar depois. Não desfaz observers internos que o
      // Google já tenha registrado enquanto estava ativo, mas garante que
      // nada novo seja enfileirado fora das páginas elegíveis.
      window.adsbygoogle = [];
    }

    return () => {
      cancelled = true;
      if (idleHandle !== null && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleHandle);
      if (timeoutHandle !== null) clearTimeout(timeoutHandle);
      if (onLoad) window.removeEventListener('load', onLoad);
    };
  }, [location.pathname]);

  return null;
}

export default AdsenseScriptGate;
