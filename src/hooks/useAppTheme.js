// src/hooks/useAppTheme.js
// Fase 2.4 — Toggle dark/light mode persistido em localStorage.
// O app é dark-first; light mode aplica tokens sobre fundo claro.

import { useState, useEffect, useCallback } from 'react';

const THEME_KEY  = 'draft_play_theme';
const VALID_THEMES = ['dark', 'light'];

const applyTheme = (theme) => {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);

  if (theme === 'light') {
    // Tokens light: fundo claro, texto escuro
    root.style.setProperty('--color-bg-base',     '#f0f4f8');
    root.style.setProperty('--color-bg-surface-1','#ffffff');
    root.style.setProperty('--color-bg-surface-2','#e8edf2');
    root.style.setProperty('--color-bg-surface-3','#dde3ea');
    root.style.setProperty('--color-text-primary', '#0d1117');
    root.style.setProperty('--color-text-mid',     '#374151');
    root.style.setProperty('--color-text-low',     '#6b7280');
    root.style.setProperty('--color-border-subtle','rgba(0,0,0,0.08)');
    root.style.setProperty('--color-border-mid',   'rgba(0,0,0,0.15)');
    root.style.setProperty('--color-border-strong','rgba(0,0,0,0.25)');
    // theme-color meta tag para PWA
    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', '#f0f4f8');
  } else {
    // Tokens dark (padrão)
    root.style.setProperty('--color-bg-base',     '#000000');
    root.style.setProperty('--color-bg-surface-1','#0d0d0d');
    root.style.setProperty('--color-bg-surface-2','#161616');
    root.style.setProperty('--color-bg-surface-3','#1e1e1e');
    root.style.setProperty('--color-text-primary', '#ffffff');
    root.style.setProperty('--color-text-mid',     'rgba(255,255,255,0.7)');
    root.style.setProperty('--color-text-low',     'rgba(255,255,255,0.35)');
    root.style.setProperty('--color-border-subtle','rgba(255,255,255,0.04)');
    root.style.setProperty('--color-border-mid',   'rgba(255,255,255,0.08)');
    root.style.setProperty('--color-border-strong','rgba(255,255,255,0.18)');
    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', '#00f2ff');
  }
};

export function useAppTheme() {
  const [theme, setThemeState] = useState(() => {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (VALID_THEMES.includes(stored)) return stored;
      // Respeitar preferência do OS
      return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  // Aplicar tema ao montar e a cada mudança
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Escutar mudança de preferência do OS (se não houver preferência salva)
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: light)');
    if (!mq) return;
    const handler = (e) => {
      if (!localStorage.getItem(THEME_KEY)) {
        setThemeState(e.matches ? 'light' : 'dark');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const setTheme = useCallback((next) => {
    if (!VALID_THEMES.includes(next)) return;
    try { localStorage.setItem(THEME_KEY, next); } catch {}
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return { theme, setTheme, toggleTheme, isDark: theme === 'dark' };
}
