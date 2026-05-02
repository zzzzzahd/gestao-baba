// src/pages/DashboardPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Hub central do baba. Fase 2: componentes extraídos para arquivos próprios
// e navegação interna por sub-tabs (Presença / Times / Histórico / Caixa).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBaba } from '../contexts/BabaContext';
import {
  Trophy, Users, DollarSign, LogOut,
  Calendar, Copy, Settings, MapPin, RefreshCw,
  Camera, Edit3, ChevronRight, Shield, Star, Share2,
  Play, Swords,
} from 'lucide-react';

// Componentes externos
import BabaSettings    from '../components/BabaSettings';
import QRCodeModal     from '../components/QRCodeModal';
import SuspensionPanel from '../components/SuspensionPanel';
import RatePlayerModal from '../components/RatePlayerModal';
import MembersModal    from '../components/MembersModal';
import PresenceBlock   from '../components/PresenceBlock';
import DrawConfigBlock from '../components/DrawConfigBlock';

// Constantes centralizadas (Fase 1, Tarefa 1.1)
import { DAY_SHORT, DAY_FULL } from '../utils/constants';

import toast from 'react-hot-toast';

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

// ─── Convite Compacto ─────────────────────────────────────────────────────────

const InviteRow = ({ inviteCode, onCopy, onRefresh, onQR }) => (
  <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/5">
    <span className="text-[9px] text-white/20 font-black uppercase tracking-widest shrink-0">Convite</span>
    <span className="flex-1 text-sm font-black tracking-[0.3em] text-white text-center">
      {inviteCode || '——'}
    </span>
    <button onClick={onCopy}    title="Copiar"    className="p-2 bg-cyan-electric/10 border border-cyan-electric/20 rounded-xl text-cyan-electric hover:bg-cyan-electric hover:text-black transition-all">
      <Copy size={13} />
    </button>
    <button onClick={onQR}      title="QR Code"   className="p-2 bg-white/5 border border-white/5 rounded-xl text-white/30 hover:text-white transition-all">
      <Share2 size={13} />
    </button>
    <button onClick={onRefresh} title="Atualizar" className="p-2 bg-white/5 border border-white/5 rounded-xl text-white/20 hover:text-white transition-all">
      <RefreshCw size={13} />
    </button>
  </div>
);

// ─── Bloco de Times ───────────────────────────────────────────────────────────

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
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Swords size={13} className="text-cyan-electric" />
          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Times sorteados</span>
        </div>
        <button onClick={() => navigate('/teams')} className="flex items-center gap-1 text-[9px] font-black text-cyan-electric uppercase hover:text-white transition-colors">
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
          <span className="text-[9px] text-white/20 font-black uppercase tracking-widest w-full">Reservas ({reserves.length})</span>
          {reserves.map(p => (
            <span key={p.id} className="text-[10px] font-black text-white/30 bg-white/5 px-2 py-1 rounded-lg uppercase">{p.name}</span>
          ))}
        </div>
      )}
      {isPresident ? (
        <button onClick={() => navigate('/match')} className="w-full py-5 rounded-2xl font-black uppercase text-sm active:scale-95 transition-all flex items-center justify-center gap-2 text-black" style={{ background: 'linear-gradient(135deg, #00f2ff, #0066ff)' }}>
          <Play size={18} /> Iniciar Partida
        </button>
      ) : (
        <button onClick={() => navigate('/teams')} className="w-full py-4 rounded-2xl font-black uppercase text-sm active:scale-95 transition-all flex items-center justify-center gap-2 text-black" style={{ background: 'linear-gradient(135deg, #00f2ff, #0066ff)' }}>
          <Play size={16} /> Ver Times
        </button>
      )}
    </div>
  );
};

