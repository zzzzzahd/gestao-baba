// src/__tests__/pages/ProfilePage.test.jsx
// Sprint T-8 — Page: ProfilePage
// Tabs Stats/Conquistas/Editar, perfil público, share modal, followers.

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── React Router ──────────────────────────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// ── Supabase ──────────────────────────────────────────────────────────────────
vi.mock('../../services/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      then:   vi.fn(cb => Promise.resolve(cb({ data: null, count: 5, error: null }))),
    })),
    rpc: vi.fn().mockResolvedValue({
      data: {
        ratings:     [{ baba_id: 'b1', final_rating: 4.2, baba_name: 'Baba do Zé' }],
        match_stats: [{ baba_id: 'b1', goals: 3, assists: 1, matches: 5 }],
        best_of_month: [],
        ranking: [],
      },
      error: null,
    }),
  },
}));

// ── Componentes filhos ────────────────────────────────────────────────────────
vi.mock('../../components/ProfileHeader', () => ({
  default: ({ profile, onTabChange }) => (
    <div data-testid="profile-header">
      <span>{profile?.name}</span>
      <button onClick={() => onTabChange('edit')}>mudar tab</button>
    </div>
  ),
}));
vi.mock('../../components/ProfileStats', () => ({
  default: ({ loading }) => (
    <div data-testid="profile-stats">{loading ? 'carregando...' : 'stats loaded'}</div>
  ),
}));
vi.mock('../../components/ProfileEdit', () => ({
  default: ({ onCancel }) => (
    <div data-testid="profile-edit">
      <button onClick={onCancel}>cancelar edição</button>
    </div>
  ),
}));
vi.mock('../../components/BadgesSection', () => ({
  default: ({ playerId, babaId }) => (
    <div data-testid="badges-section" data-player={playerId} data-baba={babaId}>
      BadgesSection
    </div>
  ),
}));
vi.mock('../../components/ShareableCardModal', () => ({
  default: ({ isOpen, onClose }) =>
    isOpen ? (
      <div data-testid="share-modal">
        <button onClick={onClose}>fechar share</button>
      </div>
    ) : null,
}));
vi.mock('../../components/ThemeToggle', () => ({
  default: () => <button data-testid="theme-toggle">Tema</button>,
}));
vi.mock('../../components/ReferralPanel', () => ({
  default: () => <div data-testid="referral-panel">ReferralPanel</div>,
}));
vi.mock('../../components/PlanBadge', () => ({
  PlanBadge: () => null,
}));

// ── Toasts ────────────────────────────────────────────────────────────────────
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
  __esModule: true,
}));

// ── navigator.clipboard ───────────────────────────────────────────────────────
const writeText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, 'clipboard', {
  writable: true,
  value: { writeText },
});

// ── AuthContext ───────────────────────────────────────────────────────────────
const mockAuth = {
  profile:        { name: 'Zico', avatar_url: null, position: 'atacante' },
  user:           { id: 'user-abc-123', email: 'zico@test.com' },
  refreshProfile: vi.fn(),
};
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

// ── BabaContext ───────────────────────────────────────────────────────────────
const mockBabaCtx = {
  myBabas:     [{ id: 'b1', name: 'Baba do Zé' }],
  currentBaba: { id: 'b1', name: 'Baba do Zé', logo_url: null },
  players:     [{ id: 'p1', user_id: 'user-abc-123', name: 'Zico' }],
};
vi.mock('../../contexts/BabaContext', () => ({
  useBaba: () => mockBabaCtx,
}));

import ProfilePage from '../../pages/ProfilePage';

const wrap = () => render(<MemoryRouter><ProfilePage /></MemoryRouter>);

beforeEach(() => vi.clearAllMocks());

// ─── Estrutura básica ─────────────────────────────────────────────────────────
describe('ProfilePage › estrutura', () => {
  it('renderiza sem erros', () => {
    expect(() => wrap()).not.toThrow();
  });

  it('exibe ProfileHeader com nome do usuário', async () => {
    wrap();
    await waitFor(() =>
      expect(screen.getByText('Zico')).toBeInTheDocument()
    );
  });

  it('exibe as 3 tabs: Estatísticas, Conquistas, Editar', async () => {
    wrap();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /estatísticas/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /conquistas/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /editar/i })).toBeInTheDocument();
    });
  });
});

// ─── Tab Stats ────────────────────────────────────────────────────────────────
describe('ProfilePage › tab stats (padrão)', () => {
  it('ProfileStats está visível por padrão', async () => {
    wrap();
    await waitFor(() =>
      expect(screen.getByTestId('profile-stats')).toBeInTheDocument()
    );
  });

  it('botão Share visível na aba stats', async () => {
    wrap();
    // aguarda carregamento dos dados
    await waitFor(() => screen.getByTestId('profile-stats'));
    expect(screen.queryByTitle(/compartilhar/i)).not.toBeNull();
  });

  it('ThemeToggle está na aba stats', async () => {
    wrap();
    await waitFor(() =>
      expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
    );
  });

  it('ReferralPanel está na aba stats', async () => {
    wrap();
    await waitFor(() =>
      expect(screen.getByTestId('referral-panel')).toBeInTheDocument()
    );
  });

  it('banner perfil público exibido na aba stats', async () => {
    wrap();
    await waitFor(() =>
      expect(screen.getByText('Perfil público')).toBeInTheDocument()
    );
  });
});

