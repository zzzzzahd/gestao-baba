import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBaba } from '../contexts/BabaContext';

import {
  PlusCircle,
  LogIn,
  Trophy,
  Users,
  User,
  Clock,
  Calendar,
  MapPin,
  ArrowRight,
  Play,
  Target,
  Sparkles,
  X
} from 'lucide-react';

import Logo from '../components/Logo';
import toast from 'react-hot-toast';

const DAYS = ['DOM','SEG','TER','QUA','QUI','SEX','SÁB'];

// ─────────────────────────────
// HELPERS
// ─────────────────────────────
const formatDays = (baba) => {
  let days = [];

  if (Array.isArray(baba?.game_days_config)) {
    days = baba.game_days_config.map(d => Number(d.day));
  } else if (Array.isArray(baba?.game_days)) {
    days = baba.game_days.map(Number);
  }

  return [...new Set(days)]
    .filter(d => d >= 0 && d <= 6)
    .sort()
    .map(d => DAYS[d])
    .join(' · ');
};

// ─────────────────────────────
// MODAL BASE
// ─────────────────────────────
const Modal = ({ children, onClose }) => (
  <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
    <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl p-5 relative">
      <button onClick={onClose} className="absolute top-4 right-4 text-white/40">
        <X />
      </button>
      {children}
    </div>
  </div>
);

