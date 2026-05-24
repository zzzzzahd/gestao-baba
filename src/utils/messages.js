// src/utils/messages.js
// Sprint 2 — Identidade e Zoeira.
// Frases para gol, vitória, derrota, MVP e narrativa geral.

export const GOAL_MESSAGES = [
  '⚽ GOL DO {name}! Isso aí, meu filho!',
  '🔥 {name} na área! Tá on!',
  '💥 {name} não perdoou! Gol!',
  '🎯 {name} mandou ver! Que golaço!',
  '👑 {name} com categoria! GOL!',
  '🚀 {name} foi nas alturas! Gol!',
  '😤 {name} sem pedir licença! Gol!',
  '⚡ Relâmpago chama-se {name}! Gol!',
];

export const WIN_MESSAGES = [
  '🏆 {team} arrasou! Fica pra próxima!',
  '💪 {team} foi melhor hoje. Próximo!',
  '🔥 {team} tá em chamas! Vitória!',
  '👑 {team} mostrou quem manda!',
  '🎉 {team} venceu! Comemoração liberada!',
  '⚡ {team} passou por cima! Vitória!',
];

export const DRAW_MESSAGES = [
  '🤝 Empatou! Saem os dois, chegam os próximos!',
  '🫱 Empate honesto! Troca os times!',
  '😅 Ninguém saiu melhor... Próximos!',
  '🔄 0 a 0 no espírito! Roda o baba!',
];

export const MVP_MESSAGES = [
  '⭐ {name} foi o craque hoje! MVP do baba!',
  '🏅 {name} voou alto! MVP!',
  '👑 {name} mandou bem demais! MVP da pelada!',
  '🌟 {name} brilhou! Todo mundo viu!',
];

export const STREAK_MESSAGES = [
  '🔥 {name} tá em série de {n} jogos! Não para não!',
  '⚡ {n} jogos seguidos, {name}! Pode isso?!',
  '💪 {name} tá de bom tamanho! {n} jogos na fila!',
];

export const FIRST_GOAL_MESSAGES = [
  '🎊 Primeiro gol de {name} no baba! Batiza o campo!',
  '🥳 {name} abre a conta no baba! Estreia dos sonhos!',
];

/** Substitui placeholders {name}, {team}, {n} */
export const fmt = (messages, vars = {}) => {
  const msg = messages[Math.floor(Math.random() * messages.length)];
  return Object.entries(vars).reduce(
    (str, [k, v]) => str.replace(new RegExp(`{${k}}`, 'g'), v),
    msg
  );
};
