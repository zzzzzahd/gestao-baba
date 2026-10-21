// src/__tests__/contexts/AuthProviderBoot.test.jsx
// O AuthProvider não pode apagar o HTML pré-renderizado do visitante anônimo
// (createRoot) esperando um getSession que sempre voltaria "sem usuário".
// Mas com sessão salva, ou voltando de um link de auth, continua esperando.

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { supabase } from '../../services/supabase';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';

const Probe = () => {
  const { user, profile, loading } = useAuth();
  return (
    <div
      data-testid="child"
      data-user={String(user)}
      data-profile={String(profile)}
      data-loading={String(loading)}
    />
  );
};

const renderProvider = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );

describe('AuthProvider — boot sem esperar o Supabase', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, '', '/');
    // getSession que nunca resolve: prova que o render não depende dele
    supabase.auth.getSession.mockReturnValue(new Promise(() => {}));
  });

  afterEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('visitante anônimo: renderiza os filhos na hora, já resolvido (user=null, profile=null)', () => {
    renderProvider();
    const child = screen.getByTestId('child');
    expect(child.dataset.loading).toBe('false');
    expect(child.dataset.user).toBe('null');
    expect(child.dataset.profile).toBe('null');
  });

  it('com sessão salva no localStorage: continua esperando o getSession', () => {
    window.localStorage.setItem('sb-abcdefgh-auth-token', '{"access_token":"x"}');
    renderProvider();
    expect(screen.queryByTestId('child')).toBeNull();
  });

  it('retorno de link de recuperação de senha (#access_token): continua esperando', () => {
    window.history.pushState({}, '', '/redefinir-senha#access_token=abc&type=recovery');
    renderProvider();
    expect(screen.queryByTestId('child')).toBeNull();
  });

  it('retorno PKCE (?code=): continua esperando', () => {
    window.history.pushState({}, '', '/?code=abc123');
    renderProvider();
    expect(screen.queryByTestId('child')).toBeNull();
  });
});
