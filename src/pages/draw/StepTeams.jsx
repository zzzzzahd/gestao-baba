// src/pages/draw/StepTeams.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Wizard /draw — Step 2: Times sorteados.
// Exibe os times balanceados + reservas + CTA para iniciar partida.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { Trophy, Users, Play, RefreshCw, ChevronLeft } from 'lucide-react';
import { useBaba } from '../../contexts/BabaContext';
import { useAuth } from '../../contexts/AuthContext';
import { POSITION_LABEL } from '../../utils/constants';

const COLORS = [
  { border: 'border-cyan-electric/30',  text: 'text-cyan-electric', bg: 'bg-cyan-electric/10'  },
  { border: 'border-yellow-500/30',     text: 'text-yellow-500',    bg: 'bg-yellow-500/10'     },
  { border: 'border-green-500/30',      text: 'text-green-500',     bg: 'bg-green-500/10'      },
  { border: 'border-purple-500/30',     text: 'text-purple-500',    bg: 'bg-purple-500/10'     },
  { border: 'border-pink-500/30',       text: 'text-pink-500',      bg: 'bg-pink-500/10'       },
];

const StepTeams = ({ drawResult, onNext, onBack }) => {
  const { currentBaba } = useBaba();
  const { profile }     = useAuth();

  const teams    = drawResult?.teams    || [];
  const reserves = drawResult?.reserves || [];
  const isPresident = String(currentBaba?.president_id) === String(profile?.id);
  const totalPlayers = teams.reduce((s, t) => s + (t.players?.length || 0), 0);

  if (!drawResult || teams.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <Trophy size={40} className="text-text-muted mx-auto" />
        <p className="text-text-low font-black uppercase text-sm">Nenhum sorteio disponível</p>
        <button onClick={onBack} className="text-[10px] text-cyan-electric font-black uppercase flex items-center gap-1 mx-auto">
          <ChevronLeft size={12} /> Voltar e sortear
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Resumo */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-cyan-electric" />
          <span className="text-[11px] font-black text-text-low uppercase tracking-widest">
            {teams.length} times · {totalPlayers} jogadores
          </span>
        </div>
        {reserves.length > 0 && (
          <span className="text-[10px] font-black text-yellow-500 uppercase">
            {reserves.length} reserva{reserves.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Grid de times */}
      <div className={`grid gap-4 ${teams.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {teams.map((team, i) => {
          const c = COLORS[i % COLORS.length];
          return (
            <div key={i} className={`p-4 rounded-3xl border-2 ${c.border} bg-surface-1`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-black uppercase italic ${c.text}`}>{team.name}</h3>
                <div className={`flex items-center gap-1.5 ${c.bg} px-2.5 py-1 rounded-xl`}>
                  <Users size={12} className={c.text} />
                  <span className={`text-xs font-black tabular-nums ${c.text}`}>
                    {team.players?.length || 0}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                {(team.players || []).map((p, idx) => (
                  <div key={p.id || idx} className="flex items-center gap-3 p-2.5 bg-surface-2 rounded-xl border border-border-subtle">
                    <span className="text-[10px] font-black text-text-muted w-4 text-right tabular-nums shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black uppercase truncate">{p.name}</p>
                      <p className="text-[9px] text-text-muted uppercase">
                        {POSITION_LABEL[p.position] || p.position || 'Linha'}
                      </p>
                    </div>
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

      {/* Reservas */}
      {reserves.length > 0 && (
        <div className="p-4 rounded-2xl bg-surface-1 border border-border-subtle">
          <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-3">
            Reservas ({reserves.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {reserves.map((p, i) => (
              <div key={p.id || i} className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-2 rounded-xl border border-border-subtle">
                <span className="text-[9px] font-black text-text-muted">R{i + 1}</span>
                <span className="text-[10px] font-black uppercase text-text-low">{p.name}</span>
                {p.position === 'goleiro' && (
                  <div className="w-1 h-1 bg-yellow-400 rounded-full" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ações */}
      <div className="space-y-3 pt-2">
        {isPresident ? (
          <button
            onClick={onNext}
            className="w-full py-5 rounded-2xl font-black uppercase italic tracking-tighter text-black flex items-center justify-center gap-2 active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg, #00f2ff, #0066ff)' }}
          >
            <Play size={18} /> Iniciar Partida
          </button>
        ) : (
          <div className="text-center py-4 border border-dashed border-border-mid rounded-2xl">
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">
              Aguardando o presidente iniciar
            </p>
          </div>
        )}
        <button
          onClick={onBack}
          className="w-full py-3 rounded-2xl bg-surface-2 border border-border-mid text-text-low font-black uppercase text-[10px] tracking-widest hover:bg-surface-3 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <ChevronLeft size={14} /> Reconfigurar sorteio
        </button>
      </div>
    </div>
  );
};

export default StepTeams;
