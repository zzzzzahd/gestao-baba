// src/components/GuestManager.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Convidados avulsos do jogo — componente ÚNICO.
// Antes existiam duas cópias (StepConfig = completa, com nível; DrawConfigBlock
// na Visão Geral = incompleta, sempre nível 2). Agora as duas telas usam este.
//
// Convidado participa só deste jogo: não entra em ranking/conquistas, mas gols,
// assistências e cartões ficam no histórico da partida. O NÍVEL informado aqui
// (abaixo/média/acima) é o que o sorteio — manual ou automático — usa pra
// equilibrar os times (players.balance_level).
//
// Props:
//   babaId         id do baba
//   gameDate       data do jogo (YYYY-MM-DD) — nextGameDay.dateStr
//   confirmations  game_confirmations atuais (com .player)
//   onReload       recarrega as confirmações após mudar
//   disabled       trava tudo (ex: sorteando)
//   locked         true quando o sorteio do jogo já foi feito: só lista
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { UserPlus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

const LEVELS = [
  { value: 1, label: 'Abaixo' },
  { value: 2, label: 'Média'  },
  { value: 3, label: 'Acima'  },
];

export default function GuestManager({
  babaId,
  gameDate,
  confirmations = [],
  onReload,
  disabled = false,
  locked   = false,
}) {
  const [open,     setOpen]     = useState(false);
  const [name,     setName]     = useState('');
  const [position, setPosition] = useState('linha');
  const [level,    setLevel]    = useState(2);
  const [adding,   setAdding]   = useState(false);

  const guests = (confirmations || []).filter((c) => c.player?.is_guest);

  const handleAdd = async () => {
    if (!babaId || !gameDate) return;
    setAdding(true);
    try {
      const n     = guests.length + 1;
      const label = name.trim()
        ? `${name.trim()} - Convidado ${n}`
        : `Convidado ${String(n).padStart(2, '0')}`;

      const { data: newPlayer, error: playerErr } = await supabase
        .from('players')
        .insert([{ baba_id: babaId, name: label, position, is_guest: true, balance_level: level }])
        .select()
        .single();
      if (playerErr) throw playerErr;

      const { error: confirmErr } = await supabase
        .from('game_confirmations')
        .insert([{ baba_id: babaId, player_id: newPlayer.id, game_date: gameDate, status: 'confirmed' }]);
      if (confirmErr) throw confirmErr;

      await onReload?.();
      setName('');
      setPosition('linha');
      setLevel(2);
      toast.success(`${label} adicionado ao sorteio!`);
    } catch (err) {
      console.error('[GuestManager] add:', err);
      toast.error('Erro ao adicionar convidado');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (confirmation) => {
    try {
      await supabase.from('game_confirmations').delete().eq('id', confirmation.id);
      await supabase.from('players').delete().eq('id', confirmation.player_id);
      await onReload?.();
      toast.success('Convidado removido');
    } catch (err) {
      console.error('[GuestManager] remove:', err);
      toast.error('Erro ao remover convidado');
    }
  };

  return (
    <div className="rounded-3xl bg-surface-1 border border-border-subtle overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-2/50 transition-colors disabled:opacity-40"
      >
        <div className="flex items-center gap-2">
          <UserPlus size={14} className="text-cyan-electric" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white">
            Convidados{guests.length > 0 ? ` (${guests.length})` : ''}
          </span>
        </div>
        {open
          ? <ChevronUp   size={14} className="text-text-low" />
          : <ChevronDown size={14} className="text-text-low" />}
      </button>

      {guests.length > 0 && (
        <div className="px-5 pb-3 space-y-2">
          {guests.map((g) => (
            <div key={g.id} className="flex items-center justify-between bg-surface-2 rounded-xl px-3 py-2 border border-border-subtle">
              <span className="text-[11px] font-bold truncate">{g.player?.name}</span>
              {!locked && (
                <button
                  onClick={() => handleRemove(g)}
                  disabled={disabled}
                  className="text-text-low hover:text-red-500 transition-colors p-1 disabled:opacity-40"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="px-5 pb-5 border-t border-border-subtle pt-4 space-y-3">
          {locked ? (
            <p className="text-[10px] text-text-low font-bold leading-relaxed">
              O sorteio deste jogo já foi feito. Novos convidados só entram se o sorteio for refeito.
            </p>
          ) : !gameDate ? (
            <p className="text-[10px] text-text-low font-bold leading-relaxed">
              Não há jogo agendado — configure os dias do baba para adicionar convidados.
            </p>
          ) : (
            <>
              <p className="text-[9px] text-text-muted font-bold leading-relaxed">
                O convidado participa só deste sorteio/partida — não precisa ser integrante do baba,
                não entra nos rankings nem nas conquistas, mas gols, assistências e cartões dele ficam
                registrados no histórico da partida.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome (opcional)"
                  className="flex-1 bg-surface-2 border border-border-mid rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:border-cyan-electric transition-colors"
                />
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="bg-surface-2 border border-border-mid rounded-xl px-3 py-2.5 text-sm font-black outline-none cursor-pointer"
                >
                  <option value="linha">⚽ LINHA</option>
                  <option value="goleiro">🧤 GOL</option>
                </select>
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-text-low block mb-1.5">
                  Nível (pro equilíbrio do sorteio)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {LEVELS.map((l) => (
                    <button
                      key={l.value}
                      type="button"
                      onClick={() => setLevel(l.value)}
                      className={`py-2 rounded-xl text-[9px] font-black uppercase transition-all border ${
                        level === l.value
                          ? 'bg-cyan-electric text-black border-cyan-electric'
                          : 'bg-surface-2 text-text-low border-border-mid hover:border-border-strong'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleAdd}
                disabled={adding || disabled}
                className="w-full py-3 bg-cyan-electric/10 border border-cyan-electric/30 rounded-xl font-black text-xs uppercase tracking-[3px] text-cyan-electric active:scale-95 transition-transform disabled:opacity-40"
              >
                {adding ? 'Adicionando...' : '+ Adicionar convidado'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
