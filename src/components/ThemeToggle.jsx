// src/components/ThemeToggle.jsx
// Fase 2.4 — Botão de toggle dark/light persistido.
// Usar em ProfilePage ou SettingsPanel.

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useAppTheme } from '../hooks/useAppTheme';

/**
 * @param {Object}  props
 * @param {string}  [props.className]
 * @param {boolean} [props.compact]   - exibe apenas o ícone sem texto
 */
export default function ThemeToggle({ className = '', compact = false }) {
  const { theme, toggleTheme, isDark } = useAppTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      aria-pressed={!isDark}
      title={isDark ? 'Tema claro' : 'Tema escuro'}
      className={`flex items-center gap-2 px-3 py-2 rounded-2xl border transition-all active:scale-95
        ${isDark
          ? 'bg-surface-2 border-border-mid text-text-low hover:text-yellow-400 hover:border-yellow-400/30'
          : 'bg-yellow-50 border-yellow-200 text-yellow-600 hover:bg-yellow-100'
        } ${className}`}
    >
      {isDark
        ? <Sun  size={16} aria-hidden="true" />
        : <Moon size={16} aria-hidden="true" />
      }
      {!compact && (
        <span className="text-[10px] font-black uppercase tracking-widest">
          {isDark ? 'Claro' : 'Escuro'}
        </span>
      )}
    </button>
  );
}
