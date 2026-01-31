import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBaba } from '../contexts/BabaContext';
import { 
  Trophy, Users, DollarSign, Settings, PlusCircle, LogOut, 
  ChevronRight, LayoutDashboard, Share2, Play, CheckCircle2,
  ListFilter, Star, Calendar, ShieldCheck
} from 'lucide-react';
import Logo from '../components/Logo';
import toast from 'react-hot-toast';

const HomePage = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { myBabas, currentBaba, setCurrentBaba, players, drawTeams, loading } = useBaba();
  
  const [activeTab, setActiveTab] = useState('overview'); // overview, ranking, presence
  const [isDrawModalOpen, setIsDrawModalOpen] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState([]);

  // Sincroniza jogadores selecionados para o sorteio
  useEffect(() => {
    if (players) {
      setSelectedPlayers(players.map(p => p.id));
    }
  }, [players]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-cyan-electric border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Sincronizando Dados...</p>
      </div>
    );
  }

  const handleTogglePlayer = (id) => {
    setSelectedPlayers(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleStartDraw = () => {
    const available = players.filter(p => selectedPlayers.includes(p.id));
    drawTeams(available);
    setIsDrawModalOpen(false);
    navigate('/match');
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24 font-sans">
      {/* HEADER SUPERIOR */}
      <div className="p-6 bg-gradient-to-b from-cyan-electric/10 to-transparent">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-black text-cyan-electric">{profile?.name?.charAt(0)}</span>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-neon rounded-full border-4 border-black"></div>
            </div>
            <div>
              <h2 className="text-xl font-black italic tracking-tighter uppercase leading-none">
                {profile?.name || 'Jogador'}
              </h2>
              <p className="text-[9px] font-black uppercase tracking-widest text-cyan-electric mt-1">Status: Ativo na Arena</p>
            </div>
          </div>
          <button onClick={() => signOut()} className="p-3 bg-white/5 rounded-2xl hover:bg-red-500/20 text-white/40 hover:text-red-500 transition-all">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6">
        {/* SELETOR DE BABA ATUAL */}
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
            <button onClick={() => navigate('/create-baba')} className="flex-shrink-0 w-12 h-12 rounded-2xl border border-dashed border-white/20 flex items-center justify-center hover:border-cyan-electric transition-all">
              <PlusCircle size={20} className="opacity-40" />
            </button>
          </div>
        </div>

        {currentBaba ? (
          <>
            {/* TABS DE CONTEÚDO */}
            <div className="flex border-b border-white/5 mb-8">
              {['overview', 'ranking', 'presence'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === tab ? 'text-cyan-electric' : 'opacity-40'}`}
                >
                  {tab === 'overview' && 'Painel'}
                  {tab === 'ranking' && 'Artilharia'}
                  {tab === 'presence' && 'Confirmados'}
                  {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-cyan-electric shadow-[0_0_10px_#00fff2]"></div>}
                </button>
              ))}
            </div>

            {/* CONTEÚDO DINÂMICO DA TAB */}
            <div className="space-y-6">
              {activeTab === 'overview' && (
                <div className="animate-fade-in space-y-6">
                  {/* Cards de Stats Rápidas */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="card-glass p-6 rounded-3xl border border-white/5">
                      <p className="text-[9px] font-black opacity-40 uppercase mb-2">Próximo Jogo</p>
                      <h4 className="text-sm font-black italic">{currentBaba.game_days?.length > 0 ? 'Agendado' : 'A definir'}</h4>
                      <div className="mt-4 flex items-center gap-2 text-green-neon">
                        <Calendar size={14} /> <span className="text-[10px] font-black uppercase">{currentBaba.game_time}</span>
                      </div>
                    </div>
                    <div className="card-glass p-6 rounded-3xl border border-white/5">
                      <p className="text-[9px] font-black opacity-40 uppercase mb-2">Mensalidade</p>
                      <h4 className="text-sm font-black italic">R$ {currentBaba.monthly_fee || '0,00'}</h4>
                      <div className="mt-4 flex items-center gap-2 text-yellow-400">
                        <DollarSign size={14} /> <span className="text-[10px] font-black uppercase">Pendente</span>
                      </div>
                    </div>
                  </div>

                  {/* Botão de Ação Principal */}
                  <button 
                    onClick={() => setIsDrawModalOpen(true)}
                    className="w-full py-6 rounded-[2rem] bg-gradient-to-r from-cyan-electric to-blue-600 text-black font-black uppercase italic tracking-tighter flex items-center justify-center gap-3 shadow-[0_10px_40px_rgba(0,255,242,0.2)] hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    <Play fill="black" size={20} /> Iniciar Sorteio de Times
                  </button>

                  {/* Grade de Navegação */}
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { icon: <Users size={20} />, label: 'Atletas', path: '/players' },
                      { icon: <DollarSign size={20} />, label: 'Financeiro', path: '/financial' },
                      { icon: <Trophy size={20} />, label: 'Histórico', path: '/matches' },
                    ].map((item, i) => (
                      <button key={i} onClick={() => navigate(item.path)} className="flex flex-col items-center gap-3 p-6 card-glass rounded-3xl border border-white/5 hover:bg-white/5 transition-all">
                        <div className="text-cyan-electric opacity-60">{item.icon}</div>
                        <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'ranking' && (
                <div className="animate-fade-in space-y-4">
                  {players.sort((a,b) => (b.total_goals_month || 0) - (a.total_goals_month || 0)).slice(0, 5).map((p, i) => (
                    <div key={p.id} className="flex items-center justify-between p-4 card-glass rounded-2xl border border-white/5">
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-black italic opacity-20 w-4">#{i+1}</span>
                        <span className="font-bold uppercase text-sm">{p.profile?.name || p.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-green-neon font-black italic">
                        <Star size={14} /> {p.total_goals_month || 0} <span className="text-[9px] opacity-40">GOLS</span>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => navigate('/rankings')} className="w-full py-4 text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100">Ver Ranking Completo</button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="py-20 text-center space-y-6">
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-dashed border-white/20">
              <LayoutDashboard className="opacity-20" size={40} />
            </div>
            <p className="text-sm font-bold opacity-40 uppercase tracking-widest">Selecione um Baba para gerenciar</p>
          </div>
        )}
      </div>

      {/* MODAL DE SORTEIO RÁPIDO (Restaurado) */}
      {isDrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] overflow-hidden animate-slide-up">
            <div className="p-8 border-b border-white/5 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black italic uppercase tracking-tighter">Sorteio Rápido</h3>
                <p className="text-[10px] font-black uppercase text-cyan-electric tracking-widest">Selecione quem vai pro jogo</p>
              </div>
              <div className="bg-cyan-electric/20 px-4 py-2 rounded-xl border border-cyan-electric/30">
                <span className="text-cyan-electric font-black">{selectedPlayers.length}</span>
              </div>
            </div>
            
            <div className="max-h-[50vh] overflow-y-auto p-6 grid grid-cols-1 gap-2">
              {players.map(player => (
                <button
                  key={player.id}
                  onClick={() => handleTogglePlayer(player.id)}
                  className={`flex items-center justify-between p-4 rounded-2xl transition-all ${selectedPlayers.includes(player.id) ? 'bg-cyan-electric/10 border border-cyan-electric/30' : 'bg-white/5 border border-transparent'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${player.position === 'goleiro' ? 'bg-yellow-400' : 'bg-blue-400'}`}></div>
                    <span className="text-sm font-bold uppercase">{player.profile?.name || player.name}</span>
                  </div>
                  {selectedPlayers.includes(player.id) && <CheckCircle2 className="text-cyan-electric" size={18} />}
                </button>
              ))}
            </div>

            <div className="p-8 flex gap-3">
              <button onClick={() => setIsDrawModalOpen(false)} className="flex-1 py-5 rounded-2xl bg-white/5 font-black uppercase text-[10px] tracking-widest hover:bg-white/10">Cancelar</button>
              <button onClick={handleStartDraw} className="flex-2 px-8 py-5 rounded-2xl bg-cyan-electric text-black font-black uppercase text-[10px] tracking-widest shadow-[0_0_20px_rgba(0,255,242,0.4)]">Sortear Times</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
