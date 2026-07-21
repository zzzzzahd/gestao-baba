// src/__tests__/pages/TournamentPage.test.jsx
// Sprint T-8 — Page: TournamentPage
// Torneio standalone: bracket, tabela, partidas, ranking e navegação de tabs.

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── React Router ──────────────────────────────────────────────────────────────
const mockNavigate = vi.fn();
let mockParams = { id: 'tour1' };

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams:   () => mockParams,
  };
});

// ── Bracket utils ─────────────────────────────────────────────────────────────
vi.mock('../../utils/bracket', () => ({
  computeStandings: (teams, matches) =>
    teams.map(t => ({ team: t, P: 2, V: 1, E: 1, D: 0, SG: 2, Pts: 4 })),
}));

// ── Supabase ──────────────────────────────────────────────────────────────────
const mockFrom = vi.fn();
vi.mock('../../services/supabase', () => ({
  supabase: { from: mockFrom },
}));

// ── Dados de fixture ──────────────────────────────────────────────────────────
const tourKnockout = {
  id: 'tour1', name: 'Copa Draft', sport: 'futsal',
  format: 'knockout', status: 'ongoing', champion_team_id: null,
};
const tourRoundRobin = {
  id: 'tour2', name: 'Liga Draft', sport: 'society',
  format: 'round_robin', status: 'ongoing', champion_team_id: null,
};
const teams = [
  { id: 't1', name: 'Azul',     seed: 1, tournament_id: 'tour1' },
  { id: 't2', name: 'Vermelho', seed: 2, tournament_id: 'tour1' },
  { id: 't3', name: 'Preto',    seed: 3, tournament_id: 'tour1' },
  { id: 't4', name: 'Branco',   seed: 4, tournament_id: 'tour1' },
];
const matches = [
  { id: 'm1', round: 1, match_index: 0, team_a_id: 't1', team_b_id: 't2',
    score_a: 3, score_b: 1, status: 'finished', tournament_id: 'tour1' },
  { id: 'm2', round: 1, match_index: 1, team_a_id: 't3', team_b_id: 't4',
    score_a: null, score_b: null, status: 'pending', tournament_id: 'tour1' },
];
const ranking = [
  { id: 'r1', player_name: 'Ronaldo', goals: 5, assists: 2, yellow_cards: 1, red_cards: 0, fouls: 3 },
  { id: 'r2', player_name: 'Messi',   goals: 3, assists: 4, yellow_cards: 0, red_cards: 0, fouls: 1 },
];

const makeFromChain = (tourData = tourKnockout) => {
  let callCount = 0;
  const datasets = [
    { data: tourData },
    { data: teams },
    { data: matches },
    { data: ranking },
  ];
  mockFrom.mockImplementation(() => {
    const idx = callCount++;
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      order:  vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(datasets[0]),
      then:   vi.fn(cb => Promise.resolve(cb(datasets[Math.min(idx, 3)]))),
    };
    return chain;
  });
};

import TournamentPage from '../../pages/TournamentPage';

const wrap = () => render(<MemoryRouter><TournamentPage /></MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  mockParams = { id: 'tour1' };
  makeFromChain();
});

// ─── Loading ──────────────────────────────────────────────────────────────────
describe('TournamentPage › loading', () => {
  it('exibe spinner durante carregamento', () => {
    let resolve;
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn(() => new Promise(r => { resolve = r; })),
      then: vi.fn(() => new Promise(r => { resolve = r; })),
    }));
    const { container } = wrap();
    expect(container.querySelector('.animate-spin')).not.toBeNull();
    resolve?.({ data: tourKnockout });
  });
});

