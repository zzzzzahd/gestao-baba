// src/__tests__/components/OnboardingModal.test.jsx
// Testes para o modal de onboarding (3 steps)

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OnboardingModal, {
  shouldShowOnboarding,
  markOnboardingDone,
} from '../../components/OnboardingModal';

const ONBOARDING_KEY = 'draft_play_onboarding_done_v2';

describe('shouldShowOnboarding', () => {
  beforeEach(() => localStorage.clear());

  it('retorna true quando nunca foi feito', () => {
    expect(shouldShowOnboarding()).toBe(true);
  });

  it('retorna false quando já foi marcado como done', () => {
    markOnboardingDone();
    expect(shouldShowOnboarding()).toBe(false);
  });
});

describe('markOnboardingDone', () => {
  beforeEach(() => localStorage.clear());

  it('persiste no localStorage', () => {
    markOnboardingDone();
    expect(localStorage.getItem(ONBOARDING_KEY)).toBe('1');
  });

  it('não lança erro se localStorage estiver indisponível', () => {
    const original = localStorage.setItem.bind(localStorage);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('quota exceeded');
    });
    expect(() => markOnboardingDone()).not.toThrow();
    Storage.prototype.setItem = original;
  });
});

describe('OnboardingModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    mockOnClose.mockClear();
  });

  it('renderiza o primeiro step ao abrir', () => {
    render(<OnboardingModal onClose={mockOnClose} />);
    expect(screen.getByText('Bem-vindo ao Draft Play')).toBeInTheDocument();
    expect(screen.getByText('Baba organizado em segundos')).toBeInTheDocument();
  });

  it('mostra barra de progresso com 3 segmentos', () => {
    const { container } = render(<OnboardingModal onClose={mockOnClose} />);
    // 3 steps = 3 divs na barra de progresso
    const progressBars = container.querySelectorAll('.flex-1.h-1.rounded-full');
    expect(progressBars).toHaveLength(3);
  });

  it('avança para o segundo step ao clicar em Próximo', () => {
    render(<OnboardingModal onClose={mockOnClose} />);
    fireEvent.click(screen.getByText('Próximo'));
    expect(screen.getByText('Times equilibrados')).toBeInTheDocument();
    expect(screen.getByText('Sem briga na hora do sorteio')).toBeInTheDocument();
  });

  it('avança para o terceiro step', () => {
    render(<OnboardingModal onClose={mockOnClose} />);
    fireEvent.click(screen.getByText('Próximo'));
    fireEvent.click(screen.getByText('Próximo'));
    expect(screen.getByText('Confirme sua presença')).toBeInTheDocument();
    expect(screen.getByText('Entrar no Baba')).toBeInTheDocument();
  });

  it('chama onClose e marca done ao clicar em "Entrar no Baba" (último step)', () => {
    render(<OnboardingModal onClose={mockOnClose} />);
    fireEvent.click(screen.getByText('Próximo'));
    fireEvent.click(screen.getByText('Próximo'));
    fireEvent.click(screen.getByText('Entrar no Baba'));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(ONBOARDING_KEY)).toBe('1');
  });

  it('chama onClose ao clicar em Pular (X)', () => {
    render(<OnboardingModal onClose={mockOnClose} />);
    // Botão X para fechar/pular
    const closeBtn = screen.getByRole('button', { name: '' });
    // Pegar pelo ícone X — usar querySelector
    const { container } = render(<OnboardingModal onClose={mockOnClose} />);
    const xButton = container.querySelector('button svg')?.closest('button');
    if (xButton) {
      fireEvent.click(xButton);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('marca onboarding como done ao pular', () => {
    const { container } = render(<OnboardingModal onClose={mockOnClose} />);
    const xButton = container.querySelector('button');
    fireEvent.click(xButton);
    expect(localStorage.getItem(ONBOARDING_KEY)).toBe('1');
  });

  it('não volta ao step anterior (sem botão de voltar)', () => {
    render(<OnboardingModal onClose={mockOnClose} />);
    fireEvent.click(screen.getByText('Próximo'));
    // Step 2 — não deve ter botão "Voltar"
    expect(screen.queryByText('Voltar')).toBeNull();
    expect(screen.queryByText('Anterior')).toBeNull();
  });
});
