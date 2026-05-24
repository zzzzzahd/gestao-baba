// src/pages/DashboardPage.jsx
// Sprint 1/4/7 — integra SeasonCard, ActivityFeed, ModeSelector e feature flags.

import React, {
  useState, useEffect, useCallback, useMemo, Suspense, lazy,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth }   from '../contexts/AuthContext';
import { useBaba }   from '../contexts/BabaContext';
import { useFeatures } from '../utils/babaMode';
import {
  LogOut, Camera, Edit3, ChevronRight, RefreshCw,
  Trophy, Settings, Calendar, Zap,
} from 'lucide-react';

import QRCodeModal     from '../components/QRCodeModal';
import RatePlayerModal from '../components/RatePlayerModal';
import MembersModal    from '../components/MembersModal';
import ModeSelector    from '../components/ModeSelector';
import { useThemeColor, useThemeStyles } from '../hooks/useThemeColor';
import { DashboardHeaderSkeleton } from '../components/SkeletonLoader';
import { PlanBadge } from '../components/PlanBadge';
import toast from 'react-hot-toast';

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

const TABS = [
  { id: 'overview', label: 'Visão Geral', icon: <Trophy   size={14} /> },
  { id: 'manage',   label: 'Gestão',      icon: <Settings size={14} /> },
  { id: 'postgame', label: 'Pós-jogo',    icon: <Calendar size={14} /> },
];

const TabLoader = () => (
  <div className="space-y-3 pt-2">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="h-16 rounded-3xl bg-surface-1 animate-pulse" style={{ opacity: 1 - i * 0.2 }} />
    ))}
  </div>
);

// ─── DashboardPage ─────────────────────────────────────────────────────────────

