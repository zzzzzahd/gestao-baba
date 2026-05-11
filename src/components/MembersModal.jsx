// src/components/MembersModal.jsx
// Corrigido: botão de visitar perfil público de cada membro,
// suspensão inline, nomear coordenador, badge de papel.

import React, { useState, useEffect, useCallback } from 'react';
import { X, Star, Shield, ShieldOff, ShieldCheck, Crown, ChevronDown, AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { POSITION_LABEL } from '../utils/constants';
import { supabase } from '../services/supabase';
import { useAuth }  from '../contexts/AuthContext';
import toast        from 'react-hot-toast';

// ── Modal de suspensão ────────────────────────────────────────────────────────

const SuspendSheet = ({ player, onClose, onConfirm }) => {
  const [days,       setDays]       = useState(7);
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
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/95 backdrop-blur-xl p-6" onClick={onClose}>
      <div className="w-full max-w-sm bg-[#0a0a0a] border border-red-500/20 rounded-[2.5rem] p-8 shadow-2xl space-y-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <AlertTriangle size={18} className="text-red-400" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-red-400 tracking-widest">Suspender</p>
              <p className="text-sm font-black text-white">{player.display_name || player.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-surface-2 text-text-low hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <button
              onClick={() => setIndefinite(v => !v)}
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                indefinite ? 'bg-red-500 border-red-500' : 'border-border-high bg-surface-2'
              }`}
            >
              {indefinite && <X size={10} className="text-white" strokeWidth={3} />}
            </button>
            <span className="text-xs font-black text-white">Suspensão indefinida</span>
          </label>

          {!indefinite && (
            <div>
              <p className="text-[9px] font-black uppercase text-text-low mb-2">Dias de suspensão</p>
              <div className="flex gap-2">
                {[1, 3, 7, 14, 30].map(d => (
                  <button
                    key={d}
                    onClick={() => setDays(d)}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${
                      days === d
                        ? 'bg-red-500 text-white'
                        : 'bg-surface-2 border border-border-mid text-text-low hover:text-white'
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-border-mid text-[10px] font-black uppercase text-text-low hover:text-white transition-colors">
            Cancelar
          </button>
          <button onClick={handleConfirm} className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-colors">
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const suspensionStatus = (player) => {
  if (!player.is_suspended) return null;
  if (!player.suspension_until) return 'indefinido';
  const until = new Date(player.suspension_until);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (until < today) return null;
  const diff = Math.ceil((until - today) / 86400000);
  return `${diff} dia${diff !== 1 ? 's' : ''}`;
};

// ── MembersModal ──────────────────────────────────────────────────────────────

const MembersModal = ({
  players,
  onClose,
  onOpenRate,
  currentUserId,
  babaId,
  presidentId,
  onPlayersUpdated,
}) => {
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [suspendTarget, setSuspendTarget] = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [roles,         setRoles]         = useState(new Map());
  const [openMenuId,    setOpenMenuId]    = useState(null);

  const isPresident = String(presidentId) === String(user?.id);

  const loadRoles = useCallback(async () => {
    if (!babaId) return;
    const { data } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .eq('baba_id', babaId);
    setRoles(new Map((data || []).map(r => [r.user_id, r.role])));
  }, [babaId]);

  useEffect(() => { loadRoles(); }, [loadRoles]);

  const handleSuspend = async (playerId, suspend, until) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('players')
        .update({ is_suspended: suspend, suspension_until: suspend ? until : null })
        .eq('id', playerId);
      if (error) throw error;
      toast.success(suspend ? 'Jogador suspenso' : 'Suspensão removida');
      onPlayersUpdated?.();
    } catch {
      toast.error('Erro ao atualizar suspensão');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCoordinator = async (player) => {
    const targetUserId = player.user_id;
    if (!targetUserId) { toast.error('Jogador sem conta vinculada'); return; }
    const isAdmin = roles.get(targetUserId) === 'admin';
    setLoading(true);
    try {
      if (isAdmin) {
        await supabase
          .from('user_roles')
          .delete()
          .eq('baba_id', babaId)
          .eq('user_id', targetUserId)
          .eq('role', 'admin');
        toast.success(`${player.display_name || player.name} deixou de ser coordenador`);
      } else {
        await supabase
          .from('user_roles')
          .insert({ baba_id: babaId, user_id: targetUserId, role: 'admin', granted_by: user?.id });
        toast.success(`${player.display_name || player.name} agora é coordenador! 🎖️`);
      }
      await loadRoles();
    } catch {
      toast.error('Erro ao atualizar cargo');
    } finally {
      setLoading(false);
      setOpenMenuId(null);
    }
  };

  const handleVisitProfile = (player) => {
    if (!player.user_id) {
      toast('Este jogador ainda não tem conta vinculada', { icon: '⚠️' });
      return;
    }
    onClose();
    navigate(`/player/${player.user_id}`);
  };

  const getRoleBadge = (player) => {
    if (String(player.user_id) === String(presidentId)) {
      return { label: 'Presidente', color: 'text-cyan-electric bg-cyan-electric/10 border-cyan-electric/20', icon: <Crown size={9} /> };
    }
    if (roles.get(player.user_id) === 'admin') {
      return { label: 'Coordenador', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20', icon: <ShieldCheck size={9} /> };
    }
    return null;
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
        <div
          className="w-full max-w-xl bg-[#0a0a0a] border border-border-mid rounded-t-[2.5rem] p-6 max-h-[85vh] flex flex-col shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-black uppercase tracking-widest text-white">Atletas</h2>
              <p className="text-[10px] text-text-low font-bold uppercase">{players.length} membros</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-2xl bg-surface-2 text-text-low hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Lista */}
          <div className="overflow-y-auto space-y-2.5 flex-1 pr-1">
            {players.map((p, i) => {
              const susp     = suspensionStatus(p);
              const badge    = getRoleBadge(p);
              const isSelf   = p.user_id === currentUserId;
              const isOwner  = String(p.user_id) === String(presidentId);
              const isAdmin  = roles.get(p.user_id) === 'admin';
              const menuOpen = openMenuId === p.id;

              return (
                <div
                  key={p.id || i}
                  className={`rounded-2xl border transition-all ${
                    susp ? 'bg-red-500/5 border-red-500/20' : 'bg-surface-2 border-border-subtle'
                  }`}
                >
                  <div className="flex items-center gap-3 p-3">
                    {/* Avatar — clicável para ver perfil */}
                    <button
                      onClick={() => handleVisitProfile(p)}
                      className="w-11 h-11 rounded-2xl bg-gray-800 border border-border-mid overflow-hidden flex items-center justify-center text-white font-black text-base flex-shrink-0 hover:ring-2 hover:ring-cyan-electric/40 transition-all"
                    >
                      {p.avatar_url
                        ? <img src={p.avatar_url} className="w-full h-full object-cover" alt={p.display_name} />
                        : (p.display_name || p.name || '?').charAt(0).toUpperCase()}
                    </button>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-black text-white text-sm truncate">
                          {p.display_name || p.name || 'Sem nome'}
                        </p>
                        {badge && (
                          <span className={`flex items-center gap-1 text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${badge.color}`}>
                            {badge.icon} {badge.label}
                          </span>
                        )}
                        {susp && (
                          <span className="text-[8px] font-black text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                            Suspenso {susp !== 'indefinido' ? `· ${susp}` : ''}
                          </span>
                        )}
                        {p.final_rating > 0 && (
                          <span className="flex items-center gap-0.5 text-[9px] font-black text-cyan-electric bg-cyan-electric/10 px-1.5 py-0.5 rounded">
                            <Star size={8} fill="currentColor" /> {Number(p.final_rating).toFixed(1)}
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] text-cyan-electric font-bold uppercase tracking-widest">
                        {POSITION_LABEL[p.position] || p.position || 'Linha'}
                      </p>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">

                      {/* Ver perfil público */}
                      {p.user_id && (
                        <button
                          onClick={() => handleVisitProfile(p)}
                          className="p-2.5 bg-surface-3 text-text-muted rounded-xl hover:bg-cyan-electric/10 hover:text-cyan-electric transition-all"
                          title="Ver perfil público"
                        >
                          <ExternalLink size={14} />
                        </button>
                      )}

                      {/* Avaliar */}
                      {!isSelf && (
                        <button
                          onClick={() => onOpenRate(p)}
                          className="p-2.5 bg-surface-3 text-text-muted rounded-xl hover:bg-cyan-electric hover:text-black transition-all"
                          title="Avaliar jogador"
                        >
                          <Star size={14} />
                        </button>
                      )}

                      {/* Menu do presidente */}
                      {isPresident && !isSelf && !isOwner && (
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenuId(menuOpen ? null : p.id)}
                            className={`p-2.5 rounded-xl border transition-all ${
                              menuOpen
                                ? 'bg-surface-3 border-border-high text-white'
                                : 'bg-surface-3 border-border-mid text-text-muted hover:text-white'
                            }`}
                          >
                            <ChevronDown size={14} className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                          </button>

                          {menuOpen && (
                            <div className="absolute right-0 top-11 z-20 w-52 bg-surface-1 border border-border-mid rounded-2xl shadow-2xl overflow-hidden">
                              {/* Suspender / Reativar */}
                              <button
                                onClick={() => {
                                  setOpenMenuId(null);
                                  if (susp) handleSuspend(p.id, false, null);
                                  else setSuspendTarget(p);
                                }}
                                disabled={loading}
                                className={`w-full flex items-center gap-2.5 px-4 py-3 text-[10px] font-black uppercase transition-colors ${
                                  susp
                                    ? 'text-green-400 hover:bg-green-500/10'
                                    : 'text-red-400 hover:bg-red-500/10'
                                }`}
                              >
                                {susp ? <ShieldOff size={13} /> : <Shield size={13} />}
                                {susp ? 'Remover suspensão' : 'Suspender'}
                              </button>

                              {/* Nomear / Remover coordenador */}
                              <button
                                onClick={() => handleToggleCoordinator(p)}
                                disabled={loading || !p.user_id}
                                className={`w-full flex items-center gap-2.5 px-4 py-3 text-[10px] font-black uppercase border-t border-border-subtle transition-colors ${
                                  isAdmin
                                    ? 'text-text-low hover:bg-surface-2'
                                    : 'text-purple-400 hover:bg-purple-500/10'
                                }`}
                              >
                                {loading
                                  ? <RefreshCw size={13} className="animate-spin" />
                                  : <ShieldCheck size={13} />}
                                {isAdmin ? 'Remover coordenador' : 'Nomear coordenador'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legenda */}
          <div className="mt-4 pt-3 border-t border-border-subtle">
            <p className="text-[8px] font-black text-text-muted uppercase tracking-widest text-center">
              Toque no avatar ou em ↗ para ver o perfil público
            </p>
          </div>
        </div>
      </div>

      {suspendTarget && (
        <SuspendSheet
          player={suspendTarget}
          onClose={() => setSuspendTarget(null)}
          onConfirm={handleSuspend}
        />
      )}
    </>
  );
};

export default MembersModal;
