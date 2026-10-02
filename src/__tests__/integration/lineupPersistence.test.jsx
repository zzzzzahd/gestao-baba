// src/__tests__/integration/lineupPersistence.test.jsx
// Suíte de integração — persistência de banco/goleiro emprestado/jogador
// puxado (time incompleto) no Supabase.
//
// Antes: benchedByTeam/gkOverride/borrowedByTeam só existiam no localStorage
// (via matchState do wizard) — se a página recarregasse no meio da partida,
// essas 3 escolhas manuais voltavam ao padrão original. Depois da correção:
//   • As 3 colunas (benched_by_team, gk_override, borrowed_by_team) são
//     gravadas em `matches` a cada troca (persistLineupState)
//   • No mount, se já existir um matchId, o servidor é a fonte da verdade
//     (mesmo padrão já usado pro cronômetro) — sobrescreve o que veio do
//     matchState/localStorage.
//
// Reaproveita o mesmo banco de dados falso (Map em memória) do
// matchLifecycle.test.jsx, adaptado pra também servir GET por id incluindo
// as 3 colunas novas.

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

// ─── Mocks de contexto/hooks ──────────────────────────────────────────────────

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

vi.mock('../../components/MatchIntro', () => ({
  default: ({ onDone }) => {
    React.useEffect(() => { onDone?.(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
    return null;
  },
}));

// ─── Banco falso — igual matchLifecycle.test.jsx, com suporte a update parcial ─

const { db, resetDb, supabaseMock } = vi.hoisted(() => {
  const db = { matches: new Map(), matchPlayers: new Map() };
  const state = { matchSeq: 0 };
  const resetDb = () => { db.matches.clear(); db.matchPlayers.clear(); };
  const nextMatchId = () => `match-${++state.matchSeq}`;

  function buildQuery(resolve) {
    const q = { op: 'select', filters: {}, payload: null };
    const query = {
      select: () => { query.__setOp('select'); return query; },
      insert: (rows) => { query.__setOp('insert'); q.payload = rows; return query; },
      update: (payload) => { query.__setOp('update'); q.payload = payload; return query; },
      delete: () => { query.__setOp('delete'); return query; },
      eq: (k, v) => { q.filters[k] = v; return query; },
      order: () => query,
      limit: () => query,
      __setOp: (op) => { if (q.op === 'select' || op !== 'select') q.op = op; },
      single: () => Promise.resolve(resolve(q)),
      maybeSingle: () => Promise.resolve(resolve(q)),
      then: (onFulfilled, onRejected) => Promise.resolve(resolve(q)).then(onFulfilled, onRejected),
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
    if (q.filters.id) return { data: db.matches.get(q.filters.id) || null, error: null };
    if (q.filters.status === 'in_progress') {
      const row = [...db.matches.values()].find(m => m.baba_id === q.filters.baba_id && m.status === 'in_progress');
      return { data: row || null, error: null };
    }
    return { data: null, error: null };
  };

  const matchPlayersResolver = (q) => {
    if (q.op === 'insert') {
      const rows = q.payload.map(r => ({ ...r }));
      const arr = db.matchPlayers.get(rows[0]?.match_id) || [];
      db.matchPlayers.set(rows[0]?.match_id, [...arr, ...rows]);
      return { data: rows, error: null };
    }
    const arr = db.matchPlayers.get(q.filters.match_id) || [];
    return { data: arr, error: null };
  };

  const genericResolver = () => ({ data: null, error: null });

  // O hook useRealtimeMatch chama channel.unsubscribe() no cleanup (desmontagem),
  // então o canal falso precisa ter esse método.
  const makeChannel = () => {
    const ch = {
      on: () => ch,
      subscribe: (cb) => { cb?.('SUBSCRIBED'); return ch; },
      send: () => Promise.resolve({ error: null }),
      unsubscribe: () => Promise.resolve('ok'),
    };
    return ch;
  };

  const supabaseMock = {
    from: (table) => {
      if (table === 'matches') return buildQuery(matchesResolver);
      if (table === 'match_players') return buildQuery(matchPlayersResolver);
      return buildQuery(genericResolver);
    },
    channel: () => makeChannel(),
    removeChannel: () => Promise.resolve('ok'),
    storage: { from: () => ({ upload: () => Promise.resolve({ error: null }), getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
    auth: { getSession: () => Promise.resolve({ data: { session: null }, error: null }) },
    rpc: () => Promise.resolve({ data: null, error: null }),
  };

  return { db, resetDb, supabaseMock };
});

vi.mock('../../services/supabase', () => ({ supabase: supabaseMock }));

import StepMatch from '../../pages/draw/StepMatch';

// ─── Dados de teste — 2 times com 1 reserva cada (pra habilitar o banco) ─────

const BABA = { id: 'baba-1', name: 'Baba do Zé', president_id: 'user-1', mode: 'casual', game_time: '20:00:00' };

const makePlayer = (id, name, position = 'linha', isReserve = false) => ({ id, name, position, ...(isReserve ? { isReserve: true } : {}) });

const TIME_A = { name: 'Time A', players: [
  makePlayer('p1', 'Ana'), makePlayer('p2', 'Bia'), makePlayer('p3', 'Caio'),
  makePlayer('p4', 'Duda', 'linha', true), // reserva original do Time A
]};
const TIME_B = { name: 'Time B', players: [
  makePlayer('p5', 'Enzo'), makePlayer('p6', 'Fabio'), makePlayer('p7', 'Gina'),
  makePlayer('p8', 'Hugo', 'linha', true), // reserva original do Time B
]};
// 3º time (fila) — usado só no teste de substituição de goleiro
const TIME_C = { name: 'Time C', players: [
  makePlayer('p11', 'Kaio'), makePlayer('p12', 'Lia'), makePlayer('p13', 'Marco'),
]};

const DRAW_RESULT = { teams: [TIME_A, TIME_B], reserves: [], goalkeeperQueue: [], drawResultId: 'draw-result-1' };

const GK_QUEUE = [
  { id: 'gk1', name: 'Goleiro Um', position: 'goleiro' },
  { id: 'gk2', name: 'Goleiro Dois', position: 'goleiro' },
];

const renderStepMatch = (props = {}) =>
  render(
    <StepMatch
      drawResult={DRAW_RESULT}
      matchState={null}
      setMatchState={vi.fn()}
      onBack={vi.fn()}
      onReset={vi.fn()}
      {...props}
    />
  );

// A partida só existe no banco falso depois do INSERT assíncrono de
// loadOrCreateMatch — o texto "Time A" aparece ANTES disso, então esperar só
// por ele deixa o teste correr contra um banco ainda vazio.
const waitForMatchInDb = async () => {
  await waitFor(() => expect(db.matches.size).toBe(1));
  return [...db.matches.values()][0];
};

beforeEach(() => {
  vi.clearAllMocks();
  resetDb();
  mockUseBaba.mockReturnValue({ currentBaba: BABA });
  mockUseAuth.mockReturnValue({ user: { id: 'user-1' }, profile: { id: 'user-1' } });
});

// ─────────────────────────────────────────────────────────────────────────────
// 1) Criação da partida já grava o estado inicial das 3 colunas
// ─────────────────────────────────────────────────────────────────────────────

describe('StepMatch — seed inicial de benched_by_team/gk_override/borrowed_by_team', () => {
  it('grava o banco inicial (reserva original de cada time) já no INSERT da partida', async () => {
    renderStepMatch();
    await waitFor(() => expect(screen.getAllByText('Time A').length).toBeGreaterThan(0));

    const match = await waitForMatchInDb();
    expect(match.benched_by_team).toEqual({ 'Time A': 'p4', 'Time B': 'p8' });
    expect(match.gk_override).toEqual({ A: null, B: null });
    expect(match.borrowed_by_team).toEqual({});
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2) Trocar o banco persiste benched_by_team
// ─────────────────────────────────────────────────────────────────────────────

describe('StepMatch — trocar quem fica no banco persiste no Supabase', () => {
  it('abrir "Trocar" no banco do Time A e escolher outro jogador atualiza matches.benched_by_team', async () => {
    renderStepMatch();
    await waitFor(() => expect(screen.getAllByText('Time A').length).toBeGreaterThan(0));
    await waitForMatchInDb();

    // Abre o modal de banco do Time A
    const trocarButtons = screen.getAllByText('Trocar');
    fireEvent.click(trocarButtons[0]);

    await screen.findByText('Quem fica no banco?');
    // "Ana" também aparece em "Em campo" no fundo da tela — escopa a busca
    // dentro do modal aberto (a div com a classe "fixed" que cobre a tela).
    const modal = screen.getByText('Quem fica no banco?').closest('.fixed');
    // Escolhe "Ana" (p1) pra sentar no lugar da reserva original (Duda, p4)
    fireEvent.click(within(modal).getByText('Ana'));

    await waitFor(() => {
      const match = [...db.matches.values()][0];
      expect(match.benched_by_team['Time A']).toBe('p1');
    });
    // O banco do Time B não pode ter sido mexido
    expect([...db.matches.values()][0].benched_by_team['Time B']).toBe('p8');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3) Goleiro emprestado (cansou/se machucou) persiste gk_override
// ─────────────────────────────────────────────────────────────────────────────

describe('StepMatch — substituição de goleiro por cansaço/lesão persiste no Supabase', () => {
  it('não exibe o card de "Goleiros da quadra" quando não há goalkeeperQueue (modo fixed sem fila)', async () => {
    // DRAW_RESULT não define goleiro dedicado nenhum (goalkeeperQueue vazia) —
    // esse card só aparece em gk_mode="court" com fila ativa. Documenta que,
    // sem fila, gk_override nunca é exercitado pela UI (fica sempre {A:null,B:null}).
    renderStepMatch();
    await waitFor(() => expect(screen.getAllByText('Time A').length).toBeGreaterThan(0));
    expect(screen.queryByText('Goleiros da quadra')).not.toBeInTheDocument();
  });

  it('com uma fila de goleiro ativa, o modal "Quem vai pro gol?" abre (sem time esperando na fila)', async () => {
    renderStepMatch({ drawResult: { ...DRAW_RESULT, goalkeeperQueue: GK_QUEUE } });
    await waitFor(() => expect(screen.getAllByText('Time A').length).toBeGreaterThan(0));
    expect(screen.getByText('Goleiros da quadra')).toBeInTheDocument();

    const cansouButtons = screen.getAllByText('Cansou / se machucou');
    fireEvent.click(cansouButtons[0]); // slot A

    await screen.findByText('Quem vai pro gol?');
    // O modal lista jogadores do 3º time da fila (allTeams[2]) — como só há
    // 2 times sorteados, a fila está vazia; o modal mostra a mensagem de
    // "ninguém disponível".
    expect(screen.getByText(/Não tem time esperando na fila agora/i)).toBeInTheDocument();
  });

  it('com um 3º time esperando, escolher um substituto persiste gk_override no slot A', async () => {
    renderStepMatch({
      drawResult: { ...DRAW_RESULT, teams: [TIME_A, TIME_B, TIME_C], goalkeeperQueue: GK_QUEUE },
    });
    await waitFor(() => expect(screen.getAllByText('Time A').length).toBeGreaterThan(0));
    await waitForMatchInDb();

    fireEvent.click(screen.getAllByText('Cansou / se machucou')[0]); // slot A

    await screen.findByText('Quem vai pro gol?');
    const modal = screen.getByText('Quem vai pro gol?').closest('.fixed');
    fireEvent.click(within(modal).getByText('Kaio'));

    await waitFor(() => {
      const match = [...db.matches.values()][0];
      expect(match.gk_override.A?.id).toBe('p11');
    });
    expect([...db.matches.values()][0].gk_override.B).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4) Hidratação a partir do servidor no mount (fonte da verdade)
// ─────────────────────────────────────────────────────────────────────────────

describe('StepMatch — hidrata banco/goleiro/empréstimo do servidor ao montar com matchId existente', () => {
  it('sobrescreve o banco do matchState (localStorage) com o valor gravado no banco', async () => {
    // Simula um matchId já existente no "banco" com um benched_by_team
    // diferente do que veio no matchState (que representaria o localStorage
    // desatualizado de antes de recarregar a página).
    db.matches.set('match-existing', {
      id: 'match-existing',
      baba_id: 'baba-1',
      status: 'in_progress',
      team_a_name: 'Time A',
      team_b_name: 'Time B',
      draw_result_id: 'draw-result-1',
      // valor real no servidor: Ana no banco do Time A, Hugo no banco do Time B
      benched_by_team: { 'Time A': 'p1', 'Time B': 'p8' },
      gk_override: { A: null, B: null },
      borrowed_by_team: {},
    });

    const staleMatchState = {
      allTeams: [TIME_A, TIME_B],
      currentMatch: { teamA: TIME_A, teamB: TIME_B, scoreA: 0, scoreB: 0 },
      matchId: 'match-existing',
      goalkeeperQueue: [],
      gkOverride: { A: null, B: null },
      // valor "velho" do localStorage: Duda no banco do Time A
      benchedByTeam: { 'Time A': 'p4', 'Time B': 'p8' },
      borrowedByTeam: {},
      drawResultId: 'draw-result-1',
    };

    renderStepMatch({ matchState: staleMatchState });
    await waitFor(() => expect(screen.getAllByText('Time A').length).toBeGreaterThan(0));

    // A tela deve refletir o valor do SERVIDOR (Ana no banco), não o do
    // matchState/localStorage (Duda): Duda (p4) passa a jogar em campo e
    // Ana (p1) sai de campo.
    const emCampo = screen.getByText('Em campo').closest('div');
    await waitFor(() => {
      expect(within(emCampo).getByText('Duda')).toBeInTheDocument();
      expect(within(emCampo).queryByText('Ana')).not.toBeInTheDocument();
    });
  });
});
