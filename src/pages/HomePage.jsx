import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBaba } from '../contexts/BabaContext';
import {
  Plus, LogIn, Trophy, User,
  ArrowRight, Play, Zap, Users
} from 'lucide-react';
import Logo from '../components/Logo';
import toast from 'react-hot-toast';

const DAY = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

// ─── Estado vazio para quem não tem nenhum baba ──────────────────────────────
// UX-001 FIX: orientação clara para novos usuários
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

    {/* Dica rápida */}
    <div className="flex items-start gap-3 p-4 bg-white/[0.03] border border-white/5 rounded-2xl text-left max-w-xs">
      <Zap size={16} className="text-cyan-electric shrink-0 mt-0.5" />
      <p className="text-[11px] text-white/30 leading-relaxed">
        O presidente do baba gera um código de 6 letras. Peça a ele e entre instantaneamente.
      </p>
    </div>
  </div>
);

// ─── Componente principal ────────────────────────────────────────────────────

const HomePage = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { myBabas, setCurrentBaba, joinBaba, loading } = useBaba();

  const [invite, setInvite] = useState('');

  const lastBaba  = useMemo(() => myBabas?.[0] || null, [myBabas]);
  const initials  = useMemo(() => profile?.name?.charAt(0)?.toUpperCase() || 'U', [profile]);
  const hasBabas  = myBabas?.length > 0;

  const joinBoxRef = React.useRef(null);

  const handleJoin = async () => {
    const code = invite.trim().toUpperCase();
    if (code.length !== 6) {
      toast.error('Código deve ter 6 caracteres');
      return;
    }
    const baba = await joinBaba(code);
    if (baba) navigate('/dashboard');
  };

  const openBaba = (baba) => {
    setCurrentBaba(baba);
    navigate('/dashboard');
  };

  const focusJoinBox = () => {
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
    <div className="min-h-screen bg-black text-white px-6 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <Logo size="small" />
        <button
          onClick={() => navigate('/profile')}
          className="w-10 h-10 rounded-full bg-cyan-electric/10 flex items-center justify-center border border-cyan-electric/20"
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} className="w-full h-full object-cover rounded-full" alt="" />
          ) : (
            <span className="text-cyan-electric font-black text-sm">{initials}</span>
          )}
        </button>
      </div>

      {/* Profile card */}
      <div className="card-glass p-5 rounded-3xl border border-white/5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-cyan-electric/10 flex items-center justify-center overflow-hidden">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" />
          ) : (
            <User className="text-cyan-electric" />
          )}
        </div>
        <div className="flex-1">
          <h2 className="font-black uppercase">{profile?.name || 'Jogador'}</h2>
          <p className="text-[10px] text-white/40 uppercase">{profile?.position || 'Sem posição'}</p>
          <p className="text-[9px] text-cyan-electric font-black uppercase">PLAYER HUB</p>
        </div>
        <button
          onClick={() => navigate('/profile')}
          className="px-3 py-2 bg-white/5 rounded-xl text-[10px] font-black uppercase border border-white/10"
        >
          Perfil
        </button>
      </div>

      {/* UX-001: Estado vazio OU conteúdo normal */}
      {!hasBabas ? (
        <EmptyState onCreateClick={() => navigate('/create')} onJoinFocus={focusJoinBox} />
      ) : (
        <>
          {/* Quick actions */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => navigate('/create')}
              className="p-4 rounded-2xl bg-cyan-electric text-black font-black text-[10px] uppercase flex flex-col items-center gap-2 active:scale-95 transition-transform"
            >
              <Plus size={18} />
              Criar
            </button>
            <button
              onClick={focusJoinBox}
              className="p-4 rounded-2xl bg-white/5 font-black text-[10px] uppercase flex flex-col items-center gap-2 active:scale-95 transition-transform"
            >
              <LogIn size={18} />
              Entrar
            </button>
            <button
              onClick={() => navigate('/rankings')}
              className="p-4 rounded-2xl bg-white/5 font-black text-[10px] uppercase flex flex-col items-center gap-2 active:scale-95 transition-transform"
            >
              <Trophy size={18} />
              Rank
            </button>
          </div>

          {/* Último baba em destaque */}
          {lastBaba && (
            <div
              onClick={() => openBaba(lastBaba)}
              className="p-5 rounded-3xl border border-cyan-electric/20 bg-cyan-electric/5 flex justify-between items-center cursor-pointer active:scale-95 transition-transform"
            >
              <div>
                <p className="text-[9px] font-black text-cyan-electric/60 uppercase tracking-widest mb-1">
                  Último acessado
                </p>
                <p className="font-black text-lg">{lastBaba.name}</p>
                <p className="text-[10px] text-white/40">
                  {lastBaba.game_time?.substring(0, 5)}
                </p>
              </div>
              <Play className="text-cyan-electric" size={28} />
            </div>
          )}

          {/* Meus Babas */}
          <div className="space-y-3">
            <h3 className="text-[10px] text-cyan-electric font-black uppercase tracking-widest">
              Meus Babas ({myBabas.length})
            </h3>
            {myBabas.map((baba) => (
              <button
                key={baba.id}
                onClick={() => openBaba(baba)}
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
                    <p className="font-black">{baba.name}</p>
                    <p className="text-[10px] text-white/40">{baba.modality} · {baba.game_time?.substring(0, 5)}</p>
                  </div>
                </div>
                <ArrowRight className="text-cyan-electric" size={18} />
              </button>
            ))}
          </div>
        </>
      )}

      {/* Join Box — sempre visível no fundo */}
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
          disabled={invite.length !== 6}
          className="w-full p-4 bg-green-500 text-black font-black uppercase rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all"
        >
          Entrar no Baba
        </button>
      </div>

    </div>
  );
};

export default HomePage;
