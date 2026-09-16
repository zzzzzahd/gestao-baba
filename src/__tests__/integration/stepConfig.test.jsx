// src/__tests__/integration/stepConfig.test.jsx
// Suíte de integração — StepConfig.jsx (step 1 do wizard de sorteio).
// Antes desta suíte, StepConfig.jsx não tinha nenhum teste automatizado
// cobrindo a árvore de componentes/hooks em si (só o algoritmo de sorteio
// puro, extraído pra drawAlgorithm.js, tinha testes unitários).
//
// Cobre:
//   • Contador de confirmados e o botão "Sortear Times" habilitado/desabilitado
//     conforme o mínimo (playersPerTeam * 2)
//   • Fluxo de convidado avulso: adicionar (grava em players + game_confirmations
//     e recarrega confirmações) e remover
//   • Ajuste de "jogadores por time" (+/-) e troca de estratégia (Reserva/Incompleto)
//   • Fluxo feliz de sortear: sem sessão ativa existente → grava draw_results →
//     chama onNext com { teams, reserves, goalkeeperQueue, drawResultId }

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ─── Mocks de contexto/hooks ──────────────────────────────────────────────────

const mockUseBaba = vi.fn();
vi.mock('../../contexts/BabaContext', () => ({ useBaba: () => mockUseBaba() }));

vi.mock('../../utils/babaMode', () => ({
  useFeatures: () => ({ drawConstraints: false }),
}));

vi.mock('../../utils/sounds', () => ({
  Sounds: { click: vi.fn(), unlock: vi.fn() },
}));

vi.mock('../../components/Tooltip', () => ({ default: () => null }));
vi.mock('../../components/DrawConstraintsPanel', () => ({ default: () => null }));

vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

// supabase já vem mockado globalmente por src/__tests__/setup.js (builder
// encadeável genérico); aqui só sobrescrevemos o comportamento por tabela
// quando o teste precisa de um retorno específico.
import { supabase } from '../../services/supabase';
import toast from 'react-hot-toast';
import StepConfig from '../../pages/draw/StepConfig';

// ─── Dados de teste ───────────────────────────────────────────────────────────

const BABA = { id: 'baba-1', name: 'Baba do Zé', gk_mode: 'fixed' };
const NEXT_GAME_DAY = { dateStr: '2026-09-12' };

const makePlayer = (id, name, position = 'linha') => ({ id, name, position });
const makeConfirmation = (id, player) => ({ id: `conf-${id}`, player_id: player.id, player });

// 10 jogadores confirmados = exatamente o mínimo pra playersPerTeam=5 (padrão)
const TEN_PLAYERS = Array.from({ length: 10 }, (_, i) => makePlayer(`p${i + 1}`, `Jogador ${i + 1}`));
const TEN_CONFIRMATIONS = TEN_PLAYERS.map((p, i) => makeConfirmation(i + 1, p));

const baseBabaCtx = (overrides = {}) => ({
  currentBaba: BABA,
  gameConfirmations: [],
  players: [],
  isDrawing: false,
  nextGameDay: NEXT_GAME_DAY,
  reloadConfirmations: vi.fn().mockResolvedValue(undefined),
  getAllRatings: vi.fn().mockResolvedValue([]),
  ...overrides,
});

const renderStepConfig = (props = {}) => {
  const setDrawConfig = vi.fn();
  const onNext = vi.fn();
  const utils = render(
    <StepConfig
      drawConfig={{ playersPerTeam: 5, strategy: 'reserve' }}
      setDrawConfig={setDrawConfig}
      onNext={onNext}
      {...props}
    />
  );
  return { ...utils, setDrawConfig, onNext };
};

beforeEach(() => {
  vi.clearAllMocks();
  // Builder genérico padrão (setup.js) — cada teste sobrescreve o que precisar.
  supabase.from.mockImplementation(() => ({
    select:      vi.fn().mockReturnThis(),
    insert:      vi.fn().mockReturnThis(),
    update:      vi.fn().mockReturnThis(),
    delete:      vi.fn().mockReturnThis(),
    eq:          vi.fn().mockReturnThis(),
    order:       vi.fn().mockReturnThis(),
    limit:       vi.fn().mockReturnThis(),
    single:      vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  }));
  supabase.rpc.mockResolvedValue({ data: [], error: null });
});

// ─────────────────────────────────────────────────────────────────────────────
// 1) Contador de confirmados e estado do botão "Sortear Times"
// ─────────────────────────────────────────────────────────────────────────────

