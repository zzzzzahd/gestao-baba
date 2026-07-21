// src/__tests__/components/BottomNav.test.jsx

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock useLocation para controlar a rota atual
const mockUseLocation = vi.fn(() => ({ pathname: '/home', search: '', hash: '' }));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useLocation: () => mockUseLocation(),
    useNavigate: () => vi.fn(),
  };
});

vi.mock('../../utils/babaMode', () => ({
  useFeatures: vi.fn(() => ({ financial: false })),
}));

import BottomNav from '../../components/BottomNav';
import { useFeatures } from '../../utils/babaMode';

const renderNav = () =>
  render(
    <MemoryRouter>
      <BottomNav />
    </MemoryRouter>
  );

describe('BottomNav', () => {
  beforeEach(() => {
    useFeatures.mockReturnValue({ financial: false });
    mockUseLocation.mockReturnValue({ pathname: '/home', search: '', hash: '' });
  });

  describe('visibilidade', () => {
    it('não renderiza em rotas públicas (/)', () => {
      mockUseLocation.mockReturnValue({ pathname: '/', search: '', hash: '' });
      const { container } = renderNav();
      expect(container.querySelector('nav')).toBeNull();
    });

    it('não renderiza na rota /login', () => {
      mockUseLocation.mockReturnValue({ pathname: '/login', search: '', hash: '' });
      const { container } = renderNav();
      expect(container.querySelector('nav')).toBeNull();
    });

    it('não renderiza na rota /visitor', () => {
      mockUseLocation.mockReturnValue({ pathname: '/visitor', search: '', hash: '' });
      const { container } = renderNav();
      expect(container.querySelector('nav')).toBeNull();
    });

    it('renderiza na rota /home', () => {
      mockUseLocation.mockReturnValue({ pathname: '/home', search: '', hash: '' });
      const { container } = renderNav();
      expect(container.querySelector('nav')).toBeTruthy();
    });

    it('renderiza na rota /dashboard', () => {
      mockUseLocation.mockReturnValue({ pathname: '/dashboard', search: '', hash: '' });
      const { container } = renderNav();
      expect(container.querySelector('nav')).toBeTruthy();
    });
  });

  describe('itens de navegação (modo básico — sem financeiro)', () => {
    it('exibe itens: Início, Baba, Rankings, Perfil', () => {
      renderNav();
      expect(screen.getByLabelText('Ir para Início')).toBeInTheDocument();
      expect(screen.getByLabelText('Ir para Dashboard do Baba')).toBeInTheDocument();
      expect(screen.getByLabelText('Ir para Rankings')).toBeInTheDocument();
      expect(screen.getByLabelText('Ir para Perfil')).toBeInTheDocument();
    });

    it('não exibe Caixa quando financial está desabilitado', () => {
      renderNav();
      expect(screen.queryByLabelText('Ir para Financeiro')).toBeNull();
    });
  });

  describe('itens de navegação (modo full — com financeiro)', () => {
    it('exibe Caixa quando financial está habilitado', () => {
      useFeatures.mockReturnValue({ financial: true });
      renderNav();
      expect(screen.getByLabelText('Ir para Financeiro')).toBeInTheDocument();
    });
  });

  describe('acessibilidade', () => {
    it('tem role="navigation" com aria-label', () => {
      renderNav();
      const nav = screen.getByRole('navigation', { name: 'Navegação principal' });
      expect(nav).toBeInTheDocument();
    });

    it('todos os botões têm aria-label', () => {
      renderNav();
      const buttons = screen.getAllByRole('button');
      buttons.forEach((btn) => {
        expect(btn).toHaveAttribute('aria-label');
      });
    });
  });
});