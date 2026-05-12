// src/components/BottomNav.jsx
// Fase 2 — aria-label em todos os botões + safe-area-inset-bottom para iOS.

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Shield, Trophy, User } from 'lucide-react';

const NAV_ITEMS = [
  { icon: Home,   label: 'Início',   path: '/home',      ariaLabel: 'Ir para Início' },
  { icon: Shield, label: 'Baba',     path: '/dashboard', ariaLabel: 'Ir para Dashboard do Baba' },
  { icon: Trophy, label: 'Rankings', path: '/rankings',  ariaLabel: 'Ir para Rankings' },
  { icon: User,   label: 'Perfil',   path: '/profile',   ariaLabel: 'Ir para Perfil' },
];

const PUBLIC_ROUTES = new Set(['/', '/login', '/visitor', '/visitor-match']);

const BottomNav = () => {
  const navigate  = useNavigate();
  const location  = useLocation();

  if (PUBLIC_ROUTES.has(location.pathname)) return null;

  return (
    <>
      {/* Espaçador para o conteúdo não ficar atrás da nav */}
      <div className="h-24" aria-hidden="true" />

      <nav
        className="fixed bottom-0 left-0 right-0 z-50"
        role="navigation"
        aria-label="Navegação principal"
      >
        {/* Blur backdrop */}
        <div className="absolute inset-0 bg-black/80 backdrop-blur-xl border-t border-white/5" aria-hidden="true" />

        {/* Safe area para iOS */}
        <div
          className="relative flex items-center justify-around px-2 pt-3"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          {NAV_ITEMS.map(({ icon: Icon, label, path, ariaLabel }) => {
            const isActive = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                aria-label={ariaLabel}
                aria-current={isActive ? 'page' : undefined}
                className="flex flex-col items-center gap-1 px-3 py-1 rounded-2xl transition-all active:scale-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-electric focus-visible:outline-offset-2"
              >
                <div className={`relative p-2 rounded-xl transition-all ${
                  isActive
                    ? 'bg-cyan-electric/15 shadow-[0_0_12px_rgba(0,242,255,0.2)]'
                    : 'hover:bg-white/5'
                }`}>
                  <Icon
                    size={22}
                    className={`transition-colors ${isActive ? 'text-cyan-electric' : 'text-white/30'}`}
                    strokeWidth={isActive ? 2.5 : 1.5}
                    aria-hidden="true"
                  />
                  {isActive && (
                    <span
                      className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-cyan-electric rounded-full shadow-[0_0_6px_rgba(0,242,255,0.8)]"
                      aria-hidden="true"
                    />
                  )}
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${
                  isActive ? 'text-cyan-electric' : 'text-white/20'
                }`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default BottomNav;
