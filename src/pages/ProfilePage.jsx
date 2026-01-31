import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, SoccerBall, Trophy, UserPlus, PlusCircle, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState({
    name: user?.user_metadata?.name || '',
    age: '',
    position: 'linha',
    heartTeam: '',
    photo: null
  });

  return (
    <div className="min-h-screen bg-black text-white p-5 pb-24 font-sans">
      {/* HEADER: PERFIL */}
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-black text-cyan-electric italic italic">MEU PERFIL</h1>
        <button onClick={signOut} className="text-red-500 opacity-50"><LogOut size={20}/></button>
      </header>

      {/* CARD DE IDENTIDADE (FOTO E DADOS) */}
      <div className="card-glass p-6 rounded-3xl border border-white/10 mb-6 relative overflow-hidden">
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-white/10 border-2 border-cyan-electric flex items-center justify-center overflow-hidden">
              {profile.photo ? <img src={profile.photo} alt="Avatar" className="w-full h-full object-cover"/> : <Camera className="opacity-20" size={32}/>}
            </div>
            <label className="absolute bottom-0 right-0 bg-cyan-electric p-2 rounded-full cursor-pointer shadow-lg">
              <PlusCircle size={16} className="text-black"/>
              <input type="file" className="hidden" onChange={(e) => {/* Lógica de Upload */}}/>
            </label>
          </div>
          <div className="text-center">
            <h2 className="text-xl font-black uppercase italic">{profile.name || "NOME DO ATLETA"}</h2>
            <p className="text-[10px] text-cyan-electric font-bold tracking-widest uppercase">Draft ID: #2938</p>
          </div>
        </div>

        {/* INPUTS DE PERFIL */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          <div className="space-y-1">
            <label className="text-[9px] font-black opacity-40 uppercase ml-2">Idade</label>
            <input type="number" placeholder="Ex: 25" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-cyan-electric"/>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black opacity-40 uppercase ml-2">Time do Coração</label>
            <input type="text" placeholder="Ex: Bahia" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-cyan-electric"/>
          </div>
        </div>
      </div>

      {/* CENTRAL DO PRESIDENTE & CONVITES */}
      <div className="grid grid-cols-1 gap-4">
        {/* BOTÃO CRIAR BABA */}
        <button 
          onClick={() => navigate('/dashboard')} // Onde você já tem a lista e o modal de criação
          className="card-glass p-5 rounded-3xl border border-cyan-electric/20 flex items-center justify-between group hover:border-cyan-electric transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cyan-electric/10 rounded-2xl text-cyan-electric"><PlusCircle/></div>
            <div className="text-left">
              <h3 className="text-sm font-black uppercase italic">Criar Meu Baba</h3>
              <p className="text-[9px] opacity-50">Seja o presidente da sua pelada</p>
            </div>
          </div>
          <div className="text-cyan-electric opacity-0 group-hover:opacity-100 mr-2">→</div>
        </button>

        {/* LISTA DE CONVITES */}
        <div className="card-glass p-5 rounded-3xl border border-white/10">
          <h3 className="text-[10px] font-black opacity-40 uppercase mb-4 tracking-widest flex items-center gap-2">
            <UserPlus size={14}/> Convites Recebidos (2)
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
              <div>
                <p className="text-[11px] font-black italic uppercase">Baba do Budegão</p>
                <p className="text-[9px] opacity-50 italic">Convite de: @PresidenteX</p>
              </div>
              <div className="flex gap-2">
                <button className="bg-green-neon text-black p-2 rounded-lg"><PlusCircle size={14}/></button>
                <button className="bg-white/10 text-red-500 p-2 rounded-lg">×</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
