// src/__tests__/integration/draw.test.jsx
// Testes de integração — fluxo completo de sorteio (DrawPage + StepConfig + StepTeams)

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ─── Mocks ───────────────────────────────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockUseBaba = vi.fn();
vi.mock('../../contexts/BabaContext', () => ({ useBaba: () => mockUseBaba() }));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-1' }, profile: { id: 'user-1', name: 'Zé', plan: 'assinante' } })),
}));
vi.mock('../../services/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc:  vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));
vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));
vi.mock('../../utils/sounds', () => ({
  Sounds: { click: vi.fn(), draw: vi.fn(), success: vi.fn(), unlock: vi.fn() },
}));
vi.mock('../../components/Tooltip', () => ({ default: ({ children }) => children }));
vi.mock('../../components/DrawConstraintsPanel', () => ({ default: () => <div>Constraints</div> }));
vi.mock('../../utils/constants', () => ({
  POSITION_LABEL: { goleiro: 'Goleiro', atacante: 'Atacante', linha: 'Linha' },
  CYAN_GRADIENT: 'bg-cyan-electric',
}));

import DrawPage             from '../../pages/DrawPage';
import { supabase }         from '../../services/supabase';
import { clearDrawWizard }  from '../../hooks/useDrawWizard';

// ─── Dados de teste ───────────────────────────────────────────────────────────
const BABA = { id: 'baba-1', name: 'Baba do Zé', president_id: 'user-1', mode: 'casual' };

const makePlayer = (id, name, rating = 7, position = 'linha') => ({
  id, name, position, final_rating: rating,
  user_id: `user-${id}`, baba_id: 'baba-1',
});

// 12 jogadores: com a estratégia padrão "Reserva", cada time precisa de
// playersPerTeam + 1 vagas (5 titulares + 1 reserva do time), então 2 times de 5
// exigem 12 confirmados (ver minRequired em StepConfig.jsx).
const PLAYERS = [
  makePlayer('p-1', 'Zé',    8, 'atacante'),
  makePlayer('p-2', 'João',  7, 'linha'),
  makePlayer('p-3', 'Bia',   9, 'goleiro'),
  makePlayer('p-4', 'Pedro', 6, 'linha'),
  makePlayer('p-5', 'Ana',   8, 'linha'),
  makePlayer('p-6', 'Rafa',  7, 'goleiro'),
  makePlayer('p-7', 'Luiz',  6, 'linha'),
  makePlayer('p-8', 'Carla', 7, 'linha'),
  makePlayer('p-9', 'Teo',   8, 'atacante'),
  makePlayer('p-10','Nico',  6, 'linha'),
  makePlayer('p-11','Duda',  7, 'linha'),
  makePlayer('p-12','Caio',  6, 'linha'),
];

// O StepConfig monta o sorteio a partir de gameConfirmations[].player (join feito
// por reloadConfirmations), então cada confirmação precisa trazer o jogador.
const makeConfirmations = (players) => players.map((p, i) => ({
  id: `c-${i}`,
  baba_id: 'baba-1',
  player_id: p.id,
  game_date: '2025-06-15',
  status: 'confirmed',
  player: p,
}));

const CONFIRMATIONS = makeConfirmations(PLAYERS);

const setupBaba = (confirmations = CONFIRMATIONS) => {
  mockUseBaba.mockReturnValue({
    currentBaba:         BABA,
    players:             PLAYERS,
    gameConfirmations:   confirmations,
    isDrawing:           false,
    nextGameDay:         { dateStr: '2025-06-15', date: new Date(), deadline: new Date(Date.now() + 3600000) },
    nextMatch:           null,
    refreshBaba:         vi.fn(),
    // StepConfig.handleDraw usa getAllRatings() para montar o balance_level
    // (Nível geral) de cada jogador antes do sorteio — sem isso o mock quebra
    // com "getAllRatings is not a function" e o sorteio nunca completa.
    getAllRatings:       vi.fn().mockResolvedValue([]),
  });
};

// Guarda o mock da tabela para os testes poderem inspecionar o que foi gravado.
let tableMock;

