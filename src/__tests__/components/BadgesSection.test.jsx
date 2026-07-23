// src/__tests__/components/BadgesSection.test.jsx
// Sprint T-6 — Componente: BadgesSection
// Exibe badges conquistados/bloqueados com filtros e estado de loading.

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BadgesSection from '../../components/BadgesSection';

const { supabase } = vi.hoisted(() => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));

vi.mock('../../services/supabase', () => ({ supabase }));

const badgeDefs = [
  { id: 'b1', name: 'Artilheiro', icon: '⚽', rarity: 'common', is_active: true },
  { id: 'b2', name: 'MVP', icon: '👑', rarity: 'legendary', is_active: true },
  { id: 'b3', name: 'Pontual', icon: '⏰', rarity: 'rare', is_active: true },
];

const makeFrom = (defs = badgeDefs, earned = []) => {
  let callCount = 0;

  supabase.from.mockImplementation(() => {
    callCount++;

    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    };

    // primeiro call = badge_definitions, segundo = player_badges
    if (callCount % 2 === 1) {
      chain.then = vi.fn((cb) => Promise.resolve(cb({ data: defs })));
    } else {
      chain.then = vi.fn((cb) => Promise.resolve(cb({ data: earned })));
    }

    return chain;
  });

  supabase.rpc.mockResolvedValue({ error: null });
};

const mk = (props = {}) =>
  render(<BadgesSection playerId="player1" babaId="baba1" {...props} />);

beforeEach(() => {
  vi.clearAllMocks();
  makeFrom();
});

describe('BadgesSection › loading', () => {
  it('exibe skeletons antes de carregar', () => {
    const { container } = mk();
    expect(container.querySelector('.animate-pulse')).not.toBeNull();
  });
});

describe('BadgesSection › carregado', () => {
  it('exibe título "Conquistas"', async () => {
    mk();
    await waitFor(() =>
      expect(screen.getByText('Conquistas')).toBeInTheDocument()
    );
  });

  it('exibe contagem X/Y', async () => {
    makeFrom(badgeDefs, [{ badge_id: 'b1', earned_at: '2026-01-01' }]);
    mk();

    await waitFor(() =>
      expect(screen.getByText('1/3')).toBeInTheDocument()
    );
  });

  it('exibe todos os badges na aba "Todas"', async () => {
    // com b1 conquistada, o nome real aparece; as demais seguem "???" (bloqueadas)
    makeFrom(badgeDefs, [{ badge_id: 'b1', earned_at: '2026-01-01' }]);
    mk();

    await waitFor(() => {
      expect(screen.getByText('Artilheiro')).toBeInTheDocument();
      expect(screen.getAllByText('???').length).toBe(2);
    });
  });

  it('bloqueados exibem "???" no nome', async () => {
    mk();

    await waitFor(() =>
      expect(screen.getAllByText('???').length).toBeGreaterThan(0)
    );
  });

  it('conquistados exibem nome real', async () => {
    makeFrom(badgeDefs, [{ badge_id: 'b1', earned_at: '2026-01-01' }]);
    mk();

    await waitFor(() =>
      expect(screen.getByText('Artilheiro')).toBeInTheDocument()
    );
  });
});

describe('BadgesSection › filtros', () => {
  it('filtro "Conquistadas" mostra só badges earned', async () => {
    makeFrom(badgeDefs, [{ badge_id: 'b1', earned_at: '2026-01-01' }]);
    mk();

    await waitFor(() => screen.getByText('Artilheiro'));

    fireEvent.click(
      screen.getByRole('button', { name: /conquistadas/i })
    );

    expect(screen.getByText('Artilheiro')).toBeInTheDocument();
    expect(screen.queryByText('MVP')).toBeNull();
  });

  it('filtro "Bloqueadas" mostra só badges não earned', async () => {
    makeFrom(badgeDefs, [{ badge_id: 'b1', earned_at: '2026-01-01' }]);
    mk();

    await waitFor(() => screen.getByText('Artilheiro'));

    fireEvent.click(
      screen.getByRole('button', { name: /bloqueadas/i })
    );

    expect(screen.getAllByText('???').length).toBe(2);
  });

  it('filtro ativo "Todas" volta a exibir tudo', async () => {
    // precisa de uma badge earned, senão "Artilheiro" nunca aparece (fica "???")
    makeFrom(badgeDefs, [{ badge_id: 'b1', earned_at: '2026-01-01' }]);
    mk();

    await waitFor(() => screen.getByText('Artilheiro'));

    fireEvent.click(
      screen.getByRole('button', { name: /conquistadas/i })
    );

    fireEvent.click(
      screen.getByRole('button', { name: /todas/i })
    );

    expect(screen.getByText('Artilheiro')).toBeInTheDocument();
  });
});

describe('BadgesSection › empty state', () => {
  it('exibe "Nenhuma conquista ainda" quando earned vazio e filtro=earned', async () => {
    mk(); // earned=[] (padrão) é o cenário correto para este teste

    // espera o carregamento terminar sem depender de nenhuma badge conquistada
    await waitFor(() =>
      expect(screen.getByText('Conquistas')).toBeInTheDocument()
    );

    fireEvent.click(
      screen.getByRole('button', { name: /conquistadas/i })
    );

    expect(
      screen.getByText(/Nenhuma conquista ainda/i)
    ).toBeInTheDocument();
  });
});

describe('BadgesSection › sem playerId/babaId', () => {
  it('não trava quando playerId=undefined', () => {
    expect(() =>
      render(
        <BadgesSection
          playerId={undefined}
          babaId={undefined}
        />
      )
    ).not.toThrow();
  });
});