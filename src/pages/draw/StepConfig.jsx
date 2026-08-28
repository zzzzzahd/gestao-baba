// src/pages/draw/StepConfig.jsx
// Sprint 3/16 — Adiciona sons no sorteio + constraints existentes.

import React, { useState } from 'react';
import { Users, RefreshCw, ChevronRight, Settings2, ChevronDown, ChevronUp, UserPlus, X } from 'lucide-react';
import { useBaba }               from '../../contexts/BabaContext';
import { useFeatures }           from '../../utils/babaMode';
import { supabase }              from '../../services/supabase';
import Tooltip                   from '../../components/Tooltip';
import DrawConstraintsPanel      from '../../components/DrawConstraintsPanel';
import { Sounds }                from '../../utils/sounds';
import toast                     from 'react-hot-toast';

const STRATEGIES = [
  { id: 'reserve',    label: 'Reserva',    tip: 'Jogadores que não cabem nos times ficam de reserva.'   },
  { id: 'substitute', label: 'Incompleto', tip: 'Times são formados mesmo com menos jogadores.'          },
];

// ─── Algoritmo de sorteio balanceado ─────────────────────────────────────────

/** Distribui um pool (já ordenado por prioridade) em times respeitando a capacidade de cada um, em formato serpentina (cobra). */
const snakeDistribute = (pool, capacities) => {
  const teams = capacities.map(() => []);
  let dir = 1, poolIdx = 0;
  while (poolIdx < pool.length) {
    const order = dir === 1 ? capacities.map((_, i) => i) : capacities.map((_, i) => i).reverse();
    let placedAny = false;
    for (const t of order) {
      if (poolIdx >= pool.length) break;
      if (teams[t].length < capacities[t]) {
        teams[t].push(pool[poolIdx]);
        poolIdx++;
        placedAny = true;
      }
    }
    if (!placedAny) break;
    dir *= -1;
  }
  return teams;
};

