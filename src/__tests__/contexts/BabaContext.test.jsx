// src/__tests__/contexts/BabaContext.test.jsx

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../services/supabase', () => ({
  supabase: {
    from:    vi.fn(),
    rpc:     vi.fn().mockResolvedValue({ data: null, error: null }),
    storage: {
      from: vi.fn().mockReturnValue({
        upload:       vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://img.com/a.png' } }),
      }),
    },
  },
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user:    { id: 'user-1' },
    profile: { name: 'Zé Presidente' },
  })),
}));

vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

vi.mock('nanoid', () => ({
  customAlphabet: () => () => 'ABCD12',
}));

import { BabaProvider, useBaba } from '../../contexts/BabaContext';
import { useAuth }               from '../../contexts/AuthContext';
import { supabase }              from '../../services/supabase';
import toast                     from 'react-hot-toast';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BABA    = { id: 'baba-1', name: 'Baba do Zé', president_id: 'user-1', game_days_config: [] };
const PLAYERS = [{ id: 'p-1', name: 'Zé', baba_id: 'baba-1', user_id: 'user-1', profile: null }];

const setupMocks = (overrides = {}) => {
  supabase.from.mockImplementation((table) => {
    const base = {
      select:      vi.fn().mockReturnThis(),
      insert:      vi.fn().mockReturnThis(),
      update:      vi.fn().mockReturnThis(),
      delete:      vi.fn().mockReturnThis(),
      upsert:      vi.fn().mockReturnThis(),
      eq:          vi.fn().mockReturnThis(),
      in:          vi.fn().mockReturnThis(),
      neq:         vi.fn().mockReturnThis(),
      order:       vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single:      vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    if (table === 'babas') {
      return {
        ...base,
        eq:          vi.fn().mockResolvedValue({ data: [BABA], error: null }),
        in:          vi.fn().mockResolvedValue({ data: [BABA], error: null }),
        single:      vi.fn().mockResolvedValue({ data: BABA, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        ...(overrides.babas || {}),
      };
    }
    if (table === 'players') {
      return {
        ...base,
        order: vi.fn().mockResolvedValue({ data: PLAYERS, error: null }),
        ...(overrides.players || {}),
      };
    }
    if (table === 'game_confirmations') {
      return {
        ...base,
        neq: vi.fn().mockResolvedValue({ data: [], error: null }),
        ...(overrides.confirmations || {}),
      };
    }
    if (table === 'draw_results') {
      return {
        ...base,
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }
    return { ...base, order: vi.fn().mockResolvedValue({ data: [], error: null }) };
  });
};

// Componente consumidor
const Consumer = ({ onMount }) => {
  const ctx = useBaba();
  React.useEffect(() => { onMount?.(ctx); }, []);
  return (
    <div>
      <span data-testid="loading">{String(ctx?.loading ?? 'no-ctx')}</span>
      <span data-testid="baba">{ctx?.currentBaba?.name ?? 'null'}</span>
    </div>
  );
};

const renderCtx = (onMount) =>
  render(
    <MemoryRouter>
      <BabaProvider>
        <Consumer onMount={onMount} />
      </BabaProvider>
    </MemoryRouter>
  );

// ─── Testes ───────────────────────────────────────────────────────────────────

describe('BabaProvider — inicialização', () => {
  beforeEach(() => { vi.clearAllMocks(); setupMocks(); });

  it('começa com loading=true', () => {
    renderCtx();
    expect(screen.getByTestId('loading').textContent).toBe('true');
  });

  it('resolve para loading=false após carregar', async () => {
    renderCtx();
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
  });

  it('carrega o primeiro baba do usuário', async () => {
    renderCtx();
    await waitFor(() => {
      expect(screen.getByTestId('baba').textContent).toBe('Baba do Zé');
    });
  });

  it('baba permanece null quando user é null', async () => {
    useAuth.mockReturnValueOnce({ user: null, profile: null });
    renderCtx();
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(screen.getByTestId('baba').textContent).toBe('null');
  });
});

describe('useBaba fora do BabaProvider', () => {
  it('retorna undefined (sem lançar erro)', () => {
    const Bare = () => {
      const ctx = useBaba();
      return <div data-testid="v">{String(ctx)}</div>;
    };
    render(<Bare />);
    expect(screen.getByTestId('v').textContent).toBe('undefined');
  });
});

describe('BabaProvider — createBaba', () => {
  beforeEach(() => { vi.clearAllMocks(); setupMocks(); });

  it('retorna null e toast.error quando Supabase falha', async () => {
    let ctx;
    renderCtx((c) => { ctx = c; });
    await waitFor(() => expect(ctx).toBeDefined());

    supabase.from.mockImplementation((table) => ({
      select:  vi.fn().mockReturnThis(),
      insert:  vi.fn().mockReturnThis(),
      single:  vi.fn().mockResolvedValue({ data: null, error: new Error('DB fail') }),
    }));

    let result;
    await act(async () => {
      result = await ctx.createBaba({ name: 'Fail Baba', game_days_config: [] });
    });

    expect(result).toBeNull();
    expect(toast.error).toHaveBeenCalled();
  });

  it('cria baba com invite_code gerado pelo nanoid', async () => {
    let ctx;
    renderCtx((c) => { ctx = c; });
    await waitFor(() => expect(ctx).toBeDefined());

    const insertMock = vi.fn().mockReturnThis();
    const singleMock = vi.fn().mockResolvedValue({
      data:  { id: 'baba-new', name: 'Novo Baba', invite_code: 'ABCD12' },
      error: null,
    });
    supabase.from.mockImplementation((table) => ({
      select: vi.fn().mockReturnThis(),
      insert: insertMock,
      single: singleMock,
    }));

    await act(async () => {
      await ctx.createBaba({ name: 'Novo Baba', game_days_config: [] });
    });

    const payload = insertMock.mock.calls[0]?.[0]?.[0];
    if (payload) {
      expect(payload.invite_code).toBe('ABCD12');
      expect(payload.president_id).toBe('user-1');
    }
  });
});

describe('BabaProvider — joinBaba', () => {
  beforeEach(() => { vi.clearAllMocks(); setupMocks(); });

  it('retorna null e toast.error para código inválido', async () => {
    let ctx;
    renderCtx((c) => { ctx = c; });
    await waitFor(() => expect(ctx).toBeDefined());

    supabase.from.mockImplementation(() => ({
      select:      vi.fn().mockReturnThis(),
      eq:          vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }));

    let result;
    await act(async () => {
      result = await ctx.joinBaba('INVALIDO');
    });

    expect(result).toBeNull();
    expect(toast.error).toHaveBeenCalledWith('Código inválido');
  });

  it('retorna null para código expirado', async () => {
    let ctx;
    renderCtx((c) => { ctx = c; });
    await waitFor(() => expect(ctx).toBeDefined());

    const expiredBaba = { ...BABA, invite_expires_at: new Date(Date.now() - 1000).toISOString() };
    supabase.from.mockImplementation(() => ({
      select:      vi.fn().mockReturnThis(),
      eq:          vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: expiredBaba, error: null }),
    }));

    let result;
    await act(async () => {
      result = await ctx.joinBaba('ABCD12');
    });

    expect(result).toBeNull();
    expect(toast.error).toHaveBeenCalledWith('Código expirado');
  });
});

describe('BabaProvider — updateBaba', () => {
  beforeEach(() => { vi.clearAllMocks(); setupMocks(); });

  it('chama toast.success após atualização bem-sucedida', async () => {
    let ctx;
    renderCtx((c) => { ctx = c; });
    await waitFor(() => expect(ctx?.currentBaba?.name).toBe('Baba do Zé'));

    supabase.from.mockImplementation(() => ({
      update: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { ...BABA, name: 'Novo Nome' }, error: null }),
    }));

    await act(async () => { await ctx.updateBaba('baba-1', { name: 'Novo Nome' }); });
    expect(toast.success).toHaveBeenCalledWith('Configurações salvas');
  });

  it('chama toast.error quando update falha', async () => {
    let ctx;
    renderCtx((c) => { ctx = c; });
    await waitFor(() => expect(ctx).toBeDefined());

    supabase.from.mockImplementation(() => ({
      update: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error('fail') }),
    }));

    await act(async () => { await ctx.updateBaba('baba-1', { name: 'X' }); });
    expect(toast.error).toHaveBeenCalledWith('Erro ao salvar');
  });
});

describe('BabaProvider — deleteBaba', () => {
  beforeEach(() => { vi.clearAllMocks(); setupMocks(); });

  it('exibe toast.success após excluir', async () => {
    let ctx;
    renderCtx((c) => { ctx = c; });
    await waitFor(() => expect(ctx).toBeDefined());

    supabase.from.mockImplementation(() => ({
      delete: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockResolvedValue({ error: null }),
    }));

    await act(async () => { await ctx.deleteBaba('baba-1'); });
    expect(toast.success).toHaveBeenCalledWith('Baba excluído');
  });

  it('retorna false e toast.error quando delete falha', async () => {
    let ctx;
    renderCtx((c) => { ctx = c; });
    await waitFor(() => expect(ctx).toBeDefined());

    supabase.from.mockImplementation(() => ({
      delete: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockResolvedValue({ error: new Error('RLS denied') }),
    }));

    let result;
    await act(async () => { result = await ctx.deleteBaba('baba-1'); });
    expect(result).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('Erro ao excluir');
  });
});
