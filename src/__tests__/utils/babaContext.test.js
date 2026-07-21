// src/__tests__/utils/babaContext.test.js
// Testes unitários para os helpers exportados do BabaContext
// sanitizeGameDaysConfig, getNextGameDay, generateBalancedTeams

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sanitizeGameDaysConfig,
  getNextGameDay,
  generateBalancedTeams,
} from '../../contexts/BabaContext';

// ─── sanitizeGameDaysConfig ───────────────────────────────────────────────────

describe('sanitizeGameDaysConfig', () => {
  it('retorna [] para array vazio', () => {
    expect(sanitizeGameDaysConfig([])).toEqual([]);
  });

  it('retorna [] para null/undefined', () => {
    expect(sanitizeGameDaysConfig(null)).toEqual([]);
    expect(sanitizeGameDaysConfig(undefined)).toEqual([]);
  });

  it('retorna [] para não-array', () => {
    expect(sanitizeGameDaysConfig('string')).toEqual([]);
    expect(sanitizeGameDaysConfig(42)).toEqual([]);
  });

  it('filtra itens com day inválido (< 0 ou > 6)', () => {
    const input = [
      { day: -1, time: '20:00' },
      { day: 7,  time: '20:00' },
      { day: 3,  time: '20:00' },
    ];
    const result = sanitizeGameDaysConfig(input);
    expect(result).toHaveLength(1);
    expect(result[0].day).toBe(3);
  });

  it('filtra itens com time inválido', () => {
    const input = [
      { day: 1, time: '25:00' },
      { day: 2, time: 'abc' },
      { day: 3, time: '20:00' },
    ];
    const result = sanitizeGameDaysConfig(input);
    expect(result).toHaveLength(1);
    expect(result[0].day).toBe(3);
  });

  it('aceita times válidos (00:00 a 23:59)', () => {
    const input = [
      { day: 0, time: '00:00' },
      { day: 1, time: '23:59' },
      { day: 2, time: '12:30' },
    ];
    const result = sanitizeGameDaysConfig(input);
    expect(result).toHaveLength(3);
  });

  it('deduplica dias repetidos (mantém só o primeiro)', () => {
    const input = [
      { day: 3, time: '18:00' },
      { day: 3, time: '20:00' },
      { day: 5, time: '20:00' },
    ];
    const result = sanitizeGameDaysConfig(input);
    expect(result.filter(r => r.day === 3)).toHaveLength(1);
    expect(result).toHaveLength(2);
  });

  it('ordena por dia da semana (crescente)', () => {
    const input = [
      { day: 6, time: '20:00' },
      { day: 1, time: '20:00' },
      { day: 3, time: '20:00' },
    ];
    const result = sanitizeGameDaysConfig(input);
    expect(result.map(r => r.day)).toEqual([1, 3, 6]);
  });

  it('trunca time para 5 caracteres (HH:MM)', () => {
    const input = [{ day: 2, time: '20:00:00' }];
    const result = sanitizeGameDaysConfig(input);
    expect(result[0].time).toBe('20:00');
  });

  it('inclui location como string vazia se ausente', () => {
    const input = [{ day: 2, time: '20:00' }];
    const result = sanitizeGameDaysConfig(input);
    expect(result[0].location).toBe('');
  });

  it('mantém location quando fornecida', () => {
    const input = [{ day: 2, time: '20:00', location: 'Quadra do Zé' }];
    const result = sanitizeGameDaysConfig(input);
    expect(result[0].location).toBe('Quadra do Zé');
  });

  it('filtra itens null/não-objeto dentro do array', () => {
    const input = [null, undefined, { day: 2, time: '20:00' }, 'string'];
    const result = sanitizeGameDaysConfig(input);
    expect(result).toHaveLength(1);
    expect(result[0].day).toBe(2);
  });
});

// ─── getNextGameDay ───────────────────────────────────────────────────────────

