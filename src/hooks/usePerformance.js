// src/hooks/usePerformance.js
// Sprint 8 — Utilitários de performance: lazy loading, preload de rotas críticas,
// detecção de conexão lenta e otimizações mobile-first.

import { useEffect, useState, useCallback } from 'react';

// ── Detectar conexão lenta ────────────────────────────────────────────────────
export const useConnectionSpeed = () => {
  const [isSlowConnection, setIsSlowConnection] = useState(false);

  useEffect(() => {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return;

    const check = () => {
      const slow = conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g';
      setIsSlowConnection(slow);
    };

    check();
    conn.addEventListener('change', check);
    return () => conn.removeEventListener('change', check);
  }, []);

  return isSlowConnection;
};

// ── Detectar dispositivo mobile ───────────────────────────────────────────────
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth < 768
  );

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler, { passive: true });
    return () => window.removeEventListener('resize', handler);
  }, []);

  return isMobile;
};

// ── Intersection Observer para lazy render ────────────────────────────────────
export const useIntersectionObserver = (options = {}) => {
  const [ref,       setRef]       = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!ref) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect(); // só precisa disparar uma vez
      }
    }, { threshold: 0.1, ...options });

    observer.observe(ref);
    return () => observer.disconnect();
  }, [ref]);

  return [setRef, isVisible];
};

// ── Debounce para inputs de busca ─────────────────────────────────────────────
export const useDebounce = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
};

// ── Preload de imagem ─────────────────────────────────────────────────────────
export const preloadImage = (src) => {
  if (!src) return;
  const img = new Image();
  img.src = src;
};

// ── Virtualizar lista longa (retorna apenas itens visíveis) ───────────────────
export const useVirtualList = (items = [], itemHeight = 60, containerHeight = 400) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleCount  = Math.ceil(containerHeight / itemHeight) + 2;
  const startIndex    = Math.max(0, Math.floor(scrollTop / itemHeight) - 1);
  const endIndex      = Math.min(items.length - 1, startIndex + visibleCount);
  const visibleItems  = items.slice(startIndex, endIndex + 1);
  const totalHeight   = items.length * itemHeight;
  const offsetY       = startIndex * itemHeight;

  const onScroll = useCallback((e) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return { visibleItems, totalHeight, offsetY, onScroll, startIndex };
};
