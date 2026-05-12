// src/components/PageWrapper.jsx
// Fase 2/4 — Wrapper de transição + semântica de <main> com id="main-content"
// para que o skip-link do index.html funcione corretamente.

import React from 'react';
import { useLocation } from 'react-router-dom';

const PageWrapper = ({ children, className = '' }) => {
  const location = useLocation();

  return (
    <main
      id="main-content"
      key={location.pathname}
      className={`animate-page-in ${className}`}
      style={{ animationDuration: '220ms', animationFillMode: 'both' }}
    >
      {children}
    </main>
  );
};

export default PageWrapper;
