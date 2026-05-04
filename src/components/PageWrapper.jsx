// src/components/PageWrapper.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Wrapper de transição de rota. Fase 4, Tarefa 4.1.
// Envolve o conteúdo de cada página com fade + slide-up (250ms).
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Uso:
 *   const MyPage = () => (
 *     <PageWrapper>
 *       <div>Conteúdo</div>
 *     </PageWrapper>
 *   );
 *
 * Ou wrap global em App.jsx via <AnimatedRoutes>.
 */
const PageWrapper = ({ children, className = '' }) => {
  const location = useLocation();

  return (
    <div
      key={location.pathname}
      className={`animate-page-in ${className}`}
      style={{ animationDuration: '220ms', animationFillMode: 'both' }}
    >
      {children}
    </div>
  );
};

export default PageWrapper;
