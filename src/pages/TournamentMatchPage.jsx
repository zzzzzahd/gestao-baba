// src/pages/TournamentMatchPage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { advanceWinner } from '../services/tournamentService';
import { ChevronLeft, Plus, Minus, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TournamentMatchPage() {
  const { id: tournamentId, matchId } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [teamA, setTeamA] = useState(null);
  const [teamB, setTeamB] = useState(null);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [stats, setStats] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data: m } = await supabase.from('tournament_matches').select('*').eq('id', matchId).single();
    if (!m) return;
    setMatch(m);
    setScoreA(m.score_a ?? 0);
    setScoreB(m.score_b ?? 0);
    if (m.team_a_id) {
      const { data } = await supabase.from('tournament_teams').select('*').eq('id', m.team_a_id).single();
      setTeamA(data);
    }
    if (m.team_b_id) {
      const { data } = await supabase.from('tournament_teams').select('*').eq('id', m.team_b_id).single();
      setTeamB(data);
    }
    const { data: existing } = await supabase
      .from('tournament_player_stats').select('*').eq('match_id', matchId);
    setStats(existing || []);
  }, [matchId]);

  useEffect(() => { load(); }, [load]);

  function addPlayer(teamId) {
    const name = prompt('Nome do jogador:');
    if (!name?.trim()) return;
    setStats(s => [...s, {
      team_id: teamId, player_name: name.trim(),
      goals: 0, assists: 0, yellow_cards: 0, red_cards: 0, fouls: 0,
    }]);
  }

  function bump(idx, field, delta) {
    setStats(s => s.map((p, i) => i === idx ? { ...p, [field]: Math.max(0, p[field] + delta) } : p));
  }

  async function save() {
    if (!match) return;
    setSaving(true);
    try {
      const winner_team_id = scoreA > scoreB ? match.team_a_id
                          : scoreB > scoreA ? match.team_b_id
                          : null;

      const { error: e1 } = await supabase.from('tournament_matches').update({
        score_a: scoreA, score_b: scoreB, winner_team_id,
        status: 'finished', updated_at: new Date().toISOString(),
      }).eq('id', matchId);
      if (e1) throw e1;

      await supabase.from('tournament_player_stats').delete().eq('match_id', matchId);
      if (stats.length) {
        const rows = stats.map(p => ({
          team_id: p.team_id,
          player_name: p.player_name,
          goals: p.goals,
          assists: p.assists,
          yellow_cards: p.yellow_cards,
          red_cards: p.red_cards,
          fouls: p.fouls,
          tournament_id: tournamentId,
          match_id: matchId,
        }));
        const { error: e2 } = await supabase.from('tournament_player_stats').insert(rows);
        if (e2) throw e2;
      }

      if (winner_team_id) {
        await advanceWinner(tournamentId, match, winner_team_id);
      }

      toast.success('Partida salva!');
      navigate(-1);
    } catch (err) {
      toast.error('Erro: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-cyan-electric border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statsA = stats.map((s, i) => ({ ...s, i })).filter(s => s.team_id === match.team_a_id);
  const statsB = stats.map((s, i) => ({ ...s, i })).filter(s => s.team_id === match.team_b_id);

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      <header className="flex items-center gap-3 p-5 border-b border-border-subtle">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-surface-2 border border-border-mid text-text-low" aria-label="Voltar">
          <ChevronLeft size={18} />
        </button>
        <h1 className="font-black uppercase text-sm tracking-widest flex-1">Registrar partida</h1>
        <button onClick={save} disabled={saving}
          className="bg-yellow-400 text-black px-4 py-2 rounded-xl font-black text-[10px] uppercase flex items-center gap-1 disabled:opacity-50">
          <Save size={14} /> {saving ? '...' : 'Salvar'}
        </button>
      </header>

      <section className="p-5 bg-surface-1 border-b border-border-subtle flex items-center justify-around">
        <ScoreBox name={teamA?.name} value={scoreA} setValue={setScoreA} />
        <span className="text-2xl font-black text-text-muted">×</span>
        <ScoreBox name={teamB?.name} value={scoreB} setValue={setScoreB} />
      </section>

      <section className="p-5 space-y-4">
        <TeamStats title={teamA?.name} stats={statsA} bump={bump}
          onAdd={() => addPlayer(match.team_a_id)} />
        <TeamStats title={teamB?.name} stats={statsB} bump={bump}
          onAdd={() => addPlayer(match.team_b_id)} />
      </section>
    </div>
  );
}

function ScoreBox({ name, value, setValue }) {
  return (
    <div className="text-center">
      <div className="text-[10px] font-black uppercase text-text-low mb-2 max-w-[120px] truncate">{name || '—'}</div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setValue(Math.max(0, value - 1))}
          className="w-9 h-9 rounded-xl bg-surface-2 border border-border-mid flex items-center justify-center">
          <Minus size={16} />
        </button>
        <span className="text-4xl font-black tabular-nums w-12 text-center">{value}</span>
        <button type="button" onClick={() => setValue(value + 1)}
          className="w-9 h-9 rounded-xl bg-surface-2 border border-border-mid flex items-center justify-center">
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

function TeamStats({ title, stats, bump, onAdd }) {
  const fields = [
    { k: 'goals', label: '⚽' },
    { k: 'assists', label: '🎯' },
    { k: 'yellow_cards', label: '🟨' },
    { k: 'red_cards', label: '🟥' },
    { k: 'fouls', label: '🚫' },
  ];
  return (
    <div className="bg-surface-1 border border-border-subtle rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-black uppercase text-xs">{title}</h3>
        <button type="button" onClick={onAdd} className="text-yellow-400 text-[10px] font-black uppercase flex items-center gap-1">
          <Plus size={14} /> jogador
        </button>
      </div>
      {stats.length === 0 && <p className="text-text-muted text-sm">Nenhum jogador adicionado.</p>}
      <ul className="space-y-2">
        {stats.map(p => (
          <li key={p.i} className="bg-surface-2 border border-border-subtle rounded-xl p-3">
            <div className="font-black text-sm mb-2">{p.player_name}</div>
            <div className="grid grid-cols-5 gap-1">
              {fields.map(f => (
                <div key={f.k} className="flex flex-col items-center">
                  <span className="text-xs">{f.label}</span>
                  <div className="flex items-center gap-0.5 mt-1">
                    <button type="button" onClick={() => bump(p.i, f.k, -1)}
                      className="w-5 h-5 rounded bg-surface-3 text-xs font-black">−</button>
                    <span className="text-sm w-4 text-center font-black tabular-nums">{p[f.k]}</span>
                    <button type="button" onClick={() => bump(p.i, f.k, 1)}
                      className="w-5 h-5 rounded bg-surface-3 text-xs font-black">+</button>
                  </div>
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
