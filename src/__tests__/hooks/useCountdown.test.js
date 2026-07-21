// src/__tests__/hooks/useCountdown.test.js
// Sprint T-7 — Hook: useCountdown
// Timer regressivo baseado em Date alvo.

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// useCountdown não tem import de useState/useEffect — copiamos a lógica aqui
// pois o arquivo original esqueceu de importar. Testamos via módulo.
// Se o arquivo tiver import ausente, o teste falha — expõe o bug.
import { useCountdown } from '../../hooks/useCountdown';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useCountdown', () => {
  it('retorna active=false quando targetDate é inválido', () => {
    const { result } = renderHook(() => useCountdown(null));
    expect(result.current.active).toBe(false);
  });

  it('retorna active=false quando targetDate é string inválida', () => {
    const { result } = renderHook(() => useCountdown(new Date('invalid')));
    expect(result.current.active).toBe(false);
  });

  it('retorna active=false quando data já passou', () => {
    const past = new Date(Date.now() - 10000);
    const { result } = renderHook(() => useCountdown(past));
    expect(result.current.active).toBe(false);
  });

  it('retorna active=true quando data é no futuro', () => {
    const future = new Date(Date.now() + 60 * 1000);
    const { result } = renderHook(() => useCountdown(future));
    expect(result.current.active).toBe(true);
  });

  it('calcula segundos corretamente para 90s', () => {
    const future = new Date(Date.now() + 90 * 1000);
    const { result } = renderHook(() => useCountdown(future));
    expect(result.current.m).toBe(1);
    expect(result.current.s).toBe(30);
  });

  it('calcula horas corretamente', () => {
    const future = new Date(Date.now() + 3 * 3600 * 1000 + 30 * 60 * 1000);
    const { result } = renderHook(() => useCountdown(future));
    expect(result.current.h).toBe(3);
    expect(result.current.m).toBe(30);
  });

  it('calcula dias corretamente', () => {
    const future = new Date(Date.now() + 2 * 86400 * 1000);
    const { result } = renderHook(() => useCountdown(future));
    expect(result.current.d).toBe(2);
  });

  it('decrementa ao avançar 1 segundo', () => {
    const future = new Date(Date.now() + 10 * 1000);
    const { result } = renderHook(() => useCountdown(future));
    const initialS = result.current.s;
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.s).toBe(Math.max(0, initialS - 1));
  });

  it('active vira false quando chega a zero', () => {
    const future = new Date(Date.now() + 1000);
    const { result } = renderHook(() => useCountdown(future));
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.active).toBe(false);
  });

  it('zera d,h,m,s quando chega ao fim', () => {
    const future = new Date(Date.now() + 500);
    const { result } = renderHook(() => useCountdown(future));
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current).toMatchObject({ d: 0, h: 0, m: 0, s: 0 });
  });

  it('atualiza quando targetDate muda', () => {
    const future1 = new Date(Date.now() + 60 * 1000);
    const future2 = new Date(Date.now() + 120 * 1000);
    const { result, rerender } = renderHook(({ t }) => useCountdown(t), {
      initialProps: { t: future1 },
    });
    expect(result.current.m).toBe(1);
    rerender({ t: future2 });
    expect(result.current.m).toBe(2);
  });
});