const setupSupabase = () => {
  tableMock = {
    select:      vi.fn().mockReturnThis(),
    eq:          vi.fn().mockReturnThis(),
    upsert:      vi.fn().mockReturnThis(),
    insert:      vi.fn().mockReturnThis(),
    limit:       vi.fn().mockReturnThis(),
    order:       vi.fn().mockReturnThis(),
    single:      vi.fn().mockResolvedValue({ data: { id: 'match-1' }, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  supabase.from.mockReturnValue(tableMock);
  supabase.rpc.mockResolvedValue({ data: [], error: null });
};

const renderDraw = () =>
  render(<MemoryRouter><DrawPage /></MemoryRouter>);

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Valor de "jogadores por time" (o span grande entre os botões − e +).
// O seletor evita colisão com os números do card de prévia (partidas/times/reservas).
const getPlayersPerTeam = (n) => screen.getByText(String(n), { selector: 'span.text-xl' });

const getDrawButton = () => screen.getByText(/Sortear Times/i).closest('button');

const clickDraw = async () => {
  await act(async () => {
    fireEvent.click(screen.getByText(/Sortear Times/i));
  });
};

// Payload gravado em draw_results pelo StepConfig.handleDraw
const getSavedDraw = () =>
  tableMock.insert.mock.calls.map(([arg]) => arg).find((arg) => arg?.teams);

const teamIndexOf = (draw, playerId) =>
  draw.teams.findIndex((t) => t.players.some((p) => p.id === playerId));

// ─── Testes ───────────────────────────────────────────────────────────────────

describe('DrawPage — renderização e stepper', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); setupBaba(); setupSupabase(); });

  it('renderiza sem crashar', () => {
    expect(() => renderDraw()).not.toThrow();
  });

  it('exibe nome do baba no header', async () => {
    renderDraw();
    await waitFor(() => expect(screen.getByText('Baba do Zé')).toBeInTheDocument());
  });

  it('exibe stepper com 3 steps', async () => {
    renderDraw();
    await waitFor(() => screen.getByText('Baba do Zé'));
    expect(screen.getByText('Config')).toBeInTheDocument();
    expect(screen.getAllByText('Times').length).toBeGreaterThan(0);
    expect(screen.getByText('Partida')).toBeInTheDocument();
  });

  it('step 1 (Config) está ativo por padrão', async () => {
    renderDraw();
    await waitFor(() => screen.getByText('Config'));
    const configStep = screen.getByText('Config').closest('div');
    expect(configStep.className).toContain('bg-cyan-electric');
  });

  it('botão voltar no step 1 navega para /dashboard', async () => {
    const { container } = renderDraw();
    await waitFor(() => screen.getByText('Baba do Zé'));
    // Primeiro botão do DOM é o voltar do header
    fireEvent.click(container.querySelector('button'));
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });
});

