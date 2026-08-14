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

import { useCallback, useRef } from 'react';

const ADSENSE_CLIENT = import.meta.env.VITE_ADSENSE_CLIENT_ID;

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
   *   (anúncio assistido até o fim, ou fallback sem anúncio disponível).
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
    let resolved = false;

    try {
      window.adBreak({
        type: 'reward',
        name: placementName,
        beforeReward(showAdFn) {
          showAdFn();
        },
        adViewed() {
          resolved = true;
          onGranted();
        },
        adDismissed() {
          resolved = true;
          onSkipped?.();
        },
        adBreakDone() {
          pending.current = false;
          // beforeReward nunca foi chamado (sem preenchimento) — não é culpa
          // do usuário, libera a ação normalmente.
          if (!resolved) onGranted();
        },
      });
    } catch {
      // Bloqueador de anúncio ou script ainda não carregou — não trava a
      // função por causa disso.
      pending.current = false;
      onGranted();
    }
  }, [placementName]);

  return { requestReward, isAdEnabled: Boolean(ADSENSE_CLIENT) };
}

export default useRewardedAd;
