import React, { useMemo } from 'react';
import { Star, Zap, TrendingUp, Users, Trophy, Award } from 'lucide-react';

// ─────────────────────────────────────────────
// MICRO-COMPONENTES (locais, sem exportar)
// ─────────────────────────────────────────────

const StarBar = ({ value, max = 5 }) => (
  <div className="flex items-center gap-2">
    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-cyan-electric to-purple-500 rounded-full transition-all duration-700"
        style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
      />
    </div>
    <span className="text-[10px] font-black font-mono text-white/60 w-6 text-right">
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
  const [textCls,, bgCls] = (map[accent] || map.cyan).split(/\s{2,}/);
  const cls = map[accent] || map.cyan;
  return (
    <div className={`p-4 rounded-2xl border ${cls} flex flex-col gap-1`}>
      <div className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 opacity-60 ${cls.split(' ')[0]}`}>
        {icon}{label}
      </div>
      <p className={`text-2xl font-black font-mono ${cls.split(' ')[0]}`}>{value}</p>
      {sub && <p className="text-[9px] text-white/30 font-bold uppercase">{sub}</p>}
    </div>
  );
};

const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-white/5 rounded-xl ${className}`} />
);

const SectionTitle = ({ children }) => (
  <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-3">{children}</p>
);

// ─────────────────────────────────────────────
// PROFILE STATS
// ─────────────────────────────────────────────

