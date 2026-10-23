// src/pages/draw/StepConfig.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Wizard /draw — Step 1: Configuração + sorteio MANUAL.
//
// Não tem mais algoritmo próprio: sorteia via drawService.executeDraw(), o
// mesmo caminho do sorteio automático (cliente e Edge Function usam o mesmo
// utils/drawAlgorithm.js). Os valores iniciais (jogadores por time, suplentes)
// vêm do padrão do baba — aqui o presidente só ajusta pra ESTE sorteio.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { Users, RefreshCw, ChevronRight, Settings2, ChevronDown, ChevronUp } from 'lucide-react';
import { useBaba }               from '../../contexts/BabaContext';
import { useFeatures }           from '../../utils/babaMode';
import Tooltip                   from '../../components/Tooltip';
import DrawConstraintsPanel      from '../../components/DrawConstraintsPanel';
import GuestManager              from '../../components/GuestManager';
import ConfirmModal              from '../../components/ConfirmModal';
import {
  executeDraw,
  getDrawDefaults,
  describeStrategy,
  isCountedConfirmation,
  getMinRequired,
} from '../../services/drawService';
import { Sounds }                from '../../utils/sounds';
import toast                     from 'react-hot-toast';

const STRATEGIES = [
  { id: 'reserve',    label: 'Reserva',    tip: 'Jogadores que não cabem nos times ficam de reserva.'   },
  { id: 'substitute', label: 'Incompleto', tip: 'Times são formados mesmo com menos jogadores.'          },
];

const StepConfig = ({ drawConfig, setDrawConfig, onNext }) => {
  const { currentBaba, gameConfirmations, nextGameDay, reloadConfirmations, getAllRatings } = useBaba();
  const features = useFeatures();
  const [drawing,         setDrawing]         = useState(false);
  const [showConstraints, setShowConstraints] = useState(false);
  const [confirmRedraw,   setConfirmRedraw]   = useState(false);

  const safeConfig = drawConfig || { playersPerTeam: 5, strategy: 'reserve' };
  const defaults   = getDrawDefaults(currentBaba);
  const isDefault  = safeConfig.playersPerTeam === defaults.playersPerTeam
                  && safeConfig.strategy       === defaults.strategy;

  // Só conta quem está confirmado — lista de espera não entra no sorteio.
  const confirmedCount = (gameConfirmations || []).filter(isCountedConfirmation).length;

  // 'reserve': cada time precisa de +1 vaga própria de reserva pra se formar
  // (ver lineCapacityPerTeam em drawAlgorithm.js). Sem contar isso, o "mínimo
  // pra sortear" ficava subestimado e StepMatch travava em "Preparando
  // partida..." (exige 2+ times).
  const minRequired   = getMinRequired(safeConfig);
  const totalTeams    = Math.floor(confirmedCount / safeConfig.playersPerTeam);
  const totalMatches  = Math.floor(totalTeams / 2);
  const reserveCount  = confirmedCount % safeConfig.playersPerTeam
    + (totalTeams % 2) * safeConfig.playersPerTeam;
  const canDraw       = confirmedCount >= minRequired && !drawing;

  const handleDelta = (delta) => {
    const next = Math.max(2, Math.min(11, safeConfig.playersPerTeam + delta));
    setDrawConfig(prev => ({ ...prev, playersPerTeam: next }));
    Sounds.click();
  };

  const handleDraw = async (force = false) => {
    if (!canDraw) return;
    setDrawing(true);
    try {
      // Data do PRÓXIMO JOGO, não "hoje": as confirmações (incluindo
      // convidados) vivem sob nextGameDay.dateStr.
      const dateStr = nextGameDay?.dateStr || new Date().toISOString().split('T')[0];

      const result = await executeDraw({
        baba:          currentBaba,
        dateStr,
        confirmations: gameConfirmations || [],
        drawConfig:    safeConfig,
        getRatings:    getAllRatings,
        force,
        source:        'manual',
      });

      if (!result.ok) {
        toast.error(
          result.code === 'insufficient'
            ? `Faltam confirmados: precisa de ${result.needed}, tem ${result.have}.`
            : 'Sem jogadores suficientes confirmados pra esse jogo — confere as confirmações antes de sortear.'
        );
        return;
      }

      Sounds.unlock();
      if (!result.reused) {
        toast.success('Times sorteados! ⚡');
        if (result.constraintsSkipped) {
          toast('As restrições de sorteio não puderam ser carregadas — sorteio feito sem elas.', { icon: '⚠️' });
        }
      }
      onNext(result.session);
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

      {/* Convidados avulsos — componente único (também usado em Gestão) */}
      <GuestManager
        babaId={currentBaba?.id}
        gameDate={nextGameDay?.dateStr}
        confirmations={gameConfirmations}
        onReload={reloadConfirmations}
        disabled={drawing}
      />

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

        {/* Padrão do baba — o que o sorteio automático usa */}
        {!isDefault && (
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-border-subtle">
            <p className="text-[9px] text-text-muted font-bold leading-relaxed">
              Ajuste só para este sorteio. Padrão do baba: {defaults.playersPerTeam} por time · {describeStrategy(defaults.strategy)}.
            </p>
            <button
              onClick={() => { setDrawConfig(defaults); Sounds.click(); }}
              disabled={drawing}
              className="shrink-0 text-[9px] font-black uppercase text-cyan-electric underline underline-offset-2 disabled:opacity-40"
            >
              Usar padrão
            </button>
          </div>
        )}
      </div>

      {/* Restrições — Fase 2: "sorteio com restrições" é recurso de Assinante.
          Os mesmos pares valem pro sorteio automático (lidos do banco). */}
      {features.drawConstraints && (
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
      )}

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
        onClick={() => handleDraw(false)}
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

      {/* Se já existe um sorteio em andamento, o botão principal só reabre ele
          (evita sorteio duplicado sem querer). Esse aqui força um sorteio novo
          de verdade — útil pra corrigir um sorteio errado sem precisar
          encerrar o baba primeiro. */}
      {canDraw && (
        <button
          onClick={() => setConfirmRedraw(true)}
          disabled={drawing}
          className="w-full py-2.5 text-[9px] font-black uppercase tracking-widest text-text-muted hover:text-cyan-electric transition-colors disabled:opacity-30"
        >
          Sortear de novo (ignora o sorteio atual)
        </button>
      )}

      <ConfirmModal
        open={confirmRedraw}
        message="Sortear de novo?"
        description="Isso apaga as partidas já jogadas hoje (placar, fila, gols) e sorteia os times do zero."
        confirmLabel="Sortear de novo"
        cancelLabel="Cancelar"
        danger
        onConfirm={() => handleDraw(true)}
        onCancel={() => setConfirmRedraw(false)}
      />
    </div>
  );
};

export default StepConfig;
