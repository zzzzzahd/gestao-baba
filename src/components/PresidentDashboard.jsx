// src/components/PresidentDashboard.jsx
// Sprint 17 — Dashboard do presidente com KPIs e relatório mensal.

import React, { useState, useEffect, useCallback } from 'react';
import { BarChart2, Users, Target, Zap, TrendingUp, RefreshCw, CalendarCheck } from 'lucide-react';
import { supabase } from '../services/supabase';

const KpiCard = ({ icon: Icon, label, value, sub, color = 'text-cyan-electric' }) => (
  <div className="p-4 rounded-2xl bg-surface-1 border border-border-mid flex items-start gap-3">
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
      color === 'text-cyan-electric' ? 'bg-cyan-electric/10 border border-cyan-electric/20'
      : color === 'text-yellow-400' ? 'bg-yellow-400/10 border border-yellow-400/20'
      : color === 'text-green-400'  ? 'bg-green-400/10 border border-green-400/20'
      : color === 'text-purple-400' ? 'bg-purple-400/10 border border-purple-400/20'
      : 'bg-surface-2 border border-border-mid'
    }`}>
      <Icon size={16} className={color} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[9px] font-black uppercase tracking-widest text-text-low mb-0.5">{label}</p>
      <p className="text-xl font-black text-white leading-none">{value ?? '—'}</p>
      {sub && <p className="text-[9px] text-text-muted mt-0.5 font-black">{sub}</p>}
    </div>
  </div>
);

export default function PresidentDashboard({ babaId }) {
  const [data,    setData]    = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('kpis');

  const load = useCallback(async () => {
    if (!babaId) return;
    setLoading(true);
    try {
      const [{ data: dash }, { data: mon }] = await Promise.all([
        supabase.rpc('get_president_dashboard', { p_baba_id: babaId }),
        supabase.from('v_baba_monthly_summary').select('*').eq('baba_id', babaId).order('month_label', { ascending: false }).limit(6),
      ]);
      setData(dash);
      setMonthly(mon || []);
    } catch (err) {
      console.error('[PresidentDashboard]', err);
    } finally {
      setLoading(false);
    }
  }, [babaId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-20 rounded-2xl bg-surface-1 border border-border-subtle animate-pulse" />
        ))}
      </div>
    );
  }

  const maxGoals = Math.max(...monthly.map(m => Number(m.total_goals) || 0), 1);

  return (
    <div className="space-y-4">

      {/* Tabs */}
      <div className="flex gap-1.5 p-1 bg-surface-2 rounded-xl border border-border-mid">
        {[
          { id: 'kpis',    label: 'KPIs'     },
          { id: 'monthly', label: 'Mensal'   },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
              tab === t.id ? 'bg-cyan-electric text-black' : 'text-text-low hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'kpis' && data && (
        <div className="grid grid-cols-2 gap-3">
          <KpiCard
            icon={Users}
            label="Jogadores"
            value={data.total_players}
            color="text-cyan-electric"
          />
          <KpiCard
            icon={Zap}
            label="Partidas"
            value={data.total_matches}
            color="text-purple-400"
          />
          <KpiCard
            icon={Target}
            label="Gols totais"
            value={data.total_goals}
            color="text-yellow-400"
          />
          <KpiCard
            icon={CalendarCheck}
            label="Conf. (90d)"
            value={data.avg_confirmation_rate != null ? `${data.avg_confirmation_rate}%` : '—'}
            color="text-green-400"
          />

          {/* Artilheiro */}
          {data.top_scorer && (
            <div className="col-span-2 p-4 rounded-2xl bg-yellow-400/5 border border-yellow-400/20 flex items-center gap-3">
              <span className="text-2xl">⚽</span>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-yellow-400/60 mb-0.5">Artilheiro</p>
                <p className="text-sm font-black text-white">{data.top_scorer.name}</p>
                <p className="text-[9px] font-black text-yellow-400">{data.top_scorer.goals} gols</p>
              </div>
            </div>
          )}

          {/* Convites ativos */}
          {data.active_invites > 0 && (
            <div className="col-span-2 flex items-center gap-3 p-3 rounded-2xl bg-cyan-electric/5 border border-cyan-electric/15">
              <Zap size={14} className="text-cyan-electric" />
              <p className="text-[10px] font-black text-text-mid">
                <span className="text-cyan-electric">{data.active_invites}</span> convite{data.active_invites > 1 ? 's' : ''} ativo{data.active_invites > 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}

      {tab === 'monthly' && (
        <div className="space-y-3">
          {monthly.length === 0 ? (
            <div className="py-8 text-center">
              <BarChart2 size={24} className="text-text-muted mx-auto mb-2" />
              <p className="text-[10px] font-black uppercase text-text-muted tracking-widest">Sem dados mensais</p>
            </div>
          ) : (
            monthly.map(m => (
              <div key={m.month_label} className="p-3 rounded-2xl bg-surface-1 border border-border-mid space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white">{m.month_label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-black text-text-low">{m.total_matches} partidas</span>
                    <span className="text-[9px] font-black text-yellow-400">{m.total_goals} gols</span>
                    <span className="text-[9px] font-black text-text-low">{m.unique_players} jogadores</span>
                  </div>
                </div>
                {/* Barra de gols */}
                <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full transition-all duration-700"
                    style={{ width: `${(Number(m.total_goals) / maxGoals) * 100}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <button
        onClick={load}
        disabled={loading}
        className="flex items-center gap-1.5 text-[9px] font-black uppercase text-text-muted hover:text-text-low transition-colors disabled:opacity-30"
      >
        <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
        Atualizar
      </button>
    </div>
  );
}
