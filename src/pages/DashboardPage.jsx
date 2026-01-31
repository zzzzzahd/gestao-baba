import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBaba } from '../contexts/BabaContext';
import { supabase } from '../services/supabase'; // CORREÇÃO: Ajustado de '../lib/supabase' para '../services/supabase' conforme estrutura de pastas
import Logo from '../components/Logo';
import toast from 'react-hot-toast';

const DashboardPage = () => {
  const { id } = useParams(); // Pega o ID da URL se for edição
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { myBabas, createBaba, selectBaba, loading } = useBaba();
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

  // LOGICA PARA CARREGAR DADOS SE FOR EDIÇÃO
  useEffect(() => {
    if (id) {
      const loadBabaData = async () => {
        const { data, error } = await supabase
          .from('babas')
          .select('*')
          .eq('id', id)
          .single();

        if (data) {
          setNewBaba(data);
          setIsEditing(true);
          setShowCreateModal(true); // Abre o modal direto para editar
        }
      };
      loadBabaData();
    }
  }, [id]);

  const handleCreateOrUpdateBaba = async (e) => {
    e.preventDefault();
    
    if (isEditing) {
      // LOGICA DE ATUALIZAR
      const { error } = await supabase
        .from('babas')
        .update(newBaba)
        .eq('id', id);

      if (!error) {
        toast.success("Baba atualizado!");
        navigate('/profile');
      } else {
        toast.error("Erro ao atualizar");
      }
    } else {
      // LOGICA DE CRIAR (Original sua)
      const { error } = await createBaba(newBaba);
      if (!error) {
        setShowCreateModal(false);
        setNewBaba({
          name: '', modality: 'futsal', is_private: false,
          game_days: [], game_time: '20:00', match_duration: 10
        });
      }
    }
  };

  const handleSelectBaba = async (babaId) => {
    await selectBaba(babaId);
    navigate('/home');
  };

  return (
    <div className="min-h-screen p-5">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Logo size="small" />
          <button
            onClick={signOut}
            className="text-red-500 hover:text-red-400 transition-colors"
          >
            <i className="fas fa-sign-out-alt text-xl"></i>
          </button>
        </div>

        {/* User Info */}
        <div className="card-glass p-6 mb-6 animate-slide-in">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-cyan-electric/20 flex items-center justify-center">
              <i className="fas fa-user text-2xl text-cyan-electric"></i>
            </div>
            <div>
              <h2 className="text-xl font-bold">{user?.user_metadata?.name || 'Jogador'}</h2>
              <p className="text-sm opacity-60">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold mb-6 text-cyan-electric">
          {isEditing ? 'EDITANDO BABA' : 'MEUS BABAS'}
        </h1>

        {/* Babas Grid */}
        {loading ? (
          <div className="text-center py-12">
            <i className="fas fa-spinner fa-spin text-4xl text-cyan-electric"></i>
          </div>
        ) : myBabas.length === 0 && !isEditing ? (
          <div className="card-glass p-12 text-center">
            <i className="fas fa-futbol text-6xl text-cyan-electric/30 mb-4"></i>
            <p className="text-lg opacity-60 mb-6">
              Você ainda não tem nenhum baba
            </p>
            <button
              onClick={() => { setIsEditing(false); setShowCreateModal(true); }}
              className="btn-primary max-w-xs mx-auto"
            >
              CRIAR MEU PRIMEIRO BABA
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {myBabas.map((baba) => (
                <div
                  key={baba.id}
                  onClick={() => handleSelectBaba(baba.id)}
                  className="card-glass p-6 cursor-pointer hover:border-cyan-electric/50 transition-all animate-slide-in"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold mb-1">{baba.name}</h3>
                      <p className="text-sm text-cyan-electric uppercase">
                        {baba.modality}
                      </p>
                    </div>
                    {baba.is_private && (
                      <i className="fas fa-lock text-green-neon"></i>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm opacity-60">
                    <span>
                      <i className="fas fa-users mr-2"></i>
                      {baba.players?.[0]?.count || 0} jogadores
                    </span>
                    <span>
                      <i className="fas fa-clock mr-2"></i>
                      {baba.game_time}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => { setIsEditing(false); setShowCreateModal(true); }}
              className="btn-secondary"
            >
              <i className="fas fa-plus mr-2"></i>
              CRIAR NOVO BABA
            </button>
          </>
        )}

        {/* Modal Único para Criar ou Editar */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-5 z-50 animate-fade-in">
            <div className="card-glass p-6 max-w-md w-full animate-slide-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-cyan-electric">
                  {isEditing ? 'EDITAR BABA' : 'NOVO BABA'}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    if(isEditing) navigate('/profile'); // Se fechar a edição, volta pro perfil
                  }}
                  className="text-2xl hover:text-red-500 transition-colors"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <form onSubmit={handleCreateOrUpdateBaba} className="space-y-4">
                <div>
                  <label className="block text-sm mb-2 opacity-60">Nome do Baba</label>
                  <input
                    type="text"
                    value={newBaba.name}
                    onChange={(e) => setNewBaba({ ...newBaba, name: e.target.value })}
                    placeholder="Ex: Baba da Galera"
                    required
                    className="input-tactical w-full bg-white/5 border border-white/10 p-3 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2 opacity-60">Modalidade</label>
                  <select
                    value={newBaba.modality}
                    onChange={(e) => setNewBaba({ ...newBaba, modality: e.target.value })}
                    className="input-tactical w-full bg-black border border-white/10 p-3 rounded-lg"
                  >
                    <option value="futsal">Futsal (5x5)</option>
                    <option value="society">Society (8x8)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm mb-2 opacity-60">Horário do Jogo</label>
                  <input
                    type="time"
                    value={newBaba.game_time}
                    onChange={(e) => setNewBaba({ ...newBaba, game_time: e.target.value })}
                    className="input-tactical w-full bg-white/5 border border-white/10 p-3 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2 opacity-60">Duração da Partida (minutos)</label>
                  <input
                    type="number"
                    value={newBaba.match_duration}
                    onChange={(e) => setNewBaba({ ...newBaba, match_duration: parseInt(e.target.value) })}
                    min="5" max="30"
                    className="input-tactical w-full bg-white/5 border border-white/10 p-3 rounded-lg"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="private"
                    checked={newBaba.is_private}
                    onChange={(e) => setNewBaba({ ...newBaba, is_private: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <label htmlFor="private" className="text-sm">Baba privado</label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                       setShowCreateModal(false);
                       if(isEditing) navigate('/profile');
                    }}
                    className="bg-white/10 hover:bg-white/20 flex-1 py-3 rounded-lg transition-all"
                  >
                    CANCELAR
                  </button>
                  <button type="submit" className="bg-cyan-electric text-black font-bold flex-1 py-3 rounded-lg hover:brightness-110 transition-all">
                    {isEditing ? 'SALVAR' : 'CRIAR'}
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
