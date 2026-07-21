// src/__tests__/helpers.jsx
// Utilitários compartilhados entre todos os testes

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

// ─── Render com Router (necessário para componentes que usam Link/useNavigate) ─
export const renderWithRouter = (ui, { initialEntries = ['/home'] } = {}) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      {ui}
    </MemoryRouter>
  );
};

// ─── Factories de dados de teste ──────────────────────────────────────────────

export const makeUser = (overrides = {}) => ({
  id:    'user-test-123',
  email: 'test@draftplay.com',
  created_at: new Date().toISOString(),
  ...overrides,
});

export const makeProfile = (overrides = {}) => ({
  id:              'user-test-123',
  name:            'Jogador Teste',
  avatar_url:      null,
  baba_id:         'baba-test-456',
  is_president:    false,
  is_coordinator:  false,
  games_played:    0,
  goals:           0,
  assists:         0,
  wins:            0,
  losses:          0,
  draws:           0,
  rating:          5.0,
  plan:            'free',
  consent_at:      new Date().toISOString(),
  ...overrides,
});

export const makeBaba = (overrides = {}) => ({
  id:          'baba-test-456',
  name:        'Baba do Zé',
  invite_code: 'ABC123',
  president_id: 'user-test-123',
  mode:        'basic',
  created_at:  new Date().toISOString(),
  ...overrides,
});

export const makeMatch = (overrides = {}) => ({
  id:         'match-test-789',
  baba_id:    'baba-test-456',
  date:       new Date().toISOString().split('T')[0],
  status:     'pending',
  team_a:     [],
  team_b:     [],
  score_a:    0,
  score_b:    0,
  created_at: new Date().toISOString(),
  ...overrides,
});

// ─── Mock do AuthContext ───────────────────────────────────────────────────────
export const mockAuthContext = (overrides = {}) => ({
  user:       null,
  profile:    null,
  loading:    false,
  signIn:     vi.fn(),
  signOut:    vi.fn(),
  updateProfile: vi.fn(),
  ...overrides,
});

// ─── Mock do BabaContext ──────────────────────────────────────────────────────
export const mockBabaContext = (overrides = {}) => ({
  baba:          null,
  members:       [],
  nextMatch:     null,
  loading:       false,
  refreshBaba:   vi.fn(),
  refreshMatch:  vi.fn(),
  ...overrides,
});

// ─── Simular eventos offline/online ──────────────────────────────────────────
export const goOffline = () => {
  Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
  window.dispatchEvent(new Event('offline'));
};

export const goOnline = () => {
  Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
  window.dispatchEvent(new Event('online'));
};

// ─── Esperar por estado assíncrono ────────────────────────────────────────────
export const waitForMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
