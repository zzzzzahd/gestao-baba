// src/__tests__/hooks/usePullToRefresh.test.js
// Sprint T-7 — Hook: usePullToRefresh
// Pull-to-refresh via touch events com threshold de 72px.

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';

// Helper: dispara TouchEvent no document
function fireTouch(type, y) {
  const touch = new Touch({ identifier: 1, target: document.body, clientY: y });
  const event = new TouchEvent(type, {
    touches:        [touch],
    changedTouches: [touch],
    bubbles:        true,
  });
  document.dispatchEvent(event);
}

describe('usePullToRefresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'scrollY', { writable: true, value: 0 });
  });

  it('estado inicial: pulling=false, pullY=0, refreshing=false', () => {
    const { result } = renderHook(() => usePullToRefresh(vi.fn()));
    expect(result.current.pulling).toBe(false);
    expect(result.current.pullY).toBe(0);
    expect(result.current.refreshing).toBe(false);
  });

  it('progress fica entre 0 e 1', () => {
    const { result } = renderHook(() => usePullToRefresh(vi.fn()));
    expect(result.current.progress).toBeGreaterThanOrEqual(0);
    expect(result.current.progress).toBeLessThanOrEqual(1);
  });

  it('quando disabled=true, touchstart não ativa pull', () => {
    const { result } = renderHook(() => usePullToRefresh(vi.fn(), { disabled: true }));
    act(() => fireTouch('touchstart', 0));
    act(() => fireTouch('touchmove', 200));
    expect(result.current.pulling).toBe(false);
  });

  it('não ativa quando scrollY > 0', () => {
    Object.defineProperty(window, 'scrollY', { writable: true, value: 10 });
    const { result } = renderHook(() => usePullToRefresh(vi.fn()));
    act(() => fireTouch('touchstart', 0));
    act(() => fireTouch('touchmove', 200));
    expect(result.current.pulling).toBe(false);
  });

  it('remove event listeners ao desmontar', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const { unmount } = renderHook(() => usePullToRefresh(vi.fn()));
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('touchmove', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('touchend', expect.any(Function));
  });

  it('pullY tem máximo de 100', () => {
    const { result } = renderHook(() => usePullToRefresh(vi.fn()));
    act(() => fireTouch('touchstart', 0));
    act(() => fireTouch('touchmove', 1000));
    expect(result.current.pullY).toBeLessThanOrEqual(100);
  });

  it('chama onRefresh após pull suficiente + touchend', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    renderHook(() => usePullToRefresh(onRefresh));
    act(() => fireTouch('touchstart', 0));
    act(() => fireTouch('touchmove', 300));
    await act(async () => fireTouch('touchend', 300));
    expect(onRefresh).toHaveBeenCalled();
  });

  it('NÃO chama onRefresh se pull insuficiente', async () => {
    const onRefresh = vi.fn();
    renderHook(() => usePullToRefresh(onRefresh));
    act(() => fireTouch('touchstart', 0));
    act(() => fireTouch('touchmove', 5));
    await act(async () => fireTouch('touchend', 5));
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('não quebra quando onRefresh não é fornecido', () => {
    expect(() => {
      renderHook(() => usePullToRefresh(undefined));
    }).not.toThrow();
  });
});