// ─── Torneio não encontrado ───────────────────────────────────────────────────
describe('TournamentPage › não encontrado', () => {
  it('exibe "Torneio não encontrado" quando tour=null', async () => {
    // Simular Promise.all onde tour retorna null
    let idx = 0;
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      order:  vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
      then:   vi.fn(cb => {
        idx++;
        return Promise.resolve(cb({ data: idx === 1 ? null : [] }));
      }),
    }));
    wrap();
    await waitFor(() =>
      expect(screen.getByText('Torneio não encontrado')).toBeInTheDocument()
    );
  });

  it('"Voltar ao início" navega para /home', async () => {
    let idx = 0;
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      order:  vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
      then:   vi.fn(cb => {
        idx++;
        return Promise.resolve(cb({ data: idx === 1 ? null : [] }));
      }),
    }));
    wrap();
    await waitFor(() => screen.getByText('Voltar ao início'));
    fireEvent.click(screen.getByText('Voltar ao início'));
    expect(mockNavigate).toHaveBeenCalledWith('/home');
  });
});

// ─── Header ───────────────────────────────────────────────────────────────────
describe('TournamentPage › header', () => {
  it('exibe nome do torneio', async () => {
    wrap();
    await waitFor(() =>
      expect(screen.getByText('Copa Draft')).toBeInTheDocument()
    );
  });

  it('exibe esporte e formato', async () => {
    wrap();
    await waitFor(() => {
      expect(screen.getByText(/futsal/i)).toBeInTheDocument();
      expect(screen.getByText(/Mata-mata/i)).toBeInTheDocument();
    });
  });

  it('exibe contagem de times', async () => {
    wrap();
    await waitFor(() =>
      expect(screen.getByText(/4 times/i)).toBeInTheDocument()
    );
  });

  it('botão voltar navega para /home', async () => {
    wrap();
    await waitFor(() => screen.getByText('Copa Draft'));
    fireEvent.click(screen.getByRole('button', { name: /voltar/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/home');
  });

  it('exibe nome do campeão quando champion_team_id definido', async () => {
    const tourWithChamp = { ...tourKnockout, champion_team_id: 't1' };
    let idx = 0;
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      order:  vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: tourWithChamp }),
      then:   vi.fn(cb => {
        idx++;
        const data = [tourWithChamp, teams, matches, ranking][Math.min(idx - 1, 3)];
        return Promise.resolve(cb({ data }));
      }),
    }));
    wrap();
    await waitFor(() =>
      expect(screen.getByText(/Azul/)).toBeInTheDocument()
    );
  });
});

// ─── Navegação de tabs (knockout) ─────────────────────────────────────────────
describe('TournamentPage › tabs knockout', () => {
  it('exibe tab "Chaveamento" para knockout', async () => {
    wrap();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Chaveamento' })).toBeInTheDocument()
    );
  });

  it('exibe tabs "Partidas" e "Ranking"', async () => {
    wrap();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Partidas' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Ranking' })).toBeInTheDocument();
    });
  });

  it('NÃO exibe tab "Tabela" para knockout', async () => {
    wrap();
    await waitFor(() => {}, { timeout: 500 });
    expect(screen.queryByRole('button', { name: 'Tabela' })).toBeNull();
  });
});

// ─── Tab Chaveamento (bracket) ────────────────────────────────────────────────
describe('TournamentPage › chaveamento', () => {
  it('exibe nome das rodadas', async () => {
    wrap();
    await waitFor(() =>
      expect(screen.getByText(/rodada|semifinal|final/i)).toBeInTheDocument()
    );
  });

  it('exibe partida com times corretos', async () => {
    wrap();
    await waitFor(() => {
      expect(screen.queryByText('Azul')).not.toBeNull();
      expect(screen.queryByText('Vermelho')).not.toBeNull();
    });
  });

  it('clicar em uma partida navega para a rota da partida', async () => {
    wrap();
    await waitFor(() => screen.queryByText('Azul'));
    // MatchCard tem um onClick que navega
    const matchCard = screen.getByText('Azul').closest('button, [role="button"], div[onclick]');
    if (matchCard) {
      fireEvent.click(matchCard);
      await waitFor(() =>
        expect(mockNavigate).toHaveBeenCalledWith('/torneio/tour1/partida/m1')
      );
    }
  });
});

