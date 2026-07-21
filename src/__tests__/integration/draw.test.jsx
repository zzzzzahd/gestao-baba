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
  useAuth: vi.fn(() => ({ user: { id: 'user-1' }, profile: { id: 'user-1', name: 'Zé' } })),
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
  Sounds: { click: vi.fn(), draw: vi.fn(), success: vi.fn() },
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
];

const CONFIRMATIONS = PLAYERS.map((p, i) => ({ id: `c-${i}`, player_id: p.id, game_date: '2025-06-15' }));

const setupBaba = (confirmations = CONFIRMATIONS) => {
  mockUseBaba.mockReturnValue({
    currentBaba:         BABA,
    players:             PLAYERS,
    gameConfirmations:   confirmations,
    isDrawing:           false,
    nextGameDay:         { dateStr: '2025-06-15', date: new Date(), deadline: new Date(Date.now() + 3600000) },
    nextMatch:           null,
    refreshBaba:         vi.fn(),
  });
};

const setupSupabase = () => {
  supabase.from.mockReturnValue({
    select:      vi.fn().mockReturnThis(),
    eq:          vi.fn().mockReturnThis(),
    upsert:      vi.fn().mockReturnThis(),
    insert:      vi.fn().mockReturnThis(),
    single:      vi.fn().mockResolvedValue({ data: { id: 'match-1' }, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
  supabase.rpc.mockResolvedValue({ data: [], error: null });
};

const renderDraw = () =>
  render(<MemoryRouter><DrawPage /></MemoryRouter>);

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
    expect(screen.getByText('Times')).toBeInTheDocument();
    expect(screen.getByText('Partida')).toBeInTheDocument();
  });

  it('step 1 (Config) está ativo por padrão', async () => {
    renderDraw();
    await waitFor(() => screen.getByText('Config'));
    const configStep = screen.getByText('Config').closest('div');
    expect(configStep.className).toContain('bg-cyan-electric');
  });

  it('botão voltar no step 1 navega para /dashboard', async () => {
    renderDraw();
    await waitFor(() => screen.getByText('Baba do Zé'));
    const backBtn = screen.getByRole('button', { name: '' });
    // Primeiro botão é o voltar
    const { container } = renderDraw();
    const btn = container.querySelector('button');
    fireEvent.click(btn);
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });
});