// ─── Sub-tabs ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'presence',  label: 'Presença',  icon: <Trophy size={14} />     },
  { id: 'teams',     label: 'Times',     icon: <Swords size={14} />     },
  { id: 'history',   label: 'Histórico', icon: <Calendar size={14} />   },
  { id: 'financial', label: 'Caixa',     icon: <DollarSign size={14} /> },
];

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

  const [activeTab,               setActiveTab]               = useState('presence');
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

  // ─── Conteúdo das abas ────────────────────────────────────────────────────────

  const tabContent = {

    // ABA: PRESENÇA
    presence: (
      <div className="space-y-5">
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

        {nextGameDay ? (
          <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
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
            {isPresident && canConfirm && currentBaba?.invite_code && (
              <InviteRow
                inviteCode={currentBaba.invite_code}
                onCopy={handleCopyCode}
                onRefresh={generateInviteCode}
                onQR={() => setShowQRCode(true)}
              />
            )}
            {isPresident && canConfirm && (
              <DrawConfigBlock
                drawConfig={drawConfig}
                setDrawConfig={setDrawConfig}
                gameConfirmations={gameConfirmations}
                isDrawing={isDrawing}
                nextGameDay={nextGameDay}
              />
            )}
            {isDrawing && (
              <div className="flex items-center justify-center gap-3 py-5 border border-cyan-electric/20 rounded-2xl bg-cyan-electric/5">
                <RefreshCw size={14} className="text-cyan-electric animate-spin" />
                <span className="text-[11px] font-black text-cyan-electric uppercase tracking-widest">Sorteando automaticamente...</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-[10px] text-white/20 font-black uppercase tracking-widest py-8">
            Nenhum baba agendado
          </p>
        )}

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
      </div>
    ),

    // ABA: TIMES
    teams: (
      <div className="space-y-5">
        {currentMatch && !isDrawing ? (
          <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5">
            <TeamsBlock currentMatch={currentMatch} navigate={navigate} isPresident={isPresident} />
          </div>
        ) : isDrawing ? (
          <div className="flex items-center justify-center gap-3 py-10 border border-cyan-electric/20 rounded-2xl bg-cyan-electric/5">
            <RefreshCw size={14} className="text-cyan-electric animate-spin" />
            <span className="text-[11px] font-black text-cyan-electric uppercase tracking-widest">Sorteando automaticamente...</span>
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <Swords size={32} className="text-white/10 mx-auto" />
            <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">Times ainda não sorteados</p>
            <p className="text-[9px] text-white/10 font-bold">O sorteio ocorre 30 min antes do baba</p>
          </div>
        )}
      </div>
    ),

    // ABA: HISTÓRICO
    history: (
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">Partidas anteriores</p>
          <button onClick={() => navigate('/history')} className="flex items-center gap-1 text-[9px] font-black text-cyan-electric uppercase hover:text-white transition-colors">
            Ver tudo <ChevronRight size={10} />
          </button>
        </div>
        <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col items-center gap-3 cursor-pointer hover:bg-white/5 transition-all" onClick={() => navigate('/history')}>
          <Calendar size={28} className="text-cyan-electric/40" />
          <p className="text-[11px] font-black text-white/30 uppercase tracking-widest">Abrir histórico completo</p>
        </div>
      </div>
    ),

    // ABA: CAIXA
    financial: (
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">Cobranças e pagamentos</p>
          <button onClick={() => navigate('/financial')} className="flex items-center gap-1 text-[9px] font-black text-cyan-electric uppercase hover:text-white transition-colors">
            Abrir caixa <ChevronRight size={10} />
          </button>
        </div>
        <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col items-center gap-3 cursor-pointer hover:bg-white/5 transition-all" onClick={() => navigate('/financial')}>
          <DollarSign size={28} className="text-cyan-electric/40" />
          <p className="text-[11px] font-black text-white/30 uppercase tracking-widest">Abrir caixa completo</p>
        </div>
      </div>
    ),
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-black text-white pb-24 font-sans selection:bg-cyan-electric selection:text-black">

      {/* Header com capa */}
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

      {/* Conteúdo principal */}
      <div className="max-w-xl mx-auto px-5 mt-12 space-y-5">

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

        {/* Sub-tabs */}
        <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md -mx-5 px-5 py-3 border-b border-white/5">
          <div className="flex gap-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab.id
                    ? 'bg-cyan-electric/10 text-cyan-electric border border-cyan-electric/20'
                    : 'text-white/30 hover:text-white/60 hover:bg-white/5 border border-transparent'
                }`}
              >
                <span className={activeTab === tab.id ? 'text-cyan-electric' : 'text-white/20'}>
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Aba ativa */}
        <div className="pt-2">
          {tabContent[activeTab]}
        </div>

        {/* Administração */}
        {isPresident && (
          <div className="space-y-3 pt-4 border-t border-white/5">
            <button
              onClick={() => setShowSuspensions(!showSuspensions)}
              className="w-full py-4 bg-red-500/5 border border-red-500/10 rounded-[2rem] text-red-400 font-black uppercase text-[10px] tracking-widest hover:bg-red-500/10 flex items-center justify-center gap-3 transition-colors active:scale-95"
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

      {/* Modais */}
      {showMembers && (
        <MembersModal
          players={playersWithRatings}
          onClose={() => setShowMembers(false)}
          currentUserId={user?.id}
          onOpenRate={p => setSelectedPlayerForRating(p)}
        />
      )}
      {selectedPlayerForRating && (
        <RatePlayerModal
          player={selectedPlayerForRating}
          onClose={() => setSelectedPlayerForRating(null)}
          onRate={handleRate}
        />
      )}
      <QRCodeModal
        isOpen={showQRCode}
        onClose={() => setShowQRCode(false)}
        inviteCode={currentBaba?.invite_code}
        babaName={currentBaba?.name}
        onRefresh={generateInviteCode}
      />
      {showSettings && <BabaSettings baba={currentBaba} onClose={() => setShowSettings(false)} />}
    </div>
  );
};

export default DashboardPage;
