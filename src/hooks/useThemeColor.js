// src/hooks/useThemeColor.js
// Injeta a cor do tema do baba atual como CSS variable --baba-color
// Usada nos componentes do Dashboard para colorir elementos-chave

import { useEffect } from 'react';
import { useBaba }   from '../contexts/BabaContext';

// Converter hex para RGB (para uso com opacity no Tailwind arbitrary)
function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return { r, g, b };
}

const DEFAULT_COLOR = '#06b6d4'; // cyan-electric padrão

export function useThemeColor() {
  const { currentBaba } = useBaba();
  const color = currentBaba?.theme_color || DEFAULT_COLOR;

  useEffect(() => {
    const rgb = hexToRgb(color);
    if (!rgb) return;

    const root = document.documentElement;
    root.style.setProperty('--baba-color',         color);
    root.style.setProperty('--baba-color-r',       String(rgb.r));
    root.style.setProperty('--baba-color-g',       String(rgb.g));
    root.style.setProperty('--baba-color-b',       String(rgb.b));
    root.style.setProperty('--baba-color-rgb',     `${rgb.r}, ${rgb.g}, ${rgb.b}`);

    // Restaurar cor padrão ao desmontar
    return () => {
      const defaultRgb = hexToRgb(DEFAULT_COLOR);
      root.style.setProperty('--baba-color',     DEFAULT_COLOR);
      root.style.setProperty('--baba-color-rgb', `${defaultRgb.r}, ${defaultRgb.g}, ${defaultRgb.b}`);
    };
  }, [color]);

  return color;
}

// Helper para gerar estilos inline usando a cor do tema
// Uso: <div style={tc.border(0.3)}>  →  border: 1px solid rgba(r,g,b,0.3)
export function useThemeStyles() {
  const { currentBaba } = useBaba();
  const color = currentBaba?.theme_color || DEFAULT_COLOR;
  const rgb   = hexToRgb(color) || { r: 6, g: 182, b: 212 };

  return {
    color,
    // Cor sólida
    text:       { color },
    bg:         { backgroundColor: color },
    border:     (opacity = 1) => ({ borderColor: `rgba(${rgb.r},${rgb.g},${rgb.b},${opacity})` }),
    // Fundos com opacidade
    bgAlpha:    (opacity = 0.1) => ({ backgroundColor: `rgba(${rgb.r},${rgb.g},${rgb.b},${opacity})` }),
    // Box shadow
    shadow:     (opacity = 0.2) => ({ boxShadow: `0 0 20px rgba(${rgb.r},${rgb.g},${rgb.b},${opacity})` }),
    // Gradiente
    gradient:   (opacity = 0.2) => ({
      background: `linear-gradient(to right, rgba(${rgb.r},${rgb.g},${rgb.b},${opacity}), transparent)`,
    }),
    // Borda + fundo
    card:       (bgOpacity = 0.05, borderOpacity = 0.2) => ({
      backgroundColor: `rgba(${rgb.r},${rgb.g},${rgb.b},${bgOpacity})`,
      borderColor:     `rgba(${rgb.r},${rgb.g},${rgb.b},${borderOpacity})`,
    }),
  };
}
