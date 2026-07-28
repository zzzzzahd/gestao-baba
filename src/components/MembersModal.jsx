// src/components/MembersModal.jsx
// Corrigido: botão de visitar perfil público de cada membro,
// suspensão inline, nomear coordenador, badge de papel.

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Star, Shield, ShieldOff, ShieldCheck, Crown, MoreVertical, AlertTriangle, RefreshCw, ExternalLink, Search, Users } from 'lucide-react';
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
  const [search,        setSearch]        = useState('');

  const isPresident = String(presidentId) === String(user?.id);

  // Ordena: presidente → coordenadores → resto (por avaliação), busca filtra por nome/posição
  const visiblePlayers = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = term
      ? players.filter(p => {
          const name = (p.display_name || p.name || '').toLowerCase();
          const pos  = (POSITION_LABEL[p.position] || p.position || '').toLowerCase();
          return name.includes(term) || pos.includes(term);
        })
      : players;

    const rank = (p) => {
      if (String(p.user_id) === String(presidentId)) return 0;
      if (roles.get(p.user_id) === 'admin') return 1;
      return 2;
    };

    return [...filtered].sort((a, b) => {
      const r = rank(a) - rank(b);
      if (r !== 0) return r;
      return (b.final_rating || 0) - (a.final_rating || 0);
    });
  }, [players, search, roles, presidentId]);

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
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
        <div
          className="w-full max-w-xl bg-[#0a0a0a] border border-border-mid rounded-t-[2.5rem] p-6 max-h-[88vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300"
          onClick={e => e.stopPropagation()}
        >
          {/* Handle visual do bottom sheet */}
          <div className="w-10 h-1 rounded-full bg-border-mid mx-auto mb-4 -mt-1" />

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-electric/10 border border-cyan-electric/20 flex items-center justify-center">
                <Users size={18} className="text-cyan-electric" />
              </div>
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight text-white leading-tight">Atletas</h2>
                <p className="text-[10px] text-text-low font-bold uppercase tracking-widest">
                  {players.length} {players.length === 1 ? 'membro' : 'membros'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2.5 rounded-2xl bg-surface-2 text-text-low hover:text-white hover:bg-surface-3 transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Busca */}
          {players.length > 5 && (
            <div className="relative mb-4">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nome ou posição..."
                className="w-full bg-surface-2 border border-border-mid rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold text-white placeholder:text-text-muted focus:outline-none focus:border-cyan-electric/50 transition-colors"
              />
            </div>
          )}

          {/* Lista */}
          <div className="overflow-y-auto space-y-2.5 flex-1 pr-1 -mr-1">
            {visiblePlayers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-14 gap-2 text-center">
                <Search size={22} className="text-text-muted" />
                <p className="text-xs font-black text-text-low uppercase tracking-widest">Nenhum atleta encontrado</p>
                <p className="text-[10px] text-text-muted font-bold">Tente buscar por outro nome ou posição</p>
              </div>
            )}
            {visiblePlayers.map((p, i) => {
              const susp     = suspensionStatus(p);
              const badge    = getRoleBadge(p);
              const isSelf   = p.user_id === currentUserId;
              const isOwner  = String(p.user_id) === String(presidentId);
              const isAdmin  = roles.get(p.user_id) === 'admin';
              const menuOpen = openMenuId === p.id;

              const ringColor = badge?.label === 'Presidente'
                ? 'hover:ring-cyan-electric/50'
                : badge?.label === 'Coordenador'
                  ? 'hover:ring-purple-400/50'
                  : 'hover:ring-cyan-electric/40';

              return (
                <div
                  key={p.id || i}
                  className={`group rounded-2xl border transition-all ${
                    susp
                      ? 'bg-red-500/[0.04] border-red-500/20'
                      : 'bg-surface-2 border-border-subtle hover:border-border-mid'
                  }`}
                >
                  <div className="flex items-center gap-3 p-3">
                    {/* Avatar — clicável para ver perfil */}
                    <button
                      onClick={() => handleVisitProfile(p)}
                      className={`relative w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center text-white font-black text-base flex-shrink-0 ring-2 ring-transparent hover:ring-offset-2 hover:ring-offset-surface-2 transition-all ${ringColor} ${
                        badge?.label === 'Presidente'
                          ? 'bg-gradient-to-br from-cyan-electric/30 to-blue-600/30 border border-cyan-electric/30'
                          : badge?.label === 'Coordenador'
                            ? 'bg-gradient-to-br from-purple-400/30 to-purple-700/30 border border-purple-400/30'
                            : 'bg-gradient-to-br from-surface-3 to-surface-1 border border-border-mid'
                      }`}
                    >
                      {p.avatar_url
                        ? <img src={p.avatar_url} className="w-full h-full object-cover" alt={p.display_name} />
                        : (p.display_name || p.name || '?').charAt(0).toUpperCase()}
                      {susp && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Shield size={14} className="text-red-400" />
                        </div>
                      )}
                    </button>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-black text-white text-sm truncate">
                          {p.display_name || p.name || 'Sem nome'}
                        </p>
                        {badge && (
                          <span className={`flex items-center gap-1 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md border ${badge.color}`}>
                            {badge.icon} {badge.label}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap mt-1">
                        <p className="text-[9px] text-cyan-electric font-bold uppercase tracking-widest">
                          {POSITION_LABEL[p.position] || p.position || 'Linha'}
                        </p>
                        {p.final_rating > 0 && (
                          <span className="flex items-center gap-0.5 text-[9px] font-black text-yellow-400">
                            <Star size={9} fill="currentColor" /> {Number(p.final_rating).toFixed(1)}
                          </span>
                        )}
                        {susp && (
                          <span className="text-[8px] font-black text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-md border border-red-500/20">
                            Suspenso {susp !== 'indefinido' ? `· ${susp}` : ''}
                          </span>
                        )}
                      </div>
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
                            <MoreVertical size={14} />
                          </button>

                          {menuOpen && (
                            <div className="absolute right-0 top-11 z-20 w-52 bg-surface-1 border border-border-mid rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
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
          <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-center gap-1.5">
            <ExternalLink size={10} className="text-text-muted" />
            <p className="text-[8px] font-black text-text-muted uppercase tracking-widest text-center">
              Toque no avatar ou no ícone para ver o perfil público
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