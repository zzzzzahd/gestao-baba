import { describe, it, expect } from 'vitest';
import {
  toLocalDateStr, getGameDayConfigs, getDrawMoment, getConfirmationDeadline, getTodayGame, formatHM,
} from '../../utils/drawSchedule';

// Quinta-feira 22/out/2026
const at = (h, m = 0) => new Date(2026, 9, 22, h, m, 0, 0);
const baba = (extra = {}) => ({ game_days_config: [{ day: 4, time: '20:00', location: '' }], ...extra });

describe('toLocalDateStr', () => {
  it('usa o relógio local (jogo às 22h não vira "amanhã")', () => {
    expect(toLocalDateStr(at(22, 30))).toBe('2026-10-22');
  });
});

describe('getGameDayConfigs', () => {
  it('lê game_days_config e ignora itens inválidos/duplicados', () => {
    const r = getGameDayConfigs({ game_days_config: [{ day: 2, time: '19:00' }, { day: 2, time: '20:00' }, { day: 9, time: '20:00' }, null] });
    expect(r).toEqual([{ day: 2, time: '19:00', location: '' }]);
  });
  it('cai no formato legado game_days + game_time', () => {
    expect(getGameDayConfigs({ game_days: [3], game_time: '19:00:00' })[0]).toMatchObject({ day: 3, time: '19:00' });
  });
});

describe('getDrawMoment / getConfirmationDeadline', () => {
  const game = at(20);
  it('sem automático: 30 min antes do jogo', () => {
    expect(formatHM(getDrawMoment(baba(), game))).toBe('19:30');
  });
  it('automático: usa auto_draw_time', () => {
    expect(formatHM(getDrawMoment(baba({ auto_draw_enabled: true, auto_draw_time: '18:00:00' }), game))).toBe('18:00');
  });
  it('horário depois do jogo é limitado ao padrão (30 min antes)', () => {
    expect(formatHM(getDrawMoment(baba({ auto_draw_enabled: true, auto_draw_time: '21:00:00' }), game))).toBe('19:30');
  });
  it('prazo de confirmação fecha junto com o sorteio quando ele é mais cedo', () => {
    expect(formatHM(getConfirmationDeadline(baba({ auto_draw_enabled: true, auto_draw_time: '18:00' }), game))).toBe('18:00');
    expect(formatHM(getConfirmationDeadline(baba(), game))).toBe('19:30');
  });
});

describe('getTodayGame', () => {
  const b = baba({ auto_draw_enabled: true, auto_draw_time: '19:00' });
  it('null se hoje não tem jogo', () => {
    expect(getTodayGame({ game_days_config: [{ day: 1, time: '20:00' }] }, at(10))).toBeNull();
  });
  it('antes da hora: isBefore', () => {
    expect(getTodayGame(b, at(10))).toMatchObject({ isBefore: true, isDue: false, dateStr: '2026-10-22' });
  });
  it('depois do prazo de confirmação (19:30) ainda é o jogo de hoje e está na hora de sortear', () => {
    expect(getTodayGame(b, at(19, 45))).toMatchObject({ isDue: true, isOver: false });
  });
  it('a janela vale até 3h depois do início do jogo', () => {
    expect(getTodayGame(b, at(22, 59)).isDue).toBe(true);
    expect(getTodayGame(b, at(23, 1))).toMatchObject({ isDue: false, isOver: true });
  });
});
