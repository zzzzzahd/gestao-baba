// src/pages/dashboard/TabManage.jsx
// Corrigido: sem SuspensionPanel separado (suspensão agora no MembersModal),
// PresidentDashboard e BabaSettings funcionando inline,
// canManage para coordenadores também verem gestão.

import React, { useState } from 'react';
import { useNavigate }    from 'react-router-dom';
import {
  Swords, Play, ChevronRight, DollarSign,
  Settings, BarChart2, ChevronDown, ChevronUp, RefreshCw,
} from 'lucide-react';
import BabaSettings       from '../../components/BabaSettings';
import PresidentDashboard from '../../components/PresidentDashboard';

// ─── Preview dos times ────────────────────────────────────────────────────────

const TeamsPreview = ({ currentMatch, canManage }) => {
  const navigate = useNavigate();
  if (!currentMatch) return null;

  const teams    = currentMatch.teams    || [];
  const reserves = currentMatch.reserves || [];

  const COLORS = [
    { border: 'border-cyan-electric/30', text: 'text-cyan-electric'  },
    { border: 'border-yellow-500/30',    text: 'text-yellow-500'     },
    { border: 'border-orange-500/30',    text: 'text-orange-500'     },
    { border: 'border-purple-500/30',    text: 'text-purple-500'     },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Swords size={13} className="text-cyan-electric" />
          <span className="text-[10px] font-black text-text-low uppercase tracking-widest">
            Times Sorteados
          </span>
        </div>
        <button
          onClick={() => navigate('/draw')}
          className="flex items-center gap-1 text-[9px] font-black text-cyan-electric uppercase hover:text-white transition-colors"
        >
          Ver completo <ChevronRight size={10} />
        </button>
      </div>

      <div className={`grid gap-3 ${teams.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {teams.map((team, i) => {
          const c = COLORS[i % COLORS.length];
          return (
            <div key={i} className={`p-4 rounded-2xl border ${c.border} bg-surface-1`}>
              <p className={`text-[11px] font-black uppercase italic ${c.text} mb-3`}>{team.name}</p>
              <div className="space-y-1.5">
                {(team.players || []).map((p, idx) => (
                  <div key={p.id || idx} className="flex items-center gap-2">
                    <span className="text-[9px] text-text-muted font-black w-4 text-right shrink-0 tabular-nums">
                      {idx + 1}
                    </span>
                    <span className="text-[11px] font-black uppercase truncate flex-1">{p.name}</span>
                    {p.position === 'goleiro' && (
                      <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {reserves.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1">
          <span className="text-[9px] text-text-muted font-black uppercase tracking-widest w-full">
            Reservas ({reserves.length})
          </span>
          {reserves.map((p, i) => (
            <span key={p.id || i} className="text-[10px] font-black text-text-low bg-surface-2 px-2 py-1 rounded-lg uppercase">
              {p.name}
            </span>
          ))}
        </div>
      )}

      <button
        onClick={() => navigate('/draw')}
        className="w-full py-5 rounded-2xl font-black uppercase text-sm active:scale-95 transition-all flex items-center justify-center gap-2 text-black"
        style={{ background: 'linear-gradient(135deg, #00f2ff, #0066ff)' }}
      >
        <Play size={18} />
        {canManage ? 'Iniciar Partida' : 'Ver Times'}
      </button>
    </div>
  );
};

// ─── Bloco expansível ─────────────────────────────────────────────────────────

const ExpandableBlock = ({ id, title, icon: Icon, iconColor = 'text-text-low', sub, expanded, onToggle, children }) => (
  <div className="rounded-3xl bg-surface-1 border border-border-subtle overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-2/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
          iconColor === 'text-cyan-electric' ? 'bg-cyan-electric/10 border-cyan-electric/20'
          : iconColor === 'text-purple-400'  ? 'bg-purple-400/10  border-purple-400/20'
          : 'bg-surface-2 border-border-mid'
        }`}>
          <Icon size={15} className={iconColor} />
        </div>
        <div className="text-left">
          <p className="text-xs font-black uppercase text-white">{title}</p>
          {sub && <p className="text-[9px] text-text-muted font-black">{sub}</p>}
        </div>
      </div>
      {expanded
        ? <ChevronUp   size={14} className="text-text-low" />
        : <ChevronDown size={14} className="text-text-low" />}
    </button>
    {expanded && (
      <div className="px-5 pb-5 border-t border-border-subtle pt-4">
        {children}
      </div>
    )}
  </div>
);

// ─── TabManage ────────────────────────────────────────────────────────────────

const TabManage = ({
  currentBaba,
  currentMatch,
  isDrawing,
  isPresident,
  canManage,       // presidente OU coordenador
  playersWithRatings,
  getAllRatings,
  setPlayerRatings,
}) => {
  const navigate        = useNavigate();
  const [expanded, setExpanded] = useState({ dashboard: false, settings: false });

  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-5">

      {/* Times sorteados / Iniciar sorteio */}
      {isDrawing ? (
        <div className="flex items-center justify-center gap-3 py-10 border border-cyan-electric/20 rounded-2xl bg-cyan-electric/5">
          <RefreshCw size={14} className="text-cyan-electric animate-spin" />
          <span className="text-[11px] font-black text-cyan-electric uppercase tracking-widest">
            Sorteando automaticamente...
          </span>
        </div>
      ) : currentMatch ? (
        <div className="p-5 rounded-3xl bg-surface-1 border border-border-subtle">
          <TeamsPreview currentMatch={currentMatch} canManage={canManage} />
        </div>
      ) : (
        <div
          onClick={() => navigate('/draw')}
          className="p-8 rounded-3xl bg-surface-1 border border-dashed border-border-mid flex flex-col items-center gap-3 cursor-pointer hover:bg-surface-2 transition-all"
        >
          <Swords size={28} className="text-text-muted" />
          <p className="text-[11px] font-black text-text-low uppercase tracking-widest">Iniciar sorteio</p>
          <p className="text-[9px] text-text-muted font-bold">Toque para configurar e sortear os times</p>
        </div>
      )}

      {/* Financeiro */}
      <div
        onClick={() => navigate('/financial')}
        className="flex items-center gap-4 p-5 rounded-3xl bg-surface-1 border border-border-subtle cursor-pointer hover:bg-surface-2 transition-all active:scale-[0.98]"
      >
        <div className="w-10 h-10 rounded-2xl bg-cyan-electric/10 border border-cyan-electric/20 flex items-center justify-center shrink-0">
          <DollarSign size={18} className="text-cyan-electric" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-black uppercase">Caixa do Grupo</p>
          <p className="text-[10px] text-text-muted font-bold uppercase">Cobranças e pagamentos</p>
        </div>
        <ChevronRight size={16} className="text-text-muted" />
      </div>

      {/* Seção de administração — presidente e coordenador */}
      {canManage && (
        <div className="space-y-3 pt-2 border-t border-border-subtle">
          <p className="text-[9px] font-black text-text-muted uppercase tracking-widest px-1">
            {isPresident ? 'Administração' : 'Coordenação'}
          </p>

          {/* Dashboard — apenas presidente vê KPIs completos */}
          {isPresident && (
            <ExpandableBlock
              id="dashboard"
              title="Relatórios & KPIs"
              sub="Dashboard do presidente"
              icon={BarChart2}
              iconColor="text-purple-400"
              expanded={expanded.dashboard}
              onToggle={() => toggle('dashboard')}
            >
              <PresidentDashboard babaId={currentBaba?.id} />
            </ExpandableBlock>
          )}

          {/* Configurações — presidente e coordenador */}
          <ExpandableBlock
            id="settings"
            title="Configurações do Grupo"
            sub="Jogo, sorteio, avaliações, convites"
            icon={Settings}
            iconColor="text-text-low"
            expanded={expanded.settings}
            onToggle={() => toggle('settings')}
          >
            <BabaSettings />
          </ExpandableBlock>
        </div>
      )}
    </div>
  );
};

export default TabManage;
