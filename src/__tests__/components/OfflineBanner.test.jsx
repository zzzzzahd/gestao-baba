// src/__tests__/components/OfflineBanner.test.jsx
// Testes de componente para o banner de status de conexão

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { goOffline, goOnline } from '../helpers';

import OfflineBanner from '../../components/OfflineBanner';

const QUEUE_KEY = 'draft_play_offline_queue';

describe('OfflineBanner', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
  });

  describe('estado online (padrão)', () => {
    it('não renderiza nenhum banner quando online', () => {
      const { container } = render(<OfflineBanner />);
      // O banner principal não deve estar visível
      expect(screen.queryByText(/sem conexão/i)).toBeNull();
      expect(screen.queryByText(/conexão restaurada/i)).toBeNull();
    });
  });

  describe('estado offline', () => {
    it('exibe banner ao ficar offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      render(<OfflineBanner />);

      await act(async () => {
        window.dispatchEvent(new Event('offline'));
      });

      // Banner deve aparecer com indicação de offline
      const offlineIndicator = screen.queryByText(/sem conexão/i) ||
                               screen.queryByText(/offline/i);
      expect(offlineIndicator).not.toBeNull();
    });

    it('exibe contagem de ações pendentes quando há itens na fila', async () => {
      const queue = [
        { client_id: '1', operation: 'confirm_presence', retry_count: 0 },
        { client_id: '2', operation: 'rate_player', retry_count: 0 },
      ];
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });

      render(<OfflineBanner />);

      await act(async () => {
        window.dispatchEvent(new Event('offline'));
      });

      // Deve mostrar que há ações pendentes
      expect(screen.queryByText(/2/)).not.toBeNull();
    });
  });

  describe('estado restaurando conexão', () => {
    it('exibe banner de reconexão ao voltar online', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      render(<OfflineBanner />);

      await act(async () => {
        window.dispatchEvent(new Event('offline'));
      });

      await act(async () => {
        Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
        window.dispatchEvent(new Event('online'));
      });

      // Deve mostrar indicação de conexão restaurada
      const restored = screen.queryByText(/restaurad/i) ||
                       screen.queryByText(/online/i);
      expect(restored).not.toBeNull();
    });
  });

  describe('cleanup de event listeners', () => {
    it('remove listeners ao desmontar o componente', () => {
      const addSpy    = vi.spyOn(window, 'addEventListener');
      const removeSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = render(<OfflineBanner />);
      unmount();

      // Deve ter removido os listeners de offline e online
      const removedEvents = removeSpy.mock.calls.map((c) => c[0]);
      expect(removedEvents).toContain('offline');
      expect(removedEvents).toContain('online');

      addSpy.mockRestore();
      removeSpy.mockRestore();
    });
  });
});
