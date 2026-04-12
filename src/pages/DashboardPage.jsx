import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBaba } from '../contexts/BabaContext';
import {
  Trophy, Users, DollarSign, LogOut,
  Calendar, Copy, Settings, MapPin, RefreshCw, Timer,
  Zap, Camera, Edit3, ChevronRight, X, Shield, Star, Share2
} from 'lucide-react';
import PresenceConfirmation from '../components/PresenceConfirmation';
import BabaSettings from '../components/BabaSettings';
import DrawConfigPanel from '../components/DrawConfigPanel';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const DAY_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const DAY_FULL  = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const POSITION_LABEL = {
  goleiro: 'Goleiro', linha: 'Linha', zagueiro: 'Zagueiro',
  lateral: 'Lateral', meia: 'Meia', atacante: 'Atacante',
};

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
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  return hours > 0 ? `Expira em ${hours}h ${minutes}min` : `Expira em ${minutes}min`;
};

// ─────────────────────────────────────────────
// MODAL DE AVALIAÇÃO
// ─────────────────────────────────────────────

const RatePlayerModal = ({ player, onClose, onRate }) => {
  const [ratings, setRatings] = useState({
    skill: 3,
    physical: 3,
    commitment: 3
  });

  const categories = [
    { id: 'skill', label: '⚽ Habilidade', color: 'text-cyan-electric' },
    { id: 'physical', label: '💪 Físico', color: 'text-orange-500' },
    { id: 'commitment', label: '🤝 Compromisso', color: 'text-purple-500' },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-xl p-6" onClick={onClose}>
      <div className="w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-6">
          <div className="w-20 h-20 rounded-full bg-gray-800 mx-auto mb-4 border-2 border-cyan-electric overflow-hidden shadow-lg shadow-cyan-electric/10">
             {player.avatar_url ? <img src={player.avatar_url} className="w-full h-full object-cover" alt="" /> : <span className="text-3xl font-black flex items-center justify-center h-full">{(player.display_name || '?').charAt(0)}</span>}
          </div>
          <h3 className="text-xl font-black uppercase italic text-white tracking-tighter">{player.display_name}</h3>
          <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em] mt-1">Avaliação Técnica do Atleta</p>
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
                className="w-full accent-cyan-electric bg-white/5 h-2 rounded-full appearance-none cursor-pointer"
                value={ratings[cat.id]}
                onChange={(e) => setRatings({...ratings, [cat.id]: parseInt(e.target.value)})}
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 mt-8">
          <button onClick={onClose} className="py-4 rounded-2xl bg-white/5 text-white/40 font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-colors">Cancelar</button>
          <button 
            onClick={() => { onRate(player.id, ratings); onClose(); }}
            className="py-4 rounded-2xl bg-cyan-electric text-black font-black uppercase text-[10px] tracking-widest shadow-lg shadow-cyan-electric/20 active:scale-95 transition-all"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// MODAL DE MEMBROS
// ─────────────────────────────────────────────

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
          <div key={p.id || i} className="flex items-center gap-4 p-3 bg-white/5 rounded-2xl border border-white/5 group">
            <div className="w-12 h-12 rounded-2xl bg-gray-800 border border-white/10 overflow-hidden flex items-center justify-center text-white font-black text-lg flex-shrink-0">
              {p.avatar_url ? <img src={p.avatar_url} className="w-full h-full object-cover" alt={p.display_name} /> : (p.display_name || '?').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-black text-white text-sm truncate">{p.display_name || 'Sem nome'}</p>
                {p.final_rating > 0 && (
                  <span className="flex items-center gap-0.5 text-[10px] font-black text-cyan-electric bg-cyan-electric/10 px-1.5 py-0.5 rounded">
                    <Star size={8} fill="currentColor" /> {Number(p.final_rating).toFixed(1)}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-cyan-electric font-bold uppercase tracking-widest">
                {POSITION_LABEL[p.position] || p.position || 'Linha'}
              </p>
            </div>
            
            {p.user_id !== currentUserId && (
              <button 
                onClick={() => onOpenRate(p)}
                className="p-3 bg-white/5 text-white/20 rounded-xl hover:bg-cyan-electric hover:text-black transition-all"
                title="Avaliar Jogador"
              >
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

// ─────────────────────────────────────────────
// DASHBOARD PAGE
// ─────────────────────────────────────────────

const DashboardPage = () => {
  const navigate = useNavigate();
  const { profile, signOut, user } = useAuth();
  const {
    currentBaba, players, loading,
    generateInviteCode, nextGameDay, uploadBabaImage,
    ratePlayer, getAllRatings
  } = useBaba();

  const [showSettings, setShowSettings] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [selectedPlayerForRating, setSelectedPlayerForRating] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [inviteExpiry, setInviteExpiry] = useState(null);
  const [playerRatings, setPlayerRatings] = useState([]); 
  const [countdown, setCountdown] = useState({ d: 0, h: '00', m: '00', s: '00', active: false });

  useEffect(() => {
    const loadRatings = async () => {
      const data = await getAllRatings();
      setPlayerRatings(data || []);
    };
    if (currentBaba?.id) loadRatings();
  }, [currentBaba?.id, getAllRatings]);

  const playersWithRatings = useMemo(() => {
    return (players || []).map(p => {
      const r = playerRatings.find(x => x.player_id === p.id);
      return {
        ...p,
        final_rating: r?.final_rating || 0,
        votes_count: r?.votes_count || 0
      };
    });
  }, [players, playerRatings]);

  const gameDaysDisplay = useMemo(() => formatGameDays(currentBaba), [currentBaba]);

  const calculateTimer = useCallback(() => {
    if (!nextGameDay?.date) {
      setCountdown(prev => prev.active ? { d: 0, h: '00', m: '00', s: '00', active: false } : prev);
      return;
    }
    const targetDate = new Date(nextGameDay.date).getTime();
    const diff = targetDate - Date.now();
    if (diff > 0) {
      const totalSeconds = Math.floor(diff / 1000);
      const d = Math.floor(totalSeconds / (60 * 60 * 24));
      const h = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60)).toString().padStart(2, '0');
      const m = Math.floor((totalSeconds % (60 * 60)) / 60).toString().padStart(2, '0');
      const s = (totalSeconds % 60).toString().padStart(2, '0');
      setCountdown(prev => ({ d, h, m, s, active: true }));
    } else {
      setCountdown(prev => prev.active ? { d: 0, h: '00', m: '00', s: '00', active: false } : prev);
    }
  }, [nextGameDay?.date]);

  useEffect(() => {
    let timerId;
    const tick = () => {
      calculateTimer();
      timerId = setTimeout(tick, 1000);
    };
    tick();
    return () => clearTimeout(timerId);
  }, [calculateTimer]);

  useEffect(() => {
    setInviteExpiry(computeExpiryLabel(currentBaba?.invite_expires_at));
    const interval = setInterval(() => setInviteExpiry(computeExpiryLabel(currentBaba?.invite_expires_at)), 1000);
    return () => clearInterval(interval);
  }, [currentBaba?.invite_expires_at]);

  const handleCopyCode = () => {
    if (currentBaba?.invite_code) {
      navigator.clipboard.writeText(currentBaba.invite_code);
      toast.success('Código copiado!', {
        style: { background: '#000', color: '#fff', border: '1px solid #00f3ff', fontSize: '10px', fontWeight: 'black' }
      });
    }
  };

  const handleUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file || isUploading) return;
    setIsUploading(true);
    const res = await uploadBabaImage(file, type);
    setIsUploading(false);
    if (!res) toast.error('Falha no upload');
  };

  if (loading || !currentBaba) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-cyan-electric border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const isPresident = String(currentBaba?.president_id) === String(profile?.id);

  return (
    <div className="min-h-screen bg-black text-white pb-24 font-sans selection:bg-cyan-electric selection:text-black">

      {/* ── HEADER ── */}
      <div className="relative h-72 w-full">
        <div className="h-56 w-full bg-gray-900 relative overflow-hidden">
          {currentBaba?.cover_url ? (
            <img src={currentBaba.cover_url} className={`w-full h-full object-cover transition-opacity duration-700 ${isUploading ? 'opacity-30' : 'opacity-60'}`} alt="Capa" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/5 font-black text-6xl italic">DRAFT PLAY</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" />
          {isPresident && !isUploading && (
            <label className="absolute bottom-4 right-4 p-3 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 text-white/60 hover:text-cyan-electric cursor-pointer">
              <Camera size={20} />
              <input type="file" className="hidden" accept="image/*" onChange={e => handleUpload(e, 'cover')} />
            </label>
          )}
          <button onClick={() => signOut()} className="absolute top-6 right-6 p-3 bg-black/40 rounded-2xl text-white/40 hover:text-red-500 z-20 transition-colors">
            <LogOut size={20} />
          </button>
        </div>

        <div className="absolute left-6 bottom-0 flex items-end gap-5">
          <div className="relative group">
            <div className="w-32 h-32 rounded-[2.5rem] border-4 border-black bg-gray-800 shadow-2xl overflow-hidden relative">
              {currentBaba?.logo_url && <img src={currentBaba.logo_url} className="w-full h-full object-cover" alt="Logo" />}
              <div className="absolute inset-0 flex items-center justify-center bg-cyan-electric/10 text-cyan-electric text-4xl font-black italic -z-10">{(currentBaba?.name || '?').charAt(0)}</div>
            </div>
            {isPresident && !isUploading && (
              <label className="absolute bottom-0 right-0 p-2 bg-cyan-electric rounded-xl text-black cursor-pointer shadow-lg">
                <Edit3 size={16} />
                <input type="file" className="hidden" accept="image/*" onChange={e => handleUpload(e, 'avatar')} />
              </label>
            )}
          </div>
          <div className="mb-2">
            <h1 className="text-3xl font-black italic uppercase tracking-tighter leading-none">{currentBaba?.name}</h1>
            <div className="flex items-center gap-2 mt-2 text-[10px] font-black uppercase tracking-widest">
              <span className="text-cyan-electric">@{profile?.name || 'atleta'}</span>
              {isPresident && <span className="bg-cyan-electric/10 text-cyan-electric px-2 py-0.5 rounded border border-cyan-electric/20">Presidente</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-6 mt-12 space-y-6">

        {/* ── CRONÔMETRO ── */}
        {nextGameDay ? (
          <div className="bg-gradient-to-r from-cyan-electric/20 to-transparent p-[1px] rounded-[2rem] border border-cyan-electric/30">
            <div className="bg-black/40 backdrop-blur-md rounded-[2rem] p-6">
              <div className="flex justify-between items-center mb-4 text-[10px] font-black uppercase tracking-widest text-white/40">
                <span>Próximo Baba em</span>
                <span className="text-cyan-electric">{nextGameDay.daysAhead === 0 ? 'Hoje' : nextGameDay.daysAhead === 1 ? 'Amanhã' : DAY_FULL[nextGameDay.day]}</span>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-4xl font-black font-mono leading-none tracking-tighter">
                    {countdown.active ? (
                      <div className="flex items-baseline">
                        {Number(countdown.d) > 0 && <span className="mr-2 text-3xl">{countdown.d}D</span>}
                        <span>{countdown.h}</span><span className="mx-0.5 opacity-30 text-2xl">:</span>
                        <span>{countdown.m}</span><span className="mx-0.5 opacity-30 text-2xl">:</span>
                        <span className="text-cyan-electric">{countdown.s}</span>
                      </div>
                    ) : <span className="text-2xl uppercase">Processando...</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-[10px] font-black text-white/40 uppercase truncate max-w-[200px]">
                    <MapPin size={12} className="text-cyan-electric" />
                    <span className="truncate">{nextGameDay.location || currentBaba.location || 'Arena Principal'}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-cyan-electric italic uppercase">PARTIDA</span>
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-1">{nextGameDay.time?.substring(0, 5)}</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* ── GRID DE ATALHOS ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: <Trophy />,   label: 'Ranking', action: () => navigate('/rankings') },
            { icon: <DollarSign />, label: 'Caixa',    action: () => navigate('/financial') },
            { icon: <Users />,      label: 'Times',    action: () => navigate('/teams') },
          ].map((item, i) => (
            <button key={i} onClick={item.action} className="flex flex-col items-center gap-2 py-5 bg-white/5 border border-white/5 rounded-3xl hover:bg-white/10 transition-all group">
              <div className="text-cyan-electric opacity-70 group-hover:opacity-100">{item.icon}</div>
              <span className="text-[9px] font-black uppercase tracking-widest text-white/60">{item.label}</span>
            </button>
          ))}
        </div>

        {/* ── ATLETAS ATIVOS ── */}
        <div className="card-glass p-5 rounded-3xl bg-white/5 border border-white/5">
          <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-3">Atletas Ativos</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-3">
                {playersWithRatings.slice(0, 4).map((p, i) => (
                  <div key={p.id || i} className="w-9 h-9 rounded-full border-2 border-black bg-gray-800 flex items-center justify-center text-[10px] font-black overflow-hidden">
                    {p.avatar_url ? <img src={p.avatar_url} className="w-full h-full object-cover" alt="" /> : (p.display_name || '?').charAt(0).toUpperCase()}
                  </div>
                ))}
                {players.length > 4 && <div className="w-9 h-9 rounded-full border-2 border-black bg-white/10 flex items-center justify-center text-[9px] font-black text-white/60">+{players.length - 4}</div>}
              </div>
              <span className="text-sm font-black text-white/80">{players?.length || 0} atletas</span>
            </div>
            <button onClick={() => setShowMembers(true)} className="flex items-center gap-1 text-[9px] font-black text-cyan-electric uppercase">
              Ver todos <ChevronRight size={10} />
            </button>
          </div>
        </div>

        <PresenceConfirmation />
        {isPresident && <DrawConfigPanel />}

        {/* ── SEÇÃO DE CONVITE (CORRIGIDA) ── */}
        {isPresident && (
          <div className="card-glass p-6 rounded-[2.5rem] border border-cyan-electric/20 bg-cyan-electric/5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-cyan-electric">Convite do Grupo</h3>
                <p className="text-[9px] text-white/40 font-bold uppercase">
                  {inviteExpiry || 'Gere um novo código'}
                </p>
              </div>
              <div className="p-2 bg-cyan-electric/10 rounded-xl">
                <Share2 size={16} className="text-cyan-electric" />
              </div>
            </div>

            {currentBaba?.invite_code ? (
              <div className="flex gap-2">
                <div className="flex-1 bg-black/60 border border-white/10 rounded-2xl p-4 flex items-center justify-center shadow-inner">
                  <span className="text-2xl font-black tracking-[0.4em] text-white leading-none">
                    {currentBaba.invite_code}
                  </span>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="px-6 bg-cyan-electric hover:bg-cyan-400 text-black rounded-2xl font-black uppercase text-[10px] transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-cyan-electric/20"
                >
                  <Copy size={14} />
                  Copiar
                </button>
              </div>
            ) : (
              <button
                onClick={generateInviteCode}
                className="w-full py-5 bg-white/5 border border-dashed border-white/20 rounded-2xl text-[10px] font-black uppercase hover:border-cyan-electric/50 hover:bg-cyan-electric/5 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw size={14} className="animate-pulse" />
                Gerar Código de Convite
              </button>
            )}

            {currentBaba?.invite_code && (
              <div className="flex justify-center">
                <button
                  onClick={generateInviteCode}
                  className="text-[9px] font-black uppercase text-white/20 hover:text-cyan-electric transition-colors flex items-center gap-2"
                >
                  <RefreshCw size={10} />
                  Atualizar Código
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── MODAIS ── */}
      {showMembers && (
        <MembersModal 
          players={playersWithRatings} 
          onClose={() => setShowMembers(false)} 
          currentUserId={user?.id}
          onOpenRate={(p) => setSelectedPlayerForRating(p)} 
        />
      )}
      
      {selectedPlayerForRating && (
        <RatePlayerModal 
          player={selectedPlayerForRating} 
          onClose={() => setSelectedPlayerForRating(null)} 
          onRate={async (id, data) => {
            await ratePlayer(id, data);
            const updated = await getAllRatings();
            setPlayerRatings(updated || []);
          }} 
        />
      )}

      {showSettings && <BabaSettings baba={currentBaba} onClose={() => setShowSettings(false)} />}
    </div>
  );
};

export default DashboardPage;
