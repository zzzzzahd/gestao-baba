// Sprint T-6 — Componente: MatchShareButton
// Botão de compartilhamento de resultado via Web Share API ou WhatsApp.

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MatchShareButton from '../../components/MatchShareButton';

const defaultMatch = {
  team_a_name:  'Azul',
  team_b_name:  'Preto',
  team_a_score: 3,
  team_b_score: 1,
  match_date:   '2026-06-28',
};

const mk = (props = {}) =>
  render(
    <MatchShareButton
      match={defaultMatch}
      babaName="Pelada do Zé"
      topScorers={[]}
      {...props}
    />
  );

beforeEach(() => vi.clearAllMocks());

// ─── Null guard ───────────────────────────────────────────────────────────────
describe('MatchShareButton › null guard', () => {
  it('não renderiza quando match=null', () => {
    const { container } = render(<MatchShareButton match={null} />);
    expect(container.firstChild).toBeNull();
  });
});

// ─── Estrutura ────────────────────────────────────────────────────────────────
describe('MatchShareButton › estrutura', () => {
  it('renderiza botão "Compartilhar"', () => {
    mk();
    expect(screen.getByRole('button', { name: /compartilhar/i })).toBeInTheDocument();
  });

  it('tem aria-label descritivo', () => {
    mk();
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-label', 'Compartilhar resultado da partida');
  });

  it('aceita className customizado', () => {
    const { container } = mk({ className: 'custom-test' });
    expect(container.querySelector('.custom-test')).not.toBeNull();
  });
});

// ─── Texto do share ───────────────────────────────────────────────────────────
describe('MatchShareButton › texto gerado', () => {
  it('texto contém nome do baba', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { writable: true, value: share });
    mk({ babaName: 'Baba do Zé' });
    fireEvent.click(screen.getByRole('button', { name: /compartilhar/i }));
    await waitFor(() => expect(share).toHaveBeenCalled());
    expect(share.mock.calls[0][0].text).toContain('Baba do Zé');
  });

  it('texto contém placar', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { writable: true, value: share });
    mk();
    fireEvent.click(screen.getByRole('button', { name: /compartilhar/i }));
    await waitFor(() => expect(share).toHaveBeenCalled());
    const text = share.mock.calls[0][0].text;
    expect(text).toContain('3');
    expect(text).toContain('1');
  });

  it('indica vencedor no texto quando A > B', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { writable: true, value: share });
    mk({ match: { ...defaultMatch, team_a_score: 3, team_b_score: 0 } });
    fireEvent.click(screen.getByRole('button', { name: /compartilhar/i }));
    await waitFor(() => expect(share).toHaveBeenCalled());
    expect(share.mock.calls[0][0].text).toContain('Azul');
  });

  it('indica empate quando scores iguais', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { writable: true, value: share });
    mk({ match: { ...defaultMatch, team_a_score: 1, team_b_score: 1 } });
    fireEvent.click(screen.getByRole('button', { name: /compartilhar/i }));
    await waitFor(() => expect(share).toHaveBeenCalled());
    expect(share.mock.calls[0][0].text).toContain('Empate');
  });

  it('inclui artilheiros no texto quando fornecidos', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { writable: true, value: share });
    mk({
      topScorers: [{ name: 'Ronaldo', goals: 2 }, { name: 'Messi', goals: 1 }],
    });
    fireEvent.click(screen.getByRole('button', { name: /compartilhar/i }));
    await waitFor(() => expect(share).toHaveBeenCalled());
    expect(share.mock.calls[0][0].text).toContain('Ronaldo');
  });
});

// ─── Fallback WhatsApp ────────────────────────────────────────────────────────
describe('MatchShareButton › fallback WhatsApp', () => {
  it('abre WhatsApp quando navigator.share indefinido', async () => {
    Object.defineProperty(navigator, 'share', { writable: true, value: undefined });
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    mk();
    fireEvent.click(screen.getByRole('button', { name: /compartilhar/i }));
    await waitFor(() => expect(openSpy).toHaveBeenCalled());
    expect(openSpy.mock.calls[0][0]).toContain('wa.me');
  });
});

// ─── Estado "Compartilhado" ───────────────────────────────────────────────────
describe('MatchShareButton › estado compartilhado', () => {
  it('exibe "Compartilhado" após share bem sucedido', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { writable: true, value: share });
    mk();
    fireEvent.click(screen.getByRole('button', { name: /compartilhar/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /compartilhado/i })).toBeInTheDocument()
    );
  });

  it('botão volta para "Compartilhar" após 3s', async () => {
    vi.useFakeTimers();
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { writable: true, value: share });
    mk();
    fireEvent.click(screen.getByRole('button', { name: /compartilhar/i }));
    await waitFor(() => screen.getByRole('button', { name: /compartilhado/i }));
    act(() => vi.advanceTimersByTime(3100));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /compartilhar/i })).toBeInTheDocument()
    );
    vi.useRealTimers();
  });

  it('AbortError não altera estado para "Compartilhado"', async () => {
    const abortErr = new Error('user abort');
    abortErr.name = 'AbortError';
    const share = vi.fn().mockRejectedValue(abortErr);
    Object.defineProperty(navigator, 'share', { writable: true, value: share });
    mk();
    fireEvent.click(screen.getByRole('button', { name: /compartilhar/i }));
    await waitFor(() => {}, { timeout: 200 });
    expect(screen.queryByRole('button', { name: /compartilhado/i })).toBeNull();
  });
});

// ─── topScorers limitado a 3 ────────────────────────────────────────────────
describe('MatchShareButton › topScorers', () => {
  it('inclui no máximo 3 artilheiros no texto', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { writable: true, value: share });
    mk({
      topScorers: [
        { name: 'A', goals: 5 },
        { name: 'B', goals: 4 },
        { name: 'C', goals: 3 },
        { name: 'D', goals: 2 }, // deve ser ignorado
      ],
    });
    fireEvent.click(screen.getByRole('button', { name: /compartilhar/i }));
    await waitFor(() => expect(share).toHaveBeenCalled());
    const text = share.mock.calls[0][0].text;
    expect(text).toContain('A');
    expect(text).not.toContain('D');
  });
});
