// src/components/WaitlistPanel.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Lista de espera do baba.
// - Mostra jogadores com status = 'waitlist' em ordem de posição
// - Presidente pode promover manualmente (RPC promote_from_waitlist)
// - Promoção automática já ocorre via trigger no banco (promote_waitlist)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { Clock, ArrowUp, Users } from 'lucide-react';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

const WaitlistPanel = ({ gameConfirmations = [], isPresident = false, onUpdate }) => {
  const [promoting, setPromoting] = useState(null);

  const waitlist = [...gameConfirmations]
    .filter(c => c.status === 'waitlist')
    .sort((a, b) => (a.position ?? 999) - (b.position ?? 999));

  const confirmed = gameConfirmations.filter(c => c.status === 'confirmed');

  if (waitlist.length === 0) return null;

  const handlePromote = async (confirmationId, playerName) => {
    if (!isPresident || promoting) return;
    setPromoting(confirmationId);
    try {
      const { error } = await supabase.rpc('promote_from_waitlist', {
        p_confirmation_id: confirmationId,
      });
      if (error) throw error;
      toast.success(`${playerName} promovido para confirmado!`);
      onUpdate?.();
    } catch (err) {
      console.error('[WaitlistPanel] promote:', err);
      toast.error(err.message || 'Erro ao promover jogador');
    } finally {
      setPromoting(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Clock size={13} className="text-yellow-500" />
          <span className="text-[10px] font-black text-text-low uppercase tracking-widest">
            Lista de Espera
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[9px] font-black text-text-muted uppercase">
          <Users size={10} />
          <span>{confirmed.length} confirmados · {waitlist.length} aguardando</span>
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {waitlist.map((conf, idx) => {
          const playerName = conf.player?.name || conf.player?.display_name || 'Jogador';
          const avatarUrl  = conf.player?.avatar_url || conf.player?.profile?.avatar_url;
          const isPromoting = promoting === conf.id;

          return (
            <div
              key={conf.id}
              className="flex items-center gap-3 p-3 rounded-2xl bg-surface-1 border border-yellow-500/10"
            >
              {/* Posição */}
              <span className="w-5 text-center text-[10px] font-black text-yellow-500/60 tabular-nums shrink-0">
                {idx + 1}º
              </span>

              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-surface-2 border border-border-subtle overflow-hidden shrink-0 flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={playerName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] font-black text-text-muted">
                    {playerName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Nome */}
              <span className="flex-1 text-[11px] font-black uppercase truncate text-text-mid">
                {playerName}
              </span>

              {/* Badge espera */}
              <span className="text-[8px] font-black uppercase text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full shrink-0">
                Aguardando
              </span>

              {/* Botão promover (apenas presidente) */}
              {isPresident && (
                <button
                  onClick={() => handlePromote(conf.id, playerName)}
                  disabled={!!promoting}
                  className="p-2 bg-cyan-electric/10 border border-cyan-electric/20 rounded-xl text-cyan-electric hover:bg-cyan-electric hover:text-black transition-all disabled:opacity-40 shrink-0"
                  title="Promover para confirmado"
                >
                  {isPromoting ? (
                    <span className="w-4 h-4 border-2 border-cyan-electric border-t-transparent rounded-full animate-spin block" />
                  ) : (
                    <ArrowUp size={14} />
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Nota informativa */}
      <p className="text-[9px] text-text-muted font-bold px-1">
        {isPresident
          ? 'Jogadores são promovidos automaticamente quando alguém cancela. Você também pode promover manualmente.'
          : 'Você será chamado automaticamente se uma vaga abrir.'}
      </p>
    </div>
  );
};

export default WaitlistPanel;
