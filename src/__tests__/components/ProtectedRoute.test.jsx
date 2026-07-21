// src/__tests__/components/ProtectedRoute.test.jsx
// Testes para o componente de rota protegida

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Mock do AuthContext
const mockUseAuth = vi.fn();
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

import ProtectedRoute from '../../components/ProtectedRoute';

const renderProtected = (children = <div data-testid="protected">Área protegida</div>) =>
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/login" element={<div data-testid="login">Página de Login</div>} />
        <Route
          path="/dashboard"
          element={<ProtectedRoute>{children}</ProtectedRoute>}
        />
      </Routes>
    </MemoryRouter>
  );

describe('ProtectedRoute — loading', () => {
  it('exibe loader enquanto sessão está sendo validada', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    renderProtected();
    expect(screen.getByText(/VALIDANDO ACESSO TÁTICO/i)).toBeInTheDocument();
  });

  it('não renderiza filhos durante loading', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    renderProtected();
    expect(screen.queryByTestId('protected')).toBeNull();
  });

  it('não redireciona para login durante loading', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    renderProtected();
    expect(screen.queryByTestId('login')).toBeNull();
  });
});

describe('ProtectedRoute — sem usuário', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
  });

  it('redireciona para /login quando não há sessão', () => {
    renderProtected();
    expect(screen.getByTestId('login')).toBeInTheDocument();
  });

  it('não renderiza os filhos quando não autenticado', () => {
    renderProtected();
    expect(screen.queryByTestId('protected')).toBeNull();
  });
});

describe('ProtectedRoute — com usuário', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user:    { id: 'user-1', email: 'test@test.com' },
      loading: false,
    });
  });

  it('renderiza os filhos quando autenticado', () => {
    renderProtected();
    expect(screen.getByTestId('protected')).toBeInTheDocument();
    expect(screen.getByText('Área protegida')).toBeInTheDocument();
  });

  it('não redireciona para login quando autenticado', () => {
    renderProtected();
    expect(screen.queryByTestId('login')).toBeNull();
  });

  it('não exibe o loader quando autenticado', () => {
    renderProtected();
    expect(screen.queryByText(/VALIDANDO/i)).toBeNull();
  });

  it('renderiza qualquer componente filho passado', () => {
    const Custom = () => <p data-testid="custom">Meu Dashboard</p>;
    renderProtected(<Custom />);
    expect(screen.getByTestId('custom')).toBeInTheDocument();
  });
});

describe('ProtectedRoute — acessibilidade do loader', () => {
  it('loader está dentro de um container centrado', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    const { container } = renderProtected();
    const wrapper = container.querySelector('.min-h-screen');
    expect(wrapper).toBeTruthy();
    expect(wrapper.className).toContain('flex');
    expect(wrapper.className).toContain('items-center');
    expect(wrapper.className).toContain('justify-center');
  });

  it('texto do loader tem cor cyan', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    renderProtected();
    const text = screen.getByText(/VALIDANDO ACESSO TÁTICO/i);
    expect(text.className).toContain('cyan');
  });
});
