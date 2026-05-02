// src/utils/constants.js
// ─────────────────────────────────────────────────────────────────────────────
// Constantes globais do Draft Play.
// Centralizadas aqui para evitar duplicação entre páginas.
// ─────────────────────────────────────────────────────────────────────────────

/** Abreviações dos dias da semana (índice 0 = Domingo) */
export const DAY_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

/** Nomes completos dos dias da semana (índice 0 = Domingo) */
export const DAY_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

/** Mapeamento de posição (valor do banco → label exibido) */
export const POSITION_LABEL = {
  goleiro:  'Goleiro',
  linha:    'Linha',
  zagueiro: 'Zagueiro',
  lateral:  'Lateral',
  meia:     'Meia',
  atacante: 'Atacante',
};

/** Gradiente padrão cyan-electric → blue (botão primário) */
export const CYAN_GRADIENT = { background: 'linear-gradient(135deg, #00f2ff, #0066ff)' };
