// src/hooks/useInterstitialAd.js
//
// Anúncio intersticial NÃO-recompensado usando a mesma Ad Placement API do
// Google (window.adBreak / window.adConfig) já usada em useRewardedAd.js —
// só que no formato "next" em vez de "reward".
// Doc oficial: https://developers.google.com/ad-placement/apis/adbreak
//
// Diferença central pro rewarded:
//   - type: 'next' é pensado pra aparecer em transições de tela (o usuário
//     está indo de um lugar pro outro de qualquer forma), não pra liberar
//     uma ação específica.
//   - Não existe "recompensa" nem "pulou antes de terminar": o anúncio
//     aparece (ou não, se não houver preenchimento) e o fluxo sempre
//     continua depois — nunca bloqueia o usuário esperando ele "terminar"
//     nada.
//   - Por isso só há um callback de conclusão (onDone), sem onGranted vs
//     onSkipped como no rewarded.
//
// Mesma rede de segurança do rewarded: se o Google não responder nada (conta
// ainda sem aprovação, bloqueador de anúncio silencioso, sem preenchimento
// sem callback), libera o fluxo depois de alguns segundos em vez de travar.

import { useCallback, useRef } from 'react';

const ADSENSE_CLIENT = import.meta.env.VITE_ADSENSE_CLIENT_ID;
const RESPONSE_TIMEOUT_MS = 8000;

function ensureAdBreakGlobals() {
  window.adsbygoogle = window.adsbygoogle || [];
  window.adBreak  = window.adBreak  || function (o) { window.adsbygoogle.push(o); };
  window.adConfig = window.adConfig || function (o) { window.adsbygoogle.push(o); };
}

/**
 * @param {string} placementName - nome curto e estável do placement (aparece
 *   nos relatórios do AdSense). Ex.: "dashboard-entrada", "perfil-entrada".
 */
export function useInterstitialAd(placementName) {
  const pending = useRef(false);

  /**
   * @param {() => void} [onDone] - chamado sempre, com ou sem anúncio
   *   exibido (anúncio visto até o fim, sem preenchimento, ou timeout de
   *   segurança). O fluxo do app nunca fica esperando o usuário "concluir"
   *   nada aqui.
   */
  const showInterstitial = useCallback((onDone) => {
    if (!ADSENSE_CLIENT) {
      onDone?.();
      return;
    }
    if (pending.current) return;
    pending.current = true;

    ensureAdBreakGlobals();
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      pending.current = false;
      onDone?.();
    };

    // Rede de segurança: nada travado indefinidamente esperando o Google.
    const timeoutId = setTimeout(finish, RESPONSE_TIMEOUT_MS);

    try {
      window.adBreak({
        type: 'next',
        name: placementName,
        afterAd() {
          finish();
        },
        adBreakDone() {
          // Cobre também o caso de "sem preenchimento" (afterAd não chega
          // a disparar) — não é culpa do usuário, segue o fluxo normal.
          finish();
        },
      });
    } catch {
      // Bloqueador de anúncio ou script ainda não carregou — não trava o
      // fluxo por causa disso.
      finish();
    }
  }, [placementName]);

  return { showInterstitial };
}

export default useInterstitialAd;
