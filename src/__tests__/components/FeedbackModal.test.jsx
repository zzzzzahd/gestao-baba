// src/__tests__/components/FeedbackModal.test.jsx

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock AuthContext
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-1', email: 'test@baba.com' } })),
}));

// Mock Supabase
vi.mock('../../services/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), {
    success: vi.fn(),
    error:   vi.fn(),
  }),
}));

import FeedbackModal from '../../components/FeedbackModal';
import { useAuth }   from '../../contexts/AuthContext';
import { supabase }  from '../../services/supabase';
import toast         from 'react-hot-toast';

const makeChain = (result = { error: null }) => ({
  insert: vi.fn().mockResolvedValue(result),
});

const renderModal = (isOpen = true, onClose = vi.fn()) =>
  render(<FeedbackModal isOpen={isOpen} onClose={onClose} />);

describe('FeedbackModal — visibilidade', () => {
  it('não renderiza quando isOpen=false', () => {
    const { container } = renderModal(false);
    expect(container.firstChild).toBeNull();
  });

  it('renderiza quando isOpen=true', () => {
    renderModal(true);
    expect(screen.getByText('Feedback')).toBeInTheDocument();
  });
});

describe('FeedbackModal — tipos', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renderiza 3 botões de tipo: Bug, Sugestão, Outro', () => {
    renderModal();
    expect(screen.getByText('Bug')).toBeInTheDocument();
    expect(screen.getByText('Sugestão')).toBeInTheDocument();
    expect(screen.getByText('Outro')).toBeInTheDocument();
  });

  it('Bug está ativo por padrão (aria-pressed=true)', () => {
    renderModal();
    const bugBtn = screen.getByText('Bug').closest('button');
    expect(bugBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('clicar em Sugestão muda o tipo ativo', () => {
    renderModal();
    fireEvent.click(screen.getByText('Sugestão'));
    const sugBtn = screen.getByText('Sugestão').closest('button');
    expect(sugBtn).toHaveAttribute('aria-pressed', 'true');
    const bugBtn = screen.getByText('Bug').closest('button');
    expect(bugBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('clicar em Outro muda o tipo ativo', () => {
    renderModal();
    fireEvent.click(screen.getByText('Outro'));
    const outroBtn = screen.getByText('Outro').closest('button');
    expect(outroBtn).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('FeedbackModal — textarea', () => {
  it('placeholder muda conforme tipo selecionado (bug)', () => {
    renderModal();
    const ta = screen.getByLabelText('Descrição do feedback');
    expect(ta.placeholder).toContain('bug');
  });

  it('placeholder muda ao selecionar Sugestão', () => {
    renderModal();
    fireEvent.click(screen.getByText('Sugestão'));
    const ta = screen.getByLabelText('Descrição do feedback');
    expect(ta.placeholder).toContain('sugestão');
  });

  it('aceita input de texto', () => {
    renderModal();
    const ta = screen.getByLabelText('Descrição do feedback');
    fireEvent.change(ta, { target: { value: 'Teste de feedback' } });
    expect(ta.value).toBe('Teste de feedback');
  });

  it('maxLength é 1000', () => {
    renderModal();
    const ta = screen.getByLabelText('Descrição do feedback');
    expect(ta).toHaveAttribute('maxLength', '1000');
  });
});

describe('FeedbackModal — campo email', () => {
  it('não exibe campo email quando usuário está logado', () => {
    useAuth.mockReturnValue({ user: { id: 'u-1', email: 'test@test.com' } });
    renderModal();
    expect(screen.queryByLabelText('Email de contato')).toBeNull();
  });

  it('exibe campo email quando usuário não está logado', () => {
    useAuth.mockReturnValue({ user: null });
    renderModal();
    expect(screen.getByLabelText('Email de contato')).toBeInTheDocument();
  });
});

describe('FeedbackModal — submit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 'user-1', email: 'test@baba.com' } });
    supabase.from.mockReturnValue(makeChain());
  });

  it('bloqueia envio quando textarea está vazio — toast.error', async () => {
    renderModal();
    fireEvent.click(screen.getByText('Enviar feedback'));
    expect(toast.error).toHaveBeenCalledWith('Descreva o problema ou sugestão');
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('botão enviar está desabilitado quando texto está vazio', () => {
    renderModal();
    const btn = screen.getByText('Enviar feedback').closest('button');
    expect(btn).toBeDisabled();
  });

  it('botão enviar fica habilitado após digitar texto', () => {
    renderModal();
    fireEvent.change(screen.getByLabelText('Descrição do feedback'), {
      target: { value: 'Um bug encontrado' },
    });
    const btn = screen.getByText('Enviar feedback').closest('button');
    expect(btn).not.toBeDisabled();
  });

  it('chama supabase.from("feedback").insert com payload correto', async () => {
    const onClose = vi.fn();
    renderModal(true, onClose);

    fireEvent.change(screen.getByLabelText('Descrição do feedback'), {
      target: { value: 'O botão não funciona' },
    });
    fireEvent.click(screen.getByText('Enviar feedback'));

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('feedback');
    });

    const insertCall = supabase.from.mock.results[0].value.insert.mock.calls[0][0];
    expect(insertCall.type).toBe('bug');
    expect(insertCall.text).toBe('O botão não funciona');
    expect(insertCall.user_id).toBe('user-1');
    expect(insertCall.url).toBeTruthy();
    expect(insertCall.user_agent).toBeTruthy();
  });

  it('chama toast.success e onClose após envio bem-sucedido', async () => {
    const onClose = vi.fn();
    renderModal(true, onClose);

    fireEvent.change(screen.getByLabelText('Descrição do feedback'), {
      target: { value: 'Feedback de teste' },
    });
    fireEvent.click(screen.getByText('Enviar feedback'));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Obrigado pelo feedback 🙏');
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('limpa o texto após envio bem-sucedido', async () => {
    renderModal();
    const ta = screen.getByLabelText('Descrição do feedback');
    fireEvent.change(ta, { target: { value: 'Texto qualquer' } });
    fireEvent.click(screen.getByText('Enviar feedback'));

    await waitFor(() => {
      expect(ta.value).toBe('');
    });
  });

  it('chama toast.error quando insert lança exceção', async () => {
    supabase.from.mockReturnValue({
      insert: vi.fn().mockRejectedValue(new Error('network')),
    });
    renderModal();
    fireEvent.change(screen.getByLabelText('Descrição do feedback'), {
      target: { value: 'Texto' },
    });
    fireEvent.click(screen.getByText('Enviar feedback'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erro ao enviar feedback');
    });
  });

  it('não bloqueia o UX quando tabela feedback não existe (error ignorado)', async () => {
    const onClose = vi.fn();
    supabase.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: new Error('relation "feedback" does not exist') }),
    });
    renderModal(true, onClose);
    fireEvent.change(screen.getByLabelText('Descrição do feedback'), {
      target: { value: 'Texto' },
    });
    fireEvent.click(screen.getByText('Enviar feedback'));

    await waitFor(() => {
      // onClose deve ser chamado mesmo com erro de tabela
      expect(onClose).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalled();
    });
  });
});

describe('FeedbackModal — screenshot', () => {
  beforeEach(() => vi.clearAllMocks());

  it('chama toast.error quando html2canvas não está disponível', async () => {
    delete window.html2canvas;
    renderModal();
    fireEvent.click(screen.getByLabelText('Capturar screenshot da tela'));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('html2canvas não disponível');
    });
  });

  it('exibe preview após captura bem-sucedida', async () => {
    window.html2canvas = vi.fn().mockResolvedValue({
      toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,abc'),
    });
    renderModal();
    fireEvent.click(screen.getByLabelText('Capturar screenshot da tela'));
    await waitFor(() => {
      expect(screen.getByAltText('Preview')).toBeInTheDocument();
    });
    delete window.html2canvas;
  });

  it('botão X remove o screenshot', async () => {
    window.html2canvas = vi.fn().mockResolvedValue({
      toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,abc'),
    });
    renderModal();
    fireEvent.click(screen.getByLabelText('Capturar screenshot da tela'));
    await waitFor(() => screen.getByAltText('Preview'));
    fireEvent.click(screen.getByLabelText('Remover screenshot'));
    expect(screen.queryByAltText('Preview')).toBeNull();
    delete window.html2canvas;
  });
});

describe('FeedbackModal — acessibilidade', () => {
  it('tem role="dialog" e aria-modal="true"', () => {
    renderModal();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('tem aria-labelledby apontando para o título', () => {
    renderModal();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'feedback-title');
    expect(document.getElementById('feedback-title')).toBeInTheDocument();
  });

  it('botão fechar tem aria-label="Fechar"', () => {
    renderModal();
    expect(screen.getByLabelText('Fechar')).toBeInTheDocument();
  });

  it('botão fechar chama onClose', () => {
    const onClose = vi.fn();
    renderModal(true, onClose);
    fireEvent.click(screen.getByLabelText('Fechar'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
