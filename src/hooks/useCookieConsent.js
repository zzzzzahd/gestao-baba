// src/hooks/useCookieConsent.js
//
// Consentimento de cookies pra visitante ANÔNIMO nas páginas públicas que
// carregam o AdSense (Landing, Sobre, Perfil Público). Separado do
// ConsentModal.jsx (que é sobre tratamento de dados da CONTA, mostrado só
// depois do login) — esse aqui existe porque o AdSense/cookies de anúncio
// rodam em rotas sem login nenhum, então o consentimento de conta não cobre
// esse caso. Ver achado do Sprint 10 da auditoria AdSense.
//
// Valor de 'accepted' é a única condição que libera o AdsenseScriptGate a
// injetar o script real do AdSense. Qualquer outro valor (null = ainda não
// decidiu, 'essential-only' = recusou) mantém o script fora do DOM.

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'draftplay_cookie_consent';

function readStored() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function updateGoogleConsent(granted) {
  if (typeof window.gtag !== 'function') return;
  window.gtag('consent', 'update', {
    ad_storage: granted ? 'granted' : 'denied',
    ad_user_data: granted ? 'granted' : 'denied',
    ad_personalization: granted ? 'granted' : 'denied',
    // analytics_storage fica sempre 'denied' — Plausible é cookieless e
    // não usa esse sinal, não tem GA4/GTM no projeto.
  });
}

export function useCookieConsent() {
  const [consent, setConsent] = useState(() => readStored());

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setConsent(e.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Reaplica o sinal de consentimento já salvo assim que a página carrega
  // (o gtag.js só sabe do 'default' até aqui rodar — sem isso, um visitante
  // que já tinha aceitado antes ficaria tratado como 'denied' de novo a
  // cada nova visita, até clicar de novo).
  useEffect(() => {
    if (consent === 'accepted') updateGoogleConsent(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const accept = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, 'accepted');
    } catch {
      /* localStorage indisponível (modo privado etc.) — segue sem persistir */
    }
    updateGoogleConsent(true);
    setConsent('accepted');
  }, []);

  const rejectAds = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, 'essential-only');
    } catch {
      /* idem */
    }
    updateGoogleConsent(false);
    setConsent('essential-only');
  }, []);

  return { consent, accept, rejectAds };
}

export default useCookieConsent;
