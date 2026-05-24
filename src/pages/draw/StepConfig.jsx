// src/pages/draw/StepConfig.jsx
// Sprint 3/16 — Adiciona sons no sorteio + constraints existentes.

import React, { useState } from 'react';
import { Users, RefreshCw, ChevronRight, Settings2, ChevronDown, ChevronUp } from 'lucide-react';
import { useBaba }               from '../../contexts/BabaContext';
import { supabase }              from '../../services/supabase';
import Tooltip                   from '../../components/Tooltip';
import DrawConstraintsPanel      from '../../components/DrawConstraintsPanel';
import { Sounds }                from '../../utils/sounds';
import toast                     from 'react-hot-toast';

const STRATEGIES = [
  { id: 'reserve',    label: 'Reserva',    tip: 'Jogadores que não cabem nos times ficam de reserva.'   },
  { id: 'substitute', label: 'Incompleto', tip: 'Times são formados mesmo com menos jogadores.'          },
];

// ─── Algoritmo de sorteio balanceado ─────────────────────────────────────────

const drawTeamsWithConstraints = (players, playersPerTeam, strategy, constraints = []) => {
  const sorted     = [...players].sort((a, b) => (b.final_rating || 0) - (a.final_rating || 0));
  const totalTeams = Math.floor(sorted.length / playersPerTeam);
  const teams      = Array.from({ length: totalTeams }, (_, i) => ({
    name:    `Time ${String.fromCharCode(65 + i)}`,
    players: [],
  }));

  sorted.forEach((player, idx) => {
    const round = Math.floor(idx / totalTeams);
    const pos   = round % 2 === 0 ? idx % totalTeams : totalTeams - 1 - (idx % totalTeams);
    if (teams[pos]) teams[pos].players.push(player);
  });

  const getTeamOf = (pid) => teams.findIndex(t => t.players.some(p => p.id === pid));

  const swapPlayers = (tAIdx, pAId, tBIdx, pBId) => {
    const pA = teams[tAIdx].players.find(p => p.id === pAId);
    const pB = teams[tBIdx].players.find(p => p.id === pBId);
    if (!pA || !pB) return false;
    teams[tAIdx].players = teams[tAIdx].players.filter(p => p.id !== pAId);
    teams[tBIdx].players = teams[tBIdx].players.filter(p => p.id !== pBId);
    teams[tAIdx].players.push(pB);
    teams[tBIdx].players.push(pA);
    return true;
  };

  constraints.forEach(({ player_a_id, player_b_id, constraint_type }) => {
    const tA = getTeamOf(player_a_id);
    const tB = getTeamOf(player_b_id);
    if (tA === -1 || tB === -1) return;

    if (constraint_type === 'must_together' && tA !== tB) {
      const playerBObj   = teams[tB].players.find(p => p.id === player_b_id);
      const ratingTarget = playerBObj?.final_rating || 0;
      const candidates   = teams[tA].players
        .filter(p => p.id !== player_a_id)
        .sort((a, b) => Math.abs((a.final_rating || 0) - ratingTarget) - Math.abs((b.final_rating || 0) - ratingTarget));
      if (candidates[0]) swapPlayers(tA, candidates[0].id, tB, player_b_id);
    }

    if (constraint_type === 'must_apart' && tA === tB) {
      const playerBObj   = teams[tA].players.find(p => p.id === player_b_id);
      const ratingTarget = playerBObj?.final_rating || 0;
      const otherTeamIdx = (tA + 1) % totalTeams;
      const candidates   = teams[otherTeamIdx].players
        .sort((a, b) => Math.abs((a.final_rating || 0) - ratingTarget) - Math.abs((b.final_rating || 0) - ratingTarget));
      if (candidates[0]) swapPlayers(tA, player_b_id, otherTeamIdx, candidates[0].id);
    }
  });

  const reserves = strategy === 'reserve'
    ? sorted.slice(totalTeams * playersPerTeam)
    : [];

  return { teams, reserves };
};

// ─── StepConfig ───────────────────────────────────────────────────────────────

const StepConfig = ({ drawConfig, setDrawConfig, onNext }) => {
  const { currentBaba, gameConfirmations, players, isDrawing } = useBaba();
  const [drawing,         setDrawing]         = useState(false);
  const [showConstraints, setShowConstraints] = useState(false);

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
    Sounds.click();
  };

  const handleDraw = async () => {
    if (!canDraw) return;
    setDrawing(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data: existing } = await supabase
        .from('draw_results').select('*')
        .eq('baba_id', currentBaba.id).eq('draw_date', today)
        .limit(1).maybeSingle();

      if (existing?.teams?.length >= 2) {
        Sounds.unlock();
        onNext({ teams: existing.teams, reserves: existing.reserves || [] });
        return;
      }

      const { data: constraints } = await supabase.rpc('get_draw_constraints', {
        p_baba_id: currentBaba.id,
      });

      const confirmedIds     = gameConfirmations.map(c => c.player_id);
      const confirmedPlayers = players
        .filter(p => confirmedIds.includes(p.id))
        .map(p => ({ ...p, final_rating: p.final_rating || 3 }));

      const { teams, reserves } = drawTeamsWithConstraints(
        confirmedPlayers,
        safeConfig.playersPerTeam,
        safeConfig.strategy,
        constraints || [],
      );

      const avgRatings   = teams.map(t =>
        t.players.reduce((s, p) => s + (p.final_rating || 0), 0) / (t.players.length || 1)
      );
      const balanceScore = avgRatings.length > 1
        ? Math.max(...avgRatings) - Math.min(...avgRatings)
        : 0;

      await supabase.from('draw_results').upsert({
        baba_id:          currentBaba.id,
        draw_date:        today,
        teams,
        reserves,
        draw_config:      safeConfig,
        algorithm:        'balanced_snake',
        constraints_used: constraints || [],
        balance_score:    Math.round(balanceScore * 100) / 100,
        teams_snapshot:   teams,
      }, { onConflict: 'baba_id,draw_date' });

      // Sprint 3 — som de sorteio
      Sounds.unlock();
      toast.success('Times sorteados! ⚡');
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
                onClick={() => { setDrawConfig(prev => ({ ...prev, strategy: s.id })); Sounds.click(); }}
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

      {/* Restrições */}
      <div className="rounded-3xl bg-surface-1 border border-border-subtle overflow-hidden">
        <button
          onClick={() => setShowConstraints(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-2/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Settings2 size={14} className="text-text-low" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white">
              Restrições de sorteio
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-text-muted uppercase">Juntos / Separados</span>
            {showConstraints
              ? <ChevronUp   size={14} className="text-text-low" />
              : <ChevronDown size={14} className="text-text-low" />}
          </div>
        </button>
        {showConstraints && (
          <div className="px-5 pb-5 border-t border-border-subtle pt-4">
            <DrawConstraintsPanel />
          </div>
        )}
      </div>

      {/* Prévia */}
      {confirmedCount >= minRequired && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: totalMatches, label: 'Partidas',  color: 'text-cyan-electric'                               },
            { value: totalTeams,   label: 'Times',     color: 'text-white'                                       },
            { value: reserveCount, label: 'Reservas',  color: reserveCount > 0 ? 'text-yellow-500' : 'text-text-muted' },
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
