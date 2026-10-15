// src/components/AdBanner.jsx
// Fase 1.2 — Banner estático do Google AdSense.
// Regras combinadas no plano de monetização:
//   - Nunca aparece pro assinante (Pro/Coordenador)
//   - Nunca aparece em telas de ação (sorteio, partida ao vivo)
//   - Fica "vazio" (não renderiza nada) até a conta AdSense ser aprovada e o
//     slot ser preenchido via variável de ambiente (item 1.1 do plano)

import React, { useEffect, useRef } from 'react';
import { useInRouterContext, useLocation } from 'react-router-dom';
import { isAdEligiblePath } from '../utils/adEligibility';
import { usePlan } from '../hooks/usePlan';

const ADSENSE_CLIENT = import.meta.env.VITE_ADSENSE_CLIENT_ID;

/**
 * @param {Object} props
 * @param {string} props.slot       - ID do slot de anúncio (AdSense → Unidades de anúncio)
 * @param {string} [props.className]
 */
function useRouteAllowsAds() {
  // Sem Router (testes isolados) não há rota para checar: não bloqueia.
  const inRouter = useInRouterContext();
  const pathname = inRouter ? useLocation().pathname : null; // eslint-disable-line react-hooks/rules-of-hooks
  return pathname === null ? true : isAdEligiblePath(pathname);
}

export function AdBanner({ slot, className = '' }) {
  const { showAds: planShowsAds } = usePlan();
  // Política única (src/utils/adEligibility.js): mesmo que alguém coloque um
  // <AdBanner> numa rota não elegível, ele não renderiza.
  const routeAllowsAds = useRouteAllowsAds();
  const showAds = planShowsAds && routeAllowsAds;
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
      style={{ minHeight: '250px' }}
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
