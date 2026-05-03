import React, { useState } from 'react';
import { Shield, ShieldOff, X, AlertTriangle } from 'lucide-react';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

const POSITION_LABEL = {
  goleiro: 'Goleiro', linha: 'Linha', zagueiro: 'Zagueiro',
  lateral: 'Lateral', meia: 'Meia', atacante: 'Atacante',
  fixo: 'Fixo', ala: 'Ala', pivo: 'Pivô',
};

// Retorna quantos dias até voltar (ou null se não suspenso)
const suspensionStatus = (player) => {
  if (!player.is_suspended) return null;
  if (!player.suspension_until) return 'indefinido';
  const until = new Date(player.suspension_until);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (until < today) return null; // suspensão expirada
  const diff = Math.ceil((until - today) / 86400000);
  return `${diff} dia${diff !== 1 ? 's' : ''}`;
};

// ─── Modal para aplicar suspensão ───────────────────────────────────────────

const SuspendModal = ({ player, onClose, onConfirm }) => {
  const [days, setDays] = useState(7);
  const [indefinite, setIndefinite] = useState(false);

  const handleConfirm = () => {
    const until = indefinite ? null : (() => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return d.toISOString().split('T')[0];
    })();
    onConfirm(player.id, true, until);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/95 backdrop-blur-xl p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-[#0a0a0a] border border-red-500/20 rounded-[2.5rem] p-8 shadow-2xl space-y-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
              <AlertTriangle size={20} className="text-red-500" />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase italic">Suspender</h3>
              <p className="text-[10px] text-red-400/60 font-black uppercase">{player.display_name || player.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-xl text-white/40 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Indefinida */}
        <label className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10 cursor-pointer">
          <input
            type="checkbox"
            checked={indefinite}
            onChange={e => setIndefinite(e.target.checked)}
            className="accent-red-500 w-4 h-4"
          />
          <div>
            <p className="text-sm font-black">Suspensão indefinida</p>
            <p className="text-[10px] text-white/30">Jogador só volta quando o presidente liberar</p>
          </div>
        </label>

        {/* Seletor de dias */}
        {!indefinite && (
          <div className="space-y-3">
            <p className="text-[10px] text-white/40 uppercase font-black tracking-widest">
              Suspender por quantos dias?
            </p>
            <div className="flex items-center gap-4 p-4 bg-black/40 border border-white/10 rounded-2xl">
              <button
                onClick={() => setDays(d => Math.max(1, d - 1))}
                className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center font-black text-lg active:bg-white/20"
              >-</button>
              <span className="flex-1 text-center font-black text-3xl text-red-400">{days}</span>
              <button
                onClick={() => setDays(d => Math.min(365, d + 1))}
                className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center font-black text-lg active:bg-white/20"
              >+</button>
            </div>
            <p className="text-[9px] text-white/30 text-center">
              Volta automaticamente em {days} dia{days !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            className="py-4 bg-white/5 border border-white/10 rounded-2xl font-black uppercase text-[10px] tracking-widest"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="py-4 bg-red-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all shadow-lg shadow-red-500/20"
          >
            Suspender
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Painel principal ────────────────────────────────────────────────────────

const SuspensionPanel = ({ players, babaId, onPlayersUpdated }) => {
  const [suspendTarget, setSuspendTarget] = useState(null);
  const [loading,       setLoading]       = useState(false);

  const handleSuspend = async (playerId, suspend, until) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('players')
        .update({
          is_suspended:     suspend,
          suspension_until: until,
        })
        .eq('id', playerId)
        .eq('baba_id', babaId);

      if (error) throw error;

      toast.success(suspend ? 'Jogador suspenso!' : 'Suspensão removida!');
      onPlayersUpdated?.();
    } catch (err) {
      console.error('[SuspensionPanel]', err);
      toast.error('Erro ao atualizar suspensão');
    } finally {
      setLoading(false);
    }
  };

  const suspended   = players.filter(p => {
    if (!p.is_suspended) return false;
    if (!p.suspension_until) return true;
    return new Date(p.suspension_until) >= new Date();
  });
  const active = players.filter(p => !suspended.includes(p));

  return (
    <>
      <div className="space-y-4">

        {/* Suspensos */}
        {suspended.length > 0 && (
          <div className="space-y-3">
            <p className="text-[9px] font-black text-red-400/60 uppercase tracking-widest">
              Suspensos ({suspended.length})
            </p>
            {suspended.map(p => {
              const status = suspensionStatus(p);
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-2xl"
                >
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 font-black text-sm flex-shrink-0">
                    {(p.display_name || p.name || '?').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm truncate">{p.display_name || p.name}</p>
                    <p className="text-[9px] text-red-400/60 uppercase font-black">
                      {status === 'indefinido' ? 'Suspensão indefinida' : `Volta em ${status}`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleSuspend(p.id, false, null)}
                    disabled={loading}
                    className="p-2 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 hover:bg-green-500/20 transition-all disabled:opacity-40"
                    title="Remover suspensão"
                  >
                    <ShieldOff size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Jogadores ativos */}
        <div className="space-y-3">
          <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">
            Atletas ativos ({active.length})
          </p>
          {active.map(p => (
            <div
              key={p.id}
              className="flex items-center gap-3 p-4 bg-white/[0.03] border border-white/5 rounded-2xl"
            >
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white font-black text-sm flex-shrink-0 overflow-hidden">
                {p.avatar_url
                  ? <img src={p.avatar_url} className="w-full h-full object-cover" alt="" />
                  : (p.display_name || p.name || '?').charAt(0)
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm truncate">{p.display_name || p.name}</p>
                <p className="text-[9px] text-white/30 uppercase font-black">
                  {POSITION_LABEL[p.position] || p.position || 'Linha'}
                </p>
              </div>
              <button
                onClick={() => setSuspendTarget(p)}
                disabled={loading}
                className="p-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400/60 hover:text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-40"
                title="Suspender jogador"
              >
                <Shield size={16} />
              </button>
            </div>
          ))}
        </div>

        {players.length === 0 && (
          <div className="text-center py-10 text-white/20 font-black uppercase text-sm">
            Nenhum jogador no baba
          </div>
        )}
      </div>

      {/* Modal de suspensão */}
      {suspendTarget && (
        <SuspendModal
          player={suspendTarget}
          onClose={() => setSuspendTarget(null)}
          onConfirm={handleSuspend}
        />
      )}
    </>
  );
};

export default SuspensionPanel;
