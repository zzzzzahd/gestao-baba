import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBaba } from '../contexts/BabaContext';
import {
  Trophy, Users, DollarSign, LogOut,
  Calendar, Copy, Settings, MapPin, RefreshCw,
  Camera, Edit3, ChevronRight, X, Shield, Star, Share2,
  CheckCircle2, XCircle, Clock, Play, Settings2, Swords,
} from 'lucide-react';
import BabaSettings    from '../components/BabaSettings';
import QRCodeModal     from '../components/QRCodeModal';
import SuspensionPanel from '../components/SuspensionPanel';
import toast from 'react-hot-toast';
// Tarefa 1.1 — constantes centralizadas (antes duplicadas aqui e no HomePage)
import { DAY_SHORT, DAY_FULL, POSITION_LABEL } from '../utils/constants';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatGameDays = (baba) => {
  if (!Array.isArray(baba?.game_days) || baba.game_days.length === 0) return null;
  const time = baba.game_time ? String(baba.game_time).substring(0, 5) : '';
  return [...new Set(baba.game_days.map(Number))]
    .filter(d => d >= 0 && d <= 6)
    .sort((a, b) => a - b)
    .map(d => `${DAY_SHORT[d]}${time ? ' ' + time : ''}`)
    .join(' · ');
};

const computeExpiryLabel = (expiresAt) => {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expirado';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `Expira em ${h}h ${m}min` : `Expira em ${m}min`;
};

const formatCountdown = (cd) => {
  if (!cd?.active) return null;
  const hh = String(cd.h).padStart(2, '0');
  const mm = String(cd.m).padStart(2, '0');
  const ss = String(cd.s).padStart(2, '0');
  return cd.d > 0 ? `${cd.d}d ${hh}h ${mm}m` : `${hh}:${mm}:${ss}`;
};

// ─── Modal de Avaliação ───────────────────────────────────────────────────────

