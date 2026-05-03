// src/pages/DashboardPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Hub central do baba. Fase 3: 3 abas com lazy loading + query param.
// Aba 1 — Visão Geral | Aba 2 — Gestão | Aba 3 — Pós-jogo
// ─────────────────────────────────────────────────────────────────────────────

import React, {
  useState, useEffect, useCallback, useMemo, Suspense, lazy,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth }  from '../contexts/AuthContext';
import { useBaba }  from '../contexts/BabaContext';
import {
  LogOut, Camera, Edit3, ChevronRight, RefreshCw,
  Trophy, Settings, Users, Calendar,
} from 'lucide-react';

import BabaSettings    from '../components/BabaSettings';
import QRCodeModal     from '../components/QRCodeModal';
import RatePlayerModal from '../components/RatePlayerModal';
import MembersModal    from '../components/MembersModal';
import { DAY_SHORT }   from '../utils/constants';
import toast           from 'react-hot-toast';

// ── Lazy tabs ──────────────────────────────────────────────────────────────────
const TabOverview  = lazy(() => import('./dashboard/TabOverview'));
const TabManage    = lazy(() => import('./dashboard/TabManage'));
const TabPostGame  = lazy(() => import('./dashboard/TabPostGame'));

// ── Helpers ───────────────────────────────────────────────────────────────────

const computeExpiryLabel = (expiresAt) => {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expirado';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `Expira em ${h}h ${m}min` : `Expira em ${m}min`;
};

// ── Tabs config ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',  label: 'Visão Geral', icon: <Trophy    size={14} /> },
  { id: 'manage',    label: 'Gestão',      icon: <Settings  size={14} /> },
  { id: 'postgame',  label: 'Pós-jogo',    icon: <Calendar  size={14} /> },
];

// ── Tab skeleton ──────────────────────────────────────────────────────────────

const TabLoader = () => (
  <div className="space-y-3 pt-2">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="h-16 rounded-3xl bg-surface-1 animate-pulse" style={{ opacity: 1 - i * 0.2 }} />
    ))}
  </div>
);

// ── Dashboard Page ────────────────────────────────────────────────────────────

