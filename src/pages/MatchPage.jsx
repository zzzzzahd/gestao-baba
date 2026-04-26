import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBaba } from '../contexts/BabaContext';
import { supabase } from '../services/supabase';
import { X, Target, UserPlus } from 'lucide-react';
import WinnerPhotoModal from '../components/WinnerPhotoModal';
import toast from 'react-hot-toast';

const MatchPage = () => {
  const navigate = useNavigate();
  const { currentBaba } = useBaba();

  const [allTeams,     setAllTeams]     = useState([]);
  const [currentMatch, setCurrentMatch] = useState(null);
  const [timer,        setTimer]        = useState(600);
  const [isActive,     setIsActive]     = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [showGoalModal,   setShowGoalModal]   = useState(false);
  const [goalTeam,        setGoalTeam]        = useState(null);
  const [selectedScorer,  setSelectedScorer]  = useState('');
  const [selectedAssist,  setSelectedAssist]  = useState('');
  const [matchId,         setMatchId]         = useState(null);
  const [showWinnerPhoto, setShowWinnerPhoto] = useState(false);
  const [winnerInfo,      setWinnerInfo]      = useState({ name: '', matchId: null });
  const [pendingQueue,    setPendingQueue]    = useState([]);

  useEffect(() => {
    const loadTeams = async () => {
      if (!currentBaba) return;
      try {
        setLoading(true);
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
          .from('draw_results').select('*')
          .eq('baba_id', currentBaba.id).eq('draw_date', today)
          .limit(1).maybeSingle();
        if (error) throw error;
        if (data?.teams?.length >= 2) {
          setAllTeams(data.teams);
          setCurrentMatch({ teamA: data.teams[0], teamB: data.teams[1], scoreA: 0, scoreB: 0 });
          await loadOrCreateMatch(data.teams[0], data.teams[1]);
        } else {
          toast.error('Nenhum sorteio encontrado!');
          navigate('/teams');
        }
      } catch (err) {
        console.error(err);
        toast.error('Erro ao carregar times!');
        navigate('/teams');
      } finally { setLoading(false); }
    };
    loadTeams();
  }, [currentBaba, navigate]);

  const loadOrCreateMatch = async (teamA, teamB) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: ex } = await supabase.from('matches').select('id')
        .eq('baba_id', currentBaba.id)
        .gte('match_date', `${today}T00:00:00`).lte('match_date', `${today}T23:59:59`)
        .eq('status', 'in_progress').limit(1).maybeSingle();

      let mid;
      if (ex) {
        mid = ex.id;
      } else {
        const gt      = currentBaba.game_time ? String(currentBaba.game_time).substring(0, 5) : '20:00';
        const { data: nm, error: ce } = await supabase.from('matches')
          .insert([{ baba_id: currentBaba.id, match_date: `${today}T${gt}:00`, team_a_name: teamA.name, team_b_name: teamB.name, status: 'in_progress' }])
          .select().single();
        if (ce) throw ce;
        mid = nm.id;
      }
      setMatchId(mid);

      const mps = [
        ...teamA.players.map(p => ({ match_id: mid, player_id: p.id, team: 'A', position: p.position || 'linha', goals: 0, assists: 0 })),
        ...teamB.players.map(p => ({ match_id: mid, player_id: p.id, team: 'B', position: p.position || 'linha', goals: 0, assists: 0 })),
      ];
      const { data: exPs } = await supabase.from('match_players').select('player_id').eq('match_id', mid);
      const exIds = (exPs || []).map(p => p.player_id);
      const newPs = mps.filter(mp => !exIds.includes(mp.player_id));
      if (newPs.length > 0) await supabase.from('match_players').insert(newPs);
    } catch (err) { console.error('Erro match:', err); }
  };

  useEffect(() => {
    let iv = null;
    if (isActive && timer > 0) { iv = setInterval(() => setTimer(p => p - 1), 1000); }
    else if (timer === 0) { setIsActive(false); handleMatchEnd(); }
    return () => clearInterval(iv);
  }, [isActive, timer]);

  useEffect(() => {
    if (currentMatch && (currentMatch.scoreA >= 2 || currentMatch.scoreB >= 2)) {
      setIsActive(false);
      handleMatchEnd();
    }
  }, [currentMatch?.scoreA, currentMatch?.scoreB]);

  const handleGoalClick = (team) => {
    setGoalTeam(team); setSelectedScorer(''); setSelectedAssist(''); setShowGoalModal(true);
  };

  const handleSaveGoal = async () => {
    if (!selectedScorer) { toast.error('Selecione quem fez o gol!'); return; }
    try {
      const { data: pd } = await supabase.from('match_players').select('goals,assists').eq('match_id', matchId).eq('player_id', selectedScorer).single();
      await supabase.from('match_players').update({ goals: (pd?.goals || 0) + 1 }).eq('match_id', matchId).eq('player_id', selectedScorer);
      if (selectedAssist) {
        const { data: ad } = await supabase.from('match_players').select('assists').eq('match_id', matchId).eq('player_id', selectedAssist).single();
        await supabase.from('match_players').update({ assists: (ad?.assists || 0) + 1 }).eq('match_id', matchId).eq('player_id', selectedAssist);
      }
      setCurrentMatch(prev => ({ ...prev, scoreA: goalTeam === 'A' ? prev.scoreA + 1 : prev.scoreA, scoreB: goalTeam === 'B' ? prev.scoreB + 1 : prev.scoreB }));
      setShowGoalModal(false);
      toast.success('Gol registrado!');
    } catch (err) { console.error(err); toast.error('Erro ao registrar gol'); }
  };

  const handleMatchEnd = async () => {
    if (!currentMatch) return;
    const { scoreA, scoreB, teamA, teamB } = currentMatch;
    let queue = [...allTeams];
    let winnerName = null;
    let winnerTeam = null;

    if (scoreA > scoreB)      { winnerName = teamA.name; winnerTeam = 'A'; toast.success(`${teamA.name} VENCEU!`); const l = queue.splice(1,1)[0]; queue.push(l); }
    else if (scoreB > scoreA) { winnerName = teamB.name; winnerTeam = 'B'; toast.success(`${teamB.name} VENCEU!`); const l = queue.splice(0,1)[0]; queue.push(l); }
    else                      { toast.error('EMPATE! Saem os dois times.'); const t1 = queue.shift(); const t2 = queue.shift(); queue.push(t1, t2); }

    if (matchId) {
      await supabase.from('matches').update({
        status: 'finished', winner_team: winnerTeam,
        team_a_score: scoreA, team_b_score: scoreB,
        finished_at: new Date().toISOString(),
      }).eq('id', matchId);
    }

    // FEAT-005: guardar fila pendente e abrir modal de foto
    setPendingQueue(queue);
    if (winnerName && matchId) {
      setWinnerInfo({ name: winnerName, matchId });
      setShowWinnerPhoto(true);
      return; // espera o modal fechar para continuar
    }

    continueAfterMatch(queue);
  };

  const continueAfterMatch = async (queue) => {
    if (queue.length < 2) { setTimeout(() => navigate('/teams'), 1500); return; }
    setAllTeams(queue);
    setTimer(600);
    setCurrentMatch({ teamA: queue[0], teamB: queue[1], scoreA: 0, scoreB: 0 });
    setMatchId(null);
    await loadOrCreateMatch(queue[0], queue[1]);
  };

  const handleWinnerPhotoClose = () => {
    setShowWinnerPhoto(false);
    continueAfterMatch(pendingQueue);
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  if (loading || !currentMatch) return (
    <div className="min-h-screen bg-black flex items-center justify-center text-white/20 uppercase font-black italic">
      Carregando Partida...
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white p-5 font-sans">
      <div className="max-w-md mx-auto space-y-6">

        <div className="flex justify-between items-center text-[10px] font-black opacity-40">
          <button onClick={() => navigate('/teams')} className="hover:text-cyan-electric transition-colors">← VER TIMES</button>
          <span className="text-cyan-electric italic tracking-widest">JOGO AO VIVO</span>
        </div>

        <div className="card-glass p-8 border border-white/10 text-center relative overflow-hidden rounded-[2.5rem]">
          <div className={`text-7xl font-black mb-6 font-mono tracking-tighter ${timer < 60 ? 'text-red-500' : 'text-white'}`}>
            {formatTime(timer)}
          </div>
          <div className="flex justify-between items-center gap-4">
            <div className="flex-1">
              <p className="text-[10px] font-black mb-2 text-cyan-electric uppercase truncate">{currentMatch.teamA.name}</p>
              <button onClick={() => handleGoalClick('A')} className="text-6xl font-black w-full py-6 bg-white/5 rounded-3xl border border-white/10 hover:bg-white/10 active:scale-90 transition-all">
                {currentMatch.scoreA}
              </button>
            </div>
            <div className="text-xl font-black opacity-10 italic mt-6">VS</div>
            <div className="flex-1">
              <p className="text-[10px] font-black mb-2 text-yellow-500 uppercase truncate">{currentMatch.teamB.name}</p>
              <button onClick={() => handleGoalClick('B')} className="text-6xl font-black w-full py-6 bg-white/5 rounded-3xl border border-white/10 hover:bg-white/10 active:scale-90 transition-all">
                {currentMatch.scoreB}
              </button>
            </div>
          </div>
          <button onClick={() => setIsActive(!isActive)} className={`mt-10 w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[4px] transition-all ${isActive ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-cyan-electric text-black'}`}>
            {isActive ? '⏸ PAUSAR JOGO' : '▶ INICIAR CRONÔMETRO'}
          </button>
          <button onClick={handleMatchEnd} className="mt-3 w-full py-3 bg-white/5 border border-white/10 rounded-xl font-black text-xs uppercase tracking-widest text-white/50 hover:text-white hover:bg-white/10 transition-all">
            Finalizar Partida
          </button>
        </div>

        <div className="card-glass p-4 border border-white/5 rounded-2xl">
          <p className="text-[10px] font-black opacity-40 mb-3 uppercase tracking-widest">Jogando Agora:</p>
          <div className="grid grid-cols-2 gap-4">
            {[{team: currentMatch.teamA, color: 'text-cyan-electric', dot: 'bg-cyan-electric'},{team: currentMatch.teamB, color: 'text-yellow-500', dot: 'bg-yellow-500'}].map(({team, color, dot}) => (
              <div key={team.name}>
                <p className={`text-xs font-black mb-2 ${color}`}>{team.name}</p>
                <div className="space-y-1">
                  {team.players?.map((p, i) => (
                    <div key={i} className="text-[10px] opacity-60 flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${p.position === 'goleiro' ? 'bg-green-500' : dot}`} />
                      {p.name}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-[10px] font-black opacity-30 italic px-2 uppercase tracking-[0.2em]">Próximo na Fila:</h3>
          {allTeams.length > 2
            ? <div className="bg-white/5 p-5 rounded-[1.5rem] border border-white/5 flex justify-between items-center"><span className="font-black text-sm text-cyan-electric italic uppercase">{allTeams[2].name}</span><span className="text-[8px] opacity-40 font-black uppercase bg-white/10 px-2 py-1 rounded">Aguardando</span></div>
            : <p className="text-[10px] opacity-20 text-center uppercase font-black py-4 border border-dashed border-white/10 rounded-2xl">Apenas dois times em campo</p>
          }
        </div>

        <div className="text-center text-[9px] opacity-20 uppercase font-black tracking-wider">
          <p>Regras: 2 Gols ou 10 Minutos · Quem Ganha Fica · Empate Sai os Dois</p>
        </div>
      </div>

      {showGoalModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d0d0d] border border-cyan-electric/30 rounded-3xl p-6 max-w-sm w-full space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Target className="text-cyan-electric" size={24} /><h3 className="text-xl font-black uppercase">GOL!</h3></div>
              <button onClick={() => setShowGoalModal(false)} className="text-white/40 hover:text-white"><X size={24} /></button>
            </div>
            <div className={`p-3 rounded-xl text-center font-black ${goalTeam === 'A' ? 'bg-cyan-electric/10 text-cyan-electric' : 'bg-yellow-500/10 text-yellow-500'}`}>
              {goalTeam === 'A' ? currentMatch.teamA.name : currentMatch.teamB.name}
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-white/60 mb-2">Quem fez o gol? *</label>
              <select value={selectedScorer} onChange={e => setSelectedScorer(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-cyan-electric">
                <option value="">Selecione...</option>
                {(goalTeam === 'A' ? currentMatch.teamA.players : currentMatch.teamB.players)?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-white/60 mb-2 flex items-center gap-2"><UserPlus size={14} /> Assistência (opcional)</label>
              <select value={selectedAssist} onChange={e => setSelectedAssist(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-cyan-electric">
                <option value="">Nenhuma</option>
                {(goalTeam === 'A' ? currentMatch.teamA.players : currentMatch.teamB.players)?.filter(p => p.id !== selectedScorer).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowGoalModal(false)} className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl font-black uppercase text-xs">Cancelar</button>
              <button onClick={handleSaveGoal} className="flex-1 py-3 bg-cyan-electric text-black rounded-xl font-black uppercase text-xs active:scale-95 transition-all">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      <WinnerPhotoModal
        isOpen={showWinnerPhoto}
        onClose={handleWinnerPhotoClose}
        matchId={winnerInfo.matchId}
        babaId={currentBaba?.id}
        winnerName={winnerInfo.name}
        onSaved={handleWinnerPhotoClose}
      />
    </div>
  );
};

export default MatchPage;
