import React, { useMemo } from 'react';
import { Star, Zap, TrendingUp, Users, Trophy, Award, Shield, Target, Flame, Crown } from 'lucide-react';

// ─────────────────────────────────────────────
// SISTEMA DE BADGES — Tarefa 4.5
// ─────────────────────────────────────────────

const BADGE_DEFINITIONS = [
  // Presença
  {
    id: 'primeiro_baba',
    icon: <Star size={13} />,
    label: 'Estreante',
    description: 'Jogou seu primeiro baba',
    color: 'text-cyan-electric',
    bg: 'bg-cyan-electric/10 border-cyan-electric/20',
    condition: ({ totalMatches }) => totalMatches >= 1,
  },
  {
    id: 'veterano',
    icon: <Shield size={13} />,
    label: 'Veterano',
    description: '10 ou mais partidas disputadas',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20',
    condition: ({ totalMatches }) => totalMatches >= 10,
  },
  {
    id: 'lenda',
    icon: <Crown size={13} />,
    label: 'Lenda',
    description: '30 ou mais partidas disputadas',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10 border-yellow-500/20',
    condition: ({ totalMatches }) => totalMatches >= 30,
  },
  // Gols
  {
    id: 'artilheiro',
    icon: <Zap size={13} />,
    label: 'Artilheiro',
    description: '10 ou mais gols marcados',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/20',
    condition: ({ totalGoals }) => totalGoals >= 10,
  },
  {
    id: 'maquina_de_gol',
    icon: <Flame size={13} />,
    label: 'Máquina de Gol',
    description: '30 ou mais gols marcados',
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/20',
    condition: ({ totalGoals }) => totalGoals >= 30,
  },
  // Assistências
  {
    id: 'garcom',
    icon: <TrendingUp size={13} />,
    label: 'Garçom',
    description: '10 ou mais assistências',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    condition: ({ totalAssists }) => totalAssists >= 10,
  },
  {
    id: 'craque_do_passe',
    icon: <Target size={13} />,
    label: 'Craque do Passe',
    description: '30 ou mais assistências',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10 border-indigo-500/20',
    condition: ({ totalAssists }) => totalAssists >= 30,
  },
  // Avaliação
  {
    id: 'bem_avaliado',
    icon: <Star size={13} />,
    label: 'Bem Avaliado',
    description: 'Nota média acima de 4.0',
    color: 'text-cyan-electric',
    bg: 'bg-cyan-electric/10 border-cyan-electric/20',
    condition: ({ globalRating, totalVotes }) => globalRating >= 4.0 && totalVotes >= 3,
  },
  {
    id: 'elite',
    icon: <Crown size={13} />,
    label: 'Jogador Elite',
    description: 'Nota média acima de 4.5 com 5+ votos',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10 border-yellow-500/20',
    condition: ({ globalRating, totalVotes }) => globalRating >= 4.5 && totalVotes >= 5,
  },
  // Destaque
  {
    id: 'melhor_do_mes',
    icon: <Trophy size={13} />,
    label: 'Melhor do Mês',
    description: 'Destaque em um baba',
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10 border-yellow-500/20',
    condition: ({ bestOfMonth }) => bestOfMonth?.length > 0,
  },
  {
    id: 'multi_baba',
    icon: <Users size={13} />,
    label: 'Multi-Baba',
    description: 'Participa de 2 ou mais babas',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    condition: ({ babaCount }) => babaCount >= 2,
  },
];

const BadgeCard = ({ badge, unlocked }) => (
  <div className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
    unlocked
      ? badge.bg
      : 'bg-surface-1 border-border-subtle opacity-40 grayscale'
  }`}>
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
      unlocked ? badge.bg : 'bg-surface-2 border border-border-mid'
    }`}>
      <span className={unlocked ? badge.color : 'text-text-muted'}>
        {badge.icon}
      </span>
    </div>
    <div className="min-w-0">
      <p className={`text-[11px] font-black uppercase tracking-wide leading-none ${
        unlocked ? badge.color : 'text-text-muted'
      }`}>
        {badge.label}
      </p>
      <p className="text-[9px] text-text-low font-medium mt-0.5 leading-tight truncate">
        {badge.description}
      </p>
    </div>
    {unlocked && (
      <div className={`ml-auto w-1.5 h-1.5 rounded-full shrink-0 ${badge.color.replace('text-', 'bg-')}`} />
    )}
  </div>
);