const DashboardPage = () => {
  const navigate                     = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, signOut, user }   = useAuth();
  const {
    currentBaba, players, loading,
    generateInviteCode, nextGameDay, uploadBabaImage,
    countdown, ratePlayer, getAllRatings,
    gameConfirmations, myConfirmation, canConfirm,
    confirmPresence, cancelConfirmation,
    drawConfig, setDrawConfig, isDrawing, currentMatch,
  } = useBaba();

  // ── Aba ativa via query param (?tab=) ─────────────────────────────────────
  const activeTab = searchParams.get('tab') || 'overview';
  const setActiveTab = (id) => setSearchParams({ tab: id }, { replace: true });

  // ── Estado local ──────────────────────────────────────────────────────────
  const [showSettings,            setShowSettings]            = useState(false);
  const [showMembers,             setShowMembers]             = useState(false);
  const [selectedPlayerForRating, setSelectedPlayerForRating] = useState(null);
  const [showQRCode,              setShowQRCode]              = useState(false);
  const [showSuspensions,         setShowSuspensions]         = useState(false);
  const [isUploading,             setIsUploading]             = useState(false);
  const [inviteExpiry,            setInviteExpiry]            = useState(null);
  const [playerRatings,           setPlayerRatings]           = useState([]);

  // ── Ratings ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentBaba?.id) return;
    let cancelled = false;
    getAllRatings().then(data => { if (!cancelled) setPlayerRatings(data || []); });
    return () => { cancelled = true; };
  }, [currentBaba?.id]);

  const playersWithRatings = useMemo(() =>
    (players || []).map(p => {
      const r = playerRatings.find(x => x.player_id === p.id);
      return { ...p, final_rating: r?.final_rating || 0, votes_count: r?.votes_count || 0 };
    }),
  [players, playerRatings]);

  // ── Expiry do convite ─────────────────────────────────────────────────────
  useEffect(() => {
    setInviteExpiry(computeExpiryLabel(currentBaba?.invite_expires_at));
    const id = setInterval(
      () => setInviteExpiry(computeExpiryLabel(currentBaba?.invite_expires_at)), 1000,
    );
    return () => clearInterval(id);
  }, [currentBaba?.invite_expires_at]);

  // ── Handlers ─────────────────────────────────────────────────────────────
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

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading || !currentBaba) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-cyan-electric border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const isPresident = String(currentBaba?.president_id) === String(profile?.id);

  // ── Props compartilhadas entre tabs ──────────────────────────────────────
  const sharedProps = {
    currentBaba,
    isPresident,
    players: playersWithRatings,
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-black text-white pb-24 font-sans selection:bg-cyan-electric selection:text-black">

      {/* ── Header com capa ── */}
      <div className="relative h-72 w-full">
        <div className="h-56 w-full bg-gray-900 relative overflow-hidden">
          {currentBaba?.cover_url ? (
            <img
              src={currentBaba.cover_url}
              className={`w-full h-full object-cover transition-opacity duration-700 ${isUploading ? 'opacity-30' : 'opacity-60'}`}
              alt="Capa"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-muted font-black text-6xl italic">
              DRAFT PLAY
            </div>
          )}
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-10">
              <RefreshCw className="text-cyan-electric animate-spin" size={32} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" />
          {isPresident && !isUploading && (
            <label className="absolute bottom-4 right-4 p-3 bg-black/60 backdrop-blur-md rounded-2xl border border-border-mid text-text-mid hover:text-cyan-electric cursor-pointer transition-colors">
              <Camera size={20} />
              <input type="file" className="hidden" accept="image/*" onChange={e => handleUpload(e, 'cover')} />
            </label>
          )}
          <button
            onClick={signOut}
            className="absolute top-6 right-6 p-3 bg-black/40 rounded-2xl text-text-low hover:text-red-500 z-20 transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>

        {/* Logo + nome */}
        <div className="absolute left-6 bottom-0 flex items-end gap-5">
          <div className="relative">
            <div className="w-32 h-32 rounded-[2.5rem] border-4 border-black bg-gray-800 shadow-2xl overflow-hidden relative">
              {currentBaba?.logo_url && (
                <img src={currentBaba.logo_url} className="w-full h-full object-cover" alt="Logo" />
              )}
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
            <h1 className="text-3xl font-black italic uppercase tracking-tighter leading-none">
              {currentBaba?.name}
            </h1>
            <div className="flex items-center gap-2 mt-2 text-[10px] font-black uppercase tracking-widest">
              <span className="text-cyan-electric">@{profile?.name || 'atleta'}</span>
              {isPresident && (
                <span className="bg-cyan-electric/10 text-cyan-electric px-2 py-0.5 rounded border border-cyan-electric/20">
                  Presidente
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Conteúdo ── */}
      <div className="max-w-xl mx-auto px-5 mt-12 space-y-5">

        {/* Atletas */}
        <div className="p-5 rounded-3xl bg-surface-2 border border-border-subtle">
          <p className="text-[9px] font-black text-text-low uppercase tracking-widest mb-3">Atletas Ativos</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-3">
                {playersWithRatings.slice(0, 4).map((p, i) => (
                  <div
                    key={p.id || i}
                    className="w-9 h-9 rounded-full border-2 border-black bg-gray-800 flex items-center justify-center text-[10px] font-black overflow-hidden shadow-lg"
                  >
                    {p.avatar_url
                      ? <img src={p.avatar_url} className="w-full h-full object-cover" alt="" />
                      : (p.display_name || '?').charAt(0).toUpperCase()}
                  </div>
                ))}
                {players.length > 4 && (
                  <div className="w-9 h-9 rounded-full border-2 border-black bg-surface-3 flex items-center justify-center text-[9px] font-black text-text-mid shadow-lg">
                    +{players.length - 4}
                  </div>
                )}
              </div>
              <span className="text-sm font-black text-white">{players?.length || 0} atletas</span>
            </div>
            <button
              onClick={() => setShowMembers(true)}
              className="flex items-center gap-1 text-[9px] font-black text-cyan-electric uppercase hover:text-white transition-colors"
            >
              Ver todos <ChevronRight size={10} />
            </button>
          </div>
        </div>

        {/* ── Tabs (3 abas com query param) ── */}
        <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md -mx-5 px-5 py-3 border-b border-border-subtle">
          <div className="flex gap-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab.id
                    ? 'bg-cyan-electric/10 text-cyan-electric border border-cyan-electric/20'
                    : 'text-text-low hover:text-text-mid hover:bg-surface-2 border border-transparent'
                }`}
              >
                <span className={activeTab === tab.id ? 'text-cyan-electric' : 'text-text-muted'}>
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Conteúdo da aba ativa com lazy loading ── */}
        <div className="pt-2">
          <Suspense fallback={<TabLoader />}>
            {activeTab === 'overview' && (
              <TabOverview
                {...sharedProps}
                nextGameDay={nextGameDay}
                countdown={countdown}
                gameConfirmations={gameConfirmations}
                myConfirmation={myConfirmation}
                canConfirm={canConfirm}
                confirmPresence={confirmPresence}
                cancelConfirmation={cancelConfirmation}
                drawConfig={drawConfig}
                setDrawConfig={setDrawConfig}
                isDrawing={isDrawing}
                loading={loading}
                inviteExpiry={inviteExpiry}
                handleCopyCode={handleCopyCode}
                generateInviteCode={generateInviteCode}
                onShowQR={() => setShowQRCode(true)}
              />
            )}
            {activeTab === 'manage' && (
              <TabManage
                {...sharedProps}
                currentMatch={currentMatch}
                isDrawing={isDrawing}
                playersWithRatings={playersWithRatings}
                getAllRatings={getAllRatings}
                setPlayerRatings={setPlayerRatings}
                showSuspensions={showSuspensions}
                setShowSuspensions={setShowSuspensions}
                onShowSettings={() => setShowSettings(true)}
              />
            )}
            {activeTab === 'postgame' && (
              <TabPostGame
                {...sharedProps}
                players={playersWithRatings}
              />
            )}
          </Suspense>
        </div>
      </div>

      {/* ── Modais ── */}
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
      {showSettings && (
        <BabaSettings baba={currentBaba} onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
};

export default DashboardPage;
