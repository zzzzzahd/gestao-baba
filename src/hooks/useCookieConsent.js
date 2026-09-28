import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'draftplay_cookie_consent';

function readStored() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function useCookieConsent() {
  const [consent, setConsent] = useState(() => readStored());

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) {
        setConsent(e.newValue);
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const accept = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, 'accepted');
    } catch {
      // localStorage indisponível: mantém o consentimento apenas em memória.
    }

    setConsent('accepted');
  }, []);

  const rejectAds = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, 'essential-only');
    } catch {
      // localStorage indisponível: mantém a decisão apenas em memória.
    }

    setConsent('essential-only');
  }, []);

  return { consent, accept, rejectAds };
}

export default useCookieConsent;
