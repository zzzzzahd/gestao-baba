// src/__tests__/components/ConfirmModal.test.jsx
// Sprint T-5 — Componente: ConfirmModal
// Substituto de window.confirm() com suporte a variante danger.

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmModal from '../../components/ConfirmModal';

const base = {
  open: true,
  message: 'Tem certeza?',
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

const mk = (props = {}) => render(<ConfirmModal {...base} {...props} />);

// ─── Visibilidade ─────────────────────────────────────────────────────────────
describe('ConfirmModal › visibilidade', () => {
  it('não monta quando open=false', () => {
    const { container } = mk({ open: false });
    expect(container.firstChild).toBeNull();
  });

  it('monta quando open=true', () => {
    mk();
    expect(screen.getByText('Tem certeza?')).toBeInTheDocument();
  });

  it('desmonta ao trocar open true→false', () => {
    const { rerender } = mk({ open: true });
    rerender(<ConfirmModal {...base} open={false} />);
    expect(screen.queryByText('Tem certeza?')).toBeNull();
  });

  it('monta ao trocar open false→true', () => {
    const { rerender } = mk({ open: false });
    rerender(<ConfirmModal {...base} open={true} />);
    expect(screen.getByText('Tem certeza?')).toBeInTheDocument();
  });
});

// ─── Conteúdo ─────────────────────────────────────────────────────────────────
describe('ConfirmModal › conteúdo', () => {
  it('exibe a message', () => {
    mk({ message: 'Excluir o baba?' });
    expect(screen.getByText('Excluir o baba?')).toBeInTheDocument();
  });

  it('exibe description quando fornecida', () => {
    mk({ description: 'Esta ação é permanente.' });
    expect(screen.getByText('Esta ação é permanente.')).toBeInTheDocument();
  });

  it('não exibe description quando ausente', () => {
    mk({ description: undefined });
    expect(screen.queryByText(/permanente/i)).toBeNull();
  });

  it('usa labels padrão "Confirmar" e "Cancelar"', () => {
    mk();
    expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
  });

  it('usa confirmLabel e cancelLabel customizados', () => {
    mk({ confirmLabel: 'Excluir', cancelLabel: 'Voltar' });
    expect(screen.getByRole('button', { name: /excluir/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /voltar/i })).toBeInTheDocument();
  });

  it('SVG do ícone AlertTriangle está no DOM', () => {
    const { container } = mk();
    expect(container.querySelector('svg')).not.toBeNull();
  });
});

// ─── Variante danger ──────────────────────────────────────────────────────────
describe('ConfirmModal › variante danger', () => {
  it('ícone container usa bg-red quando danger=true', () => {
    const { container } = mk({ danger: true });
    expect(container.querySelector('.bg-red-500\\/10')).not.toBeNull();
  });

  it('ícone container usa bg-cyan quando danger=false', () => {
    const { container } = mk({ danger: false });
    expect(container.querySelector('.bg-cyan-electric\\/10')).not.toBeNull();
  });

  it('botão confirmar tem classes red quando danger=true', () => {
    mk({ danger: true });
    expect(
      screen.getByRole('button', { name: /confirmar/i }).className
    ).toMatch(/red/);
  });

  it('botão confirmar tem inline gradient quando danger=false', () => {
    mk({ danger: false });
    expect(
      screen.getByRole('button', { name: /confirmar/i }).style.background
    ).toMatch(/linear-gradient/);
  });
});

// ─── Interações ───────────────────────────────────────────────────────────────
describe('ConfirmModal › interações', () => {
  beforeEach(() => vi.clearAllMocks());

  it('cancelar chama onCancel', () => {
    const onCancel = vi.fn();
    mk({ onCancel });
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('confirmar chama onConfirm e depois onCancel', () => {
    const onConfirm = vi.fn();
    const onCancel  = vi.fn();
    mk({ onConfirm, onCancel });
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('click no backdrop chama onCancel', () => {
    const onCancel = vi.fn();
    mk({ onCancel });
    // o backdrop é o div externo com a classe fixed
    fireEvent.click(screen.getByText('Tem certeza?').closest('.fixed'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('click no card interno não propaga para o backdrop', () => {
    const onCancel = vi.fn();
    const { container } = mk({ onCancel });
    const card = container.querySelector('.rounded-\\[2rem\\]');
    if (card) fireEvent.click(card);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('não lança erro quando onConfirm é undefined', () => {
    mk({ onConfirm: undefined });
    expect(() =>
      fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))
    ).not.toThrow();
  });

  it('não lança erro quando onCancel é undefined', () => {
    mk({ onCancel: undefined });
    expect(() =>
      fireEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    ).not.toThrow();
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────
describe('ConfirmModal › edge cases', () => {
  it('suporta message com caracteres especiais', () => {
    mk({ message: 'Remover "João & Silva"?' });
    expect(screen.getByText('Remover "João & Silva"?')).toBeInTheDocument();
  });

  it('suporta message longa sem quebrar', () => {
    const long = 'Palavra '.repeat(40).trim();
    mk({ message: long });
    expect(screen.getByText(long)).toBeInTheDocument();
  });
});
