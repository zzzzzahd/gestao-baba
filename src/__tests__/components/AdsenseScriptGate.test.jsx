// src/__tests__/components/AdsenseScriptGate.test.jsx
// O script do AdSense (~250 KiB + consentimento) não pode disputar a rede/CPU do carregamento.
//  - padrão: entra depois do load, em tempo ocioso
//  - VITE_ADSENSE_LAZY=1: só na 1ª interação do visitante ou 8 s depois, o que vier primeiro

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';

// O setup global mocka useLocation (sempre '/home', rota não elegível). Aqui controlamos a rota.
let mockPath = '/';
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useLocation: () => ({ pathname: mockPath }) };
});

const SCRIPT = () => document.getElementById('adsbygoogle-script');

async function renderGate({ lazy, path = '/' }) {
  vi.resetModules();
  vi.stubEnv('VITE_ADSENSE_CLIENT_ID', 'ca-pub-123');
  vi.stubEnv('VITE_ADSENSE_LAZY', lazy ? '1' : '');
  mockPath = path;
  const { AdsenseScriptGate } = await import('../../components/AdsenseScriptGate');
  return render(<AdsenseScriptGate />);
}

describe('AdsenseScriptGate — quando o script do AdSense entra', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // O gate espera o evento `load`; no jsdom o readyState pode não estar 'complete'.
    Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true });
    SCRIPT()?.remove();
    delete window.requestIdleCallback; // jsdom: cai no setTimeout de 1500 ms
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllEnvs();
    delete document.readyState; // volta ao getter do protótipo
    SCRIPT()?.remove();
  });

  it('padrão: não injeta na hora, injeta depois do tempo ocioso', async () => {
    await renderGate({ lazy: false });
    expect(SCRIPT()).toBeNull();
    await act(async () => { vi.advanceTimersByTime(1600); });
    expect(SCRIPT()).not.toBeNull();
  });

  it('LAZY: não injeta no tempo ocioso do modo padrão', async () => {
    await renderGate({ lazy: true });
    await act(async () => { vi.advanceTimersByTime(3000); });
    expect(SCRIPT()).toBeNull();
  });

  it('LAZY: injeta na primeira interação (rolagem)', async () => {
    await renderGate({ lazy: true });
    await act(async () => { window.dispatchEvent(new Event('scroll')); });
    expect(SCRIPT()).not.toBeNull();
  });

  it('LAZY: sem interação, injeta no fallback de 8 s', async () => {
    await renderGate({ lazy: true });
    await act(async () => { vi.advanceTimersByTime(7900); });
    expect(SCRIPT()).toBeNull();
    await act(async () => { vi.advanceTimersByTime(200); });
    expect(SCRIPT()).not.toBeNull();
  });

  it('LAZY: injeta uma única vez mesmo com várias interações', async () => {
    await renderGate({ lazy: true });
    await act(async () => {
      window.dispatchEvent(new Event('scroll'));
      window.dispatchEvent(new Event('pointerdown'));
      vi.advanceTimersByTime(9000);
    });
    expect(document.querySelectorAll('#adsbygoogle-script')).toHaveLength(1);
  });

  it('LAZY: sair da página antes de interagir cancela a injeção', async () => {
    const { unmount } = await renderGate({ lazy: true });
    unmount();
    await act(async () => {
      window.dispatchEvent(new Event('scroll'));
      vi.advanceTimersByTime(9000);
    });
    expect(SCRIPT()).toBeNull();
  });

  it('rota não elegível nunca injeta', async () => {
    await renderGate({ lazy: true, path: '/login' });
    await act(async () => {
      window.dispatchEvent(new Event('scroll'));
      vi.advanceTimersByTime(9000);
    });
    expect(SCRIPT()).toBeNull();
  });
});