// ─────────────────────────────────────────────
// MICRO-COMPONENTES
// ─────────────────────────────────────────────

const StarBar = ({ value, max = 5 }) => (
  <div className="flex items-center gap-2">
    <div className="flex-1 h-1.5 bg-surface-3 rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-cyan-electric to-purple-500 rounded-full transition-all duration-700"
        style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
      />
    </div>
    <span className="text-[10px] font-black font-mono text-text-mid w-6 text-right">
      {Number(value).toFixed(1)}
    </span>
  </div>
);

const StatCard = ({ icon, label, value, sub, accent = 'cyan' }) => {
  const map = {
    cyan:   'text-cyan-electric  border-cyan-electric/20  bg-cyan-electric/10',
    purple: 'text-purple-400     border-purple-400/20     bg-purple-400/10',
    orange: 'text-orange-400     border-orange-400/20     bg-orange-400/10',
    green:  'text-emerald-400    border-emerald-400/20    bg-emerald-400/10',
  };
  const cls = map[accent] || map.cyan;
  const textCls = cls.split(/\s+/)[0];
  return (
    <div className={`p-4 rounded-2xl border ${cls} flex flex-col gap-1`}>
      <div className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 opacity-60 ${textCls}`}>
        {icon}{label}
      </div>
      <p className={`text-2xl font-black font-mono ${textCls}`}>{value}</p>
      {sub && <p className="text-[9px] text-text-low font-bold uppercase">{sub}</p>}
    </div>
  );
};

const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-surface-2 rounded-xl ${className}`} />
);

const SectionTitle = ({ children, sub }) => (
  <div className="mb-3">
    <p className="text-[9px] font-black text-text-low uppercase tracking-[0.2em]">{children}</p>
    {sub && <p className="text-[8px] text-text-muted font-bold uppercase mt-0.5">{sub}</p>}
  </div>
);

// ─────────────────────────────────────────────
// PROFILE STATS
// ─────────────────────────────────────────────

