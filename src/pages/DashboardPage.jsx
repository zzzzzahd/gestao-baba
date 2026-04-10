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

const DashboardPage = () => {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { currentBaba, players, loading, generateInviteCode, nextGameDay } = useBaba();

  const [showSettings, setShowSettings] = useState(false);
  const [inviteExpiry, setInviteExpiry] = useState(null);
  const [countdown, setCountdown] = useState('');

  const isPresident = String(currentBaba?.president_id) === String(profile?.id);

  const babaInitial = (currentBaba?.name || 'B').charAt(0).toUpperCase();

  // 🔥 CRONÔMETRO REAL
  useEffect(() => {
    if (!nextGameDay?.date) return;

    const interval = setInterval(() => {
      const now = new Date();
      const gameDate = new Date(nextGameDay.date);
      const diff = gameDate - now;

      if (diff <= 0) {
        setCountdown('Jogo em andamento');
        return;
      }

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown(
        `${String(h).padStart(2, '0')}:` +
        `${String(m).padStart(2, '0')}:` +
        `${String(s).padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [nextGameDay]);

  const nextGameLabel = (() => {
    if (!nextGameDay) return null;
    if (nextGameDay.daysAhead === 0) return `Hoje ${nextGameDay.time}`;
    if (nextGameDay.daysAhead === 1) return `Amanhã ${nextGameDay.time}`;
    return `${DAY_FULL[nextGameDay.day]} ${nextGameDay.time}`;
  })();

  const handleCopyInviteCode = () => {
    if (currentBaba?.invite_code) {
      navigator.clipboard.writeText(currentBaba.invite_code);
      toast.success('Código copiado!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">

      {/* 🔥 HEADER ESTILO FACEBOOK */}
      <div className="relative">

        {/* CAPA */}
        <div className="h-40 bg-black">
          {currentBaba?.cover_url && (
            <img
              src={currentBaba.cover_url}
              alt="Capa"
              className="w-full h-full object-cover opacity-80"
            />
          )}
        </div>

        {/* AVATAR */}
        <div className="absolute left-6 -bottom-10">
          <div className="w-24 h-24 rounded-full border-4 border-black overflow-hidden bg-gray-800 flex items-center justify-center">
            {currentBaba?.avatar_url ? (
              <img src={currentBaba.avatar_url} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-black">{babaInitial}</span>
            )}
          </div>
        </div>

        {/* LOGOUT */}
        <button
          onClick={signOut}
          className="absolute top-4 right-4 p-2 bg-black/50 rounded-lg"
        >
          <LogOut size={18} />
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-6 space-y-6 mt-14">

        {/* NOME */}
        <h1 className="text-2xl font-black">{currentBaba?.name}</h1>

        {/* 🔥 PRÓXIMO JOGO */}
        {nextGameDay && (
          <div className="bg-cyan-electric/10 border border-cyan-electric/30 rounded-2xl p-5 space-y-3">

            <div className="flex items-center gap-2">
              <Zap size={16} className="text-cyan-electric" />
              <p className="text-xs uppercase text-white/40 font-bold">
                Próximo jogo
              </p>
            </div>

            <h2 className="text-xl font-black text-cyan-electric">
              {nextGameLabel}
            </h2>

            <div className="text-2xl font-mono font-black">
              {countdown || 'Calculando...'}
            </div>

            {nextGameDay.location && (
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <MapPin size={14} />
                {nextGameDay.location}
              </div>
            )}
          </div>
        )}

        {/* PRESENÇA */}
        <PresenceConfirmation />

        {/* ATALHOS */}
        <div className="grid grid-cols-3 gap-4">
          <button onClick={() => navigate('/rankings')} className="p-4 bg-white/5 rounded-xl text-center">
            <Trophy className="mx-auto mb-2" size={20} />
            Ranking
          </button>

          <button onClick={() => navigate('/financial')} className="p-4 bg-white/5 rounded-xl text-center">
            <DollarSign className="mx-auto mb-2" size={20} />
            Caixa
          </button>

          <button onClick={() => navigate('/teams')} className="p-4 bg-white/5 rounded-xl text-center">
            <Users className="mx-auto mb-2" size={20} />
            Times
          </button>
        </div>

        {/* INFO */}
        <div className="bg-white/5 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm text-white/60">
            <Calendar size={14} />
            {currentBaba?.game_days?.join(', ') || 'Dias não definidos'}
          </div>

          <div className="flex items-center gap-2 text-sm text-white/60">
            <Clock size={14} />
            {currentBaba?.game_time || 'Horário não definido'}
          </div>

          <div className="flex items-center gap-2 text-sm text-white/60">
            <MapPin size={14} />
            {currentBaba?.location || 'Local não definido'}
          </div>
        </div>

        {/* SORTEIO */}
        {isPresident && <DrawConfigPanel />}

        {/* CONVITE */}
        {isPresident && (
          <div className="bg-cyan-electric/10 p-4 rounded-xl">
            <button onClick={generateInviteCode}>Gerar convite</button>
            <p>{currentBaba?.invite_code}</p>
            <button onClick={handleCopyInviteCode}>
              <Copy size={16} />
            </button>
          </div>
        )}

        {/* SETTINGS */}
        {isPresident && (
          <button
            onClick={() => setShowSettings(true)}
            className="w-full py-3 bg-white/5 rounded-xl"
          >
            <Settings size={16} /> Configurações
          </button>
        )}
      </div>

      {showSettings && (
        <BabaSettings
          baba={currentBaba}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};

export default DashboardPage;