describe('DrawPage — StepConfig', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); setupBaba(); setupSupabase(); });

  it('exibe contagem de jogadores confirmados', async () => {
    renderDraw();
    await waitFor(() => {
      expect(screen.getByText(/10/)).toBeInTheDocument();
    });
  });

  it('exibe playersPerTeam padrão = 5', async () => {
    renderDraw();
    await waitFor(() => expect(screen.getByText('5')).toBeInTheDocument());
  });

  it('botão + aumenta playersPerTeam', async () => {
    renderDraw();
    await waitFor(() => screen.getByText('5'));
    fireEvent.click(screen.getByRole('button', { name: '+' }));
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  it('botão − diminui playersPerTeam', async () => {
    renderDraw();
    await waitFor(() => screen.getByText('5'));
    fireEvent.click(screen.getByRole('button', { name: '−' }));
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('não diminui abaixo de 2', async () => {
    renderDraw();
    await waitFor(() => screen.getByText('5'));
    for (let i = 0; i < 10; i++) {
      fireEvent.click(screen.getByRole('button', { name: '−' }));
    }
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('não aumenta acima de 11', async () => {
    renderDraw();
    await waitFor(() => screen.getByText('5'));
    for (let i = 0; i < 15; i++) {
      fireEvent.click(screen.getByRole('button', { name: '+' }));
    }
    expect(screen.getByText('11')).toBeInTheDocument();
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
    await waitFor(() => screen.getByText('Sortear'));
    const drawBtn = screen.getByText('Sortear').closest('button');
    expect(drawBtn).toBeDisabled();
  });

  it('botão sortear fica habilitado com confirmados suficientes (≥ 2 × playersPerTeam)', async () => {
    renderDraw();
    await waitFor(() => screen.getByText('Sortear'));
    const drawBtn = screen.getByText('Sortear').closest('button');
    expect(drawBtn).not.toBeDisabled();
  });

  it('exibe preview de times e reservas (2 times de 5)', async () => {
    renderDraw();
    await waitFor(() => {
      expect(screen.getByText(/2 times/i)).toBeInTheDocument();
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
    await waitFor(() => screen.getByText('Sortear'));

    await act(async () => {
      fireEvent.click(screen.getByText('Sortear'));
    });

    await waitFor(() => {
      // Step 2 deve estar ativo
      const timesStep = screen.getByText('Times').closest('div');
      expect(timesStep.className).toContain('bg-cyan-electric');
    }, { timeout: 5000 });
  });

  it('step 2 exibe os times sorteados', async () => {
    renderDraw();
    await waitFor(() => screen.getByText('Sortear'));

    await act(async () => {
      fireEvent.click(screen.getByText('Sortear'));
    });

    await waitFor(() => {
      expect(screen.getByText('Time A')).toBeInTheDocument();
      expect(screen.getByText('Time B')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('step 2 exibe total de jogadores nos times', async () => {
    renderDraw();
    await waitFor(() => screen.getByText('Sortear'));

    await act(async () => {
      fireEvent.click(screen.getByText('Sortear'));
    });

    await waitFor(() => {
      expect(screen.getByText(/10 jogadores/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('salva draw result no Supabase ao sortear', async () => {
    renderDraw();
    await waitFor(() => screen.getByText('Sortear'));

    await act(async () => {
      fireEvent.click(screen.getByText('Sortear'));
    });

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('draw_results');
    }, { timeout: 5000 });
  });
});

describe('DrawPage — navegação entre steps', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); setupBaba(); setupSupabase(); });

  it('botão voltar no step 2 retorna ao step 1', async () => {
    renderDraw();
    await waitFor(() => screen.getByText('Sortear'));

    // Avançar para step 2
    await act(async () => { fireEvent.click(screen.getByText('Sortear')); });
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
    await waitFor(() => screen.getByText('5'));
    fireEvent.click(screen.getByRole('button', { name: '+' }));
    expect(screen.getByText('6')).toBeInTheDocument();

    const saved = JSON.parse(localStorage.getItem('draft_play_draw_wizard') || '{}');
    expect(saved.drawConfig?.playersPerTeam).toBe(6);
  });
});

describe('DrawPage — constraints no sorteio', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); setupSupabase(); });

  it('sorteia com constraints must_together sem crashar', async () => {
    const constraints = [{
      player_a_id: 'p-1',
      player_b_id: 'p-2',
      constraint_type: 'must_together',
    }];
    supabase.rpc.mockResolvedValue({ data: constraints, error: null });
    setupBaba();
    renderDraw();

    await waitFor(() => screen.getByText('Sortear'));
    await expect(
      act(async () => { fireEvent.click(screen.getByText('Sortear')); })
    ).resolves.not.toThrow();
  });

  it('sorteia com constraints must_apart sem crashar', async () => {
    const constraints = [{
      player_a_id: 'p-1',
      player_b_id: 'p-3',
      constraint_type: 'must_apart',
    }];
    supabase.rpc.mockResolvedValue({ data: constraints, error: null });
    setupBaba();
    renderDraw();

    await waitFor(() => screen.getByText('Sortear'));
    await expect(
      act(async () => { fireEvent.click(screen.getByText('Sortear')); })
    ).resolves.not.toThrow();
  });

  it('lida com erro ao buscar constraints (continua sem elas)', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: new Error('RPC error') });
    setupBaba();
    renderDraw();

    await waitFor(() => screen.getByText('Sortear'));
    await expect(
      act(async () => { fireEvent.click(screen.getByText('Sortear')); })
    ).resolves.not.toThrow();
  });
});

describe('DrawPage — clearDrawWizard', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); setupBaba(); setupSupabase(); });

  it('clearDrawWizard limpa o estado persistido', async () => {
    renderDraw();
    await waitFor(() => screen.getByText('5'));
    fireEvent.click(screen.getByRole('button', { name: '+' }));

    clearDrawWizard();
    expect(localStorage.getItem('draft_play_draw_wizard')).toBeNull();
  });
});
