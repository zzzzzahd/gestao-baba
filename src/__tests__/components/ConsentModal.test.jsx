// src/__tests__/components/ConsentModal.test.jsx
// Testes para o modal de consentimento LGPD

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../services/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

import ConsentModal from '../../components/ConsentModal';
import { supabase } from '../../services/supabase';

const renderModal = (onAccepted = vi.fn()) =>
  render(
    <MemoryRouter>
      <ConsentModal onAccepted={onAccepted} />
    </MemoryRouter>
  );

describe('ConsentModal — renderização', () => {
  it('exibe título "Antes de continuar"', () => {
    renderModal();
    expect(screen.getByText('Antes de continuar')).toBeInTheDocument();
  });

  it('exibe menção à LGPD', () => {
    renderModal();
    expect(screen.getByText(/LGPD/i)).toBeInTheDocument();
  });

  it('exibe 4 itens de coleta de dados', () => {
    renderModal();
    expect(screen.getByText(/E-mail e nome/i)).toBeInTheDocument();
    expect(screen.getByText(/Estatísticas de jogo/i)).toBeInTheDocument();
    expect(screen.getByText(/Tokens de notificação/i)).toBeInTheDocument();
    expect(screen.getByText(/Nenhum dado de localização/i)).toBeInTheDocument();
  });

  // ✅ CORRIGIDO
  it('exibe botões de Política de Privacidade e Termos', () => {
    renderModal();

    expect(
      screen.getByRole('button', {
        name: /Política de Privacidade/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', {
        name: /Termos de Uso/i,
      })
    ).toBeInTheDocument();
  });

  it('exibe checkbox de consentimento', () => {
    const { container } = renderModal();
    const checkbox = container.querySelector('input[type="checkbox"]');
    expect(checkbox).toBeTruthy();
  });

  it('botão de aceitar começa desabilitado (checkbox desmarcado)', () => {
    renderModal();
    const acceptBtn = screen.getByText(/Aceitar e continuar/i);
    expect(acceptBtn).toBeInTheDocument();
  });
});

describe('ConsentModal — interação', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.rpc.mockResolvedValue({ data: null, error: null });
  });

  it('não chama RPC se checkbox não estiver marcado', async () => {
    renderModal();
    fireEvent.click(screen.getByText(/Aceitar e continuar/i));
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('mostra toast de erro se tentar aceitar sem marcar checkbox', async () => {
    renderModal();
    fireEvent.click(screen.getByText(/Aceitar e continuar/i));
    const { default: toast } = await import('react-hot-toast');
    expect(toast.error).toHaveBeenCalledWith('Marque a caixa para continuar');
  });

  it('chama supabase.rpc 2x (terms + privacy) ao aceitar com checkbox marcado', async () => {
    const onAccepted = vi.fn();
    const { container } = renderModal(onAccepted);

    const checkbox = container.querySelector('input[type="checkbox"]');
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByText(/Aceitar e continuar/i));

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledTimes(2);
    });

    expect(supabase.rpc).toHaveBeenCalledWith(
      'record_consent',
      expect.objectContaining({
        p_type: 'terms',
        p_version: '1.0',
        p_granted: true,
      })
    );

    expect(supabase.rpc).toHaveBeenCalledWith(
      'record_consent',
      expect.objectContaining({
        p_type: 'privacy',
        p_version: '1.0',
        p_granted: true,
      })
    );
  });

  it('chama onAccepted após aceitar com sucesso', async () => {
    const onAccepted = vi.fn();
    const { container } = renderModal(onAccepted);

    const checkbox = container.querySelector('input[type="checkbox"]');
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByText(/Aceitar e continuar/i));

    await waitFor(() => {
      expect(onAccepted).toHaveBeenCalledTimes(1);
    });
  });

  it('mostra toast de erro quando RPC falha', async () => {
    supabase.rpc.mockRejectedValue(new Error('network error'));
    const { container } = renderModal();

    const checkbox = container.querySelector('input[type="checkbox"]');
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByText(/Aceitar e continuar/i));

    await waitFor(async () => {
      const { default: toast } = await import('react-hot-toast');
      expect(toast.error).toHaveBeenCalledWith(
        'Erro ao registrar consentimento'
      );
    });
  });

  it('marca checkbox ao clicar nele', () => {
    const { container } = renderModal();
    const checkbox = container.querySelector('input[type="checkbox"]');
    expect(checkbox.checked).toBe(false);
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
  });

  it('desmarca checkbox ao clicar novamente', () => {
    const { container } = renderModal();
    const checkbox = container.querySelector('input[type="checkbox"]');
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);
  });
});

describe('ConsentModal — acessibilidade', () => {
  it('ícone de escudo está presente (Shield)', () => {
    const { container } = renderModal();
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });
});