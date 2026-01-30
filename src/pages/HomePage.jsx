import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaba } from '../contexts/BabaContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase, TABLES } from '../services/supabase';
import { format, differenceInSeconds } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';

const HomePage = () => {
  const navigate = useNavigate();
  const { currentBaba } = useBaba();
  const { user } = useAuth();
  
  // Estados para modo logado
  const [nextMatch, setNextMatch] = useState(null);
  const [myPresence, setMyPresence] = useState(null);
  const [confirmedPlayers, setConfirmedPlayers] = useState([]);
  const [countdown, setCountdown] = useState('');
  const [loading, setLoading] = useState(true);

  // Estados para modo VISITANTE (Sorteio Rápido)
  const [guestPlayerName, setGuestPlayerName] = useState('');
  const [guestList, setGuestList] = useState([]);

  useEffect(() => {
    if (!currentBaba) {
      navigate('/visitor');
      return;
    }
    if (user) {
      loadNextMatch();
    } else {
      setLoading(false); // Modo visitante não carrega do banco
    }
  }, [currentBaba, user]);

  // Lógica do Cronômetro (Mantida para modo logado)
  useEffect(() => {
    if (!nextMatch) return;
    const interval = setInterval(() => {
      const now = new Date();
      const matchTime = new Date(nextMatch.match_date);
      const diff = differenceInSeconds(matchTime, now);
      if (diff <= 0) {
        setCountdown('JOGO EM ANDAMENTO!');
      } else {
        const h = Math.floor((diff % 86400) / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const s = diff % 60;
        setCountdown(`${h}h ${m}m ${s}s`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [nextMatch]);

  const loadNextMatch = async () => {
    try {
      setLoading(true);
      const { data: match } = await supabase
        .from(TABLES.MATCHES)
        .select('*')
        .eq('baba_id', currentBaba.id)
        .eq('status', 'scheduled')
        .order('match_date', { ascending: true })
        .limit(1)
        .single();

      if (match) {
        setNextMatch(match);
        const { data: presences } = await supabase
          .from(TABLES.PRESENCES)
          .select('*, player:players(name, position)')
          .eq('match_id', match.id)
          .eq('confirmed', true);
        setConfirmedPlayers(presences || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Funções exclusivas para o VISITANTE
  const addGuestPlayer = (e) => {
    e.preventDefault();
    if (!guestPlayerName.trim()) return;
    const newPlayer = {
      id: Date.now(),
      player: { name: guestPlayerName.toUpperCase(), position: 'linha' }
    };
    setGuestList([...guestList, newPlayer]);
    setGuestPlayerName('');
  };

  const removeGuestPlayer = (id) => {
    setGuestList(guestList.filter(p => p.id !== id));
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <i className="fas fa-spinner fa-spin text-4xl text-cyan-electric"></i>
    </div>
  );

  return (
    <div className="min-h-screen p-5 bg-black text-white">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-bold text-cyan-electric">
            {currentBaba?.name || 'BABA RÁPIDO'}
          </h1>
          {!user && (
             <span className="bg-yellow-500 text-black text-[10px] px-2 py-1 rounded font-bold">MODO VISITANTE</span>
          )}
        </div>

        {user ? (
          /* CONTEÚDO PARA USUÁRIO LOGADO (Original) */
          <>
            {nextMatch ? (
              <div className="card-glass p-8 mb-6 text-center">
                <p className="text-sm text-cyan-electric mb-2 uppercase">PRÓXIMO JOGO</p>
                <h2 className="text-2xl font-bold">{format(new Date(nextMatch.match_date), "dd 'de' MMMM", { locale: ptBR })}</h2>
                <div className="text-5xl font-black my-4 text-cyan-electric">{countdown}</div>
                <button onClick={() => navigate('/match')} className="btn-primary w-full">IR PARA A QUADRA</button>
              </div>
            ) : (
              <div className="card-glass p-10 text-center opacity-50">Nenhuma partida agendada.</div>
            )}
          </>
        ) : (
          /* CONTEÚDO PARA VISITANTE (Sorteio Rápido) */
          <div className="animate-slide-in">
            <div className="card-glass p-6 mb-6">
              <h3 className="text-cyan-electric font-bold mb-4 uppercase text-sm">Adicionar Jogadores para o Sorteio</h3>
              <form onSubmit={addGuestPlayer} className="flex gap-2">
                <input 
                  type="text" 
                  value={guestPlayerName}
                  onChange={(e) => setGuestPlayerName(e.target.value)}
                  placeholder="Nome do jogador..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-cyan-electric outline-none"
                />
                <button type="submit" className="bg-cyan-electric text-black px-6 rounded-lg font-bold">+</button>
              </form>
            </div>

            <div className="card-glass p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-bold uppercase text-sm">Lista de Presença ({guestList.length})</h3>
                {guestList.length >= 4 && (
                   <button onClick={() => navigate('/match')} className="text-xs bg-green-500 text-black px-3 py-1 rounded-full font-bold animate-pulse">
                     SORTEAR E JOGAR
                   </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {guestList.map((p) => (
                  <div key={p.id} className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/5">
                    <span className="text-sm font-medium">{p.player.name}</span>
                    <button onClick={() => removeGuestPlayer(p.id)} className="text-red-500 px-2">
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                ))}
                {guestList.length === 0 && (
                  <p className="col-span-2 text-center py-10 opacity-30 text-xs italic">A lista está vazia. Adicione os nomes acima.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