describe('DrawPage — StepConfig', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); setupBaba(); setupSupabase(); });

  it('exibe contagem de jogadores confirmados', async () => {
    renderDraw();
    await waitFor(() => {
      expect(screen.getByText('12', { selector: 'span.text-lg' })).toBeInTheDocument();
    });
  });

  it('exibe playersPerTeam padrão = 5', async () => {
    renderDraw();
    await waitFor(() => expect(getPlayersPerTeam(5)).toBeInTheDocument());
  });

  it('botão + aumenta playersPerTeam', async () => {
    renderDraw();
    await waitFor(() => getPlayersPerTeam(5));
    fireEvent.click(screen.getByRole('button', { name: '+' }));
    expect(getPlayersPerTeam(6)).toBeInTheDocument();
  });

  it('botão − diminui playersPerTeam', async () => {
    renderDraw();
    await waitFor(() => getPlayersPerTeam(5));
    fireEvent.click(screen.getByRole('button', { name: '−' }));
    expect(getPlayersPerTeam(4)).toBeInTheDocument();
  });

  it('não diminui abaixo de 2', async () => {
    renderDraw();
    await waitFor(() => getPlayersPerTeam(5));
    for (let i = 0; i < 10; i++) {
      fireEvent.click(screen.getByRole('button', { name: '−' }));
    }
    expect(getPlayersPerTeam(2)).toBeInTheDocument();
  });

  it('não aumenta acima de 11', async () => {
    renderDraw();
    await waitFor(() => getPlayersPerTeam(5));
    for (let i = 0; i < 15; i++) {
      fireEvent.click(screen.getByRole('button', { name: '+' }));
    }
    expect(getPlayersPerTeam(11)).toBeInTheDocument();
  });

  it('exibe 2 estratégias: Reserva e Incompleto', async () => {
    renderDraw();
    await waitFor(() => {
      expect(screen.getByText('Reserva')).toBeInTheDocument();
      expect(screen.getByText('Incompleto')).toBeInTheDocument();
    });
  });

  it('botão sortear fica desabilitado quando não há confirmados suficientes', async () => {
    setupBaba([]); // sem confirmações
    renderDraw();
    await waitFor(() => screen.getByText(/Sortear Times/i));
    expect(getDrawButton()).toBeDisabled();
  });

  it('botão sortear fica habilitado com confirmados suficientes (Reserva: 2 × (playersPerTeam + 1))', async () => {
    renderDraw();
    await waitFor(() => screen.getByText(/Sortear Times/i));
    expect(getDrawButton()).not.toBeDisabled();
  });

  it('com Reserva, 11 confirmados não bastam para 2 times de 5 (mínimo 12)', async () => {
    setupBaba(CONFIRMATIONS.slice(0, 11));
    renderDraw();
    await waitFor(() => screen.getByText(/Sortear Times/i));
    expect(getDrawButton()).toBeDisabled();
    expect(screen.getByText(/Mínimo 12 para sortear/)).toBeInTheDocument();
  });

  it('com Incompleto, 10 confirmados bastam para 2 times de 5 (mínimo 2 × playersPerTeam)', async () => {
    setupBaba(CONFIRMATIONS.slice(0, 10));
    renderDraw();
    await waitFor(() => screen.getByText(/Sortear Times/i));
    expect(getDrawButton()).toBeDisabled(); // estratégia padrão (Reserva) exige 12

    fireEvent.click(screen.getByText('Incompleto'));
    expect(getDrawButton()).not.toBeDisabled();
  });

  it('exibe preview de times e reservas (12 confirmados → 2 times de 5)', async () => {
    renderDraw();
    await waitFor(() => {
      expect(screen.getByText('2', { selector: 'p.text-white' })).toBeInTheDocument();
      expect(screen.getAllByText('Times').length).toBeGreaterThan(0);
    });
  });

  it('exibe toggle para DrawConstraintsPanel', async () => {
    renderDraw();
    await waitFor(() => {
      expect(screen.getByText(/Restrições/i)).toBeInTheDocument();
    });
  });
});

