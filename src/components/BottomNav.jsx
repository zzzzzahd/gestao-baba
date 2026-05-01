import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Shield, Trophy, User } from 'lucide-react';

// Caixa (/financial) foi removida da nav principal.
// Acesso à Caixa agora é feito via sub-aba dentro do Dashboard (Sprint E).
const NAV_ITEMS = [
  { icon: Home,   label: 'Início',   path: '/home'      },
  { icon: Shield, label: 'Baba',     path: '/dashboard' },
  { icon: Trophy, label: 'Rankings', path: '/rankings'  },
  { icon: User,   label: 'Perfil',   path: '/profile'   },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const PUBLIC_ROUTES = ['/', '/login', '/visitor', '/visitor-match'];
  if (PUBLIC_ROUTES.includes(location.pathname)) return null;

  return (
    <>
      {/* Espaçador para o conteúdo não ficar atrás da nav */}
      <div className="h-24" />

      <nav className="fixed bottom-0 left-0 right-0 z-50">
        {/* Blur backdrop */}
        <div className="absolute inset-0 bg-black/80 backdrop-blur-xl border-t border-white/5" />

        {/* Safe area para iOS */}
        <div
          className="relative flex items-center justify-around px-2 pt-3"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          {NAV_ITEMS.map(({ icon: Icon, label, path }) => {
            const isActive = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="flex flex-col items-center gap-1 px-3 py-1 rounded-2xl transition-all active:scale-90"
              >
                <div className={`relative p-2 rounded-xl transition-all ${
                  isActive
                    ? 'bg-cyan-electric/15 shadow-[0_0_12px_rgba(0,242,255,0.2)]'
                    : 'hover:bg-white/5'
                }`}>
                  <Icon
                    size={22}
                    className={`transition-colors ${
                      isActive ? 'text-cyan-electric' : 'text-white/30'
                    }`}
                    strokeWidth={isActive ? 2.5 : 1.5}
                  />
                  {isActive && (
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-cyan-electric rounded-full shadow-[0_0_6px_rgba(0,242,255,0.8)]" />
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
