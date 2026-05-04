// src/components/PullToRefreshIndicator.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Indicador visual do pull-to-refresh. Fase 4, Tarefa 4.2.
// Mostra spinner com progresso circular ao puxar para baixo.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { RefreshCw } from 'lucide-react';

const PullToRefreshIndicator = ({ pulling, pullY, refreshing, progress }) => {
  if (!pulling && !refreshing) return null;

  const size       = 32;
  const radius     = 12;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
      style={{
        transform:  `translateY(${Math.min(pullY, 80)}px)`,
        transition: refreshing ? 'none' : 'transform 0.1s ease-out',
        paddingTop: '8px',
      }}
    >
      <div className={`w-10 h-10 rounded-full bg-[#0d0d0d] border border-border-mid flex items-center justify-center shadow-glass transition-all ${
        progress >= 1 ? 'border-cyan-electric/40' : ''
      }`}>
        {refreshing ? (
          <RefreshCw size={16} className="text-cyan-electric animate-spin" />
        ) : (
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {/* Track */}
            <circle
              cx={size / 2} cy={size / 2} r={radius}
              fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2"
            />
            {/* Progress */}
            <circle
              cx={size / 2} cy={size / 2} r={radius}
              fill="none"
              stroke={progress >= 1 ? '#00f2ff' : 'rgba(0,242,255,0.4)'}
              strokeWidth="2"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              style={{ transition: 'stroke 0.15s' }}
            />
          </svg>
        )}
      </div>
    </div>
  );
};

export default PullToRefreshIndicator;
