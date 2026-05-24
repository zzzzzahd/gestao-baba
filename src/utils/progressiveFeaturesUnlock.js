// src/utils/progressiveFeaturesUnlock.js
// Sprint 1 — Desbloqueia features gradualmente baseado em jogos disputados.
// Evita sobrecarregar o usuário novo com tudo de uma vez.

export const getUnlockedFeatures = (gamesPlayed = 0) => ({
  rankings:    gamesPlayed >= 3,
  badges:      gamesPlayed >= 3,
  history:     gamesPlayed >= 1,
  ai:          gamesPlayed >= 5,
  financial:   false,     // sempre manual — presidente ativa nas configurações
  tournaments: gamesPlayed >= 5,
  seasons:     gamesPlayed >= 3,
  reactions:   gamesPlayed >= 1,
});

// Mensagens de desbloqueio (usadas em toasts)
export const UNLOCK_MESSAGES = {
  rankings:    '🏆 Rankings desbloqueados! Veja como você tá no baba.',
  badges:      '🛡️ Conquistas desbloqueadas! Colecione badges.',
  ai:          '🤖 IA desbloqueada! O app agora analisa seu desempenho.',
  tournaments: '🎯 Torneios desbloqueados! Organize um mata-mata.',
  seasons:     '📅 Temporadas desbloqueadas! Compete pelo ranking mensal.',
};

// Verificar quais features acabaram de desbloquear
// (comparando antes e depois de incrementar games_played)
export const getNewlyUnlocked = (before, after) => {
  const featsBefore = getUnlockedFeatures(before);
  const featsAfter  = getUnlockedFeatures(after);
  return Object.keys(featsAfter).filter(
    key => featsAfter[key] && !featsBefore[key]
  );
};
