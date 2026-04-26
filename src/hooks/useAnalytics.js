// src/hooks/useAnalytics.js
// MON-002: Analytics leve via Plausible (sem cookies, LGPD-friendly).
// Instalar Plausible: adicionar script no index.html quando tiver domínio próprio.
// Enquanto isso, os eventos são logados no console em dev e enviados em prod.

const isDev  = import.meta.env.DEV;
const DOMAIN = import.meta.env.VITE_PLAUSIBLE_DOMAIN || window.location.hostname;

// Envia evento para o Plausible se disponível, ou loga em dev
const trackEvent = (eventName, props = {}) => {
  if (isDev) {
    console.log(`[Analytics] ${eventName}`, props);
    return;
  }
  // Plausible expõe window.plausible após o script ser carregado
  if (typeof window.plausible === 'function') {
    window.plausible(eventName, { props });
  }
};

// ─── Hook principal ───────────────────────────────────────────────────────────

export const useAnalytics = () => {

  // Autenticação
  const trackSignUp        = ()           => trackEvent('Sign Up');
  const trackLogin         = ()           => trackEvent('Login');
  const trackLogout        = ()           => trackEvent('Logout');

  // Babas
  const trackBabaCreated   = (modality)   => trackEvent('Baba Created',     { modality });
  const trackBabaJoined    = ()           => trackEvent('Baba Joined');
  const trackInviteCopied  = ()           => trackEvent('Invite Copied');
  const trackQRCodeOpened  = ()           => trackEvent('QR Code Opened');

  // Presença
  const trackPresenceConfirmed  = () => trackEvent('Presence Confirmed');
  const trackPresenceCancelled  = () => trackEvent('Presence Cancelled');

  // Partida
  const trackDrawStarted   = (playerCount) => trackEvent('Draw Started',    { player_count: playerCount });
  const trackGoalScored    = ()            => trackEvent('Goal Scored');
  const trackMatchFinished = (winner)      => trackEvent('Match Finished',  { result: winner || 'draw' });
  const trackWinnerPhoto   = ()            => trackEvent('Winner Photo Saved');

  // Avaliações
  const trackPlayerRated   = ()           => trackEvent('Player Rated');

  // Histórico
  const trackHistoryViewed = ()           => trackEvent('History Viewed');

  // Rankings
  const trackRankingViewed = (tab)        => trackEvent('Ranking Viewed',   { tab });

  // Financeiro
  const trackPaymentSent   = ()           => trackEvent('Payment Sent');

  return {
    trackSignUp,
    trackLogin,
    trackLogout,
    trackBabaCreated,
    trackBabaJoined,
    trackInviteCopied,
    trackQRCodeOpened,
    trackPresenceConfirmed,
    trackPresenceCancelled,
    trackDrawStarted,
    trackGoalScored,
    trackMatchFinished,
    trackWinnerPhoto,
    trackPlayerRated,
    trackHistoryViewed,
    trackRankingViewed,
    trackPaymentSent,
  };
};