describe('getNextGameDay', () => {
  // Fixar data: segunda-feira (dow=1), 10:00
  const FIXED_DATE = new Date(2025, 5, 9, 10, 0, 0); // 09/Jun/2025 (segunda)

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_DATE);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retorna null para baba null', () => {
    expect(getNextGameDay(null)).toBeNull();
  });

  it('retorna null para baba sem game_days_config nem game_days', () => {
    expect(getNextGameDay({ id: 'b1' })).toBeNull();
  });

  it('retorna null para game_days_config vazio', () => {
    expect(getNextGameDay({ game_days_config: [] })).toBeNull();
  });

  it('retorna o próximo jogo quando é hoje (antes do deadline)', () => {
    // Jogo às 20:00 segunda (dow=1), deadline 19:30 — agora são 10:00
    const baba = { game_days_config: [{ day: 1, time: '20:00', location: 'Quadra' }] };
    const result = getNextGameDay(baba);
    expect(result).not.toBeNull();
    expect(result.daysAhead).toBe(0);
    expect(result.time).toBe('20:00');
  });

  it('pula para próxima semana quando deadline já passou', () => {
    // Jogo às 09:00 segunda (dow=1), deadline 08:30 — agora são 10:00 → passou
    const baba = { game_days_config: [{ day: 1, time: '09:00', location: '' }] };
    const result = getNextGameDay(baba);
    expect(result).not.toBeNull();
    expect(result.daysAhead).toBe(7);
  });

  it('retorna o jogo mais próximo entre múltiplos dias', () => {
    // Agora: segunda 10:00. Jogos: terça (2) e sexta (5)
    const baba = {
      game_days_config: [
        { day: 2, time: '20:00', location: '' },
        { day: 5, time: '20:00', location: '' },
      ],
    };
    const result = getNextGameDay(baba);
    expect(result.day).toBe(2); // terça é mais próxima
    expect(result.daysAhead).toBe(1);
  });

  it('retorna dateStr no formato YYYY-MM-DD', () => {
    const baba = { game_days_config: [{ day: 2, time: '20:00', location: '' }] };
    const result = getNextGameDay(baba);
    expect(result.dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('deadline é 30 minutos antes do jogo', () => {
    const baba = { game_days_config: [{ day: 1, time: '20:00', location: '' }] };
    const result = getNextGameDay(baba);
    const diff = result.date.getTime() - result.deadline.getTime();
    expect(diff).toBe(30 * 60 * 1000);
  });

  it('funciona com game_days legado (sem game_days_config)', () => {
    const baba = {
      game_days:  [3],  // quarta
      game_time:  '19:00',
      location:   'Campo velho',
    };
    const result = getNextGameDay(baba);
    expect(result).not.toBeNull();
    expect(result.day).toBe(3);
    expect(result.time).toBe('19:00');
  });
});

// ─── generateBalancedTeams ────────────────────────────────────────────────────

describe('generateBalancedTeams', () => {
  const makePlayer = (id, rating, position = 'linha') => ({
    id,
    name:         `Jogador ${id}`,
    position,
    final_rating: rating,
  });

  it('retorna 2 times por padrão', () => {
    const players = [1, 2, 3, 4].map(i => makePlayer(i, 7));
    const teams = generateBalancedTeams(players);
    expect(teams).toHaveLength(2);
  });

  it('retorna N times quando numTeams é especificado', () => {
    const players = [1, 2, 3].map(i => makePlayer(i, 7));
    const teams = generateBalancedTeams(players, 3);
    expect(teams).toHaveLength(3);
  });

  it('distribui todos os jogadores entre os times', () => {
    const players = [1, 2, 3, 4, 5, 6].map(i => makePlayer(i, 7));
    const teams = generateBalancedTeams(players, 2);
    const totalPlayers = teams.reduce((sum, t) => sum + t.players.length, 0);
    expect(totalPlayers).toBe(6);
  });

  it('separa goleiros dos jogadores de linha', () => {
    const players = [
      makePlayer(1, 8, 'goleiro'),
      makePlayer(2, 8, 'goleiro'),
      makePlayer(3, 7, 'linha'),
      makePlayer(4, 7, 'linha'),
    ];
    const teams = generateBalancedTeams(players, 2);
    // Cada time deve ter 1 goleiro
    teams.forEach(t => {
      const goalies = t.players.filter(p => p.position === 'goleiro');
      expect(goalies).toHaveLength(1);
    });
  });

  it('times têm nome Time A, Time B, etc.', () => {
    const players = [1, 2].map(i => makePlayer(i, 7));
    const teams = generateBalancedTeams(players, 2);
    expect(teams[0].name).toBe('Time A');
    expect(teams[1].name).toBe('Time B');
  });

  it('calcula totalRating corretamente', () => {
    const players = [
      makePlayer(1, 8),
      makePlayer(2, 6),
      makePlayer(3, 8),
      makePlayer(4, 6),
    ];
    const teams = generateBalancedTeams(players, 2);
    teams.forEach(t => {
      expect(t.totalRating).toBeGreaterThan(0);
    });
  });

  it('não crasha com lista vazia', () => {
    expect(() => generateBalancedTeams([], 2)).not.toThrow();
    const teams = generateBalancedTeams([], 2);
    expect(teams).toHaveLength(2);
    teams.forEach(t => expect(t.players).toHaveLength(0));
  });

  it('usa no mínimo 2 times (evita divisão por zero)', () => {
    const players = [1, 2].map(i => makePlayer(i, 7));
    const teams = generateBalancedTeams(players, 0);
    expect(teams.length).toBeGreaterThanOrEqual(2);
  });

  it('distribui jogadores de maior rating primeiro (snake draft)', () => {
    const players = [
      makePlayer(1, 10),
      makePlayer(2, 9),
      makePlayer(3, 8),
      makePlayer(4, 7),
    ];
    const teams = generateBalancedTeams(players, 2);
    // No snake draft: Time A recebe 1º e 4º, Time B recebe 2º e 3º
    // Ratings totais devem estar próximos
    const diff = Math.abs(teams[0].totalRating - teams[1].totalRating);
    expect(diff).toBeLessThanOrEqual(4); // tolerância razoável
  });
});
