// src/components/DrawConfigBlock.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Configuração do sorteio automático (visível apenas para o presidente).
// Extraído do DashboardPage (Fase 2, Tarefa 2.4).
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { Settings2 } from 'lucide-react';
import Tooltip from './Tooltip';

const STRATEGIES = [
  {
    id: 'reserve',
    label: 'Reserva',
    tip: 'Jogadores que não cabem nos times ficam de reserva e entram quando alguém sai.',
  },
  {
    id: 'substitute',
    label: 'Incompleto',
    tip: 'Os times são formados mesmo sem o número ideal de jogadores.',
  },
];

const DrawConfigBlock = ({
  drawConfig,
  setDrawConfig,
  gameConfirmations,
  isDrawing,
  nextGameDay,
}) => {
  const safeConfig     = drawConfig || { playersPerTeam: 5, strategy: 'reserve' };
  const confirmedCount = gameConfirmations?.length || 0;
  const minRequired    = safeConfig.playersPerTeam * 2;
  const totalTeams     = Math.floor(confirmedCount / safeConfig.playersPerTeam);
  const totalMatches   = Math.floor(totalTeams / 2);
  const reserves       = confirmedCount % safeConfig.playersPerTeam
    + (totalTeams % 2) * safeConfig.playersPerTeam;

  // Horário do sorteio automático (deadline = 30 min antes do jogo)
  const deadlineStr = nextGameDay?.deadline
    ? nextGameDay.deadline.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null;

  const handleDelta = (delta) => {
    const next = Math.max(2, Math.min(11, safeConfig.playersPerTeam + delta));
    setDrawConfig(prev => ({ ...prev, playersPerTeam: next }));
  };

  return (
    <div className="space-y-3 pt-3 border-t border-border-subtle">

      {/* Cabeçalho com horário do sorteio automático */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Settings2
            size={13}
            className={`text-cyan-electric ${isDrawing ? 'animate-spin' : ''}`}
          />
          <span className="text-[10px] font-black text-text-low uppercase tracking-widest">
            Config do sorteio
          </span>
          <Tooltip
            title="Sorteio automático"
            text="Os times são balanceados pela avaliação técnica dos jogadores (habilidade, físico e compromisso)."
          />
        </div>
        {deadlineStr && (
          <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">
            Automático às {deadlineStr}
          </span>
        )}
      </div>

      {/* Jogadores por time */}
      <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-surface-2 border border-border-subtle">
        <span className="text-[10px] font-black uppercase text-text-mid">Jogadores por time</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleDelta(-1)}
            disabled={isDrawing}
            className="w-8 h-8 bg-surface-2 rounded-lg border border-border-mid font-black text-lg hover:bg-surface-3 active:scale-90 transition-all disabled:opacity-30"
          >−</button>
          <span className="text-xl font-black w-8 text-center text-cyan-electric">
            {safeConfig.playersPerTeam}
          </span>
          <button
            onClick={() => handleDelta(1)}
            disabled={isDrawing}
            className="w-8 h-8 bg-surface-2 rounded-lg border border-border-mid font-black text-lg hover:bg-surface-3 active:scale-90 transition-all disabled:opacity-30"
          >+</button>
        </div>
      </div>

      {/* Estratégia de suplentes */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-surface-2 border border-border-subtle">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-black uppercase text-text-low">Suplentes</span>
          <Tooltip
            title="Modo de suplentes"
            text="'Reserva' — jogadores extras aguardam na beira. 'Incompleto' — times jogam com menos jogadores."
          />
        </div>
        <div className="flex gap-2 flex-1 justify-end">
          {STRATEGIES.map(s => (
            <button
              key={s.id}
              onClick={() => setDrawConfig(prev => ({ ...prev, strategy: s.id }))}
              disabled={isDrawing}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all border ${
                safeConfig.strategy === s.id
                  ? 'bg-cyan-electric text-black border-cyan-electric'
                  : 'bg-surface-2 text-text-low border-border-mid hover:border-border-strong'
              } disabled:opacity-40`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Prévia do sorteio — só quando tem quórum */}
      {confirmedCount >= minRequired ? (
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: totalMatches, label: 'Partidas',   color: 'text-cyan-electric'                               },
            { value: totalTeams,   label: 'Times',      color: 'text-white'                                       },
            { value: reserves,     label: 'Aguardando', color: reserves > 0 ? 'text-yellow-500' : 'text-text-muted' },
          ].map(item => (
            <div key={item.label} className="text-center p-3 bg-surface-2 rounded-2xl border border-border-subtle">
              <p className={`text-2xl font-black ${item.color}`}>{item.value}</p>
              <p className="text-[8px] text-text-low uppercase font-black mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-[10px] text-text-low font-black uppercase tracking-widest py-1">
          faltam {minRequired - confirmedCount} confirmação{minRequired - confirmedCount !== 1 ? 'ões' : ''} para o sorteio
        </p>
      )}
    </div>
  );
};

export default DrawConfigBlock;