/** Fisher-Yates — usado antes de ordenar por nota pra empates não caírem sempre
 * pra ordem alfabética do nome (era isso que fazia "Zharick" ficar sempre por
 * último: todo mundo empatado em nota 2, e a query de players vem ordenada por
 * nome — sem embaralhar, o desempate é sempre alfabético, sempre no mesmo sentido). */
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const drawTeamsWithConstraints = (players, playersPerTeam, strategy, constraints = [], gkMode = 'fixed') => {
  const gks      = players.filter(p => p.position === 'goleiro');
  const outfield = players.filter(p => p.position !== 'goleiro');

  const totalTeamsIfFixed    = strategy === 'reserve'
    ? Math.floor(players.length / (playersPerTeam + 1))
    : Math.ceil(players.length / playersPerTeam);
  const totalTeamsIfLineOnly = strategy === 'reserve'
    ? Math.floor(outfield.length / (playersPerTeam + 1))
    : Math.ceil(outfield.length / playersPerTeam);

  // court: decide sozinho — goleiro fixo no time se a conta bate exatamente
  // (1 goleiro por time), senão vira fila própria da quadra (goalkeeperQueue)
  let mode; // 'fixed' | 'separate' | 'court-fixed' | 'court-queue'
  if (gkMode === 'separate') mode = 'separate';
  else if (gkMode === 'court') {
    mode = (totalTeamsIfFixed > 0 && gks.length === totalTeamsIfFixed) ? 'court-fixed' : 'court-queue';
  } else mode = 'fixed';

  const totalTeams = (mode === 'separate' || mode === 'court-queue') ? totalTeamsIfLineOnly : totalTeamsIfFixed;

  // Goleiro sempre é distribuído à parte, com vaga garantida (1 por time) quando o
  // modo exige — nunca dentro do mesmo snake por nota que os jogadores de linha,
  // senão a ordenação por nota pode deixar times inteiros sem goleiro por acaso.
  const hasDedicatedGkPerTeam = mode === 'fixed' || mode === 'court-fixed' || mode === 'separate';
  // separate: goleiro é vaga extra (bônus) — linha usa a capacidade cheia de playersPerTeam.
  // fixed/court-fixed: goleiro é 1 dos playersPerTeam — linha usa playersPerTeam-1.
  // court-queue: não tem goleiro dedicado nenhum — linha usa a capacidade cheia.
  let lineCapacityPerTeam = (mode === 'fixed' || mode === 'court-fixed') ? playersPerTeam - 1 : playersPerTeam;
  // 'reserve': cada time ganha +1 vaga própria de reserva (fica marcado isReserve),
  // que pode entrar pra substituir qualquer titular DO MESMO TIME até o fim do baba.
  if (strategy === 'reserve') lineCapacityPerTeam += 1;

  const sorted      = shuffle(outfield).sort((a, b) => (b.balance_level || 0) - (a.balance_level || 0));
  const capacities   = Array.from({ length: totalTeams }, () => lineCapacityPerTeam);
  let distributed;
  if (strategy === 'substitute' && totalTeams > 0) {
    // Concentra a falta de jogadores em UM time só (o último), em vez de espalhar
    // entre vários — mas ainda balanceia por nota dentro dos times completos.
    const fullTeams    = totalTeams - 1;
    const fullCapacity = fullTeams * lineCapacityPerTeam;
    const forFull       = sorted.slice(0, fullCapacity);
    const forIncomplete = sorted.slice(fullCapacity);
    distributed = [
      ...snakeDistribute(forFull, Array.from({ length: fullTeams }, () => lineCapacityPerTeam)),
      forIncomplete,
    ];
  } else {
    distributed = snakeDistribute(sorted, capacities);
  }
  const teams = distributed.map((teamPlayers, i) => ({
    name:    `Time ${String.fromCharCode(65 + i)}`,
    // 'reserve': o último jogador alocado no time (a vaga extra) é o reserva do time.
    // 'substitute': o time pode sobrar incompleto naturalmente (snake respeita a
    // capacidade mas não força completar — o último time formado pode ficar curto).
    players: strategy === 'reserve' && teamPlayers.length === lineCapacityPerTeam
      ? teamPlayers.map((p, idx) => idx === teamPlayers.length - 1 ? { ...p, isReserve: true } : p)
      : teamPlayers,
  }));

  let goalkeeperQueue = [];
  let gkReserves      = [];
  if (mode === 'court-queue') {
    // Goleiros não entram no sorteio de time nenhum — ficam numa fila própria,
    // vinculada à quadra (índices 0/1 = ativos, resto = banco). StepMatch.jsx
    // gira essa fila em paralelo com a fila de times (ver handleMatchEnd).
    goalkeeperQueue = shuffle(gks).sort((a, b) => (b.balance_level || 0) - (a.balance_level || 0));
  } else if (hasDedicatedGkPerTeam) {
    const sortedGks    = shuffle(gks).sort((a, b) => (b.balance_level || 0) - (a.balance_level || 0));
    const gkCapacities = Array.from({ length: totalTeams }, () => 1);
    snakeDistribute(sortedGks, gkCapacities).forEach((assigned, i) => teams[i].players.push(...assigned));
    gkReserves = sortedGks.slice(totalTeams); // goleiros excedentes (mais goleiro que time)
  }

  const getTeamOf = (pid) => teams.findIndex(t => t.players.some(p => p.id === pid));

  const swapPlayers = (tAIdx, pAId, tBIdx, pBId) => {
    const pA = teams[tAIdx].players.find(p => p.id === pAId);
    const pB = teams[tBIdx].players.find(p => p.id === pBId);
    if (!pA || !pB) return false;
    teams[tAIdx].players = teams[tAIdx].players.filter(p => p.id !== pAId);
    teams[tBIdx].players = teams[tBIdx].players.filter(p => p.id !== pBId);
    teams[tAIdx].players.push(pB);
    teams[tBIdx].players.push(pA);
    return true;
  };

  constraints.forEach(({ player_a_id, player_b_id, constraint_type }) => {
    const tA = getTeamOf(player_a_id);
    const tB = getTeamOf(player_b_id);
    if (tA === -1 || tB === -1) return;

    if (constraint_type === 'must_together' && tA !== tB) {
      const playerBObj   = teams[tB].players.find(p => p.id === player_b_id);
      const ratingTarget = playerBObj?.balance_level || 0;
      const candidates   = teams[tA].players
        .filter(p => p.id !== player_a_id)
        .sort((a, b) => Math.abs((a.balance_level || 0) - ratingTarget) - Math.abs((b.balance_level || 0) - ratingTarget));
      if (candidates[0]) swapPlayers(tA, candidates[0].id, tB, player_b_id);
    }

    if (constraint_type === 'must_apart' && tA === tB) {
      const playerBObj   = teams[tA].players.find(p => p.id === player_b_id);
      const ratingTarget = playerBObj?.balance_level || 0;
      const otherTeamIdx = (tA + 1) % totalTeams;
      const candidates   = teams[otherTeamIdx].players
        .sort((a, b) => Math.abs((a.balance_level || 0) - ratingTarget) - Math.abs((b.balance_level || 0) - ratingTarget));
      if (candidates[0]) swapPlayers(tA, player_b_id, otherTeamIdx, candidates[0].id);
    }
  });

  const reserves = strategy === 'reserve'
    ? [...sorted.slice(totalTeams * lineCapacityPerTeam), ...gkReserves]
    : gkReserves;

  return { teams, reserves, goalkeeperQueue };
};

