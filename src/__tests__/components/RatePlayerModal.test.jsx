// src/__tests__/components/RatePlayerModal.test.jsx
// Sprint T-5 — Componente: RatePlayerModal
// Modal de avaliação técnica (skill, physical, commitment) com sliders 1–5.

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RatePlayerModal from '../../components/RatePlayerModal';

const mockPlayer = {
  id: 'p1',
  display_name: 'João Silva',
  avatar_url: null,
};

const mkModal = (props = {}) =>
  render(
    <RatePlayerModal
      player={mockPlayer}
      onClose={vi.fn()}
      onRate={vi.fn().mockResolvedValue(undefined)}
      {...props}
    />
  );

// ─── Estrutura ────────────────────────────────────────────────────────────────
describe('RatePlayerModal › estrutura', () => {
  it('exibe nome do jogador', () => {
    mkModal();
    expect(screen.getByText('João Silva')).toBeInTheDocument();
  });

  it('exibe inicial do avatar quando não tem avatar_url', () => {
    mkModal();
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('renderiza img quando avatar_url fornecido', () => {
    mkModal({ player: { ...mockPlayer, avatar_url: 'https://img.test/a.jpg' } });
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('exibe label "Avaliação Técnica"', () => {
    mkModal();
    expect(screen.getByText('Avaliação Técnica')).toBeInTheDocument();
  });

  it('exibe os 3 sliders de categoria', () => {
    mkModal();
    const sliders = screen.getAllByRole('slider');
    expect(sliders).toHaveLength(3);
  });

  it('sliders iniciam em valor 3', () => {
    mkModal();
    const sliders = screen.getAllByRole('slider');
    sliders.forEach(s => expect(s.value).toBe('3'));
  });

  it('exibe botão Confirmar e Cancelar', () => {
    mkModal();
    expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
  });
});

// ─── Categorias ───────────────────────────────────────────────────────────────
describe('RatePlayerModal › categorias', () => {
  it('exibe categoria Habilidade', () => {
    mkModal();
    expect(screen.getByText(/Habilidade/i)).toBeInTheDocument();
  });

  it('exibe categoria Físico', () => {
    mkModal();
    expect(screen.getByText(/Físico/i)).toBeInTheDocument();
  });

  it('exibe categoria Compromisso', () => {
    mkModal();
    expect(screen.getByText(/Compromisso/i)).toBeInTheDocument();
  });

  it('exibe labels "Fraco" e "Elite" nos extremos', () => {
    mkModal();
    expect(screen.getAllByText('Fraco').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Elite').length).toBeGreaterThan(0);
  });
});

// ─── Interação com sliders ────────────────────────────────────────────────────
describe('RatePlayerModal › sliders', () => {
  it('atualiza valor ao mover slider', () => {
    mkModal();
    const sliders = screen.getAllByRole('slider');
    fireEvent.change(sliders[0], { target: { value: '5' } });
    expect(sliders[0].value).toBe('5');
  });

  it('valor do slider reflete no display numérico', () => {
    mkModal();
    const sliders = screen.getAllByRole('slider');
    fireEvent.change(sliders[0], { target: { value: '5' } });
    // os displays numéricos (1 por slider) devem incluir o 5
    const displays = screen.getAllByText('5');
    expect(displays.length).toBeGreaterThan(0);
  });

  it('sliders respeitam min=1 max=5', () => {
    mkModal();
    const sliders = screen.getAllByRole('slider');
    sliders.forEach(s => {
      expect(s.min).toBe('1');
      expect(s.max).toBe('5');
    });
  });
});

// ─── Interações de botão ──────────────────────────────────────────────────────
describe('RatePlayerModal › botões', () => {
  beforeEach(() => vi.clearAllMocks());

  it('cancelar chama onClose', () => {
    const onClose = vi.fn();
    mkModal({ onClose });
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('confirmar chama onRate com player.id e ratings corretos', async () => {
    const onRate  = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    mkModal({ onRate, onClose });

    // Mudar skill para 5
    const sliders = screen.getAllByRole('slider');
    fireEvent.change(sliders[0], { target: { value: '5' } });

    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    await waitFor(() => {
      expect(onRate).toHaveBeenCalledWith('p1', expect.objectContaining({ skill: 5 }));
    });
  });

  it('confirmar chama onClose após sucesso', async () => {
    const onRate  = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    mkModal({ onRate, onClose });
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('botão confirmar fica desabilitado durante envio', async () => {
    let resolve;
    const onRate = vi.fn(() => new Promise(r => { resolve = r; }));
    mkModal({ onRate });
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /enviando/i })).toBeDisabled();
    });
    resolve();
  });

  it('click no backdrop chama onClose', () => {
    const onClose = vi.fn();
    const { container } = mkModal({ onClose });
    fireEvent.click(container.querySelector('.fixed'));
    expect(onClose).toHaveBeenCalled();
  });

  it('click no card interno NÃO fecha', () => {
    const onClose = vi.fn();
    mkModal({ onClose });
    const card = screen.getByText('João Silva').closest('.rounded-\\[2\\.5rem\\]');
    if (card) fireEvent.click(card);
    expect(onClose).not.toHaveBeenCalled();
  });
});

// ─── Rating default ───────────────────────────────────────────────────────────
describe('RatePlayerModal › valores default', () => {
  it('envia { skill:3, physical:3, commitment:3 } sem alteração', async () => {
    const onRate = vi.fn().mockResolvedValue(undefined);
    mkModal({ onRate });
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));
    await waitFor(() =>
      expect(onRate).toHaveBeenCalledWith('p1', { skill: 3, physical: 3, commitment: 3 })
    );
  });
});
