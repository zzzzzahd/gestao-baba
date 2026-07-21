// src/__tests__/components/ChangelogModal.test.jsx

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import ChangelogModal, {
  shouldShowChangelog,
  markChangelogSeen,
} from '../../components/ChangelogModal';

const STORAGE_KEY = 'draft_play_changelog_seen_2.0.0';

describe('shouldShowChangelog', () => {
  beforeEach(() => localStorage.clear());

  it('retorna true quando nunca foi visto', () => {
    expect(shouldShowChangelog()).toBe(true);
  });

  it('retorna false após markChangelogSeen', () => {
    markChangelogSeen();
    expect(shouldShowChangelog()).toBe(false);
  });

  it('retorna false quando key já existe no localStorage', () => {
    localStorage.setItem(STORAGE_KEY, '1');
    expect(shouldShowChangelog()).toBe(false);
  });

  it('retorna false (não lança) quando localStorage lança erro', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
      throw new Error('quota');
    });
    expect(shouldShowChangelog()).toBe(false);
  });
});

describe('markChangelogSeen', () => {
  beforeEach(() => localStorage.clear());

  it('persiste a key no localStorage', () => {
    markChangelogSeen();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('1');
  });

  it('não lança quando localStorage está indisponível', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('quota exceeded');
    });
    expect(() => markChangelogSeen()).not.toThrow();
  });

  it('é idempotente — chamar duas vezes não causa erro', () => {
    expect(() => {
      markChangelogSeen();
      markChangelogSeen();
    }).not.toThrow();

    expect(localStorage.getItem(STORAGE_KEY)).toBe('1');
  });
});

describe('ChangelogModal — visibilidade', () => {
  it('não renderiza quando isOpen=false', () => {
    const { container } = render(
      <ChangelogModal isOpen={false} onClose={vi.fn()} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renderiza quando isOpen=true', () => {
    render(<ChangelogModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Novidades')).toBeInTheDocument();
  });
});

describe('ChangelogModal — conteúdo', () => {
  beforeEach(() => localStorage.clear());

  const renderModal = () =>
    render(<ChangelogModal isOpen={true} onClose={vi.fn()} />);

  it('exibe versão 2.0.0', () => {
    renderModal();
    expect(screen.getByText(/v2\.0\.0/i)).toBeInTheDocument();
  });

  it('exibe data Jun 2026', () => {
    renderModal();
    expect(screen.getByText(/Jun 2026/i)).toBeInTheDocument();
  });

  it('exibe pelo menos 9 items do tipo "Novo"', () => {
    renderModal();
    const novoBadges = screen.getAllByText('Novo');
    expect(novoBadges.length).toBeGreaterThanOrEqual(9);
  });

  it('exibe pelo menos 1 item do tipo "Correção"', () => {
    renderModal();
    const fixBadges = screen.getAllByText('Correção');
    expect(fixBadges.length).toBeGreaterThanOrEqual(1);
  });

  // ✅ CORRIGIDO
  it('exibe item sobre modo do baba', () => {
    renderModal();

    expect(
      screen.getByText(
        /Modo do baba: Casual, Competitivo ou Completo/i
      )
    ).toBeInTheDocument();
  });

  it('exibe item sobre MVP', () => {
    renderModal();
    expect(screen.getByText(/MVP/i)).toBeInTheDocument();
  });

  it('exibe item sobre IA / Gemini', () => {
    renderModal();
    expect(screen.getByText(/Gemini/i)).toBeInTheDocument();
  });

  it('exibe item sobre sistema de divisões', () => {
    renderModal();
    expect(screen.getByText(/Ferro/i)).toBeInTheDocument();
  });

  it('exibe botão "Entendido, vamos jogar"', () => {
    renderModal();
    expect(
      screen.getByText(/Entendido, vamos jogar/i)
    ).toBeInTheDocument();
  });
});

describe('ChangelogModal — interação', () => {
  beforeEach(() => localStorage.clear());

  it('clicar em Fechar (X) chama onClose', () => {
    const onClose = vi.fn();

    render(<ChangelogModal isOpen={true} onClose={onClose} />);

    fireEvent.click(screen.getByLabelText('Fechar'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clicar em Fechar (X) marca como visto', () => {
    render(<ChangelogModal isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('Fechar'));

    expect(localStorage.getItem(STORAGE_KEY)).toBe('1');
  });

  it('clicar em "Entendido, vamos jogar" chama onClose', () => {
    const onClose = vi.fn();

    render(<ChangelogModal isOpen={true} onClose={onClose} />);

    fireEvent.click(screen.getByText(/Entendido, vamos jogar/i));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clicar em "Entendido, vamos jogar" marca como visto', () => {
    render(<ChangelogModal isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByText(/Entendido, vamos jogar/i));

    expect(localStorage.getItem(STORAGE_KEY)).toBe('1');
  });

  it('onClose é opcional (não crasha sem ela)', () => {
    render(<ChangelogModal isOpen={true} />);

    expect(() => {
      fireEvent.click(screen.getByText(/Entendido, vamos jogar/i));
    }).not.toThrow();
  });
});

describe('ChangelogModal — acessibilidade', () => {
  it('tem role="dialog"', () => {
    render(<ChangelogModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('tem aria-modal="true"', () => {
    render(<ChangelogModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog')).toHaveAttribute(
      'aria-modal',
      'true'
    );
  });

  it('tem aria-labelledby apontando para "changelog-title"', () => {
    render(<ChangelogModal isOpen={true} onClose={vi.fn()} />);

    const dialog = screen.getByRole('dialog');

    expect(dialog).toHaveAttribute(
      'aria-labelledby',
      'changelog-title'
    );

    expect(
      document.getElementById('changelog-title')
    ).toBeInTheDocument();
  });

  it('botão fechar tem aria-label="Fechar"', () => {
    render(<ChangelogModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByLabelText('Fechar')).toBeInTheDocument();
  });
});