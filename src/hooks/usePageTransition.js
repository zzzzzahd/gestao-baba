// src/hooks/usePageTransition.js
// ─────────────────────────────────────────────────────────────────────────────
// Transição de rota com CSS puro. Fase 4, Tarefa 4.1.
// Sem dependência de framer-motion — usa apenas CSS animations do Tailwind.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Retorna className de animação baseado na rota atual.
 * Cada mudança de rota dispara um fade + slide-up de 250ms.
 */
export const usePageTransition = () => {
  const location  = useLocation();
  const [animKey, setAnimKey] = useState(location.pathname);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(false);
    const id = setTimeout(() => {
      setAnimKey(location.pathname);
      setVisible(true);
    }, 80); // tempo mínimo para o browser pintar o fade-out
    return () => clearTimeout(id);
  }, [location.pathname]);

  return { animKey, visible };
};
