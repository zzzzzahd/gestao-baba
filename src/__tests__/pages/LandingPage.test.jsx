// src/__tests__/pages/LandingPage.test.jsx
// Sprint T-8 — Page: LandingPage
// Página pública inicial: CTAs (organizar baba / ferramentas grátis), recursos, FAQ.

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── React Router ──────────────────────────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

import LandingPage from '../../pages/LandingPage';

const wrap = () => render(<MemoryRouter><LandingPage /></MemoryRouter>);

beforeEach(() => vi.clearAllMocks());

// ─── Estrutura básica ─────────────────────────────────────────────────────────
describe('LandingPage › estrutura', () => {
  it('renderiza sem erros', () => {
    expect(() => wrap()).not.toThrow();
  });

  it('exibe título principal no h1', () => {
    wrap();
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toMatch(/Gerencie seu baba/i);
    expect(h1.textContent).toMatch(/do sorteio ao caixa/i);
  });

  it('exibe texto de apresentação do app de gestão', () => {
    wrap();
    expect(screen.getByText(/Presença, sorteio de times balanceados/i)).toBeInTheDocument();
  });

  it('exibe rodapé "Draft Play Baba Manager"', () => {
    wrap();
    const rodape = screen.getAllByText(/Draft Play Baba Manager/i);
    expect(rodape.length).toBeGreaterThan(0);
  });

  it('exibe link "Sobre" apontando para /sobre', () => {
    wrap();
    const links = screen.getAllByRole('link', { name: /^Sobre$/i });
    expect(links.length).toBeGreaterThan(0);
    links.forEach((l) => expect(l).toHaveAttribute('href', '/sobre'));
  });

  it('menu principal tem âncoras internas e link de entrada', () => {
    wrap();
    const nav = screen.getByRole('navigation', { name: /Menu principal/i });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Entrar$/i })).toHaveAttribute('href', '/login');
  });
});

// ─── Botões de ação (par de CTAs aparece no topo e no fim da página) ─────────
describe('LandingPage › botões', () => {
  it('botão "Organizar meu baba" está presente nos dois pares de CTAs', () => {
    wrap();
    expect(screen.getAllByRole('button', { name: /Organizar meu baba/i })).toHaveLength(2);
  });

  it('botão "Ferramentas grátis" está presente nos dois pares de CTAs', () => {
    wrap();
    expect(screen.getAllByRole('button', { name: /Ferramentas grátis/i })).toHaveLength(2);
  });

  it('"Organizar meu baba" navega para /login', () => {
    wrap();
    fireEvent.click(screen.getAllByRole('button', { name: /Organizar meu baba/i })[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('"Ferramentas grátis" navega para /ferramentas', () => {
    wrap();
    fireEvent.click(screen.getAllByRole('button', { name: /Ferramentas grátis/i })[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/ferramentas');
  });
});

// ─── Recursos listados ────────────────────────────────────────────────────────
describe('LandingPage › recursos', () => {
  const recursos = [
    'Presença em tempo real',
    'Sorteio balanceado',
    'Placar e fila ao vivo',
    'Ranking de gols e assistências',
    'Divisões e conquistas',
    'Perfil público',
    'Caixa do baba',
    'Resumo do dia',
    'Histórico do grupo',
  ];

  // Alguns títulos (ex.: "Perfil público") também aparecem em outras seções,
  // então a busca é restrita à seção "Tudo que o baba precisa" (#recursos).
  const secaoRecursos = () => {
    const alvo = document.getElementById('recursos');
    expect(alvo).not.toBeNull();
    return within(alvo.closest('section'));
  };

  it.each(recursos)('exibe o recurso "%s"', (titulo) => {
    wrap();
    expect(secaoRecursos().getByText(titulo)).toBeInTheDocument();
  });

  it('lista 9 recursos no total', () => {
    wrap();
    const secao = secaoRecursos();
    recursos.forEach((r) => expect(secao.getByText(r)).toBeInTheDocument());
    expect(recursos).toHaveLength(9);
  });
});

// ─── Seções de conteúdo ───────────────────────────────────────────────────────
describe('LandingPage › seções', () => {
  it('exibe "Como funciona" e "Perguntas frequentes"', () => {
    wrap();
    expect(screen.getByText('Como funciona', { selector: 'h2, h2 *' })).toBeInTheDocument();
    expect(screen.getByText('Perguntas frequentes')).toBeInTheDocument();
  });
});

// ─── Estilo dos botões ────────────────────────────────────────────────────────
describe('LandingPage › estilos', () => {
  it('botão principal tem gradient cyan', () => {
    wrap();
    const btn = screen.getAllByRole('button', { name: /Organizar meu baba/i })[0];
    expect(btn.style.background).toContain('linear-gradient');
    expect(btn.style.background).toContain('#00f2ff');
  });

  it('botão secundário tem borda ciano (estilo secundário)', () => {
    wrap();
    const btn = screen.getAllByRole('button', { name: /Ferramentas grátis/i })[0];
    expect(btn.className).toMatch(/border-cyan-electric/);
  });
});

// ─── Acessibilidade ───────────────────────────────────────────────────────────
describe('LandingPage › acessibilidade', () => {
  it('há exatamente um h1', () => {
    wrap();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('todos os botões são do tipo button', () => {
    wrap();
    screen.getAllByRole('button').forEach((b) => expect(b.tagName).toBe('BUTTON'));
  });

  it('página ocupa min-h-screen', () => {
    const { container } = wrap();
    expect(container.firstChild).not.toBeNull();
    expect(container.firstChild.className).toMatch(/min-h-screen/);
  });
});

// ─── Não requer autenticação ──────────────────────────────────────────────────
describe('LandingPage › independência de contexto', () => {
  it('renderiza sem AuthContext ou BabaContext', () => {
    expect(() =>
      render(<MemoryRouter><LandingPage /></MemoryRouter>)
    ).not.toThrow();
  });
});
