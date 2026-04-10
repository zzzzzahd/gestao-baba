import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBaba } from '../contexts/BabaContext';
import {
  Trophy, Users, DollarSign, LogOut,
  Calendar, Copy, Settings, MapPin, Clock, RefreshCw, Timer, Zap,
} from 'lucide-react';
import PresenceConfirmation from '../components/PresenceConfirmation';
import BabaSettings from '../components/BabaSettings';
import DrawConfigPanel from '../components/DrawConfigPanel';
import toast from 'react-hot-toast';

const DAY_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const DAY_FULL  = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

// ── Helpers de display ────────────────────────────────────

/** Formata config deduplicada + ordenada */
const formatConfig = (config) => {
  if (!Array.isArray(config) || config.length === 0) return null;
  const seen = new Set();
  return config
    .filter((c) => { const d = Number(c.day); if (seen.has(d)) return false; seen.add(d); return true; })
    .sort((a, b) => Number(a.day) - Number(b.day))
    .map((c) => `${DAY_SHORT[Number(c.day)]} ${c.time?.substring(0, 5) || ''}`.trim())
    .join(' · ');
};

/** Formata legado */
const formatLegacyDays = (days) => {
  if (!Array.isArray(days) || days.length === 0) return null;
  return [...new Set(days.map(Number))].sort((a, b) => a - b).map((d) => DAY_SHORT[d] ?? d).join(' · ');
};

/** Label "Expira em..." com diff em tempo real */
const computeExpiryLabel = (expiresAt) => {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt) - new Date();
  if (diff <= 0) return 'Expirado';
  const hours   = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `Expira em ${hours}h ${minutes}min`;
  return `Expira em ${minutes}min`;
};

/** Label "Próximo jogo" a partir do nextGameDay */
const formatNextGame = (next) => {
  if (!next) return null;
  const { day, time, daysAhead } = next;
  const dayName = DAY_FULL[day] || DAY_SHORT[day];
  const timeStr = time?.substring(0, 5) || '';
  if (daysAhead === 0) return `Hoje ${timeStr}`;
  if (daysAhead === 1) return `Amanhã ${timeStr}`;
  return `${dayName} ${timeStr}`;
};

// ─────────────────────────────────────────────────────────

