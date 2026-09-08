// src/hooks/useInterstitialGate.js
//
// Decide QUANDO de fato disparar um interstitial não-recompensado
// (useInterstitialAd) ao entrar numa tela:
//
//   - Nunca pro Assinante (nem trial) — mesma regra do AdBanner, via
//     usePlan().showAds.
//   - Não em toda entrada na tela: só 1 a cada `frequency` visitas àquele
//     placement (guardado por usuário no localStorage), pra não incomodar
//     quem usa o app o tempo todo.
//   - Só uma vez por montagem do componente (não reabre em cada re-render).
//
// Uso: no topo da página (Dashboard, Home, Perfil), fora de qualquer
// condicional —
//   useInterstitialGate('dashboard-entrada');

import { useEffect, useRef } from 'react';
import { usePlan } from './usePlan';
import { useInterstitialAd } from './useInterstitialAd';

const STORAGE_PREFIX = 'draftplay:interstitial:';

/**
 * @param {string} placementName - mesmo nome usado no relatório do AdSense.
 * @param {Object} [options]
 * @param {number} [options.frequency=3] - mostra 1 a cada N entradas na tela.
 */
export function useInterstitialGate(placementName, { frequency = 3 } = {}) {
  const { showAds } = usePlan();
  const { showInterstitial } = useInterstitialAd(placementName);
  const firedRef = useRef(false);

  useEffect(() => {
    // Assinante (ou trial) nunca vê anúncio — mesma regra do AdBanner.
    if (!showAds) return;
    // Só uma checagem por montagem da tela.
    if (firedRef.current) return;
    firedRef.current = true;

    let count = 1;
    try {
      const key = `${STORAGE_PREFIX}${placementName}`;
      count = Number(localStorage.getItem(key) || '0') + 1;
      localStorage.setItem(key, String(count));
    } catch {
      // localStorage indisponível (modo privado, etc.) — não trava a tela
      // por causa disso, só não aplica o controle de frequência.
    }

    if (count % frequency === 0) {
      showInterstitial();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAds, placementName]);
}

export default useInterstitialGate;