const ProfileStats = ({ statsData, loading }) => {
  // ── Maps O(1) para lookup ──────────────────
  const ratingsMap = useMemo(
    () => new Map(statsData.ratings.map(r => [r.baba_id, r])),
    [statsData.ratings]
  );
  const matchMap = useMemo(
    () => new Map(statsData.matchStats.map(m => [m.baba_id, m])),
    [statsData.matchStats]
  );

  // ── Agregações globais ─────────────────────
  const globalRating = useMemo(() => {
    const vals = statsData.ratings.map(r => r.final_rating).filter(v => v > 0);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }, [statsData.ratings]);

  const totalVotes = useMemo(
    () => statsData.ratings.reduce((s, r) => s + (r.votes_count || 0), 0),
    [statsData.ratings]
  );

  const { totalGoals, totalAssists, totalMatches } = useMemo(() => ({
    totalGoals:   statsData.matchStats.reduce((s, m) => s + m.goals,   0),
    totalAssists: statsData.matchStats.reduce((s, m) => s + m.assists, 0),
    totalMatches: statsData.matchStats.reduce((s, m) => s + m.matches, 0),
  }), [statsData.matchStats]);

  const goalsPerGame   = totalMatches > 0 ? (totalGoals   / totalMatches).toFixed(2) : '—';
  const assistsPerGame = totalMatches > 0 ? (totalAssists / totalMatches).toFixed(2) : '—';

  // ── Sub-ratings médios globais ─────────────
  const avgSubs = useMemo(() => {
    const rs = statsData.ratings.filter(r => r.votes_count > 0);
    if (!rs.length) return null;
    const n = rs.length;
    return {
      skill:      rs.reduce((s, r) => s + (r.avg_skill      || 0), 0) / n,
      physical:   rs.reduce((s, r) => s + (r.avg_physical   || 0), 0) / n,
      commitment: rs.reduce((s, r) => s + (r.avg_commitment || 0), 0) / n,
    };
  }, [statsData.ratings]);

  // ── Performance unificada por baba (O(1) lookup) ──
  const babaPerformance = useMemo(() => {
    const allBabaIds = [...new Set([
      ...statsData.ratings.map(r => r.baba_id),
      ...statsData.matchStats.map(m => m.baba_id),
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
          rank_position:  statsData.ranking?.find(rk => rk.baba_id === id)?.rank_position || null,
          goals:          m?.goals   || 0,
          assists:        m?.assists || 0,
          matches:        m?.matches || 0,
        };
      })
      .sort((a, b) => b.final_rating - a.final_rating);
  }, [statsData, ratingsMap, matchMap]);

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── REPUTAÇÃO GLOBAL ── */}
      <section>
        <SectionTitle>Reputação Global</SectionTitle>
        {loading ? (
          <Skeleton className="h-32" />
        ) : globalRating > 0 ? (
          <div className="p-5 rounded-[1.75rem] bg-white/[0.03] border border-white/5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-4xl font-black font-mono text-white leading-none">
                  {Number(globalRating).toFixed(2)}
                </p>
                <p className="text-[10px] text-white/30 font-bold uppercase mt-1">
                  {totalVotes} voto{totalVotes !== 1 ? 's' : ''} recebido{totalVotes !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(i => (
                  <Star
                    key={i}
                    size={16}
                    className={i <= Math.round(globalRating) ? 'text-cyan-electric' : 'text-white/10'}
                    fill={i <= Math.round(globalRating) ? 'currentColor' : 'none'}
                  />
                ))}
              </div>
            </div>

            {avgSubs && (
              <div className="space-y-2 pt-3 border-t border-white/5">
                {[
                  { label: '⚽ Habilidade',  val: avgSubs.skill      },
                  { label: '💪 Físico',       val: avgSubs.physical   },
                  { label: '🤝 Compromisso',  val: avgSubs.commitment },
                ].map(item => (
                  <div key={item.label}>
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">
                      {item.label}
                    </p>
                    <StarBar value={item.val} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-5 rounded-[1.75rem] bg-white/[0.03] border border-dashed border-white/10 text-center">
            <Star size={24} className="text-white/10 mx-auto mb-2" />
            <p className="text-[10px] text-white/20 font-black uppercase">Ainda sem avaliações</p>
            <p className="text-[9px] text-white/10 mt-1">Peça para seus companheiros de baba te avaliarem</p>
          </div>
        )}
      </section>

      {/* ── DESTAQUES / BADGES ── */}
      {!loading && (statsData.bestOfMonth?.length > 0 || totalGoals >= 10 || totalAssists >= 10 || totalMatches >= 10) && (
        <section>
          <SectionTitle>Destaques</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {(statsData.bestOfMonth || []).map(babaName => (
              <div key={babaName} className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl">
                <Trophy size={12} className="text-yellow-500" />
                <span className="text-[10px] font-black text-yellow-500 uppercase">
                  Melhor do Mês · {babaName}
                </span>
              </div>
            ))}
            {totalMatches >= 10 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-purple-500/10 border border-purple-500/20 rounded-2xl">
                <Award size={12} className="text-purple-400" />
                <span className="text-[10px] font-black text-purple-400 uppercase">
                  Veterano · {totalMatches} jogos
                </span>
              </div>
            )}
            {totalGoals >= 10 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-orange-500/10 border border-orange-500/20 rounded-2xl">
                <Zap size={12} className="text-orange-400" />
                <span className="text-[10px] font-black text-orange-400 uppercase">
                  Artilheiro · {totalGoals} gols
                </span>
              </div>
            )}
            {totalAssists >= 10 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                <TrendingUp size={12} className="text-blue-400" />
                <span className="text-[10px] font-black text-blue-400 uppercase">
                  Garçom · {totalAssists} assists
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── ESTATÍSTICAS GERAIS ── */}
      <section>
        <SectionTitle>Estatísticas Gerais</SectionTitle>
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={<Zap size={10}/>}        label="Gols"         value={totalGoals}              sub={`${goalsPerGame}/jogo`}       accent="orange" />
            <StatCard icon={<TrendingUp size={10}/>}  label="Assistências" value={totalAssists}            sub={`${assistsPerGame}/jogo`}     accent="cyan"   />
            <StatCard icon={<Users size={10}/>}       label="Partidas"     value={totalMatches}            sub="jogos disputados"             accent="purple" />
            <StatCard icon={<Trophy size={10}/>}      label="G + A"        value={totalGoals+totalAssists} sub="contribuições totais"         accent="green"  />
          </div>
        )}
      </section>

      {/* ── PERFORMANCE POR BABA ── */}
      {(loading || babaPerformance.length > 0) && (
        <section>
          <SectionTitle>Performance por Baba</SectionTitle>
          <div className="space-y-3">
            {loading
              ? [...Array(2)].map((_, i) => <Skeleton key={i} className="h-28" />)
              : babaPerformance.map(b => (
                <div key={b.baba_id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-cyan-electric/10 border border-cyan-electric/20 flex items-center justify-center text-cyan-electric font-black text-sm shrink-0">
                        {b.baba_name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-black text-white leading-none">{b.baba_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[9px] text-white/30 font-bold uppercase">
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

                  {/* Stats inline */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { label: 'Gols',   value: b.goals             },
                      { label: 'Assists', value: b.assists           },
                      { label: 'G+A',    value: b.goals + b.assists  },
                    ].map(s => (
                      <div key={s.label} className="bg-white/[0.02] rounded-xl py-2">
                        <p className="text-lg font-black font-mono text-white">{s.value}</p>
                        <p className="text-[8px] font-bold text-white/30 uppercase">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Sub-ratings se tiver votos */}
                  {b.votes_count > 0 && (
                    <div className="pt-2 border-t border-white/5 space-y-1.5">
                      {[
                        { label: 'Hab', val: b.avg_skill      },
                        { label: 'Fís', val: b.avg_physical   },
                        { label: 'Cmp', val: b.avg_commitment },
                      ].map(item => (
                        <div key={item.label} className="flex items-center gap-2">
                          <span className="text-[8px] font-black text-white/20 uppercase w-6 shrink-0">
                            {item.label}
                          </span>
                          <StarBar value={item.val} />
                        </div>
                      ))}
                      <p className="text-[8px] text-white/20 font-bold uppercase text-right">
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
        <div className="text-center py-16 border-2 border-dashed border-white/5 rounded-3xl">
          <Users size={32} className="text-white/10 mx-auto mb-3" />
          <p className="text-white/20 font-black uppercase text-sm">Nenhuma estatística ainda</p>
          <p className="text-white/10 text-[10px] mt-1">Participe de um baba para começar</p>
        </div>
      )}
    </div>
  );
};

export default ProfileStats;
