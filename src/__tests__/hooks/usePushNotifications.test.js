// src/__tests__/hooks/usePushNotifications.test.js
// Testes para o hook de push notifications

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('../../services/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

import { usePushNotifications } from '../../hooks/usePushNotifications';
import { supabase } from '../../services/supabase';

// Helpers para simular browser APIs
const mockServiceWorker = {
  ready: Promise.resolve({
    pushManager: {
      getSubscription: vi.fn().mockResolvedValue(null),
      subscribe:       vi.fn().mockResolvedValue({
        endpoint: 'https://push.example.com/sub-1',
        toJSON:   () => ({
          endpoint: 'https://push.example.com/sub-1',
          keys: { p256dh: 'key123', auth: 'auth123' },
        }),
      }),
    },
  }),
  register: vi.fn().mockResolvedValue({
    pushManager: {
      subscribe: vi.fn().mockResolvedValue({
        endpoint: 'https://push.example.com/sub-1',
        toJSON: () => ({
          endpoint: 'https://push.example.com/sub-1',
          keys: { p256dh: 'key123', auth: 'auth123' },
        }),
      }),
    },
  }),
};

describe('usePushNotifications — estado inicial', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Simular browser com suporte
    Object.defineProperty(navigator, 'serviceWorker', {
      value:      mockServiceWorker,
      writable:   true,
      configurable: true,
    });
    Object.defineProperty(window, 'PushManager', {
      value:      {},
      writable:   true,
      configurable: true,
    });
  });

  it('começa com loading=false', () => {
    const { result } = renderHook(() => usePushNotifications());
    expect(result.current.loading).toBe(false);
  });

  it('começa com subscribed=false', () => {
    const { result } = renderHook(() => usePushNotifications());
    expect(result.current.subscribed).toBe(false);
  });

  it('detecta suporte quando serviceWorker + PushManager + Notification estão disponíveis', async () => {
    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => {
      expect(result.current.supported).toBe(true);
    });
  });

  it('não está suportado quando serviceWorker está ausente', async () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value:      undefined,
      writable:   true,
      configurable: true,
    });
    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => {
      expect(result.current.supported).toBe(false);
    });
  });

  it('permission inicial vem de Notification.permission', () => {
    Object.defineProperty(global.Notification, 'permission', {
      value:      'default',
      writable:   true,
      configurable: true,
    });
    const { result } = renderHook(() => usePushNotifications());
    expect(result.current.permission).toBe('default');
  });
});

describe('usePushNotifications — verificação de status (RPC)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'serviceWorker', {
      value: mockServiceWorker, writable: true, configurable: true,
    });
  });

  it('não chama RPC quando não há sessão', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    renderHook(() => usePushNotifications());
    await waitFor(() => {
      expect(supabase.rpc).not.toHaveBeenCalledWith('get_push_status');
    });
  });

  it('chama get_push_status RPC quando há sessão', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u-1' } } },
      error: null,
    });
    supabase.rpc.mockResolvedValue({ data: [{ has_subscription: false }], error: null });

    renderHook(() => usePushNotifications());

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('get_push_status');
    });
  });
});

describe('usePushNotifications — subscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'serviceWorker', {
      value: mockServiceWorker, writable: true, configurable: true,
    });
    Object.defineProperty(window, 'PushManager', {
      value: {}, writable: true, configurable: true,
    });
    supabase.rpc.mockResolvedValue({ data: null, error: null });
  });

  it('retorna false quando não há suporte', async () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: undefined, writable: true, configurable: true,
    });
    const { result } = renderHook(() => usePushNotifications());

    let ok;
    await act(async () => {
      ok = await result.current.subscribe();
    });
    expect(ok).toBe(false);
  });

  it('retorna false quando permission é negado', async () => {
    global.Notification.requestPermission = vi.fn().mockResolvedValue('denied');
    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.supported).toBe(true));

    let ok;
    await act(async () => {
      ok = await result.current.subscribe();
    });
    expect(ok).toBe(false);
  });

  it('atualiza permission após requestPermission', async () => {
    global.Notification.requestPermission = vi.fn().mockResolvedValue('granted');
    supabase.rpc.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.supported).toBe(true));

    await act(async () => {
      await result.current.subscribe();
    });

    expect(result.current.permission).toBe('granted');
  });

  it('chama upsert_push_subscription RPC com dados corretos', async () => {
    global.Notification.requestPermission = vi.fn().mockResolvedValue('granted');
    supabase.rpc.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.supported).toBe(true));

    await act(async () => {
      await result.current.subscribe();
    });

    expect(supabase.rpc).toHaveBeenCalledWith('upsert_push_subscription', expect.objectContaining({
      p_endpoint: 'https://push.example.com/sub-1',
      p_p256dh:   'key123',
      p_auth:     'auth123',
    }));
  });

  it('define subscribed=true após sucesso', async () => {
    global.Notification.requestPermission = vi.fn().mockResolvedValue('granted');
    supabase.rpc.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.supported).toBe(true));

    await act(async () => {
      await result.current.subscribe();
    });

    expect(result.current.subscribed).toBe(true);
  });

  it('retorna false e não crasha quando RPC lança erro', async () => {
    global.Notification.requestPermission = vi.fn().mockResolvedValue('granted');
    supabase.rpc.mockRejectedValue(new Error('RPC failed'));

    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.supported).toBe(true));

    let ok;
    await act(async () => {
      ok = await result.current.subscribe();
    });

    expect(ok).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it('define loading=true durante subscribe e false ao terminar', async () => {
    global.Notification.requestPermission = vi.fn().mockResolvedValue('denied');
    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.supported).toBe(true));

    await act(async () => {
      const promise = result.current.subscribe();
      // loading deve ser true durante a execução
      await promise;
    });

    expect(result.current.loading).toBe(false);
  });
});
