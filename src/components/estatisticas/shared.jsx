// Peças compartilhadas das demonstrações de /estatisticas.
import React, { useId } from 'react';
import { inputCls } from '../tools/ui';

export function DemoNotice({ children }) {
  return (
    <p role="note" className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-3 text-xs leading-relaxed text-yellow-100">
      <strong className="font-black uppercase tracking-wider">Dados fictícios · </strong>
      {children ?? 'Os nomes e as partidas desta demonstração foram inventados e não correspondem a pessoas reais. Não são estatísticas oficiais.'}
    </p>
  );
}

export function Section({ id, title, intro, children }) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="space-y-4 scroll-mt-6">
      <h2 id={`${id}-t`} className="text-xl font-black tracking-tight">{title}</h2>
      {intro && <p className="text-sm opacity-70 leading-relaxed">{intro}</p>}
      {children}
    </section>
  );
}

export function PlayerSelect({ label, value, onChange, stats }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[11px] font-black uppercase tracking-wider opacity-70">{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        {stats.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    </div>
  );
}

export const Card = ({ children, className = '' }) => (
  <div className={`card-glass p-5 rounded-2xl border border-border-mid ${className}`}>{children}</div>
);

export const StatBox = ({ label, value }) => (
  <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
    <p className="text-[10px] font-black uppercase tracking-wider opacity-50">{label}</p>
    <p className="text-xl font-black text-cyan-electric mt-1">{value}</p>
  </div>
);

export const nameOf = (stats, id) => stats.find((s) => s.id === id)?.name ?? id;
