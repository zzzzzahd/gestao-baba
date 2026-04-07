import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBaba } from '../contexts/BabaContext';
import { 
  Trophy, Users, DollarSign, LogOut, 
  Calendar, Copy, Settings, MapPin, Clock
} from 'lucide-react';
import PresenceConfirmation from '../components/PresenceConfirmation';
import BabaSettings from '../components/BabaSettings';
import DrawConfigPanel from '../components/DrawConfigPanel';
import toast from 'react-hot-toast';
import { supabase } from '../services/supabase';

const DAY_LABELS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

const DashboardPage = () => {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { currentBaba, setCurrentBaba, players, loading } = useBaba();
  
  const [showSettings, setShowSettings] = useState(false);

  // Copiar código de convite
  const handleCopyInviteCode = () => {
    if (currentBaba?.invite_code) {
      navigator.clipboard.writeText(currentBaba.invite_code);
      toast.success('Código copiado!');
    }
  };

  // Verificar se usuário é presidente do baba atual (comparação segura de tipos)
  const isPresident = String(currentBaba?.president_id) === String(profile?.id);

  // Gerar código de convite e salvar no banco
  const handleGenerateInviteCode = async () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { error } = await supabase
      .from('babas')
      .update({ invite_code: code })
      .eq('id', currentBaba.id);

    if (error) {
      toast.error('Erro ao gerar código');
    } else {
      toast.success('Código gerado!');
      setCurrentBaba({ ...currentBaba, invite_code: code });
    }
  };

  // Formatar dias da semana
  const formatGameDays = (days) => {
    if (!days || !Array.isArray(days) || days.length === 0) return null;
    return days.map((d) => DAY_LABELS[d] ?? d).join(' · ');
  };

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
            <div className="flex items-center gap-4">
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

      <div className="max-w-5xl mx-auto px-6 space-y-6">

        {currentBaba ? (
          <>
            {/* ATALHOS PRINCIPAIS */}
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

            {/* INFO DO BABA */}
            <div className="card-glass p-6 rounded-3xl border border-white/5 bg-white/5 space-y-4">
              <p className="text-[9px] font-black opacity-40 uppercase tracking-widest mb-2">
                {currentBaba.name}
              </p>

              <div className="grid grid-cols-2 gap-4">
                {/* Horário */}
                <div className="flex items-start gap-3">
                  <Clock size={14} className="text-cyan-electric mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[9px] font-black opacity-40 uppercase mb-0.5">Horário</p>
                    <p className="text-sm font-black italic">{currentBaba.game_time || '—'}</p>
                  </div>
                </div>

                {/* Modalidade */}
                <div className="flex items-start gap-3">
                  <Trophy size={14} className="text-cyan-electric mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[9px] font-black opacity-40 uppercase mb-0.5">Modalidade</p>
                    <p className="text-sm font-black italic uppercase">{currentBaba.modality || '—'}</p>
                  </div>
                </div>

                {/* Dias da semana */}
                {formatGameDays(currentBaba.game_days) && (
                  <div className="flex items-start gap-3">
                    <Calendar size={14} className="text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[9px] font-black opacity-40 uppercase mb-0.5">Dias</p>
                      <p className="text-sm font-black italic">{formatGameDays(currentBaba.game_days)}</p>
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
                <div className="flex items-start gap-3 col-span-2">
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

            {/* Confirmação de Presença */}
            <PresenceConfirmation />

            {/* Painel de Configuração do Sorteio (Só Presidente) */}
            {isPresident && <DrawConfigPanel />}

            {/* Código de Convite - Só para Presidente */}
            {isPresident && (
              <div className="card-glass p-6 rounded-3xl border border-cyan-electric/20 bg-cyan-electric/5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[9px] font-black opacity-40 uppercase mb-1">Código de Convite</p>
                    <p className="text-xs text-white/60">Compartilhe com novos jogadores</p>
                  </div>
                </div>
                {currentBaba.invite_code ? (
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
                ) : (
                  <button
                    onClick={handleGenerateInviteCode}
                    className="w-full py-3 rounded-xl bg-cyan-electric/10 border border-cyan-electric/30 text-cyan-electric font-black uppercase text-xs tracking-widest hover:bg-cyan-electric/20 transition-all"
                  >
                    Gerar Código de Convite
                  </button>
                )}
              </div>
            )}

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
