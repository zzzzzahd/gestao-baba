// src/pages/draw/StepConfig.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Wizard /draw — Step 1: Configuração do sorteio.
// Mostra: confirmados, config de jogadores/estratégia, botão sortear.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { Users, RefreshCw, ChevronRight } from 'lucide-react';
import { useBaba } from '../../contexts/BabaContext';
import { supabase } from '../../services/supabase';
import Tooltip from '../../components/Tooltip';
import toast from 'react-hot-toast';

const STRATEGIES = [
  {
    id: 'reserve',
    label: 'Reserva',
    tip: 'Jogadores que não cabem nos times ficam de reserva.',
  },
  {
    id: 'substitute',
    label: 'Incompleto',
    tip: 'Times são formados mesmo com menos jogadores.',
  },
];

// Algoritmo de sorteio balanceado por avaliação
const drawTeams = (players, playersPerTeam, strategy) => {
  const sorted = [...players].sort((a, b) => (b.final_rating || 0) - (a.final_rating || 0));
  const totalTeams = Math.floor(sorted.length / playersPerTeam);
  const teams = Array.from({ length: totalTeams }, (_, i) => ({
    name: `Time ${String.fromCharCode(65 + i)}`,
    players: [],
  }));

  // Distribuição em cobra (snake draft) para balancear
  sorted.forEach((player, idx) => {
    const round = Math.floor(idx / totalTeams);
    const pos   = round % 2 === 0 ? idx % totalTeams : totalTeams - 1 - (idx % totalTeams);
    if (teams[pos]) teams[pos].players.push(player);
  });

  const reserves = strategy === 'reserve'
    ? sorted.slice(totalTeams * playersPerTeam)
    : [];

  return { teams, reserves };
};

const StepConfig = ({ drawConfig, setDrawConfig, onNext }) => {
  const { currentBaba, gameConfirmations, players, isDrawing } = useBaba();
  const [drawing, setDrawing] = useState(false);

  const safeConfig     = drawConfig || { playersPerTeam: 5, strategy: 'reserve' };
  const confirmedCount = gameConfirmations?.length || 0;
  const minRequired    = safeConfig.playersPerTeam * 2;
  const totalTeams     = Math.floor(confirmedCount / safeConfig.playersPerTeam);
  const totalMatches   = Math.floor(totalTeams / 2);
  const reserveCount   = confirmedCount % safeConfig.playersPerTeam
    + (totalTeams % 2) * safeConfig.playersPerTeam;
  const canDraw        = confirmedCount >= minRequired && !drawing;

  const handleDelta = (delta) => {
    const next = Math.max(2, Math.min(11, safeConfig.playersPerTeam + delta));
    setDrawConfig(prev => ({ ...prev, playersPerTeam: next }));
  };

  const handleDraw = async () => {
    if (!canDraw) return;
    setDrawing(true);
    try {
      // Buscar sorteio existente de hoje primeiro
      const today = new Date().toISOString().split('T')[0];
      const { data: existing } = await supabase
        .from('draw_results').select('*')
        .eq('baba_id', currentBaba.id).eq('draw_date', today)
        .limit(1).maybeSingle();

      if (existing?.teams?.length >= 2) {
        onNext({ teams: existing.teams, reserves: existing.reserves || [] });
        return;
      }

      // Buscar jogadores confirmados com ratings
      const confirmedIds = gameConfirmations.map(c => c.player_id);
      const confirmedPlayers = players
        .filter(p => confirmedIds.includes(p.id))
        .map(p => ({ ...p, final_rating: p.final_rating || 3 }));

      const { teams, reserves } = drawTeams(
        confirmedPlayers,
        safeConfig.playersPerTeam,
        safeConfig.strategy,
      );

      // Persistir no banco
      await supabase.from('draw_results').upsert({
        baba_id:    currentBaba.id,
        draw_date:  today,
        teams,
        reserves,
        draw_config: safeConfig,
      }, { onConflict: 'baba_id,draw_date' });

      toast.success('Times sorteados!');
      onNext({ teams, reserves });
    } catch (err) {
      console.error('[StepConfig] draw error:', err);
      toast.error('Erro ao sortear. Tente novamente.');
    } finally {
      setDrawing(false);
    }
  };

  return (
    <div className="space-y-5">

      {/* Confirmados */}
      <div className="p-5 rounded-3xl bg-surface-1 border border-border-subtle">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-cyan-electric" />
            <span className="text-[10px] font-black text-text-low uppercase tracking-widest">
              Confirmados
            </span>
          </div>
          <span className={`text-lg font-black tabular-nums ${
            confirmedCount >= minRequired ? 'text-cyan-electric' : 'text-text-mid'
          }`}>
            {confirmedCount}
          </span>
        </div>
        {confirmedCount < minRequired && (
          <p className="text-[10px] text-text-muted font-bold mt-1">
            Mínimo {minRequired} para sortear · faltam {minRequired - confirmedCount}
          </p>
        )}
      </div>

      {/* Jogadores por time */}
      <div className="p-5 rounded-3xl bg-surface-1 border border-border-subtle space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase text-text-mid">Jogadores por time</span>
            <Tooltip
              title="Balanceamento"
              text="Os times são distribuídos em cobra pela nota de avaliação dos jogadores."
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleDelta(-1)}
              disabled={drawing}
              className="w-8 h-8 bg-surface-2 rounded-lg border border-border-mid font-black text-lg hover:bg-surface-3 active:scale-90 transition-all disabled:opacity-30"
            >−</button>
            <span className="text-xl font-black w-8 text-center text-cyan-electric tabular-nums">
              {safeConfig.playersPerTeam}
            </span>
            <button
              onClick={() => handleDelta(1)}
              disabled={drawing}
              className="w-8 h-8 bg-surface-2 rounded-lg border border-border-mid font-black text-lg hover:bg-surface-3 active:scale-90 transition-all disabled:opacity-30"
            >+</button>
          </div>
        </div>

        {/* Estratégia */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-black uppercase text-text-low">Suplentes</span>
            <Tooltip
              title="Modo de suplentes"
              text="'Reserva' — extras ficam aguardando. 'Incompleto' — times jogam com menos."
            />
          </div>
          <div className="flex gap-2 flex-1 justify-end">
            {STRATEGIES.map(s => (
              <button
                key={s.id}
                onClick={() => setDrawConfig(prev => ({ ...prev, strategy: s.id }))}
                disabled={drawing}
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
      </div>

      {/* Prévia */}
      {confirmedCount >= minRequired && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: totalMatches, label: 'Partidas',   color: 'text-cyan-electric' },
            { value: totalTeams,   label: 'Times',      color: 'text-white'         },
            { value: reserveCount, label: 'Reservas',   color: reserveCount > 0 ? 'text-yellow-500' : 'text-text-muted' },
          ].map(item => (
            <div key={item.label} className="text-center p-3 bg-surface-1 rounded-2xl border border-border-subtle">
              <p className={`text-2xl font-black tabular-nums ${item.color}`}>{item.value}</p>
              <p className="text-[8px] text-text-low uppercase font-black mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Botão sortear */}
      <button
        onClick={handleDraw}
        disabled={!canDraw}
        className="w-full py-5 rounded-2xl font-black uppercase italic tracking-tighter text-black flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        style={{ background: 'linear-gradient(135deg, #00f2ff, #0066ff)' }}
      >
        {drawing ? (
          <><RefreshCw size={18} className="animate-spin" /> Sorteando...</>
        ) : (
          <><RefreshCw size={18} /> Sortear Times <ChevronRight size={18} /></>
        )}
      </button>
    </div>
  );
};

export default StepConfig;
