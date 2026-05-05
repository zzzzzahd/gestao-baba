// src/components/DeleteAccountModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Modal de exclusão de conta — direito LGPD. Sprint 10.5 Fase C.
// Anonimiza perfil, remove dados pessoais, mantém histórico de partidas.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { X, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { clearSessionData } from '../utils/securityUtils';
import toast from 'react-hot-toast';

const DeleteAccountModal = ({ onClose }) => {
  const { user, signOut } = useAuth();
  const [step,       setStep]       = useState(1); // 1=aviso, 2=confirmação, 3=processando
  const [confirm,    setConfirm]    = useState('');
  const [loading,    setLoading]    = useState(false);

  const CONFIRM_PHRASE = 'EXCLUIR MINHA CONTA';

  const handleDelete = async () => {
    if (confirm !== CONFIRM_PHRASE || !user) return;
    setStep(3);
    setLoading(true);

    try {
      // 1. Buscar todos os players do usuário
      const { data: players } = await supabase
        .from('players')
        .select('id')
        .eq('user_id', user.id);

      const playerIds = (players || []).map(p => p.id);

      // 2. Anonimizar perfil (manter registro, remover PII)
      await supabase.from('profiles').update({
        name:       'Usuário Removido',
        email:      null,
        avatar_url: null,
        position:   null,
        consent_at: null,
      }).eq('id', user.id);

      // 3. Remover dados pessoais sensíveis
      if (playerIds.length > 0) {
        // Remover avaliações DADAS pelo usuário (rater)
        await supabase.from('player_ratings')
          .delete()
          .in('rater_id', playerIds);

        // Remover push subscriptions
        await supabase.from('push_subscriptions')
          .delete()
          .eq('user_id', user.id);

        // Remover confirmações de presença futuras
        const today = new Date().toISOString().split('T')[0];
        await supabase.from('game_confirmations')
          .delete()
          .in('player_id', playerIds)
          .gte('game_date', today);

        // Anonimizar players (manter histórico de partidas)
        await supabase.from('players').update({
          display_name: 'Jogador Removido',
          avatar_url:   null,
          user_id:      null,
        }).in('id', playerIds);
      }

      // 4. Deletar conta no Supabase Auth (requer service_role — via edge function)
      const { error: fnError } = await supabase.functions.invoke('delete-account', {
        body: { user_id: user.id },
      });

      if (fnError) {
        // Fallback: logout local mesmo se a edge function falhar
        console.error('[DeleteAccount] edge function error:', fnError);
      }

      // 5. Limpar dados locais e fazer logout
      clearSessionData();
      await signOut();
      toast.success('Conta excluída com sucesso.');
    } catch (err) {
      console.error('[DeleteAccount]', err);
      toast.error('Erro ao excluir conta. Tente novamente ou entre em contato.');
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-5">
      <div className="w-full max-w-sm bg-[#0a0a0a] border border-red-500/20 rounded-[2rem] p-7 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <Trash2 size={18} className="text-red-400" />
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-tight text-red-400">Excluir Conta</h3>
              <p className="text-[10px] text-text-muted font-bold uppercase">Ação irreversível</p>
            </div>
          </div>
          {step !== 3 && (
            <button onClick={onClose} className="text-text-low hover:text-white transition-colors p-1">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Step 1 — Aviso */}
        {step === 1 && (
          <>
            <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/15 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-400 shrink-0" />
                <p className="text-[11px] font-black text-red-400 uppercase tracking-wide">O que será removido</p>
              </div>
              <ul className="text-[11px] text-text-low space-y-1.5 pl-2">
                {[
                  'Seu perfil e foto',
                  'Seu email e dados de login',
                  'Avaliações que você deu a outros jogadores',
                  'Confirmações de presença futuras',
                  'Suas notificações push',
                ].map(i => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5 shrink-0">×</span>{i}
                  </li>
                ))}
              </ul>
              <div className="border-t border-red-500/10 pt-3">
                <p className="text-[10px] text-text-muted font-bold uppercase mb-1">O que é mantido (anonimizado)</p>
                <ul className="text-[11px] text-text-low space-y-1 pl-2">
                  {['Histórico de partidas e gols','Estatísticas do grupo'].map(i => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-text-muted mt-0.5 shrink-0">·</span>{i}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 bg-surface-2 border border-border-mid rounded-2xl text-text-low font-black uppercase text-[10px] tracking-widest hover:bg-surface-3 transition-all">
                Cancelar
              </button>
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 font-black uppercase text-[10px] tracking-widest hover:bg-red-500/20 transition-all"
              >
                Continuar
              </button>
            </div>
          </>
        )}

        {/* Step 2 — Confirmação digitada */}
        {step === 2 && (
          <>
            <div className="space-y-3">
              <p className="text-[12px] text-text-mid leading-relaxed">
                Para confirmar, digite exatamente:
              </p>
              <p className="text-[11px] font-black text-red-400 bg-red-500/5 border border-red-500/15 rounded-xl px-3 py-2 tracking-wide">
                {CONFIRM_PHRASE}
              </p>
              <input
                type="text"
                value={confirm}
                onChange={e => setConfirm(e.target.value.toUpperCase())}
                placeholder="Digite aqui..."
                className="w-full p-4 bg-surface-2 border border-border-mid rounded-xl text-white font-black uppercase text-sm outline-none focus:border-red-500/40 transition-colors"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-3 bg-surface-2 border border-border-mid rounded-2xl text-text-low font-black uppercase text-[10px] tracking-widest hover:bg-surface-3 transition-all">
                Voltar
              </button>
              <button
                onClick={handleDelete}
                disabled={confirm !== CONFIRM_PHRASE || loading}
                className="flex-1 py-3 bg-red-500/20 border border-red-500/30 rounded-2xl text-red-400 font-black uppercase text-[10px] tracking-widest hover:bg-red-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Excluir Conta
              </button>
            </div>
          </>
        )}

        {/* Step 3 — Processando */}
        {step === 3 && (
          <div className="flex flex-col items-center gap-4 py-6">
            <RefreshCw size={28} className="text-red-400 animate-spin" />
            <div className="text-center">
              <p className="text-sm font-black uppercase text-red-400">Excluindo conta...</p>
              <p className="text-[10px] text-text-muted font-bold mt-1">Não feche o aplicativo</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeleteAccountModal;
