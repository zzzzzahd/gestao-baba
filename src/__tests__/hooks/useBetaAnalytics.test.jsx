// src/__tests__/hooks/useBetaAnalytics.test.jsx
// A tabela beta_events tem as colunas event_name e properties. O código enviava
// "event" e "metadata", e o Supabase respondia 400 (coluna inexistente).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const db = vi.hoisted(() => ({ insert: vi.fn(), from: vi.fn() }));

vi.mock('../../services/supabase', () => ({
  supabase: { from: (...a) => db.from(...a) },
}));

let mockUser = { id: 'user-1' };
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, profile: null }),
}));

import { useBetaAnalytics } from '../../hooks/useBetaAnalytics';

describe('useBetaAnalytics — gravação em beta_events', () => {
  beforeEach(() => {
    localStorage.clear();
    mockUser = { id: 'user-1' };
    db.insert.mockReset();
    db.insert.mockResolvedValue({ error: null });
    db.from.mockReset();
    db.from.mockReturnValue({ insert: db.insert });
  });

  it('ao entrar logado pela primeira vez grava signed_up com as colunas certas', async () => {
    renderHook(() => useBetaAnalytics());
    await waitFor(() => expect(db.insert).toHaveBeenCalledTimes(1));

    expect(db.from).toHaveBeenCalledWith('beta_events');
    const payload = db.insert.mock.calls[0][0];
    expect(payload).toMatchObject({ user_id: 'user-1', event_name: 'signed_up', properties: {} });
    expect(typeof payload.created_at).toBe('string');
    expect(payload).not.toHaveProperty('event');
    expect(payload).not.toHaveProperty('metadata');
  });

  it('trackFunnelStep envia os dados extras em properties', async () => {
    const { result } = renderHook(() => useBetaAnalytics());
    await waitFor(() => expect(db.insert).toHaveBeenCalledTimes(1));

    await act(async () => {
      await result.current.trackFunnelStep('first_baba_created', { baba: 'x' });
    });

    expect(db.insert).toHaveBeenCalledTimes(2);
    expect(db.insert.mock.calls[1][0]).toMatchObject({
      event_name: 'first_baba_created',
      properties: { baba: 'x' },
    });
  });

  it('não repete um passo que já foi registrado', async () => {
    const { result } = renderHook(() => useBetaAnalytics());
    await waitFor(() => expect(db.insert).toHaveBeenCalledTimes(1));

    await act(async () => {
      await result.current.trackFunnelStep('signed_up');
    });

    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it('erro do banco não quebra o hook e o passo continua salvo no navegador', async () => {
    db.insert.mockResolvedValue({ error: { message: 'falhou' } });
    const { result } = renderHook(() => useBetaAnalytics());
    await waitFor(() => expect(db.insert).toHaveBeenCalledTimes(1));

    expect(result.current.getFunnelData().signed_up).toBeTruthy();
  });
});
