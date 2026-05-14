// src/pages/TournamentPage.jsx
// Modo Torneio / Mata-mata — criar, sortear chaveamento e registrar resultados.

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate }   from 'react-router-dom';
import { ArrowLeft, Trophy, Plus, Play, CheckCircle, Users, ChevronRight } from 'lucide-react';
import { useBaba }       from '../contexts/BabaContext';
import { supabase }      from '../services/supabase';
import toast             from 'react-hot-toast';

// ── Mini componente: card de partida do chaveamento ───────────────────────────
const MatchCard = ({ match, onResult, canEdit }) => {
  const [scoreA, setScoreA] = useState(match.score_a ?? 0);
  const [scoreB, setScoreB] = useState(match.score_b ?? 0);
  const [saving, setSaving] = useState(false);

  const done    = match.status === 'finished';
  const hasBye  = match.team_b === 'BYE' || match.team_a === 'BYE';

  const handleSave = async () => {
    if (scoreA === scoreB) { toast.error('Empate não é permitido em mata-mata'); return; }
    setSaving(true);
    const { data, error } = await supabase.rpc('record_tournament_result', {
      p_match_id: match.id, p_score_a: scoreA, p_score_b: scoreB,
    });
    setSaving(false);
    if (error || data?.error) { toast.error(data?.error ?? error?.message); return; }
    toast.success(`Vencedor: ${data.winner}`);
    onResult?.();
  };

  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${
      done ? 'bg-surface-1 border-border-subtle opacity-80'
           : hasBye ? 'bg-surface-1 border-border-subtle'
           : 'bg-surface-2 border-border-mid'
    }`}>
      {/* Time A */}
      <div className="flex items-center justify-between">
        <span className={`text-[11px] font-black ${match.winner === match.team_a ? 'text-cyan-electric' : 'text-white'}`}>
          {match.team_a ?? 'A definir'} {match.winner === match.team_a && '🏆'}
        </span>
        {!done && !hasBye && canEdit && (
          <div className="flex items-center gap-1">
            <button onClick={() => setScoreA(Math.max(0, scoreA - 1))} className="w-6 h-6 rounded-lg bg-surface-3 text-white text-xs font-black">−</button>
            <span className="w-5 text-center text-sm font-black tabular-nums">{scoreA}</span>
            <button onClick={() => setScoreA(scoreA + 1)} className="w-6 h-6 rounded-lg bg-surface-3 text-white text-xs font-black">+</button>
          </div>
        )}
        {done && <span className="text-lg font-black tabular-nums text-white">{match.score_a}</span>}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-border-subtle" />
        <span className="text-[9px] text-text-muted font-black uppercase">vs</span>
        <div className="flex-1 h-px bg-border-subtle" />
      </div>

      {/* Time B */}
      <div className="flex items-center justify-between">
        <span className={`text-[11px] font-black ${match.winner === match.team_b ? 'text-cyan-electric' : 'text-white'}`}>
          {match.team_b ?? 'A definir'} {match.winner === match.team_b && '🏆'}
        </span>
        {!done && !hasBye && canEdit && (
          <div className="flex items-center gap-1">
            <button onClick={() => setScoreB(Math.max(0, scoreB - 1))} className="w-6 h-6 rounded-lg bg-surface-3 text-white text-xs font-black">−</button>
            <span className="w-5 text-center text-sm font-black tabular-nums">{scoreB}</span>
            <button onClick={() => setScoreB(scoreB + 1)} className="w-6 h-6 rounded-lg bg-surface-3 text-white text-xs font-black">+</button>
          </div>
        )}
        {done && <span className="text-lg font-black tabular-nums text-white">{match.score_b}</span>}
      </div>

      {/* Botão salvar */}
      {!done && !hasBye && canEdit && (
        <button
          onClick={handleSave}
          disabled={saving}
          aria-busy={saving}
          className="w-full py-2 rounded-xl bg-cyan-electric/10 border border-cyan-electric/20 text-cyan-electric text-[9px] font-black uppercase tracking-widest hover:bg-cyan-electric/20 transition-all disabled:opacity-40"
        >
          {saving ? 'Salvando…' : 'Confirmar resultado'}
        </button>
      )}
    </div>
  );
};

// ─── Página principal ─────────────────────────────────────────────────────────
export default function TournamentPage() {
  const navigate               = useNavigate();
  const { currentBaba, players, isPresident } = useBaba();
  const [tournaments, setTournaments] = useState([]);
  const [active,      setActive]      = useState(null); // torneio ativo selecionado
  const [matches,     setMatches]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [creating,    setCreating]    = useState(false);
  const [newName,     setNewName]     = useState('');
  const [selTeams,    setSelTeams]    = useState([]); // times selecionados (nomes)
  const [teamInput,   setTeamInput]   = useState('');

  const loadTournaments = useCallback(async () => {
    if (!currentBaba?.id) return;
    const { data } = await supabase
      .from('tournaments')
      .select('*')
      .eq('baba_id', currentBaba.id)
      .order('created_at', { ascending: false });
    setTournaments(data ?? []);
    if (data?.[0] && data[0].status !== 'finished') {
      setActive(data[0]);
    }
    setLoading(false);
  }, [currentBaba?.id]);

  const loadMatches = useCallback(async () => {
    if (!active?.id) return;
    const { data } = await supabase
      .from('tournament_matches')
      .select('*')
      .eq('tournament_id', active.id)
      .order('round').order('position');
    setMatches(data ?? []);
  }, [active?.id]);

  useEffect(() => { loadTournaments(); }, [loadTournaments]);
  useEffect(() => { loadMatches(); }, [loadMatches]);

  const handleCreate = async () => {
    if (!newName.trim() || selTeams.length < 2) {
      toast.error('Nome e pelo menos 2 times são obrigatórios');
      return;
    }
    const { data, error } = await supabase.from('tournaments').insert({
      baba_id:    currentBaba.id,
      name:       newName.trim(),
      teams:      selTeams.map(n => ({ name: n })),
      created_by: (await supabase.auth.getUser()).data.user?.id,
    }).select().single();
    if (error) { toast.error('Erro ao criar torneio'); return; }
    toast.success('Torneio criado!');
    setCreating(false);
    setNewName('');
    setSelTeams([]);
    await loadTournaments();
    setActive(data);
  };

  const handleGenerateBracket = async () => {
    if (!active?.id) return;
    const { data, error } = await supabase.rpc('generate_bracket', { p_tournament_id: active.id });
    if (error || data?.error) { toast.error(data?.error ?? error?.message); return; }
    toast.success(`Chaveamento gerado! ${data.rounds} rodada(s).`);
    await loadTournaments();
    await loadMatches();
  };

  // Agrupar partidas por rodada
  const byRound = matches.reduce((acc, m) => {
    acc[m.round] = acc[m.round] ?? [];
    acc[m.round].push(m);
    return acc;
  }, {});
  const roundLabels = { 1: 'Fase inicial', 2: 'Quartas', 3: 'Semi', 4: 'Final' };

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-cyan-electric border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white px-5 pt-6 pb-28 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label="Voltar" className="p-2 rounded-xl bg-surface-2 border border-border-mid text-text-low hover:text-white transition-colors">
          <ArrowLeft size={16} aria-hidden="true" />
        </button>
        <div className="flex-1">
          <h1 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
            <Trophy size={14} className="text-cyan-electric" aria-hidden="true" /> Torneio
          </h1>
          <p className="text-[9px] text-text-low font-black uppercase">{currentBaba?.name}</p>
        </div>
        {isPresident && !creating && (
          <button
            onClick={() => setCreating(true)}
            aria-label="Criar torneio"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-electric/10 border border-cyan-electric/20 text-cyan-electric text-[9px] font-black uppercase"
          >
            <Plus size={12} aria-hidden="true" /> Novo
          </button>
        )}
      </div>

      {/* Formulário de criação */}
      {creating && (
        <div className="bg-surface-1 border border-border-mid rounded-3xl p-5 space-y-4">
          <h2 className="text-[11px] font-black uppercase text-white">Novo Torneio</h2>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Nome do torneio (ex: Copa Verão)"
            className="w-full bg-surface-2 border border-border-mid rounded-xl px-4 py-2.5 text-[12px] text-white"
            aria-label="Nome do torneio"
          />
          <div className="flex gap-2">
            <input
              value={teamInput}
              onChange={e => setTeamInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && teamInput.trim()) { setSelTeams(t => [...t, teamInput.trim()]); setTeamInput(''); } }}
              placeholder="Nome do time → Enter para adicionar"
              className="flex-1 bg-surface-2 border border-border-mid rounded-xl px-3 py-2 text-[12px] text-white"
              aria-label="Adicionar time"
            />
            <button
              onClick={() => { if (teamInput.trim()) { setSelTeams(t => [...t, teamInput.trim()]); setTeamInput(''); } }}
              className="px-3 py-2 rounded-xl bg-surface-3 border border-border-mid text-text-low hover:text-white"
              aria-label="Adicionar"
            >
              <Plus size={14} aria-hidden="true" />
            </button>
          </div>
          {selTeams.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selTeams.map((t, i) => (
                <span key={i} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-2 border border-border-mid text-[10px] font-black text-white">
                  {t}
                  <button onClick={() => setSelTeams(ts => ts.filter((_, j) => j !== i))} aria-label={`Remover ${t}`} className="text-text-muted hover:text-red-400">×</button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => setCreating(false)} className="flex-1 py-2.5 rounded-2xl bg-surface-2 border border-border-mid text-text-low text-[10px] font-black uppercase">Cancelar</button>
            <button onClick={handleCreate} className="flex-1 py-2.5 rounded-2xl bg-cyan-electric/10 border border-cyan-electric/20 text-cyan-electric text-[10px] font-black uppercase">Criar</button>
          </div>
        </div>
      )}

      {/* Torneio ativo */}
      {active && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-white">{active.name}</h2>
              <p className="text-[9px] text-text-low font-black uppercase mt-0.5">
                {active.status === 'finished' ? `🏆 Campeão: ${active.champion}` : `${active.teams?.length ?? 0} times · ${active.format}`}
              </p>
            </div>
            {active.status === 'draft' && isPresident && (
              <button
                onClick={handleGenerateBracket}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-[9px] font-black uppercase"
              >
                <Play size={12} aria-hidden="true" /> Iniciar
              </button>
            )}
          </div>

          {/* Chaveamento por rodada */}
          {Object.entries(byRound).map(([round, rMatches]) => (
            <div key={round} className="space-y-2">
              <p className="text-[9px] font-black uppercase text-text-low tracking-widest px-1">
                {roundLabels[Number(round)] ?? `Rodada ${round}`}
              </p>
              <div className="space-y-2">
                {rMatches.map(m => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    canEdit={isPresident && active.status === 'active'}
                    onResult={() => { loadMatches(); loadTournaments(); }}
                  />
                ))}
              </div>
            </div>
          ))}

          {matches.length === 0 && active.status === 'draft' && (
            <div className="text-center py-8 text-text-muted text-[11px]">
              {isPresident ? 'Clique em Iniciar para gerar o chaveamento.' : 'Aguardando o presidente iniciar o torneio.'}
            </div>
          )}
        </div>
      )}

      {/* Lista de torneios anteriores */}
      {tournaments.filter(t => t.id !== active?.id).length > 0 && (
        <div className="space-y-2">
          <p className="text-[9px] font-black uppercase text-text-low tracking-widest">Anteriores</p>
          {tournaments.filter(t => t.id !== active?.id).map(t => (
            <button
              key={t.id}
              onClick={() => { setActive(t); loadMatches(); }}
              className="w-full flex items-center justify-between p-4 bg-surface-1 border border-border-subtle rounded-2xl hover:bg-surface-2 transition-colors"
            >
              <div className="text-left">
                <p className="text-[11px] font-black text-white">{t.name}</p>
                {t.champion && <p className="text-[9px] text-yellow-400 font-black">🏆 {t.champion}</p>}
              </div>
              <ChevronRight size={14} className="text-text-muted" aria-hidden="true" />
            </button>
          ))}
        </div>
      )}

      {!active && !creating && tournaments.length === 0 && (
        <div className="text-center py-16 text-text-muted">
          <Trophy size={32} className="mx-auto mb-3 opacity-20" aria-hidden="true" />
          <p className="text-[11px] font-black uppercase">Nenhum torneio ainda</p>
          {isPresident && <p className="text-[10px] mt-1">Clique em Novo para criar</p>}
        </div>
      )}
    </div>
  );
}
