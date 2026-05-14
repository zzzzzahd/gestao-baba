// src/components/PlanBadge.jsx
// Badge de plano (Free / Pro / Enterprise) com gate visual para features premium.

import React from 'react';
import { Zap, Crown, Shield } from 'lucide-react';

const PLAN_CONFIG = {
  free: {
    icon:      Zap,
    label:     'Free',
    className: 'bg-surface-2 border-border-mid text-text-low',
  },
  pro: {
    icon:      Crown,
    label:     'Pro',
    className: 'bg-cyan-electric/10 border-cyan-electric/30 text-cyan-electric',
    glow:      '0 0 12px rgba(0,242,255,0.25)',
  },
  enterprise: {
    icon:      Shield,
    label:     'Enterprise',
    className: 'bg-yellow-400/10 border-yellow-400/30 text-yellow-400',
  },
};

/**
 * @param {Object}  props
 * @param {string}  props.plan       - 'free' | 'pro' | 'enterprise'
 * @param {boolean} [props.compact]  - só ícone sem texto
 * @param {string}  [props.className]
 */
export function PlanBadge({ plan = 'free', compact = false, className = '' }) {
  const cfg  = PLAN_CONFIG[plan] ?? PLAN_CONFIG.free;
  const Icon = cfg.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[8px] font-black uppercase tracking-widest ${cfg.className} ${className}`}
      style={cfg.glow ? { boxShadow: cfg.glow } : undefined}
      aria-label={`Plano ${cfg.label}`}
    >
      <Icon size={9} aria-hidden="true" />
      {!compact && cfg.label}
    </span>
  );
}

/**
 * Gate visual: envolve conteúdo premium com overlay de upgrade.
 * @param {Object}   props
 * @param {boolean}  props.isPro    - se o usuário tem acesso
 * @param {string}   [props.feature]  - nome da feature bloqueada
 * @param {Function} [props.onUpgrade] - callback para abrir modal de upgrade
 * @param {React.ReactNode} props.children
 */
export function ProGate({ isPro, feature = 'esta funcionalidade', onUpgrade, children }) {
  if (isPro) return <>{children}</>;

  return (
    <div className="relative rounded-3xl overflow-hidden">
      {/* Conteúdo bloqueado — desfocado */}
      <div className="pointer-events-none select-none filter blur-[2px] opacity-40" aria-hidden="true">
        {children}
      </div>

      {/* Overlay de upgrade */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm rounded-3xl p-6 text-center">
        <Crown size={28} className="text-cyan-electric mb-3" aria-hidden="true" />
        <p className="text-sm font-black uppercase text-white mb-1">Recurso Pro</p>
        <p className="text-[11px] text-text-low mb-4">
          {feature} está disponível no plano Pro.
        </p>
        <button
          onClick={onUpgrade}
          className="px-5 py-2.5 rounded-2xl bg-cyan-electric text-black text-[10px] font-black uppercase tracking-widest hover:bg-cyan-electric/90 transition-all active:scale-95"
        >
          Fazer upgrade → Pro
        </button>
      </div>
    </div>
  );
}
