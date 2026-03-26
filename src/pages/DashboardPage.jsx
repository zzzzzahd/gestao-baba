import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/MockAuthContext';
import { useBaba } from '../contexts/BabaContext';
import { 
  Trophy, Users, DollarSign, LogOut, 
  ShieldCheck, Calendar, PlusCircle, Star, Edit, Copy, Settings
} from 'lucide-react';
import PresenceConfirmation from '../components/PresenceConfirmation';
import BabaSettings from '../components/BabaSettings';
import DrawConfigPanel from '../components/DrawConfigPanel';
import toast from 'react-hot-toast';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { myBabas, currentBaba, setCurrentBaba, players, loading } = useBaba();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [showSettings, setShowSettings] = useState(false);

  // Copiar código de convite
  const handleCopyInviteCode = () => {
    if (currentBaba?.invite_code) {
      navigator.clipboard.writeText(currentBaba.invite_code);
      toast.success('Código copiado!');
    }
  };

  // Verificar se usuário é presidente do baba atual
  const isPresident = currentBaba?.president_id === profile?.id;

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-cyan-electric border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Sincronizando Dados...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24 font-sans">
      {/* HEADER - Cabeçalho do Perfil */}
      <div className="p-6 bg-gradient-to-b from-cyan-electric/10 to-transparent">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate('/profile')}>
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-electric to-blue-600 flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(0,242,255,0.3)]">
                  <span className="text-2xl font-black text-black">
                    {profile?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-4 border-black"></div>
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
                    {profile?.favorite_team && <span className="truncate max-w-[100px]">{profile.favorite_team}</span>}
                  </div>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/profile');
                }}
                className="px-3 py-2 rounded-xl bg-white/5 border border-cyan-electric/30 text-cyan-electric text-[10px] font-black uppercase tracking-widest hover:bg-cyan-electric/10 hover:border-cyan-electric transition-all flex items-center gap-2"
              >
                <Edit size={14} />
                <span className="hidden sm:inline">Editar</span>
              </button>
            </div>
            <button 
              onClick={() => signOut()} 
              className="p-3 bg-white/5 rounded-2xl hover:bg-red-500/20 text-white/40 hover:text-red-500 transition-all"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6">
        {/* SELETOR DE BABA */}
        <div className="mb-8">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-4">Seus Grupos de Elite</p>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {myBabas.map((baba) => (
              <button 
                key={baba.id}
                onClick={() => setCurrentBaba(baba)}
                className={`flex-shrink-0 px-6 py-4 rounded-2xl border transition-all flex items-center gap-3 ${currentBaba?.id === baba.id ? 'border-cyan-electric bg-cyan-electric/10' : 'border-white/5 bg-white/5'}`}
              >
                <ShieldCheck size={18} className={currentBaba?.id === baba.id ? 'text-cyan-electric' : 'opacity-20'} />
                <span className="font-black italic uppercase text-xs whitespace-nowrap">{baba.name}</span>
              </button>
            ))}
            <button 
              onClick={() => navigate('/')} 
              className="flex-shrink-0 w-12 h-12 rounded-2xl border border-dashed border-white/20 flex items-center justify-center hover:border-cyan-electric transition-all"
            >
              <PlusCircle size={20} className="opacity-40" />
            </button>
          </div>
        </div>

        {currentBaba ? (
          <>
            {/* TABS */}
            <div className="flex border-b border-white/5 mb-8">
              {['overview', 'ranking'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === tab ? 'text-cyan-electric' : 'opacity-40'}`}
                >
                  {tab === 'overview' && 'Painel'}
                  {tab === 'ranking' && 'Artilharia'}
                  {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-cyan-electric shadow-[0_0_10px_#00fff2]"></div>}
                </button>
              ))}
            </div>

            {/* CONTEÚDO */}
            <div className="space-y-6">
              {activeTab === 'overview' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  {/* Cards de Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="card-glass p-6 rounded-3xl border border-white/5 bg-white/5">
                      <p className="text-[9px] font-black opacity-40 uppercase mb-2">Horário</p>
                      <h4 className="text-sm font-black italic">{currentBaba.game_time || '20:00'}</h4>
                      <div className="mt-4 flex items-center gap-2 text-green-400">
                        <Calendar size={14} /> 
                        <span className="text-[10px] font-black uppercase">Frequência Semanal</span>
                      </div>
                    </div>
                    <div className="card-glass p-6 rounded-3xl border border-white/5 bg-white/5">
                      <p className="text-[9px] font-black opacity-40 uppercase mb-2">Modalidade</p>
                      <h4 className="text-sm font-black italic uppercase">{currentBaba.modality || 'Futsal'}</h4>
                      <div className="mt-4 flex items-center gap-2 text-cyan-electric">
                        <Users size={14} /> 
                        <span className="text-[10px] font-black uppercase">{players?.length || 0} Atletas</span>
                      </div>
                    </div>
                  </div>

                  {/* ⭐ NOVO: Componente de Confirmação de Presença */}
                  <PresenceConfirmation />

                  {/* ⭐ NOVO: Painel de Configuração do Sorteio (Só Presidente) */}
                  {isPresident && <DrawConfigPanel />}

                  {/* Código de Convite - Só para Presidente */}
                  {isPresident && currentBaba.invite_code && (
                    <div className="card-glass p-6 rounded-3xl border border-cyan-electric/20 bg-cyan-electric/5">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-[9px] font-black opacity-40 uppercase mb-1">Código de Convite</p>
                          <p className="text-xs text-white/60">Compartilhe com novos jogadores</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
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
                    </div>
                  )}

                  {/* Grid de Atalhos */}
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

                  {/* Botão Configurações (só presidente) */}
                  {isPresident && (
                    <button
                      onClick={() => setShowSettings(true)}
                      className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white/60 font-black uppercase text-xs tracking-widest hover:bg-white/10 hover:text-white hover:border-cyan-electric/30 transition-all flex items-center justify-center gap-2"
                    >
                      <Settings size={16} />
                      Configurações do Baba
                    </button>
                  )}
                </div>
              )}

              {activeTab === 'ranking' && (
                <div className="space-y-4 animate-in fade-in duration-500">
                  {players && players.length > 0 ? (
                    players
                      .sort((a,b) => (b.total_goals_month || 0) - (a.total_goals_month || 0))
                      .slice(0, 5)
                      .map((p, i) => (
                        <div 
                          key={p.id} 
                          className="flex items-center justify-between p-4 card-glass rounded-2xl border border-white/5 bg-white/5"
                        >
                          <div className="flex items-center gap-4">
                            <span className="text-lg font-black italic opacity-20 w-4">#{i+1}</span>
                            <span className="font-bold uppercase text-sm">{p.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-green-400 font-black italic">
                            <Star size={14} /> {p.total_goals_month || 0} 
                            <span className="text-[9px] opacity-40">GOLS</span>
                          </div>
                        </div>
                      ))
                  ) : (
                    <p className="text-center py-10 opacity-30 text-xs uppercase font-black tracking-widest">
                      Nenhum dado de artilharia
                    </p>
                  )}
                </div>
              )}
            </div>
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

      {/* Modal de Configurações */}
      {showSettings && currentBaba && (
        <BabaSettings 
          baba={currentBaba} 
          onClose={() => setShowSettings(false)} 
        />
      )}
    </div>
  );
};

export default DashboardPage;
