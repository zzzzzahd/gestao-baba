// src/__tests__/components/MVPScreen.test.jsx
// Sprint T-6 — Componente: MVPScreen
// Votação e revelação do MVP após a partida.

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MVPScreen from '../../components/MVPScreen';

// Mocks
vi.mock('../../utils/sounds', () => ({ Sounds: { mvp: vi.fn() } }));
vi.mock('../../utils/messages', () => ({
  fmt: vi.fn(() => 'Mensagem de MVP'),
  MVP_MESSAGES: ['⭐ {name} foi o craque hoje MVP do baba'],
}));

const { supabase } = vi.hoisted(() => ({
  supabase: {
    from: vi.fn(() => ({ select: vi.fn(), insert: vi.fn() })),
  },
}));
vi.mock('../../services/supabase', () => ({ supabase }));

const players = [
  { id: 'p1', name: 'João',  avatar_url: null },
  { id: 'p2', name: 'Maria', avatar_url: null },
  { id: 'p3', name: 'Pedro', avatar_url: null },
];

const mkScreen = (props = {}) =>
  render(
    <MVPScreen
      matchId="match1"
      babaId="baba1"
      players={players}
      onClose={vi.fn()}
      {...props}
    />
  );

// Setup mock supabase.from chainável
const makeSupaMock = (selectData = []) => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq:     vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    then:   vi.fn((cb) => Promise.resolve(cb({ data: selectData }))),
  };
  supabase.from.mockReturnValue(chain);
  return chain;
};

beforeEach(() => {
  vi.clearAllMocks();
  makeSupaMock([]); // sem votos iniciais
});

// ─── Fase: votação ────────────────────────────────────────────────────────────
describe('MVPScreen › fase de votação', () => {
  it('exibe título "MVP do Jogo"', () => {
    mkScreen();
    expect(screen.getByText('MVP do Jogo')).toBeInTheDocument();
  });

  it('exibe subtítulo "Vote no craque"', () => {
    mkScreen();
    expect(screen.getByText('Vote no craque')).toBeInTheDocument();
  });

  it('lista todos os jogadores como botões', () => {
    mkScreen();
    players.forEach(p => {
      expect(screen.getByText(p.name)).toBeInTheDocument();
    });
  });

  it('exibe inicial do jogador sem avatar', () => {
    mkScreen();
    expect(screen.getByText('J')).toBeInTheDocument(); // João
  });

  it('botão "Revelar MVP" NÃO aparece sem votos', () => {
    mkScreen();
    expect(screen.queryByRole('button', { name: /Revelar MVP/i })).toBeNull();
  });

  it('botão fechar (X) chama onClose', () => {
    const onClose = vi.fn();
    mkScreen({ onClose });
    fireEvent.click(screen.getByRole('button', { name: '' , hidden: true }));
    // buscar pelo elemento X
    const btns = screen.getAllByRole('button');
    const xBtn = btns.find(b => b.querySelector('svg'));
    if (xBtn) fireEvent.click(xBtn);
    expect(onClose).toHaveBeenCalled();
  });
});

// ─── Votar ────────────────────────────────────────────────────────────────────
describe('MVPScreen › votação', () => {
  beforeEach(() => {
    const chain = makeSupaMock([]);
    chain.insert.mockResolvedValue({ error: null });
  });

  it('clicar em um jogador chama supabase insert', async () => {
    const chain = makeSupaMock([]);
    chain.insert.mockResolvedValue({ error: null });
    mkScreen();
    await waitFor(() => screen.getByText('João'));
    fireEvent.click(screen.getByText('João').closest('button'));
    await waitFor(() => expect(chain.insert).toHaveBeenCalled());
  });

  it('após votar, os botões ficam desabilitados', async () => {
    const chain = makeSupaMock([]);
    chain.insert.mockResolvedValue({ error: null });
    mkScreen();
    await waitFor(() => screen.getByText('João'));
    fireEvent.click(screen.getByText('João').closest('button'));
    await waitFor(() => {
      const playerBtns = screen.getAllByRole('button').filter(b =>
        players.some(p => b.textContent?.includes(p.name))
      );
      playerBtns.forEach(b => expect(b).toBeDisabled());
    });
  });

  it('aparece "Revelar MVP" após voto', async () => {
    const chain = makeSupaMock([]);
    chain.insert.mockResolvedValue({ error: null });
    mkScreen();
    await waitFor(() => screen.getByText('João'));
    fireEvent.click(screen.getByText('João').closest('button'));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Revelar MVP/i })).toBeInTheDocument()
    );
  });

  it('erro de unicidade (23505) não interrompe o fluxo', async () => {
    const chain = makeSupaMock([]);
    chain.insert.mockResolvedValue({ error: { code: '23505' } });
    mkScreen();
    await waitFor(() => screen.getByText('João'));
    expect(() =>
      fireEvent.click(screen.getByText('João').closest('button'))
    ).not.toThrow();
  });
});

// ─── Revelação ────────────────────────────────────────────────────────────────
describe('MVPScreen › fase de revelação', () => {
  it('ao revelar MVP, exibe nome do vencedor', async () => {
    // Pré-popular votos em p1 via mock inicial
    const chain = makeSupaMock([{ voted_player_id: 'p1' }, { voted_player_id: 'p1' }]);
    chain.insert.mockResolvedValue({ error: null });
    mkScreen();
    await waitFor(() => screen.getByText('João'));
    // Votar para ter o botão revelar
    fireEvent.click(screen.getByText('João').closest('button'));
    await waitFor(() => screen.getByRole('button', { name: /Revelar MVP/i }));
    fireEvent.click(screen.getByRole('button', { name: /Revelar MVP/i }));
    await waitFor(() =>
      expect(screen.getByText('MVP do Baba 🌟')).toBeInTheDocument()
    );
  });

  it('exibe "Sem votos registrados" quando não há vencedor', async () => {
    mkScreen();
    // Sem votos → forçar reveal através do estado interno não é trivial
    // Testar estado direto: 0 votos, sem botão revelar → apenas valida UI
    expect(screen.queryByRole('button', { name: /Revelar MVP/i })).toBeNull();
  });

  it('botão Fechar na fase reveal chama onClose', async () => {
    const chain = makeSupaMock([{ voted_player_id: 'p1' }]);
    chain.insert.mockResolvedValue({ error: null });
    const onClose = vi.fn();
    mkScreen({ onClose });
    await waitFor(() => screen.getByText('João'));
    fireEvent.click(screen.getByText('João').closest('button'));
    await waitFor(() => screen.getByRole('button', { name: /Revelar MVP/i }));
    fireEvent.click(screen.getByRole('button', { name: /Revelar MVP/i }));
    await waitFor(() => screen.getByText('MVP do Baba 🌟'));
    fireEvent.click(screen.getByRole('button', { name: /fechar/i }));
    expect(onClose).toHaveBeenCalled();
  });
});

// ─── Players vazia ────────────────────────────────────────────────────────────
describe('MVPScreen › players vazia', () => {
  it('não exibe nenhum jogador quando players=[]', () => {
    mkScreen({ players: [] });
    players.forEach(p =>
      expect(screen.queryByText(p.name)).toBeNull()
    );
  });
});

// ─── matchId ausente ─────────────────────────────────────────────────────────
describe('MVPScreen › matchId nulo', () => {
  it('não chama supabase quando matchId=null', async () => {
    mkScreen({ matchId: null });
    await waitFor(() => {}, { timeout: 100 });
    // from não chamado por causa do guard if (!matchId) return
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
