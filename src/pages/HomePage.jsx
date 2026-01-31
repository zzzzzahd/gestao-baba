import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaba } from '../contexts/BabaContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase, TABLES } from '../services/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';

const HomePage = () => {
  const navigate = useNavigate();
  const { currentBaba } = useBaba();
  const { user } = useAuth();
  
  const [nextMatch, setNextMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guestPlayerName, setGuestPlayerName] = useState('');
  const [guestList, setGuestList] = useState([]);
  const [showResult, setShowResult] = useState(false);
  const [teams, setTeams] = useState(null);

  useEffect(() => {
    if (!currentBaba) {
      navigate('/visitor');
      return;
    }
    if (user) {
      loadNextMatch();
    } else {
      setLoading(false);
    }
  }, [currentBaba, user]);

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

      if (match) setNextMatch(match);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSortear = () => {
    if (guestList.length < 4) {
      toast.error("Adicione pelo menos 4 jogadores!");
      return;
    }
    const shuffled = [...guestList].sort(() => Math.random() - 0.5);
    const half = Math.ceil(shuffled.length / 2);
    const result = {
      a: { name: 'TIME A', players: shuffled.slice(0, half).map(p => p.player.name) },
      b: { name: 'TIME B', players: shuffled.slice(half).map(p => p.player.name) }
    };
    setTeams(result);
    setShowResult(true);
    localStorage.setItem('temp_teams', JSON.stringify(result));
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><i className="fas fa-spinner fa-spin text-cyan-electric text-4xl"></i></div>;

  return (
    <div className="min-h-screen p-5 bg-black text-white">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-xl font-bold text-cyan-electric">{currentBaba?.name || 'BABA RÁPIDO'}</h1>
          {!user && <span className="bg-yellow-500 text-black text-[10px] px-2 py-1 rounded font-black">MODO VISITANTE</span>}
        </div>

        {!user && (
          <div className="space-y-6">
            <div className="card-glass p-6 border border-white/10">
              <form onSubmit={(e) => {
                e.preventDefault();
                if (!guestPlayerName.trim()) return;
                setGuestList([...guestList, { id: Date.now(), player: { name: guestPlayerName.toUpperCase() } }]);
                setGuestPlayerName('');
                setShowResult(false);
              }} className="flex gap-2">
                <input 
                  type="text" value={guestPlayerName} 
                  onChange={(e) => setGuestPlayerName(e.target.value)}
                  placeholder="Nome do jogador..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-cyan-electric"
                />
                <button type="submit" className="bg-cyan-electric text-black px-6 rounded-lg font-black">+</button>
              </form>
            </div>

            {showResult && teams && (
              <div className="card-glass p-6 border border-green-500/50 animate-bounce-in">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/5 p-4 rounded-lg">
                    <p className="text-cyan-electric font-bold text-xs mb-2">TIME A</p>
                    {teams.a.players.map((n, i) => <p key={i} className="text-sm border-b border-white/5 py-1">{n}</p>)}
                  </div>
                  <div className="bg-white/5 p-4 rounded-lg">
                    <p className="text-green-500 font-bold text-xs mb-2">TIME B</p>
                    {teams.b.players.map((n, i) => <p key={i} className="text-sm border-b border-white/5 py-1">{n}</p>)}
                  </div>
                </div>
                <button onClick={() => navigate('/match')} className="w-full bg-green-500 text-black py-4 rounded-xl font-black">IR PARA A QUADRA</button>
              </div>
            )}

            <div className="card-glass p-6 border border-white/5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold opacity-50">LISTA ({guestList.length})</h3>
                {guestList.length >= 4 && !showResult && (
                  <button onClick={handleSortear} className="bg-cyan-electric text-black px-4 py-2 rounded-lg font-black text-xs">SORTEAR</button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2">
                {guestList.map(p => (
                  <div key={p.id} className="flex justify-between bg-white/5 p-3 rounded-lg">
                    <span className="text-sm font-bold uppercase">{p.player.name}</span>
                    <button onClick={() => setGuestList(guestList.filter(i => i.id !== p.id))} className="text-red-500"><i className="fas fa-trash"></i></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
