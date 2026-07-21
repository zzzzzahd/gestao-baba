// src/__tests__/components/MatchReactions.test.jsx
// Sprint T-6 — Componente: MatchReactions
// Reações emoji em tempo real durante a partida.

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import MatchReactions from '../../components/MatchReactions';

const mockChannel = {
  on:        vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
  send:      vi.fn().mockResolvedValue(undefined),
};

const { supabase } = vi.hoisted(() => ({
  supabase: {
    channel:       vi.fn(),
    removeChannel: vi.fn(),
  },
}));
vi.mock('../../services/supabase', () => ({ supabase }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  supabase.channel.mockReturnValue(mockChannel);
});

afterEach(() => vi.useRealTimers());

const mk = (props = {}) =>
  render(
    <MatchReactions
      matchId="match1"
      currentUserId="user1"
      {...props}
    />
  );

describe('MatchReactions › estrutura', () => {
  it('exibe os 8 emojis de reação', () => {
    mk();
    const REACTIONS = ['⚽', '🔥', '😱', '👑', '💪', '🤣', '😤', '🎯'];
    REACTIONS.forEach(emoji =>
      expect(screen.getByRole('button', { name: emoji })).toBeInTheDocument()
    );
  });

  it('todos os botões são type button', () => {
    mk();
    const btns = screen.getAllByRole('button');
    btns.forEach(b => expect(b.tagName).toBe('BUTTON'));
  });
});

describe('MatchReactions › Realtime', () => {
  it('subscreve ao canal correto no mount', () => {
    mk();
    expect(supabase.channel).toHaveBeenCalledWith('reactions:match1');
    expect(mockChannel.on).toHaveBeenCalled();
    expect(mockChannel.subscribe).toHaveBeenCalled();
  });

  it('não subscreve quando matchId=null', () => {
    mk({ matchId: null });
    expect(supabase.channel).not.toHaveBeenCalled();
  });

  it('desinscreve ao desmontar', () => {
    const { unmount } = mk();
    unmount();
    expect(supabase.removeChannel).toHaveBeenCalled();
  });
});

describe('MatchReactions › envio', () => {
  it('clicar em emoji chama channel.send', async () => {
    mk();
    fireEvent.click(screen.getByRole('button', { name: '⚽' }));
    await waitFor(() => expect(mockChannel.send).toHaveBeenCalled());
    const payload = mockChannel.send.mock.calls[0][0];
    expect(payload.payload.emoji).toBe('⚽');
  });

  it('cooldown: segundo clique imediato não chama send', async () => {
    mk();
    fireEvent.click(screen.getByRole('button', { name: '🔥' }));
    fireEvent.click(screen.getByRole('button', { name: '🔥' }));
    await waitFor(() => {});
    expect(mockChannel.send).toHaveBeenCalledTimes(1);
  });

  it('botões ficam disabled durante cooldown', async () => {
    mk();
    fireEvent.click(screen.getByRole('button', { name: '💪' }));
    const btns = screen.getAllByRole('button');
    btns.forEach(b => expect(b).toBeDisabled());
  });

  it('após 1s cooldown, botões voltam habilitados', async () => {
    mk();
    fireEvent.click(screen.getByRole('button', { name: '💪' }));
    act(() => vi.advanceTimersByTime(1100));
    await waitFor(() => {
      const btns = screen.getAllByRole('button');
      expect(btns.some(b => !b.disabled)).toBe(true);
    });
  });

  it('inclui currentUserId no payload', async () => {
    mk({ currentUserId: 'userXYZ' });
    fireEvent.click(screen.getByRole('button', { name: '🎯' }));
    await waitFor(() => expect(mockChannel.send).toHaveBeenCalled());
    expect(mockChannel.send.mock.calls[0][0].payload.user_id).toBe('userXYZ');
  });
});
