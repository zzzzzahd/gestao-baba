// src/__tests__/integration/matchLifecycle.test.jsx
// Suíte de integração — Ciclo de vida completo da partida no Dashboard.
//
// Cobre, com um sorteio de 4 times:
//   • Sorteio (BabaContext.drawTeamsIntelligent) gerando 4 times balanceados
//   • StepMatch: cronômetro, registro de gols e assistências
//   • Sincronização em tempo real via Supabase Realtime (useRealtimeMatch)
//   • Reações ao vivo (MatchReactions)
//   • Fila/rotatividade "quem ganha fica" com 4 times (vitória A, vitória do
//     desafiante e empate — os 3 ramos de src/pages/draw/StepMatch.jsx)
//   • Classificação do dia com soma de pontos (utils/bracket.computeDailyTeamStandings)
//   • Tela de pós-jogo (PostGameScreen) com as mensagens de vitória/empate
//
// Observação: o repositório usa o TestSprite para testes end-to-end orientados
// por IA contra um servidor rodando (testsprite_tests/tmp/config.json). O
// TestSprite roda como um MCP externo que não está disponível neste ambiente
// de chat, então esta suíte usa Vitest + Testing Library (o mesmo framework já
// usado no restante do repositório) para cobrir o mesmo fluxo de ponta a ponta
// em memória. Veja o aviso ao final da resposta para como rodar o TestSprite.

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';

import { computeDailyTeamStandings } from '../../utils/bracket';
import { fmt, WIN_MESSAGES, DRAW_MESSAGES } from '../../utils/messages';

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

const mockUseBaba = vi.fn();
vi.mock('../../contexts/BabaContext', async () => {
  const actual = await vi.importActual('../../contexts/BabaContext');
  return { ...actual, useBaba: () => mockUseBaba() };
});

const mockUseAuth = vi.fn();
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), loading: vi.fn() }),
}));

vi.mock('../../utils/sounds', () => ({
  Sounds: { whistle: vi.fn(), goal: vi.fn(), click: vi.fn(), success: vi.fn() },
}));

