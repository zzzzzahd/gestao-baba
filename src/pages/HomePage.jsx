import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaba } from '../contexts/BabaContext';
import { useAuth } from '../contexts/MockAuthContext';
import { PlusCircle, LogIn, Trophy, Users, Edit, Clock, MapPin } from 'lucide-react';
import Logo from '../components/Logo';
import toast from 'react-hot-toast';

const HomePage = () => {
  const navigate = useNavigate();
  const { myBabas, createBaba, joinBaba, setCurrentBaba, loading } = useBaba();
  const { profile } = useAuth();
  
  const [mode, setMode] = useState(null); // 'create' ou 'join'
  const [formData, setFormData] = useState({
    name: '',
    modality: 'futsal',
    game_time: '20:00',
    game_days: [],
    match_duration: 10,
    invite_code: '',
  });

  const handleCreateBaba = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Digite o nome do baba');
      return;
    }

    if (formData.game_days.length === 0) {
      toast.error('Selecione pelo menos um dia da semana');
      return;
    }

    const result = await createBaba({
      name: formData.name,
      modality: formData.modality,
      game_time: formData.game_time,
      match_duration: formData.match_duration,
      game_days: formData.game_days,
    });

    if (result) {
      setMode(null); // Volta para tela inicial
      toast.success('Baba criado! Clique nele abaixo para acessar.');
    }
  };

  const handleJoinBaba = async (e) => {
    e.preventDefault();
    
    if (!formData.invite_code.trim()) {
      toast.error('Digite o código do baba');
      return;
    }

    const result = await joinBaba(formData.invite_code);

    if (result) {
      setMode(null); // Volta para tela inicial
    }
  };

  const handleSelectBaba = (baba) => {
    setCurrentBaba(baba);
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-cyan-electric border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Carregando Sistema...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="w-full max-w-4xl mx-auto space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <Logo size="large" />
        </div>

        {/* Cabeçalho do Perfil */}
        <div className="card-glass p-6 rounded-[2rem] animate-fade-in">
          <div className="flex items-center gap-4">
            {/* Círculo com Inicial */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-electric to-blue-600 flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(0,242,255,0.3)]">
              <span className="text-2xl font-black text-black">
                {profile?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>

            {/* Informações do Perfil */}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-black uppercase italic text-white truncate">
                {profile?.name || 'Usuário'}
              </h2>
              
              {/* Badge com Idade | Posição | Time */}
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

            {/* Botão Editar Perfil */}
            <button
              onClick={() => navigate('/profile')}
              className="px-4 py-2 rounded-xl bg-white/5 border border-cyan-electric/30 text-cyan-electric text-[10px] font-black uppercase tracking-widest hover:bg-cyan-electric/10 hover:border-cyan-electric transition-all flex items-center gap-2 flex-shrink-0"
            >
              <Edit size={14} />
              <span className="hidden sm:inline">Editar</span>
            </button>
          </div>
        </div>

        {/* Botões: Criar e Entrar */}
        {mode === null && (
          <div className="space-y-4 animate-fade-in">
            <p className="text-center text-white/60 text-sm font-tactical">
              Escolha uma opção para começar
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setMode('create')}
                className="p-6 rounded-[2rem] bg-gradient-to-r from-cyan-electric to-blue-600 text-black font-black uppercase italic tracking-tighter flex items-center justify-center gap-3 shadow-[0_10px_40px_rgba(0,255,242,0.2)] hover:scale-[1.02] active:scale-95 transition-all"
              >
                <PlusCircle size={24} />
                Criar Novo Baba
              </button>

              <button
                onClick={() => setMode('join')}
                className="p-6 rounded-[2rem] bg-white/5 border border-green-neon text-green-neon font-black uppercase italic tracking-tighter flex items-center justify-center gap-3 hover:bg-green-neon/10 transition-all"
              >
                <LogIn size={24} />
                Entrar com Convite
              </button>
            </div>
          </div>
        )}

        {/* Formulário de Criar Baba */}
        {mode === 'create' && (
          <form onSubmit={handleCreateBaba} className="space-y-6 animate-fade-in">
            <div className="card-glass p-8 rounded-[2rem]">
              <div className="flex items-center gap-3 mb-6">
                <Trophy className="text-cyan-electric" size={24} />
                <h2 className="text-2xl font-black italic uppercase">Criar Baba</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">
                    Nome do Baba
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Baba da Galera"
                    className="input-tactical"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">
                    Modalidade
                  </label>
                  <select
                    value={formData.modality}
                    onChange={(e) => setFormData({ ...formData, modality: e.target.value })}
                    className="input-tactical"
                  >
                    <option value="futsal">Futsal</option>
                    <option value="society">Society</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">
                    Horário do Jogo
                  </label>
                  <input
                    type="time"
                    value={formData.game_time}
                    onChange={(e) => setFormData({ ...formData, game_time: e.target.value })}
                    className="input-tactical"
                  />
                </div>

                {/* ⭐ NOVO: Seleção de Dias da Semana */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">
                    Dias da Semana
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {[
                      { day: 0, label: 'DOM' },
                      { day: 1, label: 'SEG' },
                      { day: 2, label: 'TER' },
                      { day: 3, label: 'QUA' },
                      { day: 4, label: 'QUI' },
                      { day: 5, label: 'SEX' },
                      { day: 6, label: 'SÁB' },
                    ].map(({ day, label }) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          const newDays = formData.game_days.includes(day)
                            ? formData.game_days.filter(d => d !== day)
                            : [...formData.game_days, day].sort((a, b) => a - b);
                          setFormData({ ...formData, game_days: newDays });
                        }}
                        className={`py-3 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all ${
                          formData.game_days.includes(day)
                            ? 'bg-cyan-electric text-black border-2 border-cyan-electric shadow-[0_0_15px_rgba(0,242,255,0.4)]'
                            : 'bg-white/5 text-white/40 border-2 border-white/10 hover:bg-white/10 hover:text-white/60'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {formData.game_days.length === 0 && (
                    <p className="text-[9px] text-yellow-500 mt-2 flex items-center gap-1">
                      <span>⚠️</span> Selecione pelo menos um dia
                    </p>
                  )}
                  {formData.game_days.length > 0 && (
                    <p className="text-[9px] text-cyan-electric mt-2">
                      ✓ {formData.game_days.length} dia{formData.game_days.length > 1 ? 's' : ''} selecionado{formData.game_days.length > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setMode(null)}
                className="flex-1 py-5 rounded-2xl bg-white/5 font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-[2] py-5 rounded-2xl bg-cyan-electric text-black font-black uppercase text-[10px] tracking-widest shadow-neon-cyan hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? 'Criando...' : 'Criar Baba'}
              </button>
            </div>
          </form>
        )}

        {/* Formulário de Entrar em Baba */}
        {mode === 'join' && (
          <form onSubmit={handleJoinBaba} className="space-y-6 animate-fade-in">
            <div className="card-glass p-8 rounded-[2rem]">
              <div className="flex items-center gap-3 mb-6">
                <Users className="text-green-neon" size={24} />
                <h2 className="text-2xl font-black italic uppercase">Entrar no Baba</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">
                    Código do Convite
                  </label>
                  <input
                    type="text"
                    value={formData.invite_code}
                    onChange={(e) => setFormData({ ...formData, invite_code: e.target.value.toUpperCase() })}
                    placeholder="Ex: ABC12345"
                    className="input-tactical text-center text-2xl font-black tracking-widest"
                    maxLength={8}
                    required
                  />
                  <p className="text-[9px] text-white/30 mt-2 text-center">
                    Digite o código de 8 caracteres fornecido pelo presidente
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setMode(null)}
                className="flex-1 py-5 rounded-2xl bg-white/5 font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-[2] py-5 rounded-2xl bg-green-neon text-black font-black uppercase text-[10px] tracking-widest shadow-neon-green hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </div>
          </form>
        )}

        {/* Seção: Meus Babas */}
        {mode === null && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-cyan-electric/30 to-transparent"></div>
              <h2 className="text-xl font-black uppercase italic text-cyan-electric">
                Meus Babas
              </h2>
              <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-cyan-electric/30 to-transparent"></div>
            </div>

            {myBabas && myBabas.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myBabas.map((baba) => (
                  <button
                    key={baba.id}
                    onClick={() => handleSelectBaba(baba)}
                    className="card-glass p-6 rounded-[2rem] hover:border-cyan-electric/50 transition-all group text-left"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-black uppercase italic text-white group-hover:text-cyan-electric transition-colors">
                        {baba.name}
                      </h3>
                      <div className="w-2 h-2 rounded-full bg-green-neon animate-pulse"></div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-white/60">
                        <MapPin size={12} />
                        <span>{baba.modality === 'futsal' ? 'Futsal' : 'Society'}</span>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-white/60">
                        <Clock size={12} />
                        <span>{baba.game_time}</span>
                      </div>

                      {/* ⭐ NOVO: Dias da Semana */}
                      {baba.game_days && baba.game_days.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {baba.game_days.sort((a, b) => a - b).map((day) => {
                            const dayLabels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
                            return (
                              <span 
                                key={day}
                                className="w-6 h-6 rounded-md bg-cyan-electric/20 border border-cyan-electric/30 text-cyan-electric text-[8px] font-black flex items-center justify-center"
                              >
                                {dayLabels[day]}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="card-glass p-12 rounded-[2rem] text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                    <Trophy size={32} className="text-white/20" />
                  </div>
                  <div>
                    <p className="text-lg font-black uppercase text-white/40 mb-2">
                      Nenhum Baba Ainda
                    </p>
                    <p className="text-sm text-white/30">
                      Crie um novo baba ou entre com código de convite
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
