import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBaba } from '../contexts/BabaContext';
import {
  Plus, LogIn, Trophy, User,
  ArrowRight, Zap, Users, CheckCircle2, Clock
} from 'lucide-react';
import Logo from '../components/Logo';
import toast from 'react-hot-toast';
// Tarefa 1.1 — constantes centralizadas (antes duplicadas aqui e no Dashboard)
import { DAY_SHORT } from '../utils/constants';
// Tarefa 1.3 — usar o hook existente em vez da reimplementação inline
import { useCountdown as useCountdownDate } from '../hooks/useCountdown';

// ─── Countdown adaptado para o card de baba ───────────────────────────────────
// O hook useCountdown.js recebe uma Date; aqui convertemos day-of-week+time → Date
const useBabaCountdown = (targetDayOfWeek, targetTime) => {
  const [targetDate, setTargetDate] = useState(null);

  useEffect(() => {
    if (targetDayOfWeek == null || !targetTime) { setTargetDate(null); return; }

    const calc = () => {
      const now = new Date();
      const [h, m] = targetTime.split(':').map(Number);
      const target = new Date();
      target.setHours(h, m, 0, 0);
      let daysUntil = (targetDayOfWeek - now.getDay() + 7) % 7;
      if (daysUntil === 0 && now >= target) daysUntil = 7;
      target.setDate(target.getDate() + daysUntil);
      setTargetDate(target);
    };

    calc();
    const id = setInterval(calc, 60000);
    return () => clearInterval(id);
  }, [targetDayOfWeek, targetTime]);

  // AQUI ESTAVA O ERRO: Use o hook que você importou corretamente
  const cd = useCountdown(targetDate); 

  if (!cd?.active) return '';
  if (cd.d > 0) return `${cd.d}d ${cd.h}h ${cd.m}m`;
  if (cd.h > 0) return `${cd.h}h ${cd.m}m`;
  return `${cd.m}m`;
};

// ─── Estado vazio ─────────────────────────────────────────────────────────────
const EmptyState = ({ onCreateClick, onJoinFocus }) => (
  <div className="flex flex-col items-center text-center py-12 px-4 space-y-8">
    <div className="w-24 h-24 rounded-[2rem] bg-cyan-electric/10 border border-cyan-electric/20 flex items-center justify-center shadow-[0_0_40px_rgba(0,242,255,0.08)]">
      <Users size={40} className="text-cyan-electric/60" />
    </div>

    <div className="space-y-2">
      <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">
        Bem-vindo ao Draft!
      </h2>
      <p className="text-white/40 text-sm max-w-xs leading-relaxed">
        Você ainda não faz parte de nenhum baba. Crie o seu ou entre em um pelo código de convite.
      </p>
    </div>

    <div className="w-full space-y-3 max-w-xs">
      <button
        onClick={onCreateClick}
        className="w-full py-5 rounded-2xl font-black text-black uppercase text-sm tracking-widest flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(0,242,255,0.25)] active:scale-95 transition-all"
        style={{ background: 'linear-gradient(135deg, #00f2ff, #0066ff)' }}
      >
        <Plus size={20} />
        Criar meu Baba
      </button>

      <button
        onClick={onJoinFocus}
        className="w-full py-4 rounded-2xl font-black bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all active:scale-95 uppercase text-xs tracking-widest flex items-center justify-center gap-3"
      >
        <LogIn size={18} />
        Entrar com código de convite
      </button>
    </div>

    <div className="flex items-start gap-3 p-4 bg-white/[0.03] border border-white/5 rounded-2xl text-left max-w-xs">
      <Zap size={16} className="text-cyan-electric shrink-0 mt-0.5" />
      <p className="text-[11px] text-white/30 leading-relaxed">
        O presidente do baba gera um código de 6 letras. Peça a ele e entre instantaneamente.
      </p>
    </div>
  </div>
);

