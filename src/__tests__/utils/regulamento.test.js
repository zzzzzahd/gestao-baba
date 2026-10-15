import { describe, it, expect } from 'vitest';
import { defaultRegulamento, validateRegulamento, buildRegulamento, TIEBREAKERS } from '../../utils/regulamento';

const base = (over = {}) => ({ ...defaultRegulamento(), name: 'Copa do Baba', ...over });

describe('validateRegulamento', () => {
  it('exige nome', () => {
    expect(validateRegulamento(defaultRegulamento()).join(' ')).toMatch(/nome do torneio/i);
  });
  it('configuração padrão com nome é válida', () => {
    expect(validateRegulamento(base())).toEqual([]);
  });
  it('rejeita pontuação incoerente e valores fora do limite', () => {
    expect(validateRegulamento(base({ pointsWin: 1, pointsDraw: 1 })).join(' ')).toMatch(/vitória maior que empate/i);
    expect(validateRegulamento(base({ matchMinutes: 2 })).join(' ')).toMatch(/duração da partida/i);
    expect(validateRegulamento(base({ maxRegistered: 3 })).join(' ')).toMatch(/máximo de inscritos/i);
    expect(validateRegulamento(base({ minPlayers: 9 })).join(' ')).toMatch(/mínimo para iniciar/i);
    expect(validateRegulamento(base({ lateTolerance: NaN })).length).toBeGreaterThan(0);
  });
  it('herda a validação de formato (grupos impossíveis)', () => {
    expect(validateRegulamento(base({ format: 'groups', teams: 5, groupCount: 3 })).length).toBeGreaterThan(0);
  });
  it('mata-mata não valida pontuação', () => {
    expect(validateRegulamento(base({ format: 'knockout', pointsWin: 0, pointsDraw: 0 }))).toEqual([]);
  });
});

describe('buildRegulamento', () => {
  it('pontos corridos: pontuação, desempate em ordem e sorteio por último; sem seção de pênaltis', () => {
    const { text, sections } = buildRegulamento(base());
    expect(text).toContain('COPA DO BABA');
    expect(text).toMatch(/Vitória vale 3 pontos, empate vale 1 ponto e derrota vale 0 pontos/);
    expect(text).toMatch(/a\) Maior número de vitórias;\n\s+b\) Maior saldo de gols;/);
    expect(text).toMatch(/Sorteio, realizado pela organização/);
    expect(sections.some((s) => /Empates nas partidas eliminatórias/.test(s.title))).toBe(false);
    expect(text).toContain('15 jogos'); // 6 equipes, turno único
  });
  it('respeita a ordem e a seleção de critérios', () => {
    const { text } = buildRegulamento(base({ tiebreakers: ['golspro', 'saldo'] }));
    expect(text.indexOf('gols marcados')).toBeLessThan(text.indexOf('saldo de gols'));
    expect(text).not.toMatch(/Confronto direto/);
  });
  it('mata-mata com 6 equipes: byes, pênaltis e sem seção de pontuação', () => {
    const { text, sections } = buildRegulamento(base({ format: 'knockout', teams: 6, thirdPlace: true }));
    expect(text).toMatch(/2 equipes avançam direto/);
    expect(text).toContain('disputa de pênaltis');
    expect(text).toContain('disputa de 3º lugar');
    expect(sections.some((s) => /Pontuação/.test(s.title))).toBe(false);
    expect(text).toContain('6 jogos'); // 5 do mata-mata + disputa de 3º lugar
  });
  it('prorrogação aparece quando escolhida', () => {
    expect(buildRegulamento(base({ format: 'knockout', teams: 8, knockoutDraw: 'prorrogacao' })).text).toMatch(/prorrogação de 5 minutos/);
  });
  it('grupos + eliminatórias: classificados e total de jogos', () => {
    const { text } = buildRegulamento(base({ format: 'groups', teams: 8, groupCount: 2, advancePerGroup: 2 }));
    expect(text).toMatch(/2 grupos/);
    expect(text).toMatch(/\(4 equipes\)/);
    expect(text).toContain('15 jogos');
    expect(text).toMatch(/Empates nas partidas eliminatórias/i);
  });
  it('disciplina e campos opcionais só entram se preenchidos/ligados', () => {
    const off = buildRegulamento(base({ yellowSuspensionAt: 0, redSuspension: false })).text;
    expect(off).not.toMatch(/cartão amarelo/);
    expect(off).not.toMatch(/Premiação/);
    const on = buildRegulamento(base({ yellowSuspensionAt: 3, fee: 'R$ 100 por equipe', prize: 'Troféu para o campeão' })).text;
    expect(on).toMatch(/3 cartões amarelos/);
    expect(on).toMatch(/Inscrição: R\$ 100 por equipe\./);
    expect(on).toMatch(/PREMIAÇÃO/);
  });
  it('dois tempos e rodapé de aviso', () => {
    const { text } = buildRegulamento(base({ halves: 'dois', matchMinutes: 30 }));
    expect(text).toMatch(/dois tempos de 15 minutos/);
    expect(text).toMatch(/não substitui orientação jurídica/);
  });
  it('lista de critérios disponíveis não inclui sorteio (sempre automático)', () => {
    expect(TIEBREAKERS.some((t) => t.id === 'sorteio')).toBe(false);
  });
});
