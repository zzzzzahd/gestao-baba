import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBaba } from '../contexts/BabaContext';

import {
  Plus,
  LogIn,
  Trophy,
  User,
  ArrowRight,
  Play,
  Calendar
} from 'lucide-react';

import Logo from '../components/Logo';
import toast from 'react-hot-toast';

const DAY = ['DOM','SEG','TER','QUA','QUI','SEX','SÁB'];

const HomePageV4 = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { myBabas, setCurrentBaba, joinBaba, loading } = useBaba();

  const [invite, setInvite] = useState('');

  // ───────────────
  // DERIVADOS
  // ───────────────
  const lastBaba = useMemo(() => myBabas?.[0] || null, [myBabas]);

  const initials = useMemo(
    () => profile?.name?.charAt(0)?.toUpperCase() || 'U',
    [profile]
  );

  // ───────────────
  // JOIN
  // ───────────────
  const handleJoin = async () => {
    const code = invite.trim().toUpperCase();

    if (code.length !== 6) {
      toast.error('Código inválido');
      return;
    }

    const res = await joinBaba(code);
    if (res) navigate('/dashboard');
  };

  // ───────────────
  // OPEN BABA
  // ───────────────
  const openBaba = (baba) => {
    setCurrentBaba(baba);
    navigate('/dashboard');
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

      {/* ───────── HEADER ───────── */}
      <div className="flex items-center justify-between">
        <Logo size="small" />

        <button
          onClick={() => navigate('/profile')}
          className="w-10 h-10 rounded-full bg-cyan-electric/10 flex items-center justify-center border border-cyan-electric/20"
        >
          <span className="text-cyan-electric font-black text-sm">
            {initials}
          </span>
        </button>
      </div>

      {/* ───────── PROFILE CARD ───────── */}
      <div className="card-glass p-5 rounded-3xl border border-white/5 flex items-center gap-4">

        <div className="w-14 h-14 rounded-2xl bg-cyan-electric/10 flex items-center justify-center overflow-hidden">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} className="w-full h-full object-cover" />
          ) : (
            <User className="text-cyan-electric" />
          )}
        </div>

        <div className="flex-1">
          <h2 className="font-black uppercase">
            {profile?.name || 'Jogador'}
          </h2>
          <p className="text-[10px] text-white/40 uppercase">
            {profile?.position || 'Sem posição'}
          </p>
          <p className="text-[9px] text-cyan-electric font-black uppercase">
            PLAYER HUB
          </p>
        </div>

        <button
          onClick={() => navigate('/profile')}
          className="px-3 py-2 bg-white/5 rounded-xl text-[10px] font-black uppercase border border-white/10"
        >
          Perfil
        </button>

      </div>

      {/* ───────── QUICK ACTIONS (AJUSTADO) ───────── */}
      <div className="grid grid-cols-3 gap-3">

        <button
          onClick={() => navigate('/create')}
          className="p-4 rounded-2xl bg-cyan-electric text-black font-black text-[10px] uppercase flex flex-col items-center gap-2"
        >
          <Plus size={18} />
          Criar
        </button>

        <button
          onClick={() => document.getElementById('joinBox').scrollIntoView()}
          className="p-4 rounded-2xl bg-white/5 font-black text-[10px] uppercase flex flex-col items-center gap-2"
        >
          <LogIn size={18} />
          Entrar
        </button>

        <button
          onClick={() => navigate('/rankings')}
          className="p-4 rounded-2xl bg-white/5 font-black text-[10px] uppercase flex flex-col items-center gap-2"
        >
          <Trophy size={18} />
          Rank
        </button>

      </div>

      {/* ───────── LAST BABA (DESTAQUE REAL) ───────── */}
      {lastBaba && (
        <div
          onClick={() => openBaba(lastBaba)}
          className="p-5 rounded-3xl border border-cyan-electric/20 bg-cyan-electric/5 flex justify-between items-center"
        >
          <div>
            <p className="font-black">{lastBaba.name}</p>
            <p className="text-[10px] text-white/40">
              {lastBaba.game_time?.substring(0,5)}
            </p>
          </div>

          <Play className="text-cyan-electric" />
        </div>
      )}

      {/* ───────── JOIN BOX ───────── */}
      <div
        id="joinBox"
        className="card-glass p-5 rounded-3xl space-y-3"
      >
        <p className="text-[10px] text-white/40 uppercase font-black">
          Entrar com código
        </p>

        <input
          value={invite}
          onChange={(e) =>
            setInvite(
              e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
            )
          }
          placeholder="AB12CD"
          className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl text-center tracking-widest font-black"
          maxLength={6}
        />

        <button
          onClick={handleJoin}
          className="w-full p-4 bg-green-500 text-black font-black uppercase rounded-2xl"
        >
          Entrar no Baba
        </button>
      </div>

      {/* ───────── MEUS BABAS ───────── */}
      <div className="space-y-3">

        <h3 className="text-[10px] text-cyan-electric font-black uppercase">
          Meus Babas
        </h3>

        {myBabas?.length ? (
          myBabas.map((baba) => (
            <button
              key={baba.id}
              onClick={() => openBaba(baba)}
              className="w-full p-4 rounded-2xl bg-white/5 flex justify-between items-center"
            >
              <div>
                <p className="font-black">{baba.name}</p>
                <p className="text-[10px] text-white/40">
                  {baba.game_time?.substring(0,5)}
                </p>
              </div>

              <ArrowRight className="text-cyan-electric" />
            </button>
          ))
        ) : (
          <div className="text-center text-white/30 p-6">
            Nenhum baba criado
          </div>
        )}

      </div>

    </div>
  );
};

export default HomePageV4;
