// src/__tests__/pages/LandingPage.test.jsx
// Sprint T-8 — Page: LandingPage
// Página pública inicial: botões de login/visitante, logo, recursos.

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

// ── Componentes auxiliares ────────────────────────────────────────────────────
vi.mock('../../components/Logo', () => ({
  default: ({ size }) => <div data-testid="logo" data-size={size}>Logo</div>,
}));

import LandingPage from '../../pages/LandingPage';

const wrap = () => render(<MemoryRouter><LandingPage /></MemoryRouter>);

beforeEach(() => vi.clearAllMocks());

// ─── Estrutura básica ─────────────────────────────────────────────────────────
describe('LandingPage › estrutura', () => {
  it('renderiza sem erros', () => {
    expect(() => wrap()).not.toThrow();
  });

  it('exibe Logo com size="large"', () => {
    wrap();
    const logo = screen.getByTestId('logo');
    expect(logo.getAttribute('data-size')).toBe('large');
  });

  it('exibe título "Bem-vindo ao DRAFT"', () => {
    wrap();
    expect(screen.getByText(/Bem-vindo ao DRAFT/i)).toBeInTheDocument();
  });

  it('exibe subtítulo sobre plataforma de gestão', () => {
    wrap();
    expect(screen.getByText(/Plataforma de gestão/i)).toBeInTheDocument();
  });

  it('exibe rodapé "Powered by Draft Baba"', () => {
    wrap();
    expect(screen.getByText(/Powered by Draft Baba/i)).toBeInTheDocument();
  });
});

// ─── Botões de ação ───────────────────────────────────────────────────────────
describe('LandingPage › botões', () => {
  it('botão "Entrar no Meu Baba" está presente', () => {
    wrap();
    expect(
      screen.getByRole('button', { name: /Entrar no Meu Baba/i })
    ).toBeInTheDocument();
  });

  it('botão "Modo Visitante (Sem Conta)" está presente', () => {
    wrap();
    expect(
      screen.getByRole('button', { name: /Modo Visitante/i })
    ).toBeInTheDocument();
  });

  it('"Entrar no Meu Baba" navega para /login', () => {
    wrap();
    fireEvent.click(screen.getByRole('button', { name: /Entrar no Meu Baba/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('"Modo Visitante" navega para /visitor', () => {
    wrap();
    fireEvent.click(screen.getByRole('button', { name: /Modo Visitante/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/visitor');
  });
});

// ─── Recursos listados ────────────────────────────────────────────────────────
describe('LandingPage › recursos', () => {
  it('exibe "Sorteio de Times"', () => {
    wrap();
    expect(screen.getByText('Sorteio de Times')).toBeInTheDocument();
  });

  it('exibe "Placar ao Vivo"', () => {
    wrap();
    expect(screen.getByText('Placar ao Vivo')).toBeInTheDocument();
  });

  it('exibe "Rankings"', () => {
    wrap();
    expect(screen.getByText('Rankings')).toBeInTheDocument();
  });

  it('exibe "Gestão Financeira"', () => {
    wrap();
    expect(screen.getByText('Gestão Financeira')).toBeInTheDocument();
  });

  it('4 recursos listados no total', () => {
    wrap();
    const recursos = ['Sorteio de Times', 'Placar ao Vivo', 'Rankings', 'Gestão Financeira'];
    recursos.forEach(r => expect(screen.getByText(r)).toBeInTheDocument());
  });
});

// ─── Separador visual ─────────────────────────────────────────────────────────
describe('LandingPage › separador', () => {
  it('exibe divisor "ou"', () => {
    wrap();
    expect(screen.getByText('ou')).toBeInTheDocument();
  });
});

// ─── Estilo dos botões ────────────────────────────────────────────────────────
describe('LandingPage › estilos', () => {
  it('botão principal tem gradient cyan', () => {
    wrap();
    const btn = screen.getByRole('button', { name: /Entrar no Meu Baba/i });
    expect(btn.style.background).toContain('linear-gradient');
    expect(btn.style.background).toContain('#00f2ff');
  });

  it('botão visitante tem estilo secundário (bg-surface-2)', () => {
    wrap();
    const btn = screen.getByRole('button', { name: /Modo Visitante/i });
    expect(btn.className).toMatch(/bg-surface-2/);
  });
});

// ─── Acessibilidade ───────────────────────────────────────────────────────────
describe('LandingPage › acessibilidade', () => {
  it('h1 contém o título principal', () => {
    wrap();
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toBeInTheDocument();
    expect(h1.textContent).toContain('DRAFT');
  });

  it('ambos os botões são do tipo button', () => {
    wrap();
    const btns = screen.getAllByRole('button');
    btns.forEach(b => expect(b.tagName).toBe('BUTTON'));
  });

  it('página ocupa min-h-screen', () => {
    const { container } = wrap();
    expect(container.firstChild).not.toBeNull();
    expect(
      (container.firstChild).className
    ).toMatch(/min-h-screen/);
  });
});

// ─── Não requer autenticação ──────────────────────────────────────────────────
describe('LandingPage › independência de contexto', () => {
  it('renderiza sem AuthContext ou BabaContext', () => {
    // Sem providers — deve funcionar pois LandingPage não usa contextos
    expect(() =>
      render(<MemoryRouter><LandingPage /></MemoryRouter>)
    ).not.toThrow();
  });

  it('sem JavaScript: botões têm role correto para links futuros', () => {
    wrap();
    const [btn1, btn2] = screen.getAllByRole('button');
    expect(btn1).toBeTruthy();
    expect(btn2).toBeTruthy();
  });
});