// ─── StepConfig ───────────────────────────────────────────────────────────────

const StepConfig = ({ drawConfig, setDrawConfig, onNext }) => {
  const { currentBaba, gameConfirmations, players, isDrawing, nextGameDay, reloadConfirmations, getAllRatings } = useBaba();
  const features = useFeatures();
  const [drawing,         setDrawing]         = useState(false);
  const [showConstraints, setShowConstraints] = useState(false);
  const [showGuestForm,   setShowGuestForm]   = useState(false);
  const [guestName,       setGuestName]       = useState('');
  const [guestPosition,   setGuestPosition]   = useState('linha');
  const [guestLevel,      setGuestLevel]      = useState(2);
  const [addingGuest,     setAddingGuest]     = useState(false);

  const safeConfig     = drawConfig || { playersPerTeam: 5, strategy: 'reserve' };
  const confirmedCount = gameConfirmations?.length || 0;
  const guests          = (gameConfirmations || []).filter(c => c.player?.is_guest);
  const minRequired    = safeConfig.playersPerTeam * 2;
  const totalTeams     = Math.floor(confirmedCount / safeConfig.playersPerTeam);
  const totalMatches   = Math.floor(totalTeams / 2);
  const reserveCount   = confirmedCount % safeConfig.playersPerTeam
    + (totalTeams % 2) * safeConfig.playersPerTeam;
  const canDraw        = confirmedCount >= minRequired && !drawing;

  const handleAddGuest = async () => {
    if (!currentBaba || !nextGameDay) return;
    setAddingGuest(true);
    try {
      const n     = guests.length + 1;
      const label = guestName.trim()
        ? `${guestName.trim()} - Convidado ${n}`
        : `Convidado ${String(n).padStart(2, '0')}`;

      const { data: newPlayer, error: playerErr } = await supabase
        .from('players')
        .insert([{ baba_id: currentBaba.id, name: label, position: guestPosition, is_guest: true, guest_level: guestLevel }])
        .select().single();
      if (playerErr) throw playerErr;

      const { error: confirmErr } = await supabase
        .from('game_confirmations')
        .insert([{ baba_id: currentBaba.id, player_id: newPlayer.id, game_date: nextGameDay.dateStr, status: 'confirmed' }]);
      if (confirmErr) throw confirmErr;

      await reloadConfirmations();
      setGuestName('');
      setGuestPosition('linha');
      setGuestLevel(2);
      toast.success(`${label} adicionado ao sorteio!`);
    } catch (err) {
      console.error('[StepConfig] addGuest error:', err);
      toast.error('Erro ao adicionar convidado');
    } finally {
      setAddingGuest(false);
    }
  };

  const handleRemoveGuest = async (confirmation) => {
    try {
      await supabase.from('game_confirmations').delete().eq('id', confirmation.id);
      await supabase.from('players').delete().eq('id', confirmation.player_id);
      await reloadConfirmations();
      toast.success('Convidado removido');
    } catch (err) {
      console.error('[StepConfig] removeGuest error:', err);
      toast.error('Erro ao remover convidado');
    }
  };

  const handleDelta = (delta) => {
    const next = Math.max(2, Math.min(11, safeConfig.playersPerTeam + delta));
    setDrawConfig(prev => ({ ...prev, playersPerTeam: next }));
    Sounds.click();
  };

  const handleDraw = async (force = false) => {
    if (!canDraw) return;
    setDrawing(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data: existing } = await supabase
       .from('draw_results')
       .select('*')
       .eq('baba_id', currentBaba.id)
       .eq('draw_date', today)
       .eq('status', 'active')
       .order('created_at', { ascending: false })
       .limit(1)
       .maybeSingle();

      if (!force && existing?.teams?.length >= 2 && existing.status !== 'finished') {
        Sounds.unlock();
        onNext({ teams: existing.teams, reserves: existing.reserves || [], goalkeeperQueue: existing.goalkeeper_queue || [], drawResultId: existing.id });
        return;
      }

      // Sortear de novo descarta as partidas da sessão anterior (mesmo dia) —
      // senão a classificação/fila do dia ficaria misturando placares de
      // sorteios diferentes. match_players e cards apagam em cascata.
      if (force && existing?.id) {
        // 1. Encerra a sessão de sorteio anterior
        const { error: finishErr } = await supabase
          .from('draw_results')
          .update({
            status: 'finished',
            finished_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      
        if (finishErr) throw finishErr;
      
        // 2. Remove as partidas da sessão anterior
        const { error: deleteMatchesErr } = await supabase
          .from('matches')
          .delete()
          .eq('draw_result_id', existing.id);
      
        if (deleteMatchesErr) throw deleteMatchesErr;
      }

      const { data: constraints } = await supabase.rpc('get_draw_constraints', {
        p_baba_id: currentBaba.id,
      });

      const ratingsData = await getAllRatings();
      const levelMap     = new Map(ratingsData.map(r => [r.player_id, r.avg_level ?? 2]));

      const confirmedIds     = gameConfirmations.map(c => c.player_id);
      const confirmedPlayers = players
        .filter(p => confirmedIds.includes(p.id))
        .map(p => ({ ...p, balance_level: p.is_guest ? (p.guest_level ?? 2) : (levelMap.get(p.id) ?? 2) }));

      const { teams, reserves, goalkeeperQueue } = drawTeamsWithConstraints(
        confirmedPlayers,
        safeConfig.playersPerTeam,
        safeConfig.strategy,
        constraints || [],
        currentBaba.gk_mode || 'fixed',
      );

      const avgRatings   = teams.map(t =>
        t.players.reduce((s, p) => s + (p.balance_level || 0), 0) / (t.players.length || 1)
      );
      const balanceScore = avgRatings.length > 1
        ? Math.max(...avgRatings) - Math.min(...avgRatings)
        : 0;

      // Sortear de novo (force=true) gera uma NOVA sessão de sorteio — importante
      // pra fila/pontuação do dia não se misturar com testes/sorteios anteriores
      // (ver draw_result_id em StepMatch.jsx e loadDailyStandings).
      const { data: drawRes, error: drawErr } = await supabase.from('draw_results').insert({
        baba_id:          currentBaba.id,
        draw_date:        today,
        teams,
        reserves,
        goalkeeper_queue: goalkeeperQueue,
        draw_config:      safeConfig,
        algorithm:        'balanced_snake',
        constraints_used: constraints || [],
        balance_score:    Math.round(balanceScore * 100) / 100,
        teams_snapshot:   teams,
        status:           'active',
        finished_at:      null,
        finished_by:      null,
      }).select().single();

      if (drawErr) throw drawErr;

      // Sprint 3 — som de sorteio
      Sounds.unlock();
      toast.success('Times sorteados! ⚡');
      onNext({ teams, reserves, goalkeeperQueue, drawResultId: drawRes?.id });
    } catch (err) {
      console.error('[StepConfig] draw error:', err);
      toast.error('Erro ao sortear. Tente novamente.');
    } finally {
      setDrawing(false);
    }
  };

  return (
    <div className="space-y-5">

      {/* Confirmados */}
      <div className="p-5 rounded-3xl bg-surface-1 border border-border-subtle">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-cyan-electric" />
            <span className="text-[10px] font-black text-text-low uppercase tracking-widest">
              Confirmados
            </span>
          </div>
          <span className={`text-lg font-black tabular-nums ${
            confirmedCount >= minRequired ? 'text-cyan-electric' : 'text-text-mid'
          }`}>
            {confirmedCount}
          </span>
        </div>
        {confirmedCount < minRequired && (
          <p className="text-[10px] text-text-muted font-bold mt-1">
            Mínimo {minRequired} para sortear · faltam {minRequired - confirmedCount}
          </p>
        )}
      </div>

      {/* Convidados avulsos — participam só deste sorteio, não entram no rank */}
      <div className="rounded-3xl bg-surface-1 border border-border-subtle overflow-hidden">
        <button
          onClick={() => setShowGuestForm(v => !v)}
          disabled={drawing}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-2/50 transition-colors disabled:opacity-40"
        >
          <div className="flex items-center gap-2">
            <UserPlus size={14} className="text-cyan-electric" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white">
              Convidados{guests.length > 0 ? ` (${guests.length})` : ''}
            </span>
          </div>
          {showGuestForm
            ? <ChevronUp   size={14} className="text-text-low" />
            : <ChevronDown size={14} className="text-text-low" />}
        </button>

        {guests.length > 0 && (
          <div className="px-5 pb-3 space-y-2">
            {guests.map(g => (
              <div key={g.id} className="flex items-center justify-between bg-surface-2 rounded-xl px-3 py-2 border border-border-subtle">
                <span className="text-[11px] font-bold truncate">{g.player?.name}</span>
                <button
                  onClick={() => handleRemoveGuest(g)}
                  disabled={drawing}
                  className="text-text-low hover:text-red-500 transition-colors p-1 disabled:opacity-40"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {showGuestForm && (
          <div className="px-5 pb-5 border-t border-border-subtle pt-4 space-y-3">
            <p className="text-[9px] text-text-muted font-bold leading-relaxed">
              O convidado participa só deste sorteio/partida — não precisa ser integrante do baba,
              não entra nos rankings nem nas conquistas, mas gols, assistências e cartões dele ficam
              registrados no histórico da partida.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={guestName}
                onChange={e => setGuestName(e.target.value)}
                placeholder="Nome (opcional)"
                className="flex-1 bg-surface-2 border border-border-mid rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:border-cyan-electric transition-colors"
              />
              <select
                value={guestPosition}
                onChange={e => setGuestPosition(e.target.value)}
                className="bg-surface-2 border border-border-mid rounded-xl px-3 py-2.5 text-sm font-black outline-none cursor-pointer"
              >
                <option value="linha">⚽ LINHA</option>
                <option value="goleiro">🧤 GOL</option>
              </select>
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-text-low block mb-1.5">
                Nível (pro equilíbrio do sorteio)
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 1, label: 'Abaixo' },
                  { value: 2, label: 'Média' },
                  { value: 3, label: 'Acima' },
                ].map(l => (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => setGuestLevel(l.value)}
                    className={`py-2 rounded-xl text-[9px] font-black uppercase transition-all border ${
                      guestLevel === l.value
                        ? 'bg-cyan-electric text-black border-cyan-electric'
                        : 'bg-surface-2 text-text-low border-border-mid hover:border-border-strong'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleAddGuest}
              disabled={addingGuest}
              className="w-full py-3 bg-cyan-electric/10 border border-cyan-electric/30 rounded-xl font-black text-xs uppercase tracking-[3px] text-cyan-electric active:scale-95 transition-transform disabled:opacity-40"
            >
              {addingGuest ? 'Adicionando...' : '+ Adicionar convidado'}
            </button>
          </div>
        )}
      </div>

      {/* Jogadores por time */}
      <div className="p-5 rounded-3xl bg-surface-1 border border-border-subtle space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase text-text-mid">Jogadores por time</span>
            <Tooltip
              title="Balanceamento"
              text="Os times são distribuídos em cobra pela nota de avaliação dos jogadores."
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleDelta(-1)}
              disabled={drawing}
              className="w-8 h-8 bg-surface-2 rounded-lg border border-border-mid font-black text-lg hover:bg-surface-3 active:scale-90 transition-all disabled:opacity-30"
            >−</button>
            <span className="text-xl font-black w-8 text-center text-cyan-electric tabular-nums">
              {safeConfig.playersPerTeam}
            </span>
            <button
              onClick={() => handleDelta(1)}
              disabled={drawing}
              className="w-8 h-8 bg-surface-2 rounded-lg border border-border-mid font-black text-lg hover:bg-surface-3 active:scale-90 transition-all disabled:opacity-30"
            >+</button>
          </div>
        </div>

        {/* Estratégia */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-black uppercase text-text-low">Suplentes</span>
            <Tooltip
              title="Modo de suplentes"
              text="'Reserva' — extras ficam aguardando. 'Incompleto' — times jogam com menos."
            />
          </div>
          <div className="flex gap-2 flex-1 justify-end">
            {STRATEGIES.map(s => (
              <button
                key={s.id}
                onClick={() => { setDrawConfig(prev => ({ ...prev, strategy: s.id })); Sounds.click(); }}
                disabled={drawing}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all border ${
                  safeConfig.strategy === s.id
                    ? 'bg-cyan-electric text-black border-cyan-electric'
                    : 'bg-surface-2 text-text-low border-border-mid hover:border-border-strong'
                } disabled:opacity-40`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Restrições — Fase 2: "sorteio com restrições" é recurso de Assinante */}
      {features.drawConstraints && (
      <div className="rounded-3xl bg-surface-1 border border-border-subtle overflow-hidden">
        <button
          onClick={() => setShowConstraints(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-2/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Settings2 size={14} className="text-text-low" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white">
              Restrições de sorteio
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-text-muted uppercase">Juntos / Separados</span>
            {showConstraints
              ? <ChevronUp   size={14} className="text-text-low" />
              : <ChevronDown size={14} className="text-text-low" />}
          </div>
        </button>
        {showConstraints && (
          <div className="px-5 pb-5 border-t border-border-subtle pt-4">
            <DrawConstraintsPanel />
          </div>
        )}
      </div>
      )}

      {/* Prévia */}
      {confirmedCount >= minRequired && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: totalMatches, label: 'Partidas',  color: 'text-cyan-electric'                               },
            { value: totalTeams,   label: 'Times',     color: 'text-white'                                       },
            { value: reserveCount, label: 'Reservas',  color: reserveCount > 0 ? 'text-yellow-500' : 'text-text-muted' },
          ].map(item => (
            <div key={item.label} className="text-center p-3 bg-surface-1 rounded-2xl border border-border-subtle">
              <p className={`text-2xl font-black tabular-nums ${item.color}`}>{item.value}</p>
              <p className="text-[8px] text-text-low uppercase font-black mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Botão sortear */}
      <button
        onClick={() => handleDraw(false)}
        disabled={!canDraw}
        className="w-full py-5 rounded-2xl font-black uppercase italic tracking-tighter text-black flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        style={{ background: 'linear-gradient(135deg, #00f2ff, #0066ff)' }}
      >
        {drawing ? (
          <><RefreshCw size={18} className="animate-spin" /> Sorteando...</>
        ) : (
          <><RefreshCw size={18} /> Sortear Times <ChevronRight size={18} /></>
        )}
      </button>

      {/* Se já existe um sorteio de hoje em andamento, o botão principal só
          reabre ele (evita sorteio duplicado sem querer). Esse aqui força um
          sorteio novo de verdade — útil pra testar ou pra corrigir um sorteio
          errado sem precisar encerrar o baba primeiro. */}
      {canDraw && (
        <button
          onClick={() => {
            if (window.confirm('Isso apaga as partidas já jogadas hoje (placar, fila, gols) e sorteia um time novo do zero. Continuar?')) {
              handleDraw(true);
            }
          }}
          disabled={drawing}
          className="w-full py-2.5 text-[9px] font-black uppercase tracking-widest text-text-muted hover:text-cyan-electric transition-colors disabled:opacity-30"
        >
          Sortear de novo (ignora o sorteio atual)
        </button>
      )}
    </div>
  );
};

export default StepConfig;