import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaba } from '../contexts/BabaContext';
import { useAuth } from '../contexts/AuthContext';
// CORREÇÃO: Import apontando para services e incluindo TABLES
import { supabase, TABLES } from '../services/supabase'; 
import { 
  Trophy, Clock, ClipboardList, Users, Camera, Plus, Save, Edit2, 
  CheckCircle2, Circle, Loader2, Play, DollarSign 
} from 'lucide-react';
import toast from 'react-hot-toast';

const HomePage = () => {
  const navigate = useNavigate();
  const { currentBaba } = useBaba();
  const { user } = useAuth();
  
  // --- ESTADOS ---
  const [guestPlayerName, setGuestPlayerName] = useState('');
  const [isGoalkeeper, setIsGoalkeeper] = useState(false);
  const [guestList, setGuestList] = useState([]);
  const [playersPerTeam, setPlayersPerTeam] = useState(5);
  const [teams, setTeams] = useState([]);
  const [hasDrawn, setHasDrawn] = useState(false);

  const [timeLeft, setTimeLeft] = useState("");
  const [presenceConfirmed, setPresenceConfirmed] = useState(false);
  const [loadingPresence, setLoadingPresence] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [editingRules, setEditingRules] = useState(false);
  const [rulesText, setRulesText] = useState("");
  const [loadingPhoto, setLoadingPhoto] = useState(false);

  // Sincroniza regras
  useEffect(() => {
    if (currentBaba?.rules) {
      setRulesText(currentBaba.rules);
    }
  }, [currentBaba]);

  // Lógica de Presença Blindada
  const checkPresenceStatus = async () => {
    if (!user?.id || !currentBaba?.id) {
      setLoadingPresence(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from(TABLES.PRESENCES)
        .select('*')
        .eq('baba_id', currentBaba.id)
        .eq('player_id', user.id)
        .maybeSingle();

      if (data) setPresenceConfirmed(true);
      else setPresenceConfirmed(false);
    } catch (e) { 
      console.error("Erro ao checar presença:", e);
    } finally { 
      setLoadingPresence(false); 
    }
  };

  const handleTogglePresence = async () => {
    if (isExpired) {
      toast.error("Inscrições encerradas!");
      return;
    }
    if (!user) {
      toast.error("Faça login para confirmar presença.");
      return;
    }

    try {
      if (presenceConfirmed) {
        await supabase.from(TABLES.PRESENCES).delete()
          .eq('baba_id', currentBaba.id)
          .eq('player_id', user.id);
        setPresenceConfirmed(false);
        toast.success("Presença removida");
      } else {
        await supabase.from(TABLES.PRESENCES).insert({ 
          baba_id: currentBaba.id, 
          player_id: user.id 
        });
        setPresenceConfirmed(true);
        toast.success("Presença confirmada!");
      }
    } catch (error) { 
      toast.error("Erro ao processar presença."); 
    }
  };

  // Cronômetro e Verificação de Presença
  useEffect(() => {
    checkPresenceStatus();

    if (!currentBaba?.game_time) {
      setTimeLeft("AGUARDANDO");
      return;
    }
    
    const timer = setInterval(() => {
      const agora = new Date();
      const [hours, minutes] = currentBaba.game_time.split(':');
      const gameDate = new Date();
      gameDate.setHours(parseInt(hours), parseInt(minutes), 0);
      
      const diff = gameDate - agora;
      const minRestantes = diff / 60000;

      if (minRestantes <= 30) setIsExpired(true);

      if (diff > 0) {
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        setTimeLeft(`${h}h ${m}m`);
      } else { 
        setTimeLeft("BOLA ROLANDO"); 
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [currentBaba, user]); // Adicionado user como dependência

  // Sorteio Manual (Preservado)
  const handleSortear = () => {
    if (guestList.length < playersPerTeam) {
      toast.error(`Mínimo de ${playersPerTeam} jogadores!`);
      return;
    }
    const goalkeepers = guestList.filter(p => p.isGoalkeeper);
    const outfieldPlayers = guestList.filter(p => !p.isGoalkeeper);
    const shufGKs = [...goalkeepers].sort(() => Math.random() - 0.5);
    const shufOutfield = [...outfieldPlayers].sort(() => Math.random() - 0.5);
    const numTeams = Math.floor(guestList.length / playersPerTeam);
    const newTeams = [];

    for (let i = 0; i < numTeams; i++) {
      const teamPlayers = [];
      if (shufGKs.length > 0) {
        const gk = shufGKs.shift();
        teamPlayers.push({ name: gk.player.name, role: 'goleiro' });
      }
      while (teamPlayers.length < playersPerTeam && shufOutfield.length > 0) {
        const p = shufOutfield.shift();
        teamPlayers.push({ name: p.player.name, role: 'linha' });
      }
      newTeams.push({ 
        id: i + 1, 
        name: `TIME ${String.fromCharCode(65 + i)}`, 
        players: teamPlayers, 
        extras: [], 
        score: 0 
      });
    }

    const leftovers = [...shufGKs, ...shufOutfield];
    leftovers.forEach((p, index) => {
      if (newTeams[index % numTeams]) {
        newTeams[index % numTeams].extras.push({ 
          name: p.player.name, 
          role: p.isGoalkeeper ? 'goleiro' : 'linha' 
        });
      }
    });

    setTeams(newTeams);
    setHasDrawn(true);
    toast.success("Times sorteados!");
  };

  const handleUploadWinnerPhoto = async (file) => {
    if (!file || !currentBaba?.id) return;
    try {
      setLoadingPhoto(true);
      const filePath = `${currentBaba.id}/current_winner.jpg`;
      await supabase.storage.from('baba-photos').upload(filePath, file, { upsert: true });
      const { data: { publicUrl } } = supabase.storage.from('baba-photos').getPublicUrl(filePath);
      
      await supabase.from(TABLES.BABAS)
        .update({ last_winner_photo: `${publicUrl}?t=${Date.now()}` })
        .eq('id', currentBaba.id);
        
      toast.success("Hall da Fama atualizado!");
    } catch (error) { 
      toast.error("Erro no upload da foto"); 
    } finally { 
      setLoadingPhoto(false); 
    }
  };

  const handleSaveRules = async () => {
    try {
      await supabase.from(TABLES.BABAS).update({ rules: rulesText }).eq('id', currentBaba.id);
      setEditingRules(false);
      toast.success("Regras atualizadas!");
    } catch (e) { 
      toast.error("Erro ao salvar regras."); 
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-24 font-sans">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-black text-cyan-electric tracking-tighter uppercase italic">
          {currentBaba ? currentBaba.name : "Draft Rápido"}
        </h1>
        <span className="bg-cyan-electric/10 text-cyan-electric text-[10px] px-2 py-1 rounded border border-cyan-electric/30 font-bold uppercase">
          {currentBaba ? 'Modo Oficial' : 'Modo Visitante'}
        </span>
      </div>

      <section className="mb-6 relative h-44 rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
        <img 
          src={currentBaba?.last_winner_photo || "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800"} 
          className="w-full h-full object-cover opacity-40" 
          alt="Ganhadores"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        <div className="absolute bottom-4 left-4">
          <p className="text-[8px] font-black text-yellow-500 uppercase tracking-widest mb-1">Últimos Campeões 🏆</p>
          <h2 className="text-lg font-black uppercase italic leading-none">
            {currentBaba?.last_winner_name || "Hall da Fama"}
          </h2>
        </div>
        
        {user?.id === currentBaba?.president_id && (
          <label className="absolute top-4 right-4 bg-black/60 p-2.5 rounded-full border border-white/20 cursor-pointer hover:scale-110 transition-transform">
            {loadingPhoto ? <Loader2 size={16} className="animate-spin text-cyan-electric" /> : <Camera size={16} className="text-cyan-electric" />}
            <input type="file" className="hidden" onChange={(e) => handleUploadWinnerPhoto(e.target.files[0])} disabled={loadingPhoto} />
          </label>
        )}
      </section>

      {isExpired && currentBaba && (
        <button 
          onClick={() => navigate('/teams')}
          className="w-full mb-6 bg-cyan-electric text-black py-5 rounded-3xl font-black uppercase italic flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(0,242,255,0.3)]"
        >
          <Users size={20}/> VER ESCALAÇÃO E SORTEIO
        </button>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-glass p-5 rounded-3xl border border-white/10">
          <h3 className="text-[10px] font-black opacity-40 uppercase mb-4 tracking-widest flex items-center gap-2 text-cyan-electric">
             <Clock size={12}/> {currentBaba ? `Sua Presença (${timeLeft})` : "Adicionar Atletas"}
          </h3>
          
          {currentBaba ? (
            <button
              onClick={handleTogglePresence}
              disabled={isExpired || loadingPresence}
              className={`w-full p-4 rounded-2xl flex items-center justify-between border-2 transition-all ${
                presenceConfirmed ? 'bg-cyan-electric/10 border-cyan-electric text-cyan-electric' : 'bg-white/5 border-white/10'
              } ${isExpired ? 'opacity-30' : 'hover:border-cyan-electric/50'}`}
            >
              <span className="font-black uppercase text-xs">
                {presenceConfirmed ? "ESTOU CONFIRMADO" : "CONFIRMAR PRESENÇA"}
              </span>
              {loadingPresence ? <Loader2 size={18} className="animate-spin"/> : (presenceConfirmed ? <CheckCircle2 size={24}/> : <Circle size={24}/>)}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input 
                  type="text" value={guestPlayerName} 
                  onChange={(e) => setGuestPlayerName(e.target.value)}
                  placeholder="Nome do Atleta..." 
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-3 text-sm outline-none focus:border-cyan-electric/50"
                />
                <button 
                  onClick={() => {
                    if(!guestPlayerName.trim()) return;
                    setGuestList([{id: Date.now(), isGoalkeeper, player: {name: guestPlayerName.toUpperCase()}}, ...guestList]);
                    setGuestPlayerName('');
                  }}
                  className="bg-cyan-electric text-black w-12 h-12 rounded-2xl font-black text-xl">+</button>
              </div>
            </div>
          )}
        </div>

        <div className="card-glass p-5 rounded-3xl border border-white/10">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[10px] font-black opacity-40 uppercase tracking-widest flex items-center gap-2 text-yellow-500">
              <ClipboardList size={12}/> Regras do Baba
            </h3>
            {user?.id === currentBaba?.president_id && (
              <button 
                onClick={() => editingRules ? handleSaveRules() : setEditingRules(true)} 
                className="text-cyan-electric hover:scale-110 transition-transform"
              >
                {editingRules ? <Save size={14}/> : <Edit2 size={14}/>}
              </button>
            )}
          </div>
          <div className="text-[10px] font-bold opacity-60 space-y-1 italic leading-relaxed">
            {editingRules ? (
              <textarea 
                value={rulesText} 
                onChange={(e) => setRulesText(e.target.value)} 
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none"
              />
            ) : (
              currentBaba?.rules ? currentBaba.rules.split('\n').map((r, i) => <p key={i}>• {r}</p>) : <p>Nenhuma regra definida.</p>
            )}
          </div>
        </div>

        {!currentBaba && (
          <div className="md:col-span-2 card-glass p-5 rounded-3xl border border-white/10">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[10px] font-black opacity-40 uppercase tracking-widest">Atletas Confirmados ({guestList.length})</h3>
              {!hasDrawn && guestList.length >= 2 && (
                <button onClick={handleSortear} className="text-[10px] text-cyan-electric font-black underline uppercase">Sortear Times</button>
              )}
            </div>
            
            {hasDrawn ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {teams.map(team => (
                    <div key={team.id} className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <p className="text-[9px] font-black text-cyan-electric mb-3 uppercase italic border-b border-cyan-electric/20 pb-1">{team.name}</p>
                      <div className="space-y-1.5">
                        {team.players.map((p, i) => (
                          <p key={i} className="text-[10px] font-bold flex items-center gap-2">
                            <span className={p.role === 'goleiro' ? 'text-yellow-500' : 'text-cyan-electric opacity-50'}>
                              {p.role === 'goleiro' ? '🧤' : '•'}
                            </span>
                            {p.name}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => navigate('/visitor-match')} 
                  className="w-full bg-green-500 text-black py-4 rounded-2xl font-black uppercase text-xs"
                >
                  <Play size={14} className="inline mr-2 fill-black"/> Iniciar Partida
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {guestList.map(p => (
                  <div key={p.id} className="bg-white/5 px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase">{p.player.name}</span>
                    <button onClick={() => setGuestList(guestList.filter(item => item.id !== p.id))} className="text-[8px] opacity-30">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/10 p-4 flex justify-around items-center z-50">
        <button onClick={() => navigate('/home')} className="text-cyan-electric flex flex-col items-center gap-1">
          <Clock size={18}/><span className="text-[8px] font-black">INÍCIO</span>
        </button>
        <button onClick={() => navigate('/rankings')} className="opacity-40 flex flex-col items-center gap-1">
          <Trophy size={18}/><span className="text-[8px] font-black">RANKING</span>
        </button>
        <button onClick={() => navigate('/financial')} className="opacity-40 flex flex-col items-center gap-1">
          <DollarSign size={18}/><span className="text-[8px] font-black">CAIXA</span>
        </button>
        <button onClick={() => navigate('/profile')} className="opacity-40 flex flex-col items-center gap-1">
          <Users size={18}/><span className="text-[8px] font-black">PERFIL</span>
        </button>
      </nav>
    </div>
  );
};

export default HomePage;
