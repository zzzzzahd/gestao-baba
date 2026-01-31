import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBaba } from '../contexts/BabaContext';
import Logo from '../components/Logo';
import { LogOut, User, Football, Lock, Clock, Users, Plus, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const DashboardPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  
  // Funções centralizadas no contexto
  const { 
    myBabas, 
    createBaba, 
    updateBaba, 
    selectBaba, 
    getBabaById, 
    loading, 
    loadMyBabas 
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

  // Carrega dados se estiver em modo de edição
  useEffect(() => {
    if (id && getBabaById) {
      const loadBabaData = async () => {
        const data = await getBabaById(id);
        if (data) {
          setNewBaba(data);
          setIsEditing(true);
          setShowCreateModal(true);
        } else {
          toast.error("Baba não encontrado");
          navigate('/profile');
        }
      };
      loadBabaData();
    }
  }, [id, getBabaById, navigate]);

  const handleCreateOrUpdateBaba = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        const { error } = await updateBaba(id, {
          name: newBaba.name,
          modality: newBaba.modality,
          is_private: newBaba.is_private,
          game_time: newBaba.game_time,
          match_duration: newBaba.match_duration
        });

        if (error) throw error;
        toast.success("Baba atualizado!");
        navigate('/profile');
      } else {
        const { error } = await createBaba(newBaba);
        if (error) throw error;
        
        setShowCreateModal(false);
        setNewBaba({
          name: '', modality: 'futsal', is_private: false,
          game_days: [], game_time: '20:00', match_duration: 10
        });
        toast.success("Novo baba criado!");
      }
      
      if (loadMyBabas) loadMyBabas();
    } catch (error) {
      toast.error(error.message || "Erro na operação");
    }
  };

  const handleSelectBaba = async (babaId) => {
    await selectBaba(babaId);
    navigate('/home');
  };

  return (
    <div className="min-h-screen p-5 bg-black text-white font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Logo size="small" />
          <button onClick={signOut} className="text-red-500 hover:scale-110 transition-transform p-2 bg-red-500/10 rounded-xl">
            <LogOut size={20} />
          </button>
        </div>

        {/* User Info Card */}
        <div className="card-glass p-6 mb-8 rounded-3xl border border-white/10 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-cyan-electric/10 flex items-center justify-center border border-cyan-electric/30">
              <User className="text-cyan-electric" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black italic uppercase tracking-tighter">
                {user?.user_metadata?.name || 'Jogador'}
              </h2>
              <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">{user?.email}</p>
            </div>
          </div>
        </div>

        <h1 className="text-3xl font-black mb-6 text-cyan-electric italic uppercase tracking-tighter">
          {isEditing ? 'EDITANDO BABA' : 'MEUS BABAS'}
        </h1>

        {loading ? (
          <div className="text-center py-20">
            <Loader2 className="animate-spin text-cyan-electric mx-auto" size={40} />
          </div>
        ) : myBabas.length === 0 && !isEditing ? (
          <div className="card-glass p-12 text-center border-dashed rounded-[2.5rem] flex flex-col items-center">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
               <Plus className="text-cyan-electric/20" size={40} />
            </div>
            <p className="text-sm opacity-60 mb-8 font-black uppercase italic tracking-widest text-center">Nenhum baba encontrado</p>
            <button 
              onClick={() => { setIsEditing(false); setShowCreateModal(true); }} 
              className="bg-cyan-electric text-black px-10 py-4 rounded-2xl font-black uppercase italic text-xs shadow-[0_10px_20px_rgba(0,242,255,0.2)]"
            >
              CRIAR PRIMEIRO BABA
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {myBabas.map((baba) => (
                <div 
                  key={baba.id} 
                  onClick={() => handleSelectBaba(baba.id)} 
                  className="card-glass p-6 cursor-pointer hover:border-cyan-electric transition-all border border-white/10 rounded-3xl group"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-black italic uppercase tracking-tighter group-hover:text-cyan-electric transition-colors">{baba.name}</h3>
                      <p className="text-[9px] text-cyan-electric uppercase font-black tracking-widest opacity-60">{baba.modality}</p>
                    </div>
                    {baba.is_private && <Lock className="text-yellow-500" size={14} />}
                  </div>
                  <div className="flex items-center gap-6 text-[9px] font-black opacity-40 uppercase tracking-widest">
                    <span className="flex items-center gap-1.5"><Users size={12}/> {baba.member_count || 0} ATLETAS</span>
                    <span className="flex items-center gap-1.5"><Clock size={12}/> {baba.game_time}</span>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={() => { setIsEditing(false); setShowCreateModal(true); }} 
              className="w-full bg-white/5 border border-white/10 py-5 rounded-3xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 hover:bg-white/10 transition-all active:scale-[0.98]"
            >
              <Plus className="text-cyan-electric" size={16} /> CRIAR NOVO BABA
            </button>
          </>
        )}

        {/* Modal de Criar/Editar */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center p-5 z-50">
            <div className="card-glass p-8 max-w-md w-full border border-cyan-electric/30 rounded-[2.5rem]">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-2xl font-black text-cyan-electric italic uppercase tracking-tighter">
                  {isEditing ? 'EDITAR BABA' : 'NOVO BABA'}
                </h2>
                <button onClick={() => { setShowCreateModal(false); if(isEditing) navigate('/profile'); }} className="text-white/20 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleCreateOrUpdateBaba} className="space-y-6">
                <div>
                  <label className="text-[9px] font-black uppercase opacity-40 mb-2 block tracking-[0.2em] ml-2">Nome do Grupo</label>
                  <input 
                    type="text" 
                    value={newBaba.name} 
                    onChange={(e) => setNewBaba({ ...newBaba, name: e.target.value.toUpperCase() })} 
                    required 
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-cyan-electric transition-all font-bold" 
                    placeholder="EX: BABA DOS AMIGOS"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black uppercase opacity-40 mb-2 block tracking-[0.2em] ml-2">Modalidade</label>
                    <select 
                      value={newBaba.modality} 
                      onChange={(e) => setNewBaba({ ...newBaba, modality: e.target.value })} 
                      className="w-full bg-black border border-white/10 p-4 rounded-2xl outline-none text-xs font-black uppercase"
                    >
                      <option value="futsal">Futsal</option>
                      <option value="society">Society</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase opacity-40 mb-2 block tracking-[0.2em] ml-2">Horário</label>
                    <input 
                      type="time" 
                      value={newBaba.game_time} 
                      onChange={(e) => setNewBaba({ ...newBaba, game_time: e.target.value })} 
                      className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none font-bold" 
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-white/5 p-5 rounded-2xl border border-white/5">
                  <input 
                    type="checkbox" 
                    id="private" 
                    checked={newBaba.is_private} 
                    onChange={(e) => setNewBaba({ ...newBaba, is_private: e.target.checked })} 
                    className="w-5 h-5 accent-cyan-electric rounded" 
                  />
                  <label htmlFor="private" className="text-[10px] font-black uppercase tracking-wider cursor-pointer">
                    Baba Privado <span className="opacity-40 ml-1">(Apenas Convidados)</span>
                  </label>
                </div>

                <div className="flex gap-4 pt-6">
                  <button 
                    type="button" 
                    onClick={() => { setShowCreateModal(false); if(isEditing) navigate('/profile'); }} 
                    className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase bg-white/5 hover:bg-white/10 transition-all"
                  >
                    CANCELAR
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase bg-cyan-electric text-black shadow-[0_10px_25px_rgba(0,242,255,0.3)] hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    {isEditing ? 'SALVAR' : 'CRIAR BABA'}
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
