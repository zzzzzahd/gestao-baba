// src/__tests__/components/PushPrompt.test.jsx
// Testes para o prompt de permissão de notificações push

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const mockUsePush = vi.fn();

vi.mock('../../hooks/usePushNotifications', () => ({
  usePushNotifications: () => mockUsePush(),
}));

import PushPrompt from '../../components/PushPrompt';

const DISMISSED_KEY = 'push_prompt_dismissed_at';

const defaultHook = {
  permission:  'default',
  subscribed:  false,
  loading:     false,
  supported:   true,
  subscribe:   vi.fn().mockResolvedValue(true),
};

describe('PushPrompt — visibilidade', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    mockUsePush.mockReturnValue({ ...defaultHook });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('não renderiza imediatamente (delay de 1500ms)', () => {
    render(<PushPrompt />);
    expect(screen.queryByText('Ativar notificações')).toBeNull();
  });

  it('aparece após 1500ms', async () => {
    render(<PushPrompt />);
    act(() => vi.advanceTimersByTime(1500));
    await waitFor(() => {
      expect(screen.getByText('Ativar notificações')).toBeInTheDocument();
    });
  });

  it('não renderiza quando permission é "granted"', () => {
    mockUsePush.mockReturnValue({ ...defaultHook, permission: 'granted' });
    render(<PushPrompt />);
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.queryByText('Ativar notificações')).toBeNull();
  });

  it('não renderiza quando permission é "denied"', () => {
    mockUsePush.mockReturnValue({ ...defaultHook, permission: 'denied' });
    render(<PushPrompt />);
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.queryByText('Ativar notificações')).toBeNull();
  });

  it('não renderiza quando já está subscrito', () => {
    mockUsePush.mockReturnValue({ ...defaultHook, subscribed: true });
    render(<PushPrompt />);
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.queryByText('Ativar notificações')).toBeNull();
  });

  it('não renderiza quando não é suportado', () => {
    mockUsePush.mockReturnValue({ ...defaultHook, supported: false });
    render(<PushPrompt />);
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.queryByText('Ativar notificações')).toBeNull();
  });

  it('não renderiza quando foi dispensado recentemente', () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    render(<PushPrompt />);
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.queryByText('Ativar notificações')).toBeNull();
  });

  it('renderiza quando dismissal foi há mais de 7 dias', () => {
    const eightDaysAgo = Date.now() - 8 * 86400000;
    localStorage.setItem(DISMISSED_KEY, String(eightDaysAgo));
    render(<PushPrompt />);
    act(() => vi.advanceTimersByTime(1500));
    waitFor(() => {
      expect(screen.getByText('Ativar notificações')).toBeInTheDocument();
    });
  });

  it('não renderiza quando loading é true', () => {
    mockUsePush.mockReturnValue({ ...defaultHook, loading: true });
    render(<PushPrompt />);
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.queryByText('Ativar notificações')).toBeNull();
  });
});

describe('PushPrompt — conteúdo', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    mockUsePush.mockReturnValue({ ...defaultHook });
  });

  afterEach(() => vi.useRealTimers());

  const showPrompt = async () => {
    render(<PushPrompt />);
    act(() => vi.advanceTimersByTime(1500));
    await waitFor(() => screen.getByText('Ativar notificações'));
  };

  it('exibe texto descritivo sobre notificações', async () => {
    await showPrompt();
    expect(screen.getByText(/lembretes do jogo/i)).toBeInTheDocument();
  });

  it('exibe botão "Ativar"', async () => {
    await showPrompt();
    expect(screen.getByText(/Ativar/i)).toBeInTheDocument();
  });

  it('exibe botão "Agora não"', async () => {
    await showPrompt();
    expect(screen.getByText('Agora não')).toBeInTheDocument();
  });
});

describe('PushPrompt — interação', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    mockUsePush.mockReturnValue({ ...defaultHook });
  });

  afterEach(() => vi.useRealTimers());

  const showPrompt = async () => {
    render(<PushPrompt />);
    act(() => vi.advanceTimersByTime(1500));
    await waitFor(() => screen.getByText('Ativar notificações'));
  };

  it('chama subscribe ao clicar em Ativar', async () => {
    const subscribe = vi.fn().mockResolvedValue(true);
    mockUsePush.mockReturnValue({ ...defaultHook, subscribe });
    await showPrompt();
    fireEvent.click(screen.getByText(/^Ativar$/i));
    expect(subscribe).toHaveBeenCalledTimes(1);
  });

  it('esconde o prompt após subscrição bem-sucedida', async () => {
    const subscribe = vi.fn().mockResolvedValue(true);
    mockUsePush.mockReturnValue({ ...defaultHook, subscribe });
    await showPrompt();
    await act(async () => {
      fireEvent.click(screen.getByText(/^Ativar$/i));
    });
    await waitFor(() => {
      expect(screen.queryByText('Ativar notificações')).toBeNull();
    });
  });

  it('persiste dismissal no localStorage ao clicar "Agora não"', async () => {
    await showPrompt();
    fireEvent.click(screen.getByText('Agora não'));
    expect(localStorage.getItem(DISMISSED_KEY)).toBeTruthy();
  });

  it('esconde o prompt ao clicar "Agora não"', async () => {
    await showPrompt();
    fireEvent.click(screen.getByText('Agora não'));
    await waitFor(() => {
      expect(screen.queryByText('Ativar notificações')).toBeNull();
    });
  });

  it('limpa o timer ao desmontar antes de 1500ms', () => {
    const clearSpy = vi.spyOn(global, 'clearTimeout');
    const { unmount } = render(<PushPrompt />);
    unmount();
    expect(clearSpy).toHaveBeenCalled();
  });
});
