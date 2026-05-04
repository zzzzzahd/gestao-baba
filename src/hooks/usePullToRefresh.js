// src/hooks/usePullToRefresh.js
// ─────────────────────────────────────────────────────────────────────────────
// Pull-to-refresh nativo. Fase 4, Tarefa 4.2.
// Detecta swipe down via touch events. Sem dependências externas.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';

const THRESHOLD  = 72;  // px de pull para acionar
const MAX_PULL   = 100; // px máximos de deslocamento visual

export const usePullToRefresh = (onRefresh, { disabled = false } = {}) => {
  const [pulling,     setPulling]     = useState(false);
  const [pullY,       setPullY]       = useState(0);      // 0–MAX_PULL
  const [refreshing,  setRefreshing]  = useState(false);

  const startY    = useRef(0);
  const isPulling = useRef(false);

  const triggerRefresh = useCallback(async () => {
    setRefreshing(true);
    setPullY(0);
    setPulling(false);
    try { await onRefresh?.(); } finally { setRefreshing(false); }
  }, [onRefresh]);

  useEffect(() => {
    if (disabled) return;

    const onTouchStart = (e) => {
      // Só ativa se o scroll estiver no topo
      if (window.scrollY > 0) return;
      startY.current  = e.touches[0].clientY;
      isPulling.current = true;
    };

    const onTouchMove = (e) => {
      if (!isPulling.current) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) { setPulling(false); setPullY(0); return; }

      // Resistência progressiva
      const clamped = Math.min(delta * 0.45, MAX_PULL);
      setPullY(clamped);
      setPulling(clamped > 8);

      if (clamped > THRESHOLD * 0.45) e.preventDefault(); // evita scroll nativo
    };

    const onTouchEnd = () => {
      if (!isPulling.current) return;
      isPulling.current = false;
      if (pullY >= THRESHOLD * 0.45) {
        triggerRefresh();
      } else {
        setPullY(0);
        setPulling(false);
      }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove',  onTouchMove,  { passive: false });
    document.addEventListener('touchend',   onTouchEnd,   { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove',  onTouchMove);
      document.removeEventListener('touchend',   onTouchEnd);
    };
  }, [disabled, pullY, triggerRefresh]);

  const progress = Math.min(pullY / (THRESHOLD * 0.45), 1); // 0–1

  return { pulling, pullY, refreshing, progress };
};
