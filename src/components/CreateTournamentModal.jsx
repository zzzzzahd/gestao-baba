// src/components/CreateTournamentModal.jsx
import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { generateKnockout, generateRoundRobin } from '../utils/bracket';
import { advanceWinner } from '../services/tournamentService';
import { X, Trophy, Plus, User, Users } from 'lucide-react';
import toast from 'react-hot-toast';

const SPORT_LABEL = { futebol: 'Futebol', futsal: 'Futsal', society: 'Society' };

const emptyTeam = () => ({ name: '', coach: '', players: [] });

export default function CreateTournamentModal({ open, onClose, onCreated, userId }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [sport, setSport] = useState('futebol');
  const [format, setFormat] = useState('knockout');
  const [teamsCount, setTeamsCount] = useState(8);

  const [periods, setPeriods] = useState(2);
  const [periodMinutes, setPeriodMinutes] = useState(25);
  const [intervalMinutes, setIntervalMinutes] = useState(5);
  const [extraTime, setExtraTime] = useState(false);
  const [penalties, setPenalties] = useState(true);

  const [teams, setTeams] = useState(Array.from({ length: 8 }, emptyTeam));

  if (!open) return null;

  function resetAndClose() {
    setStep(1);
    setName('');
    setSport('futebol');
    setFormat('knockout');
    setTeamsCount(8);
    setTeams(Array.from({ length: 8 }, emptyTeam));
    onClose();
  }

  function updateTeamsCount(n) {
    const v = Math.max(3, Math.min(32, Number(n) || 0));
    setTeamsCount(v);
    setTeams(prev => {
      const arr = [...prev];
      while (arr.length < v) arr.push(emptyTeam());
      arr.length = v;
      return arr;
    });
  }

  function updateTeam(i, patch) {
    setTeams(prev => prev.map((t, idx) => idx === i ? { ...t, ...patch } : t));
  }

  function addPlayer(i) {
    setTeams(prev => prev.map((t, idx) =>
      idx === i ? { ...t, players: [...t.players, ''] } : t
    ));
  }

  function updatePlayer(teamIdx, playerIdx, value) {
    setTeams(prev => prev.map((t, i) => {
      if (i !== teamIdx) return t;
      const players = [...t.players];
      players[playerIdx] = value;
      return { ...t, players };
    }));
  }

  function removePlayer(teamIdx, playerIdx) {
    setTeams(prev => prev.map((t, i) => {
      if (i !== teamIdx) return t;
      return { ...t, players: t.players.filter((_, j) => j !== playerIdx) };
    }));
  }

  async function handleCreate() {
    if (!name.trim()) { toast.error('Dê um nome ao torneio'); return; }
    if (teams.some(t => !t.name.trim())) { toast.error('Preencha o nome de todos os times'); return; }

    const dupPlayers = teams.some(t => {
      const names = t.players.map(p => p.trim().toLowerCase()).filter(Boolean);
      return new Set(names).size !== names.length;
    });
    if (dupPlayers) { toast.error('Há jogadores com nome duplicado no mesmo time'); return; }

    setLoading(true);
    try {
      const { data: tour, error: e1 } = await supabase
        .from('tournaments')
        .insert({
          user_id: userId,
          name: name.trim(),
          sport,
          format,
          config: {
            periods, period_minutes: periodMinutes,
            interval_minutes: intervalMinutes,
            extra_time: extraTime, penalties,
          },
        })
        .select()
        .single();
      if (e1) throw e1;

      const teamRows = teams.map((t, i) => ({
        tournament_id: tour.id,
        name: t.name.trim(),
        coach_name: t.coach.trim() || null,
        seed: i + 1,
      }));
      const { data: insertedTeams, error: e2 } = await supabase
        .from('tournament_teams')
        .insert(teamRows)
        .select();
      if (e2) throw e2;

      const playerRows = insertedTeams.flatMap((team, i) =>
        teams[i].players
          .map(p => p.trim())
          .filter(Boolean)
          .map(playerName => ({
            tournament_id: tour.id,
            team_id: team.id,
            name: playerName,
          }))
      );
      if (playerRows.length > 0) {
        const { error: ePlayers } = await supabase.from('tournament_team_players').insert(playerRows);
        if (ePlayers) throw ePlayers;
      }

      const rounds = format === 'knockout'
        ? generateKnockout(insertedTeams)
        : generateRoundRobin(insertedTeams);

      const flat = rounds.flat().map(m => ({
        tournament_id: tour.id,
        round: m.round,
        match_index: m.match_index,
        team_a_id: m.team_a_id,
        team_b_id: m.team_b_id,
        status: m.bye ? 'finished' : 'pending',
        winner_team_id: m.bye ? (m.team_a_id || m.team_b_id) : null,
      }));

      const { data: inserted, error: e3 } = await supabase
        .from('tournament_matches')
        .insert(flat)
        .select();
      if (e3) throw e3;

      if (format === 'knockout') {
        for (const m of inserted || []) {
          if (m.status === 'finished' && m.winner_team_id) {
            await advanceWinner(tour.id, m, m.winner_team_id);
          }
        }
      }

      toast.success('Torneio criado!');
      onCreated?.(tour);
      resetAndClose();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao criar torneio: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const inputCls = 'w-full mt-1 bg-surface-2 border border-border-mid rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-electric/50';

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0d0d0d] border border-border-mid text-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <Trophy className="text-yellow-400" size={22} />
            <h2 className="font-black uppercase text-sm tracking-widest">Criar Torneio — {step}/3</h2>
          </div>
          <button onClick={resetAndClose} className="p-2 rounded-xl hover:bg-surface-2 text-text-low" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {step === 1 && (
            <>
              <div>
                <label className="text-[10px] font-black uppercase text-text-low tracking-widest">Nome do torneio</label>
                <input value={name} onChange={e => setName(e.target.value)} className={inputCls}
                  placeholder="Copa de Verão 2026" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-text-low tracking-widest">Esporte</label>
                <select value={sport} onChange={e => setSport(e.target.value)} className={inputCls}>
                  {Object.entries(SPORT_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-text-low tracking-widest">Formato</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button type="button" onClick={() => setFormat('knockout')}
                    className={`p-3 rounded-xl border text-[11px] font-black uppercase transition-all ${
                      format === 'knockout' ? 'border-yellow-400/50 bg-yellow-400/10 text-yellow-400' : 'border-border-mid text-text-low'
                    }`}>
                    🏆 Mata-mata
                  </button>
                  <button type="button" onClick={() => setFormat('round_robin')}
                    className={`p-3 rounded-xl border text-[11px] font-black uppercase transition-all ${
                      format === 'round_robin' ? 'border-cyan-electric/50 bg-cyan-electric/10 text-cyan-electric' : 'border-border-mid text-text-low'
                    }`}>
                    📊 Pontos corridos
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-text-low tracking-widest">Quantidade de times (3–32)</label>
                <input type="number" min={3} max={32} value={teamsCount}
                  onChange={e => updateTeamsCount(e.target.value)} className={inputCls} />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h3 className="font-black uppercase text-xs text-white">Configurações dos jogos</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-text-low">Nº de tempos</label>
                  <input type="number" min={1} max={4} value={periods}
                    onChange={e => setPeriods(Number(e.target.value))} className={inputCls} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-text-low">Duração (min)</label>
                  <input type="number" min={1} max={90} value={periodMinutes}
                    onChange={e => setPeriodMinutes(Number(e.target.value))} className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black uppercase text-text-low">Intervalo (min)</label>
                  <input type="number" min={0} max={30} value={intervalMinutes}
                    onChange={e => setIntervalMinutes(Number(e.target.value))} className={inputCls} />
                </div>
              </div>
              {format === 'knockout' && (
                <div className="space-y-2 pt-2">
                  <label className="flex items-center gap-2 text-sm text-text-mid">
                    <input type="checkbox" checked={extraTime}
                      onChange={e => setExtraTime(e.target.checked)} className="accent-cyan-electric" />
                    Prorrogação em caso de empate
                  </label>
                  <label className="flex items-center gap-2 text-sm text-text-mid">
                    <input type="checkbox" checked={penalties}
                      onChange={e => setPenalties(e.target.checked)} className="accent-cyan-electric" />
                    Pênaltis para decidir
                  </label>
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <h3 className="font-black uppercase text-xs text-white">Times e elencos</h3>
              <p className="text-[10px] text-text-muted">Cadastre o time, técnico (opcional) e jogadores de cada equipe.</p>
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {teams.map((team, i) => (
                  <div key={i} className="bg-surface-1 border border-border-subtle rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400 font-black text-xs w-6">{i + 1}.</span>
                      <input
                        value={team.name}
                        onChange={e => updateTeam(i, { name: e.target.value })}
                        className="flex-1 bg-surface-2 border border-border-mid rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-cyan-electric/50"
                        placeholder={`Nome do time ${i + 1}`}
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase text-text-low tracking-widest flex items-center gap-1">
                        <User size={10} /> Técnico <span className="text-text-muted font-normal">(opcional)</span>
                      </label>
                      <input
                        value={team.coach}
                        onChange={e => updateTeam(i, { coach: e.target.value })}
                        className="w-full mt-1 bg-surface-2 border border-border-mid rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-cyan-electric/50"
                        placeholder="Nome do técnico"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[9px] font-black uppercase text-text-low tracking-widest flex items-center gap-1">
                          <Users size={10} /> Jogadores
                        </label>
                        <button
                          type="button"
                          onClick={() => addPlayer(i)}
                          className="text-[9px] font-black uppercase text-cyan-electric flex items-center gap-0.5"
                        >
                          <Plus size={12} /> adicionar
                        </button>
                      </div>
                      {team.players.length === 0 ? (
                        <p className="text-[10px] text-text-muted py-1">Nenhum jogador — clique em adicionar</p>
                      ) : (
                        <div className="space-y-1.5">
                          {team.players.map((player, j) => (
                            <div key={j} className="flex items-center gap-2">
                              <input
                                value={player}
                                onChange={e => updatePlayer(i, j, e.target.value)}
                                className="flex-1 bg-surface-2 border border-border-mid rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-cyan-electric/50"
                                placeholder={`Jogador ${j + 1}`}
                              />
                              <button
                                type="button"
                                onClick={() => removePlayer(i, j)}
                                className="text-text-muted hover:text-red-400 px-1 text-lg leading-none"
                                aria-label="Remover jogador"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-text-muted">O chaveamento será gerado aleatoriamente após criar.</p>
            </>
          )}
        </div>

        <div className="flex gap-2 p-5 border-t border-border-subtle">
          {step > 1 && (
            <button type="button" onClick={() => setStep(step - 1)}
              className="flex-1 py-3 rounded-2xl bg-surface-2 border border-border-mid text-text-low text-[10px] font-black uppercase">
              Voltar
            </button>
          )}
          {step < 3 && (
            <button type="button" onClick={() => setStep(step + 1)}
              className="flex-1 py-3 rounded-2xl bg-cyan-electric text-black text-[10px] font-black uppercase">
              Próximo
            </button>
          )}
          {step === 3 && (
            <button type="button" onClick={handleCreate} disabled={loading}
              className="flex-1 py-3 rounded-2xl bg-yellow-400 text-black text-[10px] font-black uppercase disabled:opacity-50">
              {loading ? 'Criando...' : 'Criar torneio'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
