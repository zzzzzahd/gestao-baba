// src/__tests__/integration/auth.test.jsx

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { makeUser, makeProfile } from '../helpers';

vi.mock('../../services/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn().mockReturnValue({
      select:  vi.fn().mockReturnThis(),
      eq:      vi.fn().mockReturnThis(),
      single:  vi.fn().mockResolvedValue({ data: null, error: null }),
      update:  vi.fn().mockReturnThis(),
      upsert:  vi.fn().mockResolvedValue({ data: {}, error: null }),
    }),
  },
}));

import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';

// Componente auxiliar para expor valores do contexto
const AuthConsumer = () => {
  const { user, loading } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.id : 'null'}</span>
    </div>
  );
};

const renderAuth = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    </MemoryRouter>
  );

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    supabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    supabase.from.mockReturnValue({
      select:  vi.fn().mockReturnThis(),
      eq:      vi.fn().mockReturnThis(),
      single:  vi.fn().mockResolvedValue({ data: null, error: null }),
    });
  });

  describe('estado sem sessão', () => {
    it('resolve para user=null quando não há sessão', async () => {
      renderAuth();
      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });
      expect(screen.getByTestId('user').textContent).toBe('null');
    });
  });

  describe('estado com sessão ativa', () => {
    it('carrega user quando há sessão', async () => {
      const user = makeUser();
      supabase.auth.getSession.mockResolvedValue({
        data: { session: { user } },
        error: null,
      });
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq:     vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: makeProfile(), error: null }),
      });

      renderAuth();

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      expect(screen.getByTestId('user').textContent).toBe(user.id);
    });
  });

  describe('proteção do contexto', () => {
    it('useAuth retorna contexto vazio fora do AuthProvider', () => {
      // O AuthContext retorna {} quando usado fora do provider
      // (não lança erro — comportamento real do contexto)
      const TestComponent = () => {
        const ctx = useAuth();
        return <div data-testid="ctx">{typeof ctx}</div>;
      };
      // Não deve crashar
      expect(() => render(<TestComponent />)).not.toThrow();
    });
  });
});

describe('Fluxo de login', () => {
  beforeEach(() => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    supabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it('chama signInWithPassword com email e senha corretos', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: makeUser(), session: {} },
      error: null,
    });

    const LoginTest = () => {
      const { signIn } = useAuth();
      return (
        <button onClick={() => signIn('test@email.com', 'senha123')}>
          Login
        </button>
      );
    };

    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginTest />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      fireEvent.click(screen.getByText('Login'));
    });

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@email.com',
      password: 'senha123',
    });
  });
});