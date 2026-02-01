import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBaba } from '../contexts/BabaContext';
import Logo from '../components/Logo';
import { LogOut, User, Clock, Users, Plus, X, Loader2, Trash2, Settings } from 'lucide-react';
import toast from 'react-hot-toast';

const DashboardPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Pegamos o contexto com segurança
  const auth = useAuth();
  const babaContext = useBaba();

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

  // Proteção contra o erro "ReferenceError: AuthContext is not defined"
  if (!auth || !babaContext) return null;

  const { user, profile, signOut } = auth;
  const { babas, createBaba, updateBaba, deleteBaba, selectBaba, loading, refreshBabas } = babaContext;

  useEffect(() => {
    if (id && babas) {
      const babaParaEditar = babas.find(b => b.id === id);
      if (babaParaEditar) {
        setNewBaba({
          name: babaParaEditar.nome || babaParaEditar.name || '',
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
        await updateBaba(id, {
          nome: newBaba.name,
          modality: newBaba.modality,
          game_time: newBaba.game_time,
          is_private: newBaba.is_private
        });
        toast.success("Atualizado!");
        navigate('/dashboard');
      } else {
        await createBaba(newBaba.name);
        toast.success("Criado!");
      }
      setShowCreateModal(false);
      setNewBaba({ name: '', modality: 'futsal', is_private: false, game_days: [], game_time: '20:00', match_duration: 10 });
      if (refreshBabas) refreshBabas();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleSelectBaba = (baba) => {
    selectBaba(baba);
    navigate('/home');
  };

  const handleDelete = async (e, babaId) => {
    e.stopPropagation();
    if (window.confirm("Excluir este Baba?")) {
      try {
        await deleteBaba(babaId);
        toast.success("Removido!");
      } catch (error) {
        toast.error("Erro ao excluir");
      }
    }
  };

  return (
    <div className="min-h-screen p-5 bg-[#050505] text-white font-tactical">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Logo size="small" />
          <button onClick={signOut} className="text-red-500 p-2 bg-red-500/10 rounded-xl border border-red-500/20">
            <LogOut size={20} />
          </button>
        </div>

        <div className="card-glass p-6 mb-8 rounded-3xl border border-white/5 flex items-center justify-between">
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
          <button onClick={() => navigate('/profile')} className="p-3 bg-white/5 rounded-xl text-cyan-electric border border-white/5">
            <Settings size={18} />
          </button>
        </div>

        <h1 className="text-3xl font-black mb-6 italic uppercase">
          {isEditing ? <>EDITANDO <span className="text-cyan-electric">BABA</span></> : <>MEUS <span className="text-cyan-electric">BABAS</span></>}
        </h1>

        {loading ? (
          <div className="text-center py-20"><Loader2 className="animate-spin text-cyan-electric mx-auto mb-4" /></div>
        ) : babas?.length === 0 && !isEditing ? (
          <div className="card-glass p-12 text-center rounded-[2.5rem]">
            <p className="text-xs opacity-40 mb-8 font-black uppercase tracking-widest">Nenhum baba sob seu comando</p>
            <button onClick={() => { setIsEditing(false); setShowCreateModal(true); }} className="bg-cyan-electric text-black px-10 py-5 rounded-2xl font-black text-xs">
              CRIAR PRIMEIRO BABA
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
            {babas?.map((baba) => (
              <div key={baba.id} onClick={() => handleSelectBaba(baba)} className="card-glass p-7 cursor-pointer hover:border-cyan-electric/50 transition-all border border-white/5 rounded-[2rem] group relative">
                <div className="absolute top-0 right-0 p-4 flex gap-2">
                   <button onClick={(e) => { e.stopPropagation(); navigate(`/edit-baba/${baba.id}`); }} className="opacity-0 group-hover:opacity-100 p-2 text-white/50"><Settings size={14} /></button>
                   <button onClick={(e) => handleDelete(e, baba.id)} className="opacity-0 group-hover:opacity-100 p-2 text-red-500"><Trash2 size={14} /></button>
                </div>
                <h3 className="text-xl font-black italic uppercase group-hover:text-cyan-electric">{baba.nome || baba.name}</h3>
                <div className="flex items-center gap-6 text-[9px] font-black opacity-40 mt-4 uppercase">
                  <span className="flex items-center gap-1.5"><Users size={12}/> {baba.member_count || 0} ATLETAS</span>
                  <span className="flex items-center gap-1.5"><Clock size={12}/> {baba.game_time || '20:00'}</span>
                </div>
              </div>
            ))}
            <button onClick={() => { setIsEditing(false); setShowCreateModal(true); }} className="w-full bg-white/5 border border-white/10 py-6 rounded-3xl font-black uppercase text-[10px] tracking-[0.3em] flex items-center justify-center gap-3">
              <Plus className="text-cyan-electric" size={16} /> ADICIONAR NOVO
            </button>
          </div>
        )}

        {showCreateModal && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center p-5 z-50">
            <div className="card-glass p-10 max-w-md w-full rounded-[3rem] border border-cyan-electric/30">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-2xl font-black text-cyan-electric italic uppercase">{isEditing ? 'EDITAR BABA' : 'NOVO BABA'}</h2>
                <button onClick={() => { setShowCreateModal(false); if(isEditing) navigate('/dashboard'); }}><X size={28} /></button>
              </div>
              <form onSubmit={handleCreateOrUpdateBaba} className="space-y-6">
                <input type="text" value={newBaba.name} onChange={(e) => setNewBaba({ ...newBaba, name: e.target.value.toUpperCase() })} required className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none" placeholder="NOME DO BABA" />
                <div className="grid grid-cols-2 gap-4">
                  <select value={newBaba.modality} onChange={(e) => setNewBaba({ ...newBaba, modality: e.target.value })} className="w-full bg-black border border-white/10 p-5 rounded-2xl outline-none text-xs">
                    <option value="futsal">Futsal</option>
                    <option value="society">Society</option>
                  </select>
                  <input type="time" value={newBaba.game_time} onChange={(e) => setNewBaba({ ...newBaba, game_time: e.target.value })} className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none" />
                </div>
                <button type="submit" className="w-full py-5 rounded-2xl font-black text-[10px] bg-cyan-electric text-black shadow-neon-cyan">
                  {isEditing ? 'SALVAR ALTERAÇÕES' : 'CONSOLIDAR BABA'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
