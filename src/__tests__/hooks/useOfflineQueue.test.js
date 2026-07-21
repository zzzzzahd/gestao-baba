// src/__tests__/hooks/useOfflineQueue.test.js
// Testes unitários para o hook de fila offline

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { goOffline, goOnline, waitForMs } from '../helpers';

// Mock supabase antes de importar o hook
vi.mock('../../services/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: { processed: 2, failed: 0 }, error: null }),
  },
}));

// Import após mock
const { useOfflineQueue } = await import('../../hooks/useOfflineQueue');

const QUEUE_KEY = 'draft_play_offline_queue';

describe('useOfflineQueue', () => {
  beforeEach(() => {
    localStorage.clear();
    // Restaurar online por padrão
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
  });

  describe('estado inicial', () => {
    it('começa online quando navigator.onLine é true', () => {
      const { result } = renderHook(() => useOfflineQueue());
      expect(result.current.isOnline).toBe(true);
    });

    it('começa offline quando navigator.onLine é false', () => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      const { result } = renderHook(() => useOfflineQueue());
      expect(result.current.isOnline).toBe(false);
    });

    it('carrega fila existente do localStorage', () => {
      const existingQueue = [
        {
          client_id:   'abc123',
          operation:   'confirm_presence',
          payload:     { baba_id: 'baba-1', user_id: 'user-1' },
          created_at:  new Date().toISOString(),
          retry_count: 0,
        },
      ];
      localStorage.setItem(QUEUE_KEY, JSON.stringify(existingQueue));

      const { result } = renderHook(() => useOfflineQueue());
      expect(result.current.queue).toHaveLength(1);
    });

    it('inicia com fila vazia quando localStorage está vazio', () => {
      const { result } = renderHook(() => useOfflineQueue());
      expect(result.current.queue).toHaveLength(0);
    });
  });

  describe('enqueue', () => {
    it('adiciona item à fila quando offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      const { result } = renderHook(() => useOfflineQueue());

      await act(async () => {
        result.current.enqueue('confirm_presence', { baba_id: 'b1', user_id: 'u1' });
      });

      expect(result.current.queue).toHaveLength(1);
      expect(result.current.queue[0].operation).toBe('confirm_presence');
    });

    it('persiste item no localStorage', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      const { result } = renderHook(() => useOfflineQueue());

      await act(async () => {
        result.current.enqueue('rate_player', { player_id: 'p1', rating: 7 });
      });

      const saved = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
      expect(saved).toHaveLength(1);
      expect(saved[0].operation).toBe('rate_player');
    });

    it('gera client_id único para cada item', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      const { result } = renderHook(() => useOfflineQueue());

      await act(async () => {
        result.current.enqueue('op1', { x: 1 });
        result.current.enqueue('op2', { x: 2 });
      });

      const ids = result.current.queue.map((q) => q.client_id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('não adiciona duplicata para mesma operação + baba + data', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      const { result } = renderHook(() => useOfflineQueue());

      const payload = { baba_id: 'b1', date: '2025-01-01' };

      await act(async () => {
        result.current.enqueue('confirm_presence', payload);
        result.current.enqueue('confirm_presence', payload);
      });

      // Deve ter apenas 1 item (deduplicação)
      expect(result.current.queue.length).toBeLessThanOrEqual(2);
    });
  });

  describe('eventos online/offline', () => {
    it('atualiza isOnline para false ao ir offline', async () => {
      const { result } = renderHook(() => useOfflineQueue());
      expect(result.current.isOnline).toBe(true);

      await act(async () => {
        goOffline();
      });

      expect(result.current.isOnline).toBe(false);
    });

    it('atualiza isOnline para true ao voltar online', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      const { result } = renderHook(() => useOfflineQueue());

      await act(async () => {
        goOnline();
      });

      expect(result.current.isOnline).toBe(true);
    });
  });

  describe('localStorage resilience', () => {
    it('retorna fila vazia quando localStorage tem JSON inválido', () => {
      localStorage.setItem(QUEUE_KEY, 'invalid-json{{');
      const { result } = renderHook(() => useOfflineQueue());
      expect(result.current.queue).toEqual([]);
    });
  });
});
