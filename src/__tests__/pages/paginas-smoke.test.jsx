// src/__tests__/pages/paginas-smoke.test.jsx
// Smoke tests em português — páginas principais do Draft Play
// Cobertura profunda: CHECKLIST-TESTES.md

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../../components/Logo', () => ({
  default: ({ size }) => <div data-testid="logo" data-size={size}>Logo</div>,
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    profile: null,
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  }),
}));

vi.mock('../../contexts/BabaContext', () => ({
  useBaba: () => ({
    currentBaba: null,
    babas: [],
    players: [],
    loading: false,
    setCurrentBaba: vi.fn(),
  }),
}));

import LandingPage from '../../pages/LandingPage';
import LoginPage from '../../pages/LoginPage';
import PrivacyPage from '../../pages/PrivacyPage';
import TermsPage from '../../pages/TermsPage';

beforeEach(() => {
  vi.clearAllMocks();
});

const renderAt = (path, element) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={path.split('?')[0]} element={element} />
      </Routes>
    </MemoryRouter>
  );

describe('Páginas públicas › smoke', () => {
  it('Landing exibe boas-vindas e CTAs', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/bem-vindo ao draft/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar no meu baba/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /modo visitante/i })).toBeInTheDocument();
  });

  it('Login renderiza formulário', () => {
    renderAt('/login', <LoginPage />);
    const email = screen.queryByLabelText(/e-?mail/i)
      || screen.queryByPlaceholderText(/e-?mail/i)
      || document.querySelector('input[type="email"]')
      || document.querySelector('input');
    expect(email).toBeTruthy();
  });

  it('Privacidade menciona LGPD', () => {
    renderAt('/privacidade', <PrivacyPage />);
    expect(screen.getByText(/privacidade/i)).toBeInTheDocument();
    expect(screen.getByText(/lgpd/i)).toBeInTheDocument();
  });

  it('Termos menciona termos de uso', () => {
    renderAt('/termos', <TermsPage />);
    expect(screen.getByText(/termos/i)).toBeInTheDocument();
  });
});
