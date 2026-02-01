import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBaba } from '../contexts/BabaContext';
import Logo from '../components/Logo';
import { LogOut, User, Lock, Clock, Users, Plus, X, Loader2, Trash2, Settings } from 'lucide-react';
import toast from 'react-hot-toast';

const DashboardPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth(); // Adicionado 'profile' para foto
  
  // Pegamos as funções do contexto
  const { 
    babas, 
    createBaba, 
    updateBaba, // ADICIONADO: Agora usamos a função real
    deleteBaba, 
    selectBaba, 
    loading, 
    refreshBabas 
  } = useBaba();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [newBaba, setNewBaba] = useState({
    name: '',
    modality: 'futsal',
    is_private: false,
    game_days: [],
    game_time: '20:00',
    match_duration: 10
  });

  // Carrega dados se estiver em modo de edição (Mantido conforme seu original)
  useEffect(() => {
    if (id && babas) {
      const babaParaEditar = babas.find(b => b.id === id);
      if (babaParaEditar) {
        setNewBaba({
          name: babaParaEditar.nome || babaParaEditar.name,
          modality: babaParaEditar.modality || 'futsal',
          is_private: babaParaEditar.is_private || false,
          game_time: babaParaEditar.game_time || '20:00',
          match_duration: babaParaEditar.match_duration || 10
        });
        setIsEditing(true);
        setShowCreateModal(true);
      }
    }
  }, [id, babas]);

  const handleCreateOrUpdateBaba = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        // CORREÇÃO: Lógica de update agora funcional
        await updateBaba(id, {
          nome: newBaba.name,
          modality: newBaba.modality,
          game_time: newBaba.game_time,
          is_private: newBaba.is_private
        });
        toast.success("Baba atualizado com sucesso!");
        navigate('/dashboard');
      } else {
        // Criação usando a função do contexto
        await createBaba(newBaba.name); 
        toast.success("Novo baba criado!");
      }
      
      setShowCreateModal(false);
      setNewBaba({
        name: '', modality: 'futsal', is_private: false,
        game_days: [], game_time: '20:00', match_duration: 10
      });

      if (refreshBabas) refreshBabas();
    } catch (error) {
      toast.error(error.message || "Erro na operação");
    }
  };

  const handleSelectBaba = (baba) => {
    selectBaba(baba);
    navigate('/home');
  };

  const handleDelete = async (e, babaId) => {
    e.stopPropagation();
    if (window.confirm("Tem certeza que deseja excluir este Baba?")) {
      try {
        await deleteBaba(babaId);
        toast.success("Baba removido!");
      } catch (error) {
        toast.error("Erro ao excluir");
      }
    }
  };

  return (
    <div className="min-h-screen p-5 bg-[#050505] text-white font-tactical">
      <div className="max-w-4xl mx-auto">
        {/* Header (Preservado) */}
        <div className="flex items-center justify-between mb-8">
          <Logo size="small" />
          <button onClick={signOut} className="text-red-500 hover:scale-110 transition-transform p-2 bg-red-500/10 rounded-xl border border-red-500/20">
            <LogOut size={20} />
          </button>
        </div>

        {/* User Info Card (Melhorado com link para Perfil) */}
        <div className="card-glass p-6 mb-8 rounded-3xl border border-white/5 shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-cyan-electric/10 flex items-center justify-center border border-cyan-electric/20 overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
              ) : (
                <User className="text-cyan-electric" size={24} />
              )}
            </div>
            <div>
              <h2 className="text-lg font-black italic uppercase tracking-tighter">
                {profile?.name || user?.user_metadata?.name || 'Comandante'}
              </h2>
              <p className="text-[10px] font-bold opacity-30 uppercase tracking-[0.2em]">{user?.email}</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/profile')}
            className="p-3 bg-white/5 rounded-xl hover:bg-cyan-electric/20 text-cyan-electric transition-all border border-white/5"
          >
            <Settings size={18} />
          </button>
        </div>

        {/* CORREÇÃO: Título com HTML real em vez de texto sujo */}
        <h1 className="text-3xl font-black mb-6 text-white italic uppercase tracking-tighter">
          {isEditing ? (
            <>EDITANDO <span className="text-cyan-electric">BABA</span></>
          ) : (
            <>MEUS <span className="text-cyan-electric">BABAS</span></>
          )}
        </h1>

        {loading ? (
          <div className="text-center py-20 animate-pulse">
            <Loader2 className="animate-spin text-cyan-electric mx-auto mb-4" size={40} />
            <p className="text-[10px] font-black tracking-[0.5em] text-cyan-electric">CARREGANDO DADOS</p>
          </div>
        ) : babas?.length === 0 && !isEditing ? (
          <div className="card-glass p-12 text-center border-dashed border-white/10 rounded-[2.5rem] flex flex-col items-center">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
               <Plus className="text-cyan-electric/20" size={40} />
            </div>
            <p className="text-xs opacity-40 mb-8 font-black uppercase italic tracking-widest">Nenhum baba sob seu comando</p>
            <button 
              onClick={() => { setIsEditing(false); setShowCreateModal(true); }} 
              className="bg-cyan-electric text-black px-10 py-5 rounded-2xl font-black uppercase italic text-xs shadow-neon-cyan hover:scale-105 transition-all"
            >
              CRIAR PRIMEIRO BABA
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
              {babas?.map((baba) => (
                <div 
                  key={baba.id} 
                  onClick={() => handleSelectBaba(baba)} 
                  className="card-glass p-7 cursor-pointer hover:border-cyan-electric/50 transition-all border border-white/5 rounded-[2rem] group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4 flex gap-2">
                     <button onClick={(e) => { e.stopPropagation(); navigate(`/edit-baba/${baba.id}`); }} className="opacity-0 group-hover:opacity-100 p-2 hover:bg-white/10 rounded-lg transition-all text-white/50">
                        <Settings size={14} />
                     </button>
                     <button onClick={(e) => handleDelete(e, baba.id)} className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/20 rounded-lg transition-all text-red-500">
                        <Trash2 size={14} />
                     </button>
                  </div>

                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-black italic uppercase tracking-tighter group-hover:text-cyan-electric transition-colors">{baba.nome || baba.name}</h3>
                      <p className="text-[9px] text-cyan-electric uppercase font-black tracking-widest opacity-60">{baba.modality || 'FUTSAL'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-[9px] font-black opacity-40 uppercase tracking-widest">
                    <span className="flex items-center gap-1.5"><Users size={12}/> {baba.member_count || 0} ATLETAS</span>
                    <span className="flex items-center gap-1.5"><Clock size={12}/> {baba.game_time || '20:00'}</span>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={() => { setIsEditing(false); setShowCreateModal(true); }} 
              className="w-full bg-white/5 border border-white/10 py-6 rounded-3xl font-black uppercase text-[10px] tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-cyan-electric/10 hover:border-cyan-electric/30 transition-all active:scale-95"
            >
              <Plus className="text-cyan-electric" size={16} strokeWidth={3} /> ADICIONAR NOVO PROJETO
            </button>
          </>
        )}

        {/* Modal Preservado com Lógica de Voltar corrigida */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center p-5 z-50">
            <div className="card-glass p-10 max-w-md w-full border border-cyan-electric/30 rounded-[3rem] shadow-[0_0_50px_rgba(0,242,255,0.1)]">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-2xl font-black text-cyan-electric italic uppercase tracking-tighter">
                  {isEditing ? 'EDITAR BABA' : 'NOVO BABA'}
                </h2>
                <button onClick={() => { setShowCreateModal(false); if(isEditing) navigate('/dashboard'); }} className="text-white/20 hover:text-white transition-colors">
                  <X size={28} />
                </button>
              </div>

              <form onSubmit={handleCreateOrUpdateBaba} className="space-y-6">
                <div>
                  <label className="text-[9px] font-black uppercase opacity-40 mb-3 block tracking-[0.2em] ml-2">Identificação do Grupo</label>
                  <input 
                    type="text" 
                    value={newBaba.name} 
                    onChange={(e) => setNewBaba({ ...newBaba, name: e.target.value.toUpperCase() })} 
                    required 
                    className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none focus:border-cyan-electric transition-all font-bold text-sm" 
                    placeholder="EX: BABA DOS AMIGOS"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black uppercase opacity-40 mb-3 block tracking-[0.2em] ml-2">Modalidade</label>
                    <select 
                      value={newBaba.modality} 
                      onChange={(e) => setNewBaba({ ...newBaba, modality: e.target.value })} 
                      className="w-full bg-black border border-white/10 p-5 rounded-2xl outline-none text-xs font-black uppercase appearance-none"
                    >
                      <option value="futsal">Futsal</option>
                      <option value="society">Society</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase opacity-40 mb-3 block tracking-[0.2em] ml-2">Horário Padrão</label>
                    <input 
                      type="time" 
                      value={newBaba.game_time} 
                      onChange={(e) => setNewBaba({ ...newBaba, game_time: e.target.value })} 
                      className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none font-bold text-sm" 
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-white/5 p-6 rounded-2xl border border-white/5">
                  <input 
                    type="checkbox" 
                    id="private" 
                    checked={newBaba.is_private} 
                    onChange={(e) => setNewBaba({ ...newBaba, is_private: e.target.checked })} 
                    className="w-6 h-6 accent-cyan-electric rounded cursor-pointer" 
                  />
                  <label htmlFor="private" className="text-[10px] font-black uppercase tracking-wider cursor-pointer">
                    Baba Privado <span className="opacity-40 ml-1 text-[8px]">(Sorteio manual)</span>
                  </label>
                </div>

                <div className="flex gap-4 pt-6">
                  <button 
                    type="button" 
                    onClick={() => { setShowCreateModal(false); if(isEditing) navigate('/dashboard'); }} 
                    className="flex-1 py-5 rounded-2xl font-black text-[10px] uppercase bg-white/5 hover:bg-white/10 transition-all tracking-widest"
                  >
                    VOLTAR
                  </button>
                  <button 
                    type="submit" 
                    className="flex-[2] py-5 rounded-2xl font-black text-[10px] uppercase bg-cyan-electric text-black shadow-neon-cyan hover:scale-105 active:scale-95 transition-all tracking-widest"
                  >
                    {isEditing ? 'SALVAR ALTERAÇÕES' : 'CONSOLIDAR BABA'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
