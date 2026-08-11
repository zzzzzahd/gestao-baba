// src/components/AdBanner.jsx
// Fase 1.2 — Banner estático do Google AdSense.
// Regras combinadas no plano de monetização:
//   - Nunca aparece pro assinante (Pro/Coordenador)
//   - Nunca aparece em telas de ação (sorteio, partida ao vivo)
//   - Fica "vazio" (não renderiza nada) até a conta AdSense ser aprovada e o
//     slot ser preenchido via variável de ambiente (item 1.1 do plano)

import React, { useEffect, useRef } from 'react';
import { usePlan } from '../hooks/usePlan';

const ADSENSE_CLIENT = import.meta.env.VITE_ADSENSE_CLIENT_ID;

/**
 * @param {Object} props
 * @param {string} props.slot       - ID do slot de anúncio (AdSense → Unidades de anúncio)
 * @param {string} [props.className]
 */
export function AdBanner({ slot, className = '' }) {
  const { showAds } = usePlan();
  const insRef = useRef(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (!showAds || !ADSENSE_CLIENT || !slot) return;
    if (pushed.current) return;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // Silencioso: bloqueador de anúncio ou script ainda não carregado
      // não deve quebrar a tela por trás do banner.
    }
  }, [showAds, slot]);

  // Assinante nunca vê anúncio. Sem client/slot configurado (conta AdSense
  // ainda não aprovada), o componente não renderiza nada — placeholder vazio.
  if (!showAds || !ADSENSE_CLIENT || !slot) return null;

  return (
    <div
      className={`w-full flex justify-center overflow-hidden ${className}`}
      aria-label="Publicidade"
    >
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: 'block', width: '100%' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}

export default AdBanner;
