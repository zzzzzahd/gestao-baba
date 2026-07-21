// src/__tests__/utils/messages.test.js
// Sprint T-9 — Utils: messages.js
// Testa a função fmt() e todos os arrays de mensagem.

import { describe, it, expect } from 'vitest';
import {
  fmt,
  GOAL_MESSAGES,
  WIN_MESSAGES,
  DRAW_MESSAGES,
  MVP_MESSAGES,
  STREAK_MESSAGES,
  FIRST_GOAL_MESSAGES,
} from '../../utils/messages';

describe('fmt', () => {
  it('substitui {name} por valor fornecido', () => {
    const result = fmt(['Gol do {name}!'], { name: 'João' });
    expect(result).toBe('Gol do João!');
  });

  it('substitui {team} por valor fornecido', () => {
    const result = fmt(['{team} venceu'], { team: 'Azul' });
    expect(result).toBe('Azul venceu');
  });

  it('substitui {n} por valor fornecido', () => {
    const result = fmt(['{n} jogos'], { n: 5 });
    expect(result).toBe('5 jogos');
  });

  it('substitui múltiplas ocorrências do mesmo placeholder', () => {
    const result = fmt(['{name} e {name}'], { name: 'Zico' });
    expect(result).toBe('Zico e Zico');
  });

  it('substitui múltiplos placeholders diferentes', () => {
    const result = fmt(['{name} do {team}'], { name: 'Pelé', team: 'Santos' });
    expect(result).toBe('Pelé do Santos');
  });

  it('retorna uma das mensagens do array (aleatório)', () => {
    const messages = ['Msg A', 'Msg B', 'Msg C'];
    const result = fmt(messages, {});
    expect(messages).toContain(result);
  });

  it('funciona com array de tamanho 1', () => {
    const result = fmt(['Mensagem fixa'], {});
    expect(result).toBe('Mensagem fixa');
  });

  it('não substitui placeholder ausente nas vars', () => {
    const result = fmt(['Olá {name}!'], {});
    // placeholder fica no texto pois sem variável
    expect(result).toBe('Olá {name}!');
  });

  it('funciona com vars vazio ({})', () => {
    expect(() => fmt(['Texto simples'], {})).not.toThrow();
  });
});

describe('GOAL_MESSAGES', () => {
  it('é um array não vazio', () => {
    expect(GOAL_MESSAGES.length).toBeGreaterThan(0);
  });

  it('todos os itens contêm {name}', () => {
    GOAL_MESSAGES.forEach(m =>
      expect(m).toContain('{name}')
    );
  });

  it('fmt com GOAL_MESSAGES substitui nome corretamente', () => {
    const result = fmt(GOAL_MESSAGES, { name: 'Ronaldo' });
    expect(result).toContain('Ronaldo');
    expect(result).not.toContain('{name}');
  });
});

describe('WIN_MESSAGES', () => {
  it('é um array não vazio', () => {
    expect(WIN_MESSAGES.length).toBeGreaterThan(0);
  });

  it('todos os itens contêm {team}', () => {
    WIN_MESSAGES.forEach(m => expect(m).toContain('{team}'));
  });

  it('fmt com WIN_MESSAGES substitui time corretamente', () => {
    const result = fmt(WIN_MESSAGES, { team: 'Preto' });
    expect(result).toContain('Preto');
  });
});

describe('DRAW_MESSAGES', () => {
  it('é um array não vazio', () => {
    expect(DRAW_MESSAGES.length).toBeGreaterThan(0);
  });

  it('nenhum item usa placeholder (textos fixos)', () => {
    DRAW_MESSAGES.forEach(m =>
      expect(m).not.toMatch(/{[a-z]+}/)
    );
  });
});

describe('MVP_MESSAGES', () => {
  it('é um array não vazio', () => {
    expect(MVP_MESSAGES.length).toBeGreaterThan(0);
  });

  it('todos os itens contêm {name}', () => {
    MVP_MESSAGES.forEach(m => expect(m).toContain('{name}'));
  });
});

describe('STREAK_MESSAGES', () => {
  it('todos os itens contêm {name} e {n}', () => {
    STREAK_MESSAGES.forEach(m => {
      expect(m).toContain('{name}');
      expect(m).toContain('{n}');
    });
  });

  it('fmt substitui ambos', () => {
    const result = fmt(STREAK_MESSAGES, { name: 'Zico', n: 5 });
    expect(result).toContain('Zico');
    expect(result).toContain('5');
  });
});

describe('FIRST_GOAL_MESSAGES', () => {
  it('todos os itens contêm {name}', () => {
    FIRST_GOAL_MESSAGES.forEach(m => expect(m).toContain('{name}'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// constants.js
// ─────────────────────────────────────────────────────────────────────────────

import {
  DAY_SHORT,
  DAY_FULL,
  POSITION_LABEL,
  CYAN_GRADIENT,
} from '../../utils/constants';

describe('constants › DAY_SHORT', () => {
  it('tem 7 itens (Dom→Sáb)', () => {
    expect(DAY_SHORT).toHaveLength(7);
  });

  it('índice 0 = DOM', () => {
    expect(DAY_SHORT[0]).toBe('DOM');
  });

  it('índice 6 = SÁB', () => {
    expect(DAY_SHORT[6]).toBe('SÁB');
  });
});

describe('constants › DAY_FULL', () => {
  it('tem 7 itens', () => {
    expect(DAY_FULL).toHaveLength(7);
  });

  it('índice 0 = Domingo', () => {
    expect(DAY_FULL[0]).toBe('Domingo');
  });

  it('índice 6 = Sábado', () => {
    expect(DAY_FULL[6]).toBe('Sábado');
  });
});

describe('constants › POSITION_LABEL', () => {
  it('contém goleiro', () => {
    expect(POSITION_LABEL.goleiro).toBe('Goleiro');
  });

  it('contém posições de futsal (fixo, ala, pivo)', () => {
    expect(POSITION_LABEL.fixo).toBe('Fixo');
    expect(POSITION_LABEL.ala).toBe('Ala');
    expect(POSITION_LABEL.pivo).toBe('Pivô');
  });

  it('tem pelo menos 9 posições', () => {
    expect(Object.keys(POSITION_LABEL).length).toBeGreaterThanOrEqual(9);
  });
});

describe('constants › CYAN_GRADIENT', () => {
  it('é um objeto com background', () => {
    expect(CYAN_GRADIENT).toHaveProperty('background');
  });

  it('background contém linear-gradient', () => {
    expect(CYAN_GRADIENT.background).toContain('linear-gradient');
  });

  it('contém #00f2ff (cyan-electric)', () => {
    expect(CYAN_GRADIENT.background).toContain('#00f2ff');
  });
});