const RatePlayerModal = ({ player, onClose, onRate }) => {
  const [ratings,    setRatings]    = useState({ skill: 3, physical: 3, commitment: 3 });
  const [submitting, setSubmitting] = useState(false);

  const categories = [
    { id: 'skill',      label: '⚽ Habilidade', color: 'text-cyan-electric' },
    { id: 'physical',   label: '💪 Físico',      color: 'text-orange-500'   },
    { id: 'commitment', label: '🤝 Compromisso', color: 'text-purple-500'   },
  ];

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    try { await onRate(player.id, ratings); onClose(); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-xl p-6" onClick={onClose}>
      <div className="w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-6">
          <div className="w-20 h-20 rounded-full bg-gray-800 mx-auto mb-4 border-2 border-cyan-electric overflow-hidden flex items-center justify-center">
            {player.avatar_url
              ? <img src={player.avatar_url} className="w-full h-full object-cover" alt="" />
              : <span className="text-3xl font-black text-white">{(player.display_name || '?').charAt(0)}</span>}
          </div>
          <h3 className="text-xl font-black uppercase italic text-white tracking-tighter">{player.display_name}</h3>
          <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em] mt-1">Avaliação Técnica</p>
        </div>
        <div className="space-y-6">
          {categories.map(cat => (
            <div key={cat.id} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className={`text-[10px] font-black uppercase tracking-widest ${cat.color}`}>{cat.label}</span>
                <span className="text-lg font-black font-mono text-white">{ratings[cat.id]}</span>
              </div>
              <input
                type="range" min="1" max="5" step="1"
                className="w-full accent-cyan-electric h-2 rounded-full appearance-none cursor-pointer"
                value={ratings[cat.id]}
                onChange={e => setRatings(prev => ({ ...prev, [cat.id]: parseInt(e.target.value) }))}
              />
              <div className="flex justify-between text-[8px] text-white/20 font-bold px-0.5">
                <span>Fraco</span><span>Médio</span><span>Elite</span>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 mt-8">
          <button onClick={onClose} disabled={submitting} className="py-4 rounded-2xl bg-white/5 text-white/40 font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={handleConfirm} disabled={submitting} className="py-4 rounded-2xl bg-cyan-electric text-black font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {submitting ? <><RefreshCw size={12} className="animate-spin" /> Enviando...</> : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Modal de Membros ─────────────────────────────────────────────────────────

const MembersModal = ({ players, onClose, onOpenRate, currentUserId }) => (
  <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
    <div className="w-full max-w-xl bg-[#0a0a0a] border border-white/10 rounded-t-[2.5rem] p-6 max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-black uppercase tracking-widest text-white">Atletas</h2>
          <p className="text-[10px] text-white/40 font-bold uppercase">{players.length} membros</p>
        </div>
        <button onClick={onClose} className="p-2 rounded-2xl bg-white/5 text-white/40 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>
      <div className="overflow-y-auto space-y-3 flex-1 pr-1">
        {players.map((p, i) => (
          <div key={p.id || i} className="flex items-center gap-4 p-3 bg-white/5 rounded-2xl border border-white/5">
            <div className="w-12 h-12 rounded-2xl bg-gray-800 border border-white/10 overflow-hidden flex items-center justify-center text-white font-black text-lg flex-shrink-0">
              {p.avatar_url
                ? <img src={p.avatar_url} className="w-full h-full object-cover" alt={p.display_name} />
                : (p.display_name || '?').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-black text-white text-sm truncate">{p.display_name || 'Sem nome'}</p>
                {p.final_rating > 0 && (
                  <span className="flex items-center gap-0.5 text-[10px] font-black text-cyan-electric bg-cyan-electric/10 px-1.5 py-0.5 rounded shrink-0">
                    <Star size={8} fill="currentColor" /> {Number(p.final_rating).toFixed(1)}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-cyan-electric font-bold uppercase tracking-widest">
                {POSITION_LABEL[p.position] || p.position || 'Linha'}
              </p>
            </div>
            {p.user_id !== currentUserId && (
              <button onClick={() => onOpenRate(p)} className="p-3 bg-white/5 text-white/20 rounded-xl hover:bg-cyan-electric hover:text-black transition-all flex-shrink-0">
                <Star size={16} />
              </button>
            )}
            {p.position === 'goleiro' && <Shield size={14} className="text-yellow-500 flex-shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─── Bloco de Presença ────────────────────────────────────────────────────────
// "Vou jogar?" — confirmação antes da deadline

const PresenceBlock = ({
  nextGameDay, gameConfirmations, myConfirmation,
  canConfirm, confirmPresence, cancelConfirmation,
  countdown, loading, drawConfig,
}) => {
  const minRequired    = (drawConfig?.playersPerTeam || 5) * 2;
  const confirmedCount = gameConfirmations?.length || 0;
  const gameTime       = nextGameDay?.time?.substring(0, 5) || '--:--';
  const cdStr          = formatCountdown(countdown);
  const isUrgent       = countdown?.active && countdown.d === 0 && countdown.h === 0 && countdown.m < 5;

  return (
    <div className="space-y-3">
      {/* Status do grupo */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Users size={13} className="text-cyan-electric" />
          <span className="text-[11px] font-black text-white/50 uppercase tracking-widest">
            <span className="text-white">{confirmedCount}</span> confirmados
            {confirmedCount < minRequired && (
              <span className="text-white/25"> · faltam {minRequired - confirmedCount}</span>
            )}
          </span>
        </div>
        <span className="text-[11px] font-black text-cyan-electric">{gameTime}</span>
      </div>

      {/* Período de confirmação aberto */}
      {canConfirm && (
        <div className="p-5 rounded-3xl border border-cyan-electric/20 bg-cyan-electric/5 space-y-4">
          {cdStr && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10px] text-white/30 font-black uppercase tracking-widest">
                <Clock size={12} />
                <span>Prazo</span>
              </div>
              <span className={`text-sm font-black font-mono ${isUrgent ? 'text-red-400 animate-pulse' : 'text-white/60'}`}>
                {cdStr}
              </span>
            </div>
          )}
          {myConfirmation ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl">
                <CheckCircle2 size={16} className="text-green-500" />
                <span className="text-sm font-black text-green-500 uppercase">Presença Confirmada</span>
              </div>
              <button
                onClick={cancelConfirmation}
                disabled={loading}
                className="w-full py-3 bg-white/5 border border-white/10 rounded-2xl text-white/30 text-[10px] font-black uppercase hover:bg-white/10 transition-all disabled:opacity-40"
              >
                {loading ? 'Processando...' : 'Cancelar Presença'}
              </button>
            </div>
          ) : (
            <button
              onClick={confirmPresence}
              disabled={loading}
              className="w-full py-5 rounded-2xl text-black font-black uppercase italic tracking-tighter shadow-lg active:scale-95 transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #00f2ff, #0066ff)' }}
            >
              {loading ? 'Confirmando...' : '✓ Confirmar Presença'}
            </button>
          )}
        </div>
      )}

      {/* Prazo encerrado — status discreto */}
      {!canConfirm && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-[10px] font-black uppercase border ${
          myConfirmation
            ? 'bg-green-500/5 border-green-500/20 text-green-500'
            : 'bg-white/5 border-white/5 text-white/25'
        }`}>
          {myConfirmation ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
          <span>{myConfirmation ? 'Você está no baba de hoje' : 'Prazo encerrado · você ficou de fora'}</span>
        </div>
      )}
    </div>
  );
};

// ─── Bloco de Config do Sorteio (só presidente) ───────────────────────────────
// O sorteio é AUTOMÁTICO — ocorre 30min antes do jogo via BabaContext.
// O presidente só configura o formato com antecedência.

const DrawConfigBlock = ({ drawConfig, setDrawConfig, gameConfirmations, isDrawing, nextGameDay }) => {
  const safeConfig     = drawConfig || { playersPerTeam: 5, strategy: 'reserve' };
  const confirmedCount = gameConfirmations?.length || 0;
  const minRequired    = safeConfig.playersPerTeam * 2;
  const totalTeams     = Math.floor(confirmedCount / safeConfig.playersPerTeam);
  const totalMatches   = Math.floor(totalTeams / 2);
  const reserves       = confirmedCount % safeConfig.playersPerTeam + (totalTeams % 2) * safeConfig.playersPerTeam;

  // Horário do sorteio automático (deadline = 30min antes do jogo)
  const deadlineStr = nextGameDay?.deadline
    ? nextGameDay.deadline.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null;

  const handleDelta = (delta) => {
    const next = Math.max(2, Math.min(11, safeConfig.playersPerTeam + delta));
    setDrawConfig(prev => ({ ...prev, playersPerTeam: next }));
  };

  return (
    <div className="space-y-3 pt-3 border-t border-white/5">

      {/* Label com horário do sorteio automático */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Settings2 size={13} className={`text-cyan-electric ${isDrawing ? 'animate-spin' : ''}`} />
          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
            Config do sorteio
          </span>
        </div>
        {deadlineStr && (
          <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">
            Automático às {deadlineStr}
          </span>
        )}
      </div>

      {/* Jogadores por time */}
      <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-white/5 border border-white/5">
        <span className="text-[10px] font-black uppercase text-white/50">Jogadores por time</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleDelta(-1)}
            disabled={isDrawing}
            className="w-8 h-8 bg-white/5 rounded-lg border border-white/10 font-black text-lg hover:bg-white/10 active:scale-90 transition-all disabled:opacity-30"
          >−</button>
          <span className="text-xl font-black w-8 text-center text-cyan-electric">
            {safeConfig.playersPerTeam}
          </span>
          <button
            onClick={() => handleDelta(1)}
            disabled={isDrawing}
            className="w-8 h-8 bg-white/5 rounded-lg border border-white/10 font-black text-lg hover:bg-white/10 active:scale-90 transition-all disabled:opacity-30"
          >+</button>
        </div>
      </div>

      {/* Estratégia de suplentes */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5 border border-white/5">
        <span className="text-[10px] font-black uppercase text-white/40 shrink-0">Suplentes</span>
        <div className="flex gap-2 flex-1 justify-end">
          {[
            { id: 'reserve',    label: 'Reserva'    },
            { id: 'substitute', label: 'Incompleto' },
          ].map(s => (
            <button
              key={s.id}
              onClick={() => setDrawConfig(prev => ({ ...prev, strategy: s.id }))}
              disabled={isDrawing}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all border ${
                safeConfig.strategy === s.id
                  ? 'bg-cyan-electric text-black border-cyan-electric'
                  : 'bg-white/5 text-white/30 border-white/10 hover:border-white/20'
              } disabled:opacity-40`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Prévia do sorteio — só quando tem quórum */}
      {confirmedCount >= minRequired ? (
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: totalMatches, label: 'Partidas',   color: 'text-cyan-electric'                              },
            { value: totalTeams,   label: 'Times',      color: 'text-white'                                      },
            { value: reserves,     label: 'Aguardando', color: reserves > 0 ? 'text-yellow-500' : 'text-white/20' },
          ].map(item => (
            <div key={item.label} className="text-center p-3 bg-white/5 rounded-2xl border border-white/5">
              <p className={`text-2xl font-black ${item.color}`}>{item.value}</p>
              <p className="text-[8px] text-white/30 uppercase font-black mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-[10px] text-white/25 font-black uppercase tracking-widest py-1">
          faltam {minRequired - confirmedCount} confirmação{minRequired - confirmedCount !== 1 ? 'ões' : ''} para o sorteio
        </p>
      )}
    </div>
  );
};

// ─── Bloco de Times ───────────────────────────────────────────────────────────
// Aparece para TODOS após o sorteio automático

const TeamsBlock = ({ currentMatch, navigate, isPresident }) => {
  if (!currentMatch) return null;

  const teams    = currentMatch.teams    || [];
  const reserves = currentMatch.reserves || [];

  const COLORS = [
    { border: 'border-cyan-electric/30', text: 'text-cyan-electric' },
    { border: 'border-yellow-500/30',    text: 'text-yellow-500'    },
    { border: 'border-orange-500/30',    text: 'text-orange-500'    },
    { border: 'border-purple-500/30',    text: 'text-purple-500'    },
  ];

  return (
    <div className="space-y-4 pt-3 border-t border-white/5">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Swords size={13} className="text-cyan-electric" />
          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Times sorteados</span>
        </div>
        <button
          onClick={() => navigate('/teams')}
          className="flex items-center gap-1 text-[9px] font-black text-cyan-electric uppercase hover:text-white transition-colors"
        >
          Ver completo <ChevronRight size={10} />
        </button>
      </div>

      <div className={`grid gap-3 ${teams.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {teams.map((team, i) => {
          const c = COLORS[i % COLORS.length];
          return (
            <div key={i} className={`p-4 rounded-2xl border ${c.border} bg-white/[0.02]`}>
              <p className={`text-[11px] font-black uppercase italic ${c.text} mb-3`}>{team.name}</p>
              <div className="space-y-1.5">
                {(team.players || []).map((p, idx) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <span className="text-[9px] text-white/20 font-black w-4 text-right shrink-0">{idx + 1}</span>
                    <span className="text-[11px] font-black uppercase truncate flex-1">{p.name}</span>
                    {p.position === 'goleiro' && <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full shrink-0" />}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {reserves.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1">
          <span className="text-[9px] text-white/20 font-black uppercase tracking-widest w-full">
            Reservas ({reserves.length})
          </span>
          {reserves.map(p => (
            <span key={p.id} className="text-[10px] font-black text-white/30 bg-white/5 px-2 py-1 rounded-lg uppercase">
              {p.name}
            </span>
          ))}
        </div>
      )}

      {/* Iniciar Partida — só presidente */}
      {isPresident && (
        <button
          onClick={() => navigate('/match')}
          className="w-full py-5 rounded-2xl font-black uppercase text-sm active:scale-95 transition-all flex items-center justify-center gap-2 text-black"
          style={{ background: 'linear-gradient(135deg, #00f2ff, #0066ff)' }}
        >
          <Play size={18} /> Iniciar Partida
        </button>
      )}

      {/* Ver Times — demais jogadores */}
      {!isPresident && (
        <button
          onClick={() => navigate('/teams')}
          className="w-full py-4 rounded-2xl font-black uppercase text-sm active:scale-95 transition-all flex items-center justify-center gap-2 text-black"
          style={{ background: 'linear-gradient(135deg, #00f2ff, #0066ff)' }}
        >
          <Play size={16} /> Ver Times
        </button>
      )}
    </div>
  );
};

// ─── Convite Compacto ─────────────────────────────────────────────────────────

const InviteRow = ({ inviteCode, inviteExpiry, onCopy, onRefresh, onQR }) => (
  <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/5">
    <span className="text-[9px] text-white/20 font-black uppercase tracking-widest shrink-0">Convite</span>
    <span className="flex-1 text-sm font-black tracking-[0.3em] text-white text-center">
      {inviteCode || '——'}
    </span>
    <button onClick={onCopy}    title="Copiar" className="p-2 bg-cyan-electric/10 border border-cyan-electric/20 rounded-xl text-cyan-electric hover:bg-cyan-electric hover:text-black transition-all">
      <Copy size={13} />
    </button>
    <button onClick={onQR}      title="QR Code" className="p-2 bg-white/5 border border-white/5 rounded-xl text-white/30 hover:text-white transition-all">
      <Share2 size={13} />
    </button>
    <button onClick={onRefresh} title="Atualizar" className="p-2 bg-white/5 border border-white/5 rounded-xl text-white/20 hover:text-white transition-all">
      <RefreshCw size={13} />
    </button>
  </div>
);

// ─── Dashboard Page ───────────────────────────────────────────────────────────

const DashboardPage = () => {
  const navigate = useNavigate();
  const { profile, signOut, user } = useAuth();
  const {
    currentBaba, players, loading,
    generateInviteCode, nextGameDay, uploadBabaImage,
    countdown, ratePlayer, getAllRatings,
    gameConfirmations, myConfirmation, canConfirm,
    confirmPresence, cancelConfirmation,
    drawConfig, setDrawConfig, isDrawing, currentMatch,
  } = useBaba();

  const [showSettings,            setShowSettings]            = useState(false);
  const [showMembers,             setShowMembers]             = useState(false);
  const [selectedPlayerForRating, setSelectedPlayerForRating] = useState(null);
  const [showQRCode,              setShowQRCode]              = useState(false);
  const [showSuspensions,         setShowSuspensions]         = useState(false);
  const [isUploading,             setIsUploading]             = useState(false);
  const [inviteExpiry,            setInviteExpiry]            = useState(null);
  const [playerRatings,           setPlayerRatings]           = useState([]);

  useEffect(() => {
    if (!currentBaba?.id) return;
    let cancelled = false;
    getAllRatings().then(data => { if (!cancelled) setPlayerRatings(data || []); });
    return () => { cancelled = true; };
  }, [currentBaba?.id]);

  const playersWithRatings = useMemo(() => (players || []).map(p => {
    const r = playerRatings.find(x => x.player_id === p.id);
    return { ...p, final_rating: r?.final_rating || 0, votes_count: r?.votes_count || 0 };
  }), [players, playerRatings]);

  const gameDaysDisplay = useMemo(() => formatGameDays(currentBaba), [currentBaba]);

  useEffect(() => {
    setInviteExpiry(computeExpiryLabel(currentBaba?.invite_expires_at));
    const id = setInterval(() => setInviteExpiry(computeExpiryLabel(currentBaba?.invite_expires_at)), 1000);
    return () => clearInterval(id);
  }, [currentBaba?.invite_expires_at]);

  const handleCopyCode = () => {
    if (!currentBaba?.invite_code) return;
    navigator.clipboard.writeText(currentBaba.invite_code);
    toast.success('Código copiado!');
  };

  const handleUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file || isUploading) return;
    if (file.size > 5 * 1024 * 1024 || !file.type.startsWith('image/')) {
      toast.error('Arquivo inválido (máx 5 MB)');
      e.target.value = null;
      return;
    }
    setIsUploading(true);
    await uploadBabaImage(file, type);
    setIsUploading(false);
    e.target.value = null;
  };

  const handleRate = useCallback(async (playerId, ratingsData) => {
    await ratePlayer(playerId, ratingsData);
    getAllRatings().then(updated => setPlayerRatings(updated || []));
  }, [ratePlayer, getAllRatings]);

  if (loading || !currentBaba) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-cyan-electric border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const isPresident = String(currentBaba?.president_id) === String(profile?.id);

  return (
    <div className="min-h-screen bg-black text-white pb-4 font-sans selection:bg-cyan-electric selection:text-black">

      {/* ── Header com capa ── */}
      <div className="relative h-72 w-full">
        <div className="h-56 w-full bg-gray-900 relative overflow-hidden">
          {currentBaba?.cover_url ? (
            <img src={currentBaba.cover_url} className={`w-full h-full object-cover transition-opacity duration-700 ${isUploading ? 'opacity-30' : 'opacity-60'}`} alt="Capa" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/5 font-black text-6xl italic">DRAFT PLAY</div>
          )}
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-10">
              <RefreshCw className="text-cyan-electric animate-spin" size={32} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" />
          {isPresident && !isUploading && (
            <label className="absolute bottom-4 right-4 p-3 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 text-white/60 hover:text-cyan-electric cursor-pointer transition-colors">
              <Camera size={20} />
              <input type="file" className="hidden" accept="image/*" onChange={e => handleUpload(e, 'cover')} />
            </label>
          )}
          <button onClick={signOut} className="absolute top-6 right-6 p-3 bg-black/40 rounded-2xl text-white/40 hover:text-red-500 z-20 transition-colors">
            <LogOut size={20} />
          </button>
        </div>

        <div className="absolute left-6 bottom-0 flex items-end gap-5">
          <div className="relative">
            <div className="w-32 h-32 rounded-[2.5rem] border-4 border-black bg-gray-800 shadow-2xl overflow-hidden relative">
              {currentBaba?.logo_url && <img src={currentBaba.logo_url} className="w-full h-full object-cover" alt="Logo" />}
              <div className="absolute inset-0 flex items-center justify-center bg-cyan-electric/10 text-cyan-electric text-4xl font-black italic -z-10">
                {(currentBaba?.name || '?').charAt(0)}
              </div>
            </div>
            {isPresident && !isUploading && (
              <label className="absolute bottom-0 right-0 p-2 bg-cyan-electric rounded-xl text-black cursor-pointer hover:scale-110 transition-transform shadow-lg">
                <Edit3 size={16} />
                <input type="file" className="hidden" accept="image/*" onChange={e => handleUpload(e, 'avatar')} />
              </label>
            )}
          </div>
          <div className="mb-2">
            <h1 className="text-3xl font-black italic uppercase tracking-tighter leading-none">{currentBaba?.name}</h1>
            <div className="flex items-center gap-2 mt-2 text-[10px] font-black uppercase tracking-widest">
              <span className="text-cyan-electric">@{profile?.name || 'atleta'}</span>
              {isPresident && (
                <span className="bg-cyan-electric/10 text-cyan-electric px-2 py-0.5 rounded border border-cyan-electric/20">Presidente</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Conteúdo principal ── */}
      <div className="max-w-xl mx-auto px-5 mt-12 space-y-5">

        {/* Countdown */}
        {nextGameDay && (
          <div className="bg-gradient-to-r from-cyan-electric/20 to-transparent p-[1px] rounded-[2rem] border border-cyan-electric/30">
            <div className="bg-black/40 backdrop-blur-md rounded-[2rem] p-6">
              <div className="flex justify-between items-center mb-4 text-[10px] font-black uppercase tracking-widest text-white/40">
                <span>Próximo Baba em</span>
                <span className="text-cyan-electric">
                  {nextGameDay.daysAhead === 0 ? 'Hoje' : nextGameDay.daysAhead === 1 ? 'Amanhã' : DAY_FULL[nextGameDay.day]}
                </span>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-4xl font-black font-mono leading-none tracking-tighter text-white">
                    {formatCountdown(countdown)
                      ? <span>{formatCountdown(countdown)}</span>
                      : <span className="text-2xl uppercase text-cyan-electric animate-pulse">Em breve...</span>
                    }
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-[10px] font-black text-white/40 uppercase truncate max-w-[200px]">
                    <MapPin size={12} className="text-cyan-electric flex-shrink-0" />
                    <span className="truncate">{nextGameDay.location || currentBaba.location || 'Arena Principal'}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-cyan-electric italic uppercase">PARTIDA</span>
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-1">{nextGameDay.time?.substring(0, 5)}</p>
                </div>
              </div>
              {gameDaysDisplay && (
                <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2 text-[10px] font-black text-white/30 uppercase">
                  <Calendar size={12} className="text-white/20" />
                  <span>{gameDaysDisplay}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Grid de atalhos */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: <Trophy />,     label: 'Ranking',   action: () => navigate('/rankings')  },
            { icon: <DollarSign />, label: 'Caixa',     action: () => navigate('/financial') },
            { icon: <Users />,      label: 'Times',     action: () => navigate('/teams')     },
            { icon: <Calendar />,   label: 'Histórico', action: () => navigate('/history')   },
          ].map((item, i) => (
            <button key={i} onClick={item.action} className="flex flex-col items-center gap-2 py-5 bg-white/5 border border-white/5 rounded-3xl hover:bg-white/10 hover:border-white/10 transition-all active:scale-95 group">
              <div className="text-cyan-electric opacity-70 group-hover:opacity-100 transition-opacity">{item.icon}</div>
              <span className="text-[9px] font-black uppercase tracking-widest text-white/60">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Atletas */}
        <div className="p-5 rounded-3xl bg-white/5 border border-white/5">
          <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-3">Atletas Ativos</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-3">
                {playersWithRatings.slice(0, 4).map((p, i) => (
                  <div key={p.id || i} className="w-9 h-9 rounded-full border-2 border-black bg-gray-800 flex items-center justify-center text-[10px] font-black overflow-hidden shadow-lg">
                    {p.avatar_url
                      ? <img src={p.avatar_url} className="w-full h-full object-cover" alt="" />
                      : (p.display_name || '?').charAt(0).toUpperCase()}
                  </div>
                ))}
                {players.length > 4 && (
                  <div className="w-9 h-9 rounded-full border-2 border-black bg-white/10 flex items-center justify-center text-[9px] font-black text-white/60 shadow-lg">
                    +{players.length - 4}
                  </div>
                )}
              </div>
              <span className="text-sm font-black text-white/80">{players?.length || 0} atletas</span>
            </div>
            <button onClick={() => setShowMembers(true)} className="flex items-center gap-1 text-[9px] font-black text-cyan-electric uppercase hover:text-white transition-colors">
              Ver todos <ChevronRight size={10} />
            </button>
          </div>
        </div>

        {/* ── FLUXO DO BABA (só quando há jogo agendado) ── */}
        {nextGameDay && (
          <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">

            {/* 1 — Presença */}
            <PresenceBlock
              nextGameDay={nextGameDay}
              gameConfirmations={gameConfirmations}
              myConfirmation={myConfirmation}
              canConfirm={canConfirm}
              confirmPresence={confirmPresence}
              cancelConfirmation={cancelConfirmation}
              countdown={countdown}
              loading={loading}
              drawConfig={drawConfig}
            />

            {/* 2 — Convite compacto (presidente, período aberto) */}
            {isPresident && canConfirm && currentBaba?.invite_code && (
              <InviteRow
                inviteCode={currentBaba.invite_code}
                inviteExpiry={inviteExpiry}
                onCopy={handleCopyCode}
                onRefresh={generateInviteCode}
                onQR={() => setShowQRCode(true)}
              />
            )}

            {/* 3 — Config do sorteio (presidente, antes da deadline) */}
            {isPresident && canConfirm && (
              <DrawConfigBlock
                drawConfig={drawConfig}
                setDrawConfig={setDrawConfig}
                gameConfirmations={gameConfirmations}
                isDrawing={isDrawing}
                nextGameDay={nextGameDay}
              />
            )}

            {/* 4 — Sorteando em andamento */}
            {isDrawing && (
              <div className="flex items-center justify-center gap-3 py-5 border border-cyan-electric/20 rounded-2xl bg-cyan-electric/5">
                <RefreshCw size={14} className="text-cyan-electric animate-spin" />
                <span className="text-[11px] font-black text-cyan-electric uppercase tracking-widest">
                  Sorteando automaticamente...
                </span>
              </div>
            )}

            {/* 5 — Times + ação pós-sorteio */}
            {currentMatch && !isDrawing && (
              <TeamsBlock
                currentMatch={currentMatch}
                navigate={navigate}
                isPresident={isPresident}
              />
            )}
          </div>
        )}

        {/* Convite completo — sem jogo agendado */}
        {isPresident && !nextGameDay && (
          <div className="p-6 rounded-[2.5rem] border border-cyan-electric/20 bg-cyan-electric/5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-cyan-electric">Convite do Grupo</h3>
                <p className="text-[9px] text-white/40 font-bold uppercase">{inviteExpiry || 'Gere um novo código'}</p>
              </div>
              <button className="p-2 bg-cyan-electric/10 rounded-xl" onClick={() => setShowQRCode(true)}>
                <Share2 size={16} className="text-cyan-electric" />
              </button>
            </div>
            {currentBaba?.invite_code ? (
              <>
                <div className="flex gap-2">
                  <div className="flex-1 bg-black/60 border border-white/10 rounded-2xl p-4 flex items-center justify-center">
                    <span className="text-2xl font-black tracking-[0.4em] text-white">{currentBaba.invite_code}</span>
                  </div>
                  <button onClick={handleCopyCode} className="px-6 bg-cyan-electric text-black rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 active:scale-95 transition-all">
                    <Copy size={14} /> Copiar
                  </button>
                </div>
                <div className="flex justify-center">
                  <button onClick={generateInviteCode} className="text-[9px] font-black uppercase text-white/20 hover:text-cyan-electric transition-colors flex items-center gap-2">
                    <RefreshCw size={10} /> Atualizar Código
                  </button>
                </div>
              </>
            ) : (
              <button onClick={generateInviteCode} className="w-full py-5 bg-white/5 border border-dashed border-white/20 rounded-2xl text-[10px] font-black uppercase hover:border-cyan-electric/50 transition-all flex items-center justify-center gap-2">
                <RefreshCw size={14} className="animate-pulse" /> Gerar Código de Convite
              </button>
            )}
          </div>
        )}

        {/* Administração */}
        {isPresident && (
          <div className="space-y-3">
            <button
              onClick={() => setShowSuspensions(!showSuspensions)}
              className="w-full py-4 bg-red-500/5 border border-red-500/10 rounded-[2rem] text-red-400/60 font-black uppercase text-[10px] tracking-widest hover:bg-red-500/10 flex items-center justify-center gap-3 transition-colors active:scale-95"
            >
              <Shield size={16} /> Gestão de Suspensões
            </button>
            {showSuspensions && (
              <div className="p-5 bg-white/[0.02] border border-white/5 rounded-[2rem]">
                <SuspensionPanel
                  players={playersWithRatings}
                  babaId={currentBaba.id}
                  onPlayersUpdated={async () => { const u = await getAllRatings(); setPlayerRatings(u || []); }}
                />
              </div>
            )}
            <button
              onClick={() => setShowSettings(true)}
              className="w-full py-5 bg-white/5 border border-white/10 rounded-[2.5rem] text-white/40 font-black uppercase text-[10px] tracking-widest hover:bg-white/10 flex items-center justify-center gap-3 transition-colors active:scale-95"
            >
              <Settings size={18} /> Administração do Grupo
            </button>
          </div>
        )}
      </div>

      {/* ── Modais ── */}
      {showMembers && (
        <MembersModal players={playersWithRatings} onClose={() => setShowMembers(false)} currentUserId={user?.id} onOpenRate={p => setSelectedPlayerForRating(p)} />
      )}
      {selectedPlayerForRating && (
        <RatePlayerModal player={selectedPlayerForRating} onClose={() => setSelectedPlayerForRating(null)} onRate={handleRate} />
      )}
      <QRCodeModal isOpen={showQRCode} onClose={() => setShowQRCode(false)} inviteCode={currentBaba?.invite_code} babaName={currentBaba?.name} onRefresh={generateInviteCode} />
      {showSettings && <BabaSettings baba={currentBaba} onClose={() => setShowSettings(false)} />}
    </div>
  );
};

export default DashboardPage;
