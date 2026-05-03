// src/pages/dashboard/TabManage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Aba "Gestão" do Dashboard. Fase 3.
// Conteúdo: times sorteados, acesso rápido a financeiro, suspensões, config.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Swords, Play, ChevronRight, DollarSign,
  Settings, Shield, RefreshCw,
} from 'lucide-react';
import SuspensionPanel from '../../components/SuspensionPanel';

// ─── Bloco de times ───────────────────────────────────────────────────────────

const TeamsPreview = ({ currentMatch, isPresident }) => {
  const navigate = useNavigate();
  if (!currentMatch) return null;

  const teams    = currentMatch.teams    || [];
  const reserves = currentMatch.reserves || [];
  const COLORS   = [
    { border: 'border-cyan-electric/30', text: 'text-cyan-electric' },
    { border: 'border-yellow-500/30',    text: 'text-yellow-500'    },
    { border: 'border-orange-500/30',    text: 'text-orange-500'    },
    { border: 'border-purple-500/30',    text: 'text-purple-500'    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Swords size={13} className="text-cyan-electric" />
          <span className="text-[10px] font-black text-text-low uppercase tracking-widest">Times Sorteados</span>
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
                    {p.position === 'goleiro' && <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full shrink-0" />}
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
        {isPresident ? 'Iniciar Partida' : 'Ver Times'}
      </button>
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────

const TabManage = ({
  currentBaba,
  currentMatch,
  isDrawing,
  isPresident,
  playersWithRatings,
  getAllRatings,
  setPlayerRatings,
  showSuspensions,
  setShowSuspensions,
  onShowSettings,
}) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-5">

      {/* Times sorteados / estado do sorteio */}
      {isDrawing ? (
        <div className="flex items-center justify-center gap-3 py-10 border border-cyan-electric/20 rounded-2xl bg-cyan-electric/5">
          <RefreshCw size={14} className="text-cyan-electric animate-spin" />
          <span className="text-[11px] font-black text-cyan-electric uppercase tracking-widest">
            Sorteando automaticamente...
          </span>
        </div>
      ) : currentMatch ? (
        <div className="p-5 rounded-3xl bg-surface-1 border border-border-subtle">
          <TeamsPreview currentMatch={currentMatch} isPresident={isPresident} />
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

      {/* Acesso rápido — Financeiro */}
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

      {/* Administração — apenas presidente */}
      {isPresident && (
        <div className="space-y-3 pt-2 border-t border-border-subtle">
          <p className="text-[9px] font-black text-text-muted uppercase tracking-widest px-1">
            Administração
          </p>

          <button
            onClick={() => setShowSuspensions(s => !s)}
            className="w-full py-4 bg-red-500/5 border border-red-500/10 rounded-[2rem] text-red-400 font-black uppercase text-[10px] tracking-widest hover:bg-red-500/10 flex items-center justify-center gap-3 transition-colors active:scale-95"
          >
            <Shield size={16} /> Gestão de Suspensões
          </button>

          {showSuspensions && (
            <div className="p-5 bg-surface-1 border border-border-subtle rounded-[2rem]">
              <SuspensionPanel
                players={playersWithRatings}
                babaId={currentBaba?.id}
                onPlayersUpdated={async () => {
                  const u = await getAllRatings();
                  setPlayerRatings(u || []);
                }}
              />
            </div>
          )}

          <button
            onClick={onShowSettings}
            className="w-full py-5 bg-surface-2 border border-border-mid rounded-[2.5rem] text-text-low font-black uppercase text-[10px] tracking-widest hover:bg-surface-3 flex items-center justify-center gap-3 transition-colors active:scale-95"
          >
            <Settings size={18} /> Configurações do Grupo
          </button>
        </div>
      )}
    </div>
  );
};

export default TabManage;