// ─── Hero card — próximo baba ─────────────────────────────────────────────────
const HeroBabaCard = ({ baba, onClick }) => {
  const dayIndex = baba.game_days_config?.[0] ?? baba.game_day_of_week ?? null;
  const gameTime = baba.game_time?.substring(0, 5) ?? null;
  const countdown = useBabaCountdown(dayIndex, gameTime);
  const dayLabel = dayIndex != null ? DAY_SHORT[dayIndex] : null;

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-5 rounded-3xl border border-cyan-electric/30 active:scale-[0.98] transition-transform"
      style={{
        background: 'linear-gradient(135deg, rgba(0,242,255,0.08) 0%, rgba(0,102,255,0.05) 100%)',
        boxShadow: '0 0 40px rgba(0,242,255,0.06)',
      }}
    >
      {/* Label */}
      <p className="text-[9px] font-black text-cyan-electric/50 uppercase tracking-widest mb-3">
        próximo jogo
      </p>

      {/* Nome + logo */}
      <div className="flex items-center gap-3 mb-4">
        {baba.logo_url ? (
          <img src={baba.logo_url} className="w-12 h-12 rounded-2xl object-cover border border-white/10" alt="" />
        ) : (
          <div className="w-12 h-12 rounded-2xl bg-cyan-electric/10 flex items-center justify-center border border-cyan-electric/20 text-cyan-electric font-black text-lg">
            {baba.name.charAt(0)}
          </div>
        )}
        <div>
          <h2 className="font-black text-xl uppercase italic tracking-tight leading-none">
            {baba.name}
          </h2>
          {(dayLabel || gameTime) && (
            <p className="text-[11px] text-white/40 mt-0.5">
              {dayLabel && <span>{dayLabel}</span>}
              {dayLabel && gameTime && <span className="mx-1">·</span>}
              {gameTime && <span>{gameTime}</span>}
            </p>
          )}
        </div>
      </div>

      {/* Countdown + CTA */}
      <div className="flex items-center justify-between">
        {countdown ? (
          <div className="flex items-center gap-2">
            <Clock size={13} className="text-cyan-electric/60" />
            <span className="text-cyan-electric font-black text-sm tracking-wide">
              {countdown}
            </span>
          </div>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-1 text-cyan-electric text-[11px] font-black uppercase tracking-widest">
          Abrir
          <ArrowRight size={13} />
        </div>
      </div>
    </button>
  );
};

// ─── Item da lista de babas ───────────────────────────────────────────────────
const BabaListItem = ({ baba, onClick }) => {
  const dayIndex = baba.game_days_config?.[0] ?? baba.game_day_of_week ?? null;
  const gameTime = baba.game_time?.substring(0, 5) ?? null;
  const dayLabel = dayIndex != null ? DAY_SHORT[dayIndex] : null;

  // Stub de presença — futuramente virá do contexto
  const confirmed = baba.userConfirmed ?? false;

  return (
    <button
      onClick={onClick}
      className="w-full p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 flex justify-between items-center transition-all active:scale-95"
    >
      <div className="flex items-center gap-3">
        {baba.logo_url ? (
          <img src={baba.logo_url} className="w-10 h-10 rounded-xl object-cover" alt="" />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-cyan-electric/10 flex items-center justify-center text-cyan-electric font-black">
            {baba.name.charAt(0)}
          </div>
        )}
        <div className="text-left">
          <p className="font-black text-sm">{baba.name}</p>
          <p className="text-[10px] text-white/40">
            {dayLabel && <span>{dayLabel}</span>}
            {dayLabel && gameTime && <span className="mx-1">·</span>}
            {gameTime && <span>{gameTime}</span>}
            {!dayLabel && !gameTime && <span>{baba.modality}</span>}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {confirmed && (
          <CheckCircle2 size={14} className="text-cyan-electric" />
        )}
        <ArrowRight className="text-white/30" size={16} />
      </div>
    </button>
  );
};

// ─── FAB ─────────────────────────────────────────────────────────────────────
const FAB = ({ onClick }) => (
  <button
    onClick={onClick}
    className="fixed bottom-24 right-5 w-14 h-14 rounded-full flex items-center justify-center z-[60] active:scale-90 transition-transform"
    style={{
      background: 'linear-gradient(135deg, #00f2ff, #0066ff)',
      boxShadow: '0 8px 32px rgba(0,242,255,0.35)',
    }}
    aria-label="Criar ou entrar em baba"
  >
    <Plus size={24} className="text-black" strokeWidth={3} />
  </button>
);

// ─── FAB Menu (criar / entrar) ────────────────────────────────────────────────
const FABMenu = ({ onClose, onCreate, onJoin }) => (
  <>
    {/* Backdrop */}
    <div
      className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    />
    {/* Opções */}
    <div className="fixed bottom-44 right-5 z-[60] flex flex-col items-end gap-3">
      <div className="flex items-center gap-3">
        <span className="text-[11px] text-white/60 font-black uppercase tracking-widest bg-black/80 px-3 py-1.5 rounded-xl border border-white/10">
          Entrar com código
        </span>
        <button
          onClick={onJoin}
          className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center active:scale-90 transition-transform"
        >
          <LogIn size={18} className="text-white" />
        </button>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[11px] text-white/60 font-black uppercase tracking-widest bg-black/80 px-3 py-1.5 rounded-xl border border-white/10">
          Criar baba
        </span>
        <button
          onClick={onCreate}
          className="w-12 h-12 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: 'linear-gradient(135deg, #00f2ff, #0066ff)' }}
        >
          <Plus size={20} className="text-black" strokeWidth={3} />
        </button>
      </div>
    </div>
  </>
);

// ─── Componente principal ────────────────────────────────────────────────────
const HomePage = () => {
  const navigate  = useNavigate();
  const { profile } = useAuth();
  const { myBabas, setCurrentBaba, joinBaba, loading } = useBaba();

  const [invite, setInvite]     = useState('');
  const [fabOpen, setFabOpen]   = useState(false);
  // Tarefa 1.4 — feedback visual no botão de join
  const [joining, setJoining]   = useState(false);

  const nextBaba  = useMemo(() => myBabas?.[0] || null, [myBabas]);
  const restBabas = useMemo(() => myBabas?.slice(1) || [], [myBabas]);
  const initials  = useMemo(() => profile?.name?.charAt(0)?.toUpperCase() || 'U', [profile]);
  const hasBabas  = myBabas?.length > 0;

  const joinBoxRef = useRef(null);

  const handleJoin = async () => {
    const code = invite.trim().toUpperCase();
    if (code.length !== 6) {
      toast.error('Código deve ter 6 caracteres');
      return;
    }
    setJoining(true);
    try {
      const baba = await joinBaba(code);
      if (baba) navigate('/dashboard');
    } finally {
      setJoining(false);
    }
  };

  const openBaba = (baba) => {
    setCurrentBaba(baba);
    navigate('/dashboard');
  };

  const focusJoinBox = () => {
    setFabOpen(false);
    joinBoxRef.current?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => {
      joinBoxRef.current?.querySelector('input')?.focus();
    }, 400);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-cyan-electric border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white px-5 pt-6 pb-32 space-y-5">

      {/* ── Topo compacto ── */}
      <div className="flex items-center justify-between">
        <Logo size="small" />
        <button
          onClick={() => navigate('/profile')}
          className="w-10 h-10 rounded-full bg-cyan-electric/10 flex items-center justify-center border border-cyan-electric/20 overflow-hidden"
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" />
          ) : (
            <span className="text-cyan-electric font-black text-sm">{initials}</span>
          )}
        </button>
      </div>

      {/* ── Estado vazio OR conteúdo ── */}
      {!hasBabas ? (
        <EmptyState onCreateClick={() => navigate('/create')} onJoinFocus={focusJoinBox} />
      ) : (
        <>
          {/* ── Hero: próximo baba ── */}
          {nextBaba && (
            <HeroBabaCard baba={nextBaba} onClick={() => openBaba(nextBaba)} />
          )}

          {/* ── Demais babas (a partir do 2º) ── */}
          {restBabas.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[10px] text-white/30 font-black uppercase tracking-widest px-1">
                Meus Babas ({myBabas.length})
              </h3>
              {myBabas.map((baba) => (
                <BabaListItem
                  key={baba.id}
                  baba={baba}
                  onClick={() => openBaba(baba)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Join Box — sempre no final ── */}
      <div ref={joinBoxRef} className="card-glass p-5 rounded-3xl space-y-3 border border-white/5">
        <p className="text-[10px] text-white/40 uppercase font-black tracking-widest">
          Entrar com código
        </p>
        <input
          value={invite}
          onChange={e => setInvite(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
          placeholder="AB12CD"
          maxLength={6}
          className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl text-center tracking-widest font-black text-lg focus:border-cyan-electric/50 outline-none transition-colors"
        />
        <button
          onClick={handleJoin}
          disabled={invite.length !== 6 || joining}
          className="w-full p-4 font-black uppercase rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all text-black flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #00f2ff, #0066ff)' }}
        >
          {joining ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Entrando...
            </>
          ) : 'Entrar no Baba'}
        </button>
      </div>

      {/* ── FAB ── */}
      {hasBabas && (
        <>
          {fabOpen && (
            <FABMenu
              onClose={() => setFabOpen(false)}
              onCreate={() => { setFabOpen(false); navigate('/create'); }}
              onJoin={focusJoinBox}
            />
          )}
          <FAB onClick={() => setFabOpen(v => !v)} />
        </>
      )}
    </div>
  );
};

export default HomePage;