describe('DrawPage — fluxo de sorteio', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); setupBaba(); setupSupabase(); });

  it('clica em Sortear e avança para step 2 (Times)', async () => {
    renderDraw();
    await waitFor(() => screen.getByText(/Sortear Times/i));

    await clickDraw();

    await waitFor(() => {
      // Step 2 deve estar ativo.
      // "Times" aparece tanto no stepper quanto no card de prévia do Step 1
      // (quando confirmedCount >= minRequired), então usamos o testid do
      // item do stepper em vez de getByText('Times').
      const timesStep = screen.getByTestId('step-nav-2');
      expect(timesStep.className).toContain('bg-cyan-electric');
    }, { timeout: 5000 });
  });

  it('step 2 exibe os times sorteados', async () => {
    renderDraw();
    await waitFor(() => screen.getByText(/Sortear Times/i));

    await clickDraw();

    await waitFor(() => {
      expect(screen.getByText('Time A')).toBeInTheDocument();
      expect(screen.getByText('Time B')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('step 2 exibe total de jogadores nos times (2 times de 6: 5 + reserva do time)', async () => {
    renderDraw();
    await waitFor(() => screen.getByText(/Sortear Times/i));

    await clickDraw();

    await waitFor(() => {
      expect(screen.getByText(/12 jogadores/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('salva draw result no Supabase ao sortear', async () => {
    renderDraw();
    await waitFor(() => screen.getByText(/Sortear Times/i));

    await clickDraw();

    // Antes só checava supabase.from('draw_results'), que o DrawPage já chama
    // ao carregar (busca de sessão ativa) — passava mesmo sem sortear.
    // Agora confere o insert real.
    await waitFor(() => {
      expect(tableMock.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          baba_id:   'baba-1',
          status:    'active',
          algorithm: 'balanced_snake',
        })
      );
    }, { timeout: 5000 });

    expect(supabase.from).toHaveBeenCalledWith('draw_results');
    expect(getSavedDraw().teams).toHaveLength(2);
  });
});

describe('DrawPage — navegação entre steps', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); setupBaba(); setupSupabase(); });

  it('botão voltar no step 2 retorna ao step 1', async () => {
    renderDraw();
    await waitFor(() => screen.getByText(/Sortear Times/i));

    // Avançar para step 2
    await clickDraw();
    await waitFor(() => screen.getByText('Time A'), { timeout: 5000 });

    // Voltar
    const backBtn = screen.getAllByRole('button')[0];
    fireEvent.click(backBtn);

    await waitFor(() => {
      const configStep = screen.getByText('Config').closest('div');
      expect(configStep.className).toContain('bg-cyan-electric');
    });
  });

  it('persiste drawConfig no localStorage ao mudar step', async () => {
    renderDraw();
    await waitFor(() => getPlayersPerTeam(5));
    fireEvent.click(screen.getByRole('button', { name: '+' }));
    expect(getPlayersPerTeam(6)).toBeInTheDocument();

    const saved = JSON.parse(localStorage.getItem('draft_play_draw_wizard') || '{}');
    expect(saved.drawConfig?.playersPerTeam).toBe(6);
  });
});

describe('DrawPage — constraints no sorteio', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); setupSupabase(); });

  it('sorteia com constraints must_together e mantém os dois jogadores no mesmo time', async () => {
    supabase.rpc.mockResolvedValue({
      data: [{ player_a_id: 'p-1', player_b_id: 'p-2', constraint_type: 'must_together' }],
      error: null,
    });
    setupBaba();
    renderDraw();

    await waitFor(() => screen.getByText(/Sortear Times/i));
    await clickDraw();
    await waitFor(() => expect(getSavedDraw()).toBeDefined(), { timeout: 5000 });

    const draw = getSavedDraw();
    expect(draw.teams).toHaveLength(2);
    expect(teamIndexOf(draw, 'p-1')).not.toBe(-1);
    expect(teamIndexOf(draw, 'p-1')).toBe(teamIndexOf(draw, 'p-2'));
  });

  it('sorteia com constraints must_apart e mantém os dois jogadores em times diferentes', async () => {
    supabase.rpc.mockResolvedValue({
      data: [{ player_a_id: 'p-1', player_b_id: 'p-3', constraint_type: 'must_apart' }],
      error: null,
    });
    setupBaba();
    renderDraw();

    await waitFor(() => screen.getByText(/Sortear Times/i));
    await clickDraw();
    await waitFor(() => expect(getSavedDraw()).toBeDefined(), { timeout: 5000 });

    const draw = getSavedDraw();
    expect(draw.teams).toHaveLength(2);
    expect(teamIndexOf(draw, 'p-1')).not.toBe(-1);
    expect(teamIndexOf(draw, 'p-3')).not.toBe(-1);
    expect(teamIndexOf(draw, 'p-1')).not.toBe(teamIndexOf(draw, 'p-3'));
  });

  it('lida com erro ao buscar constraints (continua sem elas)', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: new Error('RPC error') });
    setupBaba();
    renderDraw();

    await waitFor(() => screen.getByText(/Sortear Times/i));
    await clickDraw();
    await waitFor(() => expect(getSavedDraw()).toBeDefined(), { timeout: 5000 });

    const draw = getSavedDraw();
    expect(draw.teams).toHaveLength(2);
    expect(draw.constraints_used).toEqual([]);
  });
});

describe('DrawPage — clearDrawWizard', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); setupBaba(); setupSupabase(); });

  it('clearDrawWizard limpa o estado persistido', async () => {
    renderDraw();
    await waitFor(() => getPlayersPerTeam(5));
    fireEvent.click(screen.getByRole('button', { name: '+' }));

    clearDrawWizard();
    expect(localStorage.getItem('draft_play_draw_wizard')).toBeNull();
  });
});
