// src/components/DrawConfigBlock.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Configuração do sorteio automático (visível apenas para o presidente).
// Extraído do DashboardPage (Fase 2, Tarefa 2.4).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { Settings2, UserPlus, X } from 'lucide-react';
import Tooltip from './Tooltip';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

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
  currentBaba,
  onReload,
}) => {
  const safeConfig     = drawConfig || { playersPerTeam: 5, strategy: 'reserve' };
  const confirmedCount = gameConfirmations?.length || 0;
  const minRequired    = safeConfig.playersPerTeam * 2;
  const totalTeams     = Math.floor(confirmedCount / safeConfig.playersPerTeam);
  const totalMatches   = Math.floor(totalTeams / 2);
  const reserves       = confirmedCount % safeConfig.playersPerTeam
    + (totalTeams % 2) * safeConfig.playersPerTeam;

  const guests = (gameConfirmations || []).filter(c => c.player?.is_guest);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestName,     setGuestName]     = useState('');
  const [guestPosition, setGuestPosition] = useState('linha');
  const [guestLevel,    setGuestLevel]    = useState(2);
  const [addingGuest,   setAddingGuest]   = useState(false);

  const handleAddGuest = async () => {
    if (!currentBaba || !nextGameDay) return;
    setAddingGuest(true);
    try {
      const n     = guests.length + 1;
      const label = guestName.trim()
        ? `${guestName.trim()} - Convidado ${n}`
        : `Convidado ${String(n).padStart(2, '0')}`;

      const { data: newPlayer, error: playerErr } = await supabase
        .from('players')
        .insert([{ baba_id: currentBaba.id, name: label, position: guestPosition, is_guest: true, balance_level: guestLevel }])
        .select().single();
      if (playerErr) throw playerErr;

      const { error: confirmErr } = await supabase
        .from('game_confirmations')
        .insert([{ baba_id: currentBaba.id, player_id: newPlayer.id, game_date: nextGameDay.dateStr, status: 'confirmed' }]);
      if (confirmErr) throw confirmErr;

      await onReload?.();
      setGuestName('');
      setGuestPosition('linha');
      setGuestLevel(2);
      setShowGuestForm(false);
      toast.success(`${label} adicionado!`);
    } catch (err) {
      console.error('[DrawConfigBlock] addGuest error:', err);
      toast.error('Erro ao adicionar convidado');
    } finally {
      setAddingGuest(false);
    }
  };

  const handleRemoveGuest = async (confirmation) => {
    try {
      await supabase.from('game_confirmations').delete().eq('id', confirmation.id);
      await supabase.from('players').delete().eq('id', confirmation.player_id);
      await onReload?.();
      toast.success('Convidado removido');
    } catch (err) {
      console.error('[DrawConfigBlock] removeGuest error:', err);
      toast.error('Erro ao remover convidado');
    }
  };

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
            Sorteio de Hoje
          </span>
          <Tooltip
            title="Sorteio de hoje"
            text="Ajustes válidos só para a partida de hoje. Para ligar o sorteio automático e definir o horário padrão, use Configurações › Sorteio Automático."
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

      {/* Convidados — funciona tanto no sorteio manual quanto no automático,
          já que quando o automático está ligado o presidente não passa mais
          pelo assistente de sorteio (StepConfig) pra chegar aqui. */}
      <div className="rounded-2xl bg-surface-2 border border-border-subtle overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-[10px] font-black uppercase text-text-mid">
            Convidados {guests.length > 0 && `(${guests.length})`}
          </span>
          <button
            onClick={() => setShowGuestForm(v => !v)}
            className="flex items-center gap-1 text-[10px] font-black uppercase text-cyan-electric"
          >
            <UserPlus size={12} /> Adicionar
          </button>
        </div>

        {guests.length > 0 && (
          <div className="px-4 pb-3 space-y-1.5">
            {guests.map(g => (
              <div key={g.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-surface-3 text-[10px] font-bold">
                <span className="truncate">{g.player?.name}</span>
                <button onClick={() => handleRemoveGuest(g)} className="text-text-low hover:text-red-400">
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {showGuestForm && (
          <div className="px-4 pb-4 space-y-2.5 border-t border-border-subtle pt-3">
            <input
              value={guestName}
              onChange={e => setGuestName(e.target.value)}
              placeholder="Nome (opcional)"
              className="w-full bg-surface-3 border border-border-mid rounded-xl px-3 py-2 text-[11px] font-bold text-white placeholder:text-text-muted outline-none focus:border-cyan-electric"
            />
            <div className="flex gap-2">
              {['linha', 'goleiro'].map(pos => (
                <button
                  key={pos}
                  onClick={() => setGuestPosition(pos)}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase border ${
                    guestPosition === pos
                      ? 'bg-cyan-electric text-black border-cyan-electric'
                      : 'bg-surface-3 text-text-low border-border-mid'
                  }`}
                >
                  {pos === 'linha' ? 'Linha' : 'Goleiro'}
                </button>
              ))}
            </div>
            <button
              onClick={handleAddGuest}
              disabled={addingGuest}
              className="w-full py-2.5 bg-cyan-electric text-black rounded-xl font-black text-[10px] uppercase disabled:opacity-50"
            >
              {addingGuest ? 'Adicionando...' : 'Confirmar convidado'}
            </button>
            <p className="text-[8px] text-text-muted font-bold text-center">
              Convidado sempre entra marcado como convidado — não conta pro ranking.
            </p>
          </div>
        )}
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
