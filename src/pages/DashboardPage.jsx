import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBaba } from '../contexts/BabaContext';
import Logo from '../components/Logo';
import toast from 'react-hot-toast';

const DashboardPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  
  // Agora usamos APENAS o contexto. 
  // Removi o supabase e o TABLES daqui.
  const { 
    myBabas, 
    createBaba, 
    updateBaba,    // Adicione esta função ao seu BabaContext se ainda não tiver
    selectBaba, 
    getBabaById,   // Adicione esta função ao seu BabaContext (exemplo abaixo)
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

  // LOGICA PARA CARREGAR DADOS VIA CONTEXTO
  useEffect(() => {
    if (id && getBabaById) {
      const loadBabaData = async () => {
        const data = await getBabaById(id); // O Contexto resolve o Supabase
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
        // Usando a função centralizada do contexto
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
        // createBaba já estava no contexto
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
    <div className="min-h-screen p-5 bg-black text-white">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Logo size="small" />
          <button onClick={signOut} className="text-red-500 hover:scale-110 transition-transform">
            <i className="fas fa-sign-out-alt text-xl"></i>
          </button>
        </div>

        {/* User Info */}
        <div className="card-glass p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-cyan-electric/20 flex items-center justify-center border border-cyan-electric/30">
              <i className="fas fa-user text-2xl text-cyan-electric"></i>
            </div>
            <div>
              <h2 className="text-xl font-bold">{user?.user_metadata?.name || 'Jogador'}</h2>
              <p className="text-sm opacity-60">{user?.email}</p>
            </div>
          </div>
        </div>

        <h1 className="text-3xl font-black mb-6 text-cyan-electric italic uppercase tracking-tighter">
          {isEditing ? 'EDITANDO BABA' : 'MEUS BABAS'}
        </h1>

        {loading ? (
          <div className="text-center py-12">
            <i className="fas fa-spinner fa-spin text-4xl text-cyan-electric"></i>
          </div>
        ) : myBabas.length === 0 && !isEditing ? (
          <div className="card-glass p-12 text-center border-dashed">
            <i className="fas fa-futbol text-6xl text-cyan-electric/20 mb-4"></i>
            <p className="text-lg opacity-60 mb-6 font-bold uppercase italic">Nenhum baba encontrado</p>
            <button onClick={() => { setIsEditing(false); setShowCreateModal(true); }} className="bg-cyan-electric text-black px-8 py-3 rounded-full font-black uppercase italic">
              CRIAR PRIMEIRO BABA
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {myBabas.map((baba) => (
                <div key={baba.id} onClick={() => handleSelectBaba(baba.id)} className="card-glass p-6 cursor-pointer hover:border-cyan-electric transition-all border border-white/10">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold mb-1">{baba.name}</h3>
                      <p className="text-[10px] text-cyan-electric uppercase font-black">{baba.modality}</p>
                    </div>
                    {baba.is_private && <i className="fas fa-lock text-yellow-500 text-sm"></i>}
                  </div>
                  <div className="flex items-center gap-4 text-[11px] font-bold opacity-60">
                    {/* Note: players count deve ser tratado no contexto para evitar erro de leitura direta aqui */}
                    <span><i className="fas fa-users mr-1"></i> {baba.players?.[0]?.count || 0} ATLETAS</span>
                    <span><i className="fas fa-clock mr-1"></i> {baba.game_time}</span>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => { setIsEditing(false); setShowCreateModal(true); }} className="w-full bg-white/5 border border-white/10 py-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-white/10 transition-colors">
              <i className="fas fa-plus text-cyan-electric"></i> CRIAR NOVO BABA
            </button>
          </>
        )}

        {/* Modal de Criar/Editar */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-5 z-50">
            <div className="card-glass p-8 max-w-md w-full border border-cyan-electric/30">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-cyan-electric italic uppercase">{isEditing ? 'EDITAR BABA' : 'NOVO BABA'}</h2>
                <button onClick={() => { setShowCreateModal(false); if(isEditing) navigate('/profile'); }} className="text-white/40 hover:text-white">
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>

              <form onSubmit={handleCreateOrUpdateBaba} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase opacity-50 mb-2 block">Nome</label>
                  <input type="text" value={newBaba.name} onChange={(e) => setNewBaba({ ...newBaba, name: e.target.value })} required className="w-full bg-white/5 border border-white/10 p-4 rounded-xl outline-none focus:border-cyan-electric" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase opacity-50 mb-2 block">Modalidade</label>
                    <select value={newBaba.modality} onChange={(e) => setNewBaba({ ...newBaba, modality: e.target.value })} className="w-full bg-black border border-white/10 p-4 rounded-xl outline-none text-xs font-bold uppercase">
                      <option value="futsal">Futsal</option>
                      <option value="society">Society</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase opacity-50 mb-2 block">Horário</label>
                    <input type="time" value={newBaba.game_time} onChange={(e) => setNewBaba({ ...newBaba, game_time: e.target.value })} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl outline-none font-bold" />
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-white/5 p-4 rounded-xl border border-white/5">
                  <input type="checkbox" id="private" checked={newBaba.is_private} onChange={(e) => setNewBaba({ ...newBaba, is_private: e.target.checked })} className="w-5 h-5 accent-cyan-electric" />
                  <label htmlFor="private" className="text-xs font-bold uppercase">Baba Privado (Apenas Convidados)</label>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => { setShowCreateModal(false); if(isEditing) navigate('/profile'); }} className="flex-1 py-4 rounded-xl font-black text-[10px] uppercase bg-white/5">CANCELAR</button>
                  <button type="submit" className="flex-1 py-4 rounded-xl font-black text-[10px] uppercase bg-cyan-electric text-black shadow-[0_0_20px_rgba(0,242,255,0.3)]">
                    {isEditing ? 'SALVAR ALTERAÇÕES' : 'CRIAR BABA'}
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