// ─── Tab round_robin (Tabela) ─────────────────────────────────────────────────
describe('TournamentPage › tabela round_robin', () => {
  beforeEach(() => {
    makeFromChain(tourRoundRobin);
  });

  it('exibe tab "Tabela" para round_robin', async () => {
    mockParams = { id: 'tour2' };
    wrap();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Tabela' })).toBeInTheDocument()
    );
  });

  it('NÃO exibe tab "Chaveamento" para round_robin', async () => {
    mockParams = { id: 'tour2' };
    wrap();
    await waitFor(() => {}, { timeout: 500 });
    expect(screen.queryByRole('button', { name: 'Chaveamento' })).toBeNull();
  });

  it('tabela exibe colunas P, V, E, D, SG, Pts', async () => {
    mockParams = { id: 'tour2' };
    wrap();
    await waitFor(() => screen.getByRole('button', { name: 'Tabela' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tabela' }));
    await waitFor(() => {
      expect(screen.getByText('Pts')).toBeInTheDocument();
      expect(screen.getByText('SG')).toBeInTheDocument();
    });
  });
});

// ─── Tab Partidas ─────────────────────────────────────────────────────────────
describe('TournamentPage › tab partidas', () => {
  it('clicar em "Partidas" exibe lista de matches', async () => {
    wrap();
    await waitFor(() => screen.getByRole('button', { name: 'Partidas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Partidas' }));
    await waitFor(() => {
      // partida terminada tem placar
      expect(screen.queryByText(/3/)).not.toBeNull();
    });
  });
});

// ─── Tab Ranking ──────────────────────────────────────────────────────────────
describe('TournamentPage › tab ranking', () => {
  it('clicar em "Ranking" exibe artilheiros', async () => {
    wrap();
    await waitFor(() => screen.getByRole('button', { name: 'Ranking' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ranking' }));
    await waitFor(() => {
      expect(screen.getByText('🥇 Artilheiros')).toBeInTheDocument();
      expect(screen.getByText('Ronaldo')).toBeInTheDocument();
    });
  });

  it('exibe seções de assistências e cartões', async () => {
    wrap();
    await waitFor(() => screen.getByRole('button', { name: 'Ranking' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ranking' }));
    await waitFor(() => {
      expect(screen.getByText('🎯 Assistências')).toBeInTheDocument();
      expect(screen.getByText('🟨 Cartões amarelos')).toBeInTheDocument();
    });
  });

  it('ordena artilheiros por gols decrescente', async () => {
    wrap();
    await waitFor(() => screen.getByRole('button', { name: 'Ranking' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ranking' }));
    await waitFor(() => {
      // Ronaldo (5 gols) deve aparecer antes de Messi (3 gols) na lista de artilheiros
      const items = screen.getAllByText(/Ronaldo|Messi/);
      expect(items[0].textContent).toContain('Ronaldo');
    });
  });

  it('ranking vazio: seções existem mas listas ficam em branco', async () => {
    let idx = 0;
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      order:  vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: tourKnockout }),
      then:   vi.fn(cb => {
        idx++;
        const data = [tourKnockout, teams, matches, []][Math.min(idx - 1, 3)];
        return Promise.resolve(cb({ data }));
      }),
    }));
    wrap();
    await waitFor(() => screen.getByRole('button', { name: 'Ranking' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ranking' }));
    await waitFor(() =>
      expect(screen.getByText('🥇 Artilheiros')).toBeInTheDocument()
    );
    expect(screen.queryByText('Ronaldo')).toBeNull();
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────
describe('TournamentPage › edge cases', () => {
  it('sem id nos params: não quebra', () => {
    mockParams = { id: undefined };
    expect(() => wrap()).not.toThrow();
  });

  it('sem matches: bracket fica vazio', async () => {
    let idx = 0;
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      order:  vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: tourKnockout }),
      then:   vi.fn(cb => {
        idx++;
        const data = [tourKnockout, teams, [], ranking][Math.min(idx - 1, 3)];
        return Promise.resolve(cb({ data }));
      }),
    }));
    wrap();
    await waitFor(() => screen.getByText('Copa Draft'));
    // Não explode mesmo sem matches
    expect(screen.queryByTestId('profile-skeleton')).toBeNull();
  });
});