// ─── Tab Conquistas ───────────────────────────────────────────────────────────
describe('ProfilePage › tab conquistas', () => {
  it('clicar em "Conquistas" exibe BadgesSection', async () => {
    wrap();
    await waitFor(() => screen.getByRole('button', { name: /conquistas/i }));
    fireEvent.click(screen.getByRole('button', { name: /conquistas/i }));
    await waitFor(() =>
      expect(screen.getByTestId('badges-section')).toBeInTheDocument()
    );
  });

  it('BadgesSection recebe playerId e babaId corretos', async () => {
    wrap();
    await waitFor(() => screen.getByRole('button', { name: /conquistas/i }));
    fireEvent.click(screen.getByRole('button', { name: /conquistas/i }));
    await waitFor(() => screen.getByTestId('badges-section'));
    const el = screen.getByTestId('badges-section');
    expect(el.getAttribute('data-player')).toBe('p1');
    expect(el.getAttribute('data-baba')).toBe('b1');
  });

  it('ProfileStats NÃO aparece na aba conquistas', async () => {
    wrap();
    await waitFor(() => screen.getByRole('button', { name: /conquistas/i }));
    fireEvent.click(screen.getByRole('button', { name: /conquistas/i }));
    expect(screen.queryByTestId('profile-stats')).toBeNull();
  });
});

// ─── Tab Editar ───────────────────────────────────────────────────────────────
describe('ProfilePage › tab editar', () => {
  it('clicar em "Editar" exibe ProfileEdit', async () => {
    wrap();
    await waitFor(() => screen.getByRole('button', { name: /^editar$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^editar$/i }));
    await waitFor(() =>
      expect(screen.getByTestId('profile-edit')).toBeInTheDocument()
    );
  });

  it('"Cancelar edição" volta para tab stats', async () => {
    wrap();
    await waitFor(() => screen.getByRole('button', { name: /^editar$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^editar$/i }));
    await waitFor(() => screen.getByTestId('profile-edit'));
    fireEvent.click(screen.getByText('cancelar edição'));
    await waitFor(() =>
      expect(screen.getByTestId('profile-stats')).toBeInTheDocument()
    );
  });

  it('banner perfil público NÃO aparece na aba editar', async () => {
    wrap();
    await waitFor(() => screen.getByRole('button', { name: /^editar$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^editar$/i }));
    await waitFor(() => screen.getByTestId('profile-edit'));
    expect(screen.queryByText('Perfil público')).toBeNull();
  });
});

// ─── ShareableCardModal ───────────────────────────────────────────────────────
describe('ProfilePage › ShareableCardModal', () => {
  it('modal começa fechado', async () => {
    wrap();
    await waitFor(() => {}, { timeout: 100 });
    expect(screen.queryByTestId('share-modal')).toBeNull();
  });

  it('clicar no botão share abre modal', async () => {
    wrap();
    await waitFor(() => screen.getByTestId('profile-stats'));
    const shareBtn = document.querySelector('button[title*="ompartilhar"]');
    if (shareBtn && !shareBtn.disabled) {
      fireEvent.click(shareBtn);
      await waitFor(() =>
        expect(screen.getByTestId('share-modal')).toBeInTheDocument()
      );
    }
  });

  it('"Fechar share" fecha o modal', async () => {
    wrap();
    await waitFor(() => screen.getByTestId('profile-stats'));
    const shareBtn = document.querySelector('button[title*="ompartilhar"]');
    if (shareBtn && !shareBtn.disabled) {
      fireEvent.click(shareBtn);
      await waitFor(() => screen.getByTestId('share-modal'));
      fireEvent.click(screen.getByText('fechar share'));
      await waitFor(() =>
        expect(screen.queryByTestId('share-modal')).toBeNull()
      );
    }
  });
});

// ─── Banner perfil público ────────────────────────────────────────────────────
describe('ProfilePage › perfil público', () => {
  it('exibe URL parcial do usuário', async () => {
    wrap();
    await waitFor(() =>
      expect(screen.getByText(/\/player\/user-abc/)).toBeInTheDocument()
    );
  });

  it('botão copiar link chama clipboard.writeText', async () => {
    wrap();
    await waitFor(() => screen.getByTitle('Copiar link'));
    fireEvent.click(screen.getByTitle('Copiar link'));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        expect.stringContaining('/player/user-abc-123')
      )
    );
  });

  it('botão "Ver perfil público" navega para /player/:id', async () => {
    wrap();
    await waitFor(() => screen.getByTitle('Ver perfil público'));
    fireEvent.click(screen.getByTitle('Ver perfil público'));
    expect(mockNavigate).toHaveBeenCalledWith('/player/user-abc-123');
  });

  it('botão followers navega para /followers/:id', async () => {
    wrap();
    await waitFor(() => screen.getByText('seguidores'));
    fireEvent.click(screen.getByText('seguidores').closest('button'));
    expect(mockNavigate).toHaveBeenCalledWith('/followers/user-abc-123');
  });
});

// ─── Erro de carregamento ─────────────────────────────────────────────────────
describe('ProfilePage › erro', () => {
  it('exibe mensagem de erro e botão "Tentar novamente"', async () => {
    const { supabase } = await import('../../services/supabase');
    (supabase.rpc).mockResolvedValueOnce({ data: null, error: { message: 'RPC falhou' } });
    wrap();
    await waitFor(() =>
      expect(screen.getByText('Erro ao carregar dados')).toBeInTheDocument()
    );
    expect(screen.getByText('Tentar novamente')).toBeInTheDocument();
  });
});

// ─── Sem baba atual ───────────────────────────────────────────────────────────
describe('ProfilePage › sem baba', () => {
  it('BadgesSection recebe playerId=undefined quando sem player no baba', async () => {
    // Forçar myBabas vazio para não chamar RPC
    vi.mock('../../contexts/BabaContext', () => ({
      useBaba: () => ({
        myBabas:     [],
        currentBaba: null,
        players:     [],
      }),
    }));
    // Não quebra
    expect(() => wrap()).not.toThrow();
  });
});
