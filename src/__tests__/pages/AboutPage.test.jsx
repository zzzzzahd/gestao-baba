// src/__tests__/pages/AboutPage.test.jsx
// Página institucional pública — Sobre o Draft Play.

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── React Router ──────────────────────────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

import AboutPage from '../../pages/AboutPage';

const wrap = () => render(<MemoryRouter><AboutPage /></MemoryRouter>);

beforeEach(() => vi.clearAllMocks());

// ─── Estrutura básica ─────────────────────────────────────────────────────────
describe('AboutPage › estrutura', () => {
  it('renderiza sem erros', () => {
    expect(() => wrap()).not.toThrow();
  });

  it('exibe título "Sobre o Draft Play"', () => {
    wrap();
    expect(screen.getByText('Sobre o Draft Play')).toBeInTheDocument();
  });

  it('botão de voltar navega para a página anterior', () => {
    wrap();
    const backBtn = screen.getAllByRole('button')[0];
    fireEvent.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});

// ─── Seções de conteúdo ───────────────────────────────────────────────────────
describe('AboutPage › seções', () => {
  it('exibe seção "O que é o Draft Play"', () => {
    wrap();
    expect(screen.getByText('O que é o Draft Play')).toBeInTheDocument();
    expect(screen.getByText(/plataforma de gestão de peladas e babas de futebol/i)).toBeInTheDocument();
  });

  it('exibe seção "Pra quem é"', () => {
    wrap();
    expect(screen.getByText('Pra quem é')).toBeInTheDocument();
  });

  it('exibe seção "Modo Visitante" com link para /visitor', () => {
    wrap();
    const link = screen.getByRole('link', { name: /Modo Visitante/i });
    expect(link).toHaveAttribute('href', '/visitor');
  });

  it('exibe seção "Contato" com link de e-mail', () => {
    wrap();
    expect(screen.getByText('Contato')).toBeInTheDocument();
    const emailLink = screen.getByRole('link', { name: /contato@draftplay\.app/i });
    expect(emailLink).toHaveAttribute('href', 'mailto:contato@draftplay.app');
  });
});

// ─── Independência de contexto ────────────────────────────────────────────────
describe('AboutPage › independência de contexto', () => {
  it('renderiza sem AuthContext ou BabaContext (página pública)', () => {
    expect(() =>
      render(<MemoryRouter><AboutPage /></MemoryRouter>)
    ).not.toThrow();
  });
});