const ProfileStats = ({ statsData, loading }) => {

  const { ratings, matchStats, bestOfMonth, ranking } = statsData;

  const ratingsMap = useMemo(
    () => new Map(ratings.map(r => [r.baba_id, r])),
    [ratings]
  );

  const matchMap = useMemo(
    () => new Map(matchStats.map(m => [m.baba_id, m])),
    [matchStats]
  );

  const globalRating = useMemo(() => {
    const vals = ratings.map(r => r.final_rating).filter(v => v > 0);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }, [ratings]);

  const totalVotes = useMemo(
    () => ratings.reduce((s, r) => s + (r.votes_count || 0), 0),
    [ratings]
  );

  const { totalGoals, totalAssists, totalMatches } = useMemo(() => ({
    totalGoals:   matchStats.reduce((s, m) => s + (m.goals   || 0), 0),
    totalAssists: matchStats.reduce((s, m) => s + (m.assists || 0), 0),
    totalMatches: matchStats.reduce((s, m) => s + (m.matches || 0), 0),
  }), [matchStats]);

  const goalsPerGame   = totalMatches > 0 ? (totalGoals   / totalMatches).toFixed(2) : '—';
  const assistsPerGame = totalMatches > 0 ? (totalAssists / totalMatches).toFixed(2) : '—';

  const avgSubs = useMemo(() => {
    const rs = ratings.filter(r => r.votes_count > 0);
    if (!rs.length) return null;
    const n = rs.length;
    return {
      skill:      rs.reduce((s, r) => s + (r.avg_skill      || 0), 0) / n,
      physical:   rs.reduce((s, r) => s + (r.avg_physical   || 0), 0) / n,
      commitment: rs.reduce((s, r) => s + (r.avg_commitment || 0), 0) / n,
    };
  }, [ratings]);

  const babaPerformance = useMemo(() => {
    const allBabaIds = [...new Set([
      ...ratings.map(r => r.baba_id),
      ...matchStats.map(m => m.baba_id),
    ])];
    return allBabaIds
      .map(id => {
        const r = ratingsMap.get(id);
        const m = matchMap.get(id);
        return {
          baba_id:        id,
          baba_name:      r?.baba_name || m?.baba_name || 'Baba',
          final_rating:   r?.final_rating   || 0,
          overall_rating: r?.overall_rating || 0,
          avg_skill:      r?.avg_skill      || 0,
          avg_physical:   r?.avg_physical   || 0,
          avg_commitment: r?.avg_commitment || 0,
          votes_count:    r?.votes_count    || 0,
          rank_position:  ranking?.find(rk => rk.baba_id === id)?.rank_position || null,
          goals:          m?.goals   || 0,
          assists:        m?.assists || 0,
          matches:        m?.matches || 0,
        };
      })
      .sort((a, b) => b.final_rating - a.final_rating);
  }, [ratings, matchStats, ratingsMap, matchMap, ranking]);

  // ── Calcular badges desbloqueados (Tarefa 4.5) ────────────────────────────
  const { unlockedBadges, lockedBadges } = useMemo(() => {
    const ctx = {
      totalMatches,
      totalGoals,
      totalAssists,
      globalRating,
      totalVotes,
      bestOfMonth: bestOfMonth || [],
      babaCount: babaPerformance.length,
    };
    const unlocked = BADGE_DEFINITIONS.filter(b => b.condition(ctx));
    const locked   = BADGE_DEFINITIONS.filter(b => !b.condition(ctx));
    return { unlockedBadges: unlocked, lockedBadges: locked };
  }, [totalMatches, totalGoals, totalAssists, globalRating, totalVotes, bestOfMonth, babaPerformance.length]);

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* REPUTAÇÃO GLOBAL */}
      <section>
        <SectionTitle>Reputação Global</SectionTitle>
        {loading ? (
          <Skeleton className="h-32" />
        ) : globalRating > 0 ? (
          <div className="p-5 rounded-[1.75rem] bg-surface-1 border border-border-subtle space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-4xl font-black font-mono text-white leading-none">
                  {Number(globalRating).toFixed(2)}
                </p>
                <p className="text-[10px] text-text-low font-bold uppercase mt-1">
                  {totalVotes} voto{totalVotes !== 1 ? 's' : ''} recebido{totalVotes !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(i => (
                  <Star
                    key={i}
                    size={16}
                    className={i <= Math.round(globalRating) ? 'text-cyan-electric' : 'text-text-muted'}
                    fill={i <= Math.round(globalRating) ? 'currentColor' : 'none'}
                  />
                ))}
              </div>
            </div>
            {avgSubs && (
              <div className="space-y-2 pt-3 border-t border-border-subtle">
                {[
                  { label: '⚽ Habilidade',  val: avgSubs.skill      },
                  { label: '💪 Físico',       val: avgSubs.physical   },
                  { label: '🤝 Compromisso',  val: avgSubs.commitment },
                ].map(item => (
                  <div key={item.label}>
                    <p className="text-[9px] font-black uppercase tracking-widest text-text-low mb-1">
                      {item.label}
                    </p>
                    <StarBar value={item.val} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-5 rounded-[1.75rem] bg-surface-1 border border-dashed border-border-mid text-center">
            <Star size={24} className="text-text-muted mx-auto mb-2" />
            <p className="text-[10px] text-text-muted font-black uppercase">Ainda sem avaliações</p>
            <p className="text-[9px] text-text-muted mt-1">Peça para seus companheiros te avaliarem</p>
          </div>
        )}
      </section>

      {/* CONQUISTAS — Tarefa 4.5 */}
      <section>
        <SectionTitle
          sub={loading ? '' : `${unlockedBadges.length} de ${BADGE_DEFINITIONS.length} desbloqueadas`}
        >
          Conquistas
        </SectionTitle>
        {loading ? (
          <div className="grid grid-cols-1 gap-2">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : (
          <div className="space-y-2">
            {/* Desbloqueadas primeiro */}
            {unlockedBadges.map(badge => (
              <BadgeCard key={badge.id} badge={badge} unlocked />
            ))}
            {/* Bloqueadas por último — opacas */}
            {lockedBadges.map(badge => (
              <BadgeCard key={badge.id} badge={badge} unlocked={false} />
            ))}
            {unlockedBadges.length === 0 && (
              <div className="text-center py-6 border border-dashed border-border-subtle rounded-2xl">
                <Trophy size={24} className="text-text-muted mx-auto mb-2" />
                <p className="text-[10px] text-text-muted font-black uppercase">Nenhuma conquista ainda</p>
                <p className="text-[9px] text-text-muted mt-1">Jogue mais babas para desbloquear!</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ESTATÍSTICAS GERAIS */}
      <section>
        <SectionTitle>Estatísticas Gerais</SectionTitle>
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={<Zap size={10}/>}        label="Gols"         value={totalGoals}              sub={`${goalsPerGame}/jogo`}   accent="orange" />
            <StatCard icon={<TrendingUp size={10}/>}  label="Assistências" value={totalAssists}            sub={`${assistsPerGame}/jogo`} accent="cyan"   />
            <StatCard icon={<Users size={10}/>}       label="Partidas"     value={totalMatches}            sub="jogos disputados"         accent="purple" />
            <StatCard icon={<Trophy size={10}/>}      label="G + A"        value={totalGoals+totalAssists} sub="contribuições totais"     accent="green"  />
          </div>
        )}
      </section>

      {/* PERFORMANCE POR BABA */}
      {(loading || babaPerformance.length > 0) && (
        <section>
          <SectionTitle>Performance por Baba</SectionTitle>
          <div className="space-y-3">
            {loading
              ? [...Array(2)].map((_, i) => <Skeleton key={i} className="h-28" />)
              : babaPerformance.map(b => (
                <div key={b.baba_id} className="p-4 rounded-2xl bg-surface-1 border border-border-subtle space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-cyan-electric/10 border border-cyan-electric/20 flex items-center justify-center text-cyan-electric font-black text-sm shrink-0">
                        {b.baba_name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-black text-white leading-none">{b.baba_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[9px] text-text-low font-bold uppercase">
                            {b.matches} jogo{b.matches !== 1 ? 's' : ''}
                          </p>
                          {b.rank_position && (
                            <span className="text-[9px] font-black text-purple-400 uppercase">
                              #{b.rank_position}º ranking
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {b.final_rating > 0 && (
                      <div className="flex items-center gap-1 bg-cyan-electric/10 px-2.5 py-1.5 rounded-xl border border-cyan-electric/20 shrink-0">
                        <Star size={10} className="text-cyan-electric" fill="currentColor" />
                        <span className="text-sm font-black font-mono text-cyan-electric">
                          {Number(b.final_rating).toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { label: 'Gols',    value: b.goals             },
                      { label: 'Assists', value: b.assists           },
                      { label: 'G+A',     value: b.goals + b.assists },
                    ].map(s => (
                      <div key={s.label} className="bg-surface-1 rounded-xl py-2">
                        <p className="text-lg font-black font-mono text-white">{s.value}</p>
                        <p className="text-[8px] font-bold text-text-low uppercase">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {b.votes_count > 0 && (
                    <div className="pt-2 border-t border-border-subtle space-y-1.5">
                      {[
                        { label: 'Hab', val: b.avg_skill      },
                        { label: 'Fís', val: b.avg_physical   },
                        { label: 'Cmp', val: b.avg_commitment },
                      ].map(item => (
                        <div key={item.label} className="flex items-center gap-2">
                          <span className="text-[8px] font-black text-text-muted uppercase w-6 shrink-0">
                            {item.label}
                          </span>
                          <StarBar value={item.val} />
                        </div>
                      ))}
                      <p className="text-[8px] text-text-muted font-bold uppercase text-right">
                        {b.votes_count} voto{b.votes_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                </div>
              ))
            }
          </div>
        </section>
      )}

      {/* Estado vazio total */}
      {!loading && babaPerformance.length === 0 && !globalRating && (
        <div className="text-center py-16 border-2 border-dashed border-border-subtle rounded-3xl">
          <Users size={32} className="text-text-muted mx-auto mb-3" />
          <p className="text-text-muted font-black uppercase text-sm">Nenhuma estatística ainda</p>
          <p className="text-text-muted text-[10px] mt-1">Participe de um baba para começar</p>
        </div>
      )}
    </div>
  );
};

export default ProfileStats;
