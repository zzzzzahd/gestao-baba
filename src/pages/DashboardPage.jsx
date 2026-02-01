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
  const auth = useAuth();
  const babaCtx = useBaba();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newBaba, setNewBaba] = useState({ name: '', modality: 'futsal', is_private: false, game_time: '20:00' });

  // --- A TRAVA ANTI-TIMEOUT ---
  // Se o contexto está carregando, mostramos essa tela. 
  // Isso impede o erro de "Timeout" que você viu no console.
  if (!auth || auth.loading || !babaCtx) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center font-tactical">
        <Loader2 className="animate-spin text-cyan-electric mb-4" size={40} />
        <p className="text-[10px] font-black text-cyan-electric tracking-[0.5em] uppercase italic animate-pulse">
          AUTENTICANDO COMANDANTE...
        </p>
      </div>
    );
  }

  const { user, profile, signOut } = auth;
  const { babas, createBaba, updateBaba, deleteBaba, selectBaba, loading, refreshBabas } = babaCtx;

  useEffect(() => {
    if (id && babas) {
      const editTarget = babas.find(b => b.id === id);
      if (editTarget) {
        setNewBaba({
          name: editTarget.nome || editTarget.name || '',
          modality: editTarget.modality || 'futsal',
          is_private: editTarget.is_private || false,
          game_time: editTarget.game_time || '20:00'
        });
        setIsEditing(true);
        setShowCreateModal(true);
      }
    }
  }, [id, babas]);

  const handleAction = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await updateBaba(id, newBaba);
        toast.success("Atualizado!");
        navigate('/dashboard');
      } else {
        await createBaba(newBaba.name);
        toast.success("Criado!");
      }
      setShowCreateModal(false);
      setIsEditing(false);
      setNewBaba({ name: '', modality: 'futsal', is_private: false, game_time: '20:00' });
      if (refreshBabas) refreshBabas();
    } catch (err) {
      toast.error("Erro na operação");
    }
  };

  const handleDelete = async (e, babaId) => {
    e.stopPropagation();
    if (window.confirm("Deseja excluir este Baba?")) {
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
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <Logo size="small" />
          <button onClick={signOut} className="p-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 hover:scale-110 transition-all">
            <LogOut size={20}/>
          </button>
        </div>

        {/* Card de Identificação */}
        <div className="card-glass p-6 mb-8 rounded-3xl border border-white/5 flex items-center justify-between shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-cyan-electric/10 border border-cyan-electric/20 flex items-center justify-center overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
              ) : (
                <User className="text-cyan-electric" size={24} />
              )}
            </div>
            <div>
              <h2 className="text-lg font-black italic uppercase tracking-tighter">
                {profile?.name || user?.user_metadata?.full_name || 'Comandante'}
              </h2>
              <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest">{user?.email}</p>
            </div>
          </div>
          <button onClick={() => navigate('/profile')} className="p-3 bg-white/5 rounded-xl text-cyan-electric hover:bg-cyan-electric/20 transition-all border border-white/5">
            <Settings size={18} />
          </button>
        </div>

        <h1 className="text-3xl font-black mb-6 italic uppercase tracking-tighter">
          {isEditing ? <>EDITAR <span className="text-cyan-electric">BABA</span></> : <>MEUS <span className="text-cyan-electric">BABAS</span></>}
        </h1>

        {loading ? (
          <div className="text-center py-20 animate-pulse">
            <Loader2 className="animate-spin text-cyan-electric mx-auto" size={40} />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
            {babas?.map((baba) => (
              <div 
                key={baba.id} 
                onClick={() => { selectBaba(baba); navigate('/home'); }} 
                className="card-glass p-7 border border-white/5 rounded-[2rem] group relative cursor-pointer hover:border-cyan-electric/50 transition-all"
              >
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); navigate(`/edit-baba/${baba.id}`); }} className="p-2 text-white/50 hover:text-white"><Settings size={14}/></button>
                  <button onClick={(e) => handleDelete(e, baba.id)} className="p-2 text-red-500 hover:text-red-400"><Trash2 size={14}/></button>
                </div>
                <h3 className="text-xl font-black italic uppercase group-hover:text-cyan-electric transition-colors">{baba.nome || baba.name}</h3>
                <div className="flex gap-4 text-[9px] font-black opacity-40 mt-4 uppercase tracking-widest">
                  <span className="flex items-center gap-1.5"><Users size={12}/> {baba.member_count || 0} ATLETAS</span>
                  <span className="flex items-center gap-1.5"><Clock size={12}/> {baba.game_time || '20:00'}</span>
                </div>
              </div>
            ))}
            
            <button 
              onClick={() => { setIsEditing(false); setShowCreateModal(true); }} 
              className="w-full bg-white/5 border border-white/10 py-8 rounded-3xl font-black uppercase text-[10px] tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-cyan-electric/5 hover:border-cyan-electric/20 transition-all"
            >
              <Plus className="text-cyan-electric" size={16} strokeWidth={3} /> ADICIONAR NOVO PROJETO
            </button>
          </div>
        )}

        {/* Modal de Cadastro */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center p-5 z-50">
            <div className="card-glass p-10 max-w-md w-full border border-cyan-electric/30 rounded-[3rem] shadow-neon-cyan/10">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-cyan-electric italic uppercase tracking-tighter">
                  {isEditing ? 'EDITAR BABA' : 'NOVO BABA'}
                </h2>
                <button onClick={() => setShowCreateModal(false)} className="text-white/20 hover:text-white"><X size={28}/></button>
              </div>
              <form onSubmit={handleAction} className="space-y-6">
                <input 
                  type="text" 
                  value={newBaba.name} 
                  onChange={(e) => setNewBaba({...newBaba, name: e.target.value.toUpperCase()})} 
                  required 
                  className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none focus:border-cyan-electric transition-all font-bold" 
                  placeholder="NOME DO GRUPO" 
                />
                <div className="grid grid-cols-2 gap-4">
                  <select 
                    value={newBaba.modality} 
                    onChange={(e) => setNewBaba({...newBaba, modality: e.target.value})} 
                    className="w-full bg-black border border-white/10 p-5 rounded-2xl outline-none text-xs font-black uppercase"
                  >
                    <option value="futsal">Futsal</option>
                    <option value="society">Society</option>
                  </select>
                  <input 
                    type="time" 
                    value={newBaba.game_time} 
                    onChange={(e) => setNewBaba({...newBaba, game_time: e.target.value})} 
                    className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl outline-none font-bold" 
                  />
                </div>
                <button type="submit" className="w-full py-5 rounded-2xl font-black text-[10px] bg-cyan-electric text-black shadow-neon-cyan uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all">
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