const DashboardPage = () => {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { currentBaba, players, loading, generateInviteCode, nextGameDay } = useBaba();

  const [showSettings, setShowSettings] = useState(false);
  const [inviteExpiry, setInviteExpiry] = useState(
    () => computeExpiryLabel(currentBaba?.invite_expires_at)
  );

  // Contador adaptativo de expiração (1s no último minuto, 60s no restante)
  useEffect(() => {
    setInviteExpiry(computeExpiryLabel(currentBaba?.invite_expires_at));
    if (!currentBaba?.invite_expires_at) return;

    let intervalId;
    const tick = () => {
      const label = computeExpiryLabel(currentBaba.invite_expires_at);
      setInviteExpiry(label);
      if (label === 'Expirado') { clearInterval(intervalId); return; }
      const diff = new Date(currentBaba.invite_expires_at) - new Date();
      clearInterval(intervalId);
      intervalId = setInterval(tick, diff < 60_000 ? 1_000 : 60_000);
    };
    const diff = new Date(currentBaba.invite_expires_at) - new Date();
    intervalId = setInterval(tick, diff < 60_000 ? 1_000 : 60_000);
    return () => clearInterval(intervalId);
  }, [currentBaba?.invite_expires_at]);

  const isPresident   = String(currentBaba?.president_id) === String(profile?.id);
  const inviteExpired = inviteExpiry === 'Expirado';

  // Dados de dias — dedup + sort garantido
  const gameDaysDisplay = currentBaba?.game_days_config?.length > 0
    ? formatConfig(currentBaba.game_days_config)
    : formatLegacyDays(currentBaba?.game_days);

  // Horário principal: primeiro item ordenado da config
  const mainGameTime = (() => {
    if (Array.isArray(currentBaba?.game_days_config) && currentBaba.game_days_config.length > 0) {
      const sorted = [...currentBaba.game_days_config].sort((a, b) => Number(a.day) - Number(b.day));
      return sorted[0]?.time?.substring(0, 5) || null;
    }
    return currentBaba?.game_time?.substring(0, 5) || null;
  })();

  const nextGameLabel = formatNextGame(nextGameDay);

  const handleCopyInviteCode = () => {
    if (currentBaba?.invite_code) {
      navigator.clipboard.writeText(currentBaba.invite_code);
      toast.success('Código copiado!');
    }
  };

  // Fallback de avatar do baba (iniciais)
  const babaInitial = (currentBaba?.name || 'B').charAt(0).toUpperCase();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-cyan-electric border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Sincronizando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24 font-sans">

      {/* ── HEADER ── */}
      <div className="p-6 bg-gradient-to-b from-cyan-electric/10 to-transparent">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-electric to-blue-600 flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(0,242,255,0.3)]">
                <span className="text-2xl font-black text-black">
                  {profile?.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-4 border-black" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-black italic tracking-tighter uppercase leading-none">
                {profile?.name || 'Comandante'}
              </h2>
              {(profile?.age || profile?.position || profile?.favorite_team) && (
                <div className="flex items-center gap-2 mt-1 text-[10px] font-black uppercase tracking-wider text-white/60 flex-wrap">
                  {profile?.age && <span>{profile.age} anos</span>}
                  {profile?.age && profile?.position && <span>•</span>}
                  {profile?.position && <span>{profile.position}</span>}
                  {(profile?.age || profile?.position) && profile?.favorite_team && <span>•</span>}
                  {profile?.favorite_team && (
                    <span className="truncate max-w-[100px]">{profile.favorite_team}</span>
                  )}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="p-3 bg-white/5 rounded-2xl hover:bg-red-500/20 text-white/40 hover:text-red-500 transition-all"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 space-y-6">
        {currentBaba ? (
          <>
            {/* ── ATALHOS ── */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: <Trophy size={20} />, label: 'Ranking', path: '/rankings' },
                { icon: <DollarSign size={20} />, label: 'Caixa', path: '/financial' },
                { icon: <Users size={20} />, label: 'Times', path: '/teams' },
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={() => navigate(item.path)}
                  className="flex flex-col items-center gap-3 p-6 card-glass rounded-3xl border border-white/5 hover:bg-white/10 transition-all bg-white/5"
                >
                  <div className="text-cyan-electric opacity-60">{item.icon}</div>
                  <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
                </button>
              ))}
            </div>

            {/* ── INFO DO BABA ── */}
            <div className="card-glass rounded-3xl border border-white/5 bg-white/5 overflow-hidden">
              {/* Capa */}
              {currentBaba.cover_url && (
                <div className="w-full h-24 overflow-hidden">
                  <img src={currentBaba.cover_url} alt="Capa"
                    className="w-full h-full object-cover opacity-60"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              )}

              <div className="p-6 space-y-4">
                {/* Avatar + nome */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 flex-shrink-0">
                    {currentBaba.avatar_url ? (
                      <img
                        src={currentBaba.avatar_url}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback se imagem falhar
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = `<div class="w-full h-full bg-cyan-electric/10 flex items-center justify-center text-cyan-electric font-black text-lg">${babaInitial}</div>`;
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-cyan-electric/10 flex items-center justify-center">
                        <span className="text-cyan-electric font-black text-lg">{babaInitial}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-black opacity-60 uppercase tracking-widest">
                    {currentBaba.name}
                  </p>
                </div>

                {/* Próximo jogo — destaque */}
                {nextGameLabel && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-cyan-electric/10 border border-cyan-electric/20 rounded-xl">
                    <Zap size={14} className="text-cyan-electric flex-shrink-0" />
                    <div>
                      <p className="text-[9px] font-black text-white/40 uppercase">Próximo Jogo</p>
                      <p className="text-sm font-black text-cyan-electric">{nextGameLabel}</p>
                    </div>
                    {nextGameDay?.location && (
                      <p className="text-[9px] text-white/40 ml-auto">{nextGameDay.location}</p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {/* Horário principal */}
                  {mainGameTime && (
                    <div className="flex items-start gap-3">
                      <Clock size={14} className="text-cyan-electric mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[9px] font-black opacity-40 uppercase mb-0.5">Horário</p>
                        <p className="text-sm font-black italic">{mainGameTime}</p>
                      </div>
                    </div>
                  )}

                  {/* Modalidade */}
                  <div className="flex items-start gap-3">
                    <Trophy size={14} className="text-cyan-electric mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[9px] font-black opacity-40 uppercase mb-0.5">Modalidade</p>
                      <p className="text-sm font-black italic uppercase">{currentBaba.modality || '—'}</p>
                    </div>
                  </div>

                  {/* Dias */}
                  {gameDaysDisplay && (
                    <div className="flex items-start gap-3 col-span-2">
                      <Calendar size={14} className="text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[9px] font-black opacity-40 uppercase mb-0.5">Dias de Jogo</p>
                        <p className="text-sm font-black italic">{gameDaysDisplay}</p>
                      </div>
                    </div>
                  )}

                  {/* Jogadores */}
                  <div className="flex items-start gap-3">
                    <Users size={14} className="text-cyan-electric mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[9px] font-black opacity-40 uppercase mb-0.5">Atletas</p>
                      <p className="text-sm font-black italic">{players?.length || 0} jogadores</p>
                    </div>
                  </div>

                  {/* Local */}
                  <div className="flex items-start gap-3">
                    <MapPin size={14} className="text-white/30 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[9px] font-black opacity-40 uppercase mb-0.5">Local</p>
                      <p className="text-sm font-black italic text-white/40">
                        {currentBaba.location || 'A definir'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── CONFIRMAÇÃO DE PRESENÇA ── */}
            <PresenceConfirmation />

            {/* ── SORTEIO (só presidente) ── */}
            {isPresident && <DrawConfigPanel />}

            {/* ── CÓDIGO DE CONVITE (só presidente) ── */}
            {isPresident && (
              <div className="card-glass p-6 rounded-3xl border border-cyan-electric/20 bg-cyan-electric/5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[9px] font-black opacity-40 uppercase mb-1">Código de Convite</p>
                    <p className="text-xs text-white/60">Válido por 24h após geração</p>
                  </div>
                  <button
                    onClick={generateInviteCode}
                    disabled={loading}
                    className="p-2 bg-white/5 border border-white/10 rounded-xl text-white/40 hover:text-cyan-electric hover:border-cyan-electric/30 transition-all disabled:opacity-50"
                    title="Gerar novo código"
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>

                {currentBaba.invite_code && !inviteExpired ? (
                  <>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex-1 bg-black/30 px-4 py-3 rounded-xl border border-white/10">
                        <p className="text-2xl font-black tracking-widest text-cyan-electric text-center">
                          {currentBaba.invite_code}
                        </p>
                      </div>
                      <button
                        onClick={handleCopyInviteCode}
                        className="p-3 bg-cyan-electric/10 border border-cyan-electric/30 rounded-xl text-cyan-electric hover:bg-cyan-electric/20 transition-all"
                      >
                        <Copy size={20} />
                      </button>
                    </div>
                    {inviteExpiry && (
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase text-white/40">
                        <Timer size={12} />
                        <span className={inviteExpiry.includes('min') && !inviteExpiry.includes('h') ? 'text-yellow-500' : ''}>
                          {inviteExpiry}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-2">
                    {inviteExpired && (
                      <p className="text-[10px] text-red-400 font-black uppercase text-center mb-2">
                        Código expirado — gere um novo
                      </p>
                    )}
                    <button
                      onClick={generateInviteCode}
                      disabled={loading}
                      className="w-full py-3 rounded-xl bg-cyan-electric/10 border border-cyan-electric/30 text-cyan-electric font-black uppercase text-xs tracking-widest hover:bg-cyan-electric/20 transition-all disabled:opacity-50"
                    >
                      {loading ? 'Gerando...' : 'Gerar Código de Convite'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── CONFIGURAÇÕES (só presidente) ── */}
            {isPresident && (
              <button
                onClick={() => setShowSettings(true)}
                className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white/60 font-black uppercase text-xs tracking-widest hover:bg-white/10 hover:text-white hover:border-cyan-electric/30 transition-all flex items-center justify-center gap-2"
              >
                <Settings size={16} />
                Configurações do Baba
              </button>
            )}
          </>
        ) : (
          <div className="py-20 text-center space-y-6">
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-dashed border-white/20">
              <Trophy className="opacity-20" size={40} />
            </div>
            <p className="text-sm font-bold opacity-40 uppercase tracking-widest">Nenhum baba selecionado</p>
            <button
              onClick={() => navigate('/')}
              className="px-8 py-4 bg-cyan-electric text-black font-black uppercase text-[10px] rounded-2xl shadow-neon-cyan"
            >
              Criar ou Entrar em um Baba
            </button>
          </div>
        )}
      </div>

      {showSettings && currentBaba && (
        <BabaSettings baba={currentBaba} onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
};

export default DashboardPage;
