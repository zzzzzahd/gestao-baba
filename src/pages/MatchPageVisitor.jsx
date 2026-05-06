// src/pages/MatchPageVisitor.jsx
// Sprint 9.3: Adiciona Realtime para visitantes verem o placar ao vivo
// quando um match_id está disponível no localStorage (set pelo presidente).

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import { supabase } from '../services/supabase';

const MatchPageVisitor = () => {
  const navigate = useNavigate();

  const [allTeams,     setAllTeams]     = useState([]);
  const [currentMatch, setCurrentMatch] = useState(null);
  const [timer,        setTimer]        = useState(600);
  const [isActive,     setIsActive]     = useState(false);
  const [confirmExit,  setConfirmExit]  = useState(false);
  const [reserves,     setReserves]     = useState([]);

  // Sprint 9.3: match_id do localStorage (gravado pelo StepMatch quando presidente inicia)
  const [realtimeMatchId, setRealtimeMatchId] = useState(null);
  const [isRealtime,      setIsRealtime]      = useState(false);

  // ── Carregar times e tentar Realtime ──────────────────────────────────────
  useEffect(() => {
    const savedTeams    = localStorage.getItem('temp_teams');
    const savedReserves = localStorage.getItem('temp_reserves');
    const savedMatchId  = localStorage.getItem('temp_match_id'); // Sprint 9.3

    if (savedMatchId) {
      setRealtimeMatchId(savedMatchId);
      setIsRealtime(true);
    }

    if (savedTeams) {
      try {
        const parsedTeams = JSON.parse(savedTeams);
        setAllTeams(parsedTeams);
        if (savedReserves) setReserves(JSON.parse(savedReserves));
        if (parsedTeams.length >= 2) {
          setCurrentMatch({
            teamA: parsedTeams[0], teamB: parsedTeams[1], scoreA: 0, scoreB: 0,
          });
        } else {
          toast.error('Número insuficiente de times.');
          navigate('/visitor');
        }
      } catch (e) {
        console.error('Erro ao carregar dados:', e);
        localStorage.removeItem('temp_teams');
        navigate('/visitor');
      }
    } else {
      toast.error('Nenhum time encontrado!');
      navigate('/visitor');
    }
  }, [navigate]);

  // ── Sprint 9.3: Refresh placar do banco ──────────────────────────────────
  const refreshFromDB = useCallback(async () => {
    if (!realtimeMatchId) return;
    try {
      const { data: mp } = await supabase
        .from('match_players')
        .select('team, goals')
        .eq('match_id', realtimeMatchId);

      if (!mp) return;
      const scoreA = mp.filter(p => p.team === 'A').reduce((s, p) => s + (p.goals || 0), 0);
      const scoreB = mp.filter(p => p.team === 'B').reduce((s, p) => s + (p.goals || 0), 0);
      setCurrentMatch(prev => prev ? { ...prev, scoreA, scoreB } : prev);
    } catch (err) {
      console.error('[MatchPageVisitor] refreshFromDB:', err);
    }
  }, [realtimeMatchId]);

  // ── Sprint 9.3: Subscription Realtime ────────────────────────────────────
  useEffect(() => {
    if (!realtimeMatchId) return;

    // Busca estado inicial
    refreshFromDB();

    const channel = supabase
      .channel(`visitor:match:${realtimeMatchId}`)
      .on(
        'postgres_changes',
        {
          event:  '*',
          schema: 'public',
          table:  'match_players',
          filter: `match_id=eq.${realtimeMatchId}`,
        },
        () => refreshFromDB()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [realtimeMatchId, refreshFromDB]);

  // ── Timer (só quando não há Realtime — modo offline) ─────────────────────
  useEffect(() => {
    if (isRealtime) return; // Realtime ativo: não usa timer local
    let interval = null;
    if (isActive && timer > 0) {
      interval = setInterval(() => setTimer(prev => prev - 1), 1000);
    } else if (timer === 0) {
      setIsActive(false);
      handleMatchEnd();
    }
    return () => clearInterval(interval);
  }, [isActive, timer, isRealtime]);

  // ── Auto-fim por placar (só offline) ─────────────────────────────────────
  useEffect(() => {
    if (isRealtime) return;
    if (currentMatch && (currentMatch.scoreA >= 2 || currentMatch.scoreB >= 2)) {
      setIsActive(false);
      handleMatchEnd();
    }
  }, [currentMatch?.scoreA, currentMatch?.scoreB, isRealtime]);

  const handleMatchEnd = () => {
    if (!currentMatch) return;
    const { scoreA, scoreB, teamA, teamB } = currentMatch;
    let winner = null;
    let queue  = [...allTeams];

    if (scoreA > scoreB) {
      winner = 'A'; toast.success(`${teamA.name} VENCEU!`);
    } else if (scoreB > scoreA) {
      winner = 'B'; toast.success(`${teamB.name} VENCEU!`);
    } else {
      toast.error('EMPATE! Saem os dois times.');
    }

    if (winner === 'A') { const l = queue.splice(1, 1)[0]; queue.push(l); }
    else if (winner === 'B') { const l = queue.splice(0, 1)[0]; queue.push(l); }
    else { const t1 = queue.shift(); const t2 = queue.shift(); queue.push(t1, t2); }

    if (queue.length < 2) {
      toast.success('Fim das partidas!');
      localStorage.removeItem('temp_teams');
      localStorage.removeItem('temp_reserves');
      localStorage.removeItem('temp_match_id');
      setTimeout(() => navigate('/visitor'), 2000);
      return;
    }

    setAllTeams(queue);
    localStorage.setItem('temp_teams', JSON.stringify(queue));
    setTimer(600);
    setCurrentMatch({ teamA: queue[0], teamB: queue[1], scoreA: 0, scoreB: 0 });
  };

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!currentMatch) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-text-muted uppercase font-black italic">
        Carregando Partida...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-5 font-sans pb-20">
      <div className="max-w-md mx-auto space-y-6">

        {/* Header */}
        <div className="flex justify-between items-center text-[10px] font-black opacity-40">
          <button onClick={() => setConfirmExit(true)} className="hover:text-cyan-electric transition-colors">
            ← SAIR
          </button>
          <div className="flex items-center gap-2">
            {isRealtime && (
              <span className="flex items-center gap-1 text-green-400 opacity-100">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                AO VIVO
              </span>
            )}
            <span className="text-yellow-500 italic tracking-widest">
              {isRealtime ? 'PLACAR SINCRONIZADO' : 'MODO VISITANTE (OFFLINE)'}
            </span>
          </div>
        </div>

        {/* Placar Principal */}
        <div className="card-glass p-8 border border-border-mid text-center relative overflow-hidden rounded-[2.5rem]">
          <div className={`text-7xl font-black mb-6 font-mono tabular-nums tracking-tighter transition-colors ${
            timer < 60 && !isRealtime ? 'text-red-500' : 'text-white'
          }`}>
            {isRealtime ? '🔴 AO VIVO' : formatTime(timer)}
          </div>

          <div className="flex justify-between items-center gap-4">
            <div className="flex-1">
              <p className="text-[10px] font-black mb-2 text-cyan-electric uppercase truncate tracking-tighter">
                {currentMatch.teamA.name}
              </p>
              {/* Sprint 9.3: visitante NÃO incrementa manualmente se Realtime ativo */}
              <button
                onClick={() => !isRealtime && setCurrentMatch({...currentMatch, scoreA: currentMatch.scoreA + 1})}
                disabled={isRealtime}
                className={`text-6xl font-black w-full py-6 bg-surface-2 rounded-3xl border border-border-mid transition-all shadow-inner ${
                  isRealtime ? 'cursor-default' : 'hover:bg-surface-3 active:scale-90'
                }`}
              >
                {currentMatch.scoreA}
              </button>
            </div>

            <div className="text-xl font-black opacity-10 italic mt-6">VS</div>

            <div className="flex-1">
              <p className="text-[10px] font-black mb-2 text-yellow-500 uppercase truncate tracking-tighter">
                {currentMatch.teamB.name}
              </p>
              <button
                onClick={() => !isRealtime && setCurrentMatch({...currentMatch, scoreB: currentMatch.scoreB + 1})}
                disabled={isRealtime}
                className={`text-6xl font-black w-full py-6 bg-surface-2 rounded-3xl border border-border-mid transition-all shadow-inner ${
                  isRealtime ? 'cursor-default' : 'hover:bg-surface-3 active:scale-90'
                }`}
              >
                {currentMatch.scoreB}
              </button>
            </div>
          </div>

          {!isRealtime && (
            <>
              <button
                onClick={() => setIsActive(!isActive)}
                className={`mt-10 w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[4px] transition-all ${
                  isActive
                    ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                    : 'bg-cyan-electric text-black shadow-[0_0_20px_rgba(0,242,255,0.2)]'
                }`}
              >
                {isActive ? '⏸ PAUSAR JOGO' : '▶ INICIAR JOGO'}
              </button>
              <button
                onClick={handleMatchEnd}
                className="mt-3 w-full py-3 bg-surface-2 border border-border-mid rounded-xl font-black text-xs uppercase tracking-widest text-text-mid hover:text-white hover:bg-surface-3 transition-all"
              >
                Finalizar Partida
              </button>
            </>
          )}

          {isRealtime && (
            <p className="mt-6 text-[9px] text-green-400/60 font-black uppercase tracking-widest">
              Placar atualizado em tempo real pelo organizador
            </p>
          )}
        </div>

        {/* Reservas */}
        {reserves.length > 0 && (
          <div className="card-glass p-4 border border-yellow-500/20 rounded-2xl bg-yellow-500/5">
            <p className="text-[10px] font-black text-yellow-500 mb-2 uppercase tracking-widest">Reservas:</p>
            <div className="flex flex-wrap gap-2">
              {reserves.map((player, i) => (
                <span key={i} className="text-[9px] font-bold bg-surface-3 px-2 py-1 rounded border border-border-subtle opacity-70">
                  {player.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Times em campo */}
        <div className="card-glass p-4 border border-border-subtle rounded-2xl">
          <p className="text-[10px] font-black opacity-40 mb-3 uppercase tracking-widest">Jogando Agora:</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-black text-cyan-electric mb-2">{currentMatch.teamA.name}</p>
              <div className="space-y-1">
                {currentMatch.teamA.players?.map((player, i) => (
                  <div key={i} className="text-[10px] opacity-60 flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${player.position === 'goleiro' ? 'bg-green-500' : 'bg-cyan-electric'}`} />
                    {player.name}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-black text-yellow-500 mb-2">{currentMatch.teamB.name}</p>
              <div className="space-y-1">
                {currentMatch.teamB.players?.map((player, i) => (
                  <div key={i} className="text-[10px] opacity-60 flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${player.position === 'goleiro' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                    {player.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Fila */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-black opacity-30 italic px-2 uppercase tracking-[0.2em]">
            Próximo na Fila:
          </h3>
          {allTeams.length > 2 ? (
            <div className="bg-surface-2 p-5 rounded-[1.5rem] border border-border-subtle flex justify-between items-center">
              <span className="font-black text-sm text-cyan-electric italic uppercase">{allTeams[2].name}</span>
              {allTeams[2].players.length < 5 && (
                <span className="text-[7px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-black animate-pulse">
                  PRECISA DE SUPLENTE
                </span>
              )}
            </div>
          ) : (
            <p className="text-[10px] opacity-20 text-center uppercase font-black py-4 border border-dashed border-border-mid rounded-2xl">
              Apenas dois times em campo
            </p>
          )}
        </div>

        {/* Escalações gerais */}
        <div className="space-y-4 pt-4 border-t border-border-subtle">
          <h3 className="text-[10px] font-black opacity-30 italic px-2 uppercase tracking-[0.2em]">
            Escalações Gerais:
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {allTeams.map((team, idx) => (
              <div key={idx} className="card-glass p-5 rounded-[2rem] border border-border-subtle">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-black uppercase text-text-high italic">{team.name}</span>
                  <div className="flex gap-2">
                    {team.players.length < 5 && (
                      <span className="text-[7px] text-yellow-500 font-black border border-yellow-500/30 px-2 py-1 rounded">SUB NECESSÁRIO</span>
                    )}
                    <span className="text-[8px] font-bold opacity-30 tracking-widest uppercase">
                      {idx === 0 || idx === 1 ? 'Em Campo' : 'Na Fila'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {team.players.map((p, i) => (
                    <div key={i} className="flex items-center gap-1 bg-surface-2 px-2 py-1 rounded-lg border border-border-subtle">
                      <div className={`w-1 h-1 rounded-full ${p.position === 'goleiro' ? 'bg-green-500' : 'bg-surface-3'}`} />
                      <span className="text-[9px] font-bold uppercase opacity-60 tracking-tighter">{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center text-[9px] opacity-20 uppercase font-black tracking-wider pt-6 pb-10">
          <p>Regras: 2 Gols ou 10 Minutos</p>
          <p className="mt-1">Quem Ganha Fica • Empate Sai os Dois</p>
        </div>
      </div>

      <ConfirmModal
        open={confirmExit}
        message="Sair da partida?"
        description="O progresso desta partida será perdido e você voltará para o modo visitante."
        confirmLabel="Sair"
        danger
        onConfirm={() => {
          localStorage.removeItem('temp_teams');
          localStorage.removeItem('temp_reserves');
          localStorage.removeItem('temp_match_id');
          navigate('/visitor');
        }}
        onCancel={() => setConfirmExit(false)}
      />
    </div>
  );
};

export default MatchPageVisitor;
