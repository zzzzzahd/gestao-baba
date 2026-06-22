// src/pages/TournamentPage.jsx
// Torneio standalone — sem vínculo com baba. Times e jogadores cadastrados manualmente.

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { computeStandings } from '../utils/bracket';
import { Trophy, ChevronLeft, Play } from 'lucide-react';

export default function TournamentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tour, setTour] = useState(null);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [tab, setTab] = useState('bracket');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [{ data: t }, { data: ts }, { data: ms }, { data: rk }] = await Promise.all([
      supabase.from('tournaments').select('*').eq('id', id).single(),
      supabase.from('tournament_teams').select('*').eq('tournament_id', id).order('seed'),
      supabase.from('tournament_matches').select('*').eq('tournament_id', id).order('round').order('match_index'),
      supabase.from('tournament_rankings').select('*').eq('tournament_id', id),
    ]);
    setTour(t);
    setTeams(ts || []);
    setMatches(ms || []);
    setRanking(rk || []);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-cyan-electric border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="min-h-screen bg-black text-white p-8 text-center">
        <p className="text-text-low font-black uppercase text-sm">Torneio não encontrado</p>
        <button onClick={() => navigate('/home')} className="mt-4 text-cyan-electric text-sm font-black uppercase">
          Voltar ao início
        </button>
      </div>
    );
  }

  const teamById = Object.fromEntries(teams.map(t => [t.id, t]));
  const rounds = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b);
  const standings = tour.format === 'round_robin' ? computeStandings(teams, matches) : [];
  const champion = tour.champion_team_id ? teamById[tour.champion_team_id] : null;

  const topScorers = [...ranking].sort((a, b) => b.goals - a.goals).slice(0, 5);
  const topAssists = [...ranking].sort((a, b) => b.assists - a.assists).slice(0, 5);
  const topYellows = [...ranking].sort((a, b) => b.yellow_cards - a.yellow_cards).slice(0, 5);
  const topReds = [...ranking].sort((a, b) => b.red_cards - a.red_cards).slice(0, 5);
  const topFouls = [...ranking].sort((a, b) => b.fouls - a.fouls).slice(0, 5);

  const activeTab = tab === 'bracket' && tour.format !== 'knockout' ? 'table' : tab;

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      <header className="flex items-center gap-3 p-5 border-b border-border-subtle">
        <button onClick={() => navigate('/home')} className="p-2 rounded-xl bg-surface-2 border border-border-mid text-text-low" aria-label="Voltar">
          <ChevronLeft size={18} />
        </button>
        <Trophy className="text-yellow-400 shrink-0" size={20} />
        <div className="flex-1 min-w-0">
          <h1 className="font-black uppercase text-sm tracking-tight truncate">{tour.name}</h1>
          <p className="text-[9px] text-text-low font-black uppercase mt-0.5">
            {tour.sport} · {tour.format === 'knockout' ? 'Mata-mata' : 'Pontos corridos'} · {teams.length} times
            {champion && <span className="text-yellow-400 ml-2">🏆 {champion.name}</span>}
          </p>
        </div>
      </header>

      <nav className="flex border-b border-border-subtle">
        {tour.format === 'knockout' && (
          <TabBtn active={activeTab === 'bracket'} onClick={() => setTab('bracket')}>Chaveamento</TabBtn>
        )}
        {tour.format === 'round_robin' && (
          <TabBtn active={activeTab === 'table'} onClick={() => setTab('table')}>Tabela</TabBtn>
        )}
        <TabBtn active={activeTab === 'matches'} onClick={() => setTab('matches')}>Partidas</TabBtn>
        <TabBtn active={activeTab === 'ranking'} onClick={() => setTab('ranking')}>Ranking</TabBtn>
      </nav>

      <main className="p-5 space-y-4">
        {activeTab === 'bracket' && (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {rounds.map(r => (
              <div key={r} className="min-w-[220px] space-y-2 shrink-0">
                <h3 className="font-black text-[10px] uppercase text-text-low tracking-widest">
                  {roundName(r, rounds.length)}
                </h3>
                {matches.filter(m => m.round === r).map(m => (
                  <MatchCard key={m.id} m={m} teamById={teamById}
                    onOpen={() => navigate(`/torneio/${id}/partida/${m.id}`)} />
                ))}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'table' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-text-low text-[10px] font-black uppercase">
                <tr>
                  <th className="text-left py-2">#</th>
                  <th className="text-left">Time</th>
                  <th className="text-center">P</th>
                  <th className="text-center">V</th>
                  <th className="text-center">E</th>
                  <th className="text-center">D</th>
                  <th className="text-center">SG</th>
                  <th className="text-center">Pts</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((r, i) => (
                  <tr key={r.team.id} className="border-t border-border-subtle">
                    <td className="py-2 text-text-muted">{i + 1}</td>
                    <td className="font-black">{r.team.name}</td>
                    <td className="text-center tabular-nums">{r.P}</td>
                    <td className="text-center tabular-nums">{r.V}</td>
                    <td className="text-center tabular-nums">{r.E}</td>
                    <td className="text-center tabular-nums">{r.D}</td>
                    <td className="text-center tabular-nums">{r.SG}</td>
                    <td className="text-center font-black text-yellow-400 tabular-nums">{r.Pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'matches' && (
          <div className="space-y-2">
            {matches.map(m => (
              <MatchCard key={m.id} m={m} teamById={teamById} showRound
                onOpen={() => navigate(`/torneio/${id}/partida/${m.id}`)} />
            ))}
          </div>
        )}

        {activeTab === 'ranking' && (
          <div className="space-y-6">
            <RankList title="🥇 Artilheiros" items={topScorers} field="goals" />
            <RankList title="🎯 Assistências" items={topAssists} field="assists" />
            <RankList title="🟨 Cartões amarelos" items={topYellows} field="yellow_cards" />
            <RankList title="🟥 Cartões vermelhos" items={topReds} field="red_cards" />
            <RankList title="🚫 Faltas cometidas" items={topFouls} field="fouls" />
          </div>
        )}
      </main>
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${
        active ? 'border-b-2 border-cyan-electric text-cyan-electric' : 'text-text-low'
      }`}>
      {children}
    </button>
  );
}

function MatchCard({ m, teamById, onOpen, showRound }) {
  const a = teamById[m.team_a_id];
  const b = teamById[m.team_b_id];
  const finished = m.status === 'finished';

  return (
    <button type="button" onClick={onOpen}
      className="w-full bg-surface-1 border border-border-subtle rounded-2xl p-4 text-left hover:border-border-mid transition-colors active:scale-[0.99]">
      {showRound && <div className="text-[9px] text-text-muted font-black uppercase mb-1">Rodada {m.round}</div>}
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[11px] font-black flex-1 truncate ${m.winner_team_id === a?.id ? 'text-yellow-400' : ''}`}>
          {a?.name || '—'}
        </span>
        <span className="font-black tabular-nums text-sm shrink-0">
          {finished ? `${m.score_a ?? 0} × ${m.score_b ?? 0}` : 'vs'}
        </span>
        <span className={`text-[11px] font-black flex-1 truncate text-right ${m.winner_team_id === b?.id ? 'text-yellow-400' : ''}`}>
          {b?.name || '—'}
        </span>
      </div>
      {!finished && m.team_a_id && m.team_b_id && (
        <div className="flex items-center gap-1 text-[9px] text-cyan-electric/70 font-black uppercase mt-2">
          <Play size={10} /> tocar para registrar
        </div>
      )}
    </button>
  );
}

function RankList({ title, items, field }) {
  return (
    <div>
      <h3 className="font-black uppercase text-xs mb-2">{title}</h3>
      {items.length === 0 && <p className="text-text-muted text-sm">Sem dados ainda.</p>}
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={`${it.player_name}-${i}`} className="flex justify-between bg-surface-1 border border-border-subtle rounded-xl px-4 py-2.5 text-sm">
            <span className="font-black">{i + 1}. {it.player_name}</span>
            <span className="font-black text-yellow-400 tabular-nums">{it[field]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function roundName(r, total) {
  const fromEnd = total - r;
  if (fromEnd === 0) return 'Final';
  if (fromEnd === 1) return 'Semifinal';
  if (fromEnd === 2) return 'Quartas';
  if (fromEnd === 3) return 'Oitavas';
  return `Rodada ${r}`;
}