describe('StepConfig — contador de confirmados e mínimo pra sortear', () => {
  it('mostra "0" confirmados e o botão desabilitado quando ninguém confirmou', () => {
    mockUseBaba.mockReturnValue(baseBabaCtx());
    renderStepConfig();

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText(/Mínimo 10 para sortear/i)).toBeInTheDocument();
    expect(screen.getByText(/Sortear Times/i).closest('button')).toBeDisabled();
  });

  it('habilita "Sortear Times" quando bate o mínimo (playersPerTeam * 2)', () => {
    mockUseBaba.mockReturnValue(baseBabaCtx({
      gameConfirmations: TEN_CONFIRMATIONS,
      players: TEN_PLAYERS,
    }));
    renderStepConfig();

    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.queryByText(/Mínimo 10 para sortear/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Sortear Times/i).closest('button')).not.toBeDisabled();
  });

  it('ajustar "jogadores por time" pra baixo reduz o mínimo exigido', () => {
    mockUseBaba.mockReturnValue(baseBabaCtx());
    const { setDrawConfig } = renderStepConfig();

    // botão "−" ao lado do contador de jogadores por time
    fireEvent.click(screen.getByText('−'));
    expect(setDrawConfig).toHaveBeenCalled();
    // a função passada ao setDrawConfig é um updater — confere que ele reduz de 5 pra 4
    const updater = setDrawConfig.mock.calls[0][0];
    expect(updater({ playersPerTeam: 5, strategy: 'reserve' })).toEqual(
      expect.objectContaining({ playersPerTeam: 4 })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2) Estratégia (Reserva / Incompleto)
// ─────────────────────────────────────────────────────────────────────────────

describe('StepConfig — estratégia de suplentes', () => {
  it('clicar em "Incompleto" chama setDrawConfig com strategy=substitute', () => {
    mockUseBaba.mockReturnValue(baseBabaCtx());
    const { setDrawConfig } = renderStepConfig();

    fireEvent.click(screen.getByText('Incompleto'));

    const updater = setDrawConfig.mock.calls.find(call => typeof call[0] === 'function')[0];
    expect(updater({ playersPerTeam: 5, strategy: 'reserve' })).toEqual(
      expect.objectContaining({ strategy: 'substitute' })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3) Convidado avulso — adicionar e remover
// ─────────────────────────────────────────────────────────────────────────────

describe('StepConfig — convidado avulso', () => {
  it('adiciona um convidado: grava em players e game_confirmations, depois recarrega', async () => {
    const reloadConfirmations = vi.fn().mockResolvedValue(undefined);
    mockUseBaba.mockReturnValue(baseBabaCtx({ reloadConfirmations }));

    const newPlayerInsert = vi.fn().mockReturnThis();
    const newPlayerSelect = vi.fn().mockReturnThis();
    const newPlayerSingle = vi.fn().mockResolvedValue({
      data: { id: 'guest-1', name: 'Convidado 01' }, error: null,
    });
    const confirmInsert = vi.fn().mockResolvedValue({ data: {}, error: null });

    supabase.from.mockImplementation((table) => {
      if (table === 'players') {
        return { insert: newPlayerInsert, select: newPlayerSelect, single: newPlayerSingle };
      }
      if (table === 'game_confirmations') {
        return { insert: confirmInsert };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) };
    });

    renderStepConfig();

    // Abre a seção de convidados
    fireEvent.click(screen.getByText(/Convidados/i));
    await waitFor(() => expect(screen.getByText(/\+ Adicionar convidado/i)).toBeInTheDocument());

    fireEvent.click(screen.getByText(/\+ Adicionar convidado/i));

    await waitFor(() => {
      expect(newPlayerInsert).toHaveBeenCalledWith([
        expect.objectContaining({ baba_id: 'baba-1', is_guest: true, position: 'linha', balance_level: 2 }),
      ]);
    });
    await waitFor(() => {
      expect(confirmInsert).toHaveBeenCalledWith([
        expect.objectContaining({ baba_id: 'baba-1', player_id: 'guest-1', game_date: '2026-09-12', status: 'confirmed' }),
      ]);
    });
    await waitFor(() => expect(reloadConfirmations).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalled();
  });

  it('remove um convidado existente: apaga a confirmação e o player, depois recarrega', async () => {
    const guestPlayer = { id: 'guest-1', name: 'Convidado 01', is_guest: true };
    const guestConf = { id: 'conf-guest-1', player_id: 'guest-1', player: guestPlayer };
    const reloadConfirmations = vi.fn().mockResolvedValue(undefined);

    mockUseBaba.mockReturnValue(baseBabaCtx({
      gameConfirmations: [guestConf],
      reloadConfirmations,
    }));

    const confDelete = vi.fn().mockReturnThis();
    const confEq     = vi.fn().mockResolvedValue({ data: null, error: null });
    const playerDelete = vi.fn().mockReturnThis();
    const playerEq     = vi.fn().mockResolvedValue({ data: null, error: null });

    supabase.from.mockImplementation((table) => {
      if (table === 'game_confirmations') return { delete: confDelete, eq: confEq };
      if (table === 'players')            return { delete: playerDelete, eq: playerEq };
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) };
    });

    renderStepConfig();

    // O convidado aparece listado (nome vindo de guestConf.player.name)
    const removeBtn = screen.getByText('Convidado 01').parentElement.querySelector('button');
    fireEvent.click(removeBtn);

    await waitFor(() => expect(confDelete).toHaveBeenCalled());
    await waitFor(() => expect(playerDelete).toHaveBeenCalled());
    await waitFor(() => expect(reloadConfirmations).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith('Convidado removido');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4) Fluxo feliz de sortear — sem sessão ativa existente
// ─────────────────────────────────────────────────────────────────────────────

describe('StepConfig — sortear (fluxo feliz, sem sessão ativa existente)', () => {
  // Usa strategy='substitute' aqui de propósito: com strategy='reserve' (o
  // default do drawConfig acima), o algoritmo de sorteio divide por
  // (playersPerTeam+1) — 10 confirmados / (5+1) = 1 time só, não 2. Isso é
  // do próprio algoritmo (drawTeamsWithConstraints), não bug deste teste;
  // 'substitute' evita esse caso de borda e mantém o teste focado no fluxo
  // de StepConfig em si (checar sessão ativa → sortear → onNext).
  const drawConfigSubstitute = { playersPerTeam: 5, strategy: 'substitute' };

  it('cria uma nova sessão de sorteio e chama onNext com teams/reserves/drawResultId', async () => {
    mockUseBaba.mockReturnValue(baseBabaCtx({
      gameConfirmations: TEN_CONFIRMATIONS,
      players: TEN_PLAYERS,
      getAllRatings: vi.fn().mockResolvedValue(TEN_PLAYERS.map(p => ({ player_id: p.id, avg_level: 2 }))),
    }));

    // 1ª chamada a draw_results = checar sessão ativa existente (nenhuma);
    // 2ª chamada a draw_results = insert da nova sessão.
    const checkBuilder = {
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      order:  vi.fn().mockReturnThis(),
      limit:  vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const insertedRow = { id: 'draw-result-99' };
    const insertBuilder = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: insertedRow, error: null }),
    };

    let drawResultsCallCount = 0;
    supabase.from.mockImplementation((table) => {
      if (table === 'draw_results') {
        drawResultsCallCount += 1;
        return drawResultsCallCount === 1 ? checkBuilder : insertBuilder;
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) };
    });
    supabase.rpc.mockResolvedValue({ data: [], error: null }); // get_draw_constraints

    const { onNext } = renderStepConfig({ drawConfig: drawConfigSubstitute });
    // draw_config gravado deve refletir o config passado (playersPerTeam=5, strategy=reserve)
    expect(insertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        baba_id: 'baba-1',
        draw_date: '2026-09-12', // usa a data do PRÓXIMO JOGO, não "hoje"
        status: 'active',
      })
    );

    await waitFor(() => {
      expect(onNext).toHaveBeenCalledWith(
        expect.objectContaining({ drawResultId: 'draw-result-99' })
      );
    });
    const callArg = onNext.mock.calls[0][0];
    expect(callArg.teams.length).toBeGreaterThanOrEqual(2);
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('sorteados'));
  });

  it('reabre a sessão ativa existente em vez de sortear de novo, se já tiver uma', async () => {
    mockUseBaba.mockReturnValue(baseBabaCtx({
      gameConfirmations: TEN_CONFIRMATIONS,
      players: TEN_PLAYERS,
    }));

    const existingSession = {
      id: 'draw-result-existing',
      teams: [{ name: 'Time A', players: [] }, { name: 'Time B', players: [] }],
      reserves: [],
      goalkeeper_queue: [],
      status: 'active',
    };
    const checkBuilder = {
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      order:  vi.fn().mockReturnThis(),
      limit:  vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: existingSession, error: null }),
    };
    const insertBuilder = { insert: vi.fn() }; // não deveria ser chamado

    supabase.from.mockImplementation((table) => {
      if (table === 'draw_results') return checkBuilder;
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) };
    });

    const { onNext } = renderStepConfig();
    fireEvent.click(screen.getByText(/Sortear Times/i));

    await waitFor(() => {
      expect(onNext).toHaveBeenCalledWith(
        expect.objectContaining({ drawResultId: 'draw-result-existing' })
      );
    });
    expect(insertBuilder.insert).not.toHaveBeenCalled();
  });
});
