// src/hooks/useRewardedAd.js
//
// Anúncio "assista para liberar" usando a Ad Placement API do Google
// (window.adBreak / window.adConfig) — é o mesmo adsbygoogle.js já carregado
// no <head> (ver vite.config.js), só que no formato "reward" em vez do banner
// estático que já existe em AdBanner.jsx.
// Doc oficial: https://developers.google.com/ad-placement/apis/adbreak
//
// Regras que este hook segue de propósito:
//   - Sem VITE_ADSENSE_CLIENT_ID configurado (conta ainda não aprovada, ou
//     ambiente de dev): libera a ação na hora, sem tentar chamar o Google.
//     Nunca trava uma função central do app por falta de anúncio.
//   - Sem preenchimento (Google não tem anúncio pra mostrar agora): idem,
//     libera a ação. O usuário não pode ficar impedido de usar o app só
//     porque não há inventário de anúncio no momento.
//   - Só bloqueia a ação quando o anúncio realmente apareceu e a pessoa
//     fechou/pulou antes de terminar — aí sim ela precisa tentar de novo.
//   - Timeout de segurança: se o Google simplesmente nunca responder nada
//     (nem sucesso, nem "sem preenchimento") — o que acontece na prática
//     enquanto a conta AdSense ainda não foi aprovada — libera a ação depois
//     de alguns segundos em vez de travar o usuário pra sempre. Isso já
//     aconteceu de verdade: com VITE_ADSENSE_CLIENT_ID configurado mas a
//     conta ainda sem aprovação, adBreakDone às vezes nunca dispara.

import { useCallback, useRef } from 'react';

const ADSENSE_CLIENT = import.meta.env.VITE_ADSENSE_CLIENT_ID;

// Tempo máximo de espera por qualquer resposta do Google antes de liberar a
// ação mesmo assim. Um anúncio de verdade carrega em segundos; se passar
// disso, é sinal de que algo não vai responder (conta não aprovada, sem
// preenchimento sem callback, bloqueador de anúncio silencioso, etc.).
const RESPONSE_TIMEOUT_MS = 8000;

function ensureAdBreakGlobals() {
  window.adsbygoogle = window.adsbygoogle || [];
  window.adBreak  = window.adBreak  || function (o) { window.adsbygoogle.push(o); };
  window.adConfig = window.adConfig || function (o) { window.adsbygoogle.push(o); };
}

/**
 * @param {string} placementName - nome curto e estável do placement (aparece
 *   nos relatórios do AdSense). Ex.: "liberar-sorteio", "iniciar-partida".
 */
export function useRewardedAd(placementName) {
  const pending = useRef(false);

  /**
   * @param {() => void} onGranted - chamado quando a ação deve prosseguir
   *   (anúncio assistido até o fim, sem preenchimento, ou timeout de
   *   segurança — nesses três casos o usuário não deve ficar travado).
   * @param {() => void} [onSkipped] - chamado quando o anúncio apareceu mas
   *   a pessoa fechou/pulou antes de terminar. A ação NÃO deve prosseguir.
   */
  const requestReward = useCallback((onGranted, onSkipped) => {
    if (!ADSENSE_CLIENT) {
      onGranted();
      return;
    }
    if (pending.current) return;
    pending.current = true;

    ensureAdBreakGlobals();
    let settled = false;

    const finish = (fn) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      pending.current = false;
      fn?.();
    };

    // Rede de segurança: nada travado indefinidamente esperando o Google.
    const timeoutId = setTimeout(() => finish(onGranted), RESPONSE_TIMEOUT_MS);

    try {
      window.adBreak({
        type: 'reward',
        name: placementName,
        beforeReward(showAdFn) {
          showAdFn();
        },
        adViewed() {
          finish(onGranted);
        },
        adDismissed() {
          finish(onSkipped);
        },
        adBreakDone() {
          // beforeReward nunca foi chamado (sem preenchimento) — não é culpa
          // do usuário, libera a ação normalmente.
          finish(onGranted);
        },
      });
    } catch {
      // Bloqueador de anúncio ou script ainda não carregou — não trava a
      // função por causa disso.
      finish(onGranted);
    }
  }, [placementName]);

  return { requestReward, isAdEnabled: Boolean(ADSENSE_CLIENT) };
}

export default useRewardedAd;