const DashboardPage = () => {
  const navigate                        = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, signOut, user }      = useAuth();
  const {
    currentBaba, players, loading,
    generateInviteCode, nextGameDay, uploadBabaImage,
    countdown, ratePlayer, getAllRatings,
    gameConfirmations, myConfirmation, canConfirm,
    confirmPresence, cancelConfirmation, reloadConfirmations,
    drawConfig, setDrawConfig, isDrawing, currentMatch,
  } = useBaba();

  const features = useFeatures();

  useThemeColor();
  const tc = useThemeStyles();

  const activeTab    = searchParams.get('tab') || 'overview';
  const setActiveTab = (id) => setSearchParams({ tab: id }, { replace: true });

  const isPresident             = String(currentBaba?.president_id) === String(user?.id);
  const [isCoordinator, setIsCoordinator] = useState(false);
  const canManage               = isPresident || isCoordinator;

  // Sprint 1 — mostrar ModeSelector se baba não tem modo definido
  const [showModeSelector, setShowModeSelector] = useState(false);

  useEffect(() => {
    if (isPresident && currentBaba && !currentBaba.mode) {
      // Aguarda 800ms para não mostrar logo ao abrir
      const t = setTimeout(() => setShowModeSelector(true), 800);
      return () => clearTimeout(t);
    }
  }, [isPresident, currentBaba?.id, currentBaba?.mode]);

  useEffect(() => {
    if (!currentBaba?.id || !user?.id || isPresident) return;
    (async () => {
      const { supabase } = await import('../services/supabase');
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('baba_id', currentBaba.id)
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      setIsCoordinator(!!data);
    })();
  }, [currentBaba?.id, user?.id, isPresident]);

  const [showMembers,             setShowMembers]             = useState(false);
  const [selectedPlayerForRating, setSelectedPlayerForRating] = useState(null);
  const [showQRCode,              setShowQRCode]              = useState(false);
  const [isUploading,             setIsUploading]             = useState(false);
  const [inviteExpiry,            setInviteExpiry]            = useState(null);
  const [playerRatings,           setPlayerRatings]           = useState([]);
  const [copied,                  setCopied]                  = useState(false);

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

  useEffect(() => {
    setInviteExpiry(computeExpiryLabel(currentBaba?.invite_expires_at));
    const id = setInterval(
      () => setInviteExpiry(computeExpiryLabel(currentBaba?.invite_expires_at)), 1000,
    );
    return () => clearInterval(id);
  }, [currentBaba?.invite_expires_at]);

  const handleCopyCode = () => {
    if (!currentBaba?.invite_code) return;
    navigator.clipboard.writeText(currentBaba.invite_code);
    if (navigator.vibrate) navigator.vibrate(30);
    setCopied(true);
    toast.success('Código copiado!');
    setTimeout(() => setCopied(false), 2000);
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

  const handlePlayersUpdated = useCallback(async () => {
    const data = await getAllRatings();
    setPlayerRatings(data || []);
  }, [getAllRatings]);

  if (loading || !currentBaba) return (
    <div className="min-h-screen bg-black px-5 pt-14 pb-24">
      <DashboardHeaderSkeleton />
    </div>
  );

  const sharedProps = { currentBaba, isPresident, canManage, players: playersWithRatings };

  // Badge de modo do baba
  const modeBadge = {
    casual:      { label: 'Casual',      color: 'bg-cyan-electric/10 text-cyan-electric border-cyan-electric/20' },
    competitive: { label: 'Competitivo', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
    full:        { label: 'Completo',    color: 'bg-purple-400/10 text-purple-400 border-purple-400/20' },
  }[currentBaba.mode ?? 'casual'];

  return (
    <div className="min-h-screen bg-black text-white pb-24 font-sans">

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
            <div className="w-full h-full flex items-center justify-center font-black text-6xl italic"
              style={{ color: `rgba(${parseInt(tc.color.slice(1,3),16)},${parseInt(tc.color.slice(3,5),16)},${parseInt(tc.color.slice(5,7),16)},0.15)` }}
            >
              DRAFT PLAY
            </div>
          )}

          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-10">
              <RefreshCw className="animate-spin" size={32} style={tc.text} />
            </div>
          )}

          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #000000 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.2) 100%)' }} />

          {canManage && !isUploading && (
            <label className="absolute bottom-4 right-4 p-3 bg-black/60 backdrop-blur-md rounded-2xl border border-border-mid text-text-mid cursor-pointer transition-colors hover:text-white">
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
            <div
              className="w-32 h-32 rounded-[2.5rem] border-4 bg-gray-800 shadow-2xl overflow-hidden relative"
              style={{ borderColor: tc.color }}
            >
              {currentBaba?.logo_url ? (
                <img src={currentBaba.logo_url} className="w-full h-full object-cover" alt="Logo" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-4xl font-black italic" style={{ color: tc.color }}>
                  {(currentBaba?.name || '?').charAt(0)}
                </div>
              )}
            </div>
            {canManage && !isUploading && (
              <label className="absolute bottom-0 right-0 p-2 rounded-xl text-black cursor-pointer hover:scale-110 transition-transform shadow-lg" style={tc.bg}>
                <Edit3 size={16} />
                <input type="file" className="hidden" accept="image/*" onChange={e => handleUpload(e, 'avatar')} />
              </label>
            )}
          </div>

          <div className="mb-2">
            <h1 className="text-3xl font-black italic uppercase tracking-tighter leading-none">
              {currentBaba?.name}
            </h1>
            <div className="flex items-center gap-2 mt-2 text-[10px] font-black uppercase tracking-widest flex-wrap">
              <span style={tc.text}>@{profile?.name || 'atleta'}</span>
              {isPresident && (
                <span className="px-2 py-0.5 rounded border text-[9px] font-black uppercase" style={{ ...tc.bgAlpha(0.15), ...tc.border(0.3), color: tc.color }}>
                  Presidente
                </span>
              )}
              {/* Sprint 1 — badge do modo */}
              {modeBadge && (
                <button
                  onClick={() => isPresident && setShowModeSelector(true)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] font-black uppercase ${modeBadge.color} ${isPresident ? 'cursor-pointer hover:opacity-80' : ''}`}
                >
                  <Zap size={9} />
                  {modeBadge.label}
                </button>
              )}
              {currentBaba?.plan && currentBaba.plan !== 'free' && (
                <PlanBadge plan={currentBaba.plan} compact />
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
                  <div key={p.id || i} className="w-9 h-9 rounded-full border-2 border-black bg-gray-800 flex items-center justify-center text-[10px] font-black overflow-hidden shadow-lg">
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
            <button onClick={() => setShowMembers(true)} className="flex items-center gap-1 text-[9px] font-black uppercase hover:opacity-70 transition-opacity" style={tc.text}>
              Ver todos <ChevronRight size={10} />
            </button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md -mx-5 px-5 py-3 border-b border-border-subtle">
          <div className="flex gap-1" role="tablist">
            {TABS.map(tab => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                  activeTab === tab.id ? '' : 'text-text-low hover:text-text-mid hover:bg-surface-2 border-transparent'
                }`}
                style={activeTab === tab.id ? { ...tc.bgAlpha(0.1), ...tc.border(0.25), color: tc.color } : {}}
              >
                <span style={activeTab === tab.id ? tc.text : { color: 'var(--color-text-muted)' }}>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Conteúdo da aba ── */}
        <div className="pt-2">
          <Suspense fallback={<TabLoader />}>
            <div id="tabpanel-overview" role="tabpanel" hidden={activeTab !== 'overview'}>
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
                  reloadConfirmations={reloadConfirmations}
                  drawConfig={drawConfig}
                  setDrawConfig={setDrawConfig}
                  isDrawing={isDrawing}
                  loading={loading}
                  inviteExpiry={inviteExpiry}
                  handleCopyCode={handleCopyCode}
                  copied={copied}
                  generateInviteCode={generateInviteCode}
                  onShowQR={() => setShowQRCode(true)}
                />
              )}
            </div>
            <div id="tabpanel-manage" role="tabpanel" hidden={activeTab !== 'manage'}>
              {activeTab === 'manage' && (
                <TabManage
                  {...sharedProps}
                  currentMatch={currentMatch}
                  isDrawing={isDrawing}
                  playersWithRatings={playersWithRatings}
                  getAllRatings={getAllRatings}
                  setPlayerRatings={setPlayerRatings}
                />
              )}
            </div>
            <div id="tabpanel-postgame" role="tabpanel" hidden={activeTab !== 'postgame'}>
              {activeTab === 'postgame' && (
                <TabPostGame {...sharedProps} players={playersWithRatings} />
              )}
            </div>
          </Suspense>
        </div>
      </div>

      {/* ── Modais ── */}
      {showMembers && (
        <MembersModal
          players={playersWithRatings}
          onClose={() => setShowMembers(false)}
          currentUserId={user?.id}
          babaId={currentBaba?.id}
          presidentId={currentBaba?.president_id}
          onOpenRate={p => setSelectedPlayerForRating(p)}
          onPlayersUpdated={handlePlayersUpdated}
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

      {/* Sprint 1 — ModeSelector (presidente pode mudar modo) */}
      {showModeSelector && (
        <ModeSelector onClose={() => setShowModeSelector(false)} />
      )}
    </div>
  );
};

export default DashboardPage;
