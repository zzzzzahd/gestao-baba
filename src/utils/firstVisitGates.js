// src/utils/firstVisitGates.js
// Decide (sem importar os modais) se onboarding, changelog e NPS beta devem aparecer.
// Fica fora dos componentes para que o App só baixe o código dos modais quando
// eles realmente forem abertos (lazy). Chaves de localStorage = fonte única,
// também usadas pelos modais para gravar o "já visto".

export const ONBOARDING_KEY = 'draft_play_onboarding_done_v2';

export const CHANGELOG_VERSION = '2.0.0';
export const CHANGELOG_STORAGE_KEY = `draft_play_changelog_seen_${CHANGELOG_VERSION}`;

export const BETA_NPS_SHOWN_KEY = 'draft_play_beta_nps_shown';

export const shouldShowOnboarding = () => {
  try { return !localStorage.getItem(ONBOARDING_KEY); }
  catch { return false; }
};

export const shouldShowChangelog = () => {
  try { return !localStorage.getItem(CHANGELOG_STORAGE_KEY); }
  catch { return false; }
};

export const shouldShowBetaFeedback = (gamesPlayed = 0) => {
  try {
    if (localStorage.getItem(BETA_NPS_SHOWN_KEY)) return false;
    return gamesPlayed >= 3;
  } catch { return false; }
};
