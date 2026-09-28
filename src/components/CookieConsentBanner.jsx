import { matchPath, useLocation } from 'react-router-dom';
import { useCookieConsent } from '../hooks/useCookieConsent';

const AD_ELIGIBLE_PATTERNS = [
  '/',
  '/sobre',
  '/player/:userId',
  '/visitor-match',
];

function isAdEligiblePath(pathname) {
  return AD_ELIGIBLE_PATTERNS.some((pattern) =>
    matchPath(pattern, pathname)
  );
}

export function CookieConsentBanner() {
  const location = useLocation();
  const { consent, accept, rejectAds } = useCookieConsent();

  if (consent !== null) return null;
  if (!isAdEligiblePath(location.pathname)) return null;

  return (
    <div
      role="dialog"
      aria-label="Consentimento de cookies"
      className="fixed bottom-0 inset-x-0 z-40 bg-surface-1 border-t border-border-mid px-4 py-4 sm:px-6"
    >
      <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <p className="text-[11px] text-text-mid font-bold leading-relaxed flex-1">
          Usamos cookies essenciais e, com sua permissão, cookies de anúncios
          (Google AdSense) pra manter o Draft Play gratuito. Veja nossa{' '}
          <a
            href="/privacidade"
            className="underline text-cyan-electric"
          >
            Política de Privacidade
          </a>
          .
        </p>

        <div className="flex gap-2 shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={rejectAds}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-border-mid text-[10px] font-black uppercase text-text-low hover:text-white transition-colors"
          >
            Só essenciais
          </button>

          <button
            type="button"
            onClick={accept}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-cyan-electric text-black text-[10px] font-black uppercase"
          >
            Aceitar
          </button>
        </div>
      </div>
    </div>
  );
}

export default CookieConsentBanner;