// ─────────────────────────────
// HOME V4
// ─────────────────────────────
const HomePageV4 = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { myBabas, setCurrentBaba, createBaba, joinBaba, loading } = useBaba();

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [inviteCode, setInviteCode] = useState('');

  const [form, setForm] = useState({
    name: '',
    modality: 'futsal',
    game_time: '20:00',
    match_duration: 10,
    game_days: []
  });

  // ─────────────────────────────
  // CONTEXTUAL DATA
  // ─────────────────────────────
  const lastBaba = useMemo(() => myBabas?.[0] || null, [myBabas]);
  const profileInitial = profile?.name?.charAt(0)?.toUpperCase() || 'U';

  // ─────────────────────────────
  // CREATE (FULL COMPAT)
  // ─────────────────────────────
  const handleCreate = async () => {
    if (!form.name.trim()) return toast.error('Nome obrigatório');
    if (!form.game_days.length) return toast.error('Selecione dias');

    const game_days_config = form.game_days.map(d => ({
      day: Number(d),
      time: form.game_time,
      location: ''
    }));

    const res = await createBaba({
      ...form,
      game_days: form.game_days.map(Number),
      game_days_config
    });

    if (res) {
      toast.success('Baba criado!');
      setShowCreate(false);
      setForm({ name:'', modality:'futsal', game_time:'20:00', match_duration:10, game_days:[] });
    }
  };

  // ─────────────────────────────
  // JOIN (ROBUSTO)
  // ─────────────────────────────
  const handleJoin = async () => {
    const code = inviteCode.trim().toUpperCase();

    if (code.length !== 6) {
      return toast.error('Código inválido');
    }

    const res = await joinBaba(code);

    if (res) {
      toast.success('Entrou no baba!');
      navigate('/dashboard');
    }
  };

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
    <div className="min-h-screen bg-black text-white px-6 py-8 space-y-8">

      {/* ───────────────── HEADER ───────────────── */}
      <div className="flex items-center justify-between">
        <Logo size="small" />

        <button
          onClick={() => navigate('/profile')}
          className="w-10 h-10 rounded-full bg-cyan-electric/10 flex items-center justify-center"
        >
          <span className="text-cyan-electric font-black">
            {profileInitial}
          </span>
        </button>
      </div>

      {/* ───────────────── PLAYER INTELLIGENCE ───────────────── */}
      <div className="card-glass p-5 rounded-3xl flex items-center gap-4">

        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center overflow-hidden">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} className="w-full h-full object-cover" />
          ) : (
            <User className="text-cyan-electric" />
          )}
        </div>

        <div className="flex-1">
          <p className="font-black uppercase">{profile?.name}</p>
          <p className="text-[10px] text-white/40 uppercase">
            {profile?.position || 'Sem posição'}
          </p>
        </div>

        <button
          onClick={() => navigate('/profile')}
          className="px-3 py-2 bg-white/5 rounded-xl text-[10px] font-black uppercase"
        >
          Perfil
        </button>

      </div>

      {/* ───────────────── QUICK ACTIONS ───────────────── */}
      <div className="grid grid-cols-3 gap-3">

        <button
          onClick={() => setShowCreate(true)}
          className="p-4 bg-cyan-electric text-black font-black rounded-2xl flex flex-col items-center gap-1"
        >
          <PlusCircle size={18}/>
          Criar
        </button>

        <button
          onClick={() => setShowJoin(true)}
          className="p-4 bg-white/5 font-black rounded-2xl flex flex-col items-center gap-1"
        >
          <LogIn size={18}/>
          Entrar
        </button>

        <button
          onClick={() => navigate('/rankings')}
          className="p-4 bg-white/5 font-black rounded-2xl flex flex-col items-center gap-1"
        >
          <Trophy size={18}/>
          Rank
        </button>

      </div>

      {/* ───────────────── CONTINUE BABA ───────────────── */}
      {lastBaba && (
        <button
          onClick={() => openBaba(lastBaba)}
          className="w-full p-5 bg-gradient-to-r from-cyan-electric/20 to-transparent border border-cyan-electric/20 rounded-3xl text-left"
        >
          <div className="flex justify-between items-center">
            <div>
              <p className="font-black">{lastBaba.name}</p>
              <p className="text-[10px] text-white/40">
                Continuar último baba
              </p>
            </div>
            <Play className="text-cyan-electric" />
          </div>

          <p className="text-[10px] text-white/30 mt-2">
            {formatDays(lastBaba)}
          </p>
        </button>
      )}

      {/* ───────────────── MY BABAS ───────────────── */}
      <div className="space-y-2">

        <p className="text-cyan-electric font-black text-sm uppercase">
          Meus Babas
        </p>

        {myBabas?.length ? myBabas.map((baba) => (
          <button
            key={baba.id}
            onClick={() => openBaba(baba)}
            className="w-full p-4 bg-white/5 rounded-2xl text-left"
          >
            <div className="flex justify-between">
              <p className="font-black">{baba.name}</p>
              <span className="text-cyan-electric text-[10px]">
                {baba.game_time?.substring(0,5)}
              </span>
            </div>

            <p className="text-[10px] text-white/40">
              {formatDays(baba)}
            </p>
          </button>
        )) : (
          <p className="text-white/30 text-center">
            Nenhum baba ainda
          </p>
        )}

      </div>

      {/* ───────────────── MODALS ───────────────── */}

      {showCreate && (
        <Modal onClose={() => setShowCreate(false)}>
          <div className="space-y-3">
            <h2 className="font-black uppercase">Criar Baba</h2>

            <input
              placeholder="Nome"
              className="w-full p-3 bg-black/40 rounded-xl"
              value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
            />

            <input
              type="time"
              className="w-full p-3 bg-black/40 rounded-xl"
              value={form.game_time}
              onChange={e => setForm({...form, game_time: e.target.value})}
            />

            <div className="grid grid-cols-7 gap-1">
              {[0,1,2,3,4,5,6].map(d => (
                <button
                  key={d}
                  onClick={() =>
                    setForm(prev => ({
                      ...prev,
                      game_days: prev.game_days.includes(d)
                        ? prev.game_days.filter(x => x !== d)
                        : [...prev.game_days, d]
                    }))
                  }
                  className={`p-2 text-[10px] rounded ${
                    form.game_days.includes(d)
                      ? 'bg-cyan-electric text-black'
                      : 'bg-white/5'
                  }`}
                >
                  {DAYS[d]}
                </button>
              ))}
            </div>

            <button
              onClick={handleCreate}
              className="w-full p-3 bg-cyan-electric text-black font-black rounded-xl"
            >
              Criar
            </button>
          </div>
        </Modal>
      )}

      {showJoin && (
        <Modal onClose={() => setShowJoin(false)}>
          <div className="space-y-3">
            <h2 className="font-black uppercase">Entrar no Baba</h2>

            <input
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value.toUpperCase())}
              placeholder="AB12CD"
              className="w-full p-3 text-center tracking-widest font-black bg-black/40 rounded-xl"
              maxLength={6}
            />

            <button
              onClick={handleJoin}
              className="w-full p-3 bg-green-500 text-black font-black rounded-xl"
            >
              Entrar
            </button>
          </div>
        </Modal>
      )}

    </div>
  );
};

export default HomePageV4;
