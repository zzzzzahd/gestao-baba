// src/components/CookieConsentBanner.jsx
//
// Banner simples de rodapé, mostrado só pra visitante ANÔNIMO nas páginas
// públicas elegíveis a anúncio, enquanto ele não tiver decidido ainda. Some
// assim que ele escolher qualquer uma das opções. Não é modal — não bloqueia
// a leitura do conteúdo enquanto a pessoa decide.

import { useLocation, matchPath } from 'react-router-dom';
import { useCookieConsent } from '../hooks/useCookieConsent';

// Mesmas rotas do AdsenseScriptGate — só faz sentido perguntar aqui.
const AD_ELIGIBLE_PATTERNS = ['/', '/sobre', '/player/:userId', '/visitor-match'];

function isAdEligiblePath(pathname) {
  return AD_ELIGIBLE_PATTERNS.some((pattern) => matchPath(pattern, pathname));
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
          Usamos cookies essenciais pro funcionamento do site. Com sua
          permissão, também personalizamos os anúncios (Google AdSense) de
          acordo com seu uso — sem aceitar, você ainda vê anúncios, só que
          não personalizados. Veja nossa{' '}
          <a href="/privacidade" className="underline text-cyan-electric">
            Política de Privacidade
          </a>
          .
        </p>
        <div className="flex gap-2 shrink-0 w-full sm:w-auto">
          <button
            onClick={rejectAds}
            className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border-2 border-white text-[10px] font-black uppercase text-white hover:bg-white hover:text-black transition-colors"
          >
            Rejeitar
          </button>
          <button
            onClick={accept}
            className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border-2 border-cyan-electric bg-cyan-electric text-black text-[10px] font-black uppercase hover:bg-transparent hover:text-cyan-electric transition-colors"
          >
            Aceitar
          </button>
        </div>
      </div>
    </div>
  );
}

export default CookieConsentBanner;