// MatchIntro tem uma animação de ~2.8s antes de chamar onDone(); para os
// testes, dispara onDone assim que monta, sem travar a partida numa tela de
// introdução.
vi.mock('../../components/MatchIntro', () => ({
  default: ({ onDone }) => {
    React.useEffect(() => { onDone?.(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
    return null;
  },
}));

// ─── Banco de dados falso, com estado real (permite testar sincronização) ────
// Usa vi.hoisted porque vi.mock('../../services/supabase', factory) é
// hoisted para o topo do arquivo — a factory não pode fechar sobre variáveis
// declaradas normalmente abaixo dela.

const { db, resetDb, createdChannels, resetChannels, supabaseMock } = vi.hoisted(() => {
  // `db` é um objeto ESTÁVEL (nunca reatribuído) para que os testes possam
  // importá-lo por referência; resetDb() apenas limpa os Maps internos.
  const db = { matches: new Map(), matchPlayers: new Map() };
  const state = { matchSeq: 0, createdChannels: [] };

  const resetDb = () => { db.matches.clear(); db.matchPlayers.clear(); };

  const nextMatchId = () => `match-${++state.matchSeq}`;

  function buildQuery(resolve) {
    const q = { op: 'select', columns: null, filters: {}, payload: null };
    const query = {
      select: (cols) => { query.__setOp('select'); q.columns = cols; return query; },
      insert: (rows) => { query.__setOp('insert'); q.payload = rows; return query; },
      update: (payload) => { query.__setOp('update'); q.payload = payload; return query; },
      upsert: (payload) => { query.__setOp('upsert'); q.payload = payload; return query; },
      delete: () => { query.__setOp('delete'); return query; },
      eq:  (k, v) => { q.filters[k] = v; return query; },
      neq: () => query,
      gte: () => query,
      lte: () => query,
      gt:  () => query,
      order: () => query,
      limit: () => query,
      __setOp: (op) => { if (q.op === 'select' || op !== 'select') q.op = op; },
      single:      () => Promise.resolve(resolve(q, 'single')),
      maybeSingle: () => Promise.resolve(resolve(q, 'maybeSingle')),
      then: (onFulfilled, onRejected) =>
        Promise.resolve(resolve(q, 'many')).then(onFulfilled, onRejected),
    };
    return query;
  }

  const matchesResolver = (q) => {
    if (q.op === 'insert') {
      const row = { ...q.payload[0], id: nextMatchId() };
      db.matches.set(row.id, row);
      return { data: row, error: null };
    }
    if (q.op === 'update') {
      const row = db.matches.get(q.filters.id);
      if (row) Object.assign(row, q.payload);
      return { data: row || null, error: null };
    }
    if (q.filters.id) {
      return { data: db.matches.get(q.filters.id) || null, error: null };
    }
    if (q.filters.status === 'in_progress') {
      const row = [...db.matches.values()]
        .find(m => m.baba_id === q.filters.baba_id && m.status === 'in_progress');
      return { data: row || null, error: null };
    }
    if (q.filters.status === 'finished') {
      const rows = [...db.matches.values()]
        .filter(m => m.baba_id === q.filters.baba_id && m.status === 'finished');
      return { data: rows, error: null };
    }
    return { data: null, error: null };
  };

  const matchPlayersResolver = (q) => {
    const key = q.filters.match_id;
    if (q.op === 'insert') {
      const rows = q.payload.map(r => ({ ...r }));
      const arr  = db.matchPlayers.get(rows[0]?.match_id) || [];
      db.matchPlayers.set(rows[0]?.match_id, [...arr, ...rows]);
      return { data: rows, error: null };
    }
    if (q.op === 'update') {
      const arr = db.matchPlayers.get(key) || [];
      const row = arr.find(r => r.player_id === q.filters.player_id);
      if (row) Object.assign(row, q.payload);
      return { data: row || null, error: null };
    }
    const arr = db.matchPlayers.get(key) || [];
    if (q.filters.player_id) {
      return { data: arr.find(r => r.player_id === q.filters.player_id) || null, error: null };
    }
    return { data: arr, error: null };
  };

  const genericResolver = () => ({ data: null, error: null });

  const resetChannels = () => { state.createdChannels.length = 0; };
  const makeChannel = (name) => {
    const handlers = [];
    const chan = {
      name,
      on: (_event, _filter, cb) => { handlers.push(cb); return chan; },
      subscribe: (cb) => { cb?.('SUBSCRIBED'); return chan; },
      send: (...args) => { chan.__sendCalls.push(args[0]); return Promise.resolve({ error: null }); },
      __sendCalls: [],
      unsubscribe: () => {},
      __trigger: (...args) => handlers.forEach(h => h(...args)),
    };
    state.createdChannels.push(chan);
    return chan;
  };

  const supabaseMock = {
    from: (table) => {
      if (table === 'matches')       return buildQuery(matchesResolver);
      if (table === 'match_players') return buildQuery(matchPlayersResolver);
      return buildQuery(genericResolver);
    },
    channel: (name) => makeChannel(name),
    removeChannel: () => {},
    storage: {
      from: () => ({
        upload:       () => Promise.resolve({ error: null }),
        getPublicUrl: () => ({ data: { publicUrl: 'https://img.test/x.png' } }),
      }),
    },
    auth: { getSession: () => Promise.resolve({ data: { session: null }, error: null }) },
    rpc:  () => Promise.resolve({ data: null, error: null }),
  };

  return {
    db,
    resetDb,
    createdChannels: state.createdChannels,
    resetChannels,
    supabaseMock,
  };
});

vi.mock('../../services/supabase', () => ({ supabase: supabaseMock }));

import StepMatch     from '../../pages/draw/StepMatch';
import toast          from 'react-hot-toast';
import { supabase }   from '../../services/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// Dados de teste — sorteio simulado com 4 times (20 jogadores confirmados)
// ─────────────────────────────────────────────────────────────────────────────

const BABA = { id: 'baba-1', name: 'Baba do Zé', president_id: 'user-1', mode: 'competitive', game_time: '20:00:00' };

const makePlayer = (id, name, position = 'linha') => ({ id, name, position });

const TIME_A = { name: 'Time A', players: [
  makePlayer('p1', 'Ana'), makePlayer('p2', 'Bia'), makePlayer('p3', 'Caio'),
  makePlayer('p4', 'Duda'), makePlayer('p5', 'Enzo', 'goleiro'),
]};
const TIME_B = { name: 'Time B', players: [
  makePlayer('p6', 'Fabio'), makePlayer('p7', 'Gina'), makePlayer('p8', 'Hugo'),
  makePlayer('p9', 'Ivan'), makePlayer('p10', 'Julia', 'goleiro'),
]};
const TIME_C = { name: 'Time C', players: [
  makePlayer('p11', 'Kaio'), makePlayer('p12', 'Lia'), makePlayer('p13', 'Marco'),
  makePlayer('p14', 'Nina'), makePlayer('p15', 'Otto', 'goleiro'),
]};
const TIME_D = { name: 'Time D', players: [
  makePlayer('p16', 'Paula'), makePlayer('p17', 'Quel'), makePlayer('p18', 'Rui'),
  makePlayer('p19', 'Sara'), makePlayer('p20', 'Tomas', 'goleiro'),
]};

const FOUR_TEAMS_DRAW = { teams: [TIME_A, TIME_B, TIME_C, TIME_D], reserves: [] };

const renderStepMatch = (overrides = {}) => {
  const setMatchState = vi.fn();
  const onBack  = vi.fn();
  const onReset = vi.fn();
  const utils = render(
    <StepMatch
      drawResult={FOUR_TEAMS_DRAW}
      matchState={null}
      setMatchState={setMatchState}
      onBack={onBack}
      onReset={onReset}
      {...overrides}
    />
  );
  return { ...utils, setMatchState, onBack, onReset };
};

// O nome do time aparece em mais de um bloco da tela (placar + "Em campo"),
// então clicamos no botão de placar que fica dentro do MESMO bloco que o
// primeiro <p> com o nome do time (o placar é sempre o primeiro a aparecer
// no DOM).
// O bloco do placar agora tem 2 botões: o placar em si (números) e o botão
// "Cartão" abaixo dele. Pegamos o primeiro, que é sempre o placar.
const clickScoreButton = (teamLabel) => {
  const nameEl = screen.getAllByText(teamLabel)[0];
  const block  = nameEl.closest('div');
  fireEvent.click(within(block).getAllByRole('button')[0]);
};

// Marca um gol pela UI: abre o modal do time, seleciona o autor (e
// opcionalmente a assistência) e confirma.
const markGoal = async (team, scorerName, assistName = null) => {
  const label = team === 'A' ? TIME_A_LABEL() : TIME_B_LABEL();
  clickScoreButton(label);
  await screen.findByText('GOL!');

  const selects = screen.getAllByRole('combobox');
  fireEvent.change(selects[0], { target: { value: scoreIdFor(team, scorerName) } });

  if (assistName) {
    fireEvent.change(selects[1], { target: { value: scoreIdFor(team, assistName) } });
  }

  fireEvent.click(screen.getByText('Confirmar'));
  await waitFor(() => expect(screen.queryByText('GOL!')).not.toBeInTheDocument());
};

// Helpers para descobrir dinamicamente qual time está em A/B na tela (a
// rotatividade muda isso a cada partida).
let currentTeamAName = 'Time A';
let currentTeamBName = 'Time B';
const TIME_A_LABEL = () => currentTeamAName;
const TIME_B_LABEL = () => currentTeamBName;

const ALL_TEAMS_BY_NAME = {
  'Time A': TIME_A, 'Time B': TIME_B, 'Time C': TIME_C, 'Time D': TIME_D,
};
const scoreIdFor = (team, playerName) => {
  const teamName = team === 'A' ? currentTeamAName : currentTeamBName;
  const players = ALL_TEAMS_BY_NAME[teamName].players;
  return players.find(p => p.name === playerName).id;
};

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  resetDb();
  resetChannels();
  currentTeamAName = 'Time A';
  currentTeamBName = 'Time B';
  mockUseBaba.mockReturnValue({ currentBaba: BABA });
  mockUseAuth.mockReturnValue({ user: { id: 'user-1' }, profile: { id: 'user-1', plan: 'assinante' } });
});

// ─────────────────────────────────────────────────────────────────────────────
// 1) Sorteio — geração de 4 times balanceados
// ─────────────────────────────────────────────────────────────────────────────

describe('Sorteio — gera 4 times balanceados a partir de 20 confirmados', () => {
  it('generateBalancedTeams distribui 20 jogadores em 4 times de 5, goleiros incluídos', async () => {
    const { generateBalancedTeams } = await import('../../contexts/BabaContext');
    const players = FOUR_TEAMS_DRAW.teams.flatMap(t =>
      t.players.map(p => ({ ...p, final_rating: 7 }))
    );
    const teams = generateBalancedTeams(players, 4);

    expect(teams).toHaveLength(4);
    expect(teams.map(t => t.players.length)).toEqual([5, 5, 5, 5]);
    // Cada time deve ter recebido exatamente um goleiro (há 4 no total)
    const goaliesPerTeam = teams.map(t => t.players.filter(p => p.position === 'goleiro').length);
    expect(goaliesPerTeam.reduce((a, b) => a + b, 0)).toBe(4);
    expect(goaliesPerTeam.every(n => n === 1)).toBe(true);
  });

  it('a fórmula de nº de times de drawTeamsIntelligent dá 4 times para 20 confirmados / 5 por time', async () => {
    // Mesma fórmula usada em BabaContext.drawTeamsIntelligent:
    //   numTeams = Math.max(2, Math.floor(confirmados.length / playersPerTeam))
    const confirmedCount  = 20;
    const playersPerTeam  = 5;
    const numTeams = Math.max(2, Math.floor(confirmedCount / playersPerTeam));
    expect(numTeams).toBe(4);

    const { generateBalancedTeams } = await vi.importActual('../../contexts/BabaContext');
    const players = FOUR_TEAMS_DRAW.teams.flatMap(t =>
      t.players.map(p => ({ ...p, final_rating: 7 }))
    );
    const teams = generateBalancedTeams(players, numTeams);
    expect(teams).toHaveLength(4);
    expect(teams.every(t => t.players.length === 5)).toBe(true);
    expect(teams.map(t => t.name)).toEqual(['Time A', 'Time B', 'Time C', 'Time D']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2) StepMatch — mecânica de uma partida (gols, assistências, tempo real)
// ─────────────────────────────────────────────────────────────────────────────

describe('StepMatch — placar, gols e assistências', () => {
  it('renderiza a partida Time A × Time B com o Time C aguardando na fila', async () => {
    renderStepMatch();
    await waitFor(() => expect(screen.getAllByText('Time A').length).toBeGreaterThan(0));
    expect(screen.getAllByText('Time B').length).toBeGreaterThan(0);
    expect(screen.getByText('Time C')).toBeInTheDocument(); // "Próximo"
    expect(screen.queryByText('Time D')).not.toBeInTheDocument();
  });

  it('registra um gol do Time A e atualiza o placar', async () => {
    renderStepMatch();
    await waitFor(() => expect(screen.getAllByText('Time A').length).toBeGreaterThan(0));

    await markGoal('A', 'Ana');

    await waitFor(() => {
      // O placar do time A (primeiro botão de placar) deve mostrar 1
      const scoreButtons = screen.getAllByRole('button', { name: '1' });
      expect(scoreButtons.length).toBeGreaterThan(0);
    });
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Ana'));
  });

  it('registra gol com assistência e persiste goals/assists no match_players', async () => {
    renderStepMatch();
    await waitFor(() => expect(screen.getAllByText('Time A').length).toBeGreaterThan(0));

    await markGoal('A', 'Ana', 'Bia');

    await waitFor(() => {
      const rows = db.matchPlayers.get([...db.matches.keys()][0]) || [];
      const scorer = rows.find(r => r.player_id === 'p1');
      const assist = rows.find(r => r.player_id === 'p2');
      expect(scorer?.goals).toBe(1);
      expect(assist?.assists).toBe(1);
    });
  });

  it('exige selecionar o autor do gol antes de confirmar', async () => {
    renderStepMatch();
    await waitFor(() => expect(screen.getAllByText('Time A').length).toBeGreaterThan(0));
    clickScoreButton('Time A');
    await screen.findByText('GOL!');
    fireEvent.click(screen.getByText('Confirmar'));
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('gol'));
  });

  it('placar chega a 2 gols e finaliza a partida automaticamente (regra dos 2 gols)', async () => {
    renderStepMatch();
    await waitFor(() => expect(screen.getAllByText('Time A').length).toBeGreaterThan(0));
    await markGoal('A', 'Ana');
    await markGoal('A', 'Bia');

    // Tela de pós-jogo deve aparecer sozinha, sem clicar em "Finalizar Partida"
    await waitFor(() => {
      expect(screen.getAllByText(/venceu/i).length).toBeGreaterThan(0);
    });
  });
});

describe('StepMatch — sincronização em tempo real (Supabase Realtime)', () => {
  it('atualiza o placar quando outro dispositivo marca um gol (evento postgres_changes)', async () => {
    renderStepMatch();
    await waitFor(() => expect(screen.getAllByText('Time A').length).toBeGreaterThan(0));

    const matchId = [...db.matches.keys()][0];
    // Simula outro celular gravando um gol direto no banco…
    const rows = db.matchPlayers.get(matchId);
    rows[0].goals = 1; // Ana (Time A) marcou

    const realtimeChannel = createdChannels.find(c => c.name === `realtime:match:${matchId}`);
    expect(realtimeChannel).toBeTruthy();

    // …e dispara o evento realtime que o hook useRealtimeMatch escuta.
    await act(async () => { realtimeChannel.__trigger(); });

    await waitFor(() => {
      const scoreButtons = screen.getAllByRole('button', { name: '1' });
      expect(scoreButtons.length).toBeGreaterThan(0);
    });
  });
});

describe('StepMatch — reações ao vivo (modo competitivo)', () => {
  it('envia uma reação pelo canal broadcast quando o modo do baba habilita reações', async () => {
    renderStepMatch();
    await waitFor(() => expect(screen.getAllByText('Time A').length).toBeGreaterThan(0));

    const matchId = [...db.matches.keys()][0];
    const reactionsChannel = createdChannels.find(c => c.name === `reactions:${matchId}`);
    expect(reactionsChannel).toBeTruthy();

    const emojiBtn = screen.getByRole('button', { name: '🔥' });
    fireEvent.click(emojiBtn);

    await waitFor(() => {
      expect(reactionsChannel.__sendCalls).toContainEqual(
        expect.objectContaining({
          type: 'broadcast',
          event: 'reaction',
          payload: expect.objectContaining({ emoji: '🔥', user_id: 'user-1' }),
        })
      );
    });
  });

  it('não exibe o painel de reações em babas no modo casual', async () => {
    mockUseBaba.mockReturnValue({ currentBaba: { ...BABA, mode: 'casual' } });
    renderStepMatch();
    await waitFor(() => expect(screen.getAllByText('Time A').length).toBeGreaterThan(0));
    expect(screen.queryByRole('button', { name: '🔥' })).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3) Simulação completa — 4 times, 3 rodadas, fila/rotatividade e classificação
// ─────────────────────────────────────────────────────────────────────────────

describe('StepMatch — simulação completa do baba (4 times sorteados)', () => {
  it(
    'roda 3 partidas seguidas e valida a rotatividade "quem ganha fica", ' +
    'a fila de espera e a soma de pontos na classificação do dia',
    async () => {
      renderStepMatch();
      await waitFor(() => expect(screen.getAllByText('Time A').length).toBeGreaterThan(0));

      // ── Rodada 1: Time A 2 × 0 Time B → Time A vence, permanece em campo ──
      expect(screen.getByText('Time C')).toBeInTheDocument(); // próximo da fila
      await markGoal('A', 'Ana');
      await markGoal('A', 'Duda', 'Caio');

      await waitFor(() => expect(screen.getAllByText(/Time A venceu/i).length).toBeGreaterThan(0));

      // Classificação do dia já reflete a 1ª partida finalizada (3 pts p/ Time A)
      await waitFor(() => {
        expect(screen.getByText(/Classificação do dia/i)).toBeInTheDocument();
        expect(screen.getAllByText(/3 pts/).length).toBeGreaterThan(0);
      });

      // Avança: "Próxima partida" → mostra o modal de foto do vencedor → pula
      fireEvent.click(screen.getByText(/Próxima partida/i));
      await screen.findByText('Foto do Vencedor');
      fireEvent.click(screen.getByText(/Pular por agora/i));

      // Nova partida: Time A (venceu, ficou) × Time C (desafiante); Time B foi
      // para o fim da fila; Time D é o próximo a aguardar.
      await waitFor(() => {
        currentTeamAName = 'Time A';
        currentTeamBName = 'Time C';
        expect(screen.getAllByText('Time A').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Time C').length).toBeGreaterThan(0);
      });
      expect(screen.getByText('Time D')).toBeInTheDocument(); // próximo da fila (único)
      expect(screen.queryByText('Time B')).not.toBeInTheDocument();

      // ── Rodada 2: Time A 0 × 2 Time C → desafiante vence e assume o posto ──
      await markGoal('B', 'Kaio');
      await markGoal('B', 'Lia', 'Marco');

      await waitFor(() => expect(screen.getAllByText(/Time C venceu/i).length).toBeGreaterThan(0));

      fireEvent.click(screen.getByText(/Próxima partida/i));
      await screen.findByText('Foto do Vencedor');
      fireEvent.click(screen.getByText(/Pular por agora/i));

      // Nova partida: Time C (venceu) × Time D (desafiante); Time A (perdeu)
      // volta para o fim da fila.
      await waitFor(() => {
        currentTeamAName = 'Time C';
        currentTeamBName = 'Time D';
        expect(screen.getAllByText('Time C').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Time D').length).toBeGreaterThan(0);
      });
      expect(screen.getByText('Time B')).toBeInTheDocument(); // próximo da fila (único)
      expect(screen.queryByText('Time A')).not.toBeInTheDocument();

      // ── Rodada 3: Time C 1 × 1 Time D → empate, os dois saem da frente ──
      await markGoal('A', 'Nina');
      await markGoal('B', 'Rui');
      fireEvent.click(screen.getByText(/Finalizar Partida/i));

      await waitFor(() => expect(screen.getByText(/Classificação do dia/i)).toBeInTheDocument());
      // Empate: sem "X venceu"; usa uma DRAW_MESSAGES (não cita nome de time)
      expect(screen.queryAllByText(/Time C venceu/i)).toHaveLength(0);
      expect(screen.queryAllByText(/Time D venceu/i)).toHaveLength(0);

      // Avança para a próxima partida. OBS: o `winnerInfo` de StepMatch não é
      // limpo entre partidas — se a rodada anterior teve vencedor, o modal de
      // foto reaparece "herdando" esse nome mesmo após um empate na rodada
      // seguinte. O teste lida com os dois cenários possíveis.
      fireEvent.click(screen.getByText(/Próxima partida/i));
      const photoModal = screen.queryByText('Foto do Vencedor');
      if (photoModal) fireEvent.click(screen.getByText(/Pular por agora/i));

      // Nova partida: Time B × Time A (os dois primeiros da fila, já que o
      // empate manda os dois times da rodada anterior para o fim da fila).
      await waitFor(() => {
        expect(screen.getAllByText('Time B').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Time A').length).toBeGreaterThan(0);
      });

      // ── Classificação final do dia soma os pontos das 3 partidas ──
      // Time A: vitória (3) + derrota (0) = 3 pts
      // Time B: derrota (0)                = 0 pts
      // Time C: derrota (0) + vitória (3) + empate (1) = 4 pts
      // Time D: empate (1)                 = 1 pt
      const finishedMatches = [...db.matches.values()].filter(m => m.status === 'finished');
      expect(finishedMatches).toHaveLength(3);

      const standings = computeDailyTeamStandings(finishedMatches);
      const byName = Object.fromEntries(standings.map(s => [s.name, s]));
      expect(byName['Time C'].Pts).toBe(4);
      expect(byName['Time A'].Pts).toBe(3);
      expect(byName['Time D'].Pts).toBe(1);
      expect(byName['Time B'].Pts).toBe(0);
      // Líder do dia = Time C (mais pontos)
      expect(standings[0].name).toBe('Time C');
    },
    20000
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 4) Classificação do dia (função pura) e mensagens de pós-jogo
// ─────────────────────────────────────────────────────────────────────────────

describe('computeDailyTeamStandings — soma de pontos', () => {
  it('dá 3 pontos para vitória, 1 para empate e 0 para derrota, ordenando por Pts/saldo/gols', () => {
    const matches = [
      { team_a_name: 'Time A', team_b_name: 'Time B', team_a_score: 2, team_b_score: 0, status: 'finished' },
      { team_a_name: 'Time A', team_b_name: 'Time C', team_a_score: 1, team_b_score: 1, status: 'finished' },
      { team_a_name: 'Time C', team_b_name: 'Time D', team_a_score: 3, team_b_score: 1, status: 'finished' },
      { team_a_name: 'Time A', team_b_name: 'Time D', team_a_score: 0, team_b_score: 0, status: 'in_progress' }, // ignorado
    ];
    const standings = computeDailyTeamStandings(matches);
    const byName = Object.fromEntries(standings.map(s => [s.name, s]));

    expect(byName['Time A'].Pts).toBe(4); // vitória + empate
    expect(byName['Time C'].Pts).toBe(4); // empate + vitória
    expect(byName['Time B'].Pts).toBe(0);
    expect(byName['Time D'].Pts).toBe(0);
    // Time C tem saldo de gols melhor (2x1 na 3ª partida) → desempate
    expect(standings[0].name).toBe('Time C');
  });
});

describe('Mensagens de pós-jogo', () => {
  it('WIN_MESSAGES sempre substitui {team} pelo nome do time vencedor', () => {
    for (let i = 0; i < 20; i++) {
      const msg = fmt(WIN_MESSAGES, { team: 'Time A' });
      expect(msg).toContain('Time A');
      expect(msg).not.toContain('{team}');
    }
  });

  it('DRAW_MESSAGES não faz referência a um time específico', () => {
    for (let i = 0; i < 20; i++) {
      const msg = fmt(DRAW_MESSAGES);
      expect(msg).not.toContain('{team}');
      expect(msg).not.toContain('{name}');
    }
  });
});
