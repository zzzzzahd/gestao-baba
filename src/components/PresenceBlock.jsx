// src/components/PresenceBlock.jsx
// Sprint 10 — Confirmação de presença com RPCs atômicas confirm_presence/cancel_presence.
// Exibe confirmados, fila de espera, countdown e botões de ação.

import React, { useState } from 'react';
import { Clock, Users, CheckCircle2, XCircle, Hourglass, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatCountdown = (cd) => {
  if (!cd?.active) return null;
  const hh = String(cd.h).padStart(2, '0');
  const mm = String(cd.m).padStart(2, '0');
  const ss = String(cd.s).padStart(2, '0');
  return cd.d > 0 ? `${cd.d}d ${hh}h ${mm}m` : `${hh}:${mm}:${ss}`;
};

const Avatar = ({ name, avatarUrl, size = 'sm' }) => {
  const sz = size === 'sm' ? 'w-6 h-6 text-[9px]' : 'w-8 h-8 text-[10px]';
  return (
    <div className={`${sz} rounded-full bg-surface-3 border border-border-mid flex items-center justify-center overflow-hidden flex-shrink-0`}>
      {avatarUrl
        ? <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        : <span className="font-black text-text-low">{(name || '?')[0].toUpperCase()}</span>
      }
    </div>
  );
};

// ── Componente principal ──────────────────────────────────────────────────────

const PresenceBlock = ({
  nextGameDay,
  gameConfirmations,
  myConfirmation,
  canConfirm,
  countdown,
  loading,
  drawConfig,
  currentBaba,
  onReload,
}) => {
  const [acting,        setActing]        = useState(false);
  const [showWaitlist,  setShowWaitlist]  = useState(false);

  const minRequired    = (drawConfig?.playersPerTeam || 5) * 2;
  const confirmed      = gameConfirmations?.filter(c => c.status === 'confirmed') || [];
  const waitlist       = gameConfirmations?.filter(c => c.status === 'waitlist')
                           .sort((a, b) => (a.position || 0) - (b.position || 0)) || [];
  const confirmedCount = confirmed.length;
  const waitlistCount  = waitlist.length;
  const gameTime       = nextGameDay?.time?.substring(0, 5) || '--:--';
  const cdStr          = formatCountdown(countdown);
  const isUrgent       = countdown?.active && countdown.d === 0 && countdown.h === 0 && countdown.m < 5;

  const myStatus = myConfirmation?.status || null; // 'confirmed' | 'waitlist' | null
  const myPos    = myConfirmation?.position || null;

  // Progresso até o mínimo
  const progressPct = Math.min(100, (confirmedCount / minRequired) * 100);

  const handleConfirm = async () => {
    if (!currentBaba || !nextGameDay) return;
    setActing(true);
    try {
      const { data, error } = await supabase.rpc('confirm_presence', {
        p_baba_id:   currentBaba.id,
        p_game_date: nextGameDay.dateStr,
      });
      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
      } else if (data?.status === 'waitlist') {
        toast(`Você está na fila de espera — ${data.position}º lugar`, { icon: '⏳' });
      } else {
        toast.success('Presença confirmada! ✅');
      }
      onReload?.();
    } catch (err) {
      console.error('[PresenceBlock] confirm:', err);
      toast.error('Erro ao confirmar');
    } finally {
      setActing(false);
    }
  };

  const handleCancel = async () => {
    if (!currentBaba || !nextGameDay) return;
    setActing(true);
    try {
      const { data, error } = await supabase.rpc('cancel_presence', {
        p_baba_id:   currentBaba.id,
        p_game_date: nextGameDay.dateStr,
      });
      if (error) throw error;

      if (data?.promoted_player_id) {
        toast.success('Presença cancelada — próximo da fila foi promovido');
      } else {
        toast.success('Presença cancelada');
      }
      onReload?.();
    } catch (err) {
      console.error('[PresenceBlock] cancel:', err);
      toast.error('Erro ao cancelar');
    } finally {
      setActing(false);
    }
  };

  if (!nextGameDay) return null;

  return (
    <div className="space-y-3">

      {/* Cabeçalho: confirmados + horário */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Users size={13} className="text-cyan-electric" />
          <span className="text-[11px] font-black text-text-mid uppercase tracking-widest">
            <span className="text-white">{confirmedCount}</span> confirmados
            {confirmedCount < minRequired && (
              <span className="text-text-low"> · faltam {minRequired - confirmedCount}</span>
            )}
            {waitlistCount > 0 && (
              <span className="text-yellow-400"> · {waitlistCount} na fila</span>
            )}
          </span>
        </div>
        <span className="text-[11px] font-black text-cyan-electric">{gameTime}</span>
      </div>

      {/* Barra de progresso */}
      <div className="h-1 bg-surface-2 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            progressPct >= 100 ? 'bg-green-400' : 'bg-cyan-electric'
          }`}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Avatares dos confirmados */}
      {confirmed.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {confirmed.slice(0, 12).map(c => (
            <Avatar
              key={c.conf_id || c.id || c.player_id}
              name={c.player_name || c.player?.name}
              avatarUrl={c.avatar_url || c.player?.profile?.avatar_url}
            />
          ))}
          {confirmed.length > 12 && (
            <span className="text-[9px] font-black text-text-low ml-1">+{confirmed.length - 12}</span>
          )}
        </div>
      )}

      {/* Countdown urgente */}
      {cdStr && isUrgent && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
          <Clock size={12} className="text-red-400 animate-pulse" />
          <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">
            Encerra em {cdStr}
          </span>
        </div>
      )}

      {/* Estado do usuário */}
      {myStatus === 'confirmed' && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20">
          <CheckCircle2 size={14} className="text-green-400" />
          <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">
            Você está confirmado
          </span>
        </div>
      )}

      {myStatus === 'waitlist' && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <Hourglass size={14} className="text-yellow-400" />
          <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">
            Fila de espera — {myPos}º lugar
          </span>
        </div>
      )}

      {/* Botões de ação */}
      {canConfirm && (
        <div className="flex gap-2">
          {!myStatus ? (
            <button
              onClick={handleConfirm}
              disabled={acting || loading}
              className="flex-1 py-3 rounded-xl bg-cyan-electric text-black text-[11px] font-black uppercase tracking-widest hover:bg-cyan-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {acting
                ? <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                : <CheckCircle2 size={14} />
              }
              {acting ? 'Confirmando...' : 'Confirmar presença'}
            </button>
          ) : (
            <button
              onClick={handleCancel}
              disabled={acting || loading}
              className="flex-1 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {acting
                ? <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                : <XCircle size={14} />
              }
              {acting ? 'Cancelando...' : 'Cancelar presença'}
            </button>
          )}
        </div>
      )}

      {!canConfirm && !myStatus && (
        <div className="px-3 py-2 rounded-xl bg-surface-1 border border-border-subtle text-center">
          <p className="text-[10px] font-black text-text-low uppercase tracking-widest">
            Confirmações encerradas
          </p>
        </div>
      )}

      {/* Fila de espera expansível */}
      {waitlistCount > 0 && (
        <div>
          <button
            onClick={() => setShowWaitlist(v => !v)}
            className="flex items-center gap-1.5 text-[10px] font-black text-yellow-400/70 uppercase tracking-widest hover:text-yellow-400 transition-colors"
          >
            {showWaitlist ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Lista de espera ({waitlistCount})
          </button>

          {showWaitlist && (
            <div className="mt-2 space-y-1.5">
              {waitlist.map((c, i) => (
                <div
                  key={c.conf_id || c.id || c.player_id}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-yellow-500/5 border border-yellow-500/10"
                >
                  <span className="text-[10px] font-black text-yellow-400/60 w-4">{i + 1}º</span>
                  <Avatar
                    name={c.player_name || c.player?.name}
                    avatarUrl={c.avatar_url || c.player?.profile?.avatar_url}
                  />
                  <span className="text-[10px] font-black text-text-mid truncate">
                    {c.player_name || c.player?.name || 'Jogador'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PresenceBlock;
