// src/__tests__/components/ConsentModal.test.jsx
// Sprint 10.5 — Modal de consentimento LGPD

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ConsentModal from '../../components/ConsentModal';

const { supabase, toast } = vi.hoisted(() => ({
  supabase: { rpc: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('../../services/supabase', () => ({ supabase }));
vi.mock('react-hot-toast', () => ({ default: toast }));

const mk = (props = {}) =>
  render(
    <MemoryRouter>
      <ConsentModal onAccepted={vi.fn()} {...props} />
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  supabase.rpc.mockResolvedValue({ error: null });
});

describe('ConsentModal › conteúdo', () => {
  it('exibe título e texto de consentimento LGPD', () => {
    mk();
    expect(screen.getByText('Antes de continuar')).toBeInTheDocument();
    expect(
      screen.getByText(/precisamos do seu consentimento/i)
    ).toBeInTheDocument();
  });

  it('exibe botões de Política de Privacidade e Termos', () => {
    mk();
    // agora o botão-checkbox tem aria-label próprio, então não colide
    // mais com o texto do parágrafo que também menciona "Política de Privacidade"
    expect(
      screen.getByRole('button', { name: /^Política de Privacidade$/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^Termos de Uso$/i })
    ).toBeInTheDocument();
  });

  it('exibe checkbox de consentimento desmarcado por padrão', () => {
    mk();
    const checkbox = screen.getByRole('checkbox', {
      name: /aceitar termos e política de privacidade/i,
    });
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  it('botão de aceitar fica habilitado mesmo com checkbox desmarcado', () => {
    mk();
    const acceptBtn = screen.getByRole('button', {
      name: /aceitar e continuar/i,
    });
    expect(acceptBtn).not.toBeDisabled();
  });
});

describe('ConsentModal — interação', () => {
  it('marca checkbox ao clicar nele', () => {
    mk();
    const checkbox = screen.getByRole('checkbox', {
      name: /aceitar termos e política de privacidade/i,
    });

    fireEvent.click(checkbox);

    expect(checkbox).toBeChecked();
  });

  it('desmarca checkbox ao clicar novamente', () => {
    mk();
    const checkbox = screen.getByRole('checkbox', {
      name: /aceitar termos e política de privacidade/i,
    });

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it('mostra toast de erro se tentar aceitar sem marcar checkbox', () => {
    mk();

    fireEvent.click(screen.getByRole('button', { name: /aceitar e continuar/i }));

    expect(toast.error).toHaveBeenCalledWith('Marque a caixa para continuar');
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('chama supabase.rpc 2x (terms + privacy) ao aceitar com checkbox marcado', async () => {
    mk();

    fireEvent.click(
      screen.getByRole('checkbox', { name: /aceitar termos e política de privacidade/i })
    );
    fireEvent.click(screen.getByRole('button', { name: /aceitar e continuar/i }));

    await waitFor(() => expect(supabase.rpc).toHaveBeenCalledTimes(2));

    expect(supabase.rpc).toHaveBeenNthCalledWith(
      1,
      'record_consent',
      expect.objectContaining({ p_type: 'terms', p_granted: true })
    );
    expect(supabase.rpc).toHaveBeenNthCalledWith(
      2,
      'record_consent',
      expect.objectContaining({ p_type: 'privacy', p_granted: true })
    );
  });

  it('chama onAccepted após aceitar com sucesso', async () => {
    const onAccepted = vi.fn();
    mk({ onAccepted });

    fireEvent.click(
      screen.getByRole('checkbox', { name: /aceitar termos e política de privacidade/i })
    );
    fireEvent.click(screen.getByRole('button', { name: /aceitar e continuar/i }));

    await waitFor(() => expect(onAccepted).toHaveBeenCalled());
  });

  it('mostra toast de erro quando RPC falha', async () => {
    supabase.rpc.mockRejectedValue(new Error('network error'));
    mk();

    fireEvent.click(
      screen.getByRole('checkbox', { name: /aceitar termos e política de privacidade/i })
    );
    fireEvent.click(screen.getByRole('button', { name: /aceitar e continuar/i }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Erro ao registrar consentimento')
    );
  });
});